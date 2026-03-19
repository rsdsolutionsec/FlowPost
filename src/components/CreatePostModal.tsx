import React, { useState, useRef } from 'react';
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [pages, setPages] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [selectedPageId, setSelectedPageId] = useState<string>('');
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('');
  const [formData, setFormData] = useState({
    caption: '',
    scheduled_at: '',
    platform: 'facebook',
  });

  React.useEffect(() => {
    if (isOpen && user) {
      const fetchData = async () => {
        const [pagesRes, campaignsRes] = await Promise.all([
          supabase.from('facebook_pages').select('id, page_name').eq('is_active', true).eq('user_id', user.id),
          supabase.from('campaigns').select('id, name').eq('user_id', user.id)
        ]);
        
        if (pagesRes.data) {
          setPages(pagesRes.data);
          if (pagesRes.data.length > 0) setSelectedPageId(pagesRes.data[0].id);
        }
        if (campaignsRes.data) {
          setCampaigns(campaignsRes.data);
        }
      };
      fetchData();
    }
  }, [isOpen, user]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImageFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !imageFile || !selectedPageId) {
      alert('Por favor selecciona una imagen y una página de destino');
      return;
    }

    setLoading(true);
    try {
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('posts')
        .upload(filePath, imageFile);

      if (uploadError) throw uploadError;

      const { error } = await supabase.from('posts').insert([
        {
          user_id: user.id,
          facebook_page_id: selectedPageId,
          campaign_id: selectedCampaignId || null,
          caption: formData.caption,
          image_path: filePath,
          scheduled_at: new Date(formData.scheduled_at).toISOString(),
          platform: formData.platform,
          status: 'scheduled',
        },
      ]);

      if (error) throw error;
      
      onSuccess();
      onClose();
      setFormData({ caption: '', scheduled_at: '', platform: 'facebook' });
      setImageFile(null);
    } catch (error: any) {
      alert('Error al crear el post: ' + error.message);
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
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-lg bg-surface-container-lowest rounded-[2.5rem] shadow-2xl overflow-hidden ghost-border"
          >
            <div className="p-8 space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-2xl font-extrabold text-on-surface font-headline">Crear Nueva Publicación</h3>
                <button onClick={onClose} className="p-2 hover:bg-surface-container-low rounded-full transition-colors">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-on-surface-variant uppercase tracking-wider">Publicar en Página</label>
                  {pages.length > 0 ? (
                    <select
                      required
                      value={selectedPageId}
                      onChange={(e) => setSelectedPageId(e.target.value)}
                      className="w-full p-4 bg-surface-container-low rounded-2xl border-none focus:ring-2 focus:ring-primary/20 text-on-surface"
                    >
                      {pages.map(page => (
                        <option key={page.id} value={page.id}>{page.page_name}</option>
                      ))}
                    </select>
                  ) : (
                    <div className="p-4 bg-rose-50 text-rose-600 rounded-2xl text-sm font-bold border border-rose-100 flex items-center gap-2">
                      <span className="material-symbols-outlined">warning</span>
                      <span>No tienes páginas conectadas. Conéntalas en Configuración.</span>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-on-surface-variant uppercase tracking-wider">Campaña (Opcional)</label>
                  <select
                    value={selectedCampaignId}
                    onChange={(e) => setSelectedCampaignId(e.target.value)}
                    className="w-full p-4 bg-surface-container-low rounded-2xl border-none focus:ring-2 focus:ring-primary/20 text-on-surface"
                  >
                    <option value="">Sin Campaña</option>
                    {campaigns.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-on-surface-variant uppercase tracking-wider">Caption</label>
                  <textarea
                    required
                    value={formData.caption}
                    onChange={(e) => setFormData({ ...formData, caption: e.target.value })}
                    className="w-full p-4 bg-surface-container-low rounded-2xl border-none focus:ring-2 focus:ring-primary/20 min-h-[120px] text-on-surface"
                    placeholder="¿Qué quieres compartir?"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-on-surface-variant uppercase tracking-wider">Imagen (Archivo)</label>
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full p-8 bg-surface-container-low rounded-2xl border-2 border-dashed border-primary/20 hover:border-primary/50 transition-all cursor-pointer flex flex-col items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined text-4xl text-primary/60">
                      {imageFile ? 'check_circle' : 'cloud_upload'}
                    </span>
                    <span className="text-on-surface-variant font-bold text-center">
                      {imageFile ? imageFile.name : 'Selecciona una imagen de tu equipo'}
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
                    <label className="text-sm font-bold text-on-surface-variant uppercase tracking-wider">Programar para</label>
                    <input
                      type="datetime-local"
                      required
                      value={formData.scheduled_at}
                      onChange={(e) => setFormData({ ...formData, scheduled_at: e.target.value })}
                      className="w-full p-4 bg-surface-container-low rounded-2xl border-none focus:ring-2 focus:ring-primary/20 text-on-surface"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-on-surface-variant uppercase tracking-wider">Plataforma</label>
                    <select
                      value={formData.platform}
                      onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
                      className="w-full p-4 bg-surface-container-low rounded-2xl border-none focus:ring-2 focus:ring-primary/20 text-on-surface"
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
                    className="w-full py-4 bg-primary text-white font-extrabold rounded-2xl hover:translate-y-[-2px] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      'Creando y Subiendo...'
                    ) : (
                      <>
                        <span className="material-symbols-outlined">send</span>
                        <span>Programar Publicación</span>
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
