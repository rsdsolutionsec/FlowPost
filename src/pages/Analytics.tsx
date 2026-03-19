import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
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
      className="space-y-12"
    >
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-black tracking-tight text-slate-900 font-headline">Sigue tu Crecimiento</h2>
          <p className="text-slate-500 mt-2 font-medium">Mira cómo evoluciona tu presencia en redes.</p>
        </div>
      </div>

      <div className="space-y-10">
        {/* Top Metrics Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard title="Total" value={stats.total} icon="analytics" color="indigo" />
          <MetricCard title="Publicados" value={stats.published} icon="done_all" color="emerald" />
          <MetricCard title="Programados" value={stats.scheduled} icon="schedule" color="amber" />
          <MetricCard title="Con Errores" value={stats.failed} icon="error" color="rose" />
        </div>

        {/* Charts and Lists */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-white p-10 rounded-[2.5rem] shadow-sm border border-slate-100 min-h-[400px] flex flex-col justify-center items-center text-center">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
              <span className="material-symbols-outlined text-4xl text-slate-200">query_stats</span>
            </div>
            <p className="text-slate-900 font-black text-xl mb-2">Resultados en tiempo real</p>
            <p className="text-slate-400 font-medium max-w-xs">Estamos preparando la conexión con tus redes para mostrarte quién te ve más.</p>
          </div>

          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col">
            <h3 className="font-black text-xl text-slate-900 mb-8 font-headline">Lo último</h3>
            <div className="space-y-6 flex-1">
              {recentBest.length === 0 ? (
                 <div className="py-12 text-center">
                   <p className="text-slate-300 font-bold italic">No hay datos aún.</p>
                 </div>
              ) : (
                recentBest.map(post => (
                  <div key={post.caption} className="flex gap-4 items-center group">
                    <div className="w-14 h-14 rounded-2xl bg-slate-100 overflow-hidden flex-shrink-0 group-hover:scale-105 transition-transform">
                       <AssetSmall path={post.image_path} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-black text-slate-900 truncate">{post.caption || 'Sem texto'}</p>
                      <p className="text-[10px] text-emerald-600 font-black uppercase tracking-widest">Enviado</p>
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
    <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 group hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-500">
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-6 ${colorMap[color]} group-hover:scale-110 transition-transform`}>
        <span className="material-symbols-outlined">{icon}</span>
      </div>
      <h3 className="text-4xl font-black text-slate-900 tracking-tight font-headline">{value}</h3>
      <p className="text-xs font-black text-slate-400 uppercase tracking-widest mt-1">{title}</p>
    </div>
  );
}

function AssetSmall({ path }: { path: string }) {
  const [url, setUrl] = useState<string>('');
  useEffect(() => {
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
