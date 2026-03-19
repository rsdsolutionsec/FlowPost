import type { VercelRequest, VercelResponse } from '@vercel/node';
import { processScheduledPosts } from '../src/lib/scheduler';

export default async function handler(
  request: VercelRequest,
  response: VercelResponse
) {
  const now = new Date().toISOString();
  console.log(`[Cron Job] Execution started at ${now}`);

  const authHeader = request.headers.authorization;
  const querySecret = request.query.secret;
  const secretKey = process.env.CRON_SECRET;

  const isAuthorized = secretKey && (
    authHeader === `Bearer ${secretKey}` || 
    querySecret === secretKey
  );

  if (!isAuthorized) {
    console.warn(`[Cron Job] Unauthorized attempt at ${now}`);
    return response.status(401).json({ 
      error: 'Unauthorized',
      message: 'Invalid or missing CRON_SECRET token.'
    });
  }

  try {
    console.log('[Cron Job] Secret validated. Processing scheduled posts...');
    const result = await processScheduledPosts();

    const duration = new Date().getTime() - new Date(now).getTime();
    console.log(`[Cron Job] Execution finished. Processed: ${result.processed}, Succeeded: ${result.succeeded}, Failed: ${result.failed}. Duration: ${duration}ms`);

    return response.status(200).json({
      job: 'publish_scheduled_posts',
      executed_at: now,
      finished_at: new Date().toISOString(),
      performance: {
        duration_ms: duration
      },
      results: {
        total_posts_processed: result.processed || 0,
        successful_publishes: result.succeeded || 0,
        failed_publishes: result.failed || 0
      },
      status: result.success ? 'success' : 'partial_failure'
    });
  } catch (error: any) {
    console.error('[Cron Job] Critical error during execution:', error);
    return response.status(500).json({
      job: 'publish_scheduled_posts',
      executed_at: now,
      error: 'Internal Server Error',
      details: error.message
    });
  }
}
