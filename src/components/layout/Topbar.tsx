import { useState } from 'react';
import { Bell, Search, Plus, UserCircle2, ChevronDown } from 'lucide-react';
import CreatePostModal from '../CreatePostModal';

export default function Topbar() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <header className="h-20 bg-slate-900/50 backdrop-blur-md border-b border-slate-800 flex items-center justify-between px-8 sticky top-0 z-40">
        <div className="flex-1 max-w-lg">
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
            </div>
            <input
              type="text"
              className="block w-full bg-slate-900/50 border border-slate-700 rounded-xl py-2.5 pl-11 pr-3 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
              placeholder="Search something..."
            />
          </div>
        </div>

        <div className="flex items-center gap-6">
          <button 
            onClick={() => setIsModalOpen(true)}
            className="hidden sm:flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-5 py-2.5 rounded-xl font-medium hover:from-blue-500 hover:to-indigo-500 transition-all shadow-lg shadow-blue-500/20 active:scale-95"
          >
            <Plus size={20} />
            New Post
          </button>

          <div className="flex items-center gap-4">
            <button className="p-2.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all relative">
              <Bell size={22} />
              <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-slate-900"></span>
            </button>
            
            <div className="h-8 w-px bg-slate-800"></div>

            <button className="flex items-center gap-3 p-1.5 pr-3 text-slate-400 hover:bg-slate-800 rounded-xl transition-all group">
              <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center overflow-hidden border border-slate-700 group-hover:border-slate-600">
                <UserCircle2 size={24} className="text-slate-400" />
              </div>
              <div className="flex flex-col items-start leading-tight">
                <span className="text-sm font-semibold text-slate-200">Robin</span>
                <span className="text-[11px] text-slate-500">Admin Account</span>
              </div>
              <ChevronDown size={14} className="ml-1 opacity-50" />
            </button>
          </div>
        </div>
      </header>

      <CreatePostModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
}
