import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface FacebookPage {
  id: string;
  page_id: string;
  page_name: string;
  is_active: boolean;
  category?: string;
}

export default function Accounts() {
  const { user } = useAuth();
  const [pages, setPages] = useState<FacebookPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    if (user) fetchPages();
  }, [user]);

  const fetchPages = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('facebook_pages')
      .select('*')
      .eq('user_id', user?.id);
    
    if (!error && data) {
      setPages(data);
    }
    setLoading(false);
  };

  const handleConnect = async () => {
    setConnecting(true);
    // Simular flujo de OAuth / FB Login
    // En una app real, as usaramos el SDK de Facebook o una URL de redirect
    setTimeout(async () => {
      alert('En un entorno de produccin, esto abrira el dilogo de Facebook Login.');
      setConnecting(false);
    }, 1000);
  };

  const togglePageStatus = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('facebook_pages')
      .update({ is_active: !currentStatus })
      .eq('id', id);
    
    if (!error) {
      setPages(pages.map(p => p.id === id ? { ...p, is_active: !currentStatus } : p));
    }
  };

  const deletePage = async (id: string) => {
    if (!confirm('Ests seguro de que quieres eliminar esta cuenta?')) return;
    
    const { error } = await supabase
      .from('facebook_pages')
      .delete()
      .eq('id', id);
    
    if (!error) {
      setPages(pages.filter(p => p.id !== id));
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="space-y-12"
    >
      <header className="flex justify-between items-end">
        <div className="space-y-2">
          <h2 className="text-4xl font-black text-slate-900 font-headline">Cuentas Conectadas</h2>
          <p className="text-slate-500 text-lg font-medium">Gestiona tus pginas de Facebook e Instagram vinculadas.</p>
        </div>
        <button 
          onClick={handleConnect}
          disabled={connecting}
          className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 transition-transform shadow-xl shadow-indigo-600/20 disabled:opacity-50"
        >
          {connecting ? 'Conectando...' : 'Conectar Nueva Cuenta'}
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {loading ? (
          <div className="col-span-full py-20 text-center font-black text-slate-300 uppercase tracking-widest">Cargando cuentas...</div>
        ) : pages.length === 0 ? (
          <div className="col-span-full py-24 bg-white border-2 border-dashed border-slate-200 rounded-[3rem] text-center space-y-4">
            <span className="material-symbols-outlined text-6xl text-slate-200">add_link</span>
            <p className="text-slate-400 font-bold">No has conectado ninguna pgina todava.</p>
          </div>
        ) : (
          pages.map((page) => (
            <div key={page.id} className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 space-y-6 hover:shadow-xl transition-all group">
              <div className="flex justify-between items-start">
                <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <span className="material-symbols-outlined text-3xl">facebook</span>
                </div>
                <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                  page.is_active ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'
                }`}>
                  {page.is_active ? 'Activa' : 'Pausada'}
                </div>
              </div>

              <div>
                <h4 className="text-xl font-black text-slate-900 font-headline truncate">{page.page_name}</h4>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">ID: {page.page_id}</p>
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  onClick={() => togglePageStatus(page.id, page.is_active)}
                  className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    page.is_active ? 'bg-slate-900 text-white' : 'bg-indigo-600 text-white'
                  }`}
                >
                  {page.is_active ? 'Pausar' : 'Activar'}
                </button>
                <button 
                  onClick={() => deletePage(page.id)}
                  className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center hover:bg-rose-100 transition-colors"
                >
                  <span className="material-symbols-outlined text-xl">delete</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </motion.div>
  );
}
