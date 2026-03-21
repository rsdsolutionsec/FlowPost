import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

interface TrendChartProps {
  data: { date: string; impressions: number; reach: number }[];
  loading?: boolean;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('es', { day: 'numeric', month: 'short' });
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'k';
  return n.toString();
}

export default function TrendChart({ data, loading }: TrendChartProps) {
  if (loading) {
    return (
      <div className="bg-surface-container-lowest p-6 sm:p-8 rounded-2xl shadow-sm ghost-border min-h-[350px] flex items-center justify-center">
        <div className="w-full h-[280px] bg-slate-50 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!data.length) {
    return (
      <div className="bg-surface-container-lowest p-6 sm:p-8 rounded-2xl shadow-sm ghost-border min-h-[350px] flex flex-col items-center justify-center">
        <span className="material-symbols-outlined text-5xl text-slate-200 mb-3">show_chart</span>
        <p className="text-slate-400 font-bold text-sm">Sin datos de tendencias</p>
      </div>
    );
  }

  const chartData = data.map(d => ({
    ...d,
    label: formatDate(d.date),
  }));

  return (
    <div className="bg-surface-container-lowest p-6 sm:p-8 rounded-2xl shadow-sm ghost-border">
      <h3 className="font-bold text-lg text-on-surface mb-6 font-headline flex items-center gap-2">
        <span className="material-symbols-outlined text-primary text-[20px]">trending_up</span>
        Tendencias
      </h3>
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
          <defs>
            <linearGradient id="gradImp" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#5341cd" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#5341cd" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gradReach" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={formatNumber}
          />
          <Tooltip
            contentStyle={{
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
              fontSize: '12px',
              fontWeight: 600,
            }}
            formatter={(value: number, name: string) => [
              formatNumber(value),
              name === 'impressions' ? 'Impresiones' : 'Alcance',
            ]}
          />
          <Area
            type="monotone"
            dataKey="impressions"
            stroke="#5341cd"
            strokeWidth={2}
            fill="url(#gradImp)"
          />
          <Area
            type="monotone"
            dataKey="reach"
            stroke="#0ea5e9"
            strokeWidth={2}
            fill="url(#gradReach)"
          />
        </AreaChart>
      </ResponsiveContainer>
      <div className="flex items-center gap-6 mt-4 ml-2">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#5341cd]" />
          <span className="text-xs font-bold text-slate-500">Impresiones</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#0ea5e9]" />
          <span className="text-xs font-bold text-slate-500">Alcance</span>
        </div>
      </div>
    </div>
  );
}
