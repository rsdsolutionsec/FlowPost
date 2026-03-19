import { BarChart3, TrendingUp, Users, Eye, MousePointer2, Share2 } from 'lucide-react';

const stats = [
  { name: 'Total Reach', value: '2.4M', change: '+12.5%', icon: Eye },
  { name: 'Engagement Rate', value: '4.8%', change: '+0.4%', icon: MousePointer2 },
  { name: 'Total Shares', value: '15.2k', change: '+8.2%', icon: Share2 },
  { name: 'Audience Growth', value: '+1,240', change: '+18.4%', icon: Users },
];

export default function Analytics() {
  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-700">
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Analytics</h1>
        <p className="mt-2 text-slate-400">Deep dive into your social media performance metrics.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div key={stat.name} className="glass-panel p-6 rounded-2xl hover:border-blue-500/50 transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-blue-600/10 rounded-lg text-blue-500">
                <stat.icon size={20} />
              </div>
              <span className="text-xs font-bold text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-full">
                {stat.change}
              </span>
            </div>
            <p className="text-sm font-medium text-slate-500">{stat.name}</p>
            <p className="text-2xl font-bold text-white mt-1">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="glass-panel p-8 rounded-2xl h-96 flex items-center justify-center text-slate-600 border-dashed">
          Reach Over Time Chart
        </div>
        <div className="glass-panel p-8 rounded-2xl h-96 flex items-center justify-center text-slate-600 border-dashed">
          Engagement by Platform Chart
        </div>
      </div>
    </div>
  );
}
