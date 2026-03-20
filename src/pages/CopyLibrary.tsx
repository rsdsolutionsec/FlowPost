import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import CreateCopyModal from '../components/CreateCopyModal';
import ImportCopyModal from '../components/ImportCopyModal';
import CreatePostModal from '../components/CreatePostModal';
import { motion, AnimatePresence } from 'framer-motion';

interface Copy {
  id: string;
  name: string;
  content: string;
  suggested_at: string | null;
  media_path: string | null;
  platform: string;
  created_at: string;
}

export default function CopyLibrary() {
  const { user } = useAuth();
  const [copies, setCopies] = useState<Copy[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [editingCopy, setEditingCopy] = useState<Copy | null>(null);
  const [isQuickPostOpen, setIsQuickPostOpen] = useState(false);
  const [selectedCopyForPost, setSelectedCopyForPost] = useState<Copy | null>(null);
  const [sentCopyIds, setSentCopyIds] = useState<Set<string>>(new Set());
  const [sendingAll, setSendingAll] = useState(false);
  const [sendAllStatus, setSendAllResult] = useState<{ success: boolean; message: string } | null>(null);

  const fetchCopies = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [copiesRes, postsRes] = await Promise.all([
        supabase
          .from('copies')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        // Fetch copy_ids that already have a pending or scheduled post
        supabase
          .from('posts')
          .select('copy_id')
          .eq('user_id', user.id)
          .in('status', ['pending', 'scheduled'])
          .not('copy_id', 'is', null)
      ]);

      if (copiesRes.error) throw copiesRes.error;
      setCopies((copiesRes.data as Copy[]) || []);

      if (postsRes.data) {
        setSentCopyIds(new Set(postsRes.data.map((p: { copy_id: string }) => p.copy_id)));
      }
    } catch (error: any) {
      console.error('Error fetching copies:', error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCopies();
  }, [user]);

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este copy?')) return;
    try {
      const { error } = await supabase.from('copies').delete().eq('id', id);
      if (error) throw error;
      setCopies((prev: Copy[]) => prev.filter((c: Copy) => c.id !== id));
    } catch (error: any) {
      alert('Error al eliminar: ' + error.message);
    }
  };

  const handleEdit = (copy: Copy) => {
    setEditingCopy(copy);
    setIsModalOpen(true);
  };

  const handleSendAll = async () => {
    if (!user) return;
    const unsentCopies = copies.filter((c: Copy) => !sentCopyIds.has(c.id));
    if (unsentCopies.length === 0) {
      alert('Todos los copies ya han sido enviados a programados.');
      return;
    }
    if (!confirm(`¿Enviar ${unsentCopies.length} cop${unsentCopies.length === 1 ? 'y' : 'ys'} a programados como pendientes?`)) return;

    setSendingAll(true);
    setSendAllResult(null);

    try {
      // Fetch active Facebook page and Instagram account
      const [pagesRes, igRes] = await Promise.all([
        supabase.from('facebook_pages').select('id').eq('user_id', user.id).eq('is_active', true).limit(1),
        supabase.from('instagram_accounts').select('id').eq('user_id', user.id).eq('is_active', true).limit(1),
      ]);

      const pageId = pagesRes.data?.[0]?.id || null;
      const igId = igRes.data?.[0]?.id || null;

      if (!pageId && !igId) {
        throw new Error('No tienes ninguna página de Facebook o cuenta de Instagram activa conectada.');
      }

      // Fetch ALL media once to avoid multiple lookups
      const { data: allMedia } = await supabase.from('media').select('name, url').eq('user_id', user.id);
      const mediaByName = new Map();
      interface MediaRow { name: string; url: string; }
      ((allMedia as MediaRow[]) || []).forEach((m) => {
        mediaByName.set(m.name.toLowerCase(), m.url);
      });

      // Build posts array — one or two posts per copy depending on platform
      const postsToInsert: any[] = [];

      for (const copy of unsentCopies) {
        // Resolve media URL from library
        let imageUrl = '';
        if (copy.media_path) {
          if (copy.media_path.startsWith('http')) {
            imageUrl = copy.media_path;
          } else {
            const fileName = copy.media_path.split('/').pop()?.toLowerCase() || '';
            imageUrl = mediaByName.get(fileName) || '';
          }
        }

        const scheduledAt = copy.suggested_at
          ? new Date(copy.suggested_at).toISOString()
          : new Date(Date.now() + 60 * 60 * 1000).toISOString();

        const platform = copy.platform || 'facebook';
        const base = {
          user_id: user.id,
          copy_id: copy.id,
          caption: null,
          custom_caption: null,
          image_path: imageUrl,
          scheduled_at: scheduledAt,
          status: 'pending',
        };

        let addedAny = false;

        // Add Facebook post
        if ((platform === 'facebook' || platform === 'both') && pageId) {
          postsToInsert.push({ ...base, platform: 'facebook', facebook_page_id: pageId, instagram_account_id: null });
          addedAny = true;
        }

        // Add Instagram post
        if ((platform === 'instagram' || platform === 'both') && igId) {
          postsToInsert.push({ ...base, platform: 'instagram', facebook_page_id: null, instagram_account_id: igId });
          addedAny = true;
        }

        // Fallback: if platform context didn't match any connected account but we have a pageId, default to FB
        if (!addedAny && pageId) {
          postsToInsert.push({ ...base, platform: 'facebook', facebook_page_id: pageId, instagram_account_id: null });
        }
      }

      if (postsToInsert.length > 0) {
        const { error: insertError } = await supabase.from('posts').insert(postsToInsert);
        if (insertError) throw insertError;
      }

      setSendAllResult({ success: true, message: `¡Éxito! Se han creado ${postsToInsert.length} posts programados.` });
      fetchCopies();
    } catch (error: any) {
      setSendAllResult({ success: false, message: error.message });
      console.error('Send All Error:', error);
    } finally {
      setSendingAll(false);
    }
  };

  const openQuickPost = (copy: Copy) => {
    setSelectedCopyForPost(copy);
    setIsQuickPostOpen(true);
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 space-y-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <span className="material-symbols-outlined text-2xl">auto_awesome</span>
            </span>
            <h1 className="text-4xl font-black text-slate-900 font-headline tracking-tight">Biblioteca de Copies</h1>
          </div>
          <p className="text-slate-500 font-medium text-lg">Centraliza tus contenidos y simplifica tu programación.</p>
        </div>
        <div className="flex flex-wrap gap-4">
          <button
            onClick={handleSendAll}
            disabled={sendingAll || copies.length === 0}
            className="flex items-center gap-2 px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-indigo-200 disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-lg">send</span>
            {sendingAll ? 'Enviando...' : 'Enviar todos'}
          </button>
          <button 
            onClick={() => setIsImportOpen(true)}
            className="flex items-center gap-2 px-8 py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-slate-200"
          >
            <span className="material-symbols-outlined text-lg">upload_file</span>
            Importar TXT
          </button>
          <button 
            onClick={() => { setEditingCopy(null); setIsModalOpen(true); }}
            className="flex items-center gap-2 px-8 py-4 bg-white hover:bg-slate-50 text-slate-900 rounded-2xl border-2 border-slate-100 font-black text-xs uppercase tracking-widest transition-all"
          >
            <span className="material-symbols-outlined text-lg">add</span>
            Nuevo Copy
          </button>
        </div>
      </div>

      <AnimatePresence>
        {sendAllStatus && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`p-6 rounded-3xl flex items-center gap-4 ${sendAllStatus.success ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' : 'bg-rose-50 text-rose-800 border border-rose-100'}`}
          >
            <span className="material-symbols-outlined text-2xl">
              {sendAllStatus.success ? 'check_circle' : 'error'}
            </span>
            <p className="font-bold flex-1">{sendAllStatus.message}</p>
            <button onClick={() => setSendAllResult(null)} className="p-1 hover:bg-black/5 rounded-full">
              <span className="material-symbols-outlined text-xl">close</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-white/50 backdrop-blur-sm rounded-[3rem] p-8 border border-white shadow-xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-8">
          {loading ? (
            <div className="col-span-full py-20 text-center">
              <div className="animate-spin w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto" />
              <p className="mt-4 text-slate-400 font-bold uppercase tracking-widest text-[10px]">Cargando biblioteca...</p>
            </div>
          ) : copies.length === 0 ? (
            <div className="col-span-full py-32 text-center space-y-4">
              <div className="w-24 h-24 bg-slate-50 rounded-[2.5rem] flex items-center justify-center mx-auto">
                <span className="material-symbols-outlined text-4xl text-slate-300">library_add</span>
              </div>
              <p className="text-slate-400 font-bold text-lg">Tu biblioteca está vacía.</p>
              <button 
                onClick={() => setIsModalOpen(true)}
                className="text-indigo-600 font-black text-xs uppercase tracking-widest hover:underline"
              >
                Crea tu primer copy maestro
              </button>
            </div>
          ) : (
            copies.map((copy) => {
              const isSent = sentCopyIds.has(copy.id);
              return (
                <motion.div 
                  key={copy.id}
                  layout
                  className="group relative bg-white rounded-3xl p-8 border border-slate-100 shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all duration-500"
                >
                  <div className="flex justify-between items-start mb-6">
                    <div className="space-y-1.5 flex-1 min-w-0 pr-4">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                          copy.platform === 'both' ? 'bg-purple-50 text-purple-600' :
                          copy.platform === 'instagram' ? 'bg-pink-50 text-pink-600' :
                          'bg-blue-50 text-blue-600'
                        }`}>
                          {copy.platform === 'both' ? 'FB+IG' : copy.platform === 'instagram' ? 'IG' : 'FB'}
                        </span>
                        {isSent && (
                          <span className="text-[9px] font-black uppercase px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-full">Enviado</span>
                        )}
                      </div>
                      <h3 className="text-lg font-black text-slate-900 group-hover:text-indigo-600 transition-colors truncate">{copy.name}</h3>
                    </div>
                    <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-300">
                      <button 
                        onClick={() => handleEdit(copy)}
                        className="p-2.5 bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-900 rounded-xl transition-all"
                      >
                        <span className="material-symbols-outlined text-lg">edit</span>
                      </button>
                      <button 
                        onClick={() => handleDelete(copy.id)}
                        className="p-2.5 bg-rose-50 text-rose-300 hover:bg-rose-500 hover:text-white rounded-xl transition-all"
                      >
                        <span className="material-symbols-outlined text-lg">delete</span>
                      </button>
                    </div>
                  </div>

                  <p className="text-slate-600 text-sm leading-relaxed mb-8 font-medium line-clamp-4 min-h-[5rem]">
                    {copy.content}
                  </p>

                  <div className="flex items-center justify-between pt-6 border-t border-slate-50">
                    <div className="space-y-1">
                      <p className="text-[9px] font-black uppercase text-slate-300 tracking-widest">Sugerido</p>
                      <p className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-sm">calendar_today</span>
                        {copy.suggested_at ? new Date(copy.suggested_at).toLocaleDateString() : 'Cualquier fecha'}
                      </p>
                    </div>
                    <button 
                      onClick={() => openQuickPost(copy)}
                      disabled={isSent}
                      className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${
                        isSent 
                        ? 'bg-slate-50 text-slate-300 cursor-not-allowed' 
                        : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white hover:shadow-lg hover:shadow-indigo-100'
                      }`}
                    >
                      <span className="material-symbols-outlined text-sm">schedule</span>
                      Programar
                    </button>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </div>

      <CreateCopyModal 
        isOpen={isModalOpen} 
        onClose={() => { setIsModalOpen(false); setEditingCopy(null); }}
        onSuccess={fetchCopies}
        editCopy={editingCopy}
      />

      <ImportCopyModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onSuccess={fetchCopies}
      />

      <CreatePostModal 
        isOpen={isQuickPostOpen}
        onClose={() => setIsQuickPostOpen(false)}
        onSuccess={() => { setIsQuickPostOpen(false); fetchCopies(); }}
        prefill={selectedCopyForPost ? {
          templateName: selectedCopyForPost.name,
          caption: selectedCopyForPost.content,
          scheduled_at: selectedCopyForPost.suggested_at || '',
          copyId: selectedCopyForPost.id,
          libraryMediaPath: selectedCopyForPost.media_path || '',
          platform: selectedCopyForPost.platform
        } : undefined}
      />
    </div>
  );
}
