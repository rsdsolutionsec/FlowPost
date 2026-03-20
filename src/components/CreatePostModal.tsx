import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface PrefillData {
  copyId?: string;
  copyName?: string;
  scheduledAt?: string;    // ISO string from suggested_at
  mediaUrl?: string;       // direct R2 public URL (http)
  mediaPath?: string;      // relative path like 'campana_vistas/vista_mesero/2.PNG'
  mediaFileName?: string;  // display name
  editId?: string;         // If present, we are editing this post
  status?: string;         // original status
  platform?: string;       // original platform
  facebookPageId?: string;
  instagramAccountId?: string;
  campaignId?: string;
  caption?: string;
}

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  prefill?: PrefillData;
}

// Helper to sanitize paths (Supabase Storage is picky with special chars like ñ or spaces)
const sanitizePath = (name: string) => {
  return name
    .normalize('NFD') // Separate accents from characters
    .replace(/[\u0300-\u036f]/g, '') // Remove accents (ñ -> n)
    .replace(/[^a-zA-Z0-9.-]/g, '_') // Replace spaces and special chars with underscore
    .replace(/_{2,}/g, '_'); // Collapse multiple underscores
};

interface ImagePreviewProps {
  path: string;
  fileName: string;
  selected: boolean;
  onClick: () => void;
  isFolder?: boolean;
}

const ImagePreview: React.FC<ImagePreviewProps> = ({ path, fileName, selected, onClick, isFolder }) => {
  const [url, setUrl] = useState<string>('');
  const [loading, setLoading] = useState(!isFolder);

  useEffect(() => {
    if (isFolder) return;
    if (path.startsWith('http')) {
      setUrl(path);
      return;
    }
    
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
  }, [path, isFolder]);

  if (isFolder) {
    return (
      <div 
        onClick={onClick}
        className="relative flex-none w-24 h-24 snap-start cursor-pointer rounded-xl overflow-hidden group bg-slate-50 border border-slate-200 flex flex-col items-center justify-center hover:bg-slate-100 hover:border-slate-300 transition-all shadow-sm"
      >
        <span className="material-symbols-outlined text-3xl text-blue-400 group-hover:scale-110 transition-transform">folder</span>
        <span className="text-[10px] font-bold text-slate-600 truncate w-full px-2 text-center mt-1">{fileName}</span>
      </div>
    );
  }

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

interface Page { id: string; page_name: string; }
interface InstagramAccount { id: string; username: string; }
interface Campaign { id: string; name: string; }
interface LibraryCopy { id: string; name: string; }
interface MediaItem { id: string; name: string; url: string; mimetype: string; path: string; size: number; }

export default function CreatePostModal({ isOpen, onClose, onSuccess, prefill }: CreatePostModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Media State
  const [imageSource, setImageSource] = useState<'upload' | 'library'>('upload');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploadPreviewUrl, setUploadPreviewUrl] = useState<string>('');
  const [libraryItems, setLibraryItems] = useState<MediaItem[]>([]);
  const [selectedLibraryFile, setSelectedLibraryFile] = useState<string>(''); // Full url selected
  const [selectedLibraryFileName, setSelectedLibraryFileName] = useState<string>('');
  const [mediaCurrentFolder, setMediaCurrentFolder] = useState<string>('');

  const [pages, setPages] = useState<Page[]>([]);
  const [instagramAccounts, setInstagramAccounts] = useState<InstagramAccount[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [copies, setCopies] = useState<LibraryCopy[]>([]);
  const [selectedPageId, setSelectedPageId] = useState<string>('');
  const [selectedInstagramId, setSelectedInstagramId] = useState<string>('');
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('');
  const [selectedCopyId, setSelectedCopyId] = useState<string>('');
  const [useReusableCopy, setUseReusableCopy] = useState(false);
  const [formData, setFormData] = useState({
    caption: '',
    scheduled_at: '',
    platform: 'facebook',
  });

  // Fetch initial base data (Pages, Campaigns, Copies, Root Library)
  useEffect(() => {
    if (isOpen && user) {
      const fetchData = async () => {
        const [pagesRes, igRes, campaignsRes, copiesRes] = await Promise.all([
          supabase.from('facebook_pages').select('id, page_name').eq('is_active', true).eq('user_id', user.id),
          supabase.from('instagram_accounts').select('id, username').eq('is_active', true).eq('user_id', user.id),
          supabase.from('campaigns').select('id, name').eq('user_id', user.id),
          supabase.from('copies').select('id, name').eq('user_id', user.id)
        ]);
        
        if (pagesRes.data) {
          setPages(pagesRes.data as Page[]);
          if (pagesRes.data.length > 0) setSelectedPageId(pagesRes.data[0].id);
        }
        if (igRes.data) {
          setInstagramAccounts(igRes.data as InstagramAccount[]);
          if (igRes.data.length > 0) setSelectedInstagramId(igRes.data[0].id);
        }
        if (campaignsRes.data) {
          setCampaigns(campaignsRes.data as Campaign[]);
        }
        if (copiesRes.data) {
          setCopies(copiesRes.data as LibraryCopy[]);
        }

        // Apply prefill data after loading
        if (prefill) {
          setUseReusableCopy(true);
          setSelectedCopyId(prefill.copyId);
          if (prefill.scheduledAt) {
            const d = new Date(prefill.scheduledAt);
            const offset = d.getTimezoneOffset() * 60000;
            const local = new Date(d.getTime() - offset).toISOString().slice(0, 16);
            setFormData(prev => ({ ...prev, scheduled_at: local }));
          }

          if (prefill.platform) {
            setFormData(prev => ({ ...prev, platform: prefill.platform || 'facebook' }));
          }

          if (prefill.caption) {
            setFormData(prev => ({ ...prev, caption: prefill.caption || '' }));
          }

          if (prefill.facebookPageId) setSelectedPageId(prefill.facebookPageId);
          if (prefill.instagramAccountId) setSelectedInstagramId(prefill.instagramAccountId);
          if (prefill.campaignId) setSelectedCampaignId(prefill.campaignId);

          // Auto-select media: if direct URL provided, use it immediately
          if (prefill.mediaUrl) {
            setImageSource('library');
            setSelectedLibraryFile(prefill.mediaUrl || '');
            setSelectedLibraryFileName(prefill.mediaFileName || prefill.mediaUrl.split('/').pop() || 'media');
          }
          // Auto-resolve from library by filename if a relative path is given
          if (prefill.mediaPath && !prefill.mediaUrl) {
            const fileName = prefill.mediaPath.split('/').pop();
            if (fileName && user) {
              const { data: mediaMatch } = await supabase
                .from('media')
                .select('url, name')
                .eq('user_id', user.id)
                .ilike('name', fileName)
                .limit(1)
                .single();
              if (mediaMatch?.url) {
                setImageSource('library');
                setSelectedLibraryFile(mediaMatch.url);
                setSelectedLibraryFileName(mediaMatch.name);
              }
            }
          }
        }
      };
      fetchData();
    }
  }, [isOpen, user]);

  // Fetch library items automatically whenever the current folder changes
  useEffect(() => {
    if (isOpen && user && imageSource === 'library') {
      const fetchLibraryMedia = async () => {
        const folderIdentifier = mediaCurrentFolder ? `root/${mediaCurrentFolder}` : 'root';
        const { data, error } = await supabase.from('media')
          .select('*')
          .eq('user_id', user.id)
          .eq('path', folderIdentifier)
          .order('mimetype', { ascending: false }) // Folders first (alphabetically 'folder' > 'image/...') - wait, 'f' < 'i'. Let's just sort.
          .order('created_at', { ascending: false });
        
        if (!error && data) {
          setLibraryItems(data as MediaItem[]);
        }
      };
      fetchLibraryMedia();
    }
  }, [isOpen, user, mediaCurrentFolder, imageSource]);

  // Handle local upload preview URL
  useEffect(() => {
    if (imageFile) {
      const url = URL.createObjectURL(imageFile);
      setUploadPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setUploadPreviewUrl('');
    }
  }, [imageFile]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImageFile(e.target.files[0]);
    }
  };

  const handleItemClick = (item: MediaItem) => {
    if (item.mimetype === 'folder') {
       // Is a folder
       setMediaCurrentFolder(mediaCurrentFolder ? `${mediaCurrentFolder}/${item.name}` : item.name);
    } else {
       // Is a file - Use the public URL directly
       setSelectedLibraryFile(item.url);
       setSelectedLibraryFileName(item.name);
    }
  };

  const handleRemoveMedia = () => {
    setImageFile(null);
    setSelectedLibraryFile('');
    setSelectedLibraryFileName('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleGoBackFolder = () => {
    if (!mediaCurrentFolder) return;
    const parts = mediaCurrentFolder.split('/');
    parts.pop();
    setMediaCurrentFolder(parts.join('/'));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const selectedTarget = formData.platform === 'facebook' ? selectedPageId : selectedInstagramId;
    const isValidMedia = (imageSource === 'upload' && imageFile) || (imageSource === 'library' && selectedLibraryFile);
    if (!user || !isValidMedia || !selectedTarget) {
      alert(`Por favor selecciona una imagen y una ${formData.platform === 'facebook' ? 'página' : 'cuenta'} de destino`);
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
        // 1. Subir a R2 vía backend presigned
        const fileExt = imageFile.name.split('.').pop();
        const safeBaseName = sanitizePath(imageFile.name.replace(/\.[^/.]+$/, ""));
        const fileName = `${Math.random().toString(36).substring(2)}_${safeBaseName}.${fileExt}`;
        const presignPath = `${user.id}/${fileName}`;

        const presignRes = await fetch('/api/media/presign', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ filename: presignPath, contentType: imageFile.type })
        });
        if (!presignRes.ok) throw new Error('Failed to generate presigned URL');
        const { url, publicUrl } = await presignRes.json();
        
        const uploadRes = await fetch(url, {
           method: 'PUT',
           headers: { 'Content-Type': imageFile.type },
           body: imageFile
        });
        if (!uploadRes.ok) throw new Error('Upload to R2 failed');
        
        // Guardamos también en tabla media
        await supabase.from('media').insert({
          user_id: user.id,
          name: fileName,
          path: 'root', // Por defecto a root cuando se programa directo
          mimetype: imageFile.type,
          size: imageFile.size,
          url: publicUrl
        });
        
        filePath = publicUrl;
      } else {
        // Usar archivo existente de la biblioteca
        filePath = selectedLibraryFile;
      }

      // 2. Insert or Update in the tabla posts
      const postData = {
        user_id: user.id,
        facebook_page_id: formData.platform === 'facebook' ? selectedPageId : null,
        instagram_account_id: formData.platform === 'instagram' ? selectedInstagramId : null,
        campaign_id: selectedCampaignId || null,
        copy_id: useReusableCopy ? selectedCopyId : null,
        custom_caption: useReusableCopy ? null : formData.caption,
        caption: useReusableCopy ? null : formData.caption, // Fallback for legacy
        image_path: filePath,
        scheduled_at: new Date(formData.scheduled_at).toISOString(),
        platform: formData.platform,
        status: prefill?.editId ? (prefill.status || 'scheduled') : (prefill ? 'pending' : 'scheduled'),
      };

      if (prefill?.editId) {
        const { error } = await supabase
          .from('posts')
          .update(postData)
          .eq('id', prefill.editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('posts').insert([postData]);
        if (error) throw error;
      }
      
      onSuccess();
      onClose();
      
      // Reset state
      setFormData({ caption: '', scheduled_at: '', platform: 'facebook' });
      setImageFile(null);
      setSelectedCopyId('');
      setUseReusableCopy(false);
      setImageSource('upload');
      setSelectedLibraryFile('');
      setSelectedLibraryFileName('');
      setMediaCurrentFolder('');
      
    } catch (error: any) {
      console.error('Post Creation Error Context:', error);
      alert('Error al crear el post (verifica CORS en Cloudflare): ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Separar folders de files nativamente para el UI
  const folders = libraryItems.filter(f => f.mimetype === 'folder');
  const files = libraryItems.filter(f => f.mimetype !== 'folder');

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
                <h3 className="text-2xl font-extrabold text-on-surface font-headline">
                  {prefill?.editId ? 'Editar Publicación' : prefill ? 'Programar desde Copy' : 'Crear Nueva Publicación'}
                </h3>
                <button onClick={onClose} className="p-2 hover:bg-surface-container-low rounded-full transition-colors">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              {/* Prefill banner */}
              {prefill && (
                <div className="flex items-start gap-3 p-4 bg-indigo-50 border border-indigo-100 rounded-2xl">
                  <span className="material-symbols-outlined text-indigo-500 text-[20px] mt-0.5">auto_awesome</span>
                  <div>
                    <p className="text-xs font-black text-indigo-700 uppercase tracking-widest">Pre-configurado desde Copy</p>
                    <p className="text-xs text-indigo-500 font-medium mt-0.5">
                      <strong>{prefill.copyName}</strong> · Revisa y completa los datos antes de guardar como pendiente.
                    </p>
                  </div>
                </div>
              )}

              <form id="create-post-form" onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest text-wrap">
                      Destino: {formData.platform === 'facebook' ? 'Página FB' : 'Cuenta IG'}
                    </label>
                    {formData.platform === 'facebook' ? (
                      pages.length > 0 ? (
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
                        <div className="p-4 bg-rose-50 text-rose-600 rounded-2xl text-[10px] font-bold border border-rose-100 flex items-center gap-2">
                          <span>No hay páginas</span>
                        </div>
                      )
                    ) : (
                      instagramAccounts.length > 0 ? (
                        <select
                          required
                          value={selectedInstagramId}
                          onChange={(e) => setSelectedInstagramId(e.target.value)}
                          className="w-full p-4 bg-surface-container-low rounded-2xl border-none focus:ring-2 focus:ring-primary/20 text-on-surface text-sm font-bold"
                        >
                          {instagramAccounts.map(ig => (
                            <option key={ig.id} value={ig.id}>@{ig.username}</option>
                          ))}
                        </select>
                      ) : (
                        <div className="p-4 bg-rose-50 text-rose-600 rounded-2xl text-[10px] font-bold border border-rose-100 flex items-center gap-2">
                          <span>No hay IG</span>
                        </div>
                      )
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
                        {mediaCurrentFolder && (
                          <div className="flex items-center gap-2 mb-3 text-xs font-bold text-slate-500 px-1">
                            <span className="material-symbols-outlined text-[14px]">folder_open</span>
                            <span className="truncate flex-1">{mediaCurrentFolder.split('/').pop()}</span>
                          </div>
                        )}
                        {(folders.length > 0 || files.length > 0 || mediaCurrentFolder) ? (
                          <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar snap-x">
                            {/* Back Button if in subfolder */}
                            {mediaCurrentFolder && (
                              <div 
                                onClick={handleGoBackFolder}
                                className="relative flex-none w-24 h-24 snap-start cursor-pointer rounded-xl overflow-hidden group bg-white border border-slate-200 flex flex-col items-center justify-center hover:bg-slate-50 transition-all shadow-sm"
                              >
                                <span className="material-symbols-outlined text-3xl text-slate-400 group-hover:-translate-y-1 transition-transform">arrow_upward</span>
                                <span className="text-[10px] font-bold text-slate-500 mt-1">Atrás</span>
                              </div>
                            )}

                            {/* Render Folders */}
                            {folders.map(folder => (
                              <ImagePreview 
                                key={folder.name}
                                path=""
                                fileName={folder.name} 
                                selected={false}
                                onClick={() => handleItemClick(folder)}
                                isFolder={true}
                              />
                            ))}

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
                className={`w-full py-4 text-white font-black text-sm uppercase tracking-widest rounded-2xl hover:translate-y-[-2px] hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2 ${
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
