import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface CreateCopyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editCopy?: any;
}

export default function CreateCopyModal({ isOpen, onClose, onSuccess, editCopy }: CreateCopyModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [content, setContent] = useState('');

  useEffect(() => {
    if (editCopy) {
      setName(editCopy.name);
      setContent(editCopy.content);
    } else {
      setName('');
      setContent('');
    }
  }, [editCopy, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !name || !content) return;

    setLoading(true);
    try {
      if (editCopy) {
        const { error } = await supabase
          .from('copies')
          .update({ name, content })
          .eq('id', editCopy.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('copies').insert([
          { user_id: user.id, name, content }
        ]);
        if (error) throw error;
      }

      onSuccess();
      onClose();
      setName('');
      setContent('');
    } catch (error: any) {
      alert('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-lg bg-white rounded-[2.5rem] p-10 shadow-2xl"
          >
            <div className="mb-8">
              <h2 className="text-2xl font-black text-slate-900 font-headline">
                {editCopy ? 'Editar Copy' : 'Nuevo Copy Maestro'}
              </h2>
              <p className="text-slate-400 text-sm font-medium">Reutiliza este contenido en múltiples posts.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 px-1 tracking-widest">Nombre de la Plantilla</label>
                <input 
                  required type="text" value={name} onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: Promo Verano 2024" 
                  className="w-full p-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-primary/20 text-sm font-black"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 px-1 tracking-widest">Contenido (Caption)</label>
                <textarea 
                  required value={content} onChange={(e) => setContent(e.target.value)}
                  placeholder="Escribe el texto de tu post aquí..." 
                  className="w-full p-5 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-primary/20 min-h-[150px] text-sm resize-none font-medium"
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={onClose} className="px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest text-slate-400 hover:bg-slate-50 transition-colors">Cancelar</button>
                <button type="submit" disabled={loading} className="flex-1 bg-primary text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-primary/90 transition-all shadow-xl shadow-primary/20 disabled:opacity-50">
                  {loading ? 'Guardando...' : (editCopy ? 'Actualizar' : 'Guardar Copy')}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
