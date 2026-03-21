import React, { useState, useRef, useEffect, useMemo } from 'react';
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

interface PostPreview {
  accountType: 'facebook' | 'instagram';
  accountId: string;
  accountName: string;
  copyName: string;
  copyContent: string;
  copyPlatform: string;
  scheduledAt: string;
}

interface ImportResult {
  imported: number;
  failed: number;
  errors: string[];
  importedCopies: Array<{ id: string; name: string; platform: string; media_path?: string }>;
  createdPosts?: PostPreview[];
}

interface ImportCopyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ImportCopyModal({ isOpen, onClose, onSuccess }: ImportCopyModalProps) {
  const { user } = useAuth();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [format, setFormat] = useState<'csv' | 'txt'>('csv');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ParsedCopy[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
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

  // Generar preview de posts a crear basado en copys y destinos
  const postsPreview = useMemo(() => {
    const posts: PostPreview[] = [];
    
    preview.forEach(copy => {
      const copyPlatform = copy.platform || 'facebook';
      const scheduledAt = copy.suggested_at || new Date(Date.now() + 60 * 60 * 1000).toISOString();
      
      selectedDestinations.forEach(dest => {
        const [type, destId] = dest.split(':');
        
        // Determinar si este copy va a este destino basado en plataforma
        const isFb = type === 'fb';
        const isIg = type === 'ig';
        const isCompatible = 
          (isFb && (copyPlatform === 'facebook' || copyPlatform === 'both')) ||
          (isIg && (copyPlatform === 'instagram' || copyPlatform === 'both'));
        
        if (isCompatible) {
          if (isFb) {
            const account = pages.find(p => p.id === destId);
            if (account) {
              posts.push({
                accountType: 'facebook',
                accountId: destId,
                accountName: account.page_name,
                copyName: copy.name,
                copyContent: copy.content,
                copyPlatform,
                scheduledAt
              });
            }
          } else if (isIg) {
            const account = igAccounts.find(ig => ig.id === destId);
            if (account) {
              posts.push({
                accountType: 'instagram',
                accountId: destId,
                accountName: account.username,
                copyName: copy.name,
                copyContent: copy.content,
                copyPlatform,
                scheduledAt
              });
            }
          }
        }
      });
    });
    
    return posts;
  }, [preview, selectedDestinations, pages, igAccounts]);

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

      // Procesar creación de posts si hay destinos seleccionados
      if (data.imported > 0 && selectedDestinations.length > 0 && data.importedCopies) {
        // Fetch media para mapear URLs de imágenes
        const { data: allMedia } = await supabase.from('media').select('name, url, path').eq('user_id', user.id);
        const mediaByExactPath = new Map<string, string>();
        const mediaByName = new Map<string, string>();
        
        (allMedia || []).forEach((m: any) => {
          const lowerName = m.name.toLowerCase();
          mediaByName.set(lowerName, m.url);
          if (m.path) mediaByExactPath.set(`${m.path}/${lowerName}`.toLowerCase(), m.url);
        });

        const postsToInsert: any[] = [];
        const createdPostsList: PostPreview[] = [];

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
              const account = pages.find(p => p.id === destId);
              if (account) {
                postsToInsert.push({ user_id: user.id, copy_id: copy.id, image_path: imageUrl, scheduled_at: scheduledAt, status: 'pending', platform: 'facebook', facebook_page_id: destId, instagram_account_id: null });
                createdPostsList.push({
                  accountType: 'facebook',
                  accountId: destId,
                  accountName: account.page_name,
                  copyName: copy.name,
                  copyContent: copy.content,
                  copyPlatform,
                  scheduledAt
                });
              }
            } else if (type === 'ig' && (copyPlatform === 'instagram' || copyPlatform === 'both')) {
              const account = igAccounts.find(ig => ig.id === destId);
              if (account) {
                postsToInsert.push({ user_id: user.id, copy_id: copy.id, image_path: imageUrl, scheduled_at: scheduledAt, status: 'pending', platform: 'instagram', facebook_page_id: null, instagram_account_id: destId });
                createdPostsList.push({
                  accountType: 'instagram',
                  accountId: destId,
                  accountName: account.username,
                  copyName: copy.name,
                  copyContent: copy.content,
                  copyPlatform,
                  scheduledAt
                });
              }
            }
          });
        }

        if (postsToInsert.length > 0) {
          await supabase.from('posts').insert(postsToInsert);
        }

        data.createdPosts = createdPostsList;
      }

      setResult(data);
      setStep(3);
    } catch (error: any) {
      alert('Error en la importación: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setStep(1);
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
            {/* Header con indicador de pasos */}
            <div className="p-8 pb-4 border-b border-slate-100">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-black text-slate-900 font-headline">Importar Copys</h3>
                <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-full transition-colors">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              {/* Step Indicator */}
              <div className="flex items-center gap-2">
                {[1, 2, 3].map((stepNum) => (
                  <React.Fragment key={stepNum}>
                    <div className={`flex-1 h-1 rounded-full transition-all ${
                      stepNum <= step ? 'bg-indigo-600' : 'bg-slate-200'
                    }`} />
                    {stepNum < 3 && <div className="w-1" />}
                  </React.Fragment>
                ))}
              </div>
              <div className="flex gap-8 mt-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
                <span className={step >= 1 ? 'text-slate-900' : ''}>1. Cargar</span>
                <span className={step >= 2 ? 'text-slate-900' : ''}>2. Configurar</span>
                <span className={step >= 3 ? 'text-slate-900' : ''}>3. Resultados</span>
              </div>
            </div>

            {/* Content - Step 1: Upload */}
            {step === 1 && !result && (
              <div className="p-8 space-y-6 flex-1 overflow-y-auto">
                <div className="flex gap-4 p-1.5 bg-slate-50 rounded-2xl">
                  <button
                    onClick={() => setFormat('csv')}
                    className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                      format === 'csv' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400'
                    }`}
                  >
                    CSV (name,content,date,path)
                  </button>
                  <button
                    onClick={() => setFormat('txt')}
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

                {preview.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center px-2">
                      <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Vista Previa ({preview.length} copys)</p>
                      <button onClick={() => { setFile(null); setPreview([]); if (fileInputRef.current) fileInputRef.current.value = ''; }} className="text-[10px] font-black text-rose-500 uppercase tracking-widest hover:underline">Limpiar</button>
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
                              <td colSpan={5} className="px-4 py-2 text-center text-slate-300 font-medium italic">
                                ... y {preview.length - 50} copys más
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Content - Step 2: Configure Destinations */}
            {step === 2 && !result && (
              <div className="p-8 space-y-6 flex-1 overflow-y-auto">
                <div className="space-y-3">
                  <h4 className="text-xl font-black text-slate-900">Selecciona Destinos</h4>
                  <p className="text-sm text-slate-500 font-medium">
                    Elige cuentas para crear automáticamente los posts programados tras importar los copys.
                  </p>
                </div>

                {pages.length > 0 || igAccounts.length > 0 ? (
                  <div className="space-y-6">
                    {/* Facebook Pages */}
                    {pages.length > 0 && (
                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                          <span className="material-symbols-outlined text-[16px] text-blue-500">thumb_up</span>
                          Páginas de Facebook
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                          {pages.map(p => (
                            <label key={`fb:${p.id}`} className={`flex items-center gap-3 p-4 bg-white border-2 rounded-xl cursor-pointer transition-all ${selectedDestinations.includes(`fb:${p.id}`) ? 'border-blue-400 bg-blue-50 shadow-md' : 'border-slate-200 hover:border-blue-200'}`}>
                              <input 
                                type="checkbox" 
                                checked={selectedDestinations.includes(`fb:${p.id}`)}
                                onChange={(e) => {
                                  if (e.target.checked) setSelectedDestinations([...selectedDestinations, `fb:${p.id}`]);
                                  else setSelectedDestinations(selectedDestinations.filter(id => id !== `fb:${p.id}`));
                                }}
                                className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-slate-900 truncate">{p.page_name}</p>
                                <p className="text-[10px] text-slate-400">Facebook</p>
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Instagram Accounts */}
                    {igAccounts.length > 0 && (
                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                          <span className="material-symbols-outlined text-[16px] text-rose-500">photo_camera</span>
                          Cuentas de Instagram
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                          {igAccounts.map(ig => (
                            <label key={`ig:${ig.id}`} className={`flex items-center gap-3 p-4 bg-white border-2 rounded-xl cursor-pointer transition-all ${selectedDestinations.includes(`ig:${ig.id}`) ? 'border-rose-400 bg-rose-50 shadow-md' : 'border-slate-200 hover:border-rose-200'}`}>
                              <input 
                                type="checkbox" 
                                checked={selectedDestinations.includes(`ig:${ig.id}`)}
                                onChange={(e) => {
                                  if (e.target.checked) setSelectedDestinations([...selectedDestinations, `ig:${ig.id}`]);
                                  else setSelectedDestinations(selectedDestinations.filter(id => id !== `ig:${ig.id}`));
                                }}
                                className="w-5 h-5 rounded text-rose-500 focus:ring-rose-500 border-slate-300"
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-slate-900 truncate">@{ig.username}</p>
                                <p className="text-[10px] text-slate-400">Instagram</p>
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-rose-50 p-6 rounded-2xl text-center">
                    <p className="text-sm font-bold text-rose-700">No hay cuentas conectadas</p>
                    <p className="text-xs text-rose-600 mt-1">Conecta Facebook y/o Instagram en Configuración</p>
                  </div>
                )}

                {/* Posts Preview Summary */}
                {postsPreview.length > 0 && (
                  <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">
                        ✨ Vista Previa de Posts
                      </span>
                      <span className="text-lg font-black text-indigo-600">{postsPreview.length} Posts</span>
                    </div>
                    
                    <div className="border border-indigo-200 rounded-xl overflow-hidden overflow-y-auto max-h-64">
                      <table className="w-full text-left text-[10px]">
                        <thead className="bg-indigo-100 sticky top-0">
                          <tr>
                            <th className="px-3 py-2 font-black text-indigo-700 uppercase tracking-widest">Plataforma</th>
                            <th className="px-3 py-2 font-black text-indigo-700 uppercase tracking-widest">Cuenta</th>
                            <th className="px-3 py-2 font-black text-indigo-700 uppercase tracking-widest">Copy</th>
                            <th className="px-3 py-2 font-black text-indigo-700 uppercase tracking-widest">Hora</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-indigo-100">
                          {postsPreview.map((p, i) => (
                            <tr key={i} className="hover:bg-indigo-25">
                              <td className="px-3 py-2">
                                <span className={`text-[9px] font-black uppercase px-2 py-1 rounded ${
                                  p.accountType === 'facebook' ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700'
                                }`}>
                                  {p.accountType === 'facebook' ? 'FB' : 'IG'}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-slate-700 font-bold truncate max-w-[80px]">{p.accountName}</td>
                              <td className="px-3 py-2 text-slate-600 truncate max-w-[100px]">{p.copyName}</td>
                              <td className="px-3 py-2 text-slate-500 whitespace-nowrap text-[9px]">
                                {new Date(p.scheduledAt).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {selectedDestinations.length === 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                    <p className="text-sm font-bold text-amber-800">⚠️ Sin destinos seleccionados</p>
                    <p className="text-xs text-amber-700 mt-1">Los copys se importarán pero no se crearán posts automáticamente</p>
                  </div>
                )}
              </div>
            )}

            {/* Content - Step 3: Results */}
            {step === 3 && result && (
              <div className="p-8 space-y-8 flex-1 overflow-y-auto">
                {/* Import Summary */}
                <div className="space-y-4">
                  <div className={`flex items-center gap-4 p-5 rounded-2xl ${result.failed === 0 ? 'bg-emerald-50 border border-emerald-200' : 'bg-amber-50 border border-amber-200'}`}>
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${result.failed === 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                      <span className="material-symbols-outlined text-xl">
                        {result.failed === 0 ? 'check_circle' : 'warning'}
                      </span>
                    </div>
                    <div>
                      <p className={`font-black text-lg ${result.failed === 0 ? 'text-emerald-900' : 'text-amber-900'}`}>
                        {result.imported} copys importados
                      </p>
                      <p className={`text-sm ${result.failed === 0 ? 'text-emerald-700' : 'text-amber-700'}`}>
                        {result.failed > 0 && `${result.failed} fallaron. `}
                        Importación completada
                      </p>
                    </div>
                  </div>

                  {result.importedCopies && result.importedCopies.length > 0 && (
                    <div className="space-y-3">
                      <h5 className="text-xs font-black text-slate-500 uppercase tracking-widest">Copys Importados ({result.importedCopies.length})</h5>
                      <div className="border border-slate-100 rounded-xl overflow-hidden overflow-y-auto max-h-48">
                        <table className="w-full text-left text-[10px]">
                          <thead className="bg-slate-50 sticky top-0">
                            <tr>
                              <th className="px-3 py-2 font-black text-slate-400 uppercase tracking-widest">Plataforma</th>
                              <th className="px-3 py-2 font-black text-slate-400 uppercase tracking-widest">Nombre</th>
                              <th className="px-3 py-2 font-black text-slate-400 uppercase tracking-widest">Media</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {result.importedCopies.map((c, i) => (
                              <tr key={i}>
                                <td className="px-3 py-2">
                                  <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${
                                    c.platform === 'both' ? 'bg-purple-100 text-purple-600' :
                                    c.platform === 'instagram' ? 'bg-pink-100 text-pink-600' :
                                    'bg-blue-100 text-blue-600'
                                  }`}>{c.platform === 'both' ? 'FB+IG' : c.platform === 'instagram' ? 'IG' : 'FB'}</span>
                                </td>
                                <td className="px-3 py-2 text-slate-900 font-bold truncate">{c.name}</td>
                                <td className="px-3 py-2 text-slate-400 truncate">{c.media_path ? '✓' : '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>

                {/* Posts Created Summary */}
                {result.createdPosts && result.createdPosts.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center flex-shrink-0">
                        <span className="material-symbols-outlined">schedule</span>
                      </div>
                      <div>
                        <p className="font-black text-lg text-slate-900">
                          {result.createdPosts.length} posts programados
                        </p>
                        <p className="text-sm text-slate-500">Listos para publicarse en tus cuentas</p>
                      </div>
                    </div>

                    <div className="border border-slate-100 rounded-xl overflow-hidden overflow-y-auto max-h-48">
                      <table className="w-full text-left text-[10px]">
                        <thead className="bg-slate-50 sticky top-0">
                          <tr>
                            <th className="px-3 py-2 font-black text-slate-400 uppercase tracking-widest">Plataforma</th>
                            <th className="px-3 py-2 font-black text-slate-400 uppercase tracking-widest">Cuenta</th>
                            <th className="px-3 py-2 font-black text-slate-400 uppercase tracking-widest">Copy</th>
                            <th className="px-3 py-2 font-black text-slate-400 uppercase tracking-widest">Hora</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {result.createdPosts.map((p, i) => (
                            <tr key={i}>
                              <td className="px-3 py-2">
                                <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${
                                  p.accountType === 'facebook' ? 'bg-blue-100 text-blue-600' : 'bg-pink-100 text-pink-600'
                                }`}>{p.accountType === 'facebook' ? 'FB' : 'IG'}</span>
                              </td>
                              <td className="px-3 py-2 text-slate-900 font-bold truncate max-w-[80px]">{p.accountName}</td>
                              <td className="px-3 py-2 text-slate-600 truncate max-w-[100px]">{p.copyName}</td>
                              <td className="px-3 py-2 text-slate-500 whitespace-nowrap">
                                {new Date(p.scheduledAt).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Errors */}
                {result.errors && result.errors.length > 0 && (
                  <div className="space-y-3">
                    <h5 className="text-xs font-black text-rose-600 uppercase tracking-widest">⚠️ Errores ({result.errors.length})</h5>
                    <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 max-h-32 overflow-y-auto">
                      <ul className="text-xs text-rose-600 space-y-1">
                        {result.errors.map((err, i) => (
                          <li key={i} className="flex gap-2">
                            <span className="flex-shrink-0">•</span>
                            <span>{err}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Footer Buttons */}
            <div className="p-8 bg-slate-50/50 border-t border-slate-100 flex gap-3">
              {step === 1 && (
                <>
                  <button
                    onClick={onClose}
                    className="flex-1 py-4 bg-white text-slate-700 border border-slate-200 font-black rounded-2xl hover:bg-slate-50 transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => setStep(2)}
                    disabled={preview.length === 0}
                    className="flex-1 py-4 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <span>Continuar</span>
                    <span className="material-symbols-outlined">arrow_forward</span>
                  </button>
                </>
              )}

              {step === 2 && (
                <>
                  <button
                    onClick={() => setStep(1)}
                    className="flex-1 py-4 bg-white text-slate-700 border border-slate-200 font-black rounded-2xl hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined">arrow_back</span>
                    <span>Atrás</span>
                  </button>
                  <button
                    onClick={handleImport}
                    disabled={loading || preview.length === 0}
                    className="flex-1 py-4 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Importando...</span>
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined">upload</span>
                        <span>Importar {preview.length} Copys</span>
                      </>
                    )}
                  </button>
                </>
              )}

              {step === 3 && result && (
                <>
                  <button
                    onClick={reset}
                    className="flex-1 py-4 bg-white text-slate-700 border border-slate-200 font-black rounded-2xl hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined">add</span>
                    <span>Importar más</span>
                  </button>
                  <button
                    onClick={() => {
                      onSuccess();
                      onClose();
                    }}
                    className="flex-1 py-4 bg-emerald-600 text-white font-black rounded-2xl hover:bg-emerald-700 transition-all flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined">check_circle</span>
                    <span>Cerrar</span>
                  </button>
                </>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}