import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    scheduled: 0,
    publishedToday: 0,
    totalThisMonth: 0
  });
  const [recentPosts, setRecentPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      if (!user) return;
      
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      try {
        const [scheduledRes, publishedTodayRes, recentRes] = await Promise.all([
          supabase.from('posts').select('*', { count: 'exact', head: true }).eq('status', 'scheduled').eq('user_id', user.id),
          supabase.from('posts').select('*', { count: 'exact', head: true }).eq('status', 'published').gte('created_at', startOfDay.toISOString()).eq('user_id', user.id),
          supabase.from('posts').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(3)
        ]);

        setStats({
          scheduled: scheduledRes.count || 0,
          publishedToday: publishedTodayRes.count || 0,
          totalThisMonth: (scheduledRes.count || 0) + (publishedTodayRes.count || 0)
        });
        setRecentPosts(recentRes.data || []);
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, [user]);

  const firstName = user?.user_metadata?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'Hola';

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="space-y-10 pb-20"
    >
      {/* Welcome & Status */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <h2 className="text-5xl font-black tracking-tight text-slate-900 font-headline">
            ¡Qué bueno verte, {firstName}!
          </h2>
          <p className="text-slate-500 text-lg font-medium">
            {stats.scheduled > 0 
              ? `Tienes ${stats.scheduled} publicaciones listas para salir.` 
              : '¿Qué vamos a publicar hoy?'}
          </p>
        </div>
        
        <Link 
          to="/scheduled" 
          className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:scale-105 transition-transform shadow-xl shadow-indigo-600/20 active:scale-95 text-center"
        >
          Crear Publicación
        </Link>
      </section>

      {/* Simplified Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          icon="schedule_send" 
          label="En Cola" 
          value={loading ? '...' : stats.scheduled} 
          color="bg-indigo-50 text-indigo-600"
        />
        <StatCard 
          icon="done_all" 
          label="Publicados" 
          value={loading ? '...' : stats.publishedToday} 
          color="bg-emerald-50 text-emerald-600"
        />
        <div className="lg:col-span-2 bg-slate-900 p-8 rounded-[2.5rem] text-white flex flex-col justify-between overflow-hidden relative group">
          <div className="relative z-10">
            <h4 className="text-xl font-black mb-1 font-headline">Tu Impacto</h4>
            <p className="text-slate-400 text-sm font-bold">Resumen de actividad mensual</p>
          </div>
          <div className="mt-8 relative z-10 flex items-end justify-between">
            <span className="text-4xl font-black font-headline">{stats.totalThisMonth}</span>
            <span className="material-symbols-outlined text-6xl opacity-20 group-hover:scale-110 transition-transform">analytics</span>
          </div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 blur-[80px] -translate-y-1/2 translate-x-1/2"></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2">
          <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-100 h-full">
             <h3 className="text-2xl font-black text-slate-900 mb-8 font-headline">Lo último</h3>
             <div className="space-y-6">
               {recentPosts.length === 0 ? (
                 <div className="py-12 text-center space-y-4">
                   <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto">
                     <span className="material-symbols-outlined text-slate-300 text-3xl">post_add</span>
                   </div>
                   <p className="text-slate-400 font-medium italic">Aún no hay publicaciones recientes.</p>
                 </div>
               ) : (
                 recentPosts.map(post => (
                   <div key={post.id} className="flex items-center gap-6 p-2 group">
                     <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${
                       post.status === 'published' ? 'bg-emerald-50 text-emerald-600' : 
                       post.status === 'failed' ? 'bg-rose-50 text-rose-600' : 'bg-slate-50 text-slate-400'
                     }`}>
                       <span className="material-symbols-outlined text-2xl">
                         {post.status === 'published' ? 'check_circle' : post.status === 'failed' ? 'error' : 'schedule'}
                       </span>
                     </div>
                     <div className="flex-1 truncate">
                       <p className="font-black text-slate-900 truncate">{post.caption || 'Sin título'}</p>
                       <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{post.status}</p>
                     </div>
                   </div>
                 ))
               )}
             </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-indigo-50 p-8 rounded-[3rem] space-y-6">
            <h4 className="text-xl font-black text-indigo-900 font-headline">Acciones</h4>
            <div className="grid gap-3">
              <QuickAction icon="photo_library" label="Subir Multimedia" to="/media" />
              <QuickAction icon="smart_toy" label="Configurar IA" to="/automation" />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function StatCard({ icon, label, value, color }: { icon: string, label: string, value: string | number, color: string }) {
  return (
    <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col justify-between hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-500">
      <div className={`w-12 h-12 rounded-2xl ${color} flex items-center justify-center mb-6`}>
        <span className="material-symbols-outlined text-[24px]">{icon}</span>
      </div>
      <div>
        <p className="text-slate-400 text-xs font-black uppercase tracking-widest mb-1">{label}</p>
        <h3 className="text-4xl font-black text-slate-900 font-headline">{value}</h3>
      </div>
    </div>
  );
}

function QuickAction({ icon, label, to }: { icon: string, label: string, to: string }) {
  return (
    <Link to={to} className="bg-white p-4 rounded-2xl flex items-center gap-4 hover:translate-x-1 transition-transform border border-indigo-100 group">
      <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
        <span className="material-symbols-outlined text-xl">{icon}</span>
      </div>
      <span className="font-black text-xs text-indigo-900 uppercase tracking-wider">{label}</span>
    </Link>
  );
}
