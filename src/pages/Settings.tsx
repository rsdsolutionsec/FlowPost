import { Settings as SettingsIcon, Bell, Shield, Palette, Database, Globe } from 'lucide-react';

const sections = [
  { name: 'General Settings', icon: SettingsIcon, desc: 'Update your profile and application preferences.' },
  { name: 'Security & Privacy', icon: Shield, desc: 'Manage access tokens and account security.' },
  { name: 'Notifications', icon: Bell, desc: 'Configure how you receive updates and alerts.' },
  { name: 'Appearance', icon: Palette, desc: 'Customize the dashboard theme and layouts.' },
  { name: 'API & Integrations', icon: Globe, desc: 'Manage connections to external services.' },
  { name: 'Database & Logs', icon: Database, desc: 'Maintenance and system information.' },
];

export default function Settings() {
  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-700">
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight">System Settings</h1>
        <p className="mt-2 text-slate-400">Configure FlowPost performance and security preferences.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {sections.map((section) => (
          <div key={section.name} className="glass-panel p-8 rounded-2xl flex items-start gap-6 hover:border-blue-500/50 transition-all cursor-pointer group">
            <div className="p-4 bg-slate-800 rounded-2xl text-slate-400 group-hover:bg-blue-600/10 group-hover:text-blue-500 transition-all">
              <section.icon size={24} />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-white group-hover:text-blue-400 transition-colors">{section.name}</h3>
              <p className="text-sm text-slate-500 leading-relaxed font-medium">{section.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
