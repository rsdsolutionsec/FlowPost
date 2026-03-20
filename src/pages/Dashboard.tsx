import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';

interface DashboardStats {
  scheduled_posts: number;
  published_today: number;
  monthly_impact: number;
}

interface RecentPost {
  id: string;
  caption: string;
  image_path: string;
  status: string;
  platform: string;
  scheduled_at: string;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    scheduled_posts: 0,
    published_today: 0,
    monthly_impact: 0
  });
  const [recentPosts, setRecentPosts] = useState<RecentPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Fetch Stats
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [scheduledRes, publishedRes, recentRes] = await Promise.all([
        supabase.from('posts').select('id', { count: 'exact' }).eq('user_id', user?.id).eq('status', 'scheduled'),
        supabase.from('posts').select('id', { count: 'exact' }).eq('user_id', user?.id).eq('status', 'published').gte('scheduled_at', today.toISOString()),
        supabase.from('posts').select('*').eq('user_id', user?.id).order('scheduled_at', { ascending: false }).limit(4)
      ]);

      setStats({
        scheduled_posts: scheduledRes.count || 0,
        published_today: publishedRes.count || 0,
        monthly_impact: (publishedRes.count || 0) * 12 // Simulated impact
      });

      setRecentPosts(recentRes.data || []);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="px-4 sm:px-0"
    >
      <div className="mb-10 sm:mb-14">
        <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-on-surface font-headline leading-tight">
          ¡Hola, {user?.user_metadata?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'Robin'}!
        </h2>
        <p className="text-slate-500 mt-3 font-medium text-sm sm:text-lg">Aquí tienes un resumen de tu actividad de hoy.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-10 mb-12 sm:mb-16">
        <StatCard 
          label="Programados" 
          value={stats.scheduled_posts.toString()} 
          icon="calendar_month" 
          trend="+2 esta semana"
          color="bg-primary text-white"
        />
        <StatCard 
          label="Publicados Hoy" 
          value={stats.published_today.toString()} 
          icon="check_circle" 
          trend="Todo al día"
          color="bg-emerald-500 text-white"
        />
        <StatCard 
          label="Impacto Mensual" 
          value={stats.monthly_impact.toString()} 
          icon="trending_up" 
          trend="8.5k alcance est."
          color="bg-amber-500 text-white"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
        <div className="lg:col-span-8 space-y-6 sm:space-y-8">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-xs sm:text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[20px]">history</span>
              Actividad Reciente
            </h3>
            <Link to="/scheduled" className="text-[10px] font-black uppercase tracking-widest text-primary hover:underline underline-offset-4">
              Ver Todo
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            {recentPosts.map((post) => (
              <div key={post.id} className="group bg-white p-4 sm:p-6 rounded-[2rem] sm:rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all flex items-center gap-6">
                 <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl sm:rounded-3xl bg-slate-100 overflow-hidden flex-none">
                    <img src={post.image_path} alt="Post" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                 </div>
                 <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">{post.platform}</p>
                    <p className="font-bold text-slate-800 text-sm truncate">{post.caption.substring(0, 30)}...</p>
                    <p className="text-[10px] text-slate-400 mt-1 font-medium italic">
                      {new Date(post.scheduled_at).toLocaleDateString()}
                    </p>
                 </div>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-4 space-y-6 sm:space-y-8">
           <h3 className="text-xs sm:text-sm font-black text-slate-800 uppercase tracking-widest px-2">Acciones Rápidas</h3>
           <div className="grid grid-cols-2 gap-4">
              <QuickAction 
                icon="add_photo_alternate" 
                label="Nuevo Post" 
                to="/scheduled" 
                color="bg-primary/10 text-primary"
              />
              <QuickAction 
                icon="description" 
                label="Escribir Copy" 
                to="/copy-library" 
                color="bg-amber-100 text-amber-600"
              />
              <QuickAction 
                icon="cloud_upload" 
                label="Media Library" 
                to="/media-library" 
                color="bg-emerald-100 text-emerald-600"
              />
              <QuickAction 
                icon="settings" 
                label="Ajustes" 
                to="/settings" 
                color="bg-slate-100 text-slate-600"
              />
           </div>
        </div>
      </div>
    </motion.div>
  );
}

function StatCard({ label, value, icon, trend, color }: any) {
  return (
    <div className="group bg-white p-8 sm:p-10 rounded-[2.5rem] sm:rounded-[3rem] shadow-sm border border-slate-100 hover:shadow-2xl hover:translate-y-[-4px] transition-all relative overflow-hidden">
      <div className={`absolute top-0 right-0 w-32 h-32 ${color} opacity-[0.03] rounded-bl-[100px] -mr-10 -mt-10 group-hover:scale-150 transition-transform duration-700`} />
      <div className={`w-12 h-12 ${color} rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-current/20`}>
         <span className="material-symbols-outlined text-2xl">{icon}</span>
      </div>
      <div>
        <p className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest">{label}</p>
        <h4 className="text-3xl sm:text-4xl font-headline font-black text-slate-900 mt-2">{value}</h4>
        <p className="text-[10px] font-bold text-slate-400 mt-3 flex items-center gap-1 italic">
          <span className="material-symbols-outlined text-[14px]">auto_awesome</span>
          {trend}
        </p>
      </div>
    </div>
  );
}

function QuickAction({ icon, label, to, color }: any) {
  return (
    <Link to={to} className="group flex flex-col items-center justify-center p-6 bg-white rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl hover:border-primary/20 transition-all text-center">
       <div className={`w-12 h-12 ${color} rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-all shadow-sm`}>
          <span className="material-symbols-outlined">{icon}</span>
       </div>
       <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">{label}</p>
    </Link>
  );
}
