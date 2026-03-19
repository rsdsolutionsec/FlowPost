import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface Post {
  id: string;
  caption: string;
  scheduled_for: string;
  status: string;
  media_url?: string;
  custom_caption?: string;
  copies?: {
    name: string;
  };
}

export default function ScheduledPosts() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchPosts();
  }, [user]);

  const fetchPosts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('posts')
      .select('*, copies(name)')
      .eq('user_id', user?.id)
      .order('scheduled_for', { ascending: true });
    
    if (!error && data) {
      setPosts(data);
    }
    setLoading(false);
  };

  const deletePost = async (id: string) => {
    if (!confirm('Ests seguro de que quieres eliminar esta publicacin?')) return;
    const { error } = await supabase.from('posts').delete().eq('id', id);
    if (!error) {
       setPosts(posts.filter(p => p.id !== id));
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="space-y-12"
    >
      <header className="flex justify-between items-end">
        <div className="space-y-2">
          <h2 className="text-4xl font-black text-slate-900 font-headline">Publicaciones Programadas</h2>
          <p className="text-slate-500 text-lg font-medium">Controla el calendario y el estado de tus posts.</p>
        </div>
      </header>

      <div className="bg-white rounded-[3rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="px-10 py-8 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Contenido</th>
                <th className="px-10 py-8 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Canal</th>
                <th className="px-10 py-8 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Programacin</th>
                <th className="px-10 py-8 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Estado</th>
                <th className="px-10 py-8 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-10 py-20 text-center font-black text-slate-300 uppercase tracking-widest">
                    Cargando calendario...
                  </td>
                </tr>
              ) : posts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-10 py-20 text-center text-slate-400 italic font-medium">
                    No hay publicaciones programadas.
                  </td>
                </tr>
              ) : (
                posts.map((post) => (
                  <tr key={post.id} className="group hover:bg-slate-50 transition-colors">
                    <td className="px-10 py-8">
                      <div className="flex items-center gap-4 max-w-xs">
                        <div className="w-12 h-12 rounded-xl bg-slate-100 shrink-0 flex items-center justify-center text-slate-400">
                          <span className="material-symbols-outlined">image</span>
                        </div>
                        <div className="truncate">
                          <p className="font-black text-slate-900 text-sm truncate">
                             {post.copies ? `Copy: ${post.copies.name}` : (post.custom_caption || post.caption || 'Sin ttulo')}
                          </p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Imagen</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-10 py-8">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-indigo-400 text-xl">facebook</span>
                        <span className="text-xs font-bold text-slate-600">FB Page</span>
                      </div>
                    </td>
                    <td className="px-10 py-8">
                      <div className="space-y-1">
                        <p className="text-sm font-black text-slate-800">
                          {new Date(post.scheduled_for).toLocaleDateString()}
                        </p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                          {new Date(post.scheduled_for).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </td>
                    <td className="px-10 py-8">
                      <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest shadow-sm ${
                        post.status === 'scheduled' ? 'bg-indigo-50 text-indigo-600' :
                        post.status === 'published' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                      }`}>
                        {post.status}
                      </span>
                    </td>
                    <td className="px-10 py-8 text-right">
                      <button 
                        onClick={() => deletePost(post.id)}
                        className="w-10 h-10 rounded-xl bg-white text-slate-300 flex items-center justify-center hover:bg-rose-50 hover:text-rose-600 transition-all border border-transparent hover:border-rose-100"
                      >
                        <span className="material-symbols-outlined text-xl">delete</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}
