import { useAuth } from '../../contexts/AuthContext';

export default function Topbar() {
  const { user } = useAuth();

  return (
    <header className="h-20 bg-surface flex items-center justify-between px-10">
      <div className="flex-1">
        <div className="relative max-w-md group">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors text-[20px]">search</span>
          <input 
            type="text" 
            placeholder="Buscar en el espacio de trabajo..." 
            className="w-full bg-surface-container-low border-none rounded-2xl py-3 pl-12 pr-4 text-sm font-medium focus:ring-4 focus:ring-primary/5 transition-all placeholder:text-slate-400"
          />
        </div>
      </div>

      <div className="flex items-center gap-6">
        <button className="w-11 h-11 flex items-center justify-center rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface-variant transition-colors relative">
          <span className="material-symbols-outlined text-[20px]">notifications</span>
          <span className="absolute top-3 right-3 w-2 h-2 bg-rose-500 rounded-full border-2 border-surface"></span>
        </button>

        <div className="h-8 w-[1px] bg-slate-100"></div>

        <div className="flex items-center gap-3 pl-2">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-black text-on-surface leading-tight">Alex Rivera</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{user?.email}</p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary to-indigo-600 p-[2px] shadow-lg shadow-primary/10">
            <div className="w-full h-full rounded-[14px] bg-surface overflow-hidden">
              <img 
                src="https://i.pravatar.cc/150?img=68" 
                alt="Avatar" 
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
