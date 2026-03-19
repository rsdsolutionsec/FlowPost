import React from 'react';
import { motion } from 'framer-motion';

export default function Analytics() {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-10"
    >
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-extrabold tracking-tight text-on-surface font-headline">Analíticas de Rendimiento</h2>
          <p className="text-slate-500 mt-2 font-medium">Mide el impacto de tu contenido y optimiza tu estrategia.</p>
        </div>
        <div className="flex items-center gap-2 bg-surface-container-low p-1.5 rounded-2xl">
          <button className="px-4 py-2 bg-white shadow-sm rounded-xl text-xs font-bold text-primary">7 días</button>
          <button className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700">30 días</button>
          <button className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700">90 días</button>
        </div>
      </header>

      {/* Stats Overview */}
      <div className="grid grid-cols-4 gap-6">
        <MetricCard label="Alcance Total" value="124.5k" trend="+12%" icon="visibility" />
        <MetricCard label="Interacciones" value="8,942" trend="+5.4%" icon="favorite" />
        <MetricCard label="Clicks en Enlace" value="1,205" trend="+22%" icon="ads_click" />
        <MetricCard label="Seguidores" value="45.2k" trend="+0.8%" icon="person_add" />
      </div>

      <div className="grid grid-cols-3 gap-8">
        {/* Engagement Chart Placeholder */}
        <div className="col-span-2 bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-xl font-black text-slate-900 font-headline">Enganche por Día</h3>
            <span className="material-symbols-outlined text-slate-300">more_horiz</span>
          </div>
          <div className="h-64 flex items-end justify-between gap-4 px-4">
            {[40, 70, 45, 90, 65, 80, 50].map((h, i) => (
              <div key={i} className="flex-1 group relative">
                <div 
                  className="w-full bg-indigo-50 rounded-t-xl group-hover:bg-indigo-100 transition-all cursor-pointer" 
                  style={{ height: `${h}%` }}
                >
                  <div className="absolute inset-0 bg-primary opacity-0 group-hover:opacity-100 transition-opacity rounded-t-xl" style={{ height: '100%' }}></div>
                </div>
                <div className="mt-4 text-[10px] font-black text-slate-400 text-center uppercase tracking-widest">Día {i+1}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Content */}
        <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white overflow-hidden relative">
          <h3 className="text-xl font-black mb-6 font-headline relative z-10">Mejor Contenido</h3>
          <div className="space-y-6 relative z-10">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-white/50">image</span>
                </div>
                <div className="flex-1 truncate">
                  <p className="text-xs font-bold truncate">Post de Verano #{i}</p>
                  <p className="text-[10px] text-primary-fixed uppercase tracking-widest font-black">2.4k Likes</p>
                </div>
              </div>
            ))}
          </div>
          <div className="absolute bottom-0 right-0 w-32 h-32 bg-primary/20 blur-[80px]"></div>
        </div>
      </div>
    </motion.div>
  );
}

function MetricCard({ label, value, trend, icon }: { label: string, value: string, trend: string, icon: string }) {
  return (
    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
      <div className="flex justify-between items-start mb-4">
        <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
          <span className="material-symbols-outlined">{icon}</span>
        </div>
        <span className="text-xs font-black text-emerald-500 bg-emerald-50 px-2 py-1 rounded-lg">{trend}</span>
      </div>
      <div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">{label}</p>
        <p className="text-3xl font-black text-slate-900 font-headline">{value}</p>
      </div>
    </div>
  );
}
