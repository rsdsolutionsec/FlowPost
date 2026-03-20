/**
 * Módulo de Instagram para Flowpost
 * Interactúa con la API de Meta Graph para publicar contenido en Instagram.
 */

const META_GRAPH_VERSION = 'v19.0';

/**
 * Polls the Instagram container status until it's FINISHED, ERROR, or times out.
 * Instagram requires media to be processed before publishing — even for images.
 */
async function waitForContainerReady(
  creationId: string,
  accessToken: string,
  maxWaitMs = 60000,
  pollIntervalMs = 4000
): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitMs) {
    await new Promise(resolve => setTimeout(resolve, pollIntervalMs));

    const statusUrl = `https://graph.facebook.com/${META_GRAPH_VERSION}/${creationId}?fields=status_code&access_token=${accessToken}`;
    const statusRes = await fetch(statusUrl);
    const statusData = await statusRes.json();

    const statusCode = statusData.status_code;
    console.log(`[Instagram] Container ${creationId} status: ${statusCode}`);

    if (statusCode === 'FINISHED') {
      return; // Ready to publish
    }
    if (statusCode === 'ERROR' || statusCode === 'EXPIRED') {
      throw new Error(`Instagram container processing failed with status: ${statusCode}`);
    }
    // Continue polling for: IN_PROGRESS, PUBLISHED
  }

  throw new Error(`Instagram container ${creationId} timed out after ${maxWaitMs / 1000}s`);
}

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

    const params = new URLSearchParams();
    params.append('caption', caption);
    params.append('access_token', accessToken);

    if (mediaType === 'video') {
      params.append('video_url', mediaUrl);
      params.append('media_type', 'REELS'); // VIDEO is deprecated; use REELS for feed videos
      params.append('share_to_feed', 'true');
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
    console.log(`[Instagram] Contenedor creado con ID: ${creationId}. Esperando procesamiento...`);

    // 2. Esperar a que el contenedor esté listo mediante polling
    // Videos pueden tardar más (hasta 2 min), imágenes hasta 1 min
    const maxWait = mediaType === 'video' ? 120000 : 60000;
    await waitForContainerReady(creationId, accessToken, maxWait);

    console.log(`[Instagram] Contenedor ${creationId} listo. Publicando...`);

    // 3. Publicar el contenedor
    const publishUrl = `https://graph.facebook.com/${META_GRAPH_VERSION}/${instagramBusinessId}/media_publish?creation_id=${creationId}&access_token=${accessToken}`;

    const publishRes = await fetch(publishUrl, { method: 'POST' });
    const publishData = await publishRes.json();

    if (!publishRes.ok) {
      console.error('[Instagram Publish Error]', publishData);
      throw new Error(publishData.error?.message || 'Error al publicar contenedor de Instagram');
    }

    console.log(`[Instagram] Publicado exitosamente. Post ID: ${publishData.id}`);
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
