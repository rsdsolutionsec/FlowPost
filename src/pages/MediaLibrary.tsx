import { Image as ImageIcon, Upload, Search, MoreVertical, LayoutGrid, List } from 'lucide-react';

export default function MediaLibrary() {
  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Media Library</h1>
          <p className="mt-2 text-slate-400">Organize and manage your campaign assets.</p>
        </div>
        <button className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-blue-500 hover:to-indigo-500 transition-all shadow-lg shadow-blue-500/25 active:scale-95">
          <Upload size={20} />
          Upload Files
        </button>
      </div>

      <div className="flex items-center justify-between p-4 bg-slate-900/50 border border-slate-800 rounded-2xl">
        <div className="flex items-center gap-4 flex-1 max-w-md">
          <Search className="text-slate-500" size={18} />
          <input 
            type="text" 
            placeholder="Search assets..." 
            className="bg-transparent border-none text-sm text-white focus:ring-0 w-full"
          />
        </div>
        <div className="flex items-center gap-2">
          <button className="p-2 text-blue-500 bg-blue-600/10 rounded-lg"><LayoutGrid size={18} /></button>
          <button className="p-2 text-slate-500 hover:text-slate-300 transition-colors"><List size={18} /></button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
          <div key={i} className="group relative aspect-square bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden hover:border-blue-500/50 transition-all">
            <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
              <button className="p-1.5 bg-slate-900/80 backdrop-blur-sm text-white rounded-lg border border-slate-700">
                <MoreVertical size={16} />
              </button>
            </div>
            <div className="w-full h-full flex items-center justify-center text-slate-800 group-hover:scale-110 transition-transform duration-500">
              <ImageIcon size={48} />
            </div>
            <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-slate-950 to-transparent">
              <p className="text-[10px] font-bold text-slate-200 truncate uppercase tracking-widest">Asset_{i}.png</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
