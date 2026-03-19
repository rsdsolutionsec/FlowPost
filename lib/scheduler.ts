import { supabaseAdmin } from './supabase.js';
import { publishToFacebook } from './facebook.js';

/**
 * Función principal para procesar posts programados.
 */
export async function processScheduledPosts() {
  const now = new Date().toISOString();
  console.log(`[Scheduler] Iniciando proceso de publicación a las ${now}`);

  // 1. Consultar posts programados con sus respectivas credenciales de página
  const { data: posts, error } = await supabaseAdmin
    .from('posts')
    .select(`
      *,
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

      // 1. Descargar imagen de Supabase Storage
      if (!post.image_path) {
        throw new Error('El post no tiene una ruta de imagen (image_path)');
      }

      console.log(`[Scheduler] Descargando imagen: ${post.image_path}`);
      const { data: imageData, error: downloadError } = await supabaseAdmin
        .storage
        .from('posts')
        .download(post.image_path);

      if (downloadError || !imageData) {
        throw new Error(`Error al descargar imagen de Storage: ${downloadError?.message || 'Archivo no encontrado'}`);
      }

      // 2. Resolver credenciales de la página
      const pageData = post.facebook_pages;
      if (!pageData || !pageData.page_id || !pageData.page_access_token) {
        throw new Error('No se encontraron credenciales de Facebook para este post (facebook_pages missing)');
      }

      // 3. Publicar en Facebook (pasando el binario y credenciales dinámicas)
      console.log(`[Scheduler] Enviando binario a Facebook (Page: ${pageData.page_id})...`);
      const result = await publishToFacebook(
        imageData, 
        post.caption,
        pageData.page_id,
        pageData.page_access_token
      );

      if (result.success) {
        // 3. Actualizar estado a 'published'
        const { error: updateError } = await supabaseAdmin
          .from('posts')
          .update({ 
            status: 'published',
            metadata: { 
              fb_post_id: result.id,
              fb_published_at: new Date().toISOString()
            }
          })
          .eq('id', post.id);

        if (updateError) {
          console.error(`[Scheduler] Error al actualizar estado del post ${post.id}:`, updateError);
        }
        
        succeeded++;
        console.log(`[Scheduler] Post ${post.id} publicado con éxito.`);
      } else {
        // 4. Si falla la publicación, actualizar estado a 'failed'
        await supabaseAdmin
          .from('posts')
          .update({ 
            status: 'failed',
            metadata: { 
              error: result.error, 
              failed_at: new Date().toISOString() 
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
