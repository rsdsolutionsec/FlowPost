import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export default function AssignCopies() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<any[]>([]);
  const [copies, setCopies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  
  // Modal state
  const [showAutoModal, setShowAutoModal] = useState(false);
  const [overwrite, setOverwrite] = useState(false);

  const fetchData = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const [postsRes, copiesRes] = await Promise.all([
        supabase
          .from('posts')
          .select('id, image_path, scheduled_at, copy_id, custom_caption, caption, status')
          .eq('user_id', user.id)
          .eq('status', 'scheduled')
          .order('scheduled_at', { ascending: true }),
        supabase
          .from('copies')
          .select('id, name, content')
          .eq('user_id', user.id)
          .order('created_at', { ascending: true })
      ]);

      if (postsRes.data) setPosts(postsRes.data);
      if (copiesRes.data) setCopies(copiesRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const getImageUrl = (path: string) => {
    if (!path) return '';
    const { data } = supabase.storage.from('posts').getPublicUrl(path);
    return data.publicUrl;
  };

  const handleManualAssign = async (postId: string, copyId: string) => {
    try {
      const { error } = await supabase
        .from('posts')
        .update({ copy_id: copyId || null, custom_caption: null, caption: null })
        .eq('id', postId);

      if (error) throw error;
      
      setPosts(posts.map(p => p.id === postId ? { ...p, copy_id: copyId || null, custom_caption: null, caption: null } : p));
      showToast('Copy asignado correctamente');
    } catch (error) {
      alert('Error updating copy');
      console.error(error);
    }
  };

  const handleAutoAssign = async () => {
    if (!user) return;
    setProcessing(true);
    try {
      const response = await fetch('/api/posts/assign-copies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, mode: 'auto', overwrite })
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Error al asignar copys');
      }

      showToast(`¡Completado! ${result.updated} posts fueron actualizados.`);
      await fetchData();
      setShowAutoModal(false);
    } catch (error: any) {
      alert(error.message);
    } finally {
      setProcessing(false);
    }
  };

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(''), 3000);
  };
  
  const formatDateDay = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });
  };
  
  const formatDateHour = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-on-surface tracking-tight font-headline">Asignación de Copys</h1>
          <p className="text-on-surface-variant font-medium mt-1">Organiza y asigna copys a tus publicaciones programadas</p>
        </div>
        <button
          onClick={() => setShowAutoModal(true)}
          disabled={posts.length === 0 || copies.length === 0}
          className="bg-primary text-white px-6 py-3 rounded-xl font-bold text-sm shadow-md hover:-translate-y-0.5 transition-all flex items-center gap-2 pr-5 disabled:opacity-50"
        >
          <span className="material-symbols-outlined text-lg">auto_awesome</span>
          <span>Asignación Inteligente</span>
        </button>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400">Cargando publicaciones...</div>
        ) : posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-16 text-center">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-4xl text-slate-300">calendar_month</span>
            </div>
            <h3 className="text-lg font-bold text-slate-700 mb-1">No hay posts programados</h3>
            <p className="text-slate-500 text-sm max-w-sm">Crea nuevas publicaciones para poder asignarles copys.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Imagen</th>
                  <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Fecha</th>
                  <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Estado de Copy</th>
                  <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Asignar Copy</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {posts.map((post) => {
                  const hasCopy = post.copy_id || post.custom_caption || post.caption;
                  
                  return (
                    <tr key={post.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 px-6">
                        <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-100 shadow-sm border border-slate-200">
                          <img src={getImageUrl(post.image_path)} alt="Post" className="w-full h-full object-cover" />
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-slate-700">
                            {formatDateDay(post.scheduled_at)}
                          </span>
                          <span className="text-xs font-medium text-slate-400">
                            {formatDateHour(post.scheduled_at)}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        {hasCopy ? (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100">
                            <span className="material-symbols-outlined text-[14px]">check_circle</span>
                            <span className="text-[10px] font-bold tracking-wide uppercase">Asignado</span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-600 border border-amber-100">
                            <span className="material-symbols-outlined text-[14px]">warning</span>
                            <span className="text-[10px] font-bold tracking-wide uppercase">Sin Asignar</span>
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        <select
                          value={post.copy_id || ''}
                          onChange={(e) => handleManualAssign(post.id, e.target.value)}
                          className="w-full max-w-[250px] p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                        >
                          <option value="">-- Seleccionar Copy --</option>
                          {copies.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                        {(post.custom_caption || post.caption) && !post.copy_id && (
                          <p className="text-[10px] text-slate-400 mt-1 italic">Tiene copy manual asignado.</p>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showAutoModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAutoModal(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-8">
                <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mb-6">
                  <span className="material-symbols-outlined text-primary text-2xl">magic_button</span>
                </div>
                
                <h3 className="text-xl font-bold text-slate-800 mb-2">Asignación Inteligente</h3>
                <p className="text-sm text-slate-500 mb-6 leading-relaxed">
                  El sistema distribuirá tus {copies.length} copys guardados de forma secuencial entre tus publicaciones programadas.
                </p>

                <label className="flex items-start gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100 cursor-pointer group hover:bg-slate-100 transition-colors">
                  <div className="relative flex items-center justify-center mt-1">
                    <input 
                      type="checkbox" 
                      className="peer sr-only"
                      checked={overwrite}
                      onChange={(e) => setOverwrite(e.target.checked)}
                    />
                    <div className="w-5 h-5 rounded-[6px] border-2 border-slate-300 peer-checked:bg-primary peer-checked:border-primary transition-colors flex items-center justify-center">
                      <span className="material-symbols-outlined text-[14px] text-white opacity-0 peer-checked:opacity-100 font-bold">check</span>
                    </div>
                  </div>
                  <div>
                    <span className="block text-sm font-bold text-slate-700">Sobrescribir existentes</span>
                    <span className="block text-xs text-slate-500 mt-0.5">Si se activa, reemplazará los copys de los posts que ya tienen uno asignado.</span>
                  </div>
                </label>

                <div className="mt-8 flex gap-3">
                  <button
                    onClick={() => setShowAutoModal(false)}
                    className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold text-sm rounded-xl hover:bg-slate-200 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleAutoAssign}
                    disabled={processing}
                    className="flex-1 py-3 bg-primary text-white font-bold text-sm rounded-xl hover:shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:hover:translate-y-0"
                  >
                    {processing ? 'Ejecutando...' : 'Asignar Copys'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed bottom-8 right-8 bg-slate-800 text-white px-6 py-3.5 rounded-2xl shadow-xl flex items-center gap-3 z-50"
          >
            <span className="material-symbols-outlined text-emerald-400 text-xl">check_circle</span>
            <span className="text-sm font-semibold tracking-wide">{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
