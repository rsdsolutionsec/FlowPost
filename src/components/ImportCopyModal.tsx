import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';

interface ParsedCopy {
  name: string;
  content: string;
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      parseFile(selectedFile);
    }
  };

  const parseFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      let parsed: ParsedCopy[] = [];

      if (format === 'csv') {
        const lines = text.split(/\r?\n/).filter(l => l.trim());
        if (lines.length > 1) {
          // Skip header: name,content
          parsed = lines.slice(1).map((line, i) => {
            const [name, ...contentParts] = line.split(',');
            const content = contentParts.join(',').trim();
            return {
              name: name?.trim() || `Imported CSV ${i + 1}`,
              content: content.replace(/^"|"$/g, '') // Basic quote removal
            };
          });
        }
      } else {
        const lines = text.split(/\r?\n/).filter(l => l.trim());
        parsed = lines.map((line, i) => {
          const [name, ...contentParts] = line.split('|');
          const content = contentParts.join('|').trim();
          return {
            name: name?.trim() || `Imported TXT ${i + 1}`,
            content: content
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
        onSuccess();
      }
    } catch (error: any) {
      alert('Error en la importacin: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setFile(null);
    setPreview([]);
    setResult(null);
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
                      CSV (name,content)
                    </button>
                    <button
                      onClick={() => { setFormat('txt'); reset(); }}
                      className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                        format === 'txt' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400'
                      }`}
                    >
                      TXT (name | content)
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
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Vista Previa ({preview.length})</p>
                        <button onClick={reset} className="text-[10px] font-black text-rose-500 uppercase tracking-widest hover:underline">Limpiar</button>
                      </div>
                      <div className="border border-slate-100 rounded-2xl overflow-hidden overflow-y-auto max-h-48">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 sticky top-0">
                            <tr>
                              <th className="px-4 py-3 font-black text-slate-400 uppercase tracking-widest">Nombre</th>
                              <th className="px-4 py-3 font-black text-slate-400 uppercase tracking-widest">Contenido</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {preview.slice(0, 50).map((p, i) => (
                              <tr key={i}>
                                <td className="px-4 py-3 text-slate-900 font-bold truncate max-w-[120px]">{p.name}</td>
                                <td className="px-4 py-3 text-slate-500 truncate max-w-[200px]">{p.content}</td>
                              </tr>
                            ))}
                            {preview.length > 50 && (
                              <tr>
                                <td colSpan={2} className="px-4 py-2 text-center text-slate-300 font-medium italic">
                                  ... y {preview.length - 50} copys m s
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
                    <h4 className="text-2xl font-black text-slate-900 font-headline">Importacin Finalizada</h4>
                    <p className="text-slate-500 font-medium mt-1">
                      {result.imported} copys importados con xito. {result.failed > 0 && `${result.failed} fallaron.`}
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
