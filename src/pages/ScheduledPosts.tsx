import { Calendar, Clock, Image as ImageIcon, ExternalLink, Filter, ChevronLeft, ChevronRight } from 'lucide-react';

const posts = [
  { 
    id: 1, 
    content: "¿Tu equipo está listo para el caos de la temporada? 🍷 La sala llena es una excelente noticia...", 
    account: 'RestoGestión Official',
    platform: 'facebook',
    date: 'March 22, 2026',
    time: '18:30',
    status: 'scheduled'
  },
  { 
    id: 2, 
    content: "Un pedido mal anotado es dinero que tiras a la basura. 🗑️💸 Los errores humanos...", 
    account: 'RestoGestión Official',
    platform: 'facebook',
    date: 'March 23, 2026',
    time: '09:00',
    status: 'scheduled'
  },
  { 
    id: 3, 
    content: "La diferencia entre un restaurante que sobrevive y uno que escala es la información...", 
    account: 'RestoGestión IG',
    platform: 'instagram',
    date: 'March 24, 2026',
    time: '12:00',
    status: 'scheduled'
  },
];

export default function ScheduledPosts() {
  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Scheduled Posts</h1>
          <p className="mt-2 text-slate-400">View and manage your upcoming social media content.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-slate-900 border border-slate-800 rounded-xl p-1">
            <button className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg shadow-lg shadow-blue-500/20">List View</button>
            <button className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white transition-all">Calendar View</button>
          </div>
          <button className="p-2.5 bg-slate-900 border border-slate-800 text-slate-400 hover:text-white rounded-xl transition-all">
            <Filter size={20} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6 lg:max-h-[calc(100vh-280px)] overflow-y-auto pr-2 custom-scrollbar">
          {posts.map((post) => (
            <div key={post.id} className="group glass-panel rounded-2xl p-6 hover:border-blue-500/50 transition-all cursor-pointer">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-600/10 flex items-center justify-center">
                    <Calendar size={18} className="text-blue-500" />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-sm font-bold text-slate-200">{post.account}</p>
                    <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">{post.platform}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 px-3 py-1 bg-blue-500/10 rounded-full">
                  <Clock size={12} className="text-blue-500" />
                  <span className="text-[11px] font-bold text-blue-500 uppercase tracking-wider">{post.time}</span>
                </div>
              </div>

              <div className="mt-6">
                <p className="text-slate-300 text-sm leading-relaxed line-clamp-3">
                  {post.content}
                </p>
              </div>

              <div className="mt-6 pt-6 border-t border-slate-800 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 tracking-widest uppercase">
                  {post.date}
                </span>
                <div className="flex items-center gap-2">
                  <button className="p-2 text-slate-500 hover:text-white hover:bg-slate-800 rounded-lg transition-all">
                    <ExternalLink size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}
          
          <div className="flex items-center justify-center gap-4 py-4">
            <button className="p-2 bg-slate-900 border border-slate-800 text-slate-400 hover:text-white rounded-xl transition-all">
              <ChevronLeft size={20} />
            </button>
            <span className="text-sm font-bold text-slate-500">Page 1 of 5</span>
            <button className="p-2 bg-slate-900 border border-slate-800 text-slate-400 hover:text-white rounded-xl transition-all">
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

        <div className="hidden lg:block sticky top-0 h-fit bg-slate-900/50 border border-slate-800 rounded-3xl p-8">
          <div className="flex flex-col gap-6">
            <div className="aspect-video bg-slate-800 rounded-2xl flex items-center justify-center relative overflow-hidden group">
              <ImageIcon size={48} className="text-slate-700 group-hover:scale-110 transition-transform duration-500" />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 to-transparent"></div>
              <div className="absolute bottom-6 left-6 right-6">
                <div className="flex items-center gap-2 px-3 py-1 bg-blue-600 rounded-full w-fit mb-2">
                  <span className="text-[10px] font-bold text-white uppercase tracking-wider">Preview</span>
                </div>
                <p className="text-sm text-slate-300 line-clamp-2">Select a post to see how it will look on social media.</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Platform Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-950/50 rounded-2xl border border-slate-800">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Character Count</p>
                  <p className="text-xl font-bold text-white">124 <span className="text-xs text-slate-600">/ 2200</span></p>
                </div>
                <div className="p-4 bg-slate-950/50 rounded-2xl border border-slate-800">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Hashtags</p>
                  <p className="text-xl font-bold text-white">5 <span className="text-xs text-slate-600">used</span></p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
