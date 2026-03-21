import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import CreatePostModal from '../components/CreatePostModal';
import ImportCopyModal from '../components/ImportCopyModal';

interface Copy {
  id: string;
  name: string;
  content: string;
  category: string;
  status: 'draft' | 'active' | 'published';
  created_at: string;
  campaign_id: string;
  last_used_at?: string;
  suggested_at?: string;
  media_path?: string;
  platform?: string;
}

interface Campaign {
  id: string;
  name: string;
}

export default function CopyLibrary() {
  const { user } = useAuth();
  const [copies, setCopies] = useState<Copy[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedCopy, setSelectedCopy] = useState<Copy | null>(null);
  
  // Filtering
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  
  // Bulk delete
  const [selectedForDelete, setSelectedForDelete] = useState<Set<string>>(new Set());

  // Send All
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
      setCopies(copiesRes.data || []);

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

  const fetchCampaigns = async () => {
    if (!user) return;
    const { data } = await supabase.from('campaigns').select('id, name').eq('user_id', user.id);
    setCampaigns(data || []);
  };

  useEffect(() => {
    fetchCopies();
    fetchCampaigns();
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
    if (!confirm('¿Estás seguro de eliminar este copy?')) return;
    try {
      const { error } = await supabase.from('copies').delete().eq('id', id);
      if (error) throw error;
      setCopies(copies.filter(c => c.id !== id));
    } catch (error: any) {
      alert('Error: ' + error.message);
    }
  };

  const toggleSelectCopy = (id: string) => {
    const newSelected = new Set(selectedForDelete);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedForDelete(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedForDelete.size === filteredCopies.length) {
      setSelectedForDelete(new Set());
    } else {
      setSelectedForDelete(new Set(filteredCopies.map(c => c.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedForDelete.size === 0) return;
    
    const count = selectedForDelete.size;
    if (!confirm(`¿Estás seguro de eliminar ${count} copy${count > 1 ? 's' : ''}? Esta acción no se puede deshacer.`)) return;
    
    try {
      const idsArray = Array.from(selectedForDelete);
      const { error } = await supabase.from('copies').delete().in('id', idsArray);
      if (error) throw error;
      
      setCopies(copies.filter(c => !selectedForDelete.has(c.id)));
      setSelectedForDelete(new Set());
    } catch (error: any) {
      alert('Error al eliminar: ' + error.message);
    }
  };

  const handleSendAll = async () => {
    if (!user) return;
    const unsentCopies = copies.filter(c => !copyStatuses.has(c.id));
    if (unsentCopies.length === 0) {
      alert('Todos los copys ya han sido enviados a programados.');
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
      const fbDestinations = selectedDestinations.filter(d => d.startsWith('fb:')).map(d => d.split(':')[1]);
      const igDestinations = selectedDestinations.filter(d => d.startsWith('ig:')).map(d => d.split(':')[1]);

      // Pre-fetch all media to resolve filenames
      const { data: allMedia } = await supabase
        .from('media')
        .select('name, url, path')
        .eq('user_id', user.id);

      const mediaByExactPath = new Map<string, string>();
      const mediaByName = new Map<string, string>();
      interface MediaRow { name: string; url: string; path: string; }

      ((allMedia as MediaRow[]) || []).forEach((m) => {
        const lowerName = m.name.toLowerCase();
        mediaByName.set(lowerName, m.url);
        if (m.path) {
          mediaByExactPath.set(`${m.path}/${lowerName}`.toLowerCase(), m.url);
        }
      });

      const postsToInsert: any[] = [];

      for (const copy of unsentCopies) {
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
              if (!expectedPath.startsWith('root')) expectedPath = `root/${expectedPath}`;
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
        if (platform === 'facebook' || platform === 'both') {
          fbDestinations.forEach(pageId => {
            postsToInsert.push({ ...base, platform: 'facebook', facebook_page_id: pageId, instagram_account_id: null });
            addedAny = true;
          });
        }
        if (platform === 'instagram' || platform === 'both') {
          igDestinations.forEach(igId => {
            postsToInsert.push({ ...base, platform: 'instagram', facebook_page_id: null, instagram_account_id: igId });
            addedAny = true;
          });
        }
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
      unsentCopies.forEach(c => newStatuses.set(c.id, 'active'));
      setCopyStatuses(newStatuses);
      setSendAllResult({ sent: unsentCopies.length, skipped: copies.length - unsentCopies.length });
    } catch (error: any) {
      alert('Error al enviar: ' + error.message);
    } finally {
      setSendingAll(false);
    }
  };

  const filteredCopies = copies.filter(copy => {
    const matchesSearch = copy.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         copy.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || copy.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const categories = ['all', ...Array.from(new Set(copies.map(c => c.category)))];

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
            <span className="text-primary">Librería de Copys</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-on-surface font-headline leading-tight">
            Copy Library
          </h2>
          <p className="text-slate-500 mt-2 font-medium text-sm sm:text-base">Tu repositorio central de textos persuasivos y creativos.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          {copies.filter(c => !copyStatuses.has(c.id)).length > 0 && (
            <button
              onClick={() => setIsSendAllModalOpen(true)}
              disabled={sendingAll}
              className="px-6 py-3 bg-amber-500 text-white font-bold rounded-2xl hover:bg-amber-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 disabled:opacity-60"
            >
              {sendingAll ? (
                <>
                  <span className="material-symbols-outlined text-[20px] animate-spin">progress_activity</span>
                  <span className="text-sm">Enviando...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[20px]">send</span>
                  <span className="text-sm">Enviar todos</span>
                  <span className="ml-1 bg-white/20 text-white text-xs font-black px-2 py-0.5 rounded-full">
                    {copies.filter(c => !copyStatuses.has(c.id)).length}
                  </span>
                </>
              )}
            </button>
          )}
          <button
            onClick={() => setShowImportModal(true)}
            className="px-6 py-3 bg-white text-slate-700 border border-slate-200 font-bold rounded-2xl hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
          >
             <span className="material-symbols-outlined text-[20px]">upload_file</span>
             <span className="text-sm">Importar TXT</span>
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-3 bg-primary text-white font-bold rounded-2xl hover:translate-y-[-1px] transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
          >
            <span className="material-symbols-outlined text-[20px]">add</span>
            <span className="text-sm">Nuevo Copy</span>
          </button>
        </div>
      </div>

      <div className="mb-8 lg:mb-10 flex flex-col sm:flex-row gap-4">
         <div className="relative flex-1">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400">search</span>
            <input 
              type="text"
              placeholder="Buscar copys por nombre o contenido..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-6 py-4 bg-white border border-slate-100 rounded-2xl sm:rounded-3xl shadow-sm focus:ring-2 focus:ring-primary/10 transition-all text-sm font-medium"
            />
         </div>
         <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 sm:pb-0">
           {categories.map(cat => (
             <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-6 py-4 rounded-2xl sm:rounded-3xl text-[10px] sm:text-xs font-black uppercase tracking-widest whitespace-nowrap transition-all ${
                categoryFilter === cat 
                  ? 'bg-slate-900 text-white shadow-lg' 
                  : 'bg-white text-slate-500 border border-slate-100 hover:bg-slate-50'
              }`}
             >
               {cat}
             </button>
           ))}
         </div>
      </div>

      {/* Bulk Delete Toolbar */}
      {selectedForDelete.size > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="mb-6 p-4 bg-rose-50 border-2 border-rose-200 rounded-2xl flex items-center justify-between"
        >
          <div className="flex items-center gap-4">
            <span className="text-sm font-black text-rose-700">
              {selectedForDelete.size} copy{selectedForDelete.size > 1 ? 's' : ''} seleccionado{selectedForDelete.size > 1 ? 's' : ''}
            </span>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setSelectedForDelete(new Set())}
              className="px-4 py-2 bg-white text-slate-700 border border-rose-200 font-bold rounded-xl hover:bg-slate-50 transition-all text-sm"
            >
              Cancelar
            </button>
            <button
              onClick={handleBulkDelete}
              className="px-4 py-2 bg-rose-600 text-white font-bold rounded-xl hover:bg-rose-700 transition-all text-sm flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">delete</span>
              <span>Eliminar</span>
            </button>
          </div>
        </motion.div>
      )}

      {loading ? (
        <div className="py-20 flex justify-center">
           <div className="w-10 h-10 border-4 border-primary/10 border-t-primary rounded-full animate-spin" />
        </div>
      ) : filteredCopies.length === 0 ? (
        <div className="bg-white rounded-[2.5rem] p-12 sm:p-20 text-center border border-slate-100 shadow-sm">
           <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <span className="material-symbols-outlined text-4xl text-slate-300">description</span>
           </div>
           <h3 className="text-lg font-bold text-slate-900 mb-2">No se encontraron copys</h3>
           <p className="text-slate-500 text-sm max-w-xs mx-auto mb-8">Empieza creando uno nuevo o subiendo un archivo de texto con varios copys.</p>
           <button 
             onClick={() => setShowCreateModal(true)}
             className="px-8 py-3 bg-slate-900 text-white font-bold rounded-2xl hover:bg-slate-800 transition-all"
           >
             Crear mi primer copy
           </button>
        </div>
      ) : (
        <>
          {/* Select All Button */}
          <div className="mb-6 flex items-center gap-3">
            <label className="flex items-center gap-3 px-4 py-3 bg-slate-100 rounded-2xl cursor-pointer hover:bg-slate-200 transition-all">
              <input 
                type="checkbox"
                checked={selectedForDelete.size > 0 && selectedForDelete.size === filteredCopies.length}
                onChange={toggleSelectAll}
                className="w-5 h-5 rounded text-slate-900 cursor-pointer"
              />
              <span className="text-sm font-bold text-slate-700">
                Seleccionar todos ({filteredCopies.length})
              </span>
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
             {filteredCopies.map((copy) => (
               <motion.div 
                 layout
                 key={copy.id}
                 className={`group bg-white rounded-[2rem] sm:rounded-[2.5rem] border-2 shadow-sm hover:shadow-xl transition-all overflow-hidden flex flex-col cursor-pointer ${
                   selectedForDelete.has(copy.id)
                     ? 'border-slate-900 bg-slate-50'
                     : 'border-slate-100 hover:border-primary/10'
                 }`}
                 onClick={() => toggleSelectCopy(copy.id)}
               >
                  <div className="p-6 sm:p-8 flex-1">
                    <div className="flex items-start justify-between mb-6">
                      <div className="flex-1">
                        {/* Checkbox */}
                        <div className="flex items-center gap-3 mb-4">
                          <input 
                            type="checkbox"
                            checked={selectedForDelete.has(copy.id)}
                            onChange={() => {}}
                            onClick={(e) => e.stopPropagation()}
                            className="w-5 h-5 rounded text-slate-900 cursor-pointer"
                          />
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              {copyStatuses.get(copy.id) === 'active' ? (
                                <div className="flex items-center gap-1 px-2 py-0.5 bg-amber-50 border border-amber-200 rounded-full">
                                  <span className="material-symbols-outlined text-[10px] text-amber-500">pending_actions</span>
                                  <span className="text-[9px] font-black text-amber-600 uppercase tracking-wider">Programado</span>
                                </div>
                              ) : copyStatuses.get(copy.id) === 'published' ? (
                                <div className="flex items-center gap-1 px-2 py-0.5 bg-emerald-50 border border-emerald-200 rounded-full">
                                  <span className="material-symbols-outlined text-[10px] text-emerald-500">check_circle</span>
                                  <span className="text-[9px] font-black text-emerald-600 uppercase tracking-wider">Publicado</span>
                                </div>
                              ) : (
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{copy.category}</span>
                              )}
                            </div>
                            <h4 className="font-bold text-slate-900 line-clamp-1 group-hover:text-primary transition-colors">{copy.name}</h4>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                         <button 
                          onClick={(e) => { 
                            e.stopPropagation();
                            setSelectedCopy(copy); 
                            setShowCreateModal(true); 
                          }}
                          className="p-2 hover:bg-slate-50 rounded-xl text-slate-400 hover:text-primary transition-all"
                         >
                           <span className="material-symbols-outlined text-[18px]">edit</span>
                         </button>
                         <button 
                           onClick={(e) => {
                             e.stopPropagation();
                             handleDelete(copy.id);
                           }}
                           className="p-2 hover:bg-rose-50 rounded-xl text-slate-400 hover:text-rose-500 transition-all"
                         >
                           <span className="material-symbols-outlined text-[18px]">delete</span>
                         </button>
                      </div>
                    </div>
                    
                    <div className="relative">
                      <p className="text-slate-600 text-sm leading-relaxed line-clamp-4 font-medium italic">
                        "{copy.content}"
                      </p>
                      <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-white to-transparent" />
                    </div>
                  </div>

                  <div className="px-6 sm:px-8 py-5 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between mt-auto">
                     <div className="flex items-center gap-2 text-slate-400">
                        <span className="material-symbols-outlined text-[16px]">history</span>
                        <span className="text-[10px] font-bold">
                          {copy.last_used_at ? `Usado ${new Date(copy.last_used_at).toLocaleDateString()}` : 'Nunca usado'}
                        </span>
                     </div>
                     <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedCopy(copy); 
                        setShowScheduleModal(true);
                      }}
                      className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary hover:gap-3 transition-all"
                     >
                       Programar
                       <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                     </button>
                  </div>
               </motion.div>
             ))}
          </div>
        </>
      )}

      {/* Send All Result Toast */}
      <AnimatePresence>
        {sendAllResult && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mb-6 flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl"
          >
            <span className="material-symbols-outlined text-emerald-500">check_circle</span>
            <div>
              <p className="text-sm font-black text-emerald-700">
                ¡{sendAllResult.sent} copy{sendAllResult.sent === 1 ? '' : 's'} enviado{sendAllResult.sent === 1 ? '' : 's'} a Programados!
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
              className="relative w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <div className="p-8 sm:p-10 space-y-8">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <h3 className="text-2xl font-black text-slate-900">Destinos de Envío</h3>
                    <p className="text-slate-500 text-sm">¿A qué cuentas quieres enviar los {copies.filter(c => !copyStatuses.has(c.id)).length} copys no programados?</p>
                  </div>
                  <button onClick={() => setIsSendAllModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                    <span className="material-symbols-outlined text-slate-400">close</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {availablePages.map(p => (
                    <label key={`fb:${p.id}`} className={`flex items-center gap-3 p-4 bg-white border rounded-2xl cursor-pointer hover:border-blue-300 transition-all ${selectedDestinations.includes(`fb:${p.id}`) ? 'border-blue-400 bg-blue-50/30' : 'border-slate-100'}`}>
                      <input
                        type="checkbox"
                        checked={selectedDestinations.includes(`fb:${p.id}`)}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedDestinations([...selectedDestinations, `fb:${p.id}`]);
                          else setSelectedDestinations(selectedDestinations.filter(id => id !== `fb:${p.id}`));
                        }}
                        className="w-5 h-5 rounded text-blue-600"
                      />
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-1.5 font-bold text-slate-900 text-sm truncate">
                          <span className="material-symbols-outlined text-[18px] text-blue-500 shrink-0">thumb_up</span>
                          <span className="truncate">{p.page_name}</span>
                        </div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Facebook Page</span>
                      </div>
                    </label>
                  ))}
                  {availableIgAccounts.map(ig => (
                    <label key={`ig:${ig.id}`} className={`flex items-center gap-3 p-4 bg-white border rounded-2xl cursor-pointer hover:border-rose-300 transition-all ${selectedDestinations.includes(`ig:${ig.id}`) ? 'border-rose-400 bg-rose-50/30' : 'border-slate-100'}`}>
                      <input
                        type="checkbox"
                        checked={selectedDestinations.includes(`ig:${ig.id}`)}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedDestinations([...selectedDestinations, `ig:${ig.id}`]);
                          else setSelectedDestinations(selectedDestinations.filter(id => id !== `ig:${ig.id}`));
                        }}
                        className="w-5 h-5 rounded text-rose-500"
                      />
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-1.5 font-bold text-slate-900 text-sm truncate">
                          <span className="material-symbols-outlined text-[18px] text-rose-500 shrink-0">photo_camera</span>
                          <span className="truncate">@{ig.username}</span>
                        </div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Instagram Account</span>
                      </div>
                    </label>
                  ))}
                  {availablePages.length === 0 && availableIgAccounts.length === 0 && (
                    <div className="col-span-2 p-8 text-center bg-rose-50/50 rounded-3xl border border-rose-100">
                      <p className="text-sm font-bold text-rose-500">No hay cuentas conectadas disponibles.</p>
                      <p className="text-xs text-rose-400 mt-1">Conecta una cuenta en Configuración primero.</p>
                    </div>
                  )}
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setIsSendAllModalOpen(false)}
                    className="flex-1 py-4 bg-slate-100 text-slate-600 font-bold text-sm rounded-2xl hover:bg-slate-200 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSendAll}
                    disabled={selectedDestinations.length === 0}
                    className="flex-1 py-4 bg-slate-900 text-white font-bold text-sm rounded-2xl hover:bg-primary transition-all disabled:opacity-50"
                  >
                    Confirmar Envío
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modals */}
      <CreateCopyModal
        isOpen={showCreateModal}
        onClose={() => { setShowCreateModal(false); setSelectedCopy(null); }}
        onSuccess={() => { fetchCopies(); setShowCreateModal(false); setSelectedCopy(null); }}
        campaigns={campaigns}
        editData={selectedCopy || undefined}
      />

      <ImportCopyModal 
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onSuccess={() => { fetchCopies(); setShowImportModal(false); }}
      />

      <CreatePostModal 
        isOpen={showScheduleModal}
        onClose={() => { setShowScheduleModal(false); setSelectedCopy(null); }}
        onSuccess={() => { fetchCopies(); setShowScheduleModal(false); setSelectedCopy(null); }}
        prefill={selectedCopy ? {
           caption: selectedCopy.content,
           copyId: selectedCopy.id,
           copyName: selectedCopy.name,
           campaignId: selectedCopy.campaign_id
        } : undefined}
      />
    </motion.div>
  );
}

function CreateCopyModal({ isOpen, onClose, onSuccess, campaigns, editData }: any) {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    content: '',
    category: 'General',
    campaign_id: ''
  });

  useEffect(() => {
    if (editData) setFormData({
      name: editData.name,
      content: editData.content,
      category: editData.category,
      campaign_id: editData.campaign_id || ''
    });
    else setFormData({ name: '', content: '', category: 'General', campaign_id: '' });
  }, [editData, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editData) {
        const { error } = await supabase.from('copies')
          .update(formData).eq('id', editData.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('copies')
          .insert([{ ...formData, user_id: user?.id, status: 'draft' }]);
        if (error) throw error;
      }
      onSuccess();
    } catch (error: any) { alert(error.message); }
  };

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={onClose} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl overflow-hidden">
        <div className="p-8 sm:p-10">
          <h3 className="text-2xl font-black text-slate-900 mb-6">{editData ? 'Editar Copy' : 'Nuevo Copy'}</h3>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
               <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nombre del Copy</label>
               <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-primary/20 text-sm font-bold" />
            </div>
            <div className="space-y-2">
               <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Campaña</label>
               <select value={formData.campaign_id} onChange={e => setFormData({...formData, campaign_id: e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-primary/20 text-sm font-bold">
                  <option value="">Ninguna</option>
                  {campaigns.map((c:any) => <option key={c.id} value={c.id}>{c.name}</option>)}
               </select>
            </div>
            <div className="space-y-2">
               <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Contenido</label>
               <textarea required rows={5} value={formData.content} onChange={e => setFormData({...formData, content: e.target.value})} className="w-full p-6 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-primary/20 text-sm font-medium resize-none" />
            </div>
            <button className="w-full py-4 bg-primary text-white font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-primary/20 hover:translate-y-[-1px] transition-all">
               {editData? 'Guardar Cambios' : 'Crear Copy'}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
