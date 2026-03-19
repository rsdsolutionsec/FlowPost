import React from 'react';
import { useLocation } from 'react-router-dom';

export default function Topbar() {
  const location = useLocation();
  
  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/dashboard') return 'Dashboard';
    if (path === '/scheduled') return 'Programación';
    if (path === '/campaigns') return 'Campañas';
    if (path === '/media') return 'Biblioteca';
    if (path === '/copies') return 'Copys';
    if (path === '/automation') return 'Automatización';
    if (path === '/analytics') return 'Analíticas';
    if (path === '/accounts') return 'Cuentas Sociales';
    return 'Flowpost';
  };

  return (
    <header className="h-24 px-4 md:px-8 lg:px-12 flex items-center justify-between sticky top-0 bg-surface/80 backdrop-blur-xl z-20 max-w-[1600px] mx-auto w-full">
      <div className="flex items-center gap-4">
        <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full uppercase tracking-widest hidden sm:inline-block">Workspace</span>
        <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest">{getPageTitle()}</h2>
      </div>

      <div className="flex items-center gap-3 sm:gap-6">
        <button className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-900 transition-all shadow-sm">
          <span className="material-symbols-outlined text-xl sm:text-2xl">search</span>
        </button>
        <button className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-900 relative transition-all shadow-sm group">
          <span className="material-symbols-outlined text-xl sm:text-2xl">notifications</span>
          <span className="absolute top-3 right-3 w-2 h-2 bg-rose-500 rounded-full border-2 border-white group-hover:scale-125 transition-transform"></span>
        </button>
      </div>
    </header>
  );
}
