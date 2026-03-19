import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export default function Analytics() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    total: 0,
    published: 0,
    scheduled: 0,
    failed: 0
  });
  const [loading, setLoading] = useState(true);
  const [recentBest, setRecentBest] = useState<any[]>([]);

  useEffect(() => {
    async function fetchAnalytics() {
      if (!user) return;
      setLoading(true);
      try {
        const { data: posts, error } = await supabase
          .from('posts')
          .select('status, created_at, caption, image_path')
          .eq('user_id', user.id);
        
        if (error) throw error;
        
        const counts = (posts || []).reduce((acc: any, post) => {
          acc.total++;
          acc[post.status] = (acc[post.status] || 0) + 1;
          return acc;
        }, { total: 0, published: 0, scheduled: 0, failed: 0 });

        setStats(counts);
        setRecentBest((posts || [])
          .filter(p => p.status === 'published')
          .slice(0, 3));
      } catch (err) {
        console.error('Error fetching analytics:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchAnalytics();
  }, [user]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="mb-12 flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-extrabold tracking-tight text-on-surface font-headline">Analíticas</h2>
          <p className="text-slate-500 mt-2 font-medium">Mide el rendimiento de tus publicaciones y campañas.</p>
        </div>
      </div>

      <div className="space-y-8">
        {/* Top Metrics Row */}
        <div className="grid grid-cols-4 gap-6">
          <MetricCard title="Total" value={stats.total} icon="analytics" color="indigo" />
          <MetricCard title="Publicados" value={stats.published} icon="done_all" color="emerald" />
          <MetricCard title="Programados" value={stats.scheduled} icon="schedule" color="amber" />
          <MetricCard title="Fallidos" value={stats.failed} icon="error" color="rose" />
        </div>

        {/* Charts and Lists */}
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 bg-surface-container-lowest p-8 rounded-2xl shadow-sm ghost-border min-h-[400px] flex flex-col justify-center items-center">
            <span className="material-symbols-outlined text-6xl text-slate-200 mb-4">query_stats</span>
            <p className="text-slate-400 font-bold">Gráficos de rendimiento en desarrollo</p>
            <p className="text-xs text-slate-300 mt-2">Conectando con Meta Insights API próximamente...</p>
          </div>

          <div className="bg-surface-container-lowest p-8 rounded-2xl shadow-sm ghost-border flex flex-col">
            <h3 className="font-bold text-lg text-on-surface mb-6 font-headline">Publicaciones Publicadas</h3>
            <div className="space-y-4 flex-1">
              {recentBest.length === 0 ? (
                 <p className="text-slate-400 text-sm italic py-10 text-center">No hay publicaciones terminadas aún.</p>
              ) : (
                recentBest.map(post => (
                  <div key={post.id} className="flex gap-4 items-center p-3 hover:bg-surface-container-low rounded-xl transition-colors">
                    <div className="w-12 h-12 rounded-lg bg-slate-100 overflow-hidden flex-shrink-0">
                       <AssetSmall path={post.image_path} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-on-surface truncate">{post.caption || 'Sin texto'}</p>
                      <p className="text-[10px] text-emerald-600 font-black uppercase">Terminado</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function MetricCard({ title, value, icon, color }: any) {
  const colorMap: any = {
    indigo: 'bg-indigo-50 text-indigo-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    rose: 'bg-rose-50 text-rose-600'
  };
  return (
    <div className="bg-surface-container-lowest p-6 rounded-2xl shadow-sm ghost-border">
      <div className="flex justify-between items-start mb-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colorMap[color]}`}>
          <span className="material-symbols-outlined">{icon}</span>
        </div>
      </div>
      <h3 className="text-3xl font-extrabold text-on-surface tracking-tight">{value}</h3>
      <p className="text-sm font-medium text-on-surface-variant mt-1">{title}</p>
    </div>
  );
}

function AssetSmall({ path }: { path: string }) {
  const [url, setUrl] = useState<string>('');
  useEffect(() => {
    if (path.startsWith('http')) {
      setUrl(path);
      return;
    }
    let objectUrl: string;
    const fetch = async () => {
      const { data } = await supabase.storage.from('posts').download(path);
      if (data) {
        objectUrl = URL.createObjectURL(data);
        setUrl(objectUrl);
      }
    };
    fetch();
    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [path]);
  if (!url) return <div className="w-full h-full bg-slate-100" />;
  return <img src={url} alt="" className="w-full h-full object-cover" />;
}
