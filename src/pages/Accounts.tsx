import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface FacebookPage {
  id: string;
  page_id: string;
  page_name: string;
  page_image_url: string;
  is_active: boolean;
  created_at: string;
}

export default function Accounts() {
  const { user } = useAuth();
  const [pages, setPages] = useState<FacebookPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [newAccount, setNewAccount] = useState({ token: '', id: '', name: '' });

  const fetchPages = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('facebook_pages')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPages(data || []);
    } catch (error: any) {
      console.error('Error fetching pages:', error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPages();
  }, [user]);

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccount.token || !newAccount.id || !newAccount.name) return;
    
    setIsConnecting(true);
    try {
      const { error } = await supabase.from('facebook_pages').insert([
        {
          user_id: user?.id,
          page_id: newAccount.id,
          page_name: newAccount.name,
          page_access_token: newAccount.token,
          is_active: true
        }
      ]);
      if (error) throw error;
      setNewAccount({ token: '', id: '', name: '' });
      setIsModalOpen(false);
      fetchPages();
    } catch (error: any) {
      alert('Error al conectar: ' + error.message);
    } finally {
      setIsConnecting(false);
    }
  };

  const togglePageStatus = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('facebook_pages')
        .update({ is_active: !currentStatus })
        .eq('id', id);
      if (error) throw error;
      setPages(pages.map(p => p.id === id ? { ...p, is_active: !currentStatus } : p));
    } catch (error: any) {
      alert('Error updating page:' + error.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Desvincular esta página?')) return;
    try {
      const { error } = await supabase.from('facebook_pages').delete().eq('id', id);
      if (error) throw error;
      setPages(pages.filter(p => p.id !== id));
    } catch (error: any) {
      alert('Error: ' + error.message);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-8"
    >
      <div className="mb-12 flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-extrabold tracking-tight text-on-surface font-headline">Cuentas Sociales</h2>
          <p className="text-slate-500 mt-2 font-medium">Gestiona tus páginas y perfiles conectados.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-full hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-lg shadow-indigo-200"
        >
          <span className="material-symbols-outlined">add_link</span>
          <span>Conectar Facebook</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full text-center py-20 text-slate-400 font-bold">Cargando cuentas...</div>
        ) : pages.length === 0 ? (
          <div className="col-span-full text-center py-20 bg-slate-50 rounded-[2.5rem] border-2 border-dashed border-slate-200">
            <span className="material-symbols-outlined text-6xl text-slate-300 mb-4">manage_accounts</span>
            <p className="text-slate-500 font-bold text-lg">No has conectado ninguna página aún.</p>
          </div>
        ) : (
          pages.map((page) => (
            <div key={page.id} className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 hover:shadow-md transition-shadow relative overflow-hidden group">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
                  <span className="material-symbols-outlined text-3xl">facebook</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-lg text-slate-800 truncate">{page.page_name}</h3>
                  <p className="text-xs text-slate-400 font-mono tracking-tighter truncate">ID: {page.page_id}</p>
                </div>
                <button 
                  onClick={() => handleDelete(page.id)}
                  className="p-2 text-rose-300 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"
                >
                  <span className="material-symbols-outlined">delete_forever</span>
                </button>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${page.is_active ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                  <span className={`text-xs font-bold uppercase tracking-wider ${page.is_active ? 'text-emerald-600' : 'text-slate-400'}`}>
                    {page.is_active ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
                <button 
                  onClick={() => togglePageStatus(page.id, page.is_active)}
                  className={`text-xs font-black px-4 py-2 rounded-full transition-colors ${
                    page.is_active ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
                  }`}
                >
                  {page.is_active ? 'Pausar' : 'Activar'}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal de Conexión */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
               initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
               onClick={() => setIsModalOpen(false)}
               className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
               initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
               className="relative w-full max-w-md bg-white rounded-[2.5rem] p-10 shadow-2xl"
            >
              <h3 className="text-2xl font-black mb-6">Conectar Página</h3>
              <form onSubmit={handleConnect} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 px-2">Page Name</label>
                  <input 
                    required type="text" placeholder="Ej: Mi Negocio" 
                    value={newAccount.name} onChange={e => setNewAccount({...newAccount, name: e.target.value})}
                    className="w-full p-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 px-2">Page ID</label>
                  <input 
                    required type="text" placeholder="ID de la página" 
                    value={newAccount.id} onChange={e => setNewAccount({...newAccount, id: e.target.value})}
                    className="w-full p-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 px-2">Access Token</label>
                  <input 
                    required type="password" placeholder="Token de acceso (EAA...)" 
                    value={newAccount.token} onChange={e => setNewAccount({...newAccount, token: e.target.value})}
                    className="w-full p-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <button 
                  type="submit" disabled={isConnecting}
                  className="w-full py-4 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-700 transition-all disabled:opacity-50 mt-4 shadow-lg shadow-indigo-100"
                >
                  {isConnecting ? 'Guardando...' : 'Guardar Conexión'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
