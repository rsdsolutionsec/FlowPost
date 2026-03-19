import { supabaseAdmin } from '../lib/supabase.js';
import { processScheduledPosts } from '../lib/scheduler.js';

export default async function handler(request: any, response: any) {
  // Verificacin bsica de seguridad (opcional, recomendable usar un secreto en los headers)
  const authHeader = request.headers['authorization'];
  const cronSecret = process.env.CRON_SECRET;
  const querySecret = request.query.secret;

  if (cronSecret && querySecret !== cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return response.status(401).json({ error: 'Unauthorized' });
  }

  const now = new Date().toISOString();
  console.log(`[Cron Job] Iniciando ejecucin a las ${now}`);

  try {
    const result = await processScheduledPosts();
    
    return response.status(200).json({
      job: 'publish_scheduled_posts',
      executed_at: now,
      summary: {
        total_processed: result.processed || 0,
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
