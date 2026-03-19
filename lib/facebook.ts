/**
 * Mdulo de Facebook para Flowpost
 * Interacta con la API de Meta Graph para publicar contenido.
 */

const META_GRAPH_VERSION = 'v19.0';
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

  // Diferentes endpoints y parámetros según el tipo de medio
  const endpoint = mediaType === 'video' ? 'videos' : 'photos';
  const captionParam = mediaType === 'video' ? 'description' : 'caption';
  const url = `https://graph.facebook.com/v19.0/${targetPageId}/${endpoint}`;

  try {
    const formData = new FormData();
    // Convertimos a Blob si es Buffer, para compatibilidad con Fetch nativo
    const blob = mediaContent instanceof Blob ? mediaContent : new Blob([mediaContent as any]);
    
    formData.append('source', blob);
    formData.append(captionParam, caption);

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
      throw new Error(data.error?.message || `Error al publicar ${mediaType} en Facebook`);
    }

    return {
      success: true,
      id: data.id,
      post_id: data.post_id || data.id, // Videos a veces devuelven id pero no post_id directamente
    };
  } catch (error: any) {
    console.error('[Facebook Exception]', error);
    return {
      success: false,
      error: error.message,
    };
  }
}
