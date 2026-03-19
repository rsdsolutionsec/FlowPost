import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreatePostModal({ isOpen, onClose, onSuccess }: CreatePostModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [pages, setPages] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [copies, setCopies] = useState<any[]>([]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [selectedPageId, setSelectedPageId] = useState('');
  const [selectedCampaignId, setSelectedCampaignId] = useState('');
  
  // New States for Reusable Copy Logic
  const [useReusableCopy, setUseReusableCopy] = useState(false);
  const [selectedCopyId, setSelectedCopyId] = useState('');

  const [formData, setFormData] = useState({
    caption: '',
    scheduled_at: '',
    platform: 'facebook' as const
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && user) {
      fetchPages();
      fetchCampaigns();
      fetchCopies();
    }
  }, [isOpen, user]);

  const fetchPages = async () => {
    const { data } = await supabase
      .from('facebook_pages')
      .select('*')
      .eq('user_id', user?.id)
      .eq('is_active', true);
    if (data && data.length > 0) {
      setPages(data);
      setSelectedPageId(data[0].id);
    }
  };

  const fetchCampaigns = async () => {
    const { data } = await supabase
      .from('campaigns')
      .select('*')
      .eq('user_id', user?.id);
    if (data) setCampaigns(data);
  };

  const fetchCopies = async () => {
    const { data } = await supabase
      .from('copies')
      .select('*')
      .eq('user_id', user?.id)
      .order('name');
    if (data) setCopies(data);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImageFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || (!imageFile)) {
      alert('Por favor selecciona una imagen');
      return;
    }

    setLoading(true);
    try {
      // 1. Upload Image to Storage
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('posts')
        .upload(filePath, imageFile);

      if (uploadError) throw uploadError;

      // 2. Create Post in DB
      const { error: postError } = await supabase.from('posts').insert([{
        user_id: user.id,
        page_id: selectedPageId,
        campaign_id: selectedCampaignId || null,
        copy_id: useReusableCopy ? selectedCopyId : null,
        custom_caption: useReusableCopy ? null : formData.caption,
        caption: formData.caption, // Fallback legacy
        image_path: filePath,
        scheduled_at: new Date(formData.scheduled_at).toISOString(),
        platform: formData.platform,
        status: 'scheduled'
      }]);

      if (postError) throw postError;

      onSuccess();
      onClose();
      // Reset form
      setFormData({ caption: '', scheduled_at: '', platform: 'facebook' });
      setImageFile(null);
      setUseReusableCopy(false);
      setSelectedCopyId('');
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
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-xl bg-surface rounded-[3rem] shadow-2xl overflow-hidden border border-white/20"
          >
            <div className="p-10">
              <div className="flex justify-between items-center mb-10">
                <div className="space-y-1">
                  <h3 className="text-3xl font-black text-on-surface font-headline leading-tight">Crear Publicacin</h3>
                  <p className="text-on-surface-variant text-xs font-bold uppercase tracking-widest">Programacin Inteligente</p>
                </div>
                <button 
                  onClick={onClose}
                  className="w-12 h-12 rounded-full bg-surface-container-high text-on-surface hover:bg-surface-container-highest transition-colors flex items-center justify-center"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-8">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Pgina Destino</label>
                    {pages.length > 0 ? (
                      <select
                        required
                        value={selectedPageId}
                        onChange={(e) => setSelectedPageId(e.target.value)}
                        className="w-full p-4 bg-surface-container-low rounded-2xl border-none focus:ring-2 focus:ring-primary/20 text-on-surface text-sm font-bold"
                      >
                        {pages.map(page => (
                          <option key={page.id} value={page.id}>{page.page_name}</option>
                        ))}
                      </select>
                    ) : (
                      <div className="p-4 bg-rose-50 text-rose-600 rounded-2xl text-xs font-bold border border-rose-100 flex items-center gap-2">
                        <span className="material-symbols-outlined text-sm">warning</span>
                        <span>No hay pginas conectadas.</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Campaa (Op)</label>
                    <select
                      value={selectedCampaignId}
                      onChange={(e) => setSelectedCampaignId(e.target.value)}
                      className="w-full p-4 bg-surface-container-low rounded-2xl border-none focus:ring-2 focus:ring-primary/20 text-on-surface text-sm font-bold"
                    >
                      <option value="">Sin Campaa</option>
                      {campaigns.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-3 p-4 bg-slate-50/50 rounded-3xl border border-slate-100">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Contenido del Post</label>
                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] font-black uppercase tracking-widest ${!useReusableCopy ? 'text-primary' : 'text-slate-300'}`}>Manual</span>
                      <button 
                        type="button"
                        onClick={() => setUseReusableCopy(!useReusableCopy)}
                        className={`w-10 h-5 rounded-full transition-colors relative ${useReusableCopy ? 'bg-primary' : 'bg-slate-300'}`}
                      >
                        <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${useReusableCopy ? 'left-6' : 'left-1'}`}></div>
                      </button>
                      <span className={`text-[9px] font-black uppercase tracking-widest ${useReusableCopy ? 'text-primary' : 'text-slate-300'}`}>Reusable</span>
                    </div>
                  </div>

                  {useReusableCopy ? (
                    <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-300">
                      <select
                        required
                        value={selectedCopyId}
                        onChange={(e) => setSelectedCopyId(e.target.value)}
                        className="w-full p-4 bg-white rounded-2xl border-none focus:ring-2 focus:ring-primary/20 text-on-surface text-sm font-bold shadow-sm"
                      >
                        <option value="">Selecciona un copy guardado...</option>
                        {copies.map(copy => (
                          <option key={copy.id} value={copy.id}>{copy.name}</option>
                        ))}
                      </select>
                      {copies.length === 0 && (
                        <p className="text-[9px] text-rose-500 font-bold px-2 italic">No tienes copys guardados an.</p>
                      )}
                    </div>
                  ) : (
                    <textarea
                      required
                      value={formData.caption}
                      onChange={(e) => setFormData({ ...formData, caption: e.target.value })}
                      className="w-full p-4 bg-white rounded-2xl border-none focus:ring-2 focus:ring-primary/20 min-h-[100px] text-on-surface text-sm font-medium shadow-sm leading-relaxed animate-in fade-in slide-in-from-top-1 duration-300"
                      placeholder="Escribe algo increble para tu audiencia..."
                    />
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Imagen (Archivo)</label>
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full p-6 bg-surface-container-low rounded-2xl border-2 border-dashed border-primary/10 hover:border-primary/30 transition-all cursor-pointer flex flex-col items-center justify-center gap-1 group"
                  >
                    <span className="material-symbols-outlined text-3xl text-primary/40 group-hover:scale-110 transition-transform">
                      {imageFile ? 'check_circle' : 'cloud_upload'}
                    </span>
                    <span className="text-on-surface-variant font-black text-[10px] text-center truncate w-full px-4">
                      {imageFile ? imageFile.name : 'Subir Imagen'}
                    </span>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      className="hidden"
                      accept="image/*"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Programar</label>
                    <input
                      type="datetime-local"
                      required
                      value={formData.scheduled_at}
                      onChange={(e) => setFormData({ ...formData, scheduled_at: e.target.value })}
                      className="w-full p-4 bg-surface-container-low rounded-2xl border-none focus:ring-2 focus:ring-primary/20 text-on-surface text-xs font-bold"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Red</label>
                    <select
                      value={formData.platform}
                      onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
                      className="w-full p-4 bg-surface-container-low rounded-2xl border-none focus:ring-2 focus:ring-primary/20 text-on-surface text-xs font-bold"
                    >
                      <option value="facebook">Facebook</option>
                      <option value="instagram">Instagram</option>
                    </select>
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-4 bg-primary text-white font-black text-sm uppercase tracking-widest rounded-2xl hover:translate-y-[-2px] hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      'Procesando...'
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-sm">rocket_launch</span>
                        <span>Programar Post</span>
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
