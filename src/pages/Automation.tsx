import { motion } from 'framer-motion';

export default function Automation() {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-12"
    >
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-black tracking-tight text-slate-900 font-headline">Pilotos Automáticos</h2>
          <p className="text-slate-500 mt-2 font-medium">Contrata robots para que publiquen por ti las 24 horas.</p>
        </div>
        <div className="flex gap-3">
          <button className="px-6 py-3 bg-indigo-600 text-white font-black rounded-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-2 shadow-lg shadow-indigo-600/20 text-sm uppercase tracking-widest">
            <span className="material-symbols-outlined text-[18px]">add</span>
            <span>Crear Flujo</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Rules List */}
        <div className="lg:col-span-4 space-y-6">
          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 px-4">Tus Flujos</h3>
          
          <div className="space-y-4">
            {/* Rule Card 1 */}
            <div className="p-6 bg-white rounded-[2rem] shadow-sm border border-slate-100 cursor-pointer ring-4 ring-indigo-50 transition-all group">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                    <span className="material-symbols-outlined">bolt</span>
                  </div>
                  <div>
                    <h4 className="font-black text-slate-900">Auto-Contenido</h4>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Carpeta a Redes</p>
                  </div>
                </div>
                {/* Toggle Switch */}
                <div className="w-10 h-6 bg-emerald-500 rounded-full flex items-center p-1 cursor-pointer">
                  <div className="w-4 h-4 bg-white rounded-full shadow-sm transform translate-x-4 transition-transform"></div>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs font-bold text-slate-500 bg-slate-50 p-3 rounded-xl mt-4 border border-slate-100">
                <span className="material-symbols-outlined text-[16px] text-slate-400">folder</span>
                <span>Carpeta: Lanzamiento Verano</span>
              </div>
            </div>

            {/* Rule Card 2 */}
            <div className="p-6 bg-white/50 rounded-[2rem] border border-dashed border-slate-200 hover:border-indigo-200 transition-colors cursor-pointer group">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-4 opacity-60 group-hover:opacity-100 transition-opacity">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center">
                    <span className="material-symbols-outlined">repeat</span>
                  </div>
                  <div>
                    <h4 className="font-black text-slate-900">Reciclaje</h4>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Posts de éxito</p>
                  </div>
                </div>
                {/* Toggle Switch */}
                <div className="w-10 h-6 bg-slate-200 rounded-full flex items-center p-1 cursor-pointer">
                  <div className="w-4 h-4 bg-white rounded-full shadow-sm transition-transform"></div>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs font-bold text-slate-400 bg-slate-50/50 p-3 rounded-xl mt-4">
                <span className="material-symbols-outlined text-[16px]">schedule</span>
                <span>Cada 30 días</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Flow Builder (Visual Representation) */}
        <div className="lg:col-span-8">
          <div className="bg-white rounded-[3rem] shadow-sm border border-slate-100 h-full min-h-[600px] flex flex-col overflow-hidden">
            {/* Builder Header */}
            <div className="px-10 py-8 border-b border-slate-50 flex flex-col sm:flex-row justify-between items-center gap-4">
              <div>
                <h3 className="font-black text-2xl text-slate-900 font-headline">Configuración de Flujo</h3>
                <p className="text-sm text-slate-400 font-bold">Personaliza cómo tus robots publican contenido</p>
              </div>
              <div className="flex gap-3">
                <button className="px-6 py-2 text-xs font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors">Cancelar</button>
                <button className="px-6 py-3 text-xs font-black text-white bg-slate-900 rounded-xl uppercase tracking-widest shadow-lg hover:translate-y-[-2px] active:translate-y-0 transition-all">Guardar</button>
              </div>
            </div>

            {/* Builder Canvas (Simplified Visual Representation) */}
            <div className="flex-1 bg-slate-50/30 p-10 flex flex-col items-center justify-start overflow-y-auto relative">
              {/* Grid Background */}
              <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(#e2e8f0 1.5px, transparent 1.5px)', backgroundSize: '30px 30px', opacity: 0.5 }}></div>

              {/* Trigger Node */}
              <div className="relative z-10 w-full max-w-sm bg-white p-6 rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-50 flex flex-col items-center text-center group hover:scale-[1.02] transition-transform">
                <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center mb-4 rotate-3 group-hover:rotate-0 transition-transform">
                  <span className="material-symbols-outlined text-3xl">add_photo_alternate</span>
                </div>
                <h4 className="font-black text-lg text-slate-900">Nuevo archivo en carpeta</h4>
                <p className="text-sm text-slate-400 font-medium mt-1">Escaneando "Lanzamiento Verano"</p>
              </div>

              {/* Connector Line */}
              <div className="w-1 h-12 bg-indigo-100 relative z-0"></div>

              {/* Action Node 1 */}
              <div className="relative z-10 w-full max-w-sm bg-white p-6 rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-50 flex flex-col items-center text-center group hover:scale-[1.02] transition-transform">
                <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-3xl flex items-center justify-center mb-4 -rotate-3 group-hover:rotate-0 transition-transform">
                  <span className="material-symbols-outlined text-3xl">chat</span>
                </div>
                <h4 className="font-black text-lg text-slate-900">Elegir texto inteligente</h4>
                <p className="text-sm text-slate-400 font-medium mt-1">Usa grupo "Textos Verano 2024"</p>
              </div>

              {/* Connector Line */}
              <div className="w-1 h-12 bg-indigo-100 relative z-0"></div>

              {/* Action Node 2 */}
              <div className="relative z-10 w-full max-w-sm bg-white p-6 rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100 flex flex-col items-center text-center group hover:scale-[1.02] transition-transform">
                <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-3xl flex items-center justify-center mb-4 rotate-6 group-hover:rotate-0 transition-transform">
                  <span className="material-symbols-outlined text-3xl">calendar_month</span>
                </div>
                <h4 className="font-black text-lg text-slate-900">Programar Salida</h4>
                <p className="text-sm text-slate-400 font-medium mt-1">Lunes a Viernes (Horario Laboral)</p>
                <div className="flex gap-2 mt-6">
                  <span className="px-3 py-1 bg-slate-50 rounded-lg text-[10px] font-black text-slate-400 uppercase tracking-widest border border-slate-100">Instagram</span>
                  <span className="px-3 py-1 bg-slate-50 rounded-lg text-[10px] font-black text-slate-400 uppercase tracking-widest border border-slate-100">Facebook</span>
                </div>
              </div>

              {/* Add Node Button */}
              <div className="w-1 h-10 bg-indigo-50 relative z-0"></div>
              <button className="relative z-10 w-12 h-12 bg-white border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-center text-slate-300 hover:border-indigo-600 hover:text-indigo-600 transition-all shadow-sm hover:scale-110 active:scale-95">
                <span className="material-symbols-outlined">add</span>
              </button>

            </div>
          </div>
        </div>

      </div>
    </motion.div>
  );
}
