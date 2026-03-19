import { motion } from 'framer-motion';

export default function Settings() {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Header */}
      <div className="mb-12 flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-extrabold tracking-tight text-on-surface font-headline">Configuración</h2>
          <p className="text-slate-500 mt-2 font-medium">Gestiona tu cuenta, integraciones y preferencias del espacio de trabajo.</p>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-12 gap-10">
        
        {/* Left Column: Settings Navigation */}
        <div className="col-span-3">
          <div className="bg-surface-container-lowest rounded-2xl shadow-sm ghost-border p-4 sticky top-6">
            <nav className="space-y-1">
              <a href="#" className="flex items-center gap-3 px-4 py-3 bg-primary/10 text-primary font-bold rounded-xl transition-colors">
                <span className="material-symbols-outlined text-[20px]">person</span>
                Perfil
              </a>
              <a href="#" className="flex items-center gap-3 px-4 py-3 text-slate-600 font-medium hover:bg-surface-container-low rounded-xl transition-colors">
                <span className="material-symbols-outlined text-[20px]">business</span>
                Espacio de Trabajo
              </a>
              <a href="#" className="flex items-center gap-3 px-4 py-3 text-slate-600 font-medium hover:bg-surface-container-low rounded-xl transition-colors">
                <span className="material-symbols-outlined text-[20px]">hub</span>
                Integraciones
              </a>
              <a href="#" className="flex items-center gap-3 px-4 py-3 text-slate-600 font-medium hover:bg-surface-container-low rounded-xl transition-colors">
                <span className="material-symbols-outlined text-[20px]">credit_card</span>
                Facturación
              </a>
              <a href="#" className="flex items-center gap-3 px-4 py-3 text-slate-600 font-medium hover:bg-surface-container-low rounded-xl transition-colors">
                <span className="material-symbols-outlined text-[20px]">notifications</span>
                Notificaciones
              </a>
            </nav>
          </div>
        </div>

        {/* Right Column: Settings Content */}
        <div className="col-span-9 space-y-8">
          
          {/* Profile Section */}
          <div className="bg-surface-container-lowest rounded-2xl shadow-sm ghost-border overflow-hidden">
            <div className="px-8 py-6 border-b border-slate-100">
              <h3 className="font-bold text-lg text-slate-800">Información del Perfil</h3>
              <p className="text-sm text-slate-500">Actualiza tu foto y detalles personales.</p>
            </div>
            <div className="p-8 space-y-8">
              {/* Avatar Upload */}
              <div className="flex items-center gap-6">
                <div className="w-20 h-20 rounded-full bg-slate-200 overflow-hidden relative group cursor-pointer">
                  <img src="https://i.pravatar.cc/150?img=68" alt="Profile" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="material-symbols-outlined text-white">photo_camera</span>
                  </div>
                </div>
                <div>
                  <div className="flex gap-3">
                    <button className="px-4 py-2 bg-surface-container-low text-slate-700 text-sm font-bold rounded-lg hover:bg-surface-container transition-colors">Cambiar Avatar</button>
                    <button className="px-4 py-2 text-rose-600 text-sm font-bold hover:bg-rose-50 rounded-lg transition-colors">Eliminar</button>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">Recomendado: 256x256px. Máx 2MB.</p>
                </div>
              </div>

              {/* Form Fields */}
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Nombre Completo</label>
                  <input type="text" defaultValue="Alex Rivera" className="w-full px-4 py-2.5 bg-surface-container-low border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Correo Electrónico</label>
                  <input type="email" defaultValue="alex@empresa.com" className="w-full px-4 py-2.5 bg-surface-container-low border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
                </div>
                <div className="space-y-2 col-span-2">
                  <label className="text-sm font-bold text-slate-700">Biografía Corta</label>
                  <textarea rows={3} defaultValue="Social Media Manager & Content Creator." className="w-full px-4 py-2.5 bg-surface-container-low border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none"></textarea>
                </div>
              </div>
            </div>
            <div className="px-8 py-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button className="px-6 py-2 bg-primary text-white font-bold rounded-lg hover:bg-primary/90 transition-colors shadow-sm">Guardar Cambios</button>
            </div>
          </div>

          {/* Connected Accounts Section */}
          <div className="bg-surface-container-lowest rounded-2xl shadow-sm ghost-border overflow-hidden">
            <div className="px-8 py-6 border-b border-slate-100">
              <h3 className="font-bold text-lg text-slate-800">Cuentas Conectadas</h3>
              <p className="text-sm text-slate-500">Vincula tus perfiles sociales para publicar contenido.</p>
            </div>
            <div className="p-8 space-y-4">
              
              {/* Instagram */}
              <div className="flex items-center justify-between p-4 border border-slate-200 rounded-xl">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-tr from-amber-400 via-rose-500 to-purple-600 flex items-center justify-center text-white">
                    <span className="material-symbols-outlined">photo_camera</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-800">Instagram Business</h4>
                    <p className="text-xs text-slate-500">@empresa_oficial</p>
                  </div>
                </div>
                <button className="px-4 py-2 text-rose-600 text-sm font-bold hover:bg-rose-50 rounded-lg transition-colors">Desconectar</button>
              </div>

              {/* Facebook */}
              <div className="flex items-center justify-between p-4 border border-slate-200 rounded-xl">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center text-white">
                    <span className="material-symbols-outlined">thumb_up</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-800">Página de Facebook</h4>
                    <p className="text-xs text-slate-500">Empresa Oficial</p>
                  </div>
                </div>
                <button className="px-4 py-2 text-rose-600 text-sm font-bold hover:bg-rose-50 rounded-lg transition-colors">Desconectar</button>
              </div>

              {/* Twitter/X */}
              <div className="flex items-center justify-between p-4 border border-slate-200 rounded-xl bg-slate-50">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center text-white font-bold text-xl">
                    X
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-800">X (Twitter)</h4>
                    <p className="text-xs text-slate-500">No conectado</p>
                  </div>
                </div>
                <button className="px-4 py-2 bg-slate-800 text-white text-sm font-bold hover:bg-slate-700 rounded-lg transition-colors shadow-sm">Conectar Cuenta</button>
              </div>

            </div>
          </div>

        </div>
      </div>
    </motion.div>
  );
}
