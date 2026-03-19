import { NavLink, useLocation } from 'react-router-dom';
import { clsx } from 'clsx';
import { useAuth } from '../../contexts/AuthContext';

const mainItems = [
  { icon: 'dashboard', label: 'Dashboard', path: '/' },
  { icon: 'calendar_month', label: 'Programados', path: '/scheduled' },
  { icon: 'photo_library', label: 'Biblioteca', path: '/media' },
  { icon: 'content_copy', label: 'Librería de Copys', path: '/copies' },
  { icon: 'playlist_add_check', label: 'Asignar Copys', path: '/assign-copies' },
  { icon: 'campaign', label: 'Campañas', path: '/campaigns' },
];

const managementItems = [
  { icon: 'smart_toy', label: 'Automaciones', path: '/automation' },
  { icon: 'analytics', label: 'Analíticas', path: '/analytics' },
  { icon: 'share', label: 'Cuentas', path: '/accounts' },
  { icon: 'settings', label: 'Configuración', path: '/settings' },
];

export default function Sidebar() {
  const { user, signOut } = useAuth();
  const location = useLocation();

  return (
    <aside className="fixed left-0 top-0 h-screen w-[240px] bg-slate-50 dark:bg-slate-900/50 flex flex-col py-6 px-5 space-y-2 font-manrope text-sm font-medium tracking-tight z-50">
      <div className="mb-10 px-2 flex items-center gap-3">
        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white">
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tighter text-indigo-600 dark:text-indigo-400">The Curator</h1>
          <p className="text-[10px] uppercase tracking-[0.1em] text-slate-500">Plataforma de Automatización</p>
        </div>
      </div>

      <nav className="flex-1 px-4 mt-8 space-y-8">
        <div>
          <h3 className="px-4 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3">Principal</h3>
          <div className="space-y-1">
            {mainItems.map((item) => (
              <SidebarItem key={item.path} item={item} isActive={location.pathname === item.path} />
            ))}
          </div>
        </div>

        <div>
          <h3 className="px-4 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3">Gestión</h3>
          <div className="space-y-1">
            {managementItems.map((item) => (
              <SidebarItem key={item.path} item={item} isActive={location.pathname === item.path} />
            ))}
          </div>
        </div>
      </nav>

      <div className="pt-6 mt-6 border-t border-slate-200 dark:border-slate-800">
        <button 
          onClick={() => signOut()}
          className="w-full flex items-center gap-3 px-4 py-3 text-slate-500 dark:text-slate-400 hover:bg-rose-50 hover:text-rose-600 rounded-xl transition-all group"
        >
          <span className="material-symbols-outlined text-[20px] group-hover:rotate-12 transition-transform">logout</span>
          <span className="font-bold">Cerrar Sesión</span>
        </button>
      </div>
    </aside>
  );
}

interface SidebarItemProps {
  key?: string | number;
  item: { icon: string; label: string; path: string };
  isActive: boolean;
}

function SidebarItem({ item, isActive }: SidebarItemProps) {
  return (
    <NavLink
      to={item.path}
      className={clsx(
        'flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200',
        isActive
          ? 'bg-white dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 shadow-sm'
          : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:translate-y-[-1px]'
      )}
    >
      <span className="material-symbols-outlined" style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}>
        {item.icon}
      </span>
      <span>{item.label}</span>
    </NavLink>
  );
}
