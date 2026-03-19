import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface Campaign {
  id: string;
  name: string;
  description: string;
  created_at: string;
}

interface CampaignPost {
  id: string;
  image_path: string;
  caption: string;
}

export default function Campaigns() {
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [campaignPosts, setCampaignPosts] = useState<CampaignPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newCampaign, setNewCampaign] = useState({ name: '', description: '' });

  const fetchCampaigns = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase.from('campaigns').select('*').eq('user_id', user.id);
    setCampaigns(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchCampaigns();
  }, [user]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const { error } = await supabase.from('campaigns').insert([{
      ...newCampaign,
      user_id: user.id
    }]);
    if (error) alert(error.message);
    else {
      setShowCreate(false);
      setNewCampaign({ name: '', description: '' });
      fetchCampaigns();
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-12"
    >
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-extrabold tracking-tight text-on-surface font-headline">Campañas</h2>
          <p className="text-slate-500 mt-2 font-medium">Organiza tus contenidos por objetivos estratégicos.</p>
        </div>
        <button 
          onClick={() => setShowCreate(true)}
          className="px-6 py-3 bg-primary text-white font-black rounded-full shadow-lg shadow-primary/20 hover:scale-105 transition-all flex items-center gap-2"
        >
          <span className="material-symbols-outlined">add</span>
          Nueva Campaña
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {campaigns.map(campaign => (
          <div key={campaign.id} className="p-8 bg-surface-container-lowest rounded-[2.5rem] ghost-border group hover:border-primary/30 transition-all cursor-pointer">
            <h3 className="text-2xl font-black text-on-surface mb-2 font-headline">{campaign.name}</h3>
            <p className="text-slate-500 font-medium mb-6 line-clamp-2">{campaign.description}</p>
            <div className="flex justify-between items-center text-xs font-black uppercase tracking-widest">
              <span className="text-slate-300">Creada el {new Date(campaign.created_at).toLocaleDateString()}</span>
              <button className="text-primary opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                Ver Detalles <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {campaigns.length === 0 && !loading && (
        <div className="py-20 text-center bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200">
           <span className="material-symbols-outlined text-5xl text-slate-300 mb-4">folder_special</span>
           <p className="text-slate-500 font-bold">Aún no has creado campañas.</p>
        </div>
      )}

      {/* Modal Simplificado para crear campaña */}
      <AnimatePresence>
        {showCreate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setShowCreate(false)} />
            <motion.form 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              onSubmit={handleCreate}
              className="relative bg-white p-10 rounded-[2.5rem] shadow-2xl w-full max-w-md space-y-6"
            >
              <h3 className="text-2xl font-black font-headline">Nueva Campaña</h3>
              <input 
                placeholder="Nombre de la campaña"
                className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold"
                value={newCampaign.name}
                onChange={e => setNewCampaign({...newCampaign, name: e.target.value})}
              />
              <textarea 
                placeholder="Descripción"
                className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold min-h-[100px]"
                value={newCampaign.description}
                onChange={e => setNewCampaign({...newCampaign, description: e.target.value})}
              />
              <button className="w-full py-4 bg-primary text-white rounded-2xl font-black">Crear</button>
            </motion.form>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
