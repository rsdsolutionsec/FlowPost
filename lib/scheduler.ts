import { supabaseAdmin } from './supabase.js';
import { publishToFacebook } from './facebook.js';
import { publishToInstagram } from './instagram.js';

export async function processScheduledPosts() {
  const now = new Date().toISOString();
  console.log(`[Scheduler] Iniciando proceso de publicación a las ${now}`);

  const { data: posts, error } = await supabaseAdmin
    .from('posts')
    .select(`
      id
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

      if (!resolvedCaption.trim()) {
        throw new Error('El post no tiene un copy o caption asignado.');
      }

      if (!post.image_path) {
        throw new Error('El post no tiene una ruta de medio (image_path/media)');
      }

      // Limpiar y detectar tipo de medio
      const mediaPath = post.image_path.trim();
      const isVideo = /\.(mp4|mov|avi|wmv|flv|webm|mkv)$/i.test(mediaPath);
      const mediaType = isVideo ? 'video' : 'image';

      const isInstagram = post.platform === 'instagram';
      let result;

      if (isInstagram) {
        const igData = post.instagram_accounts;
        if (!igData || !(igData as any).instagram_business_id) {
          throw new Error('No se encontró el ID de Instagram Business para este post');
        }
        
        const igToken = (igData as any).facebook_pages?.page_access_token;
        if (!igToken) {
          throw new Error('No se encontró el token de la página de Facebook vinculada a Instagram');
        }

        console.log(`[Scheduler] Enviando ${mediaType} a Instagram (${(igData as any).instagram_business_id})...`);
        
        // Instagram requiere URL pública. Si mediaPath es relativa, tenemos un problema.
        if (!mediaPath.startsWith('http')) {
           throw new Error('Instagram requiere una URL pública para el medio (R2). Las rutas relativas de Storage no son compatibles.');
        }

        result = await publishToInstagram(
          mediaPath,
          resolvedCaption,
          (igData as any).instagram_business_id,
          igToken,
          mediaType
        );
      } else {
        const pageData = post.facebook_pages;
        if (!pageData || !(pageData as any).page_id || !(pageData as any).page_access_token) {
          throw new Error('No se encontraron credenciales de Facebook para este post (facebook_pages missing)');
        }

        console.log(`[Scheduler] Enviando ${mediaType} a Facebook (Page: ${(pageData as any).page_id})...`);
        
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

        result = await publishToFacebook(
          mediaData, 
          resolvedCaption,
          (pageData as any).page_id,
          (pageData as any).page_access_token,
          mediaType
        );
      }

      if (result.success) {
        const platformKey = isInstagram ? 'ig_post_id' : 'fb_post_id';
        const platformTime = isInstagram ? 'ig_published_at' : 'fb_published_at';
        
        const { error: updateError } = await supabaseAdmin
          .from('posts')
          .update({ 
            status: 'published',
            metadata: { 
              [platformKey]: result.id,
              [platformTime]: new Date().toISOString(),
              platform: post.platform,
              media_type: mediaType
            }
          })
          .eq('id', post.id);

        if (updateError) {
          console.error(`[Scheduler] Error al actualizar estado del post ${post.id}:`, updateError);
        }
        
        succeeded++;
        console.log(`[Scheduler] Post ${post.id} (${mediaType}) publicado con éxito.`);
      } else {
        await supabaseAdmin
          .from('posts')
          .update({ 
            status: 'failed',
            metadata: { 
              error: result.error, 
              failed_at: new Date().toISOString(),
              media_type: mediaType
            }
          })
          .eq('id', post.id);
        
        failed++;
        console.error(`[Scheduler] Post ${post.id} falló en ${post.platform}: ${result.error}`);
      }
    } catch (e: any) {
      failed++;
      console.error(`[Scheduler] Error procesando post ${post.id}:`, e.message);
      
      await supabaseAdmin
        .from('posts')
        .update({ 
          status: 'failed',
          metadata: { error: e.message, failed_at: new Date().toISOString() }
        })
        .eq('id', post.id);
    }
  }

  console.log(`[Scheduler] Finalizado. Éxitos: ${succeeded}, Fallidos: ${failed}`);

  return {
    success: true,
    processed: lockedPosts.length,
    succeeded,
    failed
  };
}
