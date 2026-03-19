import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

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
          supabase.from('posts').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5)
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

  const firstName = user?.user_metadata?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'Usuario';

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-12"
    >
      {/* Welcome Header */}
      <section className="space-y-2">
        <h2 className="text-4xl font-extrabold tracking-tight text-on-surface font-headline">¡Hola, {firstName}!</h2>
        <p className="text-on-surface-variant text-lg">
          {loading ? 'Cargando tu actividad...' : `Tu espacio de trabajo está activo. ${stats.scheduled} publicaciones programadas.`}
        </p>
      </section>

      {/* Overview Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {/* Card 1 */}
        <div className="col-span-1 bg-surface-container-lowest p-8 rounded-[2rem] ghost-border flex flex-col justify-between group hover:translate-y-[-4px] transition-transform duration-300">
          <div className="flex justify-between items-start mb-8">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
              <span className="material-symbols-outlined">schedule_send</span>
            </div>
            <span className="text-emerald-600 text-xs font-bold px-3 py-1 bg-emerald-50 rounded-full">Activo</span>
          </div>
          <div>
            <p className="text-on-surface-variant text-sm font-medium mb-1">Programados</p>
            <h3 className="text-4xl font-extrabold text-on-surface font-headline">
              {loading ? '...' : stats.scheduled}
            </h3>
          </div>
        </div>

        {/* Card 2 */}
        <div className="col-span-1 bg-surface-container-lowest p-8 rounded-[2rem] ghost-border flex flex-col justify-between group hover:translate-y-[-4px] transition-transform duration-300">
          <div className="flex justify-between items-start mb-8">
            <div className="w-12 h-12 rounded-2xl bg-secondary/10 text-secondary flex items-center justify-center">
              <span className="material-symbols-outlined">done_all</span>
            </div>
            <span className="text-on-surface-variant text-xs font-bold px-3 py-1 bg-slate-50 rounded-full">Hoy</span>
          </div>
          <div>
            <p className="text-on-surface-variant text-sm font-medium mb-1">Publicados Hoy</p>
            <h3 className="text-4xl font-extrabold text-on-surface font-headline">
              {loading ? '...' : stats.publishedToday}
            </h3>
          </div>
        </div>

        {/* Card 3 (Engagement) */}
        <div className="col-span-1 md:col-span-1 lg:col-span-2 bg-gradient-to-br from-primary to-secondary p-8 rounded-[2rem] text-white flex flex-col justify-between group hover:translate-y-[-4px] transition-transform duration-300">
          <div className="flex justify-between items-start">
            <div>
              <h4 className="text-xl font-bold mb-1 font-headline">Potencial de Alcance</h4>
              <p className="text-white/70 text-sm">Basado en tus publicaciones totales</p>
            </div>
            <span className="material-symbols-outlined text-4xl opacity-50">analytics</span>
          </div>
          <div className="flex items-end justify-between gap-4 mt-8">
             <p className="text-sm italic font-medium opacity-80">"Conecta más, automatiza mejor."</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2 space-y-12">
          <div className="bg-surface-container-lowest p-10 rounded-[2.5rem] ghost-border space-y-8">
             <div className="flex justify-between items-center">
               <h3 className="text-2xl font-bold text-on-surface font-headline">Actividad Reciente</h3>
             </div>
             <div className="space-y-4">
               {recentPosts.length === 0 ? (
                 <p className="text-on-surface-variant italic">No hay actividad reciente para mostrar.</p>
               ) : (
                 recentPosts.map(post => (
                   <div key={post.id} className="flex items-center gap-4 p-4 hover:bg-surface-container-low rounded-2xl transition-all border border-transparent hover:ghost-border group">
                     <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                       <span className="material-symbols-outlined">
                         {post.status === 'published' ? 'check_circle' : post.status === 'failed' ? 'error' : 'schedule'}
                       </span>
                     </div>
                     <div className="flex-1 min-w-0">
                       <p className="text-sm font-bold text-on-surface truncate">{post.caption || 'Sin descripción'}</p>
                       <p className="text-xs text-on-surface-variant">
                         {new Date(post.created_at).toLocaleDateString()} • {post.status}
                       </p>
                     </div>
                     <div className="text-right">
                        <span className={`text-[10px] font-black px-2 py-1 rounded-full uppercase tracking-tighter ${
                          post.status === 'published' ? 'bg-emerald-100 text-emerald-700' :
                          post.status === 'failed' ? 'bg-rose-100 text-rose-700' :
                          'bg-amber-100 text-amber-700'
                        }`}>
                          {post.status}
                        </span>
                     </div>
                   </div>
                 ))
               )}
             </div>
          </div>
        </div>

        <div className="space-y-12">
           <div className="bg-surface-container-low p-8 rounded-[2.5rem] space-y-6">
            <h4 className="text-xl font-bold text-on-surface font-headline">Acciones Rápidas</h4>
            <div className="space-y-3">
              <a href="/posts" className="w-full bg-surface-container-lowest p-4 rounded-2xl ghost-border flex items-center gap-4 hover:bg-primary hover:text-white transition-all group">
                <div className="w-10 h-10 rounded-xl bg-primary/10 group-hover:bg-white/20 flex items-center justify-center text-primary group-hover:text-white">
                  <span className="material-symbols-outlined">edit_note</span>
                </div>
                <span className="font-bold text-sm">Gestionar Posts</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
