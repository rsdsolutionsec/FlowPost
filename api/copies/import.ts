import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from '../../lib/supabase.js';

/**
 * API Handler for Bulk Copy Import
 * Supports CSV (name,content) and TXT (name | content)
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { format, copies, userId } = req.body;

    // We allow sending parsed copies directly from frontend (JSON)
    // to avoid multipart parsing complexity in serverless,
    // which also enables the "Preview" feature requested.
    if (!Array.isArray(copies) || copies.length === 0) {
      return res.status(400).json({ error: 'No copies provided' });
    }

    if (!userId) {
      return res.status(400).json({ error: 'Missing user_id' });
    }

    const imported: any[] = [];
    const errors: string[] = [];
    let importedCount = 0;
    let failedCount = 0;

    // Process and validate
    const toInsert = copies.map((item: any, index: number) => {
      const name = item.name?.trim() || `Imported Copy ${index + 1}`;
      const content = item.content?.trim();
      const suggested_at = item.suggested_at || null;
      const media_path = item.media_path?.trim() || null;
      const platform = item.platform || 'facebook';

      if (!content) {
        failedCount++;
        errors.push(`Row ${index + 1}: Content is empty.`);
        return null;
      }

      return {
        user_id: userId,
        name,
        content,
        suggested_at,
        media_path,
        platform
      };
    }).filter(Boolean);

    let importedCopies: any[] = [];

    if (toInsert.length > 0) {
      const { data, error } = await supabaseAdmin
        .from('copies')
        .insert(toInsert)
        .select();

      if (error) {
        throw error;
      }
      importedCount = data?.length || 0;
      importedCopies = data || [];
    }

    return res.status(200).json({
      success: true,
      imported: importedCount,
      importedCopies,
      failed: failedCount,
      errors
    });

  } catch (error: any) {
    console.error('[Import API] Error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      details: error.message
    });
  }
}
