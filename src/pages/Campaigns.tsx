import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface Campaign {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'draft' | 'completed';
  created_at: string;
}

interface Post {
  id: string;
  image_path: string;
  caption: string;
}

export default function Campaigns() {
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [assets, setAssets] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCampaigns = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setCampaigns(data || []);
      if (data && data.length > 0 && !selectedCampaign) {
        setSelectedCampaign(data[0]);
      }
    } catch (error: any) {
      console.error('Error fetching campaigns:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchAssets = async (campaignId: string) => {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('id, image_path, caption')
        .eq('campaign_id', campaignId);
      if (error) throw error;
      setAssets(data || []);
    } catch (error: any) {
      console.error('Error fetching assets:', error.message);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, [user]);

  useEffect(() => {
    if (selectedCampaign) {
      fetchAssets(selectedCampaign.id);
    }
  }, [selectedCampaign]);

  const handleCreateCampaign = async () => {
    const name = prompt('Nombre de la campaña:');
    if (!name) return;
    try {
      const { data, error } = await supabase.from('campaigns').insert([
        { user_id: user?.id, name, status: 'active' }
      ]).select();
      if (error) throw error;
      if (data) {
        setCampaigns([data[0], ...campaigns]);
        setSelectedCampaign(data[0]);
      }
    } catch (error: any) {
      alert('Error: ' + error.message);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="px-4 sm:px-0"
    >
      <div className="mb-8 sm:mb-12 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6">
        <div>
          <div className="flex items-center gap-2 text-slate-400 text-[10px] sm:text-xs font-bold tracking-widest uppercase mb-2">
            <span>Espacio de Trabajo</span>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span className="text-primary">Campañas</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-on-surface font-headline leading-tight">
            {selectedCampaign?.name || 'Mis Campañas'}
          </h2>
          <p className="text-slate-500 mt-2 font-medium text-sm sm:text-base">Gestiona tus campañas de marketing multicanal.</p>
        </div>
        <div className="w-full sm:w-auto">
          <button 
            onClick={handleCreateCampaign}
            className="w-full sm:w-auto px-6 py-3 bg-primary text-white font-bold rounded-2xl sm:rounded-full hover:translate-y-[-1px] transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
          >
            <span className="material-symbols-outlined text-[20px]">add</span>
            <span className="text-sm">Nueva Campaña</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10">
        {/* Left Column: Campaign List */}
        <div className="lg:col-span-3 space-y-4 sm:space-y-6">
          <h3 className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-slate-400 px-2">Listado de Campañas</h3>
          <div className="flex lg:flex-col gap-3 overflow-x-auto no-scrollbar pb-2 lg:pb-0">
            {campaigns.map((c) => (
              <div 
                key={c.id}
                onClick={() => setSelectedCampaign(c)}
                className={`p-4 sm:p-5 rounded-[1.5rem] shadow-sm border transition-all flex items-center lg:items-start gap-4 shrink-0 w-64 lg:w-full cursor-pointer ${
                  selectedCampaign?.id === c.id 
                    ? 'bg-white border-primary/20 ring-4 ring-primary/5' 
                    : 'bg-surface-container-low border-transparent hover:bg-white hover:border-slate-200'
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  selectedCampaign?.id === c.id ? 'bg-primary text-white' : 'bg-slate-200 text-slate-400'
                }`}>
                  <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: selectedCampaign?.id === c.id ? "'FILL' 1" : "" }}>folder</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm truncate text-slate-800">{c.name}</p>
                  <p className={`text-[10px] font-black uppercase tracking-wider mt-0.5 ${
                    c.status === 'active' ? 'text-emerald-500' : 'text-slate-400'
                  }`}>{c.status}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Assets */}
        <div className="lg:col-span-9 space-y-6 sm:space-y-8">
          <div className="bg-white rounded-[2rem] sm:rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden min-h-[400px]">
            <div className="px-6 sm:px-8 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
              <h3 className="text-xs sm:text-sm font-black text-primary flex items-center gap-2 uppercase tracking-widest">
                <span className="material-symbols-outlined text-[20px]">grid_view</span>
                Recursos del Proyecto
              </h3>
            </div>

            <div className="p-6 sm:p-8 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
              {assets.length === 0 ? (
                <div className="col-span-full py-20 text-center">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="material-symbols-outlined text-3xl text-slate-200">mms</span>
                  </div>
                  <p className="text-slate-400 font-medium text-sm italic">
                    No hay recursos asignados a esta campaña.
                  </p>
                </div>
              ) : (
                assets.map((asset) => (
                  <div key={asset.id} className="group relative aspect-square rounded-2xl sm:rounded-3xl overflow-hidden bg-slate-100 border border-slate-200/50 shadow-sm hover:shadow-md transition-all">
                     <AssetPreview path={asset.image_path} />
                     <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent sm:opacity-0 group-hover:opacity-100 transition-opacity p-4 flex flex-col justify-end text-white">
                       <p className="text-[10px] font-bold truncate leading-tight">{asset.caption}</p>
                     </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function AssetPreview({ path }: { path: string }) {
  const [url, setUrl] = useState<string>('');
  useEffect(() => {
    if (path.startsWith('http')) {
      setUrl(path);
      return;
    }
    let objectUrl: string;
    const fetch = async () => {
      const { data } = await supabase.storage.from('posts').download(path);
      if (data) {
        objectUrl = URL.createObjectURL(data);
        setUrl(objectUrl);
      }
    };
    fetch();
    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [path]);

  if (!url) return <div className="w-full h-full animate-pulse bg-slate-200" />;
  return <img src={url} alt="Resource" className="w-full h-full object-cover" />;
}
