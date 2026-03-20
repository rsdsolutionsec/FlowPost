import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  prefill?: {
    editId?: string;
    caption?: string;
    mediaUrl?: string;
    mediaPath?: string;
    mediaFileName?: string;
    platform?: string;
    status?: string;
    facebookPageId?: string;
    instagramAccountId?: string;
    campaignId?: string;
    copyId?: string;
    copyName?: string;
    scheduledAt?: string;
  };
}

interface FacebookPage {
  id: string;
  page_name: string;
  access_token: string;
}

interface InstagramAccount {
  id: string;
  username: string;
}

interface Campaign {
  id: string;
  name: string;
}

interface FileItem {
  id: string;
  name: string;
  url: string;
  mimetype: string;
}

const ImagePreview = ({ path, fileName, selected, onClick }: { path: string; fileName: string; selected: boolean; onClick: () => void }) => {
  const isVideo = fileName.toLowerCase().match(/\.(mp4|webm|ogg)$/);
  return (
    <div 
      onClick={onClick}
      className={`relative aspect-square rounded-xl overflow-hidden cursor-pointer border-2 transition-all ${
        selected ? 'border-primary ring-2 ring-primary/20' : 'border-transparent hover:border-slate-200'
      }`}
    >
      {isVideo ? (
        <div className="w-full h-full bg-slate-100 flex items-center justify-center">
          <span className="material-symbols-outlined text-slate-400">movie</span>
        </div>
      ) : (
        <img src={path} alt={fileName} className="w-full h-full object-cover" />
      )}
      {selected && (
        <div className="absolute inset-0 bg-primary/10 flex items-center justify-center">
          <div className="bg-primary text-white rounded-full p-1 shadow-lg">
            <span className="material-symbols-outlined text-base">check</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default function CreatePostModal({ isOpen, onClose, onSuccess, prefill }: CreatePostModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [facebookPages, setFacebookPages] = useState<FacebookPage[]>([]);
  const [instagramAccounts, setInstagramAccounts] = useState<InstagramAccount[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploadPreviewUrl, setUploadPreviewUrl] = useState<string | null>(null);
  
  // Library selection
  const [imageSource, setImageSource] = useState<'upload' | 'library'>('upload');
  const [files, setFiles] = useState<FileItem[]>([]);
  const [selectedLibraryFile, setSelectedLibraryFile] = useState<string>('');
  const [selectedLibraryFileName, setSelectedLibraryFileName] = useState<string>('');
  const [loadingLibrary, setLoadingLibrary] = useState(false);

  const [formData, setFormData] = useState({
    caption: '',
    platform: 'facebook',
    facebook_page_id: '',
    instagram_account_id: '',
    campaign_id: '',
    scheduled_at: '',
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && user) {
      if (prefill) {
        setFormData({
          caption: prefill.caption || '',
          platform: prefill.platform || 'facebook',
          facebook_page_id: prefill.facebookPageId || '',
          instagram_account_id: prefill.instagramAccountId || '',
          campaign_id: prefill.campaignId || '',
          scheduled_at: prefill.scheduledAt ? new Date(prefill.scheduledAt).toISOString().slice(0, 16) : '',
        });
        
        if (prefill.mediaUrl) {
          if (prefill.mediaUrl.startsWith('http')) {
            setImageSource('library');
            setSelectedLibraryFile(prefill.mediaUrl);
            setSelectedLibraryFileName(prefill.mediaFileName || 'Archivo seleccionado');
          }
        }
      } else {
        setFormData({
            caption: '',
            platform: 'facebook',
            facebook_page_id: '',
            instagram_account_id: '',
            campaign_id: '',
            scheduled_at: '',
        });
        setImageFile(null);
        setUploadPreviewUrl(null);
        setSelectedLibraryFile('');
        setSelectedLibraryFileName('');
        setImageSource('upload');
      }
      fetchData();
    }
  }, [isOpen, user, prefill]);

  const fetchData = async () => {
    if (!user) return;
    try {
      const [pagesRes, igRes, campaignsRes] = await Promise.all([
        supabase.from('facebook_pages').select('*').eq('user_id', user.id).eq('is_active', true),
        supabase.from('instagram_accounts').select('*').eq('user_id', user.id).eq('is_active', true),
        supabase.from('campaigns').select('id, name').eq('user_id', user.id)
      ]);

      if (pagesRes.data) {
        setFacebookPages(pagesRes.data);
        if (pagesRes.data.length > 0 && !prefill?.facebookPageId) {
          setFormData(prev => ({ ...prev, facebook_page_id: pagesRes.data[0].id }));
        }
      }
      if (igRes.data) {
        setInstagramAccounts(igRes.data);
        if (igRes.data.length > 0 && !prefill?.instagramAccountId) {
            setFormData(prev => ({ ...prev, instagram_account_id: igRes.data[0].id }));
        }
      }
      if (campaignsRes.data) setCampaigns(campaignsRes.data);
    } catch (error) {
      console.error('Error fetching modal data:', error);
    }
  };

  const fetchLibrary = async () => {
    if (!user) return;
    setLoadingLibrary(true);
    try {
      const { data, error } = await supabase
        .from('media')
        .select('*')
        .eq('user_id', user.id)
        .neq('mimetype', 'folder')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFiles(data || []);
    } catch (error) {
      console.error('Error loading library:', error);
    } finally {
      setLoadingLibrary(false);
    }
  };

  const handleItemClick = (file: FileItem) => {
    setSelectedLibraryFile(file.url);
    setSelectedLibraryFileName(file.name);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const url = URL.createObjectURL(file);
      setUploadPreviewUrl(url);
    }
  };

  const handleRemoveMedia = () => {
    setImageFile(null);
    setUploadPreviewUrl(null);
    setSelectedLibraryFile('');
    setSelectedLibraryFileName('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setLoading(true);
    try {
      let imageUrl = selectedLibraryFile;

      // Upload if new file provided
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;

        const presignRes = await fetch('/api/media/presign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename: filePath, contentType: imageFile.type })
        });
        
        if (!presignRes.ok) throw new Error('Falló la generación de URL de subida');
        const { url, publicUrl } = await presignRes.json();

        const uploadRes = await fetch(url, {
          method: 'PUT',
          headers: { 'Content-Type': imageFile.type },
          body: imageFile
        });

        if (!uploadRes.ok) throw new Error('La subida al servidor falló');
        
        imageUrl = publicUrl;
        
        // Save to media library automatically if uploaded from here
        await supabase.from('media').insert({
           user_id: user.id,
           name: imageFile.name,
           path: 'root',
           mimetype: imageFile.type,
           size: imageFile.size,
           url: publicUrl
        });
      }

      if (!imageUrl && !prefill?.editId) {
        throw new Error('Debes seleccionar o subir una imagen/video');
      }

      const postData = {
        user_id: user.id,
        caption: formData.caption,
        custom_caption: formData.caption,
        image_path: imageUrl,
        platform: formData.platform,
        facebook_page_id: formData.platform === 'facebook' || formData.platform === 'both' ? formData.facebook_page_id : null,
        instagram_account_id: formData.platform === 'instagram' || formData.platform === 'both' ? formData.instagram_account_id : null,
        campaign_id: formData.campaign_id || null,
        copy_id: prefill?.copyId || null,
        scheduled_at: new Date(formData.scheduled_at).toISOString(),
        status: prefill?.status === 'pending' ? 'pending' : (prefill?.editId ? prefill.status : 'scheduled')
      };

      if (prefill?.editId) {
        const { error } = await supabase
          .from('posts')
          .update(postData)
          .eq('id', prefill.editId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('posts')
          .insert([postData]);
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

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="relative w-full max-w-4xl bg-white rounded-[2rem] sm:rounded-[3rem] shadow-2xl flex flex-col md:flex-row h-full max-h-[90vh] md:h-auto md:max-h-[85vh] overflow-hidden m-auto"
          >
            {/* Header / Top mobile actions */}
            <div className="md:hidden p-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
               <h3 className="font-black text-slate-800 uppercase tracking-widest text-xs">
                 {prefill?.editId ? 'Editar Publicación' : 'Nueva Publicación'}
               </h3>
               <button onClick={onClose} className="p-2 bg-slate-100 rounded-full">
                  <span className="material-symbols-outlined text-slate-400">close</span>
               </button>
            </div>

            <div className="flex-1 p-6 sm:p-8 md:p-10 lg:p-12 overflow-y-auto custom-scrollbar">
              <div className="hidden md:flex justify-between items-start mb-8 lg:mb-10">
                <div className="space-y-1">
                  <h3 className="text-2xl sm:text-3xl font-black text-slate-900 font-headline leading-tight">
                    {prefill?.editId ? 'Editar Publicación' : 'Crear Post'}
                  </h3>
                  <p className="text-slate-500 font-medium text-sm">
                    {prefill?.copyName ? `Usando copy: ${prefill.copyName}` : 'Configura tu contenido y programación.'}
                  </p>
                </div>
                <button 
                  onClick={onClose}
                  className="p-3 bg-slate-50 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-2xl transition-all"
                >
                  <span className="material-symbols-outlined text-3xl">close</span>
                </button>
              </div>

              <form id="create-post-form" onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Plataforma</label>
                    <div className="grid grid-cols-3 gap-2 p-1 bg-surface-container-low rounded-2xl">
                        {['facebook', 'instagram', 'both'].map((p) => (
                           <button
                            key={p}
                            type="button"
                            onClick={() => setFormData({ ...formData, platform: p })}
                            className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                              formData.platform === p ? 'bg-white shadow-sm text-primary' : 'text-slate-400 hover:text-slate-600'
                            }`}
                           >
                            {p === 'both' ? 'Ambas' : p}
                           </button>
                        ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Campaña / Proyecto</label>
                    <select
                      value={formData.campaign_id}
                      onChange={(e) => setFormData({ ...formData, campaign_id: e.target.value })}
                      className="w-full p-4 bg-surface-container-low rounded-2xl border-none focus:ring-2 focus:ring-primary/20 text-on-surface text-xs font-bold"
                    >
                      <option value="">Selecciona (Opcional)</option>
                      {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-8">
                  {/* Account Selectors */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Página de Facebook</label>
                    <select
                      disabled={formData.platform === 'instagram'}
                      required={formData.platform !== 'instagram'}
                      value={formData.facebook_page_id}
                      onChange={(e) => setFormData({ ...formData, facebook_page_id: e.target.value })}
                      className="w-full p-4 bg-surface-container-low rounded-2xl border-none focus:ring-2 focus:ring-primary/20 text-on-surface text-xs font-bold disabled:opacity-30"
                    >
                      <option value="">Selecciona página...</option>
                      {facebookPages.map(p => <option key={p.id} value={p.id}>{p.page_name}</option>)}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Cuenta de Instagram</label>
                    <select
                      disabled={formData.platform === 'facebook'}
                      required={formData.platform !== 'facebook'}
                      value={formData.instagram_account_id}
                      onChange={(e) => setFormData({ ...formData, instagram_account_id: e.target.value })}
                      className="w-full p-4 bg-surface-container-low rounded-2xl border-none focus:ring-2 focus:ring-primary/20 text-on-surface text-xs font-bold disabled:opacity-30"
                    >
                      <option value="">Selecciona cuenta...</option>
                      {instagramAccounts.map(ig => <option key={ig.id} value={ig.id}>@{ig.username}</option>)}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Descripción / Caption</label>
                  <textarea
                    required
                    value={formData.caption}
                    onChange={(e) => setFormData({ ...formData, caption: e.target.value })}
                    rows={4}
                    className="w-full p-6 bg-surface-container-low rounded-[2rem] border-none focus:ring-2 focus:ring-primary/20 text-on-surface text-sm font-medium leading-relaxed resize-none custom-scrollbar"
                    placeholder="Escribe lo que acompañará tu imagen..."
                  />
                </div>

                {/* Media Selection Area */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Contenido Visual</label>
                    <div className="flex bg-slate-100 p-1 rounded-xl">
                      <button
                        type="button"
                        onClick={() => setImageSource('upload')}
                        className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
                          imageSource === 'upload' ? 'bg-white shadow-sm text-primary' : 'text-slate-500'
                        }`}
                      >
                        Subir
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setImageSource('library');
                          if (files.length === 0) fetchLibrary();
                        }}
                        className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
                          imageSource === 'library' ? 'bg-white shadow-sm text-primary' : 'text-slate-500'
                        }`}
                      >
                        Librería
                      </button>
                    </div>
                  </div>

                  <div className="relative">
                    {imageSource === 'upload' ? (
                       <div 
                        onClick={() => fileInputRef.current?.click()}
                        className="group relative w-full aspect-video sm:aspect-[21/9] bg-surface-container-low rounded-[2rem] border-2 border-dashed border-primary/20 hover:border-primary/40 transition-all flex flex-col items-center justify-center cursor-pointer overflow-hidden p-6"
                      >
                        {uploadPreviewUrl ? (
                          <>
                            {imageFile?.type.startsWith('video/') ? (
                              <div className="w-full h-full flex items-center justify-center text-primary/40">
                                <span className="material-symbols-outlined text-6xl">movie</span>
                                <p className="absolute bottom-4 text-xs font-black text-primary uppercase tracking-widest">Archivo de Video Listo</p>
                              </div>
                            ) : (
                                <img src={uploadPreviewUrl} alt="Upload preview" className="w-full h-full object-cover" />
                            )}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <span className="text-white font-black text-sm uppercase tracking-widest">Cambiar Archivo</span>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-lg text-primary mb-4 group-hover:scale-110 transition-transform">
                              <span className="material-symbols-outlined text-3xl">add_photo_alternate</span>
                            </div>
                            <p className="text-sm font-black text-on-surface uppercase tracking-widest">Seleccionar Archivo</p>
                            <p className="text-[10px] text-on-surface-variant font-medium mt-1">Imágenes o Videos hasta 100MB</p>
                          </>
                        )}
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*,video/*" onChange={handleFileChange} />
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {loadingLibrary ? (
                          <div className="w-full aspect-video flex items-center justify-center">
                              <div className="w-8 h-8 border-4 border-primary/10 border-t-primary rounded-full animate-spin" />
                          </div>
                        ) : files.length > 0 ? (
                          <div className="grid grid-cols-4 sm:grid-cols-6 gap-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">

                            {/* Render Files */}
                            {files.map(file => {
                               return (
                                <ImagePreview 
                                  key={file.id} 
                                  path={file.url} 
                                  fileName={file.name} 
                                  selected={selectedLibraryFile === file.url}
                                  onClick={() => handleItemClick(file)}
                                />
                               );
                            })}
                          </div>
                        ) : (
                          <div className="w-full p-6 bg-white rounded-2xl text-center text-slate-400 border border-slate-100 shadow-sm flex flex-col items-center gap-2">
                             <span className="material-symbols-outlined opacity-50">photo_library</span>
                             <p className="text-xs font-bold">No hay medios aquí.</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Selected Media Preview */}
                {(imageFile || selectedLibraryFile) && (
                  <div className="p-4 bg-primary/5 rounded-3xl border border-primary/10 animate-in zoom-in-95 duration-300">
                    <div className="flex items-center gap-4">
                      <div className="relative w-24 h-24 rounded-2xl overflow-hidden shadow-sm border-2 border-primary/20 bg-white flex-none">
                        {imageFile?.type.startsWith('video/') || selectedLibraryFile.toLowerCase().match(/\.(mp4|webm|ogg)$/) ? (
                          <div className="w-full h-full flex items-center justify-center bg-slate-100">
                            <span className="material-symbols-outlined text-primary/40 text-4xl">movie</span>
                          </div>
                        ) : (
                          <img 
                            src={imageSource === 'upload' ? uploadPreviewUrl : selectedLibraryFile} 
                            alt="Preview" 
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">Medio Seleccionado</p>
                        <p className="text-sm font-bold text-on-surface truncate">
                          {imageSource === 'upload' ? imageFile?.name : selectedLibraryFileName}
                        </p>
                        <button 
                          type="button"
                          onClick={handleRemoveMedia}
                          className="mt-2 flex items-center gap-1 text-[10px] font-bold text-rose-500 hover:text-rose-600 transition-colors"
                        >
                          <span className="material-symbols-outlined text-sm">delete_sweep</span>
                          Quitar Selección
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Programar para</label>
                  <input
                    type="datetime-local"
                    required
                    value={formData.scheduled_at}
                    onChange={(e) => setFormData({ ...formData, scheduled_at: e.target.value })}
                    className="w-full p-4 bg-surface-container-low rounded-2xl border-none focus:ring-2 focus:ring-primary/20 text-on-surface text-xs font-bold"
                  />
                </div>
              </form>
            </div>
            
            <div className="p-5 sm:p-6 bg-surface-container-low border-t border-slate-100 mt-auto">
              <button
                type="submit"
                form="create-post-form"
                disabled={loading}
                className={`w-full py-4 text-white font-black text-sm uppercase tracking-widest rounded-2xl hover:translate-y-[-2px] hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2 sm:gap-3 ${
                  prefill ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20' : 'bg-primary shadow-primary/20'
                } shadow-xl`}
              >
                {loading ? (
                  'Procesando...'
                ) : prefill?.editId ? (
                  <>
                    <span className="material-symbols-outlined text-sm">save</span>
                    <span>Guardar Cambios</span>
                  </>
                ) : prefill ? (
                  <>
                    <span className="material-symbols-outlined text-sm">pending_actions</span>
                    <span>Guardar como Pendiente</span>
                  </>
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
