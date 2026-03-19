import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export default function Analytics() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    total: 0,
    success: 0,
    failed: 0,
    conversion: 0
  });

  useEffect(() => {
    if (!user) return;
    const fetchStats = async () => {
      const { data } = await supabase.from('posts').select('status').eq('user_id', user.id);
      const s = (data || []).reduce((acc: any, p) => {
        acc.total++;
        if (p.status === 'published') acc.success++;
        if (p.status === 'failed') acc.failed++;
        return acc;
      }, { total: 0, success: 0, failed: 0 });
      
      setStats({
        ...s,
        conversion: s.total > 0 ? Math.round((s.success / s.total) * 100) : 0
      });
    };
    fetchStats();
  }, [user]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-12"
    >
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-extrabold tracking-tight text-on-surface font-headline">Analíticas</h2>
          <p className="text-slate-500 mt-2 font-medium">Mide el impacto de tus campañas y publicaciones.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {[
          { label: 'Tasa de Éxito', value: `${stats.conversion}%`, icon: 'trending_up', color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Posts Totales', value: stats.total, icon: 'assessment', color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'Fallidos', value: stats.failed, icon: 'warning', color: 'text-rose-600', bg: 'bg-rose-50' },
        ].map((stat, i) => (
          <div key={i} className="p-10 bg-surface-container-lowest rounded-[2.5rem] ghost-border flex flex-col items-center text-center">
            <div className={`w-16 h-16 ${stat.bg} ${stat.color} rounded-2xl flex items-center justify-center mb-6`}>
              <span className="material-symbols-outlined text-3xl">{stat.icon}</span>
            </div>
            <p className="text-xs font-black text-on-surface-variant uppercase tracking-widest mb-2">{stat.label}</p>
            <p className={`text-5xl font-black ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
