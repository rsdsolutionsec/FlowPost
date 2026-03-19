import { Megaphone, Plus, Search, Filter, ArrowUpRight, BarChart2 } from 'lucide-react';

const campaigns = [
  { id: 1, name: 'Easter Promotion 2026', status: 'Running', reach: '1.2M', engagement: '4.5%', budget: '$1,200', performance: 'up' },
  { id: 2, name: 'Spring Fresh Start', status: 'Draft', reach: '-', engagement: '-', budget: '$500', performance: 'neutral' },
  { id: 3, name: 'RestoGestión Launch', status: 'Completed', reach: '5.6M', engagement: '12.8%', budget: '$4,500', performance: 'up' },
];

export default function Campaigns() {
  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Campaigns</h1>
          <p className="mt-2 text-slate-400">Manage and monitor your marketing campaigns across platforms.</p>
        </div>
        <button className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-blue-500 hover:to-indigo-500 transition-all shadow-lg shadow-blue-500/25 active:scale-95">
          <Plus size={20} />
          Create Campaign
        </button>
      </div>

      <div className="flex items-center gap-4 p-4 bg-slate-900/50 border border-slate-800 rounded-2xl">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
          <input 
            type="text" 
            placeholder="Search campaigns..." 
            className="w-full bg-slate-800 border-none rounded-xl py-2.5 pl-11 text-sm text-white focus:ring-2 focus:ring-blue-500/50 outline-none"
          />
        </div>
        <button className="flex items-center gap-2 px-6 py-2.5 bg-slate-800 text-slate-300 rounded-xl hover:text-white transition-all border border-slate-700">
          <Filter size={18} />
          Filter
        </button>
      </div>

      <div className="glass-panel rounded-2xl overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-800/20">
              <th className="px-8 py-5 text-sm font-bold text-slate-500 uppercase tracking-widest">Campaign Name</th>
              <th className="px-8 py-5 text-sm font-bold text-slate-500 uppercase tracking-widest">Status</th>
              <th className="px-8 py-5 text-sm font-bold text-slate-500 uppercase tracking-widest">Est. Reach</th>
              <th className="px-8 py-5 text-sm font-bold text-slate-500 uppercase tracking-widest">Budget</th>
              <th className="px-8 py-5 text-sm font-bold text-slate-500 uppercase tracking-widest">Performance</th>
              <th className="px-8 py-5 text-sm font-bold text-slate-500 uppercase tracking-widest text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {campaigns.map((campaign) => (
              <tr key={campaign.id} className="group hover:bg-slate-800/30 transition-colors">
                <td className="px-8 py-6">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center text-slate-500 group-hover:text-blue-500 transition-colors">
                      <Megaphone size={20} />
                    </div>
                    <span className="font-semibold text-slate-200">{campaign.name}</span>
                  </div>
                </td>
                <td className="px-8 py-6">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                    campaign.status === 'Running' ? 'bg-emerald-500/10 text-emerald-500' :
                    campaign.status === 'Draft' ? 'bg-slate-500/10 text-slate-400' :
                    'bg-blue-500/10 text-blue-500'
                  }`}>
                    {campaign.status}
                  </span>
                </td>
                <td className="px-8 py-6 text-slate-400 text-sm font-medium">{campaign.reach}</td>
                <td className="px-8 py-6 text-slate-400 text-sm font-medium">{campaign.budget}</td>
                <td className="px-8 py-6">
                  <div className="flex items-center gap-2">
                    {campaign.performance === 'up' ? (
                      <ArrowUpRight className="text-emerald-500" size={16} />
                    ) : (
                      <TrendingUp className="text-slate-500 rotate-90" size={16} />
                    )}
                    <span className={campaign.performance === 'up' ? 'text-emerald-500' : 'text-slate-400'}>
                      {campaign.engagement}
                    </span>
                  </div>
                </td>
                <td className="px-8 py-6 text-right">
                  <button className="p-2 text-slate-500 hover:text-white transition-colors">
                    <BarChart2 size={20} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TrendingUp(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <polyline points="16 7 22 7 22 13" />
    </svg>
  );
}
