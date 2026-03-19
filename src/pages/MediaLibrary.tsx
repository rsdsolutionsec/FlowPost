import React, { useState } from 'react';
import { motion } from 'framer-motion';

export default function MediaLibrary() {
  const [activeTab, setActiveTab] = useState('all');

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-10"
    >
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-extrabold tracking-tight text-on-surface font-headline">Biblioteca Multimedia</h2>
          <p className="text-slate-500 mt-2 font-medium">Todos tus assets visuales centralizados.</p>
        </div>
        <button className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 transition-transform shadow-xl shadow-slate-900/20 active:scale-95">
          Subir Archivos
        </button>
      </header>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {['all', 'images', 'videos', 'folders'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-2.5 rounded-full text-xs font-black uppercase tracking-widest transition-all ${
              activeTab === tab 
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 scale-105' 
                : 'bg-white text-slate-400 hover:text-slate-600'
            }`}
          >
            {tab === 'all' ? 'Todos' : tab === 'images' ? 'Imágenes' : tab === 'videos' ? 'Videos' : 'Carpetas'}
          </button>
        ))}
      </div>

      {/* Media Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
        {/* Folder Placeholder */}
        <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 aspect-square flex flex-col items-center justify-center gap-4 group cursor-pointer hover:border-indigo-200 transition-all">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform">
            <span className="material-symbols-outlined text-4xl">folder</span>
          </div>
          <div className="text-center">
            <p className="font-black text-slate-800 text-sm">Contenido Verano</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">12 archivos</p>
          </div>
        </div>

        {/* Media Item Placeholders */}
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div key={i} className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 aspect-square overflow-hidden group relative cursor-pointer">
            <div className="absolute inset-0 bg-slate-100 flex items-center justify-center">
              <span className="material-symbols-outlined text-slate-300 text-4xl group-hover:scale-110 transition-transform">image</span>
            </div>
            {/* Overlay */}
            <div className="absolute inset-0 bg-indigo-600/80 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3 p-4">
              <button className="w-10 h-10 rounded-full bg-white text-indigo-600 flex items-center justify-center">
                <span className="material-symbols-outlined">visibility</span>
              </button>
              <p className="text-white text-[10px] font-black uppercase tracking-widest text-center">post_assets_0{i}.jpg</p>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
