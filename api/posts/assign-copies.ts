import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from '../../lib/supabase.js';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { userId, mode, overwrite } = req.body;

    if (!userId || mode !== 'auto') {
      return res.status(400).json({ error: 'Invalid parameters' });
    }

    // 1. Fetch all available copies for user
    const { data: copies, error: copiesError } = await supabaseAdmin
      .from('copies')
      .select('id, content')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (copiesError) throw copiesError;
    if (!copies || copies.length === 0) {
      return res.status(400).json({ error: 'No copies found in your library.' });
    }

    // 2. Fetch scheduled posts
    let postsQuery = supabaseAdmin
      .from('posts')
      .select('id, copy_id, custom_caption, caption')
      .eq('user_id', userId)
      .eq('status', 'scheduled')
      .order('scheduled_at', { ascending: true });

    const { data: posts, error: postsError } = await postsQuery;
    
    if (postsError) throw postsError;
    if (!posts || posts.length === 0) {
      return res.status(400).json({ error: 'No scheduled posts found.' });
    }

    // 3. Filter posts if overwrite is false
    const postsToUpdate = overwrite 
      ? posts 
      : posts.filter(p => !p.copy_id && !p.custom_caption && !p.caption);

    if (postsToUpdate.length === 0) {
      return res.status(200).json({ 
        success: true, 
        message: 'All posts already have captions.', 
        updated: 0 
      });
    }

    // 4. Assign sequentially and update
    let updatedCount = 0;
    const updatePromises = postsToUpdate.map(async (post, index) => {
      const assignedCopy = copies[index % copies.length];
      
      const { error } = await supabaseAdmin
        .from('posts')
        .update({
          copy_id: assignedCopy.id,
          custom_caption: (assignedCopy as any).content,
          caption: null
        })
        .eq('id', post.id);

      if (!error) {
        updatedCount++;
      }
    });

    await Promise.all(updatePromises);

    return res.status(200).json({
      success: true,
      updated: updatedCount,
      total: postsToUpdate.length
    });

  } catch (error: any) {
    console.error('[Assign Copies API] Error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      details: error.message
    });
  }
}
