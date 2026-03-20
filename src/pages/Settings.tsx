import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export default function Settings() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    phone: '',
    company: ''
  });

  const [integrations, setIntegrations] = useState({
    whatsapp: '',
    email: '',
    website: ''
  });

  useEffect(() => {
    if (user) {
      setProfile({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        company: user.company || ''
      });
      // Mock integrations
      setIntegrations({
        whatsapp: 'https://wa.me/52123456789',
        email: user.email || '',
        website: 'https://flowpost.ai'
      });
    }
  }, [user]);

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({
          name: profile.name,
          phone: profile.phone,
          company: profile.company
        })
        .eq('id', user?.id);
      
      if (error) throw error;
      alert('Perfil actualizado correctamente');
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="px-4 sm:px-0"
    >
      <div className="mb-10 sm:mb-14">
        <div className="flex items-center gap-2 text-slate-400 text-[10px] sm:text-xs font-bold tracking-widest uppercase mb-2">
          <span>Configuración</span>
          <span className="material-symbols-outlined text-[14px]">chevron_right</span>
          <span className="text-primary">Ajustes Generales</span>
        </div>
        <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-on-surface font-headline leading-tight">
          Ajustes de Cuenta
        </h2>
        <p className="text-slate-500 mt-3 font-medium text-sm sm:text-lg">Personaliza tu perfil y gestiona tus integraciones.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16">
        {/* Navigation Sidebar */}
        <div className="lg:col-span-3 space-y-4">
           <div className="flex lg:flex-col gap-2 overflow-x-auto no-scrollbar pb-2 lg:pb-0">
              <NavButton 
                active={activeTab === 'profile'} 
                onClick={() => setActiveTab('profile')} 
                icon="person" 
                label="Mi Perfil" 
              />
              <NavButton 
                active={activeTab === 'integrations'} 
                onClick={() => setActiveTab('integrations')} 
                icon="integration_instructions" 
                label="Integraciones" 
              />
              <NavButton 
                active={activeTab === 'notifications'} 
                onClick={() => setActiveTab('notifications')} 
                icon="notifications" 
                label="Notificaciones" 
              />
              <NavButton 
                active={activeTab === 'billing'} 
                onClick={() => setActiveTab('billing')} 
                icon="payments" 
                label="Facturación" 
              />
           </div>
        </div>

        {/* Content Area */}
        <div className="lg:col-span-9">
           <AnimatePresence mode="wait">
              {activeTab === 'profile' && (
                <motion.div
                  key="profile"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="bg-white rounded-[2.5rem] p-8 sm:p-12 shadow-sm border border-slate-100"
                >
                  <div className="flex items-center gap-6 mb-12">
                     <div className="w-20 h-20 sm:w-24 sm:h-24 bg-slate-50 border-2 border-slate-100 rounded-[2.5rem] flex items-center justify-center text-slate-300 relative group cursor-pointer overflow-hidden">
                        <span className="material-symbols-outlined text-4xl group-hover:opacity-0 transition-opacity">account_circle</span>
                        <div className="absolute inset-0 bg-primary/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                           <span className="material-symbols-outlined text-2xl">add_a_photo</span>
                        </div>
                     </div>
                     <div>
                        <h3 className="text-xl font-black text-slate-900 mb-1">{profile.name || 'Tu Nombre'}</h3>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{profile.company || 'Sin Empresa'}</p>
                     </div>
                  </div>

                  <form onSubmit={handleProfileUpdate} className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                     <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nombre Completo</label>
                        <input 
                          value={profile.name} 
                          onChange={(e) => setProfile({...profile, name: e.target.value})} 
                          className="w-full p-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-primary/20 text-sm font-bold" 
                        />
                     </div>
                     <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Email</label>
                        <input 
                          disabled 
                          value={profile.email} 
                          className="w-full p-4 bg-slate-100 text-slate-400 rounded-2xl border-none text-sm font-bold cursor-not-allowed" 
                        />
                     </div>
                     <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Teléfono</label>
                        <input 
                          value={profile.phone} 
                          onChange={(e) => setProfile({...profile, phone: e.target.value})} 
                          className="w-full p-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-primary/20 text-sm font-bold" 
                        />
                     </div>
                     <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Empresa / Proyecto</label>
                        <input 
                          value={profile.company} 
                          onChange={(e) => setProfile({...profile, company: e.target.value})} 
                          className="w-full p-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-primary/20 text-sm font-bold" 
                        />
                     </div>
                     <div className="sm:col-span-2 pt-4">
                        <button 
                          disabled={loading}
                          className="px-10 py-4 bg-slate-900 text-white font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-primary shadow-xl hover:shadow-primary/20 transition-all flex items-center justify-center gap-2"
                        >
                           {loading ? 'Guardando...' : 'Guardar Cambios'}
                        </button>
                     </div>
                  </form>
                </motion.div>
              )}

              {activeTab === 'integrations' && (
                <motion.div
                  key="integrations"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6 sm:space-y-8"
                >
                  <IntegrationCard 
                    title="WhatsApp Business" 
                    desc="Conecta tu cuenta para enviar notificaciones automáticas."
                    icon="chat"
                    color="text-emerald-500 bg-emerald-50"
                  />
                  <IntegrationCard 
                    title="Email Marketing" 
                    desc="Envía copys directamente a tus listas de correo de Mailchimp."
                    icon="mail"
                    color="text-amber-500 bg-amber-50"
                  />
                  <IntegrationCard 
                    title="Sincronización Web" 
                    desc="Publica automáticamente tus mejores copys en tu blog."
                    icon="language"
                    color="text-primary bg-primary/5"
                  />
                </motion.div>
              )}
           </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

function NavButton({ active, onClick, icon, label }: any) {
  return (
    <button 
      onClick={onClick}
      className={`flex items-center gap-4 px-6 py-4 rounded-2xl sm:rounded-3xl transition-all whitespace-nowrap ${
        active 
          ? 'bg-white text-slate-900 shadow-lg shadow-slate-100 border border-slate-100' 
          : 'text-slate-400 hover:text-slate-600 hover:bg-white/50'
      }`}
    >
       <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: active ? "'FILL' 1" : "" }}>{icon}</span>
       <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest">{label}</span>
    </button>
  );
}

function IntegrationCard({ title, desc, icon, color }: any) {
  return (
    <div className="bg-white p-6 sm:p-10 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 sm:gap-10 hover:shadow-xl transition-all group">
       <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 sm:gap-8 flex-1">
          <div className={`w-16 h-16 rounded-[1.5rem] sm:rounded-[2rem] flex items-center justify-center ${color} group-hover:scale-110 transition-transform`}>
             <span className="material-symbols-outlined text-3xl">{icon}</span>
          </div>
          <div className="space-y-1">
             <h4 className="font-black text-slate-900 text-lg">{title}</h4>
             <p className="text-slate-500 text-xs sm:text-sm font-medium pr-4">{desc}</p>
          </div>
       </div>
       <button className="px-8 py-3 bg-slate-50 text-slate-400 hover:bg-primary hover:text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all">
          Conectar
       </button>
    </div>
  );
}
