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

  if (!response.ok || json.error) {
    throw createMetaError(json);
  }

  const result: FBPostInsight = {
    impressions: 0,
    reach: 0,
    engagement: 0,
    clicks: 0,
    reactions: {}
  };

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
  // REELS have different available metrics than IMAGE/CAROUSEL
  const isReel = mediaType?.toUpperCase() === 'VIDEO' || mediaType?.toUpperCase() === 'REELS';

  const metrics = isReel
    ? ['impressions', 'reach', 'likes', 'comments', 'shares', 'saved'].join(',')
    : ['impressions', 'reach', 'likes', 'comments', 'saved'].join(',');

  const url = `${META_GRAPH_BASE}/${igPostId}/insights?metric=${metrics}&access_token=${accessToken}`;
  const response = await fetch(url);
  const json = await response.json();

  if (!response.ok || json.error) {
    throw createMetaError(json);
  }

  const result: IGPostInsight = {
    impressions: 0,
    reach: 0,
    engagement: 0,
    likes: 0,
    comments: 0,
    shares: 0,
    saves: 0
  };

  for (const entry of json.data || []) {
    const value = entry.values?.[0]?.value ?? 0;
    switch (entry.name) {
      case 'impressions':
        result.impressions = value;
        break;
      case 'reach':
        result.reach = value;
        break;
      case 'likes':
        result.likes = value;
        break;
      case 'comments':
        result.comments = value;
        break;
      case 'shares':
        result.shares = value;
        break;
      case 'saved':
        result.saves = value;
        break;
    }
  }

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
  const metrics = 'page_impressions,page_engaged_users,page_fans';

  const url = `${META_GRAPH_BASE}/${pageId}/insights?metric=${metrics}&period=day&since=${sinceUnix}&until=${untilUnix}&access_token=${accessToken}`;
  const response = await fetch(url);
  const json = await response.json();

  if (!response.ok || json.error) {
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
        case 'page_engaged_users':
          day.engagement = val.value ?? 0;
          break;
        case 'page_fans':
          day.followers = val.value ?? 0;
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
  const metrics = 'impressions,reach,follower_count';

  const url = `${META_GRAPH_BASE}/${igBusinessId}/insights?metric=${metrics}&period=day&since=${sinceUnix}&until=${untilUnix}&access_token=${accessToken}`;
  const response = await fetch(url);
  const json = await response.json();

  if (!response.ok || json.error) {
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
        case 'impressions':
          day.impressions = val.value ?? 0;
          break;
        case 'reach':
          day.reach = val.value ?? 0;
          break;
        case 'follower_count':
          day.followers = val.value ?? 0;
          break;
      }
    }
  }

  return Array.from(dayMap.values()).sort((a, b) => a.date.localeCompare(b.date));
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
