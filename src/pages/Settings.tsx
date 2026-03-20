import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export default function Settings() {
  const { user } = useAuth();
  const [activeSection, setActiveSection] = useState<'profile' | 'integrations'>('profile');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Integration Settings State
  const [settings, setSettings] = useState({
    whatsapp_enabled: false,
    whatsapp_number: '',
    website_enabled: false,
    website_url: '',
    email_enabled: false,
    email_address: ''
  });

  useEffect(() => {
    if (user) {
      fetchSettings();
    }
  }, [user]);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
        throw error;
      }

      if (data) {
        setSettings({
          whatsapp_enabled: data.whatsapp_enabled,
          whatsapp_number: data.whatsapp_number || '',
          website_enabled: data.website_enabled,
          website_url: data.website_url || '',
          email_enabled: data.email_enabled,
          email_address: data.email_address || ''
        });
      }
    } catch (error: any) {
      console.error('Error fetching settings:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveIntegrations = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: user.id,
          ...settings,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      alert('Configuraciones guardadas correctamente');
    } catch (error: any) {
      alert('Error al guardar configuraciones: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

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
              <button 
                type="button"
                onClick={() => setActiveSection('profile')}
                className={`w-full flex items-center gap-3 px-4 py-3 font-bold rounded-xl transition-colors ${activeSection === 'profile' ? 'bg-primary/10 text-primary' : 'text-slate-600 hover:bg-surface-container-low'}`}
              >
                <span className="material-symbols-outlined text-[20px]">person</span>
                Perfil
              </button>
              <button 
                type="button"
                onClick={() => setActiveSection('integrations')}
                className={`w-full flex items-center gap-3 px-4 py-3 font-bold rounded-xl transition-colors ${activeSection === 'integrations' ? 'bg-primary/10 text-primary' : 'text-slate-600 hover:bg-surface-container-low'}`}
              >
                <span className="material-symbols-outlined text-[20px]">hub</span>
                Integraciones
              </button>
              <a href="#" className="flex items-center gap-3 px-4 py-3 text-slate-600 font-medium hover:bg-surface-container-low rounded-xl transition-colors opacity-50 cursor-not-allowed">
                <span className="material-symbols-outlined text-[20px]">business</span>
                Espacio de Trabajo
              </a>
              <a href="#" className="flex items-center gap-3 px-4 py-3 text-slate-600 font-medium hover:bg-surface-container-low rounded-xl transition-colors opacity-50 cursor-not-allowed">
                <span className="material-symbols-outlined text-[20px]">credit_card</span>
                Facturación
              </a>
              <a href="#" className="flex items-center gap-3 px-4 py-3 text-slate-600 font-medium hover:bg-surface-container-low rounded-xl transition-colors opacity-50 cursor-not-allowed">
                <span className="material-symbols-outlined text-[20px]">notifications</span>
                Notificaciones
              </a>
            </nav>
          </div>
        </div>

        {/* Right Column: Settings Content */}
        <div className="col-span-9 space-y-8">
          
          {activeSection === 'profile' && (
            <>
              {/* Profile Section */}
              <div className="bg-surface-container-lowest rounded-2xl shadow-sm ghost-border overflow-hidden animate-in fade-in duration-300">
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
                      <input type="email" defaultValue={user?.email || "alex@empresa.com"} className="w-full px-4 py-2.5 bg-surface-container-low border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
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
              <div className="bg-surface-container-lowest rounded-2xl shadow-sm ghost-border overflow-hidden animate-in fade-in duration-300">
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
            </>
          )}

          {activeSection === 'integrations' && (
            <div className="bg-surface-container-lowest rounded-2xl shadow-sm ghost-border overflow-hidden animate-in fade-in duration-300">
              <div className="px-8 py-6 border-b border-slate-100">
                <h3 className="font-bold text-lg text-slate-800">Integraciones de Contacto</h3>
                <p className="text-sm text-slate-500">Configura los datos que aparecerán automáticamente en tus publicaciones.</p>
              </div>
              <div className="p-8 space-y-10">
                
                {loading ? (
                  <div className="text-center py-10 text-slate-400 font-bold animate-pulse">Cargando vinculaciones...</div>
                ) : (
                  <>
                    {/* WhatsApp Integration */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-sm">
                            <span className="material-symbols-outlined text-2xl">chat</span>
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-800">WhatsApp</h4>
                            <p className="text-xs text-slate-500 font-medium">Enlace Directo wa.me</p>
                          </div>
                        </div>
                        <button 
                          type="button"
                          onClick={() => setSettings({...settings, whatsapp_enabled: !settings.whatsapp_enabled})}
                          className={`w-12 h-6 rounded-full transition-all relative ${settings.whatsapp_enabled ? 'bg-emerald-500 shadow-md shadow-emerald-500/20' : 'bg-slate-200'}`}
                        >
                          <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settings.whatsapp_enabled ? 'left-7' : 'left-1'}`}></div>
                        </button>
                      </div>
                      <div className={`space-y-2 transition-all duration-300 overflow-hidden ${settings.whatsapp_enabled ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0 pointer-events-none'}`}>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Número de WhatsApp (con código de país, ej: 593999999999)</label>
                        <input 
                          type="text" 
                          placeholder="593XXXXXXXXX"
                          value={settings.whatsapp_number}
                          onChange={(e) => setSettings({...settings, whatsapp_number: e.target.value.replace(/\D/g, '')})}
                          className="w-full px-4 py-3 bg-surface-container-low border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium" 
                        />
                      </div>
                    </div>

                    {/* Email Integration */}
                    <div className="space-y-4 pt-6 border-t border-slate-100">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center shadow-sm">
                            <span className="material-symbols-outlined text-2xl">mail</span>
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-800">Correo Electrónico</h4>
                            <p className="text-xs text-slate-500 font-medium">Contacto de ventas</p>
                          </div>
                        </div>
                        <button 
                          type="button"
                          onClick={() => setSettings({...settings, email_enabled: !settings.email_enabled})}
                          className={`w-12 h-6 rounded-full transition-all relative ${settings.email_enabled ? 'bg-blue-500 shadow-md shadow-blue-500/20' : 'bg-slate-200'}`}
                        >
                          <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settings.email_enabled ? 'left-7' : 'left-1'}`}></div>
                        </button>
                      </div>
                      <div className={`space-y-2 transition-all duration-300 overflow-hidden ${settings.email_enabled ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0 pointer-events-none'}`}>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Dirección de Correo</label>
                        <input 
                          type="email" 
                          placeholder="contacto@tusitio.com"
                          value={settings.email_address}
                          onChange={(e) => setSettings({...settings, email_address: e.target.value})}
                          className="w-full px-4 py-3 bg-surface-container-low border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium" 
                        />
                      </div>
                    </div>

                    {/* Website Integration */}
                    <div className="space-y-4 pt-6 border-t border-slate-100">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center shadow-sm">
                            <span className="material-symbols-outlined text-2xl">language</span>
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-800">Página Web</h4>
                            <p className="text-xs text-slate-500 font-medium">Enlace corporativo</p>
                          </div>
                        </div>
                        <button 
                          type="button"
                          onClick={() => setSettings({...settings, website_enabled: !settings.website_enabled})}
                          className={`w-12 h-6 rounded-full transition-all relative ${settings.website_enabled ? 'bg-indigo-500 shadow-md shadow-indigo-500/20' : 'bg-slate-200'}`}
                        >
                          <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settings.website_enabled ? 'left-7' : 'left-1'}`}></div>
                        </button>
                      </div>
                      <div className={`space-y-2 transition-all duration-300 overflow-hidden ${settings.website_enabled ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0 pointer-events-none'}`}>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">URL del Sitio Web</label>
                        <input 
                          type="url" 
                          placeholder="https://www.tusitio.com"
                          value={settings.website_url}
                          onChange={(e) => setSettings({...settings, website_url: e.target.value})}
                          className="w-full px-4 py-3 bg-surface-container-low border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium" 
                        />
                      </div>
                    </div>
                  </>
                )}

              </div>
              <div className="px-8 py-6 bg-slate-50 border-t border-slate-100 flex justify-end">
                <button 
                  onClick={handleSaveIntegrations}
                  disabled={saving || loading}
                  className="px-8 py-3 bg-primary text-white font-black text-xs uppercase tracking-[0.1em] rounded-xl hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 disabled:opacity-50 flex items-center gap-2"
                >
                  {saving ? (
                   <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Guardando...</span>
                   </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-sm">cloud_done</span>
                      <span>Guardar Cambios</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </motion.div>
  );
}
