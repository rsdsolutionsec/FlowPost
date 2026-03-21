interface Account {
  id: string;
  name: string;
  platform: 'facebook' | 'instagram';
}

interface AccountSelectorProps {
  accounts: Account[];
  value: string;
  onChange: (accountId: string) => void;
}

export default function AccountSelector({ accounts, value, onChange }: AccountSelectorProps) {
  return (
    <div className="relative">
      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">
        filter_list
      </span>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 appearance-none cursor-pointer hover:border-primary/30 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20"
      >
        <option value="all">Todas las cuentas</option>
        {accounts.map(acc => (
          <option key={acc.id} value={acc.id}>
            {acc.platform === 'instagram' ? '@' : ''}{acc.name} ({acc.platform === 'facebook' ? 'FB' : 'IG'})
          </option>
        ))}
      </select>
    </div>
  );
}
