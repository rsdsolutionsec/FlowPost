import { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import DateRangeSelector from '../components/analytics/DateRangeSelector';
import AccountSelector from '../components/analytics/AccountSelector';
import OverviewCards from '../components/analytics/OverviewCards';
import TrendChart from '../components/analytics/TrendChart';
import EngagementChart from '../components/analytics/EngagementChart';
import TopPostsTable from '../components/analytics/TopPostsTable';
import FollowerGrowthChart from '../components/analytics/FollowerGrowthChart';
import BestHoursChart from '../components/analytics/BestHoursChart';

interface AccountOption {
  id: string;
  name: string;
  platform: 'facebook' | 'instagram';
}

export default function Analytics() {
  const { user } = useAuth();
  const [days, setDays] = useState(30);
  const [selectedAccount, setSelectedAccount] = useState('all');
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [syncResult, setSyncResult] = useState<{ type: 'success' | 'error' | 'warning'; message: string } | null>(null);

  // Post stats
  const [postStats, setPostStats] = useState({ total: 0, published: 0, scheduled: 0, failed: 0 });

  // Insights data
  const [postInsights, setPostInsights] = useState<any[]>([]);
  const [accountInsights, setAccountInsights] = useState<any[]>([]);

  // Best hours (IG only)
  const [bestHoursData, setBestHoursData] = useState<{ day: number; hour: number; value: number }[]>([]);
  const [bestHoursLoading, setBestHoursLoading] = useState(false);

  const dateRange = useMemo(() => {
    const until = new Date();
    const since = new Date();
    since.setDate(since.getDate() - days);
    return { since, until };
  }, [days]);

  // Derived account context
  const selectedAccountObj = useMemo(
    () => accounts.find(a => a.id === selectedAccount) ?? null,
    [accounts, selectedAccount]
  );
  const isSingleInstagramAccount = selectedAccountObj?.platform === 'instagram';

  // Fetch accounts
  useEffect(() => {
    if (!user) return;
    (async () => {
      const [fbRes, igRes] = await Promise.all([
        supabase.from('facebook_pages').select('id, page_name').eq('user_id', user.id).eq('is_active', true),
        supabase.from('instagram_accounts').select('id, username').eq('user_id', user.id).eq('is_active', true),
      ]);

      const accs: AccountOption[] = [
        ...(fbRes.data || []).map(p => ({ id: p.id, name: p.page_name, platform: 'facebook' as const })),
        ...(igRes.data || []).map(a => ({ id: a.id, name: a.username, platform: 'instagram' as const })),
      ];
      setAccounts(accs);
    })();
  }, [user]);

  // Fetch analytics data
  useEffect(() => {
    if (!user) return;
    fetchData();
  }, [user, days, selectedAccount]);

  // Fetch best hours when single IG account is selected
  useEffect(() => {
    if (!user || !isSingleInstagramAccount || !selectedAccount) {
      setBestHoursData([]);
      return;
    }
    setBestHoursLoading(true);
    fetch('/api/insights/best-hours', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountRefId: selectedAccount, userId: user.id }),
    })
      .then(r => r.json())
      .then(json => setBestHoursData(json.data || []))
      .catch(() => setBestHoursData([]))
      .finally(() => setBestHoursLoading(false));
  }, [user, selectedAccount, isSingleInstagramAccount]);

  async function fetchData() {
    setLoading(true);
    try {
      // 1. Post counts
      const { data: posts } = await supabase
        .from('posts')
        .select('status')
        .eq('user_id', user!.id);

      const counts = (posts || []).reduce((acc: any, p) => {
        acc.total++;
        acc[p.status] = (acc[p.status] || 0) + 1;
        return acc;
      }, { total: 0, published: 0, scheduled: 0, failed: 0 });
      setPostStats(counts);

      // 2. Post insights
      let piQuery = supabase
        .from('post_insights')
        .select('*, posts!inner( facebook_page_id, instagram_account_id, scheduled_at, metadata )')
        .eq('user_id', user!.id);

      if (selectedAccount !== 'all') {
        piQuery = piQuery.or(
          `facebook_page_id.eq.${selectedAccount},instagram_account_id.eq.${selectedAccount}`,
          { referencedTable: 'posts' }
        );
      }

      const { data: piData } = await piQuery;
      // Filter out posts deleted on the social platform (marked during sync)
      const filtered = (piData || []).filter(
        p => !(p.posts as any)?.metadata?.platform_deleted
      );
      setPostInsights(filtered);

      // 3. Account insights (for charts)
      let aiQuery = supabase
        .from('account_insights')
        .select('*')
        .eq('user_id', user!.id)
        .gte('metric_date', dateRange.since.toISOString().split('T')[0])
        .lte('metric_date', dateRange.until.toISOString().split('T')[0])
        .order('metric_date', { ascending: true });

      if (selectedAccount !== 'all') {
        aiQuery = aiQuery.eq('account_ref_id', selectedAccount);
      }

      const { data: aiData } = await aiQuery;
      setAccountInsights(aiData || []);
    } catch (err) {
      console.error('Error fetching analytics:', err);
    } finally {
      setLoading(false);
    }
  }

  // Aggregated overview metrics (from post_insights)
  const overview = useMemo(() => {
    const totalImpressions = postInsights.reduce((s, p) => s + (p.impressions || 0), 0);
    const totalReach = postInsights.reduce((s, p) => s + (p.reach || 0), 0);
    const totalEngagement = postInsights.reduce((s, p) => s + (p.engagement || 0), 0);
    const rate = totalImpressions > 0 ? (totalEngagement / totalImpressions) * 100 : 0;
    return { impressions: totalImpressions, reach: totalReach, engagement: totalEngagement, engagementRate: rate };
  }, [postInsights]);

  // IG-specific account metrics (summed over period)
  const igOverview = useMemo(() => {
    return accountInsights.reduce(
      (acc, ai) => ({
        profileViews: acc.profileViews + (ai.profile_views || 0),
        accountsEngaged: acc.accountsEngaged + (ai.accounts_engaged || 0),
        websiteClicks: acc.websiteClicks + (ai.website_clicks || 0),
      }),
      { profileViews: 0, accountsEngaged: 0, websiteClicks: 0 }
    );
  }, [accountInsights]);

  // Chart data: aggregate account_insights by date
  const trendData = useMemo(() => {
    const dayMap = new Map<string, { date: string; impressions: number; reach: number }>();
    for (const ai of accountInsights) {
      const d = ai.metric_date;
      if (!dayMap.has(d)) dayMap.set(d, { date: d, impressions: 0, reach: 0 });
      const entry = dayMap.get(d)!;
      entry.impressions += ai.impressions || 0;
      entry.reach += ai.reach || 0;
    }
    return Array.from(dayMap.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [accountInsights]);

  // Engagement chart data: aggregate post insights by date
  const engagementData = useMemo(() => {
    const dayMap = new Map<string, { date: string; likes: number; comments: number; shares: number }>();
    for (const pi of postInsights) {
      const scheduledAt = (pi.posts as any)?.scheduled_at;
      if (!scheduledAt) continue;
      const d = scheduledAt.split('T')[0];
      if (!dayMap.has(d)) dayMap.set(d, { date: d, likes: 0, comments: 0, shares: 0 });
      const entry = dayMap.get(d)!;
      entry.likes += pi.likes || 0;
      entry.comments += pi.comments || 0;
      entry.shares += pi.shares || 0;
    }
    return Array.from(dayMap.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [postInsights]);

  // Follower growth chart data (IG only — uses account_insights)
  const followerGrowthData = useMemo(() => {
    return accountInsights
      .filter(ai => ai.followers > 0)
      .map(ai => ({
        date: ai.metric_date,
        followers: ai.followers || 0,
        followers_delta: ai.followers_delta || 0,
        followers_growth_pct: ai.followers_growth_pct || 0,
      }));
  }, [accountInsights]);

  const showFollowerGrowth = followerGrowthData.length > 0;

  async function handleImport() {
    if (!user || importing) return;
    setImporting(true);
    setSyncResult(null);

    try {
      const results = await Promise.allSettled(
        accounts.map(acc =>
          fetch('/api/insights/import-posts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ accountRefId: acc.id, platform: acc.platform, userId: user.id }),
          }).then(r => r.json())
        )
      );

      const totalImported = results.reduce((sum, r) => {
        if (r.status === 'fulfilled') return sum + (r.value.imported || 0);
        return sum;
      }, 0);

      if (totalImported > 0) {
        setSyncResult({ type: 'success', message: `${totalImported} publicaciones históricas importadas. Sincroniza para ver sus métricas.` });
        await fetchData();
      } else {
        setSyncResult({ type: 'warning', message: 'No hay publicaciones nuevas para importar (ya estaban todas).' });
      }
    } catch (err: any) {
      setSyncResult({ type: 'error', message: `Error al importar: ${err.message}` });
    } finally {
      setImporting(false);
    }
  }

  async function handleSync() {
    if (!user || syncing) return;
    setSyncing(true);
    setSyncResult(null);

    let accountOk = 0, accountFail = 0, postOk = 0, postFail = 0;
    const errors: string[] = [];

    try {
      // Sync all accounts
      const accountResults = await Promise.allSettled(
        accounts.map(acc =>
          fetch('/api/insights/account', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              accountRefId: acc.id,
              platform: acc.platform,
              userId: user.id,
              days,
            }),
          }).then(async r => {
            const body = await r.json().catch(() => ({}));
            if (!r.ok) throw new Error(body.message || body.error || `HTTP ${r.status}`);
            return body;
          })
        )
      );

      for (const r of accountResults) {
        if (r.status === 'fulfilled') accountOk++;
        else { accountFail++; errors.push(r.reason?.message || 'Error de cuenta'); }
      }

      // Sync post insights for published posts
      const { data: publishedPosts } = await supabase
        .from('posts')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'published')
        .not('metadata', 'is', null)
        .limit(50);

      if (publishedPosts?.length) {
        const postResults = await Promise.allSettled(
          publishedPosts.map(p =>
            fetch('/api/insights/post', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ postId: p.id, userId: user.id }),
            }).then(async r => {
              const body = await r.json().catch(() => ({}));
              if (!r.ok) throw new Error(body.message || body.error || `HTTP ${r.status}`);
              return body;
            })
          )
        );

        for (const r of postResults) {
          if (r.status === 'fulfilled') postOk++;
          else { postFail++; errors.push(r.reason?.message || 'Error de post'); }
        }
      }

      // Refresh data
      await fetchData();

      // Show results
      const totalOk = accountOk + postOk;
      const totalFail = accountFail + postFail;

      if (totalFail === 0 && totalOk > 0) {
        setSyncResult({ type: 'success', message: `${postOk} posts y ${accountOk} cuentas sincronizados` });
      } else if (totalOk > 0 && totalFail > 0) {
        const uniqueErrors = [...new Set(errors)].slice(0, 2).join('. ');
        setSyncResult({ type: 'warning', message: `${totalOk} sincronizados, ${totalFail} errores. ${uniqueErrors}` });
      } else if (totalFail > 0) {
        const uniqueErrors = [...new Set(errors)].slice(0, 2).join('. ');
        setSyncResult({ type: 'error', message: `Error al sincronizar: ${uniqueErrors}` });
      } else {
        setSyncResult({ type: 'warning', message: 'No hay publicaciones para sincronizar' });
      }
    } catch (err: any) {
      setSyncResult({ type: 'error', message: `Error: ${err.message}` });
    } finally {
      setSyncing(false);
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      {/* Header */}
      <div className="mb-8 sm:mb-12 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-on-surface font-headline">
            Analiticas
          </h2>
          <p className="text-slate-500 mt-2 font-medium text-sm sm:text-base">
            Mide el rendimiento de tus publicaciones y cuentas.
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <AccountSelector accounts={accounts} value={selectedAccount} onChange={setSelectedAccount} />
          <DateRangeSelector value={days} onChange={setDays} />
          <button
            onClick={handleImport}
            disabled={importing || syncing}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface-container text-on-surface-variant text-xs font-black uppercase tracking-widest hover:bg-surface-container-high transition-all disabled:opacity-50"
          >
            <span className={`material-symbols-outlined text-[18px] ${importing ? 'animate-spin' : ''}`}>
              download
            </span>
            {importing ? 'Importando...' : 'Importar historial'}
          </button>
          <button
            onClick={handleSync}
            disabled={syncing || importing}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white text-xs font-black uppercase tracking-widest hover:bg-primary/90 transition-all disabled:opacity-50"
          >
            <span className={`material-symbols-outlined text-[18px] ${syncing ? 'animate-spin' : ''}`}>
              sync
            </span>
            {syncing ? 'Sincronizando...' : 'Sincronizar'}
          </button>
        </div>
      </div>

      {syncResult && (
        <div className={`mb-4 px-4 py-3 rounded-xl text-sm font-bold flex items-center gap-2 ${
          syncResult.type === 'success' ? 'bg-emerald-50 text-emerald-700' :
          syncResult.type === 'warning' ? 'bg-amber-50 text-amber-700' :
          'bg-rose-50 text-rose-700'
        }`}>
          <span className="material-symbols-outlined text-[18px]">
            {syncResult.type === 'success' ? 'check_circle' : syncResult.type === 'warning' ? 'warning' : 'error'}
          </span>
          {syncResult.message}
          <button onClick={() => setSyncResult(null)} className="ml-auto opacity-50 hover:opacity-100">
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      )}

      <div className="space-y-6 sm:space-y-8">
        {/* Post status counts */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
          <MetricCard title="Total" value={postStats.total} icon="analytics" color="indigo" />
          <MetricCard title="Publicados" value={postStats.published} icon="done_all" color="emerald" />
          <MetricCard title="Programados" value={postStats.scheduled} icon="schedule" color="amber" />
          <MetricCard title="Fallidos" value={postStats.failed} icon="error" color="rose" />
        </div>

        {/* Insight overview cards */}
        <OverviewCards
          impressions={overview.impressions}
          reach={overview.reach}
          engagement={overview.engagement}
          engagementRate={overview.engagementRate}
          loading={loading}
          showIgMetrics={isSingleInstagramAccount}
          profileViews={igOverview.profileViews}
          accountsEngaged={igOverview.accountsEngaged}
          websiteClicks={igOverview.websiteClicks}
        />

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <TrendChart data={trendData} loading={loading} />
          </div>
          <div>
            <EngagementChart data={engagementData} loading={loading} />
          </div>
        </div>

        {/* Follower Growth (IG only, when data available) */}
        {(showFollowerGrowth || loading) && (
          <FollowerGrowthChart data={followerGrowthData} loading={loading} />
        )}

        {/* Best Hours (single IG account only) */}
        {isSingleInstagramAccount && (
          <BestHoursChart data={bestHoursData} loading={bestHoursLoading} />
        )}

        {/* Top Posts */}
        <TopPostsTable
          userId={user?.id || ''}
          dateRange={dateRange}
          accountId={selectedAccount}
          loading={loading}
        />
      </div>
    </motion.div>
  );
}

function MetricCard({ title, value, icon, color }: { title: string; value: number; icon: string; color: string }) {
  const colorMap: Record<string, string> = {
    indigo: 'bg-indigo-50 text-indigo-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    rose: 'bg-rose-50 text-rose-600',
  };
  return (
    <div className="bg-surface-container-lowest p-5 sm:p-6 rounded-2xl shadow-sm ghost-border">
      <div className="flex justify-between items-start mb-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colorMap[color]}`}>
          <span className="material-symbols-outlined">{icon}</span>
        </div>
      </div>
      <h3 className="text-2xl sm:text-3xl font-extrabold text-on-surface tracking-tight">{value}</h3>
      <p className="text-sm font-medium text-on-surface-variant mt-1">{title}</p>
    </div>
  );
}
