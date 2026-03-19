import { supabase } from './supabase';

export async function schedulePost(post: {
  account_id: string;
  content: string;
  image_url?: string;
  scheduled_for: string;
  platform: 'facebook' | 'instagram';
}) {
  const { data, error } = await supabase
    .from('scheduled_posts')
    .insert([{
      ...post,
      status: 'scheduled',
      created_at: new Date().toISOString()
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getUpcomingPosts() {
  const { data, error } = await supabase
    .from('scheduled_posts')
    .select('*, accounts(name, platform)')
    .eq('status', 'scheduled')
    .order('scheduled_for', { ascending: true });

  if (error) throw error;
  return data;
}
