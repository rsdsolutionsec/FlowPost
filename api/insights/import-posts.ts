import { supabaseAdmin } from '../../lib/supabase.js';

const META_GRAPH_VERSION = 'v19.0';
const META_GRAPH_BASE = `https://graph.facebook.com/${META_GRAPH_VERSION}`;

export default async function handler(request: any, response: any) {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method not allowed' });
  }

  const { accountRefId, platform, userId } = request.body || {};

  if (!accountRefId || !platform || !userId) {
    return response.status(400).json({ error: 'accountRefId, platform, and userId are required' });
  }

  let token: string;
  let platformAccountId: string;
  let fbPageId: string | null = null;
  let igAccountId: string | null = null;

  if (platform === 'facebook') {
    const { data: page, error } = await supabaseAdmin
      .from('facebook_pages')
      .select('page_id, page_access_token')
      .eq('id', accountRefId)
      .eq('user_id', userId)
      .single();

    if (error || !page) return response.status(404).json({ error: 'Facebook page not found' });

    token = page.page_access_token;
    platformAccountId = page.page_id;
    fbPageId = accountRefId;
  } else if (platform === 'instagram') {
    const { data: igAccount, error } = await supabaseAdmin
      .from('instagram_accounts')
      .select('instagram_business_id, facebook_pages ( page_access_token )')
      .eq('id', accountRefId)
      .eq('user_id', userId)
      .single();

    if (error || !igAccount) return response.status(404).json({ error: 'Instagram account not found' });

    token = (igAccount.facebook_pages as any)?.page_access_token;
    platformAccountId = igAccount.instagram_business_id;
    igAccountId = accountRefId;

    if (!token) return response.status(400).json({ error: 'No token available for Instagram account' });
  } else {
    return response.status(400).json({ error: 'Invalid platform' });
  }

  let imported = 0;
  let skipped = 0;

  try {
    if (platform === 'instagram') {
      const url = `${META_GRAPH_BASE}/${platformAccountId}/media?fields=id,timestamp,media_type,caption,thumbnail_url,media_url&limit=50&access_token=${token}`;
      const res = await fetch(url);
      const json = await res.json();

      if (!res.ok || json.error) {
        return response.status(400).json({ error: json?.error?.message || 'Failed to fetch Instagram media' });
      }

      for (const media of json.data || []) {
        const { data: existing } = await supabaseAdmin
          .from('posts')
          .select('id')
          .eq('user_id', userId)
          .filter('metadata->>ig_post_id', 'eq', media.id)
          .maybeSingle();

        if (existing) { skipped++; continue; }

        const imagePath = media.thumbnail_url || media.media_url || null;

        const { error: insertError } = await supabaseAdmin
          .from('posts')
          .insert({
            user_id: userId,
            platform: 'instagram',
            status: 'published',
            caption: media.caption || '',
            image_path: imagePath,
            scheduled_at: media.timestamp,
            instagram_account_id: igAccountId,
            metadata: {
              ig_post_id: media.id,
              media_type: media.media_type,
              imported: true,
            },
          });

        if (!insertError) imported++;
      }
    } else {
      const url = `${META_GRAPH_BASE}/${platformAccountId}/posts?fields=id,created_time,message,full_picture&limit=50&access_token=${token}`;
      const res = await fetch(url);
      const json = await res.json();

      if (!res.ok || json.error) {
        return response.status(400).json({ error: json?.error?.message || 'Failed to fetch Facebook posts' });
      }

      for (const post of json.data || []) {
        const { data: existing } = await supabaseAdmin
          .from('posts')
          .select('id')
          .eq('user_id', userId)
          .filter('metadata->>fb_post_id', 'eq', post.id)
          .maybeSingle();

        if (existing) { skipped++; continue; }

        const { error: insertError } = await supabaseAdmin
          .from('posts')
          .insert({
            user_id: userId,
            platform: 'facebook',
            status: 'published',
            caption: post.message || '',
            image_path: post.full_picture || null,
            scheduled_at: post.created_time,
            facebook_page_id: fbPageId,
            metadata: {
              fb_post_id: post.id,
              imported: true,
            },
          });

        if (!insertError) imported++;
      }
    }

    return response.status(200).json({ success: true, imported, skipped });
  } catch (err: any) {
    console.error('[Import Posts] Error:', err.message);
    return response.status(500).json({ error: err.message });
  }
}
