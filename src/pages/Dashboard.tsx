import { LayoutDashboard, Users, Calendar, Megaphone, TrendingUp, Star } from 'lucide-react';

const stats = [
  { name: 'Total Accounts', value: '12', icon: Users, change: '+2', changeType: 'increase' },
  { name: 'Scheduled Posts', value: '45', icon: Calendar, change: '+12', changeType: 'increase' },
  { name: 'Live Campaigns', value: '3', icon: Megaphone, change: '0', changeType: 'neutral' },
  { name: 'Total Content', value: '156', icon: Star, change: '+24', changeType: 'increase' },
];

export default function Dashboard() {
  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Dashboard Overview</h1>
        <p className="mt-2 text-slate-400">Welcome back, Robin! Here's what's happening with your accounts.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div key={stat.name} className="relative group overflow-hidden bg-slate-900/50 backdrop-blur-md border border-slate-800 p-6 rounded-2xl hover:border-blue-500/50 transition-all">
            <div className="absolute -right-6 -top-6 w-24 h-24 bg-blue-600/5 rounded-full blur-2xl group-hover:bg-blue-600/10 transition-all"></div>
            <div className="flex items-center justify-between">
              <div className="p-3 bg-blue-600/10 rounded-xl">
                <stat.icon className="h-6 w-6 text-blue-500" />
              </div>
              {stat.change !== '0' && (
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                  stat.changeType === 'increase' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'
                }`}>
                  {stat.change}
                </span>
              )}
            </div>
            <div className="mt-4">
              <p className="text-sm font-medium text-slate-400">{stat.name}</p>
              <p className="text-3xl font-bold text-white mt-1">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-2xl p-8">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <TrendingUp className="text-blue-500" size={20} />
              Publishing Activity
            </h2>
            <select className="bg-slate-800 border-none rounded-lg text-sm text-slate-300 px-4 py-2 focus:ring-2 focus:ring-blue-500/50 outline-none">
              <option>Last 7 days</option>
              <option>Last 30 days</option>
              <option>Last 90 days</option>
            </select>
          </div>
          <div className="h-80 flex items-center justify-center text-slate-600 bg-slate-950/20 rounded-xl border border-dashed border-slate-800">
            Activity Chart Placeholder
          </div>
        </div>

        <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-2xl p-8">
          <h2 className="text-xl font-semibold text-white mb-8 flex items-center gap-2">
            <Star className="text-indigo-500" size={20} />
            Top Performing
          </h2>
          <div className="space-y-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4 group cursor-pointer">
                <div className="w-16 h-16 rounded-xl bg-slate-800 flex-shrink-0 group-hover:ring-2 ring-blue-500/50 transition-all"></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-200 truncate">March Campaign - Post #{i}</p>
                  <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-500 uppercase tracking-wider font-semibold">
                    <span>1.2k Likes</span>
                    <span>458 Shares</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <button className="w-full mt-8 py-3 text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl border border-slate-800 transition-all">
            View All Reports
          </button>
        </div>
      </div>
    </div>
  );
}
