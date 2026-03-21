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

  const fetchCopies = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('copies')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setCopies(data || []);
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
                              <span className={`w-2 h-2 rounded-full ${
                                 copy.status === 'active' ? 'bg-emerald-500' : 
                                 copy.status === 'published' ? 'bg-primary' : 'bg-slate-300'
                              }`} />
                              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{copy.category}</span>
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


