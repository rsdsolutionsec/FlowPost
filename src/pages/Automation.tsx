import { motion } from 'framer-motion';

export default function Automation() {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Header */}
      <div className="mb-12 flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-extrabold tracking-tight text-on-surface font-headline">Automatización</h2>
          <p className="text-slate-500 mt-2 font-medium">Crea flujos de trabajo inteligentes para tus redes sociales.</p>
        </div>
        <div className="flex gap-3">
          <button className="px-5 py-2.5 bg-primary text-white font-semibold rounded-full hover:translate-y-[-1px] transition-all flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">add</span>
            <span>Nueva Regla</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-12 gap-8">
        
        {/* Left Column: Rules List */}
        <div className="col-span-4 space-y-6">
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 px-2">Reglas Activas</h3>
          
          <div className="space-y-4">
            {/* Rule Card 1 */}
            <div className="p-5 bg-surface-container-lowest rounded-2xl shadow-sm ghost-border cursor-pointer ring-2 ring-primary/10">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                    <span className="material-symbols-outlined">bolt</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-800">Campaña de Verano</h4>
                    <p className="text-xs text-slate-500">Auto-programar imágenes nuevas</p>
                  </div>
                </div>
                {/* Toggle Switch */}
                <div className="w-10 h-6 bg-emerald-500 rounded-full flex items-center p-1 cursor-pointer">
                  <div className="w-4 h-4 bg-white rounded-full shadow-sm transform translate-x-4 transition-transform"></div>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs font-medium text-slate-500 bg-slate-50 p-2 rounded-lg mt-4">
                <span className="material-symbols-outlined text-[16px] text-slate-400">folder</span>
                <span>Carpeta: Lanzamiento Verano</span>
              </div>
            </div>

            {/* Rule Card 2 */}
            <div className="p-5 bg-surface-container-low rounded-2xl hover:bg-surface-container transition-colors cursor-pointer border border-transparent hover:border-slate-200">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-200 text-slate-500 flex items-center justify-center">
                    <span className="material-symbols-outlined">repeat</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-800">Reciclaje de Contenido</h4>
                    <p className="text-xs text-slate-500">Republicar posts exitosos</p>
                  </div>
                </div>
                {/* Toggle Switch */}
                <div className="w-10 h-6 bg-slate-300 rounded-full flex items-center p-1 cursor-pointer">
                  <div className="w-4 h-4 bg-white rounded-full shadow-sm transition-transform"></div>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs font-medium text-slate-500 bg-slate-100 p-2 rounded-lg mt-4">
                <span className="material-symbols-outlined text-[16px] text-slate-400">schedule</span>
                <span>Cada 30 días</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Flow Builder (Visual Representation) */}
        <div className="col-span-8">
          <div className="bg-surface-container-lowest rounded-2xl shadow-sm ghost-border h-full min-h-[600px] flex flex-col">
            {/* Builder Header */}
            <div className="px-8 py-5 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-lg text-slate-800">Campaña de Verano</h3>
                <p className="text-xs text-slate-500">Editando flujo de automatización</p>
              </div>
              <div className="flex gap-2">
                <button className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">Descartar</button>
                <button className="px-4 py-2 text-sm font-bold text-white bg-primary rounded-lg shadow-sm hover:bg-primary/90 transition-colors">Guardar Cambios</button>
              </div>
            </div>

            {/* Builder Canvas (Simplified Visual Representation) */}
            <div className="flex-1 bg-slate-50/50 p-8 flex flex-col items-center justify-start overflow-y-auto relative">
              {/* Grid Background */}
              <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)', backgroundSize: '24px 24px', opacity: 0.4 }}></div>

              {/* Trigger Node */}
              <div className="relative z-10 w-80 bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col items-center text-center">
                <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mb-3">
                  <span className="material-symbols-outlined text-[24px]">add_photo_alternate</span>
                </div>
                <h4 className="font-bold text-sm text-slate-800">Cuando se añade un archivo</h4>
                <p className="text-xs text-slate-500 mt-1">A la carpeta "Lanzamiento Verano"</p>
              </div>

              {/* Connector Line */}
              <div className="w-0.5 h-12 bg-slate-300 relative z-0"></div>

              {/* Action Node 1 */}
              <div className="relative z-10 w-80 bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col items-center text-center">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-3">
                  <span className="material-symbols-outlined text-[24px]">chat</span>
                </div>
                <h4 className="font-bold text-sm text-slate-800">Asignar Texto Aleatorio</h4>
                <p className="text-xs text-slate-500 mt-1">Del grupo "Textos Verano 2024"</p>
                <button className="mt-4 text-xs font-bold text-primary hover:underline">Configurar Textos</button>
              </div>

              {/* Connector Line */}
              <div className="w-0.5 h-12 bg-slate-300 relative z-0"></div>

              {/* Action Node 2 */}
              <div className="relative z-10 w-80 bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col items-center text-center">
                <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mb-3">
                  <span className="material-symbols-outlined text-[24px]">calendar_month</span>
                </div>
                <h4 className="font-bold text-sm text-slate-800">Programar Publicación</h4>
                <p className="text-xs text-slate-500 mt-1">Siguiente hueco disponible (L-V, 9am-5pm)</p>
                <div className="flex gap-2 mt-4">
                  <span className="px-2 py-1 bg-slate-100 rounded text-[10px] font-bold text-slate-600">Instagram</span>
                  <span className="px-2 py-1 bg-slate-100 rounded text-[10px] font-bold text-slate-600">Facebook</span>
                </div>
              </div>

              {/* Add Node Button */}
              <div className="w-0.5 h-8 bg-slate-300 relative z-0"></div>
              <button className="relative z-10 w-10 h-10 bg-white border-2 border-dashed border-slate-300 rounded-full flex items-center justify-center text-slate-400 hover:border-primary hover:text-primary transition-colors shadow-sm">
                <span className="material-symbols-outlined">add</span>
              </button>

            </div>
          </div>
        </div>

      </div>
    </motion.div>
  );
}
