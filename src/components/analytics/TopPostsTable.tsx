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
  saves?: number;
  shares?: number;
  posts: {
    caption: string;
    image_path: string;
    platform: string;
    scheduled_at: string;
  };
}

type SortBy = 'impressions' | 'reach' | 'engagement' | 'engagementRate';

interface TopPostsTableProps {
  userId: string;
  dateRange: { since: Date; until: Date };
  accountId: string;
  loading?: boolean;
}

export default function TopPostsTable({ userId, dateRange, accountId, loading }: TopPostsTableProps) {
  const [posts, setPosts] = useState<PostInsight[]>([]);
  const [fetching, setFetching] = useState(true);
  const [sortBy, setSortBy] = useState<SortBy>('engagement');

  useEffect(() => {
    async function fetchPosts() {
      setFetching(true);
      let query = supabase
        .from('post_insights')
        .select(`
          id, post_id, platform, impressions, reach, engagement, likes, comments, clicks, saves, shares,
          posts!inner ( caption, image_path, platform, scheduled_at, facebook_page_id, instagram_account_id )
        `)
        .eq('user_id', userId)
        .order('engagement', { ascending: false })
        .limit(50);

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
    fetchPosts();
  }, [userId, dateRange.since.toISOString(), accountId]);

  const isLoading = loading || fetching;

  // Compute engagement rate and sort client-side
  const sortedPosts = [...posts]
    .map(p => ({
      ...p,
      engagementRate: p.reach > 0
        ? ((p.likes || 0) + (p.comments || 0) + (p.shares || 0) + (p.saves || 0)) / p.reach * 100
        : 0,
    }))
    .sort((a, b) => {
      if (sortBy === 'engagementRate') return b.engagementRate - a.engagementRate;
      return b[sortBy] - a[sortBy];
    })
    .slice(0, 10);

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

  if (!sortedPosts.length) {
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

  function SortHeader({ label, value }: { label: string; value: SortBy }) {
    const active = sortBy === value;
    return (
      <button
        onClick={() => setSortBy(value)}
        className={`flex items-center gap-0.5 ml-auto ${active ? 'text-primary' : 'text-slate-400 hover:text-slate-600'} transition-colors`}
      >
        {label}
        <span className="material-symbols-outlined text-[14px]">
          {active ? 'arrow_downward' : 'unfold_more'}
        </span>
      </button>
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
              <th className="text-left py-3 pr-4 hidden sm:table-cell">Plat.</th>
              <th className="py-3 pr-4 text-right">
                <SortHeader label="Impr." value="impressions" />
              </th>
              <th className="py-3 pr-4 text-right">
                <SortHeader label="Alcance" value="reach" />
              </th>
              <th className="py-3 pr-4 text-right">
                <SortHeader label="Eng." value="engagement" />
              </th>
              <th className="py-3 text-right">
                <SortHeader label="Eng. Rate" value="engagementRate" />
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedPosts.map((insight, idx) => {
              const post = insight.posts as any;
              return (
                <tr key={insight.id} className="border-b border-slate-50 hover:bg-slate-25 transition-colors">
                  <td className="py-3 pr-4 font-black text-slate-300">{idx + 1}</td>
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-slate-100 overflow-hidden flex-shrink-0">
                        <AssetThumb path={post.image_path} />
                      </div>
                      <span className="font-bold text-slate-700 truncate max-w-[160px]">
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
                  <td className="py-3 pr-4 text-right font-bold text-primary">{formatCompact(insight.engagement)}</td>
                  <td className="py-3 text-right">
                    <span className={`text-xs font-black px-2 py-1 rounded-lg ${
                      insight.engagementRate >= 5
                        ? 'bg-emerald-50 text-emerald-600'
                        : insight.engagementRate >= 2
                        ? 'bg-amber-50 text-amber-600'
                        : 'bg-slate-50 text-slate-500'
                    }`}>
                      {insight.engagementRate.toFixed(1)}%
                    </span>
                  </td>
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
