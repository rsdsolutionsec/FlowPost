import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { extractFilesFromZip, formatFileSize, treeToString, type ExtractResult, type FolderTree } from '../../lib/zipHandler';

interface UploadZipModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (extractResult: ExtractResult) => void;
  uploading?: boolean;
  progress?: number;
}

export default function UploadZipModal({ isOpen, onClose, onConfirm, uploading = false, progress = 0 }: UploadZipModalProps) {
  const [step, setStep] = useState<'select' | 'preview' | 'uploading'>('select');
  const [extractResult, setExtractResult] = useState<ExtractResult | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset cuando se cierra
  useEffect(() => {
    if (!isOpen) {
      setStep('select');
      setExtractResult(null);
      setError(null);
    }
  }, [isOpen]);

  const handleFileSelect = async (file: File) => {
    setProcessing(true);
    setError(null);

    try {
      const result = await extractFilesFromZip(file);

      if (!result.success) {
        setError(result.error || 'Error desconocido al procesar el ZIP');
        setProcessing(false);
        return;
      }

      setExtractResult(result);
      setStep('preview');
    } catch (err: any) {
      setError(`Error: ${err.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
    // Reset input para permitir seleccionar el mismo archivo de nuevo
    e.target.value = '';
  };

  const handleConfirm = () => {
    if (extractResult) {
      setStep('uploading');
      onConfirm(extractResult);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-slate-100 px-6 sm:px-10 py-6 flex items-center justify-between">
              <div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-on-surface">
                  {step === 'select' && 'Subir Carpeta (ZIP)'}
                  {step === 'preview' && 'Vista Previa'}
                  {step === 'uploading' && 'Cargando...'}
                </h2>
                <p className="text-slate-500 text-sm mt-1">
                  {step === 'select' && 'Selecciona un archivo ZIP con tus carpetas y archivos'}
                  {step === 'preview' && `${extractResult?.fileCount} archivos listos para cargar`}
                  {step === 'uploading' && 'Procesando tu carpeta...'}
                </p>
              </div>
              {step !== 'uploading' && (
                <button
                  onClick={onClose}
                  className="text-slate-400 hover:text-slate-900 transition-colors"
                >
                  <span className="material-symbols-outlined text-2xl">close</span>
                </button>
              )}
            </div>

            {/* Content */}
            <div className="px-6 sm:px-10 py-8">
              {step === 'select' && (
                <div className="space-y-6">
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-sm text-rose-700 flex items-start gap-3"
                    >
                      <span className="material-symbols-outlined text-xl flex-shrink-0 mt-0.5">error</span>
                      <div>
                        <p className="font-bold mb-1">Error al procesar ZIP</p>
                        <p className="text-xs whitespace-pre-wrap">{error}</p>
                      </div>
                    </motion.div>
                  )}

                  <div
                    className="relative border-2 border-dashed border-slate-200 rounded-2xl p-10 text-center hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer group"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {processing ? (
                      <div className="flex flex-col items-center justify-center gap-3">
                        <div className="w-12 h-12 border-4 border-primary/10 border-t-primary rounded-full animate-spin" />
                        <p className="text-slate-500 font-medium">Procesando archivo...</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center gap-4">
                        <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                          <span className="material-symbols-outlined text-4xl text-primary">folder_zip</span>
                        </div>
                        <div>
                          <p className="text-lg font-bold text-slate-900 mb-1">Selecciona tu archivo ZIP</p>
                          <p className="text-sm text-slate-500">O arrastra aquí (máximo 500MB)</p>
                        </div>
                        <div className="text-xs text-slate-400 font-medium">
                          Soporta: imágenes y videos en subcarpetas
                        </div>
                      </div>
                    )}

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".zip"
                      className="hidden"
                      onChange={handleFileInputChange}
                      disabled={processing}
                    />
                  </div>

                  {/* Drag & Drop Setup */}
                  <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const file = e.dataTransfer.files[0];
                      if (file && file.name.endsWith('.zip')) {
                        handleFileSelect(file);
                      }
                    }}
                    className="absolute inset-0 rounded-[2.5rem]"
                  />

                  <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-sm text-blue-900">
                    <div className="flex gap-3">
                      <span className="material-symbols-outlined text-xl flex-shrink-0">info</span>
                      <div>
                        <p className="font-bold mb-2">💡 Consejo:</p>
                        <p className="text-xs">Comprime tus carpetas con tu herramienta favorita (Windows, macOS, Linux) y sube el ZIP. La estructura de carpetas se preservará automáticamente.</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {step === 'preview' && extractResult && (
                <div className="space-y-6">
                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-slate-50 rounded-2xl p-4 text-center">
                      <p className="text-2xl font-black text-primary">{extractResult.fileCount}</p>
                      <p className="text-xs text-slate-600 font-bold mt-1">ARCHIVOS</p>
                    </div>
                    <div className="bg-slate-50 rounded-2xl p-4 text-center">
                      <p className="text-2xl font-black text-primary">
                        {extractResult.totalSize ? formatFileSize(extractResult.totalSize) : '0 B'}
                      </p>
                      <p className="text-xs text-slate-600 font-bold mt-1">TAMAÑO TOTAL</p>
                    </div>
                    <div className="bg-slate-50 rounded-2xl p-4 text-center">
                      <p className="text-2xl font-black text-primary">
                        {extractResult.tree?.children ? extractResult.tree.children.length : '0'}
                      </p>
                      <p className="text-xs text-slate-600 font-bold mt-1">CARPETAS</p>
                    </div>
                  </div>

                  {/* Tree View */}
                  {extractResult.tree && (
                    <div className="bg-slate-50 rounded-2xl p-6 font-mono text-xs overflow-x-auto">
                      <pre className="text-slate-700 whitespace-pre-wrap">
                        {treeToString(extractResult.tree)}
                      </pre>
                    </div>
                  )}

                  <div className="bg-green-50 border border-green-200 rounded-2xl p-4 text-sm text-green-900 flex items-start gap-3">
                    <span className="material-symbols-outlined text-xl flex-shrink-0 mt-0.5">check_circle</span>
                    <div>
                      <p className="font-bold">Todo está listo</p>
                      <p className="text-xs mt-1">Haz clic en "Confirmar" para comenzar la carga de {extractResult.fileCount} archivos.</p>
                    </div>
                  </div>
                </div>
              )}

              {step === 'uploading' && (
                <div className="flex flex-col items-center justify-center gap-6 py-12">
                  <div className="w-16 h-16 border-4 border-primary/10 border-t-primary rounded-full animate-spin" />
                  <div className="text-center">
                    <p className="font-bold text-slate-900 mb-1">Cargando archivo...</p>
                    <p className="text-sm text-slate-500 mb-6">
                      Esto puede tardar unos momentos dependiendo del tamaño
                    </p>
                    
                    {/* Progress Bar */}
                    <div className="w-full max-w-xs mx-auto">
                      <div className="bg-slate-200 rounded-full h-3 overflow-hidden mb-3">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${progress}%` }}
                          className="h-full bg-gradient-to-r from-primary to-primary/80 rounded-full transition-all"
                        />
                      </div>
                      <p className="text-lg font-bold text-primary">{progress}%</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            {step !== 'uploading' && (
              <div className="border-t border-slate-100 px-6 sm:px-10 py-6 flex items-center justify-end gap-3 bg-slate-50 rounded-b-[2.5rem]">
                <button
                  onClick={onClose}
                  disabled={processing}
                  className="px-6 py-3 bg-white text-slate-700 border border-slate-200 font-bold rounded-2xl hover:bg-slate-50 transition-all disabled:opacity-50"
                >
                  Cancelar
                </button>
                {step === 'preview' && (
                  <button
                    onClick={handleConfirm}
                    disabled={uploading}
                    className="px-6 py-3 bg-primary text-white font-bold rounded-2xl hover:shadow-lg hover:shadow-primary/20 transition-all flex items-center gap-2 disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-lg">upload</span>
                    Confirmar Carga
                  </button>
                )}
                {step === 'select' && (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={processing}
                    className="px-6 py-3 bg-primary text-white font-bold rounded-2xl hover:shadow-lg hover:shadow-primary/20 transition-all flex items-center gap-2 disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-lg">folder_open</span>
                    Seleccionar ZIP
                  </button>
                )}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
