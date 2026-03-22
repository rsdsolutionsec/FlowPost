import { supabaseAdmin } from './supabase.js';
import { publishToFacebook } from './facebook.js';
import { publishToInstagram } from './instagram.js';

export async function processScheduledPosts() {
  const now = new Date().toISOString();
  console.log(`[Scheduler] Iniciando proceso de publicación a las ${now}`);

  const { data: posts, error } = await supabaseAdmin
    .from('posts')
    .select(`
      *,
      copies (
        content
      ),
      facebook_pages (
        page_id,
        page_access_token
      ),
      instagram_accounts (
        instagram_business_id,
        facebook_pages (
          page_access_token
        )
      )
    `)
    .eq('status', 'scheduled')
    .lte('scheduled_at', now);

  if (error) {
    console.error('[Scheduler] Error al consultar posts:', error);
    return { success: false, error: error.message };
  }

  if (!posts || posts.length === 0) {
    console.log('[Scheduler] No hay posts pendientes por publicar.');
    return { success: true, processed: 0, succeeded: 0, failed: 0 };
  }

  // 2. Lock posts by setting status to 'processing'
  // Use .select() to get only those that were successfully updated (prevents race conditions)
  const postIds = posts.map(p => p.id);
  const { data: lockedPosts, error: lockError } = await supabaseAdmin
    .from('posts')
    .update({ status: 'processing' })
    .in('id', postIds)
    .eq('status', 'scheduled')
    .select(`
      *,
      copies (
        content
      ),
      facebook_pages (
        page_id,
        page_access_token
      ),
      instagram_accounts (
        instagram_business_id,
        facebook_pages (
          page_access_token
        )
      )
    `);

  if (lockError) {
    console.error('[Scheduler] Error al bloquear posts:', lockError);
    return { success: false, error: lockError.message };
  }

  if (!lockedPosts || lockedPosts.length === 0) {
    console.log('[Scheduler] Todos los posts ya estaban siendo procesados por otra ejecución.');
    return { success: true, processed: 0, succeeded: 0, failed: 0 };
  }

  console.log(`[Scheduler] Procesando ${lockedPosts.length} post(s) bloqueado(s)...`);

  let succeeded = 0;
  let failed = 0;

  for (const post of lockedPosts) {
    try {
      console.log(`[Scheduler] Procesando post ID: ${post.id}`);

      const resolvedCaption = post.copy_id && post.copies
        ? (post.copies as any).content
        : (post.custom_caption || post.caption || '');

      if (!post.image_path) {
        throw new Error('El post no tiene una ruta de medio (image_path/media)');
      }

      // Limpiar y detectar tipo de medio
      const mediaPath = post.image_path.trim();
      const isVideo = /\.(mp4|mov|avi|wmv|flv|webm|mkv)$/i.test(mediaPath);
      const mediaType = isVideo ? 'video' : 'image';

      const existingMeta = (post.metadata as any) || {};
      const doFacebook = (post.platform === 'facebook' || post.platform === 'both') && !existingMeta.fb_post_id;
      const doInstagram = (post.platform === 'instagram' || post.platform === 'both') && !existingMeta.ig_post_id;

      let fbResult: any = null;
      let igResult: any = null;

      // — Facebook —
      if (doFacebook) {
        const pageData = post.facebook_pages;
        if (!pageData || !(pageData as any).page_id || !(pageData as any).page_access_token) {
          throw new Error('No se encontraron credenciales de Facebook para este post (facebook_pages missing)');
        }

        console.log(`[Scheduler] Descargando ${mediaType}: ${mediaPath}`);
        let mediaData: Blob;
        if (mediaPath.startsWith('http')) {
          const response = await fetch(mediaPath);
          if (!response.ok) {
            throw new Error(`Error al descargar ${mediaType} desde R2 (${response.status}): ${response.statusText}`);
          }
          mediaData = await response.blob();
        } else {
          const { data, error: downloadError } = await supabaseAdmin.storage.from('posts').download(mediaPath);
          if (downloadError || !data) {
            throw new Error(`Error al descargar ${mediaType} de Storage: ${downloadError?.message || 'Archivo no encontrado'}`);
          }
          mediaData = data;
        }

        console.log(`[Scheduler] Enviando ${mediaType} a Facebook (Page: ${(pageData as any).page_id})...`);
        fbResult = await publishToFacebook(
          mediaData,
          resolvedCaption,
          (pageData as any).page_id,
          (pageData as any).page_access_token,
          mediaType
        );

        if (!fbResult.success) {
          console.error(`[Scheduler] Post ${post.id} falló en Facebook: ${fbResult.error}`);
        }
      }

      // — Instagram —
      if (doInstagram) {
        const igData = post.instagram_accounts;
        const igBusinessId = (igData as any)?.instagram_business_id;
        const igToken = (igData as any)?.facebook_pages?.page_access_token;

        if (!igData || !igBusinessId) {
          const msg = 'No se encontró el ID de Instagram Business para este post';
          if (post.platform === 'instagram') throw new Error(msg);
          console.error(`[Scheduler] ${msg} — skipping IG for platform=both`);
        } else if (!igToken) {
          const msg = 'No se encontró el token de la página de Facebook vinculada a Instagram';
          if (post.platform === 'instagram') throw new Error(msg);
          console.error(`[Scheduler] ${msg} — skipping IG for platform=both`);
        } else if (!mediaPath.startsWith('http')) {
          const msg = 'Instagram requiere una URL pública para el medio (R2)';
          if (post.platform === 'instagram') throw new Error(msg);
          console.error(`[Scheduler] ${msg} — skipping IG for platform=both`);
        } else {
          console.log(`[Scheduler] Enviando ${mediaType} a Instagram (${igBusinessId})...`);
          igResult = await publishToInstagram(
            mediaPath,
            resolvedCaption,
            igBusinessId,
            igToken,
            mediaType
          );

          if (!igResult.success) {
            console.error(`[Scheduler] Post ${post.id} falló en Instagram: ${igResult.error}`);
          }
        }
      }

      // — Result handling —
      const anySuccess = (doFacebook && fbResult?.success) || (doInstagram && igResult?.success);

      if (anySuccess) {
        const metadataUpdate: Record<string, any> = {
          ...((post.metadata as any) || {}),
          platform: post.platform,
          media_type: mediaType,
        };

        if (fbResult?.success) {
          metadataUpdate.fb_post_id = fbResult.post_id || fbResult.id;
          metadataUpdate.fb_published_at = new Date().toISOString();
          delete metadataUpdate.fb_error;
        }
        if (igResult?.success) {
          metadataUpdate.ig_post_id = igResult.id;
          metadataUpdate.ig_published_at = new Date().toISOString();
          delete metadataUpdate.ig_error;
        }
        if (!fbResult?.success && doFacebook) {
          metadataUpdate.fb_error = fbResult?.error || 'unknown';
        }
        if (!igResult?.success && doInstagram) {
          metadataUpdate.ig_error = igResult?.error || 'skipped';
        }

        const { error: updateError } = await supabaseAdmin
          .from('posts')
          .update({ status: 'published', metadata: metadataUpdate })
          .eq('id', post.id);

        if (updateError) {
          console.error(`[Scheduler] Error al actualizar estado del post ${post.id}:`, updateError);
        }

        succeeded++;
        console.log(`[Scheduler] Post ${post.id} (${mediaType}) publicado con éxito.`);
      } else {
        const errors: string[] = [];
        if (doFacebook && fbResult) errors.push(`FB: ${fbResult.error}`);
        if (doInstagram && igResult) errors.push(`IG: ${igResult.error}`);

        await supabaseAdmin
          .from('posts')
          .update({
            status: 'failed',
            metadata: {
              ...existingMeta,
              error: errors.join(' | ') || 'unknown',
              failed_at: new Date().toISOString(),
              media_type: mediaType
            }
          })
          .eq('id', post.id);

        failed++;
        console.error(`[Scheduler] Post ${post.id} falló: ${errors.join(' | ')}`);
      }
    } catch (e: any) {
      failed++;
      console.error(`[Scheduler] Error procesando post ${post.id}:`, e.message);
      
      await supabaseAdmin
        .from('posts')
        .update({
          status: 'failed',
          metadata: { ...((post.metadata as any) || {}), error: e.message, failed_at: new Date().toISOString() }
        })
        .eq('id', post.id);
    }
  }

  console.log(`[Scheduler] Finalizado. Éxitos: ${succeeded}, Fallidos: ${failed}`);

  return {
    success: true,
    processed: posts.length,
    succeeded,
    failed
  };
}
