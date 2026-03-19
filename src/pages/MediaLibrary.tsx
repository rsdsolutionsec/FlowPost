import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export interface MediaItem {
  id: string;
  user_id: string;
  name: string;
  path: string;
  url: string;
  mimetype: string;
  size: number;
  created_at: string;
}

function ImagePreview({ item }: { item: MediaItem }) {
  if (item.mimetype === 'folder') {
    return (
      <div className="w-full h-full bg-slate-100 flex items-center justify-center animate-pulse">
        <span className="material-symbols-outlined text-slate-300">folder</span>
      </div>
    );
  }

  if (!item.url) {
    return (
      <div className="w-full h-full bg-slate-100 flex items-center justify-center">
        <span className="material-symbols-outlined text-rose-300">broken_image</span>
      </div>
    );
  }

  return (
    <img 
      src={item.url} 
      alt={item.name} 
      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
      loading="lazy"
    />
  );
}

// Helper to sanitize paths
const sanitizePath = (name: string) => {
  return name
    .normalize('NFD') // Separate accents from characters
    .replace(/[\u0300-\u036f]/g, '') // Remove accents (ñ -> n)
    .replace(/[^a-zA-Z0-9.-]/g, '_') // Replace spaces and special chars with underscore
    .replace(/_{2,}/g, '_'); // Collapse multiple underscores
};

export default function MediaLibrary() {
  const { user } = useAuth();
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  // Folders and Filters state
  const [currentFolder, setCurrentFolder] = useState<string>(''); // "" is root
  const [search, setSearch] = useState('');
  const [mediaFilter, setMediaFilter] = useState<'all' | 'photo' | 'video'>('all');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchMedia = async () => {
    if (!user) return;
    setLoading(true);
    setSearch('');
    try {
      const folderIdentifier = currentFolder ? `root/${currentFolder}` : 'root';
      const { data, error } = await supabase.from('media')
        .select('*')
        .eq('user_id', user.id)
        .eq('path', folderIdentifier)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      if (data) {
        setItems(data as MediaItem[]);
      }
    } catch (error) {
      console.error('Error fetching media:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMedia();
  }, [user, currentFolder]);

  const handleUploadClick = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0 || !user) return;
    
    setUploading(true);
    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const fileExt = file.name.split('.').pop();
        const safeBaseName = sanitizePath(file.name.replace(/\.[^/.]+$/, ""));
        const fileName = `${Math.random().toString(36).substring(2)}_${safeBaseName}.${fileExt}`;
        const filePath = currentFolder 
          ? `${user.id}/${currentFolder}/${fileName}` 
          : `${user.id}/${fileName}`;
        
        // 1. Get Presigned URL
        const presignRes = await fetch('/api/media/presign', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ filename: filePath, contentType: file.type })
        });
        
        if (!presignRes.ok) throw new Error('Failed to generate presigned URL');
        
        const { url, publicUrl } = await presignRes.json();
        
        // 2. Direct upload to R2
        console.log('Starting fetch PUT to R2...');
        const uploadRes = await fetch(url, {
           method: 'PUT',
           headers: { 
             'Content-Type': file.type 
           },
           mode: 'cors',
           body: file
        });
        
        if (!uploadRes.ok) {
          const errText = await uploadRes.text().catch(() => 'No response body');
          throw new Error(`Upload to R2 bucket failed with status ${uploadRes.status}: ${errText}`);
        }

        // 3. Save reference in DB
        const folderIdentifier = currentFolder ? `root/${currentFolder}` : 'root';
        const { error } = await supabase.from('media').insert({
          user_id: user.id,
          name: `${safeBaseName}.${fileExt}`,
          path: folderIdentifier,
          mimetype: file.type,
          size: file.size,
          url: publicUrl
        });
        if (error) throw error;
      }
      await fetchMedia();
    } catch (error: any) {
      console.error('Upload Error Context:', error);
      alert('Error uploading file (check CORS in Cloudflare): ' + error.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newFolderName.trim()) return;
    
    setUploading(true);
    try {
      const folderName = sanitizePath(newFolderName.trim());
      const folderIdentifier = currentFolder ? `root/${currentFolder}` : 'root';
      
      const { error } = await supabase.from('media').insert({
          user_id: user.id,
          name: folderName,
          path: folderIdentifier,
          mimetype: 'folder',
          url: ''
      });
      if (error) throw error;
      
      setNewFolderName('');
      setIsCreatingFolder(false);
      await fetchMedia();
    } catch (error: any) {
      alert('Error creating folder: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteFile = async (item: MediaItem) => {
    if (!user || !confirm('¿Estás seguro de que quieres eliminar este archivo? Esto podría afectar a los posts programados que lo usen.')) return;
    
    setDeletingId(item.id);
    try {
      const filePath = currentFolder ? `${user.id}/${currentFolder}/${item.name}` : `${user.id}/${item.name}`;
      
      // Attempt physical deletion on R2
      await fetch('/api/media/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: filePath })
      }).catch(console.warn); // graceful fallback

      // DB deletion
      const { error } = await supabase.from('media').delete().eq('id', item.id);
      if (error) throw error;
      
      setItems(items.filter(f => f.id !== item.id));
    } catch (error: any) {
      alert('Error deleting file: ' + error.message);
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteFolder = async (folder: MediaItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user || !confirm(`¿Estás seguro de que quieres eliminar la carpeta "${folder.name}" y todo su contenido?`)) return;
    
    setDeletingId(folder.id);
    try {
      const pathPrefix = currentFolder ? `root/${currentFolder}/${folder.name}` : `root/${folder.name}`;
      
      // 1. Delete all relational children recursively in DB using wildcards
      const { error: cascadeError } = await supabase.from('media').delete()
          .eq('user_id', user.id)
          .like('path', `${pathPrefix}%`);
      if (cascadeError) throw cascadeError;
          
      // 2. Delete the folder node itself
      const { error: nodeError } = await supabase.from('media').delete()
          .eq('id', folder.id);
      if (nodeError) throw nodeError;
      
      // Note: we skip deep R2 multi-delete implementation here to keep this functional without over-engineering complex cloud functions. 
      // Cloudflare R2 has Lifecycle rules / bulk operations available natively if needed later.

      await fetchMedia();
    } catch (error: any) {
      alert('Error deleting folder: ' + error.message);
    } finally {
      setDeletingId(null);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Separar carpetas de archivos
  const folders = items.filter(f => f.mimetype === 'folder');
  const files = items.filter(f => f.mimetype !== 'folder');

  const filteredFiles = files.filter(f => {
    // 1. Buscador textual
    const matchesSearch = f.name.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;
    
    // 2. Filtro de tipo
    if (mediaFilter === 'photo') {
      return f.mimetype?.startsWith('image/');
    }
    if (mediaFilter === 'video') {
      return f.mimetype?.startsWith('video/');
    }
    return true; // "all"
  });

  const goUpOneFolder = () => {
    if (!currentFolder) return;
    const parts = currentFolder.split('/');
    parts.pop();
    setCurrentFolder(parts.join('/'));
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="pb-20 relative"
    >
      {/* Header */}
      <div className="mb-12 flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-extrabold tracking-tight text-on-surface font-headline">Biblioteca de Medios</h2>
          <p className="text-slate-500 mt-2 font-medium">Sube, organiza y reutiliza tus imágenes y videos.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setIsCreatingFolder(true)}
            className="px-5 py-2.5 bg-surface-container-high text-on-surface font-semibold rounded-full hover:translate-y-[-1px] transition-all flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">create_new_folder</span>
            <span className="hidden sm:inline">Nueva Carpeta</span>
          </button>

          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            className="hidden" 
            multiple 
            accept="image/*,video/*"
          />
          <button 
            onClick={handleUploadClick}
            disabled={uploading}
            className="px-5 py-2.5 bg-primary text-white font-semibold rounded-full hover:translate-y-[-1px] transition-all flex items-center gap-2 disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[18px]">
              {uploading ? 'hourglass_empty' : 'cloud_upload'}
            </span>
            <span>{uploading ? 'Subiendo...' : 'Subir Archivos'}</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="bg-surface-container-lowest rounded-2xl shadow-sm border border-slate-100 overflow-hidden min-h-[600px] flex flex-col">
        {/* Toolbar */}
        <div className="px-8 py-4 border-b border-slate-100 flex items-center justify-between bg-white/50 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-4 flex-wrap">
            {/* Search */}
            <div className="relative w-64">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">search</span>
              <input 
                type="text" 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nombre..." 
                className="w-full pl-10 pr-4 py-2 bg-surface-container-low rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all border border-transparent focus:bg-white"
              />
            </div>
            
            {/* Content Type Filters */}
            <div className="flex bg-surface-container-low p-1 rounded-xl">
              <button 
                onClick={() => setMediaFilter('all')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${mediaFilter === 'all' ? 'bg-white text-on-surface shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Todos
              </button>
              <button 
                onClick={() => setMediaFilter('photo')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${mediaFilter === 'photo' ? 'bg-white text-on-surface shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Fotos
              </button>
              <button 
                onClick={() => setMediaFilter('video')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${mediaFilter === 'video' ? 'bg-white text-on-surface shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Videos
              </button>
            </div>
          </div>
        </div>

        {/* Breadcrumbs Navigation */}
        <div className="px-8 py-3 bg-slate-50 border-b border-slate-100 flex items-center gap-2 text-sm font-medium text-slate-600">
          <button 
            onClick={() => setCurrentFolder('')}
            className="flex items-center gap-1 hover:text-primary transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">home</span>
            <span>Inicio</span>
          </button>
          
          {currentFolder && currentFolder.split('/').map((part, index, arr) => {
            const folderPath = arr.slice(0, index + 1).join('/');
            return (
              <React.Fragment key={folderPath}>
                <span className="material-symbols-outlined text-[16px] text-slate-400">chevron_right</span>
                <button 
                  onClick={() => setCurrentFolder(folderPath)}
                  className={`hover:text-primary transition-colors ${index === arr.length - 1 ? 'text-primary font-bold' : ''}`}
                >
                  {part}
                </button>
              </React.Fragment>
            );
          })}
        </div>

        {/* Grid Zone */}
        <div className="flex-1 p-8">
          {loading ? (
            <div className="h-full flex items-center justify-center text-slate-400">
              <p>Cargando directorio...</p>
            </div>
          ) : (
            <div>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                
                {/* Back / Up Folder Button */}
                {currentFolder && (
                   <div 
                    onClick={goUpOneFolder}
                    className="group aspect-square rounded-2xl border border-slate-200 bg-slate-50 flex flex-col items-center justify-center p-6 text-center hover:bg-slate-100 transition-all cursor-pointer shadow-sm"
                  >
                    <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center mb-3 text-slate-500 group-hover:-translate-y-1 transition-transform">
                      <span className="material-symbols-outlined text-2xl">arrow_upward</span>
                    </div>
                    <p className="text-sm font-bold text-slate-700">Regresar</p>
                  </div>
                )}

                {/* Upload Area inside grid */}
                <div 
                  onClick={handleUploadClick}
                  className="group aspect-square rounded-2xl border-2 border-dashed border-primary/30 bg-primary/5 flex flex-col items-center justify-center p-6 text-center hover:bg-primary/10 hover:border-primary/50 transition-all cursor-pointer"
                >
                  <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center mb-3 text-primary group-hover:scale-110 transition-transform">
                    <span className="material-symbols-outlined">add_photo_alternate</span>
                  </div>
                  <p className="text-sm font-bold text-slate-700">Subir archivo</p>
                  <p className="text-[10px] text-slate-400 mt-2 uppercase tracking-widest font-semibold">JPG, PNG, MP4</p>
                </div>

                {/* Folders */}
                {folders.map((folder) => (
                   <div 
                    key={folder.name}
                    onClick={() => setCurrentFolder(currentFolder ? `${currentFolder}/${folder.name}` : folder.name)}
                    className="group aspect-square rounded-2xl border border-slate-200 bg-white flex flex-col items-center justify-center p-6 text-center hover:bg-blue-50 hover:border-blue-200 transition-all cursor-pointer shadow-sm relative overflow-hidden"
                  >
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={(e) => handleDeleteFolder(folder.name, e)}
                        className="w-8 h-8 rounded-lg bg-rose-50 text-rose-500 flex items-center justify-center hover:bg-rose-500 hover:text-white transition-colors"
                        title="Eliminar carpeta y contenido"
                      >
                         <span className="material-symbols-outlined text-[16px]">
                          {deletingId === folder.name ? 'hourglass_empty' : 'delete'}
                        </span>
                      </button>
                    </div>

                    <div className="w-16 h-16 rounded-2xl bg-blue-100 flex items-center justify-center mb-3 text-blue-500 group-hover:scale-110 transition-transform shadow-inner">
                      <span className="material-symbols-outlined text-3xl">folder</span>
                    </div>
                    <p className="text-sm font-bold text-slate-800 line-clamp-2 px-2">{folder.name}</p>
                  </div>
                ))}

                {/* Files */}
                {filteredFiles.map((file) => (
                  <div key={file.id} className="group relative aspect-square rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 cursor-pointer hover:shadow-lg transition-all">
                    <ImagePreview 
                      item={file}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-4 flex flex-col justify-between">
                      <div className="flex justify-between items-start">
                        {file.mimetype?.startsWith('video/') && (
                           <div className="bg-black/50 backdrop-blur-sm rounded-md px-2 py-1 flex items-center gap-1 text-white">
                             <span className="material-symbols-outlined text-[12px]">play_circle</span>
                             <span className="text-[9px] font-bold tracking-widest uppercase">Video</span>
                           </div>
                        )}
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteFile(file);
                          }}
                          disabled={deletingId === file.id}
                          className="w-8 h-8 rounded-lg bg-rose-500/80 backdrop-blur-md text-white flex items-center justify-center hover:bg-rose-600 transition-colors disabled:opacity-50 ml-auto"
                        >
                          <span className="material-symbols-outlined text-[16px]">
                            {deletingId === file.id ? 'hourglass_empty' : 'delete'}
                          </span>
                        </button>
                      </div>
                      <div>
                        <p className="text-white text-xs font-bold truncate mb-1">{file.name.split('_').pop() || file.name}</p>
                        <div className="flex items-center gap-2">
                          <span className="px-1.5 py-0.5 rounded bg-white/20 text-white/90 text-[9px] font-mono backdrop-blur-sm">
                            {formatFileSize(file.size || 0)}
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-white/20 text-white/90 text-[9px] font-mono backdrop-blur-sm truncate">
                            {new Date(file.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

              </div>
              
              {filteredFiles.length === 0 && files.length > 0 && (
                <div className="mt-12 text-center text-slate-400 py-12">
                  <span className="material-symbols-outlined text-4xl mb-2">search_off</span>
                  <p>No se encontraron archivos con ese filtro.</p>
                </div>
              )}

              {folders.length === 0 && files.length === 0 && !loading && (
                 <div className="mt-12 text-center text-slate-400 py-12">
                 <span className="material-symbols-outlined text-5xl mb-4 opacity-50">folder_open</span>
                 <p className="text-lg font-bold text-slate-600">Esta carpeta está vacía</p>
                 <p className="text-sm mt-1">Sube archivos o crea subcarpetas aquí.</p>
               </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Create Folder Modal */}
      <AnimatePresence>
        {isCreatingFolder && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCreatingFolder(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-sm bg-surface-container-lowest rounded-3xl shadow-2xl p-6"
            >
              <h3 className="text-xl font-bold text-on-surface mb-4">Nueva Carpeta</h3>
              <form onSubmit={handleCreateFolder}>
                <input
                  autoFocus
                  type="text"
                  required
                  placeholder="Nombre de la carpeta"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  className="w-full p-3 bg-surface-container-low border border-slate-200 rounded-xl mb-6 outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsCreatingFolder(false)}
                    className="px-4 py-2 text-slate-500 font-bold hover:bg-slate-100 rounded-xl transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={uploading || !newFolderName.trim()}
                    className="px-4 py-2 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    {uploading ? 'Creando...' : 'Crear'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
