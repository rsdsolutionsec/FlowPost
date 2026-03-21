import { supabaseAdmin } from '../../lib/supabase.js';
import {
  fetchFacebookPageInsights,
  fetchInstagramAccountInsights,
  isPermissionError,
} from '../../lib/insights.js';

export default async function handler(request: any, response: any) {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method not allowed' });
  }

  const { accountRefId, platform, userId, days = 30 } = request.body || {};

  if (!accountRefId || !platform || !userId) {
    return response.status(400).json({ error: 'accountRefId, platform, and userId are required' });
  }

  try {
    const now = new Date();
    const since = new Date(now);
    since.setDate(since.getDate() - Math.min(days, 90));

    let token: string;
    let platformAccountId: string;

    if (platform === 'facebook') {
      const { data: page, error } = await supabaseAdmin
        .from('facebook_pages')
        .select('page_id, page_access_token')
        .eq('id', accountRefId)
        .eq('user_id', userId)
        .single();

      if (error || !page) {
        return response.status(404).json({ error: 'Facebook page not found' });
      }

      token = page.page_access_token;
      platformAccountId = page.page_id;
    } else if (platform === 'instagram') {
      const { data: igAccount, error } = await supabaseAdmin
        .from('instagram_accounts')
        .select('instagram_business_id, facebook_pages ( page_access_token )')
        .eq('id', accountRefId)
        .eq('user_id', userId)
        .single();

      if (error || !igAccount) {
        return response.status(404).json({ error: 'Instagram account not found' });
      }

      token = (igAccount.facebook_pages as any)?.page_access_token;
      platformAccountId = igAccount.instagram_business_id;

      if (!token) {
        return response.status(400).json({ error: 'No token available for Instagram account' });
      }
    } else {
      return response.status(400).json({ error: 'Invalid platform. Use "facebook" or "instagram"' });
    }

    // Fetch insights from Meta
    let insightDays: { date: string; impressions: number; reach: number; engagement: number; followers: number }[];

    if (platform === 'facebook') {
      insightDays = await fetchFacebookPageInsights(platformAccountId, token, since, now);
    } else {
      insightDays = await fetchInstagramAccountInsights(platformAccountId, token, since, now);
    }

    // Pre-fetch previous day's followers for delta computation (IG only)
    let previousDayFollowers: number | null = null;
    if (platform === 'instagram' && insightDays.length > 0) {
      const { data: prevRow } = await supabaseAdmin
        .from('account_insights')
        .select('followers')
        .eq('account_ref_id', accountRefId)
        .lt('metric_date', insightDays[0].date)
        .order('metric_date', { ascending: false })
        .limit(1)
        .maybeSingle();
      previousDayFollowers = prevRow?.followers ?? null;
    }

    // Upsert each day
    let upserted = 0;
    for (const day of insightDays) {
      let followers_delta = 0;
      let followers_growth_pct = 0;
      if (platform === 'instagram' && previousDayFollowers !== null) {
        followers_delta = day.followers - previousDayFollowers;
        followers_growth_pct = previousDayFollowers > 0
          ? (followers_delta / previousDayFollowers) * 100
          : 0;
      }
      previousDayFollowers = day.followers;

      const { error: upsertError } = await supabaseAdmin
        .from('account_insights')
        .upsert({
          user_id: userId,
          platform,
          account_ref_id: accountRefId,
          platform_account_id: platformAccountId,
          metric_date: day.date,
          impressions: day.impressions,
          reach: day.reach,
          engagement: day.engagement,
          followers: day.followers,
          profile_views: day.profile_views ?? 0,
          website_clicks: day.website_clicks ?? 0,
          accounts_engaged: day.accounts_engaged ?? 0,
          followers_delta,
          followers_growth_pct,
          fetched_at: now.toISOString(),
        }, { onConflict: 'account_ref_id,metric_date' });

      if (!upsertError) upserted++;
    }

    return response.status(200).json({
      success: true,
      days_synced: upserted,
      total_days: insightDays.length,
    });
  } catch (err: any) {
    if (isPermissionError(err)) {
      return response.status(403).json({
        error: 'permission_denied',
        message: err.message,
        requires: ['read_insights', 'instagram_manage_insights'],
      });
    }
    console.error('[Insights Account] Error:', err.message);
    return response.status(500).json({ error: err.message });
  }
}
