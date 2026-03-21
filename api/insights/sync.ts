import { supabaseAdmin } from '../../lib/supabase.js';
import {
  fetchFacebookPostInsights,
  fetchInstagramMediaInsights,
  fetchFacebookPageInsights,
  fetchInstagramAccountInsights,
  isPermissionError,
} from '../../lib/insights.js';

const SIX_HOURS_MS = 6 * 60 * 60 * 1000;
const MAX_CALLS_PER_RUN = 150;

export default async function handler(request: any, response: any) {
  const authHeader = request.headers['authorization'];
  const cronSecret = process.env.CRON_SECRET;
  const querySecret = request.query?.secret;

  if (cronSecret && querySecret !== cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return response.status(401).json({ error: 'Unauthorized' });
  }

  const now = new Date();
  console.log(`[Insights Sync] Iniciando sincronización a las ${now.toISOString()}`);

  let syncedPosts = 0;
  let syncedAccounts = 0;
  let skipped = 0;
  let errors: string[] = [];
  let apiCalls = 0;

  try {
    // 1. Fetch published posts with their account tokens
    const { data: posts, error: postsError } = await supabaseAdmin
      .from('posts')
      .select(`
        id, user_id, platform, metadata,
        facebook_pages ( id, page_id, page_access_token ),
        instagram_accounts ( id, instagram_business_id, facebook_pages ( page_access_token ) )
      `)
      .eq('status', 'published')
      .not('metadata', 'is', null);

    if (postsError) {
      throw new Error(`Error consultando posts: ${postsError.message}`);
    }

    // 2. Filter posts that have a platform post ID and need syncing
    const postsToSync = [];
    for (const post of posts || []) {
      const meta = post.metadata as any;
      if (!meta) continue;

      const hasFbId = !!meta.fb_post_id;
      const hasIgId = !!meta.ig_post_id;
      if (!hasFbId && !hasIgId) continue;

      // Check if already synced recently
      const { data: existing } = await supabaseAdmin
        .from('post_insights')
        .select('fetched_at')
        .eq('post_id', post.id)
        .single();

      if (existing?.fetched_at) {
        const lastFetch = new Date(existing.fetched_at).getTime();
        if (now.getTime() - lastFetch < SIX_HOURS_MS) {
          skipped++;
          continue;
        }
      }

      postsToSync.push(post);
    }

    console.log(`[Insights Sync] ${postsToSync.length} posts por sincronizar, ${skipped} omitidos (recientes)`);

    // 3. Sync post insights
    const accountsToSync = new Map<string, { refId: string; platformAccountId: string; platform: string; token: string; userId: string }>();

    for (const post of postsToSync) {
      if (apiCalls >= MAX_CALLS_PER_RUN) {
        console.log('[Insights Sync] Rate limit preventivo alcanzado, deteniendo.');
        break;
      }

      const meta = post.metadata as any;

      try {
        let insightData: any;
        let platformPostId: string;
        let platform: string;

        if (meta.fb_post_id && post.facebook_pages) {
          const page = post.facebook_pages as any;
          platformPostId = meta.fb_post_id;
          platform = 'facebook';

          const fbInsights = await fetchFacebookPostInsights(platformPostId, page.page_access_token);
          apiCalls++;

          insightData = {
            impressions: fbInsights.impressions,
            reach: fbInsights.reach,
            engagement: fbInsights.engagement,
            clicks: fbInsights.clicks,
            likes: fbInsights.reactions?.like || 0,
            comments: 0,
            shares: 0,
            saves: 0,
            reactions: fbInsights.reactions,
          };

          // Track account for page-level sync
          accountsToSync.set(page.id, {
            refId: page.id,
            platformAccountId: page.page_id,
            platform: 'facebook',
            token: page.page_access_token,
            userId: post.user_id,
          });
        } else if (meta.ig_post_id && post.instagram_accounts) {
          const igData = post.instagram_accounts as any;
          platformPostId = meta.ig_post_id;
          platform = 'instagram';
          const igToken = igData.facebook_pages?.page_access_token;

          if (!igToken) {
            errors.push(`Post ${post.id}: No token for Instagram`);
            continue;
          }

          const igInsights = await fetchInstagramMediaInsights(platformPostId, igToken, meta.media_type);
          apiCalls++;

          insightData = {
            impressions: igInsights.impressions,
            reach: igInsights.reach,
            engagement: igInsights.engagement,
            clicks: 0,
            likes: igInsights.likes,
            comments: igInsights.comments,
            shares: igInsights.shares,
            saves: igInsights.saves,
            reactions: {},
          };

          // Track account for account-level sync
          accountsToSync.set(igData.id, {
            refId: igData.id,
            platformAccountId: igData.instagram_business_id,
            platform: 'instagram',
            token: igToken,
            userId: post.user_id,
          });
        } else {
          skipped++;
          continue;
        }

        // Upsert into post_insights
        const { error: upsertError } = await supabaseAdmin
          .from('post_insights')
          .upsert({
            post_id: post.id,
            user_id: post.user_id,
            platform,
            platform_post_id: platformPostId!,
            ...insightData,
            fetched_at: now.toISOString(),
          }, { onConflict: 'post_id' });

        if (upsertError) {
          errors.push(`Post ${post.id}: upsert error - ${upsertError.message}`);
        } else {
          syncedPosts++;
        }
      } catch (err: any) {
        const detail = err.code ? ` (code: ${err.code})` : '';
        if (isPermissionError(err)) {
          errors.push(`Post ${post.id}: permiso insuficiente - ${err.message}${detail}`);
        } else {
          errors.push(`Post ${post.id}: ${err.message}${detail}`);
        }
        console.error(`[Insights Sync] Error post ${post.id}:`, err.message, detail);
      }
    }

    // 4. Sync account-level insights (last 7 days)
    const since = new Date(now);
    since.setDate(since.getDate() - 7);

    for (const [, account] of accountsToSync) {
      if (apiCalls >= MAX_CALLS_PER_RUN) break;

      try {
        let days: { date: string; impressions: number; reach: number; engagement: number; followers: number; profile_views?: number; website_clicks?: number; accounts_engaged?: number }[];

        if (account.platform === 'facebook') {
          days = await fetchFacebookPageInsights(account.platformAccountId, account.token, since, now);
        } else {
          days = await fetchInstagramAccountInsights(account.platformAccountId, account.token, since, now);
        }
        apiCalls++;

        // Pre-fetch previous day's followers for delta computation (IG only)
        let previousDayFollowers: number | null = null;
        if (account.platform === 'instagram' && days.length > 0) {
          const { data: prevRow } = await supabaseAdmin
            .from('account_insights')
            .select('followers')
            .eq('account_ref_id', account.refId)
            .lt('metric_date', days[0].date)
            .order('metric_date', { ascending: false })
            .limit(1)
            .maybeSingle();
          previousDayFollowers = prevRow?.followers ?? null;
        }

        for (const day of days) {
          let followers_delta = 0;
          let followers_growth_pct = 0;
          if (account.platform === 'instagram' && previousDayFollowers !== null) {
            followers_delta = day.followers - previousDayFollowers;
            followers_growth_pct = previousDayFollowers > 0
              ? (followers_delta / previousDayFollowers) * 100
              : 0;
          }
          previousDayFollowers = day.followers;

          await supabaseAdmin
            .from('account_insights')
            .upsert({
              user_id: account.userId,
              platform: account.platform,
              account_ref_id: account.refId,
              platform_account_id: account.platformAccountId,
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
        }

        syncedAccounts++;
      } catch (err: any) {
        errors.push(`Account ${account.platformAccountId}: ${err.message}`);
      }
    }
  } catch (err: any) {
    console.error('[Insights Sync] Error crítico:', err);
    return response.status(500).json({ error: err.message });
  }

  const summary = {
    job: 'sync_insights',
    executed_at: now.toISOString(),
    synced_posts: syncedPosts,
    synced_accounts: syncedAccounts,
    skipped,
    api_calls: apiCalls,
    errors: errors.length > 0 ? errors : undefined,
    rate_limited: apiCalls >= MAX_CALLS_PER_RUN,
  };

  console.log('[Insights Sync] Finalizado:', JSON.stringify(summary));
  return response.status(200).json(summary);
}
