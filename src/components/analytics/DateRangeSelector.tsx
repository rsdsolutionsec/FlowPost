interface DateRangeSelectorProps {
  value: number;
  onChange: (days: number) => void;
}

const options = [
  { label: '7d', days: 7 },
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
];

export default function DateRangeSelector({ value, onChange }: DateRangeSelectorProps) {
  return (
    <div className="flex bg-slate-100 rounded-xl p-1 gap-1">
      {options.map(opt => (
        <button
          key={opt.days}
          onClick={() => onChange(opt.days)}
          className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${
            value === opt.days
              ? 'bg-white text-primary shadow-sm'
              : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
