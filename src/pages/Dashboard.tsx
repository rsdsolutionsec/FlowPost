import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    scheduled: 0,
    published: 0,
    failed: 0,
    accounts: 0
  });

  useEffect(() => {
    if (!user) return;

    const fetchStats = async () => {
      // 1. Contar posts por estado
      const { data: posts } = await supabase
        .from('posts')
        .select('status')
        .eq('user_id', user.id);

      const postStats = (posts || []).reduce((acc: any, post) => {
        acc[post.status] = (acc[post.status] || 0) + 1;
        return acc;
      }, { scheduled: 0, published: 0, failed: 0 });

      // 2. Contar cuentas conectadas
      const { count } = await supabase
        .from('facebook_pages')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      setStats({
        ...postStats,
        accounts: count || 0
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
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-extrabold tracking-tight text-on-surface font-headline">Panel de Control</h2>
          <p className="text-slate-500 mt-2 font-medium">Resumen general de tu actividad en redes sociales.</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Programados', value: stats.scheduled, icon: 'schedule', color: 'bg-amber-500' },
          { label: 'Publicados', value: stats.published, icon: 'check_circle', color: 'bg-emerald-500' },
          { label: 'Errores', value: stats.failed, icon: 'error', color: 'bg-rose-500' },
          { label: 'Cuentas', value: stats.accounts, icon: 'group', color: 'bg-indigo-500' },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
            className="p-8 bg-surface-container-lowest rounded-[2.5rem] shadow-sm ghost-border hover:shadow-md transition-all group"
          >
            <div className={`w-12 h-12 ${stat.color} rounded-2xl flex items-center justify-center text-white mb-6 group-hover:scale-110 transition-transform`}>
              <span className="material-symbols-outlined">{stat.icon}</span>
            </div>
            <p className="text-sm font-bold text-on-surface-variant uppercase tracking-widest mb-1">{stat.label}</p>
            <p className="text-4xl font-black text-on-surface">{stat.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Placeholder for real charts later */}
      <div className="bg-surface-container-lowest rounded-[3rem] p-12 ghost-border min-h-[400px] flex flex-col items-center justify-center text-center">
        <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600 mb-6">
          <span className="material-symbols-outlined text-4xl">bar_chart</span>
        </div>
        <h3 className="text-2xl font-extrabold text-on-surface mb-2 font-headline">Estadísticas Detalladas</h3>
        <p className="text-slate-500 max-w-sm font-medium">Próximamente podrás ver el rendimiento de tus publicaciones a través del tiempo aquí.</p>
      </div>
    </motion.div>
  );
}
