/**
 * Módulo de Instagram para Flowpost
 * Interactúa con la API de Meta Graph para publicar contenido en Instagram.
 */

const META_GRAPH_VERSION = 'v19.0';

/**
 * Publica una foto o video en una cuenta de Instagram Business.
 * Instagram requiere que el medio esté disponible vía una URL pública.
 * 
 * @param mediaUrl URL pública del medio (imagen o video).
 * @param caption Texto que acompañará al post.
 * @param instagramBusinessId ID de la cuenta de Instagram Business.
 * @param accessToken Token de acceso (de la página de Facebook vinculada).
 * @param mediaType 'image' | 'video'.
 * @returns Un objeto con el ID del post o un error.
 */
export async function publishToInstagram(
  mediaUrl: string,
  caption: string,
  instagramBusinessId: string,
  accessToken: string,
  mediaType: 'image' | 'video' = 'image'
) {
  if (!instagramBusinessId || !accessToken) {
    throw new Error('Faltan credenciales de Instagram (Business ID o Access Token)');
  }

  try {
    // 1. Crear el contenedor de medios
    console.log(`[Instagram] Creando contenedor para ${mediaType}: ${mediaUrl}`);
    
    // Instagram requiere URLSearchParams para los parámetros
    const params = new URLSearchParams();
    params.append('caption', caption);
    params.append('access_token', accessToken);

    if (mediaType === 'video') {
      params.append('video_url', mediaUrl);
      params.append('media_type', 'VIDEO');
    } else {
      params.append('image_url', mediaUrl);
    }

    const containerUrl = `https://graph.facebook.com/${META_GRAPH_VERSION}/${instagramBusinessId}/media?${params.toString()}`;
    
    const containerRes = await fetch(containerUrl, { method: 'POST' });
    const containerData = await containerRes.json();

    if (!containerRes.ok) {
      console.error('[Instagram Container Error]', containerData);
      throw new Error(containerData.error?.message || 'Error al crear contenedor de Instagram');
    }

    const creationId = containerData.id;
    console.log(`[Instagram] Contenedor creado con ID: ${creationId}. Publicando...`);

    // 2. Esperar si es video (Instagram procesa videos asíncronamente)
    if (mediaType === 'video') {
       // Intentamos esperar un poco para que el procesamiento inicial termine
       // En un sistema real robusto, deberíamos consultar el status del contenedor
       await new Promise(resolve => setTimeout(resolve, 15000)); 
    }

    // 3. Publicar el contenedor
    const publishUrl = `https://graph.facebook.com/${META_GRAPH_VERSION}/${instagramBusinessId}/media_publish?creation_id=${creationId}&access_token=${accessToken}`;
    
    const publishRes = await fetch(publishUrl, { method: 'POST' });
    const publishData = await publishRes.json();

    if (!publishRes.ok) {
      console.error('[Instagram Publish Error]', publishData);
      throw new Error(publishData.error?.message || 'Error al publicar contenedor de Instagram');
    }

    return {
      success: true,
      id: publishData.id
    };

  } catch (error: any) {
    console.error('[Instagram Exception]', error);
    return {
      success: false,
      error: error.message
    };
  }
}
