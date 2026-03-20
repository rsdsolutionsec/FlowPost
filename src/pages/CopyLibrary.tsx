import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import CreateCopyModal from '../components/CreateCopyModal';
import ImportCopyModal from '../components/ImportCopyModal';
import CreatePostModal from '../components/CreatePostModal';

interface Copy {
  id: string;
  name: string;
  content: string;
  suggested_at?: string;
  media_path?: string;
  platform?: string;
  created_at: string;
}

export default function CopyLibrary() {
  const { user } = useAuth();
  const [copies, setCopies] = useState<Copy[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingCopy, setEditingCopy] = useState<Copy | null>(null);
  const [scheduleFromCopy, setScheduleFromCopy] = useState<Copy | null>(null);
  const [sentCopyIds, setSentCopyIds] = useState<Set<string>>(new Set());
  const [sendingAll, setSendingAll] = useState(false);
  const [sendAllResult, setSendAllResult] = useState<{ sent: number; skipped: number } | null>(null);

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

      // Pre-fetch all media to resolve filenames (batch lookup)
      const { data: allMedia } = await supabase
        .from('media')
        .select('name, url')
        .eq('user_id', user.id);

      const mediaByName = new Map<string, string>();
      interface MediaRow { name: string; url: string; }
      ((allMedia as MediaRow[]) || []).forEach((m) => {
        mediaByName.set(m.name.toLowerCase(), m.url);
      });

      // Build posts array — one or two posts per copy depending on platform
      const postsToInsert: object[] = [];

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

        // Add Facebook post
        if ((platform === 'facebook' || platform === 'both') && pageId) {
          postsToInsert.push({ ...base, platform: 'facebook', facebook_page_id: pageId, instagram_account_id: null });
        }

        // Add Instagram post
        if ((platform === 'instagram' || platform === 'both') && igId) {
          postsToInsert.push({ ...base, platform: 'instagram', facebook_page_id: null, instagram_account_id: igId });
        }

        // Fallback: if no matching account found, still create FB post
        if (postsToInsert.length === 0 && pageId) {
          postsToInsert.push({ ...base, platform: 'facebook', facebook_page_id: pageId, instagram_account_id: null });
        }
      }

      if (postsToInsert.length === 0) {
        alert('No hay cuentas conectadas para publicar. Conecta Facebook o Instagram en Configuración.');
        return;
      }

      const { error } = await supabase.from('posts').insert(postsToInsert);
      if (error) throw error;

      const newSent = new Set(Array.from(sentCopyIds));
      unsentCopies.forEach((c: Copy) => newSent.add(c.id));
      setSentCopyIds(newSent);
      setSendAllResult({ sent: unsentCopies.length, skipped: copies.length - unsentCopies.length });
    } catch (error: any) {
      alert('Error al enviar: ' + error.message);
    } finally {
      setSendingAll(false);
    }
  };

  const unsentCount = copies.filter((c: Copy) => !sentCopyIds.has(c.id)).length;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-12 pb-20"
    >
      {/* Header */}
      <div className="flex justify-between items-end">
        <div className="space-y-2">
          <h2 className="text-4xl font-black tracking-tight text-slate-900 font-headline">Librería de Copys</h2>
          <p className="text-slate-500 font-medium">Gestiona tus mejores descripciones y reutilízalas en un clic.</p>
        </div>
        <div className="flex gap-3">
          {/* Send All button - only when there are unsent copies */}
          {unsentCount > 0 && (
            <button 
              onClick={handleSendAll}
              disabled={sendingAll}
              className="px-6 py-4 bg-amber-500 text-white font-black rounded-2xl hover:bg-amber-600 transition-all flex items-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95 translate-y-[-2px] disabled:opacity-60"
            >
              {sendingAll ? (
                <>
                  <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                  <span className="text-sm uppercase tracking-widest font-bold">Enviando...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px]">send</span>
                  <span className="text-sm uppercase tracking-widest font-bold">Enviar todos</span>
                  <span className="ml-1 bg-white/20 text-white text-xs font-black px-2 py-0.5 rounded-full">{unsentCount}</span>
                </>
              )}
            </button>
          )}
          <button 
            onClick={() => setIsImportModalOpen(true)}
            className="px-6 py-4 bg-white text-slate-900 font-black rounded-2xl hover:bg-slate-50 transition-all flex items-center gap-2 border border-slate-200 active:scale-95 translate-y-[-2px]"
          >
            <span className="material-symbols-outlined text-[18px]">upload_file</span>
            <span className="text-sm uppercase tracking-widest font-bold">Importar</span>
          </button>
          <button 
            onClick={() => {
              setEditingCopy(null);
              setIsModalOpen(true);
            }}
            className="px-6 py-4 bg-slate-900 text-white font-black rounded-2xl hover:bg-indigo-600 transition-all flex items-center gap-2 shadow-xl shadow-slate-900/10 active:scale-95 translate-y-[-2px]"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            <span className="text-sm uppercase tracking-widest font-bold">Nuevo Copy</span>
          </button>
        </div>
      </div>

      {/* Send All result toast */}
      <AnimatePresence>
        {sendAllResult && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl"
          >
            <span className="material-symbols-outlined text-emerald-500">check_circle</span>
            <div>
              <p className="text-sm font-black text-emerald-700">
                ¡{sendAllResult.sent} cop{sendAllResult.sent === 1 ? 'y enviado' : 'ys enviados'} a Programados como pendientes!
              </p>
              {sendAllResult.skipped > 0 && (
                <p className="text-xs text-emerald-500 font-medium">{sendAllResult.skipped} ya estaban programados y fueron omitidos.</p>
              )}
            </div>
            <button onClick={() => setSendAllResult(null)} className="ml-auto text-emerald-400 hover:text-emerald-600">
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <CreateCopyModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={fetchCopies}
        editCopy={editingCopy}
      />

      <ImportCopyModal 
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={fetchCopies}
      />

      {/* CreatePostModal - only for individual copy scheduling */}
      <CreatePostModal
        isOpen={!!scheduleFromCopy}
        onClose={() => setScheduleFromCopy(null)}
        onSuccess={() => { setScheduleFromCopy(null); fetchCopies(); }}
        prefill={scheduleFromCopy ? {
          copyId: scheduleFromCopy.id,
          copyName: scheduleFromCopy.name,
          scheduledAt: scheduleFromCopy.suggested_at,
          platform: scheduleFromCopy.platform,
          mediaUrl: scheduleFromCopy.media_path && scheduleFromCopy.media_path.startsWith('http') 
            ? scheduleFromCopy.media_path 
            : undefined,
          mediaPath: scheduleFromCopy.media_path && !scheduleFromCopy.media_path.startsWith('http')
            ? scheduleFromCopy.media_path
            : undefined,
          mediaFileName: scheduleFromCopy.media_path ? scheduleFromCopy.media_path.split('/').pop() : undefined
        } : undefined}
      />

      {/* Grid of Copies */}
      {loading ? (
        <div className="text-center py-24 text-slate-400 font-bold uppercase tracking-[0.2em] animate-pulse">Cargando librería...</div>
      ) : copies.length === 0 ? (
        <div className="text-center py-24 bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200">
          <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
            <span className="material-symbols-outlined text-4xl text-slate-300">content_copy</span>
          </div>
          <p className="text-slate-500 font-black text-xl mb-4">Tu librería está vacía.</p>
          <p className="text-slate-400 font-medium mb-8">Empieza guardando tus mejores captions para ahorrar tiempo al programar.</p>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="text-indigo-600 font-black text-sm uppercase tracking-widest hover:underline"
          >
            Crea tu primer template
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {copies.map((copy: Copy) => {
            const isSent = sentCopyIds.has(copy.id);
            return (
              <div key={copy.id} className={`bg-white p-8 rounded-[2.5rem] shadow-sm border flex flex-col justify-between hover:shadow-xl hover:translate-y-[-4px] transition-all duration-300 group relative overflow-hidden ${isSent ? 'border-emerald-100' : 'border-slate-100'}`}>
                {/* Sent badge */}
                {isSent && (
                  <div className="absolute top-4 left-4 flex items-center gap-1 px-2 py-1 bg-emerald-50 border border-emerald-200 rounded-full z-20">
                    <span className="material-symbols-outlined text-[12px] text-emerald-500">check_circle</span>
                    <span className="text-[9px] font-black text-emerald-600 uppercase tracking-wider">Programado</span>
                  </div>
                )}

                <div className="space-y-4 relative z-10">
                  <div className="flex justify-between items-start">
                    <h4 className={`font-black text-xl text-slate-900 font-headline leading-tight truncate ${isSent ? 'pr-4 mt-6' : 'pr-12'}`}>{copy.name}</h4>
                    {/* Card hover actions */}
                    <div className="absolute top-0 right-0 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {!isSent && (
                        <button 
                          onClick={() => setScheduleFromCopy(copy)}
                          className="p-2 text-slate-400 hover:text-amber-500 transition-colors"
                          title="Enviar a programados"
                        >
                          <span className="material-symbols-outlined text-[20px]">schedule_send</span>
                        </button>
                      )}
                      <button 
                        onClick={() => handleEdit(copy)}
                        className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"
                        title="Editar copy"
                      >
                        <span className="material-symbols-outlined text-[20px]">edit</span>
                      </button>
                      <button 
                        onClick={() => handleDelete(copy.id)}
                        className="p-2 text-slate-400 hover:text-rose-600 transition-colors"
                        title="Eliminar copy"
                      >
                        <span className="material-symbols-outlined text-[20px]">delete</span>
                      </button>
                    </div>
                  </div>
                  <div className="h-[1px] w-full bg-slate-50"></div>
                  
                  {(copy.suggested_at || copy.media_path) && (
                    <div className="flex flex-col gap-2 p-3 bg-slate-50/50 rounded-2xl border border-slate-100/50">
                      {copy.suggested_at && (
                        <div className="flex items-center gap-2 text-[10px] font-bold text-indigo-600 uppercase tracking-wider">
                          <span className="material-symbols-outlined text-[14px]">event</span>
                          <span>Sugerido: {new Date(copy.suggested_at).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      )}
                      {copy.media_path && (
                        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">
                          <span className="material-symbols-outlined text-[14px]">attachment</span>
                          <span className="truncate">{copy.media_path}</span>
                        </div>
                      )}
                    </div>
                  )}

                  <p className="text-slate-500 font-medium text-sm line-clamp-4 leading-relaxed italic whitespace-pre-wrap">
                    "{copy.content}"
                  </p>
                </div>
                
                <div className="mt-8 flex items-center justify-between relative z-10">
                  <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest shrink-0">
                    {new Date(copy.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </span>
                  {!isSent && (
                    <button
                      onClick={() => setScheduleFromCopy(copy)}
                      className="flex items-center gap-1 text-[10px] font-black text-amber-500 hover:text-amber-600 uppercase tracking-wider transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <span className="material-symbols-outlined text-[14px]">schedule_send</span>
                      Programar
                    </button>
                  )}
                </div>

                {/* Decorative gradient corner */}
                <div className={`absolute -bottom-10 -right-10 w-24 h-24 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity ${isSent ? 'bg-emerald-50' : 'bg-indigo-50'}`}></div>
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
