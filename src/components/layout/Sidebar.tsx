import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const menuItems = [
  { icon: 'dashboard', label: 'Dashboard', path: '/' },
  { icon: 'calendar_month', label: 'Programados', path: '/scheduled' },
  { icon: 'photo_library', label: 'Biblioteca', path: '/media' },
  { icon: 'campaign', label: 'Campañas', path: '/campaigns' },
  { icon: 'smart_toy', label: 'Automaciones', path: '/automation' },
  { icon: 'analytics', label: 'Analíticas', path: '/analytics' },
  { icon: 'share', label: 'Cuentas', path: '/accounts' },
  { icon: 'settings', label: 'Configuración', path: '/settings' },
];

export default function Sidebar() {
  const location = useLocation();
  const { signOut } = useAuth();

  return (
    <aside className="w-72 bg-surface flex flex-col h-full border-r border-slate-100/50">
      <div className="p-8 flex items-center gap-3">
        <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20 rotate-3">
          <span className="material-symbols-outlined text-white text-2xl font-black">bolt</span>
        </div>
        <h1 className="text-2xl font-black tracking-tighter text-on-surface font-headline">FlowPost</h1>
      </div>

      <nav className="flex-1 px-4 mt-4 space-y-1">
        {menuItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300 group ${
              location.pathname === item.path
                ? 'bg-primary text-white shadow-xl shadow-primary/25 translate-x-1'
                : 'text-slate-500 hover:bg-surface-container hover:text-primary'
            }`}
          >
            <span className={`material-symbols-outlined text-[20px] transition-transform duration-300 ${
              location.pathname === item.path ? 'scale-110 !font-variation-fill' : 'group-hover:scale-110'
            }`}>
              {item.icon}
            </span>
            <span className="font-bold text-sm tracking-tight">{item.label}</span>
          </Link>
        ))}
      </nav>

      <div className="p-6">
        <button 
          onClick={() => signOut()}
          className="w-full flex items-center gap-3 px-4 py-4 rounded-2xl text-slate-400 font-bold hover:bg-rose-50 hover:text-rose-500 transition-all duration-300 group"
        >
          <span className="material-symbols-outlined text-[20px] group-hover:rotate-12 transition-transform">logout</span>
          <span className="text-sm">Cerrar Sesión</span>
        </button>
      </div>
    </aside>
  );
}
