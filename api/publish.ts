import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function publishPendingPosts() {
  console.log('Checking for pending posts...');
  
  const { data: posts, error } = await supabase
    .from('scheduled_posts')
    .select('*, accounts(*)')
    .eq('status', 'scheduled')
    .lte('scheduled_for', new Date().toISOString());

  if (error) {
    console.error('Error fetching posts:', error);
    return;
  }

  console.log(`Found ${posts?.length || 0} pending posts`);

  for (const post of posts || []) {
    try {
      console.log(`Publishing post ${post.id} to ${post.platform}...`);
      
      // Here you would implement the actual Meta Graph API call
      // For now, we'll just mark it as published
      
      const { error: updateError } = await supabase
        .from('scheduled_posts')
        .update({ 
          status: 'published',
          published_at: new Date().toISOString()
        })
        .eq('id', post.id);

      if (updateError) throw updateError;
      
      console.log(`Successfully published post ${post.id}`);
    } catch (err) {
      console.error(`Failed to publish post ${post.id}:`, err);
      
      await supabase
        .from('scheduled_posts')
        .update({ status: 'failed' })
        .eq('id', post.id);
    }
  }
}

// Run every minute
setInterval(publishPendingPosts, 60000);
publishPendingPosts();
