import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import CreatePostModal from '../components/CreatePostModal';

interface Post {
  id: string;
  caption: string;
  custom_caption?: string;
  copies?: { name: string; content: string } | null;
  copy_id?: string | null;
  image_path: string;
  scheduled_at: string;
  status: 'scheduled' | 'published' | 'failed' | 'pending' | 'processing';
  platform: string;
  facebook_pages?: { page_name: string } | null;
  instagram_accounts?: { username: string } | null;
  instagram_account_id?: string | null;
  facebook_page_id?: string | null;
  campaign_id?: string | null;
}

function MediaPreview({ path }: { path: string }) {
  const [url, setUrl] = useState<string>('');
  const isVideo = /\.(mp4|mov|avi|wmv|flv|webm|mkv)$/i.test(path);

  useEffect(() => {
    if (path.startsWith('http')) {
      setUrl(path);
      return;
    }

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
        <span className="material-symbols-outlined text-slate-300 animate-pulse">
          {isVideo ? 'videocam' : 'image'}
        </span>
      </div>
    );
  }

  if (isVideo) {
    return (
      <video src={url} className="w-full h-full object-cover" muted loop onMouseOver={(e) => e.currentTarget.play()} onMouseOut={(e) => e.currentTarget.pause()} />
    );
  }

  return <img src={url} alt="Post media" className="w-full h-full object-cover" />;
}

export default function ScheduledPosts() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);

  const fetchPosts = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*, copies(name, content), facebook_pages(page_name), instagram_accounts(username)')
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

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta publicación?')) return;

    try {
      const { error, count } = await supabase
        .from('posts')
        .delete({ count: 'exact' })
        .eq('id', id)
        .eq('user_id', user?.id);

      if (error) throw error;
      
      if (count === 0) {
        alert('No se pudo eliminar la publicación. Es posible que ya no exista o no tengas permisos.');
        return;
      }

      setPosts((prev: Post[]) => prev.filter((p: Post) => p.id !== id));
      if (selectedPost?.id === id) setSelectedPost(null);
    } catch (error: any) {
      alert('Error al eliminar: ' + error.message);
    }
  };

  const handleApproveAll = async () => {
    if (!user) return;
    const pendingPosts = posts.filter((p: Post) => p.status === 'pending');
    if (pendingPosts.length === 0) {
      alert('No hay publicaciones pendientes por aprobar.');
      return;
    }

    if (!confirm(`¿Aprobar ${pendingPosts.length} publicaciones pendientes?`)) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('posts')
        .update({ status: 'scheduled' })
        .eq('user_id', user.id)
        .eq('status', 'pending');

      if (error) throw error;
      
      setPosts((prev: Post[]) => prev.map((p: Post) => 
        p.status === 'pending' ? { ...p, status: 'scheduled' as const } : p
      ));
      await fetchPosts(); // Refresh to ensure UI is in sync
    } catch (error: any) {
      alert('Error al aprobar todos: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    if (!user) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('posts')
        .update({ status: 'scheduled' })
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
      
      setPosts((prev: Post[]) => prev.map((p: Post) => 
        p.id === id ? { ...p, status: 'scheduled' as const } : p
      ));
    } catch (error: any) {
      alert('Error al aprobar: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (post: Post) => {
    setEditingPost(post);
    setIsModalOpen(true);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-12 pb-20"
    >
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-black tracking-tight text-slate-900 font-headline">Posts Programados</h2>
          <p className="text-slate-500 font-medium">Gestiona tu calendario y aprueba las publicaciones pendientes.</p>
        </div>
        <div className="flex gap-3">
          {posts.some(p => p.status === 'pending') && (
            <button 
              onClick={handleApproveAll}
              disabled={loading}
              className="px-6 py-4 bg-amber-500 text-white font-black rounded-2xl hover:bg-amber-600 transition-all flex items-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95 translate-y-[-2px] disabled:opacity-60"
            >
              <span className="material-symbols-outlined text-[18px]">task_alt</span>
              <span className="text-sm uppercase tracking-widest font-bold">Aprobar Todo</span>
              <span className="ml-1 bg-white/20 text-white text-xs font-black px-2 py-0.5 rounded-full">
                {posts.filter((p: Post) => p.status === 'pending').length}
              </span>
            </button>
          )}
          <button 
            onClick={() => setIsModalOpen(true)}
            className="px-6 py-4 bg-slate-900 text-white font-black rounded-2xl hover:bg-indigo-600 transition-all flex items-center gap-2 shadow-xl shadow-slate-900/10 active:scale-95 translate-y-[-2px]"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            <span className="text-sm uppercase tracking-widest font-bold">Crear Post</span>
          </button>
        </div>
      </div>

      <CreatePostModal 
        isOpen={isModalOpen} 
        onClose={() => {
          setIsModalOpen(false);
          setEditingPost(null);
        }} 
        onSuccess={fetchPosts} 
        prefill={editingPost ? {
          editId: editingPost.id,
          caption: editingPost.custom_caption || editingPost.caption,
          mediaUrl: editingPost.image_path,
          platform: editingPost.platform,
          status: editingPost.status,
          facebookPageId: editingPost.facebook_page_id || undefined,
          instagramAccountId: editingPost.instagram_account_id || undefined,
          campaignId: editingPost.campaign_id || undefined
        } : undefined}
      />

      {/* Grid of Posts */}
      {loading ? (
        <div className="text-center py-24 text-slate-400 font-bold uppercase tracking-[0.2em] animate-pulse">Cargando publicaciones...</div>
      ) : posts.length === 0 ? (
        <div className="text-center py-24 bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200">
          <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
            <span className="material-symbols-outlined text-4xl text-slate-300">post_add</span>
          </div>
          <p className="text-slate-500 font-black text-xl mb-4">No hay publicaciones programadas aún.</p>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="text-indigo-600 font-black text-sm uppercase tracking-widest hover:underline"
          >
            Crea tu primera publicación ahora
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {posts.map((post) => (
            <div 
              key={post.id} 
              onClick={() => setSelectedPost(post)}
              className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden group hover:shadow-xl hover:translate-y-[-4px] transition-all duration-300 cursor-pointer"
            >
              <div className="aspect-square relative overflow-hidden">
                <MediaPreview path={post.image_path} />
                
                {/* Status Overlay */}
                <div className="absolute top-4 left-4 z-10">
                  <span className={`px-3 py-1 text-[10px] font-black rounded-full uppercase tracking-wider shadow-sm border ${
                    post.status === 'published' ? 'bg-emerald-500 text-white border-emerald-400' :
                    post.status === 'failed' ? 'bg-rose-500 text-white border-rose-400' :
                    post.status === 'pending' ? 'bg-amber-500 text-white border-amber-400' :
                    post.status === 'processing' ? 'bg-indigo-500 text-white border-indigo-400 animate-pulse' :
                    'bg-sky-500 text-white border-sky-400'
                  }`}>
                    {post.status === 'published' ? 'Publicado' : 
                     post.status === 'failed' ? 'Error' :
                     post.status === 'pending' ? 'Pendiente' :
                     post.status === 'processing' ? 'Procesando...' :
                     'Programado'}
                  </span>
                </div>

                {/* Platform Overlay */}
                <div className="absolute top-4 right-4 z-10">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white shadow-sm ${
                    post.platform === 'facebook' ? 'bg-blue-600' : 'bg-gradient-to-tr from-amber-400 via-rose-500 to-purple-600'
                  }`}>
                    <span className="material-symbols-outlined text-[18px]">
                      {post.platform === 'facebook' ? 'thumb_up' : 'photo_camera'}
                    </span>
                  </div>
                </div>

                {/* Hover actions */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                  <span className="material-symbols-outlined text-white text-4xl">visibility</span>
                </div>
              </div>

              <div className="p-8 space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      {new Date(post.scheduled_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                    </p>
                    <p className="text-2xl font-black text-slate-800">
                      {new Date(post.scheduled_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <p className="text-[10px] font-bold text-indigo-600 mt-1 uppercase tracking-tight">
                      {post.platform === 'facebook' 
                        ? (post.facebook_pages?.page_name || 'Facebook Page') 
                        : `@${post.instagram_accounts?.username || 'Instagram'}`}
                    </p>
                  </div>
                  {post.copies && (
                    <span className="px-2 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-black rounded-lg uppercase tracking-tight">
                      Copy: {post.copies.name}
                    </span>
                  )}
                </div>
                
                <p className="text-sm text-slate-500 font-medium line-clamp-2 italic leading-relaxed">
                  {post.copies ? 'Contenido del copy guardado...' : (post.custom_caption || post.caption || 'Sin texto')}
                </p>

                <div className="pt-2 flex gap-3">
                  {post.status === 'pending' && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleApprove(post.id); }}
                      className="flex-1 py-3 bg-amber-50 text-amber-700 rounded-xl flex items-center justify-center gap-2 hover:bg-amber-100 transition-colors text-xs font-black uppercase tracking-wider"
                    >
                      <span className="material-symbols-outlined text-[16px]">task_alt</span>
                      <span>Aprobar</span>
                    </button>
                  )}
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleEdit(post); }}
                    className="w-12 py-3 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center hover:bg-indigo-100 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px]">edit</span>
                  </button>
                  <button 

                    onClick={(e) => { e.stopPropagation(); handleDelete(post.id); }}
                    className="w-12 py-3 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center hover:bg-rose-100 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedPost && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setSelectedPost(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-4xl bg-white rounded-[3rem] shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[90vh]"
            >
              {/* Media Section */}
              <div className="w-full md:w-1/2 bg-slate-900 flex items-center justify-center relative min-h-[300px]">
                <MediaPreview path={selectedPost.image_path} />
                <button 
                  onClick={() => setSelectedPost(null)}
                  className="absolute top-6 left-6 w-10 h-10 bg-white/20 hover:bg-white/40 text-white rounded-full flex items-center justify-center backdrop-blur-sm transition-colors md:hidden"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              {/* Info Section */}
              <div className="w-full md:w-1/2 p-10 md:p-12 overflow-y-auto">
                <div className="flex justify-between items-start mb-8">
                  <div>
                    <h3 className="text-3xl font-black text-slate-800 font-headline mb-1">Detalles del Post</h3>
                    <div className="flex items-center gap-4">
                      <span className={`px-3 py-1 text-[10px] font-black rounded-full uppercase tracking-wider shadow-sm border ${
                        selectedPost.status === 'published' ? 'bg-emerald-500 text-white border-emerald-400' :
                        selectedPost.status === 'failed' ? 'bg-rose-500 text-white border-rose-400' :
                        selectedPost.status === 'pending' ? 'bg-amber-500 text-white border-amber-400' :
                        selectedPost.status === 'processing' ? 'bg-indigo-500 text-white border-indigo-400 animate-pulse' :
                        'bg-sky-500 text-white border-sky-400'
                      }`}>
                        {selectedPost.status === 'published' ? 'Publicado' : 
                         selectedPost.status === 'failed' ? 'Error' :
                         selectedPost.status === 'pending' ? 'Pendiente' :
                         selectedPost.status === 'processing' ? 'Procesando...' :
                         'Programado'}
                      </span>
                      <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">
                        {selectedPost.platform === 'facebook' 
                          ? `FB: ${selectedPost.facebook_pages?.page_name || '?'}` 
                          : `IG: @${selectedPost.instagram_accounts?.username || '?'}`}
                      </span>
                    </div>
                  </div>
                  <button 
                    onClick={() => setSelectedPost(null)}
                    className="w-10 h-10 text-slate-400 hover:text-slate-900 transition-colors hidden md:flex items-center justify-center"
                  >
                    <span className="material-symbols-outlined text-3xl">close</span>
                  </button>
                </div>

                <div className="space-y-8">
                  <div className="flex gap-10">
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fecha</p>
                      <p className="text-lg font-black text-slate-700">
                        {new Date(selectedPost.scheduled_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Hora</p>
                      <p className="text-lg font-black text-slate-700">
                        {new Date(selectedPost.scheduled_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>

                  {selectedPost.copies && (
                    <div className="space-y-2">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Plantilla (Copy)</p>
                      <div className="px-4 py-2 bg-indigo-50 rounded-xl text-indigo-700 font-bold inline-block border border-indigo-100">
                        {selectedPost.copies.name}
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Contenido</p>
                    <div className="p-6 bg-slate-50 rounded-3xl text-slate-600 font-medium whitespace-pre-wrap leading-relaxed border border-slate-100 min-h-[120px]">
                      {selectedPost.copies ? selectedPost.copies.content : (selectedPost.custom_caption || selectedPost.caption || 'Sin texto')}
                    </div>
                  </div>

                  <div className="flex gap-4 pt-4">
                    {selectedPost.status === 'pending' && (
                      <button 
                        onClick={() => handleApprove(selectedPost.id)}
                        className="flex-1 py-4 bg-amber-500 text-white rounded-2xl flex items-center justify-center gap-2 hover:bg-amber-600 transition-all font-black uppercase tracking-widest text-xs shadow-lg shadow-amber-500/20 active:scale-95"
                      >
                        <span className="material-symbols-outlined">task_alt</span>
                        <span>Aprobar Publicación</span>
                      </button>
                    )}
                    <button 
                      onClick={() => handleEdit(selectedPost)}
                      className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all font-black uppercase tracking-widest text-xs shadow-lg shadow-indigo-600/20 active:scale-95"
                    >
                      <span className="material-symbols-outlined">edit</span>
                      <span>Editar</span>
                    </button>
                    <button 

                      onClick={() => handleDelete(selectedPost.id)}
                      className="px-8 py-4 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center gap-2 hover:bg-rose-100 transition-all font-black uppercase tracking-widest text-xs active:scale-95"
                    >
                      <span className="material-symbols-outlined">delete</span>
                      <span>Eliminar</span>
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
