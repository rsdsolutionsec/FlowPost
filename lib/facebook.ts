/**
 * Mdulo de Facebook para Flowpost
 * Interacta con la API de Meta Graph para publicar contenido.
 */

const META_GRAPH_VERSION = 'v19.0';
/**
 * Publica una foto con una leyenda en una pgina de Facebook usando contenido binario.
 * 
 * @param imageContent Buffer o Blob de la imagen a publicar.
 * @param caption Texto que acompaar a la foto.
 * @returns Un objeto con el ID del post o un error.
 */
/**
 * Publica una foto o video con una leyenda en una página de Facebook usando contenido binario.
 * 
 * @param mediaContent Buffer o Blob del medio a publicar.
 * @param caption Texto que acompañará al medio.
 * @param targetPageId ID de la página de Facebook.
 * @param accessToken Token de acceso de la página.
 * @param mediaType 'image' | 'video' (por defecto 'image').
 * @returns Un objeto con el ID del post o un error.
 */
export async function publishToFacebook(
  mediaContent: any, 
  caption: string,
  targetPageId: string,
  accessToken: string,
  mediaType: 'image' | 'video' = 'image'
) {
  if (!targetPageId || !accessToken) {
    throw new Error('Faltan credenciales de Facebook (Page ID o Access Token)');
  }

  const captionParam = 'description'; // usado solo para videos
  const url = `https://graph.facebook.com/${META_GRAPH_VERSION}/${targetPageId}/videos`;

  try {
    let blob = mediaContent instanceof Blob ? mediaContent : new Blob([mediaContent as any]);

    if (mediaType === 'video' && (!blob.type || blob.type === 'application/octet-stream')) {
      blob = new Blob([blob], { type: 'video/mp4' });
    } else if (mediaType === 'image' && (!blob.type || blob.type === 'application/octet-stream')) {
      blob = new Blob([blob], { type: 'image/jpeg' });
    }

    console.log(`[Facebook] Preparando ${mediaType} para subir. Size: ${blob.size}, Type: ${blob.type}`);

    if (mediaType === 'image') {
      // Para imágenes: 2 pasos para garantizar que aparezca en el feed de todos los usuarios
      // Paso 1: subir foto sin publicar → obtener photo_id
      const uploadForm = new FormData();
      uploadForm.append('source', blob, 'photo.jpg');
      uploadForm.append('published', 'false');

      const uploadUrl = `https://graph.facebook.com/${META_GRAPH_VERSION}/${targetPageId}/photos?access_token=${encodeURIComponent(accessToken)}`;
      const uploadRes = await fetch(uploadUrl, { method: 'POST', body: uploadForm });
      const uploadData = await uploadRes.json();

      if (!uploadRes.ok) {
        console.error('[Facebook Upload Error]', uploadData);
        throw new Error(uploadData.error?.message || 'Error al subir foto a Facebook');
      }

      const photoId = uploadData.id;
      console.log(`[Facebook] Foto subida con ID: ${photoId}. Creando feed post...`);

      // Paso 2: crear feed post con la foto adjunta
      const feedParams = new URLSearchParams({
        message: caption,
        attached_media: JSON.stringify([{ media_fbid: photoId }]),
        access_token: accessToken
      });
      const feedUrl = `https://graph.facebook.com/${META_GRAPH_VERSION}/${targetPageId}/feed`;
      const feedRes = await fetch(`${feedUrl}?${feedParams}`, { method: 'POST' });
      const feedData = await feedRes.json();

      if (!feedRes.ok) {
        console.error('[Facebook Feed Error]', feedData);
        throw new Error(feedData.error?.message || 'Error al crear post en el feed de Facebook');
      }

      console.log(`[Facebook] Feed post creado con ID: ${feedData.id}`);
      return { success: true, id: photoId, post_id: feedData.id };

    } else {
      // Para videos: un solo paso con el endpoint /videos
      const formData = new FormData();
      formData.append('source', blob, 'video.mp4');
      formData.append(captionParam, caption);

      const urlWithToken = `${url}?access_token=${encodeURIComponent(accessToken)}`;
      const response = await fetch(urlWithToken, { method: 'POST', body: formData });
      const data = await response.json();

      if (!response.ok) {
        console.error('[Facebook Video Error]', data);
        throw new Error(data.error?.message || 'Error al publicar video en Facebook');
      }

      return { success: true, id: data.id, post_id: data.post_id || data.id };
    }

  } catch (error: any) {
    console.error('[Facebook Exception]', error);
    return { success: false, error: error.message };
  }
}
