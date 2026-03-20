import { NavLink, useLocation } from 'react-router-dom';
import { clsx } from 'clsx';
import { useAuth } from '../../contexts/AuthContext';

const mainItems = [
  { icon: 'dashboard', label: 'Dashboard', path: '/' },
  { icon: 'calendar_month', label: 'Programados', path: '/scheduled' },
  { icon: 'photo_library', label: 'Biblioteca', path: '/media' },
  { icon: 'content_copy', label: 'Librería de Copys', path: '/copies' },
  { icon: 'campaign', label: 'Campañas', path: '/campaigns' },
];

const managementItems = [
  { icon: 'smart_toy', label: 'Automaciones', path: '/automation' },
  { icon: 'analytics', label: 'Analíticas', path: '/analytics' },
  { icon: 'share', label: 'Cuentas', path: '/accounts' },
  { icon: 'settings', label: 'Configuración', path: '/settings' },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { user, signOut } = useAuth();
  const location = useLocation();

  return (
    <>
      {/* Backdrop */}
      <div 
        className={clsx(
          "fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[45] transition-opacity duration-300",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />

      <aside className={clsx(
        "fixed left-0 top-0 h-screen w-[260px] bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-slate-800 flex flex-col py-8 px-5 space-y-2 font-manrope text-sm font-medium tracking-tight z-50 transition-all duration-300 ease-in-out shadow-2xl shadow-slate-200/50",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-6 right-5 p-2 text-slate-400 hover:text-primary transition-colors lg:hidden"
        >
          <span className="material-symbols-outlined">close</span>
        </button>

        <div className="mb-10 px-2 flex items-center gap-3 group cursor-pointer">
          <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-200 group-hover:scale-105 transition-transform">
            <span className="material-symbols-outlined text-[28px]" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tighter text-indigo-600 dark:text-indigo-400 leading-none">FlowPost</h1>
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 mt-1">Smart Automation</p>
          </div>
        </div>

        <nav className="flex-1 space-y-8 overflow-y-auto no-scrollbar pr-2">
          <div>
            <h3 className="px-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-300 mb-4 ml-1">Principal</h3>
            <div className="space-y-1.5 font-headline">
              {mainItems.map((item) => (
                <SidebarItem key={item.path} item={item} isActive={location.pathname === item.path} onClick={onClose} />
              ))}
            </div>
          </div>

          <div>
            <h3 className="px-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-300 mb-4 ml-1">Gestión</h3>
            <div className="space-y-1.5 font-headline">
              {managementItems.map((item) => (
                <SidebarItem key={item.path} item={item} isActive={location.pathname === item.path} onClick={onClose} />
              ))}
            </div>
          </div>
        </nav>

        <div className="pt-8 mt-auto border-t border-slate-100 dark:border-slate-800">
          <button 
            onClick={() => signOut()}
            className="w-full flex items-center gap-3 px-5 py-4 text-slate-500 dark:text-slate-400 hover:bg-rose-50 hover:text-rose-600 rounded-[1.25rem] transition-all group font-bold"
          >
            <div className="w-8 h-8 rounded-lg bg-slate-50 group-hover:bg-rose-100 flex items-center justify-center transition-colors">
              <span className="material-symbols-outlined text-[20px] group-hover:rotate-12 transition-transform">logout</span>
            </div>
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>
    </>
  );
}

function SidebarItem({ item, isActive, onClick }: { item: any, isActive: boolean, onClick: () => void }) {
  return (
    <NavLink
      to={item.path}
      onClick={onClick}
      className={clsx(
        'flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300 group',
        isActive
          ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100'
          : 'text-slate-500 hover:bg-slate-50 hover:text-indigo-600 hover:translate-x-1'
      )}
    >
      <div className={clsx(
        "w-8 h-8 rounded-xl flex items-center justify-center transition-colors",
        isActive ? "bg-white/20" : "bg-slate-50 group-hover:bg-indigo-50"
      )}>
        <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}>
          {item.icon}
        </span>
      </div>
      <span className="font-bold tracking-tight">{item.label}</span>
    </NavLink>
  );
}
