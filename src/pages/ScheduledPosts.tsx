import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import CreatePostModal from '../components/CreatePostModal';

interface Post {
  id: string;
  caption: string;
  image_path: string;
  scheduled_at: string;
  status: 'scheduled' | 'published' | 'failed';
  platform: string;
}

function ImagePreview({ path }: { path: string }) {
  const [url, setUrl] = useState<string>('');

  useEffect(() => {
    let objectUrl: string;
    const loadImg = async () => {
      try {
        const { data, error } = await supabase.storage.from('posts').download(path);
        if (error) throw error;
        if (data) {
          objectUrl = URL.createObjectURL(data);
          setUrl(objectUrl);
        }
      } catch (err) {
        console.error('Error cargando preview:', err);
      }
    };
    loadImg();
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [path]);

  if (!url) {
    return (
      <div className="w-full h-full bg-slate-100 flex items-center justify-center">
        <span className="material-symbols-outlined text-slate-300 animate-pulse">image</span>
      </div>
    );
  }

  return <img src={url} alt="Post media" className="w-full h-full object-cover" />;
}

export function ScheduledPosts() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchPosts = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('user_id', user.id)
        .order('scheduled_at', { ascending: true });

      if (error) throw error;
      setPosts(data || []);
    } catch (error: any) {
      console.error('Error fetching posts:', error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, [user]);

  const handleDelete = async (id: string, path: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este post?')) return;

    try {
      // 1. Eliminar de Storage
      await supabase.storage.from('posts').remove([path]);
      
      // 2. Eliminar de DB
      const { error } = await supabase.from('posts').delete().eq('id', id);
      if (error) throw error;
      
      setPosts(posts.filter(p => p.id !== id));
    } catch (error: any) {
      alert('Error al eliminar: ' + error.message);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Header */}
      <div className="mb-12 flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-extrabold tracking-tight text-on-surface font-headline">Posts Programados</h2>
          <p className="text-slate-500 mt-2 font-medium">Gestiona tu calendario de publicaciones en todas las plataformas.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setIsModalOpen(true)}
            className="px-5 py-2.5 bg-primary text-white font-semibold rounded-full hover:translate-y-[-1px] transition-all flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            <span>Crear Post</span>
          </button>
        </div>
      </div>

      <CreatePostModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={fetchPosts} 
      />

      {/* Main Content Area */}
      <div className="bg-surface-container-lowest rounded-2xl shadow-sm ghost-border overflow-hidden min-h-[600px]">
        {/* Posts List */}
        <div className="p-8 space-y-4">
          {loading ? (
            <div className="text-center py-20 text-on-surface-variant font-bold">Cargando publicaciones...</div>
          ) : posts.length === 0 ? (
            <div className="text-center py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
              <span className="material-symbols-outlined text-6xl text-slate-300 mb-4">post_add</span>
              <p className="text-slate-500 font-bold text-lg">No hay publicaciones programadas aún.</p>
              <button 
                onClick={() => setIsModalOpen(true)}
                className="mt-4 text-primary font-extrabold hover:underline"
              >
                Crea tu primera publicación ahora
              </button>
            </div>
          ) : (
            posts.map((post) => (
              <div key={post.id} className="flex gap-6 p-4 bg-white border border-slate-200 rounded-2xl hover:border-primary/30 transition-colors group">
                {/* Date/Time Column */}
                <div className="w-32 flex flex-col items-center justify-center border-r border-slate-100 pr-6 shrink-0">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    {new Date(post.scheduled_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                  </span>
                  <span className="text-2xl font-black text-slate-800">
                    {new Date(post.scheduled_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                
                {/* Media Preview */}
                <div className="w-20 h-20 rounded-xl bg-slate-100 overflow-hidden flex-shrink-0">
                  <ImagePreview path={post.image_path} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase tracking-wider ${
                      post.status === 'published' ? 'bg-emerald-100 text-emerald-700' :
                      post.status === 'failed' ? 'bg-rose-100 text-rose-700' :
                      'bg-amber-100 text-amber-700'
                    }`}>
                      {post.status === 'published' ? 'Publicado' : 
                       post.status === 'failed' ? 'Error' : 'Programado'}
                    </span>
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] ${
                      post.platform === 'facebook' ? 'bg-blue-600' : 'bg-gradient-to-tr from-amber-400 via-rose-500 to-purple-600'
                    }`}>
                      <span className="material-symbols-outlined text-[14px]">
                        {post.platform === 'facebook' ? 'thumb_up' : 'photo_camera'}
                      </span>
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 truncate font-medium">{post.caption}</p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => handleDelete(post.id, post.image_path)}
                    className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center hover:bg-rose-100 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </motion.div>
  );
}
