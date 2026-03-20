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

interface InstagramAccount {
  id: string;
  facebook_page_id: string;
  instagram_business_id: string;
  username: string;
  profile_picture_url: string;
  is_active: boolean;
  facebook_pages?: { page_name: string };
}

export default function Accounts() {
  const { user } = useAuth();
  const [pages, setPages] = useState<FacebookPage[]>([]);
  const [instagramAccounts, setInstagramAccounts] = useState<InstagramAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'facebook' | 'instagram'>('facebook');
  const [isConnecting, setIsConnecting] = useState(false);
  const [newAccount, setNewAccount] = useState({ token: '', id: '', name: '', facebook_page_ref: '' });

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [pagesRes, igRes] = await Promise.all([
        supabase
          .from('facebook_pages')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('instagram_accounts')
          .select('*, facebook_pages(page_name)')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
      ]);

      if (pagesRes.error) throw pagesRes.error;
      if (igRes.error) throw igRes.error;

      setPages(pagesRes.data || []);
      setInstagramAccounts(igRes.data as any || []);
    } catch (error: any) {
      console.error('Error fetching data:', error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (modalType === 'facebook') {
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
        setNewAccount({ token: '', id: '', name: '', facebook_page_ref: '' });
        setIsModalOpen(false);
        fetchData();
      } catch (error: any) {
        alert('Error al conectar: ' + error.message);
      } finally {
        setIsConnecting(false);
      }
    } else {
      if (!newAccount.id || !newAccount.name || !newAccount.facebook_page_ref) return;
      setIsConnecting(true);
      try {
        const { error } = await supabase.from('instagram_accounts').insert([
          {
            user_id: user?.id,
            facebook_page_id: newAccount.facebook_page_ref,
            instagram_business_id: newAccount.id,
            username: newAccount.name,
            is_active: true
          }
        ]);
        if (error) throw error;
        setNewAccount({ token: '', id: '', name: '', facebook_page_ref: '' });
        setIsModalOpen(false);
        fetchData();
      } catch (error: any) {
        alert('Error al conectar Instagram: ' + error.message);
      } finally {
        setIsConnecting(false);
      }
    }
  };

  const handleDelete = async (id: string, type: 'facebook' | 'instagram') => {
    if (!confirm(`¿Desvincular esta ${type === 'facebook' ? 'página' : 'cuenta'}?`)) return;
    try {
      const table = type === 'facebook' ? 'facebook_pages' : 'instagram_accounts';
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) throw error;
      if (type === 'facebook') {
        setPages(pages.filter(p => p.id !== id));
      } else {
        setInstagramAccounts(instagramAccounts.filter(p => p.id !== id));
      }
    } catch (error: any) {
      alert('Error: ' + error.message);
    }
  };

  const toggleStatus = async (id: string, currentStatus: boolean, type: 'facebook' | 'instagram') => {
    try {
      const table = type === 'facebook' ? 'facebook_pages' : 'instagram_accounts';
      const { error } = await supabase
        .from(table)
        .update({ is_active: !currentStatus })
        .eq('id', id);
      if (error) throw error;
      if (type === 'facebook') {
        setPages(pages.map(p => p.id === id ? { ...p, is_active: !currentStatus } : p));
      } else {
        setInstagramAccounts(instagramAccounts.map(p => p.id === id ? { ...p, is_active: !currentStatus } : p));
      }
    } catch (error: any) {
      alert('Error updating status: ' + error.message);
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
        <div className="flex gap-4">
          <button 
            onClick={() => { setModalType('facebook'); setIsModalOpen(true); }}
            className="px-6 py-3 bg-blue-600 text-white font-bold rounded-full hover:bg-blue-700 transition-all flex items-center gap-2 shadow-lg shadow-blue-200"
          >
            <span className="material-symbols-outlined">add_link</span>
            <span>Conectar Facebook</span>
          </button>
          <button 
            onClick={() => { setModalType('instagram'); setIsModalOpen(true); }}
            className="px-6 py-3 bg-gradient-to-tr from-amber-400 via-rose-500 to-purple-600 text-white font-bold rounded-full hover:opacity-90 transition-all flex items-center gap-2 shadow-lg shadow-rose-200"
          >
            <span className="material-symbols-outlined">photo_camera</span>
            <span>Conectar Instagram</span>
          </button>
        </div>
      </div>

      <div className="space-y-12">
        {/* Facebook Pages Section */}
        <section>
          <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
            <span className="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
              <span className="material-symbols-outlined text-xl italic">facebook</span>
            </span>
            Páginas de Facebook
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {loading ? (
              <div className="col-span-full text-center py-10 text-slate-400 font-bold">Cargando...</div>
            ) : pages.length === 0 ? (
              <div className="col-span-full py-12 bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200 text-center">
                <p className="text-slate-400 font-bold">Sin páginas conectadas</p>
              </div>
            ) : (
              pages.map((page) => (
                <div key={page.id} className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 hover:shadow-md transition-shadow relative group">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
                      <span className="material-symbols-outlined text-3xl">facebook</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-lg text-slate-800 truncate">{page.page_name}</h3>
                      <p className="text-xs text-slate-400 font-mono tracking-tighter truncate">ID: {page.page_id}</p>
                    </div>
                    <button 
                      onClick={() => handleDelete(page.id, 'facebook')}
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
                      onClick={() => toggleStatus(page.id, page.is_active, 'facebook')}
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
        </section>

        {/* Instagram Accounts Section */}
        <section>
          <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
            <span className="w-8 h-8 bg-gradient-to-tr from-amber-400 via-rose-500 to-purple-600 text-white rounded-lg flex items-center justify-center">
              <span className="material-symbols-outlined text-xl">photo_camera</span>
            </span>
            Cuentas de Instagram Business
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {loading ? (
              <div className="col-span-full text-center py-10 text-slate-400 font-bold">Cargando...</div>
            ) : instagramAccounts.length === 0 ? (
              <div className="col-span-full py-12 bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200 text-center">
                <p className="text-slate-400 font-bold">Sin cuentas de Instagram conectadas</p>
              </div>
            ) : (
              instagramAccounts.map((ig) => (
                <div key={ig.id} className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 hover:shadow-md transition-shadow relative group">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-600 overflow-hidden">
                      {ig.profile_picture_url ? (
                        <img src={ig.profile_picture_url} alt={ig.username} className="w-full h-full object-cover" />
                      ) : (
                        <span className="material-symbols-outlined text-3xl">photo_camera</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-lg text-slate-800 truncate">@{ig.username}</h3>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight truncate">Link: {ig.facebook_pages?.page_name}</p>
                    </div>
                    <button 
                      onClick={() => handleDelete(ig.id, 'instagram')}
                      className="p-2 text-rose-300 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <span className="material-symbols-outlined">delete_forever</span>
                    </button>
                  </div>
                  <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${ig.is_active ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                      <span className={`text-xs font-bold uppercase tracking-wider ${ig.is_active ? 'text-emerald-600' : 'text-slate-400'}`}>
                        {ig.is_active ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>
                    <button 
                      onClick={() => toggleStatus(ig.id, ig.is_active, 'instagram')}
                      className={`text-xs font-black px-4 py-2 rounded-full transition-colors ${
                        ig.is_active ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
                      }`}
                    >
                      {ig.is_active ? 'Pausar' : 'Activar'}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
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
              <h3 className="text-2xl font-black mb-6">Conectar {modalType === 'facebook' ? 'Página' : 'Instagram'}</h3>
              <form onSubmit={handleConnect} className="space-y-4">
                {modalType === 'instagram' && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 px-2">Página de Facebook Vinculada</label>
                    <select 
                      required
                      value={newAccount.facebook_page_ref} 
                      onChange={e => setNewAccount({...newAccount, facebook_page_ref: e.target.value})}
                      className="w-full p-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-indigo-500/20 appearance-none"
                    >
                      <option value="">Seleccionar página...</option>
                      {pages.map(p => (
                        <option key={p.id} value={p.id}>{p.page_name}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 px-2">
                    {modalType === 'facebook' ? 'Nombre de la Página' : 'Username de Instagram'}
                  </label>
                  <input 
                    required type="text" placeholder={modalType === 'facebook' ? "Ej: Mi Negocio" : "Ej: minegocio_ok"} 
                    value={newAccount.name} onChange={e => setNewAccount({...newAccount, name: e.target.value})}
                    className="w-full p-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 px-2">
                    {modalType === 'facebook' ? 'Page ID' : 'Instagram Business ID'}
                  </label>
                  <input 
                    required type="text" placeholder="ID numérico" 
                    value={newAccount.id} onChange={e => setNewAccount({...newAccount, id: e.target.value})}
                    className="w-full p-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                  {modalType === 'instagram' && (
                    <p className="text-[9px] text-slate-400 px-2 leading-tight">
                      * El <b>Instagram Business ID</b> se obtiene desde la Configuración de tu Página de FB {`>`} Cuentas Vinculadas {`>`} Instagram, o vía Meta Graph Explorer.
                    </p>
                  )}
                </div>
                {modalType === 'facebook' && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 px-2">Access Token</label>
                    <input 
                      required type="password" placeholder="Token de acceso (EAA...)" 
                      value={newAccount.token} onChange={e => setNewAccount({...newAccount, token: e.target.value})}
                      className="w-full p-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                )}
                <button 
                  type="submit" disabled={isConnecting}
                  className={`w-full py-4 text-white font-black rounded-2xl transition-all disabled:opacity-50 mt-4 shadow-lg ${
                    modalType === 'facebook' ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-100' : 'bg-gradient-to-r from-rose-500 to-purple-600 hover:opacity-90 shadow-rose-100'
                  }`}
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
