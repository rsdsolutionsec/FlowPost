/**
 * Módulo de Facebook para Flowpost
 * Interactúa con la API de Meta Graph para publicar contenido.
 */

const META_GRAPH_VERSION = 'v19.0';
/**
 * Publica una foto con una leyenda en una página de Facebook usando contenido binario.
 * 
 * @param imageContent Buffer o Blob de la imagen a publicar.
 * @param caption Texto que acompañará a la foto.
 * @returns Un objeto con el ID del post o un error.
 */
export async function publishToFacebook(
  imageContent: any, 
  caption: string,
  targetPageId: string,
  accessToken: string
) {
  if (!targetPageId || !accessToken) {
    throw new Error('Faltan credenciales de Facebook (Page ID o Access Token)');
  }

  const url = `https://graph.facebook.com/v19.0/${targetPageId}/photos`;

  try {
    const formData = new FormData();
    const blob = imageContent instanceof Blob ? imageContent : new Blob([imageContent as any]);
    
    formData.append('source', blob);
    formData.append('caption', caption);

    const response = await fetch(url, {
      method: 'POST',
      body: formData,
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[Facebook Error]', data);
      throw new Error(data.error?.message || 'Error al publicar en Facebook');
    }

    return {
      success: true,
      id: data.id,
      post_id: data.post_id,
    };
  } catch (error: any) {
    console.error('[Facebook Exception]', error);
    return {
      success: false,
      error: error.message,
    };
  }
}
