import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

interface ParsedCopy {
  name: string;
  content: string;
  suggested_at?: string | null;
  media_path?: string | null;
  platform?: string | null;
  status?: 'pending' | 'success' | 'error';
  error?: string;
}

interface ImportCopyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ImportCopyModal({ isOpen, onClose, onSuccess }: ImportCopyModalProps) {
  const { user } = useAuth();
  const [format, setFormat] = useState<'csv' | 'txt'>('csv');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ParsedCopy[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ imported: number; failed: number; errors: string[] } | null>(null);
  const [pages, setPages] = useState<any[]>([]);
  const [igAccounts, setIgAccounts] = useState<any[]>([]);
  const [selectedDestinations, setSelectedDestinations] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && user) {
      const fetchAccounts = async () => {
        const [pagesRes, igRes] = await Promise.all([
          supabase.from('facebook_pages').select('id, page_name').eq('user_id', user.id).eq('is_active', true),
          supabase.from('instagram_accounts').select('id, username').eq('user_id', user.id).eq('is_active', true)
        ]);
        if (pagesRes.data) setPages(pagesRes.data);
        if (igRes.data) setIgAccounts(igRes.data);
      };
      fetchAccounts();
    }
  }, [isOpen, user]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      parseFile(selectedFile);
    }
  };

  const parseFile = (file: File) => {
    const parseDate = (dateStr: string) => {
      if (!dateStr || !dateStr.trim()) return null;
      try {
        // Format expected: 2026-19-03/16:37 -> YYYY-DD-MM/HH:mm
        const [datePart, timePart] = dateStr.trim().split('/');
        if (!datePart) return null;
        
        const [year, day, month] = datePart.split('-');
        if (!year || !day || !month) return null;

        // JS Date prefers YYYY-MM-DD
        const isoString = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${timePart || '00:00'}:00`;
        const date = new Date(isoString);
        return isNaN(date.getTime()) ? null : date.toISOString();
      } catch (e) {
        return null;
      }
    };

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      let parsed: ParsedCopy[] = [];

      if (format === 'csv') {
        const lines = text.split(/\r?\n/).filter(l => l.trim());
        if (lines.length > 1) {
          parsed = lines.slice(1).map((line, i) => {
            const [name, content, date, path] = line.split(',');
            return {
              name: name?.trim() || `Imported CSV ${i + 1}`,
              content: content?.trim()?.replace(/^"|"$/g, '') || '',
              suggested_at: parseDate(date),
              media_path: path?.trim() || null
            };
          });
        }
      } else {
        // TXT format: Platform|Name|Content|Date|Path
        // Platform can be: I (Instagram), F (Facebook), I/F (both)
        const platformMap: Record<string, string> = {
          'I': 'instagram',
          'F': 'facebook',
          'I/F': 'both',
          'F/I': 'both',
          'I&F': 'both',
          'F&I': 'both',
        };
        const lines = text.split(/\r?\n/).filter(l => l.trim());
        parsed = lines.map((line, i) => {
          // Strip BOM and other invisible characters at start of file
          const cleanLine = line.replace(/^\uFEFF/, '').trim();
          const parts = cleanLine.split('|');
          
          // Normalize first part: trim and handle variations of I/F, I & F, etc.
          let firstPart = parts[0]?.trim().toUpperCase().replace(/\s+/g, '');
          if (firstPart === 'I/F' || firstPart === 'F/I' || firstPart === 'I&F' || firstPart === 'F&I') {
            firstPart = 'I/F';
          }

          const isPlatformPrefix = firstPart === 'I' || firstPart === 'F' || firstPart === 'I/F';

          if (isPlatformPrefix && parts.length >= 3) {
            // New format: Platform|Name|Content|Date|Path
            const platform = platformMap[firstPart] || 'facebook';
            return {
              platform,
              name: parts[1]?.trim() || `Imported TXT ${i + 1}`,
              content: parts[2]?.trim().replace(/\\n/g, '\n') || '',
              suggested_at: parts[3] ? parseDate(parts[3]) : null,
              media_path: parts[4] ? parts[4].trim() : null
            };
          } else if (parts.length >= 2) {
            // Legacy format: Name|Content|Date|Path
            return {
              platform: 'facebook', // default
              name: parts[0].trim(),
              content: parts[1].trim().replace(/\\n/g, '\n'),
              suggested_at: parts[2] ? parseDate(parts[2]) : null,
              media_path: parts[3] ? parts[3].trim() : null
            };
          }
          return {
            platform: 'facebook',
            name: `Imported TXT ${i + 1}`,
            content: cleanLine.replace(/\\n/g, '\n'),
            suggested_at: null,
            media_path: null
          };
        });
      }

      setPreview(parsed.filter(p => p.content));
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!user || preview.length === 0) return;

    setLoading(true);
    try {
      const response = await fetch('/api/copies/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          format,
          copies: preview
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.details || data.error);

      setResult(data);
      if (data.imported > 0) {
        if (selectedDestinations.length > 0 && data.importedCopies) {
          // Fetch media to map image URLs
          const { data: allMedia } = await supabase.from('media').select('name, url, path').eq('user_id', user.id);
          const mediaByExactPath = new Map<string, string>();
          const mediaByName = new Map<string, string>();
          
          (allMedia || []).forEach((m: any) => {
            const lowerName = m.name.toLowerCase();
            mediaByName.set(lowerName, m.url);
            if (m.path) mediaByExactPath.set(`${m.path}/${lowerName}`.toLowerCase(), m.url);
          });

          const postsToInsert: any[] = [];
          for (const copy of data.importedCopies) {
             let imageUrl = '';
             if (copy.media_path) {
               if (copy.media_path.startsWith('http')) imageUrl = copy.media_path;
               else {
                 const parts = copy.media_path.split('/');
                 const fileName = (parts.pop() || '').toLowerCase();
                 const hasFolder = parts.length > 0;
                 if (hasFolder) {
                   let expectedPath = parts.join('/');
                   if (!expectedPath.startsWith('root')) expectedPath = `root/${expectedPath}`;
                   imageUrl = mediaByExactPath.get(`${expectedPath}/${fileName}`.toLowerCase()) || mediaByName.get(fileName) || '';
                 } else imageUrl = mediaByName.get(fileName) || '';
               }
             }

             const scheduledAt = copy.suggested_at || new Date(Date.now() + 60 * 60 * 1000).toISOString();
             const copyPlatform = copy.platform || 'both';

             selectedDestinations.forEach(dest => {
               const [type, destId] = dest.split(':');
               if (type === 'fb' && (copyPlatform === 'facebook' || copyPlatform === 'both')) {
                  postsToInsert.push({ user_id: user.id, copy_id: copy.id, image_path: imageUrl, scheduled_at: scheduledAt, status: 'pending', platform: 'facebook', facebook_page_id: destId, instagram_account_id: null });
               } else if (type === 'ig' && (copyPlatform === 'instagram' || copyPlatform === 'both')) {
                  postsToInsert.push({ user_id: user.id, copy_id: copy.id, image_path: imageUrl, scheduled_at: scheduledAt, status: 'pending', platform: 'instagram', facebook_page_id: null, instagram_account_id: destId });
               }
             });
          }

          if (postsToInsert.length > 0) {
             await supabase.from('posts').insert(postsToInsert);
          }
        }
        onSuccess();
      }
    } catch (error: any) {
      alert('Error en la importación: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setFile(null);
    setPreview([]);
    setResult(null);
    setSelectedDestinations([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
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
            className="relative w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]"
          >
            <div className="p-8 space-y-6 flex-1 overflow-y-auto">
              <div className="flex justify-between items-center">
                <h3 className="text-2xl font-black text-slate-900 font-headline">Importar Copys</h3>
                <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-full transition-colors">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              {!result ? (
                <>
                  <div className="flex gap-4 p-1.5 bg-slate-50 rounded-2xl">
                    <button
                      onClick={() => { setFormat('csv'); reset(); }}
                      className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                        format === 'csv' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400'
                      }`}
                    >
                      CSV (name,content,date,path)
                    </button>
                    <button
                      onClick={() => { setFormat('txt'); reset(); }}
                      className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                        format === 'txt' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400'
                      }`}
                    >
                      TXT (I/F | Name | Content | Date | Path)
                    </button>
                  </div>

                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="border-4 border-dashed border-slate-100 rounded-[2rem] p-12 text-center space-y-4 hover:border-indigo-100 group cursor-pointer transition-all bg-slate-50/50"
                  >
                    <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mx-auto text-slate-300 group-hover:text-indigo-400 group-hover:scale-110 transition-all">
                      <span className="material-symbols-outlined text-4xl">upload_file</span>
                    </div>
                    <div>
                      <p className="text-slate-500 font-bold">
                        {file ? file.name : 'Haz click o arrastra tu archivo'}
                      </p>
                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">
                        Formato: {format.toUpperCase()}
                      </p>
                    </div>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleFileChange} 
                      accept={format === 'csv' ? '.csv' : '.txt'} 
                      className="hidden" 
                    />
                  </div>

                  {/* Target Destinations */}
                  <div className="space-y-3 p-4 bg-slate-50/50 rounded-3xl border border-slate-100">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                      Destinos Automáticos (Opcional)
                    </label>
                    <p className="text-xs text-slate-500 font-medium">
                      Selecciona cuentas para crear los posts en estado "Pendiente" automáticamente tras importar.
                    </p>
                    {pages.length > 0 || igAccounts.length > 0 ? (
                      <div className="grid grid-cols-2 gap-3 mt-2">
                        {pages.map(p => (
                          <label key={`fb:${p.id}`} className={`flex items-center gap-3 p-3 bg-white border rounded-xl cursor-pointer hover:border-blue-300 transition-all ${selectedDestinations.includes(`fb:${p.id}`) ? 'border-blue-400 shadow-sm' : 'border-slate-200'}`}>
                            <input 
                              type="checkbox" 
                              checked={selectedDestinations.includes(`fb:${p.id}`)}
                              onChange={(e) => {
                                if (e.target.checked) setSelectedDestinations([...selectedDestinations, `fb:${p.id}`]);
                                else setSelectedDestinations(selectedDestinations.filter(id => id !== `fb:${p.id}`));
                              }}
                              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                            />
                            <span className="material-symbols-outlined text-[18px] text-blue-500">thumb_up</span>
                            <span className="text-xs font-bold text-slate-700 truncate">{p.page_name}</span>
                          </label>
                        ))}
                        {igAccounts.map(ig => (
                          <label key={`ig:${ig.id}`} className={`flex items-center gap-3 p-3 bg-white border rounded-xl cursor-pointer hover:border-rose-300 transition-all ${selectedDestinations.includes(`ig:${ig.id}`) ? 'border-rose-400 shadow-sm' : 'border-slate-200'}`}>
                            <input 
                              type="checkbox" 
                              checked={selectedDestinations.includes(`ig:${ig.id}`)}
                              onChange={(e) => {
                                if (e.target.checked) setSelectedDestinations([...selectedDestinations, `ig:${ig.id}`]);
                                else setSelectedDestinations(selectedDestinations.filter(id => id !== `ig:${ig.id}`));
                              }}
                              className="w-4 h-4 rounded text-rose-500 focus:ring-rose-500 border-slate-300"
                            />
                            <span className="material-symbols-outlined text-[18px] text-rose-500">photo_camera</span>
                            <span className="text-xs font-bold text-slate-700 truncate">@{ig.username}</span>
                          </label>
                        ))}
                      </div>
                    ) : (
                       <div className="text-xs font-bold text-rose-500">No hay cuentas conectadas disponibles.</div>
                    )}
                  </div>

                  {preview.length > 0 && (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center px-2">
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Vista Previa ({preview.length})</p>
                        <button onClick={reset} className="text-[10px] font-black text-rose-500 uppercase tracking-widest hover:underline">Limpiar</button>
                      </div>
                      <div className="border border-slate-100 rounded-2xl overflow-hidden overflow-y-auto max-h-48">
                        <table className="w-full text-left text-[10px]">
                          <thead className="bg-slate-50 sticky top-0">
                            <tr>
                          <th className="px-4 py-3 font-black text-slate-400 uppercase tracking-widest">Plat.</th>
                              <th className="px-4 py-3 font-black text-slate-400 uppercase tracking-widest">Nombre</th>
                              <th className="px-4 py-3 font-black text-slate-400 uppercase tracking-widest">Contenido</th>
                              <th className="px-4 py-3 font-black text-slate-400 uppercase tracking-widest">Sugerido</th>
                              <th className="px-4 py-3 font-black text-slate-400 uppercase tracking-widest">Media</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {preview.slice(0, 50).map((p, i) => (
                              <tr key={i}>
                                <td className="px-4 py-3">
                                  <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${
                                    p.platform === 'both' ? 'bg-purple-100 text-purple-600' :
                                    p.platform === 'instagram' ? 'bg-pink-100 text-pink-600' :
                                    'bg-blue-100 text-blue-600'
                                  }`}>{p.platform === 'both' ? 'FB+IG' : p.platform === 'instagram' ? 'IG' : 'FB'}</span>
                                </td>
                                <td className="px-4 py-3 text-slate-900 font-bold truncate max-w-[100px]">{p.name}</td>
                                <td className="px-4 py-3 text-slate-500 truncate max-w-[150px]">{p.content}</td>
                                <td className="px-4 py-3 text-slate-400 font-medium whitespace-nowrap">
                                  {p.suggested_at ? new Date(p.suggested_at).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-'}
                                </td>
                                <td className="px-4 py-3 text-slate-400 truncate max-w-[100px]">{p.media_path || '-'}</td>
                              </tr>
                            ))}
                            {preview.length > 50 && (
                              <tr>
                                <td colSpan={4} className="px-4 py-2 text-center text-slate-300 font-medium italic">
                                  ... y {preview.length - 50} copys más
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="py-12 text-center space-y-6">
                  <div className={`w-20 h-20 rounded-[2rem] flex items-center justify-center mx-auto ${result.failed === 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                    <span className="material-symbols-outlined text-4xl">
                      {result.failed === 0 ? 'check_circle' : 'warning'}
                    </span>
                  </div>
                  <div>
                    <h4 className="text-2xl font-black text-slate-900 font-headline">Importación Finalizada</h4>
                    <p className="text-slate-500 font-medium mt-1">
                      {result.imported} copys importados con éxito. {result.failed > 0 && `${result.failed} fallaron.`}
                    </p>
                  </div>
                  {result.errors.length > 0 && (
                    <div className="bg-rose-50 p-4 rounded-2xl text-left max-h-32 overflow-y-auto">
                      <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest mb-2">Errores:</p>
                      <ul className="text-xs text-rose-500 space-y-1">
                        {result.errors.map((err, i) => <li key={i}>{err}</li>)}
                      </ul>
                    </div>
                  )}
                  <button 
                    onClick={onClose}
                    className="w-full py-4 bg-slate-900 text-white font-black rounded-2xl hover:bg-emerald-600 transition-all"
                  >
                    Cerrar
                  </button>
                </div>
              )}
            </div>

            {!result && preview.length > 0 && (
              <div className="p-8 bg-slate-50/50 border-t border-slate-100">
                <button
                  onClick={handleImport}
                  disabled={loading}
                  className="w-full py-4 bg-indigo-600 text-white font-black rounded-2xl hover:bg-slate-900 transition-all shadow-xl shadow-indigo-600/20 flex items-center justify-center gap-2"
                >
                  {loading ? 'Importando...' : (
                    <>
                      <span className="material-symbols-outlined text-[20px]">bolt</span>
                      <span>Importar {preview.length} Copys</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
