import { supabaseAdmin } from '../../lib/supabase.js';
import { fetchInstagramOnlineFollowers } from '../../lib/insights.js';

export default async function handler(request: any, response: any) {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method not allowed' });
  }

  const { accountRefId, userId } = request.body || {};

  if (!accountRefId || !userId) {
    return response.status(400).json({ error: 'accountRefId and userId are required' });
  }

  try {
    const { data: igAccount, error } = await supabaseAdmin
      .from('instagram_accounts')
      .select('instagram_business_id, facebook_pages ( page_access_token )')
      .eq('id', accountRefId)
      .eq('user_id', userId)
      .single();

    if (error || !igAccount) {
      return response.status(404).json({ error: 'Instagram account not found' });
    }

    const token = (igAccount.facebook_pages as any)?.page_access_token;
    if (!token) {
      return response.status(400).json({ error: 'No token available for Instagram account' });
    }

    const data = await fetchInstagramOnlineFollowers(igAccount.instagram_business_id, token);

    return response.status(200).json({ success: true, data });
  } catch (err: any) {
    console.error('[Best Hours] Error:', err.message);
    return response.status(500).json({ error: err.message });
  }
}
