import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';

interface ImportCopyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface ParsedCopy {
  platform: string;
  name: string;
  content: string;
  suggested_at: string | null;
  media_path: string | null;
}

export default function ImportCopyModal({ isOpen, onClose, onSuccess }: ImportCopyModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [format, setFormat] = useState<'txt' | 'csv'>('txt');
  const [inputText, setInputText] = useState('');
  const [preview, setPreview] = useState<ParsedCopy[]>([]);
  const [result, setResult] = useState<{ imported: number; failed: number } | null>(null);

  const parseDate = (dStr: string) => {
    try {
      // Expecting YYYY-MM-DD/HH:mm or similar
      const clean = dStr.trim().replace('/', ' ');
      const d = new Date(clean);
      return isNaN(d.getTime()) ? null : d.toISOString();
    } catch {
      return null;
    }
  };

  const handleTextChange = (text: string) => {
    setInputText(text);
    if (!text.trim()) {
      setPreview([]);
      return;
    }

    let parsed: ParsedCopy[] = [];
    if (format === 'txt') {
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
              content: parts[2]?.trim() || '',
              suggested_at: parts[3] ? parseDate(parts[3]) : null,
              media_path: parts[4] ? parts[4].trim() : null
            };
          } else if (parts.length >= 2) {
            // Legacy format: Name|Content|Date|Path
            return {
              platform: 'facebook', // default
              name: parts[0].trim(),
              content: parts[1].trim(),
              suggested_at: parts[2] ? parseDate(parts[2]) : null,
              media_path: parts[3] ? parts[3].trim() : null
            };
          }
          return {
            platform: 'facebook',
            name: `Imported TXT ${i + 1}`,
            content: cleanLine,
            suggested_at: null,
            media_path: null
          };
        });
    } else {
      // Simple CSV (Name, Content)
      const lines = text.split('\n').filter(l => l.includes(','));
      parsed = lines.map((line, i) => {
        const [name, content] = line.split(',');
        return {
          platform: 'facebook',
          name: name?.trim() || `Imported CSV ${i + 1}`,
          content: content?.trim() || '',
          suggested_at: null,
          media_path: null
        };
      });
    }
    setPreview(parsed);
  };

  const handleImport = async () => {
    if (!user || preview.length === 0) return;
    setLoading(true);
    try {
      const res = await fetch('/api/copies/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          copies: preview
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Import failed');

      setResult({ imported: data.imported, failed: data.failed });
      setTimeout(() => {
        onSuccess();
      }, 2000);
    } catch (error: any) {
      alert('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setInputText('');
    setPreview([]);
    setResult(null);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-2xl bg-white rounded-[2.5rem] p-10 shadow-2xl overflow-hidden"
          >
            <div className="mb-8">
              <h2 className="text-2xl font-black text-slate-900 font-headline">Importar Biblioteca</h2>
              <p className="text-slate-400 text-sm font-medium">Carga masivamente tus copies maestros.</p>
            </div>

            <div className="space-y-6">
              {!result ? (
                <>
                  <div className="flex gap-4">
                    <button 
                      onClick={() => setFormat('txt')}
                      className={`flex-1 p-4 rounded-2xl border-2 transition-all font-black text-xs uppercase tracking-widest ${format === 'txt' ? 'border-primary bg-primary/5 text-primary' : 'border-slate-100 text-slate-400'}`}
                    >
                      Archivo TXT (|)
                    </button>
                    <button 
                      onClick={() => setFormat('csv')}
                      className={`flex-1 p-4 rounded-2xl border-2 transition-all font-black text-xs uppercase tracking-widest ${format === 'csv' ? 'border-primary bg-primary/5 text-primary' : 'border-slate-100 text-slate-400'}`}
                    >
                      Archivo CSV (,)
                    </button>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center px-1">
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                        Pega el contenido {format === 'txt' ? '(Formato: Red|Nombre|Contenido|Fecha|Media)' : '(Nombre, Contenido)'}
                      </label>
                      <span className="text-[10px] font-medium text-slate-300 italic">Formato fecha: 2024-03-25/14:00</span>
                    </div>
                    <textarea 
                      value={inputText}
                      onChange={(e) => handleTextChange(e.target.value)}
                      placeholder={format === 'txt' ? "I/F|Promo|Contenido...|2024-03-20/10:00|folder/img.png" : "Nombre, Contenido"}
                      className="w-full p-6 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-primary/20 min-h-[200px] text-sm font-medium resize-none shadow-inner"
                    />
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
                  <button onClick={onClose} className="px-10 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all">Continuar</button>
                </div>
              )}

              {!result && (
                <div className="pt-4 flex gap-4">
                  <button onClick={onClose} className="px-8 py-5 rounded-2xl font-black text-xs uppercase tracking-widest text-slate-400 hover:bg-slate-50 transition-colors">Cerrar</button>
                  <button 
                    onClick={handleImport}
                    disabled={loading || preview.length === 0}
                    className="flex-1 bg-primary text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-primary/90 transition-all shadow-xl shadow-primary/20 disabled:opacity-50 flex items-center justify-center gap-3"
                  >
                    {loading ? 'Procesando...' : (
                      <>
                        <span className="material-symbols-outlined text-lg">upload</span>
                        Importar Ahora
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
