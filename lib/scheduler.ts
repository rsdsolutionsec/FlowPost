import { supabaseAdmin } from './supabase.js';
import { publishToFacebook } from './facebook.js';

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

  console.log(`[Scheduler] Procesando ${posts.length} post(s)...`);

  let succeeded = 0;
  let failed = 0;

  for (const post of posts) {
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

      console.log(`[Scheduler] Descargando ${mediaType}: ${mediaPath}`);
      let mediaData: Blob;

      if (mediaPath.startsWith('http')) {
        // Content from R2 via Public URL
        const response = await fetch(mediaPath);
        if (!response.ok) {
          throw new Error(`Error al descargar ${mediaType} desde R2 (${response.status}): ${response.statusText}`);
        }
        mediaData = await response.blob();
      } else {
        // Content from Supabase Storage (Legacy)
        const { data, error: downloadError } = await supabaseAdmin
          .storage
          .from('posts')
          .download(mediaPath);

        if (downloadError || !data) {
          throw new Error(`Error al descargar ${mediaType} de Storage: ${downloadError?.message || 'Archivo no encontrado'}`);
        }
        mediaData = data;
      }

      const pageData = post.facebook_pages;
      if (!pageData || !(pageData as any).page_id || !(pageData as any).page_access_token) {
        throw new Error('No se encontraron credenciales de Facebook para este post (facebook_pages missing)');
      }

      console.log(`[Scheduler] Enviando ${mediaType} a Facebook (Page: ${(pageData as any).page_id})...`);
      const result = await publishToFacebook(
        mediaData, 
        resolvedCaption,
        (pageData as any).page_id,
        (pageData as any).page_access_token,
        mediaType
      );

      if (result.success) {
        const { error: updateError } = await supabaseAdmin
          .from('posts')
          .update({ 
            status: 'published',
            metadata: { 
              fb_post_id: result.id,
              fb_published_at: new Date().toISOString(),
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
        console.error(`[Scheduler] Post ${post.id} falló en Facebook: ${result.error}`);
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
    processed: posts.length,
    succeeded,
    failed
  };
}
