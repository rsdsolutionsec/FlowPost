import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import UploadZipModal from '../components/UploadZipModal';
import { type ExtractResult } from '../../lib/zipHandler';

interface MediaItem {
  id: string;
  name: string;
  url: string;
  mimetype: string;
  size: number;
  created_at: string;
  path: string;
}

export default function MediaLibrary() {
  const { user } = useAuth();
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPath, setCurrentPath] = useState('root');
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [showZipModal, setShowZipModal] = useState(false);
  const [zipUploading, setZipUploading] = useState(false);
  const [zipProgress, setZipProgress] = useState(0);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  useEffect(() => {
    if (user) {
      fetchMedia();
    }
  }, [user, currentPath]);

  const fetchMedia = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('media')
        .select('*')
        .eq('user_id', user?.id)
        .eq('path', currentPath)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      console.error('Error fetching media:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (files: FileList) => {
    if (!user) return;
    setUploading(true);
    
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;

        // 1. Get presigned URL
        const presignRes = await fetch('/api/media/presign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename: filePath, contentType: file.type })
        });
        
        if (!presignRes.ok) throw new Error('Failed to get upload URL');
        const { url, publicUrl } = await presignRes.json();

        // 2. Upload to R2
        const uploadRes = await fetch(url, {
          method: 'PUT',
          headers: { 'Content-Type': file.type },
          body: file
        });

        if (!uploadRes.ok) throw new Error('Failed to upload to storage');

        // 3. Save to database
        const { error: dbError } = await supabase.from('media').insert({
          user_id: user.id,
          name: file.name,
          url: publicUrl,
          mimetype: file.type,
          size: file.size,
          path: currentPath
        });

        if (dbError) throw dbError;
      }
      fetchMedia();
    } catch (error: any) {
      alert('Error uploading: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  // Función para crear la estructura de carpetas en BD antes de subir los archivos del ZIP
  const createFolderStructure = async (folderPaths: string[]): Promise<void> => {
    if (!user) return;

    for (const folderPath of folderPaths) {
      const parts = folderPath.split('/');
      const folderName = parts[parts.length - 1]; // Last part is the folder name
      const parentPath = parts.slice(0, -1).join('/') || currentPath; // Parent path, default to currentPath

      // Only create if parent path equals currentPath or a valid parent
      // This ensures we create in the right hierarchy
      if (parentPath === currentPath || parts.length - 1 === 0) {
        try {
          await supabase.from('media').insert({
            user_id: user.id,
            name: folderName,
            mimetype: 'folder',
            path: parentPath === currentPath ? currentPath : currentPath + (currentPath === 'root' ? '' : '/') + parentPath,
            url: '',
            size: 0
          });
        } catch (error: any) {
          // Ignorar si ya existe
          if (!error.message.includes('duplicate')) {
            console.error('Error creating folder:', error);
          }
        }
      }
    }

    // Second pass: create all the nested folders
    const createdPaths = new Set([currentPath]);
    for (const folderPath of folderPaths.sort()) {
      const parts = folderPath.split('/');
      
      // Create each intermediate folder
      for (let i = 1; i <= parts.length; i++) {
        const currentFolder = parts.slice(0, i).join('/');
        const folderName = parts[i - 1];
        
        if (!createdPaths.has(currentFolder)) {
          const parentFolderPath = i === 1 
            ? currentPath 
            : currentPath === 'root' 
              ? parts.slice(0, i - 1).join('/') 
              : currentPath + '/' + parts.slice(0, i - 1).join('/');

          try {
            await supabase.from('media').insert({
              user_id: user.id,
              name: folderName,
              mimetype: 'folder',
              path: parentFolderPath,
              url: '',
              size: 0
            });
            createdPaths.add(currentFolder);
          } catch (error: any) {
            // Ignorar si ya existe
            if (!error.message.includes('duplicate')) {
              console.error('Error creating folder:', error);
            }
          }
        }
      }
    }
  };

  // Función para manejar la carga de ZIP
  const handleZipUpload = async (extractResult: ExtractResult) => {
    if (!user) return;

    try {
      setZipUploading(true);
      const { extractFolderStructure } = await import('../../lib/zipHandler');

      // Paso 1: Crear estructura de carpetas
      const folderPaths = extractFolderStructure(extractResult.files);
      if (folderPaths.length > 0) {
        await createFolderStructure(folderPaths);
      }

      // Paso 2: Subir todos los archivos preservando la estructura
      for (let i = 0; i < extractResult.files.length; i++) {
        const { path, file } = extractResult.files[i];

        // Construir el path en R2: user_id/folder1/subfolder2/filename.ext
        const fileExt = file.name.split('.').pop() || '';
        const randomId = Math.random().toString(36).substring(2);
        const fileName = `${randomId}_${Date.now()}.${fileExt}`;
        
        // Get the directory path (everything except the filename)
        const lastSlashIndex = path.lastIndexOf('/');
        const dirPath = lastSlashIndex >= 0 ? path.substring(0, lastSlashIndex) : '';
        
        // Build R2 path, avoiding double slashes
        const r2Path = dirPath 
          ? `${user.id}/${dirPath}/${fileName}`
          : `${user.id}/${fileName}`;

        // Determine correct MIME type from extension
        const { getMimeTypeFromExtension } = await import('../../lib/zipHandler');
        const mimeType = getMimeTypeFromExtension(file.name) || file.type || 'application/octet-stream';

        // 1. Get presigned URL
        const presignRes = await fetch('/api/media/presign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename: r2Path, contentType: mimeType })
        });

        if (!presignRes.ok) {
          const errorData = await presignRes.json().catch(() => ({}));
          throw new Error(`Failed to get upload URL: ${errorData.error || presignRes.statusText}`);
        }
        const { url, publicUrl } = await presignRes.json();

        // 2. Upload to R2
        const uploadRes = await fetch(url, {
          method: 'PUT',
          headers: { 'Content-Type': file.type },
          body: file
        });

        if (!uploadRes.ok) throw new Error('Failed to upload to storage');

        // 3. Determine the folder path in DB
        // If extracting from root of ZIP structure, use currentPath
        // Otherwise build relative to currentPath
        let mediaFolderPath: string;
        if (dirPath) {
          mediaFolderPath = currentPath === 'root' 
            ? dirPath 
            : currentPath + '/' + dirPath;
        } else {
          mediaFolderPath = currentPath;
        }

        // 4. Save to database
        const { error: dbError } = await supabase.from('media').insert({
          user_id: user.id,
          name: file.name,
          url: publicUrl,
          mimetype: file.type,
          size: file.size,
          path: mediaFolderPath
        });

        if (dbError) throw dbError;
      }

      setShowZipModal(false);
      setZipProgress(0);
      fetchMedia();
      alert(`✅ Carpeta cargada exitosamente con ${extractResult.fileCount} archivos`);
    } catch (error: any) {
      alert('Error cargando ZIP: ' + error.message);
      console.error(error);
    } finally {
      setZipUploading(false);
      setZipProgress(0);
    }
  };

  // Función para eliminar items seleccionados
  const deleteSelectedItems = async () => {
    if (selectedItems.size === 0) return;
    
    const message = `¿Eliminar ${selectedItems.size} elemento(s)? Esta acción no se puede deshacer.`;
    if (!confirm(message)) return;

    try {
      const selectedArray = Array.from(selectedItems);
      
      // Eliminar archivos de R2
      for (const id of selectedArray) {
        const item = items.find(i => i.id === id);
        if (item?.url && item.mimetype !== 'folder') {
          const filename = item.url.split('/').pop();
          await fetch('/api/media/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filename: `${user?.id}/${filename}` })
          }).catch(() => {});
        }
      }

      // Eliminar de BD
      for (const id of selectedArray) {
        await supabase.from('media').delete().eq('id', id);
      }

      setSelectedItems(new Set());
      fetchMedia();
      alert(`✅ ${selectedArray.length} elemento(s) eliminado(s) exitosamente.`);
    } catch (error: any) {
      alert('Error eliminando: ' + error.message);
    }
  };

  const toggleItemSelection = (id: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedItems(newSelected);
  };

  const selectAllInView = () => {
    if (selectedItems.size === filteredItems.length && selectedItems.size > 0) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(filteredItems.map(item => item.id)));
    }
  };

  const deleteItem = async (item: MediaItem) => {
    if (!confirm('¿Eliminar este archivo permanentemente?')) return;
    
    try {
      // 1. Delete from R2 via API
      const filename = item.url.split('/').pop();
      const deleteRes = await fetch('/api/media/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: `${user?.id}/${filename}` })
      });

      if (!deleteRes.ok) throw new Error('Failed to delete from storage');

      // 2. Delete from DB
      const { error } = await supabase.from('media').delete().eq('id', item.id);
      if (error) throw error;
      
      setItems(items.filter(i => i.id !== item.id));
    } catch (error: any) {
      alert('Error deleting: ' + error.message);
    }
  };

  // Función para eliminar carpeta y todos sus archivos
  const deleteFolder = async (folder: MediaItem) => {
    const message = `¿Eliminar la carpeta "${folder.name}" y TODOS sus archivos?\n\nEsta acción no se puede deshacer.`;
    if (!confirm(message)) return;

    try {
      // 1. Obtener todos los archivos dentro de esta carpeta y subcarpetas
      const { data: allItems, error: fetchError } = await supabase
        .from('media')
        .select('*')
        .eq('user_id', user?.id);

      if (fetchError) throw fetchError;

      // Filter items that are in this folder
      const itemsToDelete = allItems?.filter(item => 
        item.id === folder.id || 
        item.path === folder.name || 
        item.path?.startsWith(folder.name + '/') ||
        item.path?.includes('/' + folder.name)
      ) || [];

      // 2. Eliminar archivos de R2 (solo los que tengan URL)
      for (const item of itemsToDelete) {
        if (item.url && item.mimetype !== 'folder') {
          const filename = item.url.split('/').pop();
          await fetch('/api/media/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filename: `${user?.id}/${filename}` })
          }).catch(() => {});
        }
      }

      // 3. Eliminar la carpeta y todos sus contenidos de BD
      for (const item of itemsToDelete) {
        await supabase.from('media').delete().eq('id', item.id);
      }

      fetchMedia();
      alert(`Carpeta "${folder.name}" y su contenido eliminado exitosamente.`);
    } catch (error: any) {
      alert('Error eliminando carpeta: ' + error.message);
    }
  };

  // Función para renombrar carpeta
  const renameFolder = async (folder: MediaItem) => {
    const newName = prompt(`Renombrar carpeta:\n\nNombre actual: ${folder.name}`, folder.name);
    if (!newName || newName === folder.name || !user) return;

    try {
      // 1. Validar que el nuevo nombre no exista en el mismo nivel
      const { data: existing } = await supabase
        .from('media')
        .select('id')
        .eq('user_id', user.id)
        .eq('path', folder.path)
        .eq('name', newName)
        .eq('mimetype', 'folder');

      if (existing && existing.length > 0) {
        alert('Ya existe una carpeta con ese nombre en esta ubicación.');
        return;
      }

      // 2. Obtener todos los archivos dentro de esta carpeta (incluyendo subcarpetas)
      const { data: allItems, error: fetchError } = await supabase
        .from('media')
        .select('*')
        .eq('user_id', user.id)
        .or(`id.eq.${folder.id},path.ilike.${folder.name}%`);

      if (fetchError) throw fetchError;

      // 3. Actualizar la carpeta raíz
      const { error: updateError } = await supabase
        .from('media')
        .update({ name: newName })
        .eq('id', folder.id);

      if (updateError) throw updateError;

      // 4. Actualizar el path de todos los archivos/carpetas dentro
      if (allItems) {
        for (const item of allItems) {
          if (item.path && item.path.startsWith(folder.name)) {
            const newPath = item.path.replace(new RegExp(`^${folder.name}`), newName);
            await supabase
              .from('media')
              .update({ path: newPath })
              .eq('id', item.id)
              .catch(() => {});
          }
        }
      }

      fetchMedia();
      alert(`Carpeta renombrada a "${newName}" exitosamente.`);
    } catch (error: any) {
      alert('Error renombrando carpeta: ' + error.message);
    }
  };

  const createFolder = async () => {
    const name = prompt('Nombre de la carpeta:');
    if (!name || !user) return;
    
    try {
      const { error } = await supabase.from('media').insert({
        user_id: user.id,
        name,
        mimetype: 'folder',
        path: currentPath,
        url: '', // Folders don't have URLs
        size: 0
      });
      if (error) throw error;
      fetchMedia();
    } catch (error: any) {
      alert(error.message);
    }
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'all' || 
                       (typeFilter === 'image' && item.mimetype.startsWith('image/')) ||
                       (typeFilter === 'video' && item.mimetype.startsWith('video/')) ||
                       (typeFilter === 'folder' && item.mimetype === 'folder');
    return matchesSearch && matchesType;
  });

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="px-4 sm:px-0"
    >
      <div className="mb-8 sm:mb-12 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6">
        <div>
          <div className="flex items-center gap-2 text-slate-400 text-[10px] sm:text-xs font-bold tracking-widest uppercase mb-2">
            <span>Contenido</span>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span className="text-primary">Media Library</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-on-surface font-headline leading-tight">
            Biblioteca de Medios
          </h2>
          <p className="text-slate-500 mt-2 font-medium text-sm sm:text-base">Gestiona tus imágenes y videos para publicaciones.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <button 
            onClick={createFolder}
            className="px-6 py-3 bg-white text-slate-700 border border-slate-200 font-bold rounded-2xl hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
          >
             <span className="material-symbols-outlined text-[20px]">create_new_folder</span>
             <span className="text-sm">Nueva Carpeta</span>
          </button>
          <button 
            onClick={() => setShowZipModal(true)}
            disabled={uploading || zipUploading}
            className="px-6 py-3 bg-white text-slate-700 border border-slate-200 font-bold rounded-2xl hover:bg-slate-50 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
             <span className="material-symbols-outlined text-[20px]">folder_zip</span>
             <span className="text-sm">Subir Carpeta (ZIP)</span>
          </button>
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || zipUploading}
            className="px-6 py-3 bg-primary text-white font-bold rounded-2xl hover:translate-y-[-1px] transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20 disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[20px]">cloud_upload</span>
            <span className="text-sm">{uploading ? 'Subiendo...' : 'Subir Medios'}</span>
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            multiple 
            onChange={(e) => e.target.files && handleUpload(e.target.files)} 
          />
        </div>
      </div>

      {/* Toolbar & Filter */}
      <div className="mb-8 lg:mb-10 flex flex-col lg:flex-row gap-6">
        <div className="flex-1 relative">
           <span className="absolute left-5 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400">search</span>
           <input 
             type="text" 
             placeholder="Buscar archivos por nombre..."
             value={searchQuery}
             onChange={(e) => setSearchQuery(e.target.value)}
             className="w-full pl-14 pr-6 py-4 bg-white border border-slate-100 rounded-[1.5rem] sm:rounded-[2rem] shadow-sm focus:ring-2 focus:ring-primary/10 transition-all text-sm font-medium"
           />
        </div>
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 lg:pb-0">
           {['all', 'image', 'video', 'folder'].map(filter => (
             <button
               key={filter}
               onClick={() => setTypeFilter(filter)}
               className={`px-6 py-4 rounded-2xl sm:rounded-3xl text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                 typeFilter === filter 
                   ? 'bg-slate-900 text-white shadow-lg' 
                   : 'bg-white text-slate-500 border border-slate-100 hover:bg-slate-50'
               }`}
             >
               {filter === 'all' ? 'Todo' : filter === 'folder' ? 'Carpetas' : filter}
             </button>
           ))}
           
           {/* Selection buttons */}
           <button
             onClick={selectAllInView}
             className="px-6 py-4 rounded-2xl sm:rounded-3xl text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap bg-white text-slate-500 border border-slate-100 hover:bg-slate-50"
           >
             {selectedItems.size === 0 ? 'Seleccionar' : `${selectedItems.size} Seleccionados`}
           </button>
           
           {selectedItems.size > 0 && (
             <button
               onClick={deleteSelectedItems}
               className="px-6 py-4 rounded-2xl sm:rounded-3xl text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap bg-rose-500 text-white hover:bg-rose-600 shadow-lg shadow-rose-500/20"
             >
               Eliminar {selectedItems.size}
             </button>
           )}
        </div>
      </div>

      {/* Drop Zone */}
      <div 
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragActive(false);
          if (e.dataTransfer.files) handleUpload(e.dataTransfer.files);
        }}
        className={`relative min-h-[500px] border-2 border-dashed rounded-[2.5rem] sm:rounded-[3rem] p-4 sm:p-8 transition-all ${
          dragActive ? 'border-primary bg-primary/5 ring-4 ring-primary/5' : 'border-slate-100'
        }`}
      >
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-12 h-12 border-4 border-primary/10 border-t-primary rounded-full animate-spin" />
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
             <div className="w-24 h-24 bg-slate-50 rounded-[2rem] flex items-center justify-center mb-6">
               <span className="material-symbols-outlined text-4xl text-slate-200">folder_open</span>
             </div>
             <p className="text-sm font-bold uppercase tracking-widest italic">La biblioteca está vacía</p>
             <p className="text-xs font-medium mt-1">Arrastra archivos aquí para subirlos</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-8">
             {filteredItems.map((item) => (
                <MediaCard 
                  key={item.id} 
                  item={item} 
                  onDelete={() => deleteItem(item)}
                  onFolderDelete={() => deleteFolder(item)}
                  onFolderRename={() => renameFolder(item)}
                  isSelected={selectedItems.has(item.id)}
                  onSelect={() => toggleItemSelection(item.id)}
                  onClick={() => {
                    if (item.mimetype === 'folder') {
                       setCurrentPath(item.name);
                    }
                  }}
                />
             ))}
          </div>
        )}
      </div>

      {/* Breadcrumbs for folder navigation */}
      {currentPath !== 'root' && (
        <div className="mt-8 flex items-center gap-3">
           <button 
             onClick={() => setCurrentPath('root')}
             className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-all"
           >
             Volver a raíz
           </button>
           <div className="flex items-center gap-2 text-slate-400">
             <span className="material-symbols-outlined text-sm">folder_open</span>
             <span className="text-xs font-medium">{currentPath}</span>
           </div>
        </div>
      )}

      {/* ZIP Modal */}
      <UploadZipModal 
        isOpen={showZipModal}
        onClose={() => setShowZipModal(false)}
        onConfirm={handleZipUpload}
        uploading={zipUploading}
        progress={zipProgress}
      />
    </motion.div>
  );
}

function MediaCard({ item, onDelete, onFolderDelete, onFolderRename, onClick, isSelected = false, onSelect }: { item: MediaItem, onDelete: () => void, onFolderDelete?: () => void, onFolderRename?: () => void, onClick: () => void, isSelected?: boolean, onSelect?: () => void }) {
  const isVideo = item.mimetype.startsWith('video/');
  const isFolder = item.mimetype === 'folder';

  return (
    <motion.div 
      layout
      className={`group relative bg-white rounded-[2rem] sm:rounded-[2.5rem] shadow-sm hover:shadow-2xl hover:translate-y-[-4px] border-2 transition-all overflow-hidden aspect-square cursor-pointer ${
        isSelected ? 'border-primary shadow-lg shadow-primary/20' : 'border-slate-100'
      }`}
      onClick={onClick}
    >
      {isFolder ? (
        <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50 text-slate-400 group-hover:bg-primary/5 transition-colors">
          <span className="material-symbols-outlined text-5xl mb-2 group-hover:scale-110 transition-transform">folder</span>
          <p className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-slate-900 px-4 text-center truncate w-full">
            {item.name}
          </p>
          
          {/* Checkbox Overlay */}
          <div 
            onClick={(e) => { e.stopPropagation(); onSelect?.(); }}
            className={`absolute top-3 right-3 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all cursor-pointer ${
              isSelected 
                ? 'bg-primary border-primary' 
                : 'bg-white/80 border-slate-300 group-hover:bg-white group-hover:border-primary'
            }`}>
            {isSelected && (
              <span className="material-symbols-outlined text-sm text-white">check</span>
            )}
          </div>
          
          {/* Carpeta Overlay Actions */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
            <div className="flex items-center gap-2">
              <button 
                onClick={(e) => { e.stopPropagation(); onFolderRename?.(); }}
                className="bg-blue-500/80 backdrop-blur-md hover:bg-blue-600 text-white p-3 rounded-xl transition-all shadow-lg"
                title="Renombrar carpeta"
              >
                <span className="material-symbols-outlined text-lg">edit</span>
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); onFolderDelete?.(); }}
                className="bg-rose-500/80 backdrop-blur-md hover:bg-rose-600 text-white p-3 rounded-xl transition-all shadow-lg"
                title="Eliminar carpeta y contenido"
              >
                <span className="material-symbols-outlined text-lg">delete</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          {isVideo ? (
            <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-white">
              <span className="material-symbols-outlined text-4xl mb-2 opacity-60">movie_filter</span>
              <p className="text-[10px] font-black uppercase tracking-widest">{item.name.split('.').pop()}</p>
            </div>
          ) : (
            <img 
              src={item.url} 
              alt={item.name}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
            />
          )}

          {/* Checkbox Overlay */}
          <div 
            onClick={(e) => { e.stopPropagation(); onSelect?.(); }}
            className={`absolute top-3 right-3 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all z-10 cursor-pointer ${
              isSelected 
                ? 'bg-primary border-primary' 
                : 'bg-white/80 border-slate-300 group-hover:bg-white group-hover:border-primary'
            }`}>
            {isSelected && (
              <span className="material-symbols-outlined text-sm text-white">check</span>
            )}
          </div>

          {/* Overlay Actions */}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-4 flex flex-col justify-end text-white h-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
             <p className="text-[10px] font-bold truncate leading-tight mb-2">{item.name}</p>
             <div className="flex items-center gap-2">
                <button 
                  onClick={(e) => { e.stopPropagation(); window.open(item.url, '_blank'); }}
                  className="bg-white/20 backdrop-blur-md hover:bg-white text-white hover:text-slate-900 p-2 rounded-xl transition-all"
                >
                  <span className="material-symbols-outlined text-sm">visibility</span>
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); onDelete(); }}
                  className="bg-rose-500/20 backdrop-blur-md hover:bg-rose-500 text-white p-2 rounded-xl transition-all"
                >
                  <span className="material-symbols-outlined text-sm">delete</span>
                </button>
             </div>
          </div>

          <div className="absolute top-4 right-4 px-2 py-1 bg-white/60 backdrop-blur-md rounded-lg text-[8px] font-black uppercase tracking-widest text-slate-900 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">
             {(item.size / 1024 / 1024).toFixed(1)} MB
          </div>
        </>
      )}
    </motion.div>
  );
}
