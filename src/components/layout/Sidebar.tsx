import { NavLink } from 'react-router-dom';
import { clsx } from 'clsx';
import { useAuth } from '../../contexts/AuthContext';

const navItems = [
  { icon: 'dashboard', label: 'Panel de Control', path: '/dashboard' },
  { icon: 'calendar_month', label: 'Mensajes Programados', path: '/posts' },
  { icon: 'campaign', label: 'Campañas', path: '/campaigns' },
  { icon: 'perm_media', label: 'Biblioteca de Medios', path: '/media' },
  { icon: 'auto_awesome', label: 'Automatización', path: '/automation' },
  { icon: 'group_add', label: 'Cuentas Sociales', path: '/accounts' },
  { icon: 'settings', label: 'Configuración', path: '/settings' },
];

export default function Sidebar() {
  const { user } = useAuth();

  return (
    <aside className="fixed left-0 top-0 h-screen w-[280px] bg-slate-50 dark:bg-slate-900/50 flex flex-col py-8 px-6 space-y-2 font-manrope text-sm font-medium tracking-tight z-50">
      <div className="mb-10 px-2 flex items-center gap-3">
        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white">
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tighter text-indigo-600 dark:text-indigo-400">The Curator</h1>
          <p className="text-[10px] uppercase tracking-[0.1em] text-slate-500">Plataforma de Automatización</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200',
                isActive
                  ? 'bg-white dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:translate-y-[-1px]'
              )
            }
          >
            {({ isActive }) => (
              <>
                <span className="material-symbols-outlined" style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="pt-6 mt-6 border-t border-slate-200 dark:border-slate-800 space-y-1">
        <button className="w-full bg-indigo-600 text-white rounded-xl py-3 px-4 font-semibold text-sm hover:opacity-90 transition-all mb-4 flex items-center justify-center gap-2">
          <span className="material-symbols-outlined text-lg">stars</span>
          Mejorar Plan
        </button>
        <button className="w-full flex items-center gap-3 px-4 py-3 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 rounded-lg transition-all">
          <img 
            src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.email || 'user'}`} 
            alt="User Avatar" 
            className="w-6 h-6 rounded-full object-cover"
          />
          <span className="truncate">{user?.email || 'Perfil de Usuario'}</span>
        </button>
      </div>
    </aside>
  );
}
