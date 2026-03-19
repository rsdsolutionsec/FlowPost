import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
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
  const [formData, setFormData] = useState({
    name: '',
    content: ''
  });

  useEffect(() => {
    if (editCopy) {
      setFormData({
        name: editCopy.name,
        content: editCopy.content
      });
    } else {
      setFormData({ name: '', content: '' });
    }
  }, [editCopy, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      if (editCopy) {
        const { error } = await supabase
          .from('copies')
          .update({
            name: formData.name,
            content: formData.content
          })
          .eq('id', editCopy.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('copies')
          .insert([{
            user_id: user.id,
            name: formData.name,
            content: formData.content
          }]);
        if (error) throw error;
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      alert('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl overflow-hidden"
          >
            <div className="p-8">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-black text-slate-900 font-headline">
                  {editCopy ? 'Editar Copy' : 'Nuevo Copy Reusable'}
                </h3>
                <button onClick={onClose} className="w-10 h-10 rounded-full hover:bg-slate-100 flex items-center justify-center transition-colors">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Nombre de referencia</label>
                  <input
                    required
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full p-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-primary/20 text-slate-900 text-sm font-bold"
                    placeholder="Ej: Promo Verano - Captions"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Contenido del Caption</label>
                  <textarea
                    required
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    className="w-full p-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-primary/20 min-h-[150px] text-slate-900 text-sm font-medium leading-relaxed"
                    placeholder="Escribe aqu tu plantilla..."
                  />
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-4 bg-indigo-600 text-white font-black text-sm uppercase tracking-widest rounded-2xl hover:translate-y-[-2px] hover:shadow-lg transition-all disabled:opacity-50"
                  >
                    {loading ? 'Guardando...' : (editCopy ? 'Actualizar' : 'Guardar en Librera')}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
