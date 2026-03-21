import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import CreatePostModal from '../components/CreatePostModal';

interface Post {
  id: string;
  caption: string;
  image_path: string;
  platform: string;
  status: 'scheduled' | 'published' | 'failed' | 'pending';
  scheduled_at: string;
  facebook_page_id?: string;
  instagram_account_id?: string;
  facebook_pages?: { page_name: string };
  instagram_accounts?: { username: string };
}

interface FacebookPage {
  id: string;
  page_name: string;
}

interface InstagramAccount {
  id: string;
  username: string;
}

export default function ScheduledPosts() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  
  // Accounts for filtering
  const [facebookPages, setFacebookPages] = useState<FacebookPage[]>([]);
  const [instagramAccounts, setInstagramAccounts] = useState<InstagramAccount[]>([]);
  
  // Filters
  const [filterAccount, setFilterAccount] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    if (user) {
      fetchPosts();
      fetchAccounts();
    }
  }, [user, filterAccount, statusFilter]);

  const fetchAccounts = async () => {
    const [pagesRes, igRes] = await Promise.all([
      supabase.from('facebook_pages').select('id, page_name').eq('user_id', user?.id),
      supabase.from('instagram_accounts').select('id, username').eq('user_id', user?.id)
    ]);
    if (pagesRes.data) setFacebookPages(pagesRes.data);
    if (igRes.data) setInstagramAccounts(igRes.data);
  };

  const fetchPosts = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('posts')
        .select(`
          *,
          facebook_pages(page_name),
          instagram_accounts(username)
        `)
        .eq('user_id', user?.id)
        .order('scheduled_at', { ascending: true });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      if (filterAccount !== 'all') {
        if (filterAccount.startsWith('fb_')) {
          query = query.eq('facebook_page_id', filterAccount.replace('fb_', ''));
        } else if (filterAccount.startsWith('ig_')) {
          query = query.eq('instagram_account_id', filterAccount.replace('ig_', ''));
        }
      }

      const { data, error } = await query;
      if (error) throw error;
      setPosts(data || []);
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar esta publicación?')) return;
    try {
      const { error } = await supabase.from('posts').delete().eq('id', id);
      if (error) throw error;
      setPosts(posts.filter(p => p.id !== id));
    } catch (error: any) {
      alert('Error: ' + error.message);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      const { error } = await supabase.from('posts').update({ status: 'scheduled' }).eq('id', id);
      if (error) throw error;
      fetchPosts();
    } catch (error: any) {
      alert('Error: ' + error.message);
    }
  };

  // Group posts by date
  const groupedPosts = posts.reduce((groups: any, post) => {
    const date = new Date(post.scheduled_at).toLocaleDateString('es-ES', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    if (!groups[date]) groups[date] = [];
    groups[date].push(post);
    return groups;
  }, {});

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="px-4 sm:px-0"
    >
      <div className="mb-8 sm:mb-12 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6">
        <div>
          <div className="flex items-center gap-2 text-slate-400 text-[10px] sm:text-xs font-bold tracking-widest uppercase mb-2">
            <span>Contenido</span>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span className="text-primary">Programadas</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-on-surface font-headline leading-tight">
            Calendario de Publicaciones
          </h2>
          <p className="text-slate-500 mt-2 font-medium text-sm sm:text-base">Visualiza y gestiona tu estrategia de contenido.</p>
        </div>
        <button 
          onClick={() => { setEditingPost(null); setShowCreateModal(true); }}
          className="w-full sm:w-auto px-6 py-3 bg-primary text-white font-bold rounded-2xl hover:translate-y-[-1px] transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
        >
          <span className="material-symbols-outlined text-[20px]">add</span>
          <span className="text-sm">Programar Nuevo</span>
        </button>
      </div>

      {/* Filters Toolbar */}
      <div className="mb-8 flex flex-col lg:flex-row gap-4">
        <div className="flex-1 flex flex-col sm:flex-row gap-4">
           <div className="relative flex-1">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400 text-sm">filter_alt</span>
              <select 
                value={filterAccount}
                onChange={(e) => setFilterAccount(e.target.value)}
                className="w-full pl-12 pr-6 py-4 bg-white border border-slate-100 rounded-2xl shadow-sm focus:ring-2 focus:ring-primary/10 transition-all text-[10px] sm:text-xs font-black uppercase tracking-widest appearance-none"
              >
                <option value="all">Todas las cuentas</option>
                <optgroup label="Facebook Pages">
                  {facebookPages.map(p => <option key={p.id} value={`fb_${p.id}`}>{p.page_name}</option>)}
                </optgroup>
                <optgroup label="Instagram Accounts">
                  {instagramAccounts.map(ig => <option key={ig.id} value={`ig_${ig.id}`}>@{ig.username}</option>)}
                </optgroup>
              </select>
           </div>
           
           <div className="relative flex-1">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400 text-sm">category</span>
              <select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full pl-12 pr-6 py-4 bg-white border border-slate-100 rounded-2xl shadow-sm focus:ring-2 focus:ring-primary/10 transition-all text-[10px] sm:text-xs font-black uppercase tracking-widest appearance-none"
              >
                <option value="all">Cualquier Estado</option>
                <option value="scheduled">Programados</option>
                <option value="published">Publicados</option>
                <option value="pending">Pendientes</option>
                <option value="failed">Fallidos</option>
              </select>
           </div>
        </div>
      </div>

      {loading ? (
        <div className="py-20 flex justify-center">
           <div className="w-10 h-10 border-4 border-primary/10 border-t-primary rounded-full animate-spin" />
        </div>
      ) : posts.length === 0 ? (
        <div className="bg-white rounded-[2.5rem] p-12 sm:p-20 text-center border border-slate-100 shadow-sm">
           <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <span className="material-symbols-outlined text-4xl text-slate-300">calendar_today</span>
           </div>
           <h3 className="text-lg font-bold text-slate-900 mb-2">No hay publicaciones</h3>
           <p className="text-slate-500 text-sm max-w-xs mx-auto mb-8">No tienes publicaciones que coincidan con tus filtros actuales.</p>
        </div>
      ) : (
        <div className="space-y-12 lg:space-y-16">
          {Object.entries(groupedPosts).map(([date, datePosts]: [string, any]) => (
            <div key={date} className="space-y-6 sm:space-y-8">
              <div className="flex items-center gap-6">
                 <h3 className="text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] text-slate-400 whitespace-nowrap">{date}</h3>
                 <div className="h-px bg-slate-100 flex-1" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                {datePosts.map((post: Post) => (
                  <PostCard 
                    key={post.id} 
                    post={post} 
                    onDelete={handleDelete}
                    onEdit={() => { setEditingPost(post); setShowCreateModal(true); }}
                    onApprove={handleApprove}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <CreatePostModal 
        isOpen={showCreateModal}
        onClose={() => { setShowCreateModal(false); setEditingPost(null); }}
        onSuccess={() => { fetchPosts(); setShowCreateModal(false); setEditingPost(null); }}
        prefill={editingPost ? {
          editId: editingPost.id,
          caption: editingPost.caption,
          mediaUrl: editingPost.image_path,
          platform: editingPost.platform,
          status: editingPost.status,
          facebookPageId: editingPost.facebook_page_id,
          instagramAccountId: editingPost.instagram_account_id,
          scheduledAt: editingPost.scheduled_at
        } : undefined}
      />
    </motion.div>
  );
}

function PostCard({ post, onDelete, onEdit, onApprove }: { post: Post, onDelete: (id: string) => void, onEdit: () => void, onApprove: (id: string) => void }) {
  const statusColors = {
    scheduled: 'bg-emerald-500',
    published: 'bg-primary',
    failed: 'bg-rose-500',
    pending: 'bg-amber-500'
  };

  const accountInfo = post.facebook_pages?.page_name || (post.instagram_accounts?.username ? `@${post.instagram_accounts?.username}` : post.platform);

  return (
    <motion.div 
      layout
      className="group bg-white rounded-[2rem] sm:rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-2xl hover:border-primary/10 transition-all overflow-hidden flex flex-col"
    >
      <div className="relative aspect-video sm:aspect-[4/3] bg-slate-100 overflow-hidden">
        <img src={post.image_path} alt="Post content" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
        <div className="absolute top-4 left-4 flex gap-2">
           <div className={`${statusColors[post.status]} text-white text-[8px] sm:text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full shadow-lg`}>
             {post.status}
           </div>
           <div className="bg-white/90 backdrop-blur-md text-[#1877F2] text-[8px] sm:text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5">
             <span className="material-symbols-outlined text-[12px]">{post.platform === 'instagram' ? 'photo_camera' : 'public'}</span>
             {accountInfo}
           </div>
        </div>
        
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
             <button onClick={onEdit} className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-slate-900 hover:bg-primary hover:text-white transition-all transform translate-y-4 group-hover:translate-y-0 duration-300">
               <span className="material-symbols-outlined text-[20px]">edit</span>
             </button>
             <button onClick={() => onDelete(post.id)} className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-slate-900 hover:bg-rose-500 hover:text-white transition-all transform translate-y-4 group-hover:translate-y-0 duration-300 delay-75">
               <span className="material-symbols-outlined text-[20px]">delete_forever</span>
             </button>
        </div>
      </div>

      <div className="p-6 sm:p-8 flex-1 flex flex-col">
        <div className="flex items-center gap-3 mb-4">
           <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
              <span className="material-symbols-outlined text-[20px]">schedule</span>
           </div>
           <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Programado para</p>
              <p className="text-xs font-bold text-slate-900">{new Date(post.scheduled_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} hrs</p>
           </div>
        </div>

        <p className="text-slate-600 text-sm font-medium leading-relaxed italic line-clamp-3 mb-6">
          "{post.caption}"
        </p>

        {post.status === 'pending' && (
          <button 
            onClick={() => onApprove(post.id)}
            className="mt-auto w-full py-3 bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-emerald-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
          >
            <span className="material-symbols-outlined text-sm">check_circle</span>
            Aprobar Ahora
          </button>
        )}
      </div>
    </motion.div>
  );
}
