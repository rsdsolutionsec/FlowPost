import { motion } from 'framer-motion';

export default function MediaLibrary() {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-12"
    >
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-extrabold tracking-tight text-on-surface font-headline">Biblioteca de Medios</h2>
          <p className="text-slate-500 mt-2 font-medium">Gestiona todas tus imágenes y archivos multimedia.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1,2,3,4,5,6,7,8].map(i => (
          <div key={i} className="aspect-square bg-surface-container-low rounded-[2rem] ghost-border overflow-hidden group relative cursor-pointer">
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center">
              <span className="material-symbols-outlined text-white opacity-0 group-hover:opacity-100 transition-all text-4xl">zoom_in</span>
            </div>
            <div className="w-full h-full flex items-center justify-center bg-slate-50">
              <span className="material-symbols-outlined text-slate-200 text-6xl">image</span>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
