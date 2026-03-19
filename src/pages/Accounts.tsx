import { Plus, Facebook, Instagram, RefreshCw, MoreVertical, ShieldCheck } from 'lucide-react';

const accounts = [
  { id: 1, name: 'RestoGestión Official', platform: 'facebook', image: '', followers: '12.4k', status: 'connected' },
  { id: 2, name: 'RSD Solutions Tech', platform: 'facebook', image: '', followers: '1.2k', status: 'connected' },
  { id: 3, name: 'RestoGestión IG', platform: 'instagram', image: '', followers: '45.8k', status: 'connected' },
  { id: 4, name: 'Marketing Lab', platform: 'facebook', image: '', followers: '842', status: 'expired' },
];

export default function Accounts() {
  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Connected Accounts</h1>
          <p className="mt-2 text-slate-400">Manage your social media profiles and their connection status.</p>
        </div>
        <button className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-blue-500 hover:to-indigo-500 transition-all shadow-lg shadow-blue-500/25 active:scale-95">
          <Plus size={20} />
          Add Account
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
        {accounts.map((account) => (
          <div key={account.id} className="group glass-panel rounded-2xl overflow-hidden hover:border-blue-500/50 transition-all p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-5">
                <div className="relative">
                  <div className="w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700 overflow-hidden flex items-center justify-center">
                    {account.platform === 'facebook' ? (
                      <Facebook className="text-[#1877F2]" size={32} />
                    ) : (
                      <Instagram className="text-[#E4405F]" size={32} />
                    )}
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-center">
                    {account.platform === 'facebook' ? (
                      <Facebook className="text-[#1877F2]" size={12} />
                    ) : (
                      <Instagram className="text-[#E4405F]" size={12} />
                    )}
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white group-hover:text-blue-400 transition-colors">
                    {account.name}
                  </h3>
                  <div className="flex items-center gap-4 mt-1.5">
                    <span className="text-xs text-slate-500 uppercase tracking-widest font-bold">
                      {account.platform} account
                    </span>
                    <span className="text-xs text-slate-500 uppercase tracking-widest font-bold">
                      {account.followers} followers
                    </span>
                  </div>
                </div>
              </div>
              <button className="p-2 text-slate-500 hover:text-white hover:bg-slate-800 rounded-lg transition-all">
                <MoreVertical size={20} />
              </button>
            </div>

            <div className="mt-8 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${account.status === 'connected' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]'}`}></div>
                <span className={`text-xs font-semibold ${account.status === 'connected' ? 'text-emerald-500' : 'text-red-500'}`}>
                  {account.status === 'connected' ? 'Securely Connected' : 'Connection Expired'}
                </span>
                {account.status === 'connected' && <ShieldCheck size={14} className="text-emerald-500/50" />}
              </div>
              
              <button className={cn(
                "flex items-center gap-2 text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-lg transition-all",
                account.status === 'connected' 
                  ? "text-slate-400 hover:text-white hover:bg-slate-800"
                  : "bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-500/20"
              )}>
                <RefreshCw size={14} className={account.status === 'expired' ? 'animate-spin-slow' : ''} />
                {account.status === 'connected' ? 'Sync Profile' : 'Reconnect Now'}
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-blue-600/10 border border-blue-500/20 rounded-2xl p-8 flex items-start gap-6 relative overflow-hidden group">
        <div className="absolute right-0 top-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl group-hover:bg-blue-500/10 transition-all pointer-events-none"></div>
        <div className="p-4 bg-blue-600 rounded-2xl shadow-xl shadow-blue-500/20">
          <ShieldCheck className="text-white" size={32} />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-bold text-white">Security Tip: Access Tokens</h3>
          <p className="text-slate-400 leading-relaxed max-w-2xl">
            We use fine-grained access tokens to manage your accounts. Tokens generally expire every 60 days. 
            We'll notify you via email 7 days before an account needs reconnection.
          </p>
          <button className="text-blue-400 text-sm font-bold uppercase tracking-widest hover:text-blue-300 transition-colors mt-4">
            Learn more about security →
          </button>
        </div>
      </div>
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
