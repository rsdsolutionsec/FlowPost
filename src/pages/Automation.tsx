import { Zap, Play, Settings2, Clock, CheckCircle2, AlertCircle } from 'lucide-react';

const workflows = [
  { id: 1, name: 'Daily Content Recap', status: 'active', lastRun: '2 mins ago', triggers: 'Daily @ 9:00 AM' },
  { id: 2, name: 'Engagement Auto-Responder', status: 'active', lastRun: '1 hour ago', triggers: 'On Comment' },
  { id: 3, name: 'Monthly Performance Export', status: 'paused', lastRun: '15 days ago', triggers: '1st of Month' },
];

export default function Automation() {
  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Automation</h1>
          <p className="mt-2 text-slate-400">Streamline your workflow with smart marketing triggers.</p>
        </div>
        <button className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-blue-500 hover:to-indigo-500 transition-all shadow-lg shadow-blue-500/25 active:scale-95">
          <Zap size={20} className="fill-white" />
          New Workflow
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {workflows.map((wf) => (
          <div key={wf.id} className="glass-panel p-8 rounded-2xl flex items-center justify-between group hover:border-blue-500/50 transition-all">
            <div className="flex items-center gap-6">
              <div className={`p-4 rounded-2xl ${wf.status === 'active' ? 'bg-blue-600/10 text-blue-500' : 'bg-slate-800 text-slate-600'}`}>
                <Zap size={24} className={wf.status === 'active' ? 'fill-blue-500' : ''} />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-white group-hover:text-blue-400 transition-colors">{wf.name}</h3>
                <div className="flex items-center gap-4 text-xs font-bold text-slate-500 uppercase tracking-widest">
                  <span className="flex items-center gap-1.5 line-clamp-1">
                    <Clock size={14} /> {wf.triggers}
                  </span>
                  <span className="flex items-center gap-1.5">
                    {wf.status === 'active' ? (
                      <CheckCircle2 size={14} className="text-emerald-500" />
                    ) : (
                      <AlertCircle size={14} className="text-slate-600" />
                    )}
                    Last run: {wf.lastRun}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button className="p-3 bg-slate-800 text-slate-300 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-lg hover:shadow-blue-500/20">
                <Play size={20} />
              </button>
              <button className="p-3 bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700 transition-all">
                <Settings2 size={20} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
