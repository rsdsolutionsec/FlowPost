import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

function ImagePreview({ path, fileName }: { path: string; fileName: string }) {
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

  if (loading) {
    return (
      <div className="w-full h-full bg-slate-100 flex items-center justify-center animate-pulse">
        <span className="material-symbols-outlined text-slate-300">image</span>
      </div>
    );
  }

  if (!url) {
    return (
      <div className="w-full h-full bg-slate-100 flex items-center justify-center">
        <span className="material-symbols-outlined text-rose-300">broken_image</span>
      </div>
    );
  }

  return (
    <img 
      src={url} 
      alt={fileName} 
      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
      loading="lazy"
    />
  );
}

export default function MediaLibrary() {
  const { user } = useAuth();
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchMedia = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.storage.from('posts').list(user.id, {
        limit: 100,
        offset: 0,
        sortBy: { column: 'created_at', order: 'desc' }
      });
      if (error) throw error;
      if (data) {
        setFiles(data.filter(f => f.name !== '.emptyFolderPlaceholder'));
      }
    } catch (error) {
      console.error('Error fetching media:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMedia();
  }, [user]);

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
        const fileName = `${Math.random().toString(36).substring(2)}_${file.name.replace(/\s+/g, '')}`;
        const filePath = `${user.id}/${fileName}`;
        
        const { error } = await supabase.storage.from('posts').upload(filePath, file);
        if (error) throw error;
      }
      await fetchMedia();
    } catch (error: any) {
      alert('Error uploading file: ' + error.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (fileName: string) => {
    if (!user || !confirm('¿Estás seguro de que quieres eliminar este archivo? Esto podría afectar a los posts programados que lo usen.')) return;
    
    setDeletingId(fileName);
    try {
      const { error } = await supabase.storage.from('posts').remove([`${user.id}/${fileName}`]);
      if (error) throw error;
      setFiles(files.filter(f => f.name !== fileName));
    } catch (error: any) {
      alert('Error deleting file: ' + error.message);
    } finally {
      setDeletingId(null);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const filteredFiles = files.filter(f => f.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Header */}
      <div className="mb-12 flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-extrabold tracking-tight text-on-surface font-headline">Biblioteca de Medios</h2>
          <p className="text-slate-500 mt-2 font-medium">Sube, organiza y reutiliza tus imágenes y videos.</p>
        </div>
        <div className="flex gap-3">
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
          <div className="flex items-center gap-4">
            {/* Search */}
            <div className="relative w-64">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">search</span>
              <input 
                type="text" 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar archivos por nombre..." 
                className="w-full pl-10 pr-4 py-2 bg-surface-container-low rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all border border-transparent focus:bg-white"
              />
            </div>
            {/* Filters */}
            <div className="flex gap-2">
              <button className="px-3 py-1.5 bg-primary/10 text-primary text-xs font-bold rounded-lg border border-primary/10">Todos los Archivos ({files.length})</button>
            </div>
          </div>
        </div>

        {/* Drag & Drop Zone / Grid */}
        <div className="flex-1 p-8">
          {loading ? (
            <div className="h-full flex items-center justify-center text-slate-400">
              <p>Cargando biblioteca...</p>
            </div>
          ) : (
            <div>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                
                {/* Upload Area inside grid */}
                <div 
                  onClick={handleUploadClick}
                  className="group aspect-square rounded-2xl border-2 border-dashed border-primary/30 bg-primary/5 flex flex-col items-center justify-center p-6 text-center hover:bg-primary/10 hover:border-primary/50 transition-all cursor-pointer"
                >
                  <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center mb-3 text-primary group-hover:scale-110 transition-transform">
                    <span className="material-symbols-outlined">add_photo_alternate</span>
                  </div>
                  <p className="text-sm font-bold text-slate-700">Subir nuevo archivo</p>
                  <p className="text-[10px] text-slate-400 mt-2 uppercase tracking-widest font-semibold">JPG, PNG, MP4</p>
                </div>

                {filteredFiles.map((file) => (
                  <div key={file.id} className="group relative aspect-square rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 cursor-pointer hover:shadow-lg transition-all">
                    <ImagePreview path={`${user.id}/${file.name}`} fileName={file.name} />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-4 flex flex-col justify-between">
                      <div className="flex justify-end">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(file.name);
                          }}
                          disabled={deletingId === file.name}
                          className="w-8 h-8 rounded-lg bg-rose-500/80 backdrop-blur-md text-white flex items-center justify-center hover:bg-rose-600 transition-colors disabled:opacity-50"
                        >
                          <span className="material-symbols-outlined text-[16px]">
                            {deletingId === file.name ? 'hourglass_empty' : 'delete'}
                          </span>
                        </button>
                      </div>
                      <div>
                        <p className="text-white text-xs font-bold truncate mb-1">{file.name.split('_').pop() || file.name}</p>
                        <div className="flex items-center gap-2">
                          <span className="px-1.5 py-0.5 rounded bg-white/20 text-white/90 text-[9px] font-mono backdrop-blur-sm">
                            {formatFileSize(file.metadata?.size || 0)}
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
                  <p>No se encontraron archivos con ese nombre.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
