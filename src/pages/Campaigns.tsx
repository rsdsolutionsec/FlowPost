import React from 'react';
import { motion } from 'framer-motion';

export default function Campaigns() {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Header */}
      <div className="mb-12 flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-extrabold tracking-tight text-on-surface font-headline">Campañas</h2>
          <p className="text-slate-500 mt-2 font-medium">Agrupa tus publicaciones por objetivos y eventos.</p>
        </div>
        <button className="px-5 py-2.5 bg-primary text-white font-semibold rounded-full hover:translate-y-[-1px] transition-all flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">add</span>
          <span>Nueva Campaña</span>
        </button>
      </div>

      {/* Campaigns Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        
        {/* Campaign Card 1 */}
        <div className="bg-surface-container-lowest rounded-3xl shadow-sm overflow-hidden group ghost-border border border-slate-100">
          <div className="h-40 bg-indigo-600 relative overflow-hidden">
            {/* Decorative background patterns */}
            <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '20px 20px' }}></div>
            <div className="absolute bottom-4 left-6">
              <span className="px-2 py-1 bg-white/20 backdrop-blur-md rounded text-[10px] font-black text-white uppercase tracking-widest">Activa</span>
            </div>
          </div>
          <div className="p-8">
            <h3 className="text-xl font-black text-slate-900 mb-2 font-headline group-hover:text-primary transition-colors">Lanzamiento Verano 2024</h3>
            <p className="text-sm text-slate-500 mb-6 font-medium">Campaña principal para promocionar la nueva colección de temporada.</p>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="p-3 bg-surface-container-low rounded-xl">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Posts</p>
                <p className="text-xl font-black text-slate-800">24</p>
              </div>
              <div className="p-3 bg-surface-container-low rounded-xl">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Impacto</p>
                <p className="text-xl font-black text-slate-800">12.5k</p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <div className="flex -space-x-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-slate-200 overflow-hidden ring-1 ring-slate-100">
                    <img src={`https://i.pravatar.cc/100?img=${i+10}`} alt="User" />
                  </div>
                ))}
              </div>
              <button className="text-sm font-black text-primary uppercase tracking-widest flex items-center gap-1 hover:gap-2 transition-all">
                Ver Detalles <span className="material-symbols-outlined text-[18px]">chevron_right</span>
              </button>
            </div>
          </div>
        </div>

        {/* Campaign Card 2 */}
        <div className="bg-surface-container-lowest rounded-3xl shadow-sm overflow-hidden group ghost-border border border-slate-100 opacity-60 grayscale hover:grayscale-0 hover:opacity-100 transition-all">
          <div className="h-40 bg-slate-800 relative overflow-hidden">
            <div className="absolute bottom-4 left-6">
              <span className="px-2 py-1 bg-white/20 backdrop-blur-md rounded text-[10px] font-black text-white uppercase tracking-widest">Finalizada</span>
            </div>
          </div>
          <div className="p-8">
            <h3 className="text-xl font-black text-slate-900 mb-2 font-headline">Black Friday 2023</h3>
            <p className="text-sm text-slate-500 mb-6 font-medium">Ofertas y promociones especiales para el mes de Noviembre.</p>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="p-3 bg-surface-container-low rounded-xl">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Posts</p>
                <p className="text-xl font-black text-slate-800">18</p>
              </div>
              <div className="p-3 bg-surface-container-low rounded-xl">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Impacto</p>
                <p className="text-xl font-black text-slate-800">8.9k</p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <div className="flex -space-x-2">
                {[4, 5].map(i => (
                  <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-slate-200 overflow-hidden">
                    <img src={`https://i.pravatar.cc/100?img=${i+20}`} alt="User" />
                  </div>
                ))}
              </div>
              <button className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                Ver Informe <span className="material-symbols-outlined text-[18px]">chevron_right</span>
              </button>
            </div>
          </div>
        </div>

        {/* New Campaign Placeholder */}
        <div className="bg-slate-50/50 rounded-[3rem] border-4 border-dashed border-slate-200 flex flex-col items-center justify-center p-10 text-center hover:bg-slate-50 transition-colors cursor-pointer group">
          <div className="w-20 h-20 rounded-full bg-white shadow-sm flex items-center justify-center mb-6 text-slate-300 group-hover:text-primary group-hover:scale-110 transition-all">
            <span className="material-symbols-outlined text-4xl">add</span>
          </div>
          <h4 className="text-xl font-black text-slate-400 mb-2">Nueva Campaña</h4>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Comenzar ahora</p>
        </div>

      </div>
    </motion.div>
  );
}
