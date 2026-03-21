import { supabaseAdmin } from '../../lib/supabase.js';
import {
  fetchFacebookPostInsights,
  fetchInstagramMediaInsights,
  isPermissionError,
} from '../../lib/insights.js';

export default async function handler(request: any, response: any) {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method not allowed' });
  }

  const { postId, userId } = request.body || {};

  if (!postId || !userId) {
    return response.status(400).json({ error: 'postId and userId are required' });
  }

  try {
    // Fetch post with account data
    const { data: post, error: postError } = await supabaseAdmin
      .from('posts')
      .select(`
        id, user_id, platform, metadata,
        facebook_pages ( id, page_id, page_access_token ),
        instagram_accounts ( id, instagram_business_id, facebook_pages ( page_access_token ) )
      `)
      .eq('id', postId)
      .eq('user_id', userId)
      .single();

    if (postError || !post) {
      return response.status(404).json({ error: 'Post not found' });
    }

    const meta = post.metadata as any;
    if (!meta) {
      return response.status(400).json({ error: 'Post has no metadata (not yet published)' });
    }

    let insightData: any;
    let platform: string;
    let platformPostId: string;

    if (meta.fb_post_id && post.facebook_pages) {
      const page = post.facebook_pages as any;
      platform = 'facebook';
      platformPostId = meta.fb_post_id;

      const fb = await fetchFacebookPostInsights(platformPostId, page.page_access_token);
      insightData = {
        impressions: fb.impressions,
        reach: fb.reach,
        engagement: fb.engagement,
        clicks: fb.clicks,
        likes: fb.reactions?.like || 0,
        comments: 0,
        shares: 0,
        saves: 0,
        reactions: fb.reactions,
      };
    } else if (meta.ig_post_id && post.instagram_accounts) {
      const igData = post.instagram_accounts as any;
      const igToken = igData.facebook_pages?.page_access_token;
      if (!igToken) {
        return response.status(400).json({ error: 'No token for Instagram account' });
      }

      platform = 'instagram';
      platformPostId = meta.ig_post_id;

      const ig = await fetchInstagramMediaInsights(platformPostId, igToken, meta.media_type);
      insightData = {
        impressions: ig.impressions,
        reach: ig.reach,
        engagement: ig.engagement,
        clicks: 0,
        likes: ig.likes,
        comments: ig.comments,
        shares: ig.shares,
        saves: ig.saves,
        reactions: {},
      };
    } else {
      return response.status(400).json({ error: 'Post has no platform post ID in metadata' });
    }

    // Upsert
    const { data: insight, error: upsertError } = await supabaseAdmin
      .from('post_insights')
      .upsert({
        post_id: post.id,
        user_id: post.user_id,
        platform: platform!,
        platform_post_id: platformPostId!,
        ...insightData,
        fetched_at: new Date().toISOString(),
      }, { onConflict: 'post_id' })
      .select()
      .single();

    if (upsertError) {
      throw new Error(`Upsert failed: ${upsertError.message}`);
    }

    return response.status(200).json({ success: true, data: insight });
  } catch (err: any) {
    if (isPermissionError(err)) {
      return response.status(403).json({
        error: 'permission_denied',
        message: err.message,
        requires: ['read_insights', 'instagram_manage_insights'],
      });
    }
    console.error('[Insights Post] Error:', err.message, err.code ? `(code: ${err.code})` : '');
    return response.status(500).json({ error: err.message, code: err.code });
  }
}
