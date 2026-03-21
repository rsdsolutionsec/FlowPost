/**
 * Módulo de Meta Insights API para Flowpost
 * Consulta métricas de rendimiento de posts y cuentas desde Facebook e Instagram.
 */

const META_GRAPH_VERSION = 'v19.0';
const META_GRAPH_BASE = `https://graph.facebook.com/${META_GRAPH_VERSION}`;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FBPostInsight {
  impressions: number;
  reach: number;
  engagement: number;
  clicks: number;
  reactions: Record<string, number>;
}

export interface IGPostInsight {
  impressions: number;
  reach: number;
  engagement: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
}

export interface AccountInsightDay {
  date: string;
  impressions: number;
  reach: number;
  engagement: number;
  followers: number;
  // IG-only extended metrics (optional — not available for Facebook)
  profile_views?: number;
  website_clicks?: number;
  accounts_engaged?: number;
}

export interface OnlineFollowerDataPoint {
  day: number;   // 0 = Sunday, 6 = Saturday (Meta encoding)
  hour: number;  // 0–23
  value: number;
}

export interface RateLimitInfo {
  callCount: number;
  isNearLimit: boolean;
}

// ─── Facebook Post Insights ───────────────────────────────────────────────────

export async function fetchFacebookPostInsights(
  fbPostId: string,
  accessToken: string
): Promise<FBPostInsight> {
  const metrics = [
    'post_impressions',
    'post_impressions_unique',
    'post_engaged_users',
    'post_clicks',
    'post_reactions_by_type_total'
  ].join(',');

  const url = `${META_GRAPH_BASE}/${fbPostId}/insights?metric=${metrics}&access_token=${accessToken}`;
  const response = await fetch(url);
  const json = await response.json();

  const result: FBPostInsight = {
    impressions: 0,
    reach: 0,
    engagement: 0,
    clicks: 0,
    reactions: {}
  };

  if (!response.ok || json.error) {
    // Code 100: post deleted, doesn't exist, or doesn't support insights — return zeros
    if (json?.error?.code === 100) return result;
    throw createMetaError(json);
  }

  for (const entry of json.data || []) {
    const value = entry.values?.[0]?.value ?? 0;
    switch (entry.name) {
      case 'post_impressions':
        result.impressions = value;
        break;
      case 'post_impressions_unique':
        result.reach = value;
        break;
      case 'post_engaged_users':
        result.engagement = value;
        break;
      case 'post_clicks':
        result.clicks = value;
        break;
      case 'post_reactions_by_type_total':
        result.reactions = typeof value === 'object' ? value : {};
        break;
    }
  }

  return result;
}

// ─── Instagram Media Insights ─────────────────────────────────────────────────

export async function fetchInstagramMediaInsights(
  igPostId: string,
  accessToken: string,
  mediaType?: string
): Promise<IGPostInsight> {
  const result: IGPostInsight = {
    impressions: 0,
    reach: 0,
    engagement: 0,
    likes: 0,
    comments: 0,
    shares: 0,
    saves: 0
  };

  // 1. Get like_count and comments_count as fields (guaranteed for all media types)
  const fieldsUrl = `${META_GRAPH_BASE}/${igPostId}?fields=like_count,comments_count&access_token=${accessToken}`;
  const fieldsRes = await fetch(fieldsUrl);
  const fieldsJson = await fieldsRes.json();

  if (!fieldsRes.ok || fieldsJson.error) {
    // If the post no longer exists on Instagram, return zeros instead of failing the sync
    const errCode = fieldsJson?.error?.code;
    const errMsg: string = fieldsJson?.error?.message ?? '';
    if (errCode === 100 && (errMsg.includes('does not exist') || errMsg.includes('missing permissions') || errMsg.includes('does not support'))) {
      return result;
    }
    throw createMetaError(fieldsJson);
  }

  result.likes = fieldsJson.like_count ?? 0;
  result.comments = fieldsJson.comments_count ?? 0;

  // 2. Get insight metrics (reach + saves for images; add shares for reels)
  const isReel = mediaType?.toUpperCase() === 'VIDEO' || mediaType?.toUpperCase() === 'REELS';
  const insightMetrics = isReel
    ? ['reach', 'saves', 'shares'].join(',')
    : ['reach', 'saves'].join(',');

  const insightsUrl = `${META_GRAPH_BASE}/${igPostId}/insights?metric=${insightMetrics}&access_token=${accessToken}`;
  const insightsRes = await fetch(insightsUrl);
  const insightsJson = await insightsRes.json();

  if (insightsRes.ok && !insightsJson.error) {
    for (const entry of insightsJson.data || []) {
      const value = entry.values?.[0]?.value ?? entry.value ?? 0;
      switch (entry.name) {
        case 'reach':
          result.reach = value;
          break;
        case 'saves':
          result.saves = value;
          break;
        case 'shares':
          result.shares = value;
          break;
      }
    }
  }
  // If insights fail (e.g. too recent), we still have likes/comments from fields

  result.engagement = result.likes + result.comments + result.shares + result.saves;

  return result;
}

// ─── Facebook Page Insights ───────────────────────────────────────────────────

export async function fetchFacebookPageInsights(
  pageId: string,
  accessToken: string,
  since: Date,
  until: Date
): Promise<AccountInsightDay[]> {
  const sinceUnix = Math.floor(since.getTime() / 1000);
  const untilUnix = Math.floor(until.getTime() / 1000);
  const metrics = 'page_impressions,page_impressions_unique,page_engaged_users';

  const url = `${META_GRAPH_BASE}/${pageId}/insights?metric=${metrics}&period=day&since=${sinceUnix}&until=${untilUnix}&access_token=${accessToken}`;
  const response = await fetch(url);
  const json = await response.json();

  if (!response.ok || json.error) {
    if (json?.error?.code === 100) return [];
    throw createMetaError(json);
  }

  const dayMap = new Map<string, AccountInsightDay>();

  for (const entry of json.data || []) {
    for (const val of entry.values || []) {
      const date = val.end_time?.split('T')[0];
      if (!date) continue;

      if (!dayMap.has(date)) {
        dayMap.set(date, { date, impressions: 0, reach: 0, engagement: 0, followers: 0 });
      }
      const day = dayMap.get(date)!;

      switch (entry.name) {
        case 'page_impressions':
          day.impressions = val.value ?? 0;
          break;
        case 'page_impressions_unique':
          day.reach = val.value ?? 0;
          break;
        case 'page_engaged_users':
          day.engagement = val.value ?? 0;
          break;
      }
    }
  }

  return Array.from(dayMap.values()).sort((a, b) => a.date.localeCompare(b.date));
}

// ─── Instagram Account Insights ───────────────────────────────────────────────

export async function fetchInstagramAccountInsights(
  igBusinessId: string,
  accessToken: string,
  since: Date,
  until: Date
): Promise<AccountInsightDay[]> {
  const sinceUnix = Math.floor(since.getTime() / 1000);
  const untilUnix = Math.floor(until.getTime() / 1000);

  // Attempt 1: wide call with all available IG account metrics
  const wideMetrics = 'reach,follower_count,profile_views,website_clicks,accounts_engaged';
  const wideUrl = `${META_GRAPH_BASE}/${igBusinessId}/insights?metric=${wideMetrics}&period=day&since=${sinceUnix}&until=${untilUnix}&access_token=${accessToken}`;
  const wideRes = await fetch(wideUrl);
  let json = await wideRes.json();

  // If code 100, one of the extended metrics is unsupported — fall back to proven subset
  if (!wideRes.ok || json.error) {
    if (json?.error?.code === 100) {
      const narrowMetrics = 'reach,follower_count';
      const narrowUrl = `${META_GRAPH_BASE}/${igBusinessId}/insights?metric=${narrowMetrics}&period=day&since=${sinceUnix}&until=${untilUnix}&access_token=${accessToken}`;
      const narrowRes = await fetch(narrowUrl);
      json = await narrowRes.json();
      if (!narrowRes.ok || json.error) {
        if (json?.error?.code === 100) return [];
        throw createMetaError(json);
      }
    } else {
      throw createMetaError(json);
    }
  }

  const dayMap = new Map<string, AccountInsightDay>();

  for (const entry of json.data || []) {
    for (const val of entry.values || []) {
      const date = val.end_time?.split('T')[0];
      if (!date) continue;

      if (!dayMap.has(date)) {
        dayMap.set(date, {
          date, impressions: 0, reach: 0, engagement: 0, followers: 0,
          profile_views: 0, website_clicks: 0, accounts_engaged: 0,
        });
      }
      const day = dayMap.get(date)!;

      switch (entry.name) {
        case 'reach':            day.reach = val.value ?? 0; break;
        case 'follower_count':   day.followers = val.value ?? 0; break;
        case 'profile_views':    day.profile_views = val.value ?? 0; break;
        case 'website_clicks':   day.website_clicks = val.value ?? 0; break;
        case 'accounts_engaged': day.accounts_engaged = val.value ?? 0; break;
      }
    }
  }

  return Array.from(dayMap.values()).sort((a, b) => a.date.localeCompare(b.date));
}

// ─── Instagram Online Followers (Best Hours) ──────────────────────────────────

export async function fetchInstagramOnlineFollowers(
  igBusinessId: string,
  accessToken: string
): Promise<OnlineFollowerDataPoint[]> {
  const url = `${META_GRAPH_BASE}/${igBusinessId}/insights?metric=online_followers&period=lifetime&access_token=${accessToken}`;
  const response = await fetch(url);
  const json = await response.json();

  if (!response.ok || json.error) {
    // Code 100: not available for this account (too small or not business)
    if (json?.error?.code === 100) return [];
    throw createMetaError(json);
  }

  const result: OnlineFollowerDataPoint[] = [];
  const entry = (json.data || [])[0];
  if (!entry) return result;

  // Response format: values[0].value = { "0": { "0": count, "1": count, ... }, "1": { ... }, ... }
  // Outer key = day of week (0=Sun, 6=Sat), inner key = hour (0–23)
  const valueObj = entry.values?.[0]?.value;
  if (!valueObj || typeof valueObj !== 'object') return result;

  for (const [dayStr, hours] of Object.entries(valueObj)) {
    const day = parseInt(dayStr, 10);
    if (isNaN(day) || typeof hours !== 'object' || hours === null) continue;
    for (const [hourStr, count] of Object.entries(hours as Record<string, number>)) {
      const hour = parseInt(hourStr, 10);
      if (!isNaN(hour)) result.push({ day, hour, value: count });
    }
  }

  return result;
}

// ─── Instagram Stories Insights (Stub) ────────────────────────────────────────
/**
 * Stories insights are NOT fully implemented.
 *
 * AVAILABLE via Meta Graph API (while story is active, within 24h):
 *   GET /{ig-user-id}/stories → list of active story media IDs
 *   GET /{ig-media-id}/insights?metric=exits,impressions,reach,replies,taps_forward,taps_back
 *   Required permission: instagram_manage_insights
 *
 * NOT AVAILABLE:
 *   - Historical story data (stories expire after 24h, media object becomes inaccessible)
 *   - Story saves, story shares (not supported metrics)
 *   - Aggregated daily story impressions with period=day
 *
 * To implement properly: run a high-frequency sync (every 6-12h) and persist
 * story insights before they expire. Requires a dedicated `story_insights` table.
 */
export async function fetchInstagramStoriesInsights(
  _igBusinessId: string,
  _accessToken: string
): Promise<never[]> {
  // NOT IMPLEMENTED — see documentation above
  return [];
}

// ─── Error Helpers ────────────────────────────────────────────────────────────

interface MetaApiError extends Error {
  code?: number;
  subcode?: number;
  type?: string;
}

function createMetaError(json: any): MetaApiError {
  const err = json.error || {};
  const error = new Error(err.message || 'Meta API error') as MetaApiError;
  error.code = err.code;
  error.subcode = err.error_subcode;
  error.type = err.type;
  return error;
}

export function isPermissionError(error: any): boolean {
  // Code 190 = expired/invalid token
  // Subcode 463 = expired token
  // Code 10 = missing permission (#10)
  // Type OAuthException with code 200 = permission not granted
  const code = error?.code;
  const subcode = error?.subcode;
  return (
    code === 190 ||
    subcode === 463 ||
    code === 10 ||
    (code === 200 && error?.type === 'OAuthException')
  );
}

export function parseRateLimitHeaders(headers: Headers): RateLimitInfo {
  try {
    const appUsage = headers.get('x-app-usage');
    if (appUsage) {
      const usage = JSON.parse(appUsage);
      const callCount = usage.call_count || 0;
      return { callCount, isNearLimit: callCount > 80 };
    }
  } catch {
    // ignore parse errors
  }
  return { callCount: 0, isNearLimit: false };
}
