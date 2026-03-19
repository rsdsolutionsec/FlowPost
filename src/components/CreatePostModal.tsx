import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

function ImagePreview({ path, fileName, selected, onClick }: { path: string; fileName: string; selected: boolean; onClick: () => void }) {
  const [url, setUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let objectUrl: string;
    const loadImg = async () => {
      try {
        const { data, error } = await supabase.storage.from('posts').download(path);
        if (error) throw error;
        if (data) {
          objectUrl = URL.createObjectURL(data);
          setUrl(objectUrl);
        }
      } catch (err) {
        console.error('Error cargando preview:', err);
      } finally {
        setLoading(false);
      }
    };
    loadImg();
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [path]);

  return (
    <div 
      onClick={onClick}
      className="relative flex-none w-24 h-24 snap-start cursor-pointer rounded-xl overflow-hidden group"
    >
      {loading ? (
        <div className="w-full h-full bg-slate-100 flex items-center justify-center animate-pulse rounded-xl border-2 border-transparent">
          <span className="material-symbols-outlined text-slate-300">image</span>
        </div>
      ) : url ? (
        <img 
          src={url} 
          alt={fileName}
          className={`w-full h-full object-cover border-[3px] rounded-xl transition-all duration-200 ${
            selected 
            ? 'border-primary shadow-md scale-95' 
            : 'border-transparent group-hover:border-primary/30 focus:border-primary/30'
          }`}
        />
      ) : (
        <div className="w-full h-full bg-slate-100 flex items-center justify-center rounded-xl border-2 border-transparent">
          <span className="material-symbols-outlined text-rose-300">broken_image</span>
        </div>
      )}
      
      {selected && (
        <div className="absolute top-1 right-1 bg-primary text-white rounded-full w-5 h-5 flex items-center justify-center shadow-sm">
          <span className="material-symbols-outlined text-[12px] font-bold">check</span>
        </div>
      )}
    </div>
  );
}

export default function CreatePostModal({ isOpen, onClose, onSuccess }: CreatePostModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Media State
  const [imageSource, setImageSource] = useState<'upload' | 'library'>('upload');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [libraryFiles, setLibraryFiles] = useState<any[]>([]);
  const [selectedLibraryFile, setSelectedLibraryFile] = useState<string>('');

  const [pages, setPages] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [copies, setCopies] = useState<any[]>([]);
  const [selectedPageId, setSelectedPageId] = useState<string>('');
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('');
  const [selectedCopyId, setSelectedCopyId] = useState<string>('');
  const [useReusableCopy, setUseReusableCopy] = useState(false);
  const [formData, setFormData] = useState({
    caption: '',
    scheduled_at: '',
    platform: 'facebook',
  });

  useEffect(() => {
    if (isOpen && user) {
      const fetchData = async () => {
        const [pagesRes, campaignsRes, copiesRes, mediaRes] = await Promise.all([
          supabase.from('facebook_pages').select('id, page_name').eq('is_active', true).eq('user_id', user.id),
          supabase.from('campaigns').select('id, name').eq('user_id', user.id),
          supabase.from('copies').select('id, name').eq('user_id', user.id),
          supabase.storage.from('posts').list(user.id, { limit: 50, sortBy: { column: 'created_at', order: 'desc' } })
        ]);
        
        if (pagesRes.data) {
          setPages(pagesRes.data);
          if (pagesRes.data.length > 0) setSelectedPageId(pagesRes.data[0].id);
        }
        if (campaignsRes.data) {
          setCampaigns(campaignsRes.data);
        }
        if (copiesRes.data) {
          setCopies(copiesRes.data);
        }
        if (mediaRes.data) {
          setLibraryFiles(mediaRes.data.filter(f => f.name !== '.emptyFolderPlaceholder'));
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
    
    const isValidMedia = (imageSource === 'upload' && imageFile) || (imageSource === 'library' && selectedLibraryFile);
    if (!user || !isValidMedia || !selectedPageId) {
      alert('Por favor selecciona una imagen y una página de destino');
      return;
    }

    if (useReusableCopy && !selectedCopyId) {
      alert('Por favor selecciona un copy de tu librería');
      return;
    }

    setLoading(true);
    try {
      let filePath = '';

      if (imageSource === 'upload' && imageFile) {
        // 1. Subir archivo a Supabase Storage
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
        filePath = `${user.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('posts')
          .upload(filePath, imageFile);

        if (uploadError) throw uploadError;
      } else {
        // Usar archivo existente de la biblioteca
        filePath = `${user.id}/${selectedLibraryFile}`;
      }

      // 2. Insertar en la tabla posts
      const { error } = await supabase.from('posts').insert([
        {
          user_id: user.id,
          facebook_page_id: selectedPageId,
          campaign_id: selectedCampaignId || null,
          copy_id: useReusableCopy ? selectedCopyId : null,
          custom_caption: useReusableCopy ? null : formData.caption,
          caption: useReusableCopy ? null : formData.caption, // Fallback for legacy
          image_path: filePath,
          scheduled_at: new Date(formData.scheduled_at).toISOString(),
          platform: formData.platform,
          status: 'scheduled',
        },
      ]);

      if (error) throw error;
      
      onSuccess();
      onClose();
      
      // Reset state
      setFormData({ caption: '', scheduled_at: '', platform: 'facebook' });
      setImageFile(null);
      setSelectedCopyId('');
      setUseReusableCopy(false);
      setImageSource('upload');
      setSelectedLibraryFile('');
      
    } catch (error: any) {
      alert('Error al crear el post: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
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
            className="relative w-full max-w-lg bg-surface-container-lowest rounded-[2.5rem] shadow-2xl overflow-hidden ghost-border flex flex-col max-h-[90vh]"
          >
            <div className="p-8 space-y-6 overflow-y-auto">
              <div className="flex justify-between items-center">
                <h3 className="text-2xl font-extrabold text-on-surface font-headline">Crear Nueva Publicación</h3>
                <button onClick={onClose} className="p-2 hover:bg-surface-container-low rounded-full transition-colors">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <form id="create-post-form" onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Publicar en Página</label>
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
                        <span>No hay páginas conectadas.</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Campaña (Op)</label>
                    <select
                      value={selectedCampaignId}
                      onChange={(e) => setSelectedCampaignId(e.target.value)}
                      className="w-full p-4 bg-surface-container-low rounded-2xl border-none focus:ring-2 focus:ring-primary/20 text-on-surface text-sm font-bold"
                    >
                      <option value="">Sin Campaña</option>
                      {campaigns.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Caption Section */}
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
                        <p className="text-[9px] text-rose-500 font-bold px-2 italic">No tienes copys guardados aún.</p>
                      )}
                    </div>
                  ) : (
                    <textarea
                      required
                      value={formData.caption}
                      onChange={(e) => setFormData({ ...formData, caption: e.target.value })}
                      className="w-full p-4 bg-white rounded-2xl border-none focus:ring-2 focus:ring-primary/20 min-h-[100px] text-on-surface text-sm font-medium shadow-sm leading-relaxed animate-in fade-in slide-in-from-top-1 duration-300"
                      placeholder="Escribe algo increíble para tu audiencia..."
                    />
                  )}
                </div>

                {/* Media Section */}
                <div className="space-y-3 p-4 bg-slate-50/50 rounded-3xl border border-slate-100">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Contenido Visual</label>
                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] font-black uppercase tracking-widest ${imageSource === 'upload' ? 'text-primary' : 'text-slate-300'}`}>Subir PC</span>
                      <button 
                        type="button"
                        onClick={() => setImageSource(imageSource === 'upload' ? 'library' : 'upload')}
                        className={`w-10 h-5 rounded-full transition-colors relative ${imageSource === 'library' ? 'bg-primary' : 'bg-slate-300'}`}
                      >
                        <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${imageSource === 'library' ? 'left-6' : 'left-1'}`}></div>
                      </button>
                      <span className={`text-[9px] font-black uppercase tracking-widest ${imageSource === 'library' ? 'text-primary' : 'text-slate-300'}`}>Biblioteca</span>
                    </div>
                  </div>

                  <div className="mt-2 min-h-[100px] flex flex-col justify-center animate-in fade-in slide-in-from-top-1 duration-300">
                    {imageSource === 'upload' ? (
                      <div 
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full p-6 bg-white rounded-2xl border-2 border-dashed border-primary/10 hover:border-primary/30 transition-all cursor-pointer flex flex-col items-center justify-center gap-2 group shadow-sm"
                      >
                        <span className="material-symbols-outlined text-3xl text-primary/40 group-hover:scale-110 transition-transform">
                          {imageFile ? 'check_circle' : 'cloud_upload'}
                        </span>
                        <span className="text-on-surface-variant font-black text-xs text-center truncate w-full px-4">
                          {imageFile ? imageFile.name : 'Haz click para subir archivo'}
                        </span>
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleFileChange}
                          className="hidden"
                          accept="image/*,video/*"
                        />
                      </div>
                    ) : (
                      <div className="w-full">
                        {libraryFiles.length > 0 ? (
                          <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar snap-x">
                            {libraryFiles.map(file => (
                              <ImagePreview 
                                key={file.id} 
                                path={`${user.id}/${file.name}`} 
                                fileName={file.name} 
                                selected={selectedLibraryFile === file.name}
                                onClick={() => setSelectedLibraryFile(file.name)}
                              />
                            ))}
                          </div>
                        ) : (
                          <div className="w-full p-6 bg-white rounded-2xl text-center text-slate-400 border border-slate-100 shadow-sm flex flex-col items-center gap-2">
                             <span className="material-symbols-outlined opacity-50">photo_library</span>
                             <p className="text-xs font-bold">No tienes imágenes en tu biblioteca.</p>
                          </div>
                        )}
                      </div>
                    )}
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
              </form>
            </div>
            
            <div className="p-6 bg-surface-container-low border-t border-slate-100">
              <button
                type="submit"
                form="create-post-form"
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
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
