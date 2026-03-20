import { useAuth } from '../../contexts/AuthContext';

interface TopbarProps {
  onMenuClick: () => void;
}

export default function Topbar({ onMenuClick }: TopbarProps) {
  const { user } = useAuth();

  return (
    <header className="fixed top-0 right-0 h-[72px] left-0 z-40 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-b border-slate-100 dark:border-slate-800 flex justify-between items-center px-4 sm:px-8 w-full font-manrope font-semibold transition-all duration-300">
      <div className="flex items-center gap-4 flex-1">
        <button 
          onClick={onMenuClick}
          className="p-2 -ml-2 text-slate-500 hover:text-primary transition-all active:scale-90"
        >
          <span className="material-symbols-outlined text-[28px]">menu</span>
        </button>

        <div className="relative w-full max-w-sm group hidden sm:block">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors text-[20px]">search</span>
          <input
            type="text"
            placeholder="Buscar..."
            className="w-full bg-slate-50 dark:bg-slate-900 border-none rounded-[1.25rem] py-2 pl-12 pr-4 focus:ring-4 focus:ring-primary/5 transition-all text-sm placeholder:text-slate-400 font-medium"
          />
        </div>
      </div>
      
      <div className="flex items-center gap-2 sm:gap-6">
        <div className="flex items-center gap-1 sm:gap-3 sm:border-r border-slate-100 dark:border-slate-800 sm:pr-6">
          <button className="flex p-2.5 text-slate-400 hover:text-primary hover:bg-slate-50 dark:hover:bg-slate-900 rounded-xl transition-all relative group">
            <span className="material-symbols-outlined text-[22px]">notifications</span>
            <span className="absolute top-3 right-3 w-2 h-2 bg-rose-500 rounded-full border-2 border-white dark:border-slate-950"></span>
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden md:block">
            <p className="text-[11px] font-black text-slate-800 dark:text-slate-200 leading-tight">Master Workspace</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate max-w-[120px] mt-0.5">{user?.email?.split('@')[0]}</p>
          </div>
          <div className="w-10 h-10 rounded-[1.25rem] bg-indigo-50 dark:bg-indigo-900/20 p-0.5 border border-indigo-100 dark:border-indigo-900/50 shadow-sm overflow-hidden">
            <img 
              src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.email || 'user'}`} 
              alt="User Avatar" 
              className="w-full h-full object-cover rounded-[1.1rem]"
            />
          </div>
        </div>
      </div>
    </header>
  );
}
