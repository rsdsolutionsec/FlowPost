import { motion } from 'framer-motion';

export default function MediaLibrary() {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Header */}
      <div className="mb-12 flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-extrabold tracking-tight text-on-surface font-headline">Biblioteca de Medios</h2>
          <p className="text-slate-500 mt-2 font-medium">Sube, organiza y reutiliza tus imágenes y videos.</p>
        </div>
        <div className="flex gap-3">
          <button className="px-5 py-2.5 bg-surface-container-highest text-on-surface font-semibold rounded-full hover:translate-y-[-1px] transition-all flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">create_new_folder</span>
            <span>Nueva Carpeta</span>
          </button>
          <button className="px-5 py-2.5 bg-primary text-white font-semibold rounded-full hover:translate-y-[-1px] transition-all flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">cloud_upload</span>
            <span>Subir Archivos</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="bg-surface-container-lowest rounded-2xl shadow-sm ghost-border overflow-hidden min-h-[600px] flex flex-col">
        {/* Toolbar */}
        <div className="px-8 py-4 border-b border-slate-100 flex items-center justify-between bg-white/50 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-4">
            {/* Search */}
            <div className="relative w-64">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">search</span>
              <input 
                type="text" 
                placeholder="Buscar archivos..." 
                className="w-full pl-10 pr-4 py-2 bg-surface-container-low rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>
            {/* Filters */}
            <div className="flex gap-2">
              <button className="px-3 py-1.5 bg-primary/10 text-primary text-xs font-bold rounded-lg">Todos</button>
              <button className="px-3 py-1.5 hover:bg-surface-container-low text-slate-500 text-xs font-bold rounded-lg transition-colors">Imágenes</button>
              <button className="px-3 py-1.5 hover:bg-surface-container-low text-slate-500 text-xs font-bold rounded-lg transition-colors">Videos</button>
            </div>
          </div>
          
          {/* View Toggles */}
          <div className="flex items-center gap-2 bg-surface-container-low p-1 rounded-xl">
            <button className="p-1.5 bg-white shadow-sm rounded-lg text-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-[18px]">grid_view</span>
            </button>
            <button className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg flex items-center justify-center transition-colors">
              <span className="material-symbols-outlined text-[18px]">list</span>
            </button>
          </div>
        </div>

        {/* Drag & Drop Zone / Grid */}
        <div className="flex-1 p-8">
          {/* Folders Section */}
          <div className="mb-8">
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Carpetas</h3>
            <div className="grid grid-cols-4 gap-4">
              <div className="p-4 bg-surface-container-low rounded-xl hover:bg-surface-container cursor-pointer transition-colors flex items-center gap-3 border border-transparent hover:border-slate-200">
                <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>folder</span>
                <span className="font-semibold text-sm text-slate-700">Logos & Branding</span>
              </div>
              <div className="p-4 bg-surface-container-low rounded-xl hover:bg-surface-container cursor-pointer transition-colors flex items-center gap-3 border border-transparent hover:border-slate-200">
                <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>folder</span>
                <span className="font-semibold text-sm text-slate-700">Campaña Verano</span>
              </div>
              <div className="p-4 bg-surface-container-low rounded-xl hover:bg-surface-container cursor-pointer transition-colors flex items-center gap-3 border border-transparent hover:border-slate-200">
                <span className="material-symbols-outlined text-slate-400" style={{ fontVariationSettings: "'FILL' 1" }}>folder</span>
                <span className="font-semibold text-sm text-slate-700">Plantillas</span>
              </div>
            </div>
          </div>

          {/* Files Section */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Archivos Recientes</h3>
            <div className="grid grid-cols-5 gap-6">
              {/* Image Item */}
              <div className="group relative aspect-square rounded-xl overflow-hidden bg-slate-100 border border-slate-200 cursor-pointer">
                <img 
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuCFIbmW3O_G4NwVWCz6GbI0LD3uJndNKc91yXn6L4BBOypy_JgO50T251NKu8bpHAOrBWk1aoqg3WU-7kOtM18T-GVltFY5snHkc38t60KoYynqyXt4S0afn9937Si9FNLQ_wwBSBmg9ICL6eGCoDOvBYprB37l7U1WUsDZTZANOvdhfAWIi8qfG37P1NfJdl5yNw8tK1J0sN94d2xvmaf6i85Wl8Mwo3jv5vm_j8UvBx_VvK_XUoxg3jAbNwlwqtdPRuTmYmhYdgZ7" 
                  alt="Media" 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity p-3 flex flex-col justify-between">
                  <div className="flex justify-end">
                    <button className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur-md text-white flex items-center justify-center hover:bg-white/40 transition-colors">
                      <span className="material-symbols-outlined text-[16px]">more_vert</span>
                    </button>
                  </div>
                  <div>
                    <p className="text-white text-xs font-medium truncate">hero_banner_v2.jpg</p>
                    <p className="text-white/70 text-[10px]">2.4 MB • 1920x1080</p>
                  </div>
                </div>
              </div>

              {/* Image Item */}
              <div className="group relative aspect-square rounded-xl overflow-hidden bg-slate-100 border border-slate-200 cursor-pointer">
                <img 
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuAmiouUnb5dc8s9lwM1NedQ_QCkalbAuV7uNZTxpbumuQcV3TpamSshwmrew6OsRlS3yS32UavWFYfSSRTlbI18_yoZ8oE5UM4e01TUd48SoDwr6z__V4dxA3VFkIagaxpJVkV3TGqavXjl_ntULJnYZHzDw51zekundpFHCctCgo0kUubGA22KHqgPX-4B4dg_FJLT43GjSL5rdjd5cKsq0REIZMcS65_K56orsF3Haf_1raDwN1mmmDrR8aoPO8f1EY92RmmGWLEU" 
                  alt="Media" 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity p-3 flex flex-col justify-between">
                  <div className="flex justify-end">
                    <button className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur-md text-white flex items-center justify-center hover:bg-white/40 transition-colors">
                      <span className="material-symbols-outlined text-[16px]">more_vert</span>
                    </button>
                  </div>
                  <div>
                    <p className="text-white text-xs font-medium truncate">lifestyle_shot.jpg</p>
                    <p className="text-white/70 text-[10px]">1.8 MB • 1080x1080</p>
                  </div>
                </div>
              </div>

              {/* Video Item Placeholder */}
              <div className="group relative aspect-square rounded-xl overflow-hidden bg-slate-800 border border-slate-700 cursor-pointer flex items-center justify-center">
                <span className="material-symbols-outlined text-white/50 text-4xl group-hover:scale-110 transition-transform">play_circle</span>
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity p-3 flex flex-col justify-between">
                  <div className="flex justify-end">
                    <button className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur-md text-white flex items-center justify-center hover:bg-white/40 transition-colors">
                      <span className="material-symbols-outlined text-[16px]">more_vert</span>
                    </button>
                  </div>
                  <div>
                    <p className="text-white text-xs font-medium truncate">promo_reel.mp4</p>
                    <p className="text-white/70 text-[10px]">15.2 MB • 0:15s</p>
                  </div>
                </div>
                {/* Duration Badge */}
                <div className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/60 rounded text-[10px] text-white font-mono">
                  0:15
                </div>
              </div>

              {/* Drag & Drop Area */}
              <div className="col-span-2 aspect-[2/1] md:aspect-auto rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 flex flex-col items-center justify-center p-6 text-center hover:bg-primary/10 hover:border-primary/50 transition-all cursor-pointer">
                <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center mb-3 text-primary">
                  <span className="material-symbols-outlined">cloud_upload</span>
                </div>
                <p className="text-sm font-bold text-slate-700">Arrastra archivos aquí</p>
                <p className="text-xs text-slate-500 mt-1">o haz clic para explorar</p>
                <p className="text-[10px] text-slate-400 mt-4 uppercase tracking-widest font-semibold">JPG, PNG, MP4 hasta 50MB</p>
              </div>

            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
