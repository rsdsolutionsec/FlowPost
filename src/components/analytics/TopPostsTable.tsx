import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';

interface PostInsight {
  id: string;
  post_id: string;
  platform: string;
  impressions: number;
  reach: number;
  engagement: number;
  likes: number;
  comments: number;
  clicks: number;
  posts: {
    caption: string;
    image_path: string;
    platform: string;
    scheduled_at: string;
  };
}

interface TopPostsTableProps {
  userId: string;
  dateRange: { since: Date; until: Date };
  accountId: string;
  loading?: boolean;
}

export default function TopPostsTable({ userId, dateRange, accountId, loading }: TopPostsTableProps) {
  const [posts, setPosts] = useState<PostInsight[]>([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    async function fetch() {
      setFetching(true);
      let query = supabase
        .from('post_insights')
        .select(`
          id, post_id, platform, impressions, reach, engagement, likes, comments, clicks,
          posts!inner ( caption, image_path, platform, scheduled_at, facebook_page_id, instagram_account_id )
        `)
        .eq('user_id', userId)
        .order('engagement', { ascending: false })
        .limit(10);

      if (accountId !== 'all') {
        query = query.or(
          `facebook_page_id.eq.${accountId},instagram_account_id.eq.${accountId}`,
          { referencedTable: 'posts' }
        );
      }

      const { data } = await query;
      setPosts((data as any) || []);
      setFetching(false);
    }
    fetch();
  }, [userId, dateRange.since.toISOString(), accountId]);

  const isLoading = loading || fetching;

  if (isLoading) {
    return (
      <div className="bg-surface-container-lowest p-6 sm:p-8 rounded-2xl shadow-sm ghost-border">
        <h3 className="font-bold text-lg text-on-surface mb-6 font-headline">Top Publicaciones</h3>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 bg-slate-50 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!posts.length) {
    return (
      <div className="bg-surface-container-lowest p-6 sm:p-8 rounded-2xl shadow-sm ghost-border">
        <h3 className="font-bold text-lg text-on-surface mb-6 font-headline">Top Publicaciones</h3>
        <div className="flex flex-col items-center py-10">
          <span className="material-symbols-outlined text-5xl text-slate-200 mb-3">leaderboard</span>
          <p className="text-slate-400 font-bold text-sm">No hay datos de publicaciones</p>
          <p className="text-slate-300 text-xs mt-1">Sincroniza tus insights para ver el ranking</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface-container-lowest p-6 sm:p-8 rounded-2xl shadow-sm ghost-border">
      <h3 className="font-bold text-lg text-on-surface mb-6 font-headline flex items-center gap-2">
        <span className="material-symbols-outlined text-amber-500 text-[20px]">leaderboard</span>
        Top Publicaciones
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
              <th className="text-left py-3 pr-4">#</th>
              <th className="text-left py-3 pr-4">Post</th>
              <th className="text-left py-3 pr-4 hidden sm:table-cell">Plataforma</th>
              <th className="text-right py-3 pr-4">Impr.</th>
              <th className="text-right py-3 pr-4">Alcance</th>
              <th className="text-right py-3">Eng.</th>
            </tr>
          </thead>
          <tbody>
            {posts.map((insight, idx) => {
              const post = insight.posts as any;
              return (
                <tr key={insight.id} className="border-b border-slate-50 hover:bg-slate-25 transition-colors">
                  <td className="py-3 pr-4 font-black text-slate-300">{idx + 1}</td>
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-slate-100 overflow-hidden flex-shrink-0">
                        <AssetThumb path={post.image_path} />
                      </div>
                      <span className="font-bold text-slate-700 truncate max-w-[200px]">
                        {(post.caption || 'Sin texto').substring(0, 40)}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 pr-4 hidden sm:table-cell">
                    <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${
                      insight.platform === 'facebook'
                        ? 'bg-blue-50 text-blue-600'
                        : 'bg-pink-50 text-pink-600'
                    }`}>
                      {insight.platform === 'facebook' ? 'FB' : 'IG'}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-right font-bold text-slate-600">{formatCompact(insight.impressions)}</td>
                  <td className="py-3 pr-4 text-right font-bold text-slate-600">{formatCompact(insight.reach)}</td>
                  <td className="py-3 text-right font-bold text-primary">{formatCompact(insight.engagement)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function formatCompact(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'k';
  return n.toString();
}

function AssetThumb({ path }: { path: string }) {
  const [url, setUrl] = useState('');

  useEffect(() => {
    if (!path) return;
    if (path.startsWith('http')) {
      setUrl(path);
      return;
    }
    let objectUrl: string;
    (async () => {
      const { data } = await supabase.storage.from('posts').download(path);
      if (data) {
        objectUrl = URL.createObjectURL(data);
        setUrl(objectUrl);
      }
    })();
    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [path]);

  if (!url) return <div className="w-full h-full bg-slate-100" />;
  return <img src={url} alt="" className="w-full h-full object-cover" />;
}
