const META_API_VERSION = 'v19.0';
const BASE_URL = `https://graph.facebook.com/${META_API_VERSION}`;

export async function getFacebookPages(accessToken: string) {
  const response = await fetch(`${BASE_URL}/me/accounts?access_token=${accessToken}`);
  return response.json();
}

export async function publishToPage(pageId: string, accessToken: string, message: string, imageUrl?: string) {
  const endpoint = imageUrl ? `${BASE_URL}/${pageId}/photos` : `${BASE_URL}/${pageId}/feed`;
  const body: any = {
    message,
    access_token: accessToken,
  };

  if (imageUrl) {
    body.url = imageUrl;
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  return response.json();
}
