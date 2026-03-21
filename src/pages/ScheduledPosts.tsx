import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import CreatePostModal from '../components/CreatePostModal';
import PostInsightsBadge from '../components/analytics/PostInsightsBadge';

interface PostInsight {
  impressions: number;
  reach: number;
  engagement: number;
}

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
  post_insights?: PostInsight[];
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

  // Bulk selection
  const [selectedPosts, setSelectedPosts] = useState<Set<string>>(new Set());
  const [deletingBulk, setDeletingBulk] = useState(false);

  useEffect(() => {
    if (user) {
      fetchPosts();
      fetchAccounts();
    }
  }, [user, filterAccount, statusFilter]);

  // Clear selection when filters change
  useEffect(() => {
    setSelectedPosts(new Set());
  }, [filterAccount, statusFilter]);

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
          instagram_accounts(username),
          post_insights(impressions, reach, engagement)
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
      setSelectedPosts(prev => { const next = new Set(prev); next.delete(id); return next; });
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

  const handleApproveAll = async () => {
    const pendingPosts = posts.filter(p => p.status === 'pending');
    if (pendingPosts.length === 0) return;
    if (!confirm(`¿Aprobar todas las ${pendingPosts.length} publicaciones pendientes?`)) return;
    try {
      const { error } = await supabase
        .from('posts')
        .update({ status: 'scheduled' })
        .in('id', pendingPosts.map(p => p.id));
      if (error) throw error;
      setPosts(posts.map(p => p.status === 'pending' ? { ...p, status: 'scheduled' as const } : p));
    } catch (error: any) {
      alert('Error: ' + error.message);
    }
  };

  const toggleSelectPost = (id: string) => {
    setSelectedPosts(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedPosts.size === posts.length) {
      setSelectedPosts(new Set());
    } else {
      setSelectedPosts(new Set(posts.map(p => p.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedPosts.size === 0) return;
    const count = selectedPosts.size;
    if (!confirm(`¿Eliminar ${count} publicación${count > 1 ? 'es' : ''}? Esta acción no se puede deshacer.`)) return;

    setDeletingBulk(true);
    try {
      const ids = Array.from(selectedPosts);
      const { error } = await supabase.from('posts').delete().in('id', ids);
      if (error) throw error;
      setPosts(posts.filter(p => !selectedPosts.has(p.id)));
      setSelectedPosts(new Set());
    } catch (error: any) {
      alert('Error al eliminar: ' + error.message);
    } finally {
      setDeletingBulk(false);
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

  const allSelected = posts.length > 0 && selectedPosts.size === posts.length;
  const someSelected = selectedPosts.size > 0;

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
        <div className="flex gap-3 w-full sm:w-auto">
          {posts.some(p => p.status === 'pending') && (
            <button
              onClick={handleApproveAll}
              className="flex-1 sm:flex-none px-6 py-3 bg-emerald-500 text-white font-bold rounded-2xl hover:bg-emerald-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
            >
              <span className="material-symbols-outlined text-[20px]">done_all</span>
              <span className="text-sm">Aprobar Todo</span>
              <span className="bg-white/20 text-white text-xs font-black px-2 py-0.5 rounded-full">
                {posts.filter(p => p.status === 'pending').length}
              </span>
            </button>
          )}
          <button
            onClick={() => { setEditingPost(null); setShowCreateModal(true); }}
            className="flex-1 sm:flex-none px-6 py-3 bg-primary text-white font-bold rounded-2xl hover:translate-y-[-1px] transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
          >
            <span className="material-symbols-outlined text-[20px]">add</span>
            <span className="text-sm">Programar Nuevo</span>
          </button>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="mb-6 flex flex-col lg:flex-row gap-4">
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

        {/* Select All checkbox */}
        {posts.length > 0 && !loading && (
          <label className="flex items-center gap-3 px-5 py-4 bg-white border border-slate-100 rounded-2xl shadow-sm cursor-pointer hover:bg-slate-50 transition-all whitespace-nowrap">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleSelectAll}
              className="w-5 h-5 rounded text-primary cursor-pointer"
            />
            <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-slate-600">
              Seleccionar todos ({posts.length})
            </span>
          </label>
        )}
      </div>

      {/* Bulk Delete Toolbar */}
      <AnimatePresence>
        {someSelected && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-6 p-4 bg-rose-50 border-2 border-rose-200 rounded-2xl flex items-center justify-between"
          >
            <span className="text-sm font-black text-rose-700">
              {selectedPosts.size} publicación{selectedPosts.size > 1 ? 'es' : ''} seleccionada{selectedPosts.size > 1 ? 's' : ''}
            </span>
            <div className="flex gap-3">
              <button
                onClick={() => setSelectedPosts(new Set())}
                className="px-4 py-2 bg-white text-slate-700 border border-rose-200 font-bold rounded-xl hover:bg-slate-50 transition-all text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={handleBulkDelete}
                disabled={deletingBulk}
                className="px-4 py-2 bg-rose-600 text-white font-bold rounded-xl hover:bg-rose-700 transition-all text-sm flex items-center gap-2 disabled:opacity-60"
              >
                <span className="material-symbols-outlined text-[18px]">delete</span>
                <span>{deletingBulk ? 'Eliminando...' : 'Eliminar'}</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
                    isSelected={selectedPosts.has(post.id)}
                    onSelect={() => toggleSelectPost(post.id)}
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

function PostCard({ post, onDelete, onEdit, onApprove, isSelected, onSelect }: {
  post: Post;
  onDelete: (id: string) => void;
  onEdit: () => void;
  onApprove: (id: string) => void;
  isSelected: boolean;
  onSelect: () => void;
}) {
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
      className={`group bg-white rounded-[2rem] sm:rounded-[2.5rem] border-2 shadow-sm hover:shadow-2xl transition-all overflow-hidden flex flex-col ${
        isSelected ? 'border-rose-400 shadow-rose-100' : 'border-slate-100 hover:border-primary/10'
      }`}
    >
      <div className="relative aspect-video sm:aspect-[4/3] bg-slate-100 overflow-hidden">
        <img src={post.image_path} alt="Post content" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />

        {/* Checkbox top-right */}
        <button
          onClick={(e) => { e.stopPropagation(); onSelect(); }}
          className={`absolute top-3 right-3 z-20 w-7 h-7 rounded-lg border-2 flex items-center justify-center transition-all shadow-sm ${
            isSelected
              ? 'bg-rose-500 border-rose-500 text-white'
              : 'bg-white/90 border-slate-300 text-transparent hover:border-rose-400'
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">check</span>
        </button>

        <div className="absolute top-3 left-3 flex gap-2">
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

        <p className="text-slate-600 text-sm font-medium leading-relaxed italic line-clamp-3 mb-2">
          "{post.caption}"
        </p>

        {post.status === 'published' && post.post_insights?.[0] && (
          <PostInsightsBadge
            impressions={post.post_insights[0].impressions}
            reach={post.post_insights[0].reach}
            engagement={post.post_insights[0].engagement}
          />
        )}

        <div className="mb-4" />

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
