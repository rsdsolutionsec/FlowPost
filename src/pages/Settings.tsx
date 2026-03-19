import React from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';

export default function Settings() {
  const handleLogout = () => supabase.auth.signOut();

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="max-w-4xl space-y-12"
    >
      <header className="space-y-2">
        <h2 className="text-4xl font-black text-slate-900 font-headline">Configuración</h2>
        <p className="text-slate-500 text-lg font-medium">Controla tu perfil, seguridad y preferencias del sistema.</p>
      </header>

      <div className="space-y-8">
        {/* Profile Section */}
        <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-100">
          <div className="flex items-center gap-8 mb-10">
            <div className="w-24 h-24 rounded-[2rem] bg-indigo-50 flex items-center justify-center relative group cursor-pointer overflow-hidden">
               <span className="material-symbols-outlined text-4xl text-indigo-300">person</span>
               <div className="absolute inset-0 bg-indigo-600/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                  <span className="material-symbols-outlined">add_a_photo</span>
               </div>
            </div>
            <div>
              <h3 className="text-2xl font-black text-slate-900 font-headline mb-1">Tu Perfil</h3>
              <p className="text-sm text-slate-400 font-bold uppercase tracking-widest">Gestiona tu identidad en Flowpost</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Nombre Público</label>
              <input type="text" className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-slate-900" placeholder="Robin" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Email</label>
              <input type="email" readOnly className="w-full p-4 bg-slate-50/50 rounded-2xl border-none font-bold text-slate-500 cursor-not-allowed" placeholder="robin@example.com" />
            </div>
          </div>
        </div>

        {/* System Settings */}
        <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-100 space-y-8">
           <h3 className="text-2xl font-black text-slate-900 font-headline">Sistema</h3>
           
           <div className="flex items-center justify-between p-6 bg-slate-50 rounded-2xl">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-indigo-600">
                  <span className="material-symbols-outlined">notifications_active</span>
                </div>
                <div>
                  <p className="text-sm font-black text-slate-800">Notificaciones Push</p>
                  <p className="text-xs font-medium text-slate-500">Recibe alertas cuando un post se publique con éxito.</p>
                </div>
              </div>
              <div className="w-12 h-6 bg-indigo-600 rounded-full flex items-center p-1 cursor-pointer">
                <div className="w-4 h-4 bg-white rounded-full shadow-sm transform translate-x-6 transition-transform"></div>
              </div>
           </div>

           <div className="flex items-center justify-between p-6 bg-slate-50 rounded-2xl">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-amber-500">
                  <span className="material-symbols-outlined">database</span>
                </div>
                <div>
                  <p className="text-sm font-black text-slate-800">Copia de Seguridad Automática</p>
                  <p className="text-xs font-medium text-slate-500">Respaldar copys y contenido en Supabase Storage.</p>
                </div>
              </div>
              <div className="w-12 h-6 bg-slate-200 rounded-full flex items-center p-1 cursor-pointer">
                <div className="w-4 h-4 bg-white rounded-full shadow-sm transition-transform"></div>
              </div>
           </div>
        </div>

        {/* Danger Zone */}
        <div className="pt-8 flex justify-between items-center">
          <button 
            onClick={handleLogout}
            className="text-xs font-black text-rose-500 uppercase tracking-[0.2em] px-8 py-4 border-2 border-rose-50 hover:bg-rose-50 rounded-2xl transition-all"
          >
            Cerrar Sesin
          </button>
          <button className="text-xs font-black text-slate-300 uppercase tracking-widest hover:text-slate-900 transition-colors">
            Eliminar Cuenta
          </button>
        </div>
      </div>
    </motion.div>
  );
}
