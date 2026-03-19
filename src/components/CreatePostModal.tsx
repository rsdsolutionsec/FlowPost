import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreatePostModal({ isOpen, onClose, onSuccess }: CreatePostModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>('');
  const [caption, setCaption] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [platform, setPlatform] = useState('facebook');
  
  // New: Copy Management
  const [copies, setCopies] = useState<any[]>([]);
  const [selectedCopyId, setSelectedCopyId] = useState<string>('');
  const [useCustomCaption, setUseCustomCaption] = useState(true);

  useEffect(() => {
    if (isOpen && user) {
      fetchCopies();
      const now = new Date();
      now.setMinutes(now.getMinutes() + 30);
      setScheduledAt(now.toISOString().slice(0, 16));
    }
  }, [isOpen, user]);

  const fetchCopies = async () => {
    const { data } = await supabase
      .from('copies')
      .select('id, name, content')
      .eq('user_id', user?.id)
      .order('name');
    setCopies(data || []);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImage(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !image || (!useCustomCaption && !selectedCopyId)) return;

    setLoading(true);
    try {
      // 1. Subir Imagen
      const fileExt = image.name.split('.').pop();
      const fileName = `${user.id}/${Math.random()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('posts')
        .upload(fileName, image);

      if (uploadError) throw uploadError;

      // 2. Crear Post en DB
      const { error: dbError } = await supabase.from('posts').insert([
        {
          user_id: user.id,
          image_path: fileName,
          custom_caption: useCustomCaption ? caption : null,
          copy_id: useCustomCaption ? null : selectedCopyId,
          scheduled_at: new Date(scheduledAt).toISOString(),
          status: 'scheduled',
          platform
        }
      ]);

      if (dbError) throw dbError;

      onSuccess();
      onClose();
      resetForm();
    } catch (error: any) {
      alert('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setImage(null);
    setPreview('');
    setCaption('');
    setUseCustomCaption(true);
    setSelectedCopyId('');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-4xl bg-white rounded-[2.5rem] overflow-hidden shadow-2xl flex h-[80vh]"
          >
            {/* Left: Preview & Upload */}
            <div className={`w-1/2 bg-slate-50 relative flex flex-col items-center justify-center p-10 border-r border-slate-100`}>
              {preview ? (
                <div className="w-full h-full rounded-2xl overflow-hidden shadow-lg bg-white p-2">
                  <img src={preview} alt="Preview" className="w-full h-full object-cover rounded-xl" />
                  <button onClick={() => {setImage(null); setPreview('');}} className="absolute top-12 right-12 w-10 h-10 bg-white/90 backdrop-blur rounded-full shadow-lg flex items-center justify-center text-rose-500 hover:bg-white transition-all">
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </div>
              ) : (
                <label className="w-full h-full border-4 border-dashed border-slate-200 rounded-[2rem] flex flex-col items-center justify-center cursor-pointer hover:border-primary/30 hover:bg-slate-100/50 transition-all group">
                  <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                  <div className="w-20 h-20 bg-white rounded-3xl shadow-sm flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <span className="material-symbols-outlined text-4xl text-slate-300">add_photo_alternate</span>
                  </div>
                  <p className="font-black text-slate-400 uppercase tracking-widest text-xs">Subir Imagen</p>
                </label>
              )}
            </div>

            {/* Right: Details */}
            <div className="w-1/2 p-10 flex flex-col">
              <div className="mb-8">
                 <h2 className="text-2xl font-black text-slate-900 font-headline">Nueva Publicación</h2>
                 <p className="text-slate-400 text-sm font-medium">Configura los detalles de tu post.</p>
              </div>

              <form onSubmit={handleSubmit} className="flex-1 flex flex-col gap-6 overflow-y-auto pr-2 custom-scrollbar">
                
                {/* Platform Toggle */}
                <div className="flex gap-2">
                  <button type="button" onClick={() => setPlatform('facebook')} className={`flex-1 py-3 rounded-2xl flex items-center justify-center gap-2 border-2 transition-all font-black text-xs uppercase tracking-widest ${platform === 'facebook' ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200' : 'border-slate-100 text-slate-400'}`}>
                    <span className="material-symbols-outlined text-[18px]">thumb_up</span>
                    Facebook
                  </button>
                  <button type="button" onClick={() => setPlatform('instagram')} className={`flex-1 py-3 rounded-2xl flex items-center justify-center gap-2 border-2 transition-all font-black text-xs uppercase tracking-widest ${platform === 'instagram' ? 'bg-gradient-to-tr from-amber-400 via-rose-500 to-purple-600 border-rose-500 text-white shadow-lg shadow-rose-200' : 'border-slate-100 text-slate-400'}`}>
                    <span className="material-symbols-outlined text-[18px]">photo_camera</span>
                    Instagram
                  </button>
                </div>

                {/* Caption Selection */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Contenido del Post</label>
                    <button type="button" onClick={() => setUseCustomCaption(!useCustomCaption)} className="text-[10px] font-black uppercase text-primary hover:underline">
                      {useCustomCaption ? 'Usar Copy Guardado' : 'Escribir Manualmente'}
                    </button>
                  </div>
                  
                  {useCustomCaption ? (
                    <textarea 
                      required value={caption} onChange={(e) => setCaption(e.target.value)}
                      placeholder="Escribe algo increíble..." 
                      className="w-full p-5 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-primary/20 min-h-[120px] text-sm resize-none font-medium"
                    />
                  ) : (
                    <div className="space-y-4">
                      <select 
                        required value={selectedCopyId} onChange={(e) => setSelectedCopyId(e.target.value)}
                        className="w-full p-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-primary/20 text-sm font-black"
                      >
                        <option value="">Selecciona un copy...</option>
                        {copies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                      {selectedCopyId && (
                        <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-100/50">
                          <p className="text-xs text-indigo-900 line-clamp-3 italic opacity-70">
                            "{copies.find(c => c.id === selectedCopyId)?.content}"
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Schedule */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 px-1 tracking-widest">Programar Para</label>
                  <input 
                    required type="datetime-local" 
                    value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)}
                    className="w-full p-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-primary/20 text-sm font-black"
                  />
                </div>

                <div className="mt-auto pt-6 flex gap-3">
                  <button type="button" onClick={onClose} className="px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest text-slate-400 hover:bg-slate-50 transition-colors">Cancelar</button>
                  <button type="submit" disabled={loading} className="flex-1 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 disabled:opacity-50 flex items-center justify-center gap-2">
                    {loading ? 'Programando...' : (
                      <>
                        <span className="material-symbols-outlined text-[18px]">calendar_today</span>
                        Programar Post
                      </>
                    )}
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
