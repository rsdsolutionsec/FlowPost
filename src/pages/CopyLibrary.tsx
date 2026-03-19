import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import CreateCopyModal from '../components/CreateCopyModal';

interface Copy {
  id: string;
  name: string;
  content: string;
  created_at: string;
}

export default function CopyLibrary() {
  const { user } = useAuth();
  const [copies, setCopies] = useState<Copy[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCopy, setEditingCopy] = useState<Copy | null>(null);

  useEffect(() => {
    if (user) fetchCopies();
  }, [user]);

  const fetchCopies = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('copies')
      .select('*')
      .eq('user_id', user?.id)
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      setCopies(data);
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Ests seguro de que quieres eliminar este copy?')) return;
    const { error } = await supabase.from('copies').delete().eq('id', id);
    if (!error) {
      setCopies(copies.filter(c => c.id !== id));
    }
  };

  const handleEdit = (copy: Copy) => {
    setEditingCopy(copy);
    setIsModalOpen(true);
  };

  const openCreateModal = () => {
    setEditingCopy(null);
    setIsModalOpen(true);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="space-y-12"
    >
      <header className="flex justify-between items-end">
        <div className="space-y-2">
          <h2 className="text-4xl font-black text-slate-900 font-headline">Librera de Copys</h2>
          <p className="text-slate-500 text-lg font-medium">Guarda y organiza tus captions para usarlos en cualquier post.</p>
        </div>
        <button 
          onClick={openCreateModal}
          className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 transition-transform shadow-xl shadow-indigo-600/20"
        >
          Crear Nuevo Copy
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {loading ? (
          <div className="col-span-full py-20 text-center font-black text-slate-300 uppercase tracking-widest">Cargando librera...</div>
        ) : copies.length === 0 ? (
          <div className="col-span-full py-24 bg-white border-2 border-dashed border-slate-200 rounded-[3rem] text-center space-y-4">
            <span className="material-symbols-outlined text-6xl text-slate-200">content_copy</span>
            <p className="text-slate-400 font-bold">A n no tienes copys guardados.</p>
            <button onClick={openCreateModal} className="text-indigo-600 font-black text-sm uppercase tracking-widest hover:underline">Comienza aqu</button>
          </div>
        ) : (
          copies.map((copy) => (
            <div key={copy.id} className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col h-full group hover:shadow-xl transition-all duration-500">
              <div className="flex justify-between items-start mb-6">
                <div className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                  <span className="material-symbols-outlined">notes</span>
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => handleEdit(copy)} className="w-10 h-10 rounded-xl bg-slate-50 text-slate-500 flex items-center justify-center hover:bg-slate-100 transition-colors">
                    <span className="material-symbols-outlined text-lg">edit</span>
                  </button>
                  <button onClick={() => handleDelete(copy.id)} className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center hover:bg-rose-100 transition-colors">
                    <span className="material-symbols-outlined text-lg">delete</span>
                  </button>
                </div>
              </div>

              <div className="flex-1">
                <h4 className="text-xl font-black text-slate-900 font-headline mb-3 truncate">{copy.name}</h4>
                <p className="text-slate-500 text-sm font-medium line-clamp-4 leading-relaxed italic">
                  "{copy.content}"
                </p>
              </div>

              <div className="mt-8 pt-6 border-t border-slate-50 flex justify-between items-center">
                <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                  {new Date(copy.created_at).toLocaleDateString()}
                </span>
                <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 px-3 py-1 rounded-full">Template</span>
              </div>
            </div>
          ))
        )}
      </div>

      <CreateCopyModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={fetchCopies}
        editCopy={editingCopy}
      />
    </motion.div>
  );
}
