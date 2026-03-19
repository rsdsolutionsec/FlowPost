import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';

const menuItems = [
  { icon: 'dashboard', label: 'Dashboard', path: '/dashboard' },
  { icon: 'schedule_send', label: 'Posts Programados', path: '/scheduled' },
  { icon: 'campaign', label: 'Campañas', path: '/campaigns' },
  { icon: 'photo_library', label: 'Biblioteca Médios', path: '/media' },
  { icon: 'content_copy', label: 'Librería de Copys', path: '/copies' },
  { icon: 'smart_toy', label: 'Automatización', path: '/automation' },
  { icon: 'analytics', label: 'Analíticas', path: '/analytics' },
  { icon: 'account_tree', label: 'Cuentas Sociales', path: '/accounts' },
];

export default function Sidebar() {
  const location = useLocation();

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-80 bg-white border-r border-slate-100 hidden lg:flex flex-col z-30 overflow-hidden">
      {/* Brand Profile */}
      <div className="p-10 pb-12">
        <div className="flex items-center gap-4 group cursor-pointer">
          <div className="w-14 h-14 rounded-[1.25rem] bg-slate-900 flex items-center justify-center text-white shadow-xl shadow-slate-900/20 group-hover:scale-105 transition-all duration-500">
            <span className="material-symbols-outlined text-2xl">flow_chart</span>
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight font-headline">Flowpost</h1>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Workspace Pro</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-6 space-y-2 overflow-y-auto custom-scrollbar pb-10">
        <p className="px-4 mb-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Menú Principal</p>
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `
              relative flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-300 group
              ${isActive 
                ? 'bg-indigo-50 text-indigo-600' 
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}
            `}
          >
            {location.pathname === item.path && (
              <motion.div
                layoutId="active-pill"
                className="absolute inset-0 bg-indigo-50 rounded-2xl -z-10"
                transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
              />
            )}
            <span className={`material-symbols-outlined text-[22px] transition-transform duration-300 group-hover:scale-110 ${
              location.pathname === item.path ? 'font-fill' : ''
            }`}>
              {item.icon}
            </span>
            <span className="text-sm font-black tracking-tight">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Profile Footer */}
      <div className="p-6 mt-auto">
        <div className="bg-slate-50 rounded-[2rem] p-4 flex items-center gap-4 border border-slate-100/50">
          <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center overflow-hidden border border-slate-200">
             <img src="https://i.pravatar.cc/150?u=flowpost" alt="Avatar" className="w-full h-full object-cover" />
          </div>
          <div className="flex-1 truncate">
            <p className="text-xs font-black text-slate-900 truncate">Alex Rivera</p>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Plan Business</p>
          </div>
          <button className="w-8 h-8 rounded-lg text-slate-400 hover:bg-white hover:text-slate-900 transition-all flex items-center justify-center">
            <span className="material-symbols-outlined text-lg">settings</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
