import { useAuth } from '../../contexts/AuthContext';

export default function Topbar() {
  const { user, signOut } = useAuth();

  return (
    <header className="fixed top-0 right-0 h-[72px] left-[280px] z-40 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl shadow-sm dark:shadow-none flex justify-between items-center px-12 w-full font-manrope font-semibold">
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
      
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-4 border-r border-slate-100 pr-6">
          <button className="p-2 text-slate-500 hover:text-primary transition-colors relative">
            <span className="material-symbols-outlined">notifications</span>
            <span className="absolute top-2 right-2 w-2 h-2 bg-error rounded-full"></span>
          </button>
          <div className="group relative">
            <div className="w-10 h-10 rounded-full bg-surface-container-high overflow-hidden border-2 border-white shadow-sm cursor-pointer hover:opacity-90 transition-opacity">
              <img 
                src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.email || 'user'}`} 
                alt="User Avatar" 
                className="w-full h-full object-cover"
              />
            </div>
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-slate-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
              <div className="p-3 border-b border-slate-100">
                <p className="text-sm font-bold text-slate-800 truncate">{user?.email}</p>
              </div>
              <div className="p-2">
                <button 
                  onClick={signOut}
                  className="w-full text-left px-3 py-2 text-sm text-rose-600 font-bold hover:bg-rose-50 rounded-lg transition-colors flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-[18px]">logout</span>
                  Cerrar Sesión
                </button>
              </div>
            </div>
          </div>
        </div>
        <button className="bg-indigo-600 dark:bg-indigo-500 text-white px-6 py-2.5 rounded-full text-sm font-bold flex items-center gap-2 hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-indigo-600/20">
          <span className="material-symbols-outlined text-lg">add</span>
          Crear Publicación
        </button>
      </div>
    </header>
  );
}
