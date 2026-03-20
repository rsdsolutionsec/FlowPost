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
  const [copyStatuses, setCopyStatuses] = useState<Map<string, 'active' | 'published'>>(new Map());
  const [sendingAll, setSendingAll] = useState(false);
  const [sendAllResult, setSendAllResult] = useState<{ sent: number; skipped: number } | null>(null);
  const [isSendAllModalOpen, setIsSendAllModalOpen] = useState(false);
  const [availablePages, setAvailablePages] = useState<any[]>([]);
  const [availableIgAccounts, setAvailableIgAccounts] = useState<any[]>([]);
  const [selectedDestinations, setSelectedDestinations] = useState<string[]>([]);

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
        supabase
          .from('posts')
          .select('copy_id, status')
          .eq('user_id', user.id)
          .not('copy_id', 'is', null)
      ]);

      if (copiesRes.error) throw copiesRes.error;
      setCopies((copiesRes.data as Copy[]) || []);

      if (postsRes.data) {
        const statusMap = new Map<string, 'active' | 'published'>();
        postsRes.data.forEach((p: { copy_id: string; status: string }) => {
          if (['pending', 'scheduled', 'processing'].includes(p.status)) {
            statusMap.set(p.copy_id, 'active');
          } else if (p.status === 'published' && statusMap.get(p.copy_id) !== 'active') {
            statusMap.set(p.copy_id, 'published');
          }
        });
        setCopyStatuses(statusMap);
      }
    } catch (error: any) {
      console.error('Error fetching copies:', error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCopies();
    if (user) {
      const fetchAccounts = async () => {
        const [pagesRes, igRes] = await Promise.all([
          supabase.from('facebook_pages').select('id, page_name').eq('user_id', user.id).eq('is_active', true),
          supabase.from('instagram_accounts').select('id, username').eq('user_id', user.id).eq('is_active', true)
        ]);
        if (pagesRes.data) setAvailablePages(pagesRes.data);
        if (igRes.data) setAvailableIgAccounts(igRes.data);
      };
      fetchAccounts();
    }
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
    const unsentCopies = copies.filter((c: Copy) => !copyStatuses.has(c.id));
    if (unsentCopies.length === 0) {
      alert('Todos los copies ya han sido enviados a programados.');
      return;
    }
    
    if (selectedDestinations.length === 0) {
      alert('Por favor selecciona al menos un destino.');
      return;
    }

    setSendingAll(true);
    setSendAllResult(null);
    setIsSendAllModalOpen(false);

    try {
      // Destination IDs
      const fbDestinations = selectedDestinations.filter(d => d.startsWith('fb:')).map(d => d.split(':')[1]);
      const igDestinations = selectedDestinations.filter(d => d.startsWith('ig:')).map(d => d.split(':')[1]);

      // Pre-fetch all media to resolve filenames (batch lookup)
      const { data: allMedia } = await supabase
        .from('media')
        .select('name, url, path')
        .eq('user_id', user.id);

      // Build mapping by exact path and by filename
      const mediaByExactPath = new Map<string, string>();
      const mediaByName = new Map<string, string>();
      interface MediaRow { name: string; url: string; path: string; }
      
      ((allMedia as MediaRow[]) || []).forEach((m) => {
        const lowerName = m.name.toLowerCase();
        mediaByName.set(lowerName, m.url); // Fallback by name
        
        // Exact path map
        if (m.path) {
          mediaByExactPath.set(`${m.path}/${lowerName}`.toLowerCase(), m.url);
        }
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
            const parts = copy.media_path.split('/');
            const rawFileName = parts.pop() || '';
            const fileName = rawFileName.toLowerCase();
            const hasFolder = parts.length > 0;
            
            if (hasFolder) {
              let expectedPath = parts.join('/');
              if (!expectedPath.startsWith('root')) {
                expectedPath = `root/${expectedPath}`;
              }
              const exactKey = `${expectedPath}/${fileName}`.toLowerCase();
              imageUrl = mediaByExactPath.get(exactKey) || mediaByName.get(fileName) || '';
            } else {
              imageUrl = mediaByName.get(fileName) || '';
            }
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

        // Add Facebook posts
        if (platform === 'facebook' || platform === 'both') {
          fbDestinations.forEach(pageId => {
            postsToInsert.push({ ...base, platform: 'facebook', facebook_page_id: pageId, instagram_account_id: null });
            addedAny = true;
          });
        }

        // Add Instagram posts
        if (platform === 'instagram' || platform === 'both') {
          igDestinations.forEach(igId => {
            postsToInsert.push({ ...base, platform: 'instagram', facebook_page_id: null, instagram_account_id: igId });
            addedAny = true;
          });
        }

        // Fallback: if platform context didn't match any selection but we have FB selections, default to first FB selection
        if (!addedAny && fbDestinations.length > 0) {
          postsToInsert.push({ ...base, platform: 'facebook', facebook_page_id: fbDestinations[0], instagram_account_id: null });
        }
      }

      if (postsToInsert.length === 0) {
        alert('No hay cuentas conectadas para publicar. Conecta Facebook o Instagram en Configuración.');
        return;
      }

      const { error } = await supabase.from('posts').insert(postsToInsert);
      if (error) throw error;

      const newStatuses = new Map(copyStatuses);
      unsentCopies.forEach((c: Copy) => newStatuses.set(c.id, 'active'));
      setCopyStatuses(newStatuses);
      setSendAllResult({ sent: unsentCopies.length, skipped: copies.length - unsentCopies.length });
    } catch (error: any) {
      alert('Error al enviar: ' + error.message);
    } finally {
      setSendingAll(false);
    }
  };

  const unsentCount = copies.filter((c: Copy) => !copyStatuses.has(c.id)).length;

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
              onClick={() => setIsSendAllModalOpen(true)}
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

      {/* Send All Destinations Modal */}
      <AnimatePresence>
        {isSendAllModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSendAllModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-[3rem] shadow-2xl overflow-hidden"
            >
              <div className="p-8 sm:p-12 space-y-8">
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <h3 className="text-3xl font-black text-slate-900 font-headline">Destinos de Envío</h3>
                    <p className="text-slate-500 font-medium text-sm">¿A qué cuentas quieres enviar los {unsentCount} copys?</p>
                  </div>
                  <button 
                    onClick={() => setIsSendAllModalOpen(false)}
                    className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                  >
                    <span className="material-symbols-outlined text-slate-400">close</span>
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {availablePages.map(p => (
                      <label key={`fb:${p.id}`} className={`flex items-center gap-3 p-4 bg-white border rounded-2xl cursor-pointer hover:border-blue-300 transition-all ${selectedDestinations.includes(`fb:${p.id}`) ? 'border-blue-400 bg-blue-50/10 shadow-sm' : 'border-slate-100'}`}>
                        <input 
                          type="checkbox" 
                          checked={selectedDestinations.includes(`fb:${p.id}`)}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedDestinations([...selectedDestinations, `fb:${p.id}`]);
                            else setSelectedDestinations(selectedDestinations.filter(id => id !== `fb:${p.id}`));
                          }}
                          className="w-5 h-5 rounded-lg text-blue-600 focus:ring-blue-500 border-slate-300"
                        />
                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-1.5 font-black text-slate-900 text-sm truncate">
                            <span className="material-symbols-outlined text-[18px] text-blue-500 shrink-0">thumb_up</span>
                            <span className="truncate">{p.page_name}</span>
                          </div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Facebook Page</span>
                        </div>
                      </label>
                    ))}
                    {availableIgAccounts.map(ig => (
                      <label key={`ig:${ig.id}`} className={`flex items-center gap-3 p-4 bg-white border rounded-2xl cursor-pointer hover:border-rose-300 transition-all ${selectedDestinations.includes(`ig:${ig.id}`) ? 'border-rose-400 bg-rose-50/10 shadow-sm' : 'border-slate-100'}`}>
                        <input 
                          type="checkbox" 
                          checked={selectedDestinations.includes(`ig:${ig.id}`)}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedDestinations([...selectedDestinations, `ig:${ig.id}`]);
                            else setSelectedDestinations(selectedDestinations.filter(id => id !== `ig:${ig.id}`));
                          }}
                          className="w-5 h-5 rounded-lg text-rose-500 focus:ring-rose-500 border-slate-300"
                        />
                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-1.5 font-black text-slate-900 text-sm truncate">
                            <span className="material-symbols-outlined text-[18px] text-rose-500 shrink-0">photo_camera</span>
                            <span className="truncate">@{ig.username}</span>
                          </div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Instagram Account</span>
                        </div>
                      </label>
                    ))}
                  </div>
                  
                  {availablePages.length === 0 && availableIgAccounts.length === 0 && (
                    <div className="p-8 text-center bg-rose-50/50 rounded-3xl border border-rose-100">
                      <p className="text-sm font-bold text-rose-500">No hay cuentas conectadas disponibles.</p>
                      <p className="text-xs text-rose-400 mt-1">Conecta una cuenta en Configuración primero.</p>
                    </div>
                  )}
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    onClick={() => setIsSendAllModalOpen(false)}
                    className="flex-1 px-8 py-5 text-slate-500 font-black text-sm uppercase tracking-[0.2em] hover:text-slate-700 transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSendAll}
                    disabled={selectedDestinations.length === 0}
                    className="flex-1 px-8 py-5 bg-slate-900 text-white font-black text-sm uppercase tracking-[0.2em] rounded-3xl hover:bg-indigo-600 transition-all shadow-xl shadow-indigo-600/20 active:scale-95 disabled:opacity-50 disabled:grayscale disabled:scale-100"
                  >
                    Confirmar Envío
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
            return (
              <div key={copy.id} className={`bg-white p-8 rounded-[2.5rem] shadow-sm border flex flex-col justify-between hover:shadow-xl hover:translate-y-[-4px] transition-all duration-300 group relative overflow-hidden ${copyStatuses.get(copy.id) === 'active' ? 'border-amber-100' : copyStatuses.get(copy.id) === 'published' ? 'border-emerald-100' : 'border-slate-100'}`}>
                {/* Status Badges */}
                <div className="absolute top-4 left-4 flex flex-col gap-1 z-20">
                  {copyStatuses.get(copy.id) === 'active' && (
                    <div className="flex items-center gap-1 px-2 py-1 bg-amber-50 border border-amber-200 rounded-full">
                      <span className="material-symbols-outlined text-[12px] text-amber-500">pending_actions</span>
                      <span className="text-[9px] font-black text-amber-600 uppercase tracking-wider">Programado</span>
                    </div>
                  )}
                  {copyStatuses.get(copy.id) === 'published' && (
                    <div className="flex items-center gap-1 px-2 py-1 bg-emerald-50 border border-emerald-200 rounded-full">
                      <span className="material-symbols-outlined text-[12px] text-emerald-500">check_circle</span>
                      <span className="text-[9px] font-black text-emerald-600 uppercase tracking-wider">Publicado</span>
                    </div>
                  )}
                </div>

                <div className="space-y-4 relative z-10">
                  <div className="flex justify-between items-start">
                    <h4 className={`font-black text-xl text-slate-900 font-headline leading-tight truncate ${copyStatuses.has(copy.id) ? 'pr-4 mt-6' : 'pr-12'}`}>{copy.name}</h4>
                    {/* Card hover actions */}
                    <div className="absolute top-0 right-0 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {copyStatuses.get(copy.id) !== 'active' && (
                        <button 
                          onClick={() => setScheduleFromCopy(copy)}
                          className={`p-2 transition-colors ${copyStatuses.get(copy.id) === 'published' ? 'text-emerald-500 hover:text-emerald-600' : 'text-slate-400 hover:text-amber-500'}`}
                          title={copyStatuses.get(copy.id) === 'published' ? "Reprogramar copy" : "Enviar a programados"}
                        >
                          <span className="material-symbols-outlined text-[20px]">
                            {copyStatuses.get(copy.id) === 'published' ? 'event_repeat' : 'schedule_send'}
                          </span>
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
                  {copyStatuses.get(copy.id) !== 'active' && (
                    <button
                      onClick={() => setScheduleFromCopy(copy)}
                      className={`flex items-center gap-1 text-[10px] font-black uppercase tracking-wider transition-colors opacity-0 group-hover:opacity-100 ${
                        copyStatuses.get(copy.id) === 'published' ? 'text-emerald-500 hover:text-emerald-600' : 'text-amber-500 hover:text-amber-600'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[14px]">
                        {copyStatuses.get(copy.id) === 'published' ? 'event_repeat' : 'schedule_send'}
                      </span>
                      {copyStatuses.get(copy.id) === 'published' ? 'Reprogramar' : 'Programar'}
                    </button>
                  )}
                </div>

                {/* Decorative gradient corner */}
                <div className={`absolute -bottom-10 -right-10 w-24 h-24 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity ${copyStatuses.get(copy.id) === 'published' ? 'bg-emerald-50' : 'bg-indigo-50'}`}></div>
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
