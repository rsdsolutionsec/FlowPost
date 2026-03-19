import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import CreateCopyModal from '../components/CreateCopyModal';
import ImportCopyModal from '../components/ImportCopyModal';

interface Copy {
  id: string;
  name: string;
  content: string;
  suggested_at?: string;
  media_path?: string;
  created_at: string;
}

export default function CopyLibrary() {
  const { user } = useAuth();
  const [copies, setCopies] = useState<Copy[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingCopy, setEditingCopy] = useState<Copy | null>(null);

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

  useEffect(() => {
    fetchCopies();
  }, [user]);

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este copy?')) return;

    try {
      const { error } = await supabase.from('copies').delete().eq('id', id);
      if (error) throw error;
      setCopies(copies.filter(c => c.id !== id));
    } catch (error: any) {
      alert('Error al eliminar: ' + error.message);
    }
  };

  const handleEdit = (copy: Copy) => {
    setEditingCopy(copy);
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
        <div className="space-y-2">
          <h2 className="text-4xl font-black tracking-tight text-slate-900 font-headline">Librería de Copys</h2>
          <p className="text-slate-500 font-medium">Gestiona tus mejores descripciones y reutilízalas en un clic.</p>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={() => setIsImportModalOpen(true)}
            className="px-8 py-4 bg-white text-slate-900 font-black rounded-2xl hover:bg-slate-50 transition-all flex items-center gap-2 border border-slate-200 active:scale-95 translate-y-[-2px]"
          >
            <span className="material-symbols-outlined text-[18px]">upload_file</span>
            <span className="text-sm uppercase tracking-widest font-bold">Importar</span>
          </button>
          <button 
            onClick={() => {
              setEditingCopy(null);
              setIsModalOpen(true);
            }}
            className="px-8 py-4 bg-slate-900 text-white font-black rounded-2xl hover:bg-indigo-600 transition-all flex items-center gap-2 shadow-xl shadow-slate-900/10 active:scale-95 translate-y-[-2px]"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            <span className="text-sm uppercase tracking-widest font-bold">Nuevo Copy</span>
          </button>
        </div>
      </div>

      <CreateCopyModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={fetchCopies}
        editingCopy={editingCopy}
      />

      <ImportCopyModal 
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={fetchCopies}
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
          {copies.map((copy) => (
            <div key={copy.id} className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col justify-between hover:shadow-xl hover:translate-y-[-4px] transition-all duration-300 group relative overflow-hidden">
              <div className="space-y-4 relative z-10">
                <div className="flex justify-between items-start">
                  <h4 className="font-black text-xl text-slate-900 font-headline leading-tight truncate pr-12">{copy.name}</h4>
                  <div className="absolute top-0 right-0 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => handleEdit(copy)}
                      className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[20px]">edit</span>
                    </button>
                    <button 
                      onClick={() => handleDelete(copy.id)}
                      className="p-2 text-slate-400 hover:text-rose-600 transition-colors"
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
                <span className="material-symbols-outlined text-4xl text-slate-50 opacity-0 group-hover:opacity-100 group-hover:translate-x-4 transition-all duration-500">
                  auto_fix_high
                </span>
              </div>

              {/* Decorative gradient corner */}
              <div className="absolute -bottom-10 -right-10 w-24 h-24 bg-indigo-50 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
