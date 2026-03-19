import { useAuth } from '../../contexts/AuthContext';

export default function Topbar() {
  const { user } = useAuth();

  return (
    <header className="fixed top-0 right-0 h-[64px] left-[240px] z-40 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl shadow-sm dark:shadow-none flex justify-between items-center px-8 w-full font-manrope font-semibold">
      <div className="flex items-center flex-1 max-w-xl">
        <div className="relative w-full group">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors">search</span>
          <input
            type="text"
            placeholder="Buscar contenido programado..."
            className="w-full bg-surface-container-low border-none rounded-xl py-2.5 pl-12 pr-4 focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all text-sm placeholder:text-outline/60"
          />
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3 border-r border-slate-100 pr-6">
          <button className="p-2 text-slate-400 hover:text-primary transition-colors relative">
            <span className="material-symbols-outlined text-[20px]">notifications</span>
            <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-rose-500 rounded-full border border-white"></span>
          </button>
          
          <div className="w-9 h-9 rounded-full bg-slate-100 overflow-hidden border-2 border-white shadow-sm">
            <img 
              src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.email || 'user'}`} 
              alt="User Avatar" 
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        <div className="text-right hidden sm:block">
          <p className="text-[10px] font-black text-slate-800 leading-tight">Espacio Profesional</p>
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest truncate max-w-[120px]">{user?.email}</p>
        </div>
      </div>
    </header>
  );
}
