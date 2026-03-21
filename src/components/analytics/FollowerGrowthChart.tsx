import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';

interface FollowerGrowthChartProps {
  data: { date: string; followers: number; followers_delta: number; followers_growth_pct: number }[];
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

export default function FollowerGrowthChart({ data, loading }: FollowerGrowthChartProps) {
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
        <span className="material-symbols-outlined text-5xl text-slate-200 mb-3">person_add</span>
        <p className="text-slate-400 font-bold text-sm">Sin datos de seguidores</p>
      </div>
    );
  }

  const chartData = data.map(d => ({
    ...d,
    label: formatDate(d.date),
    deltaColor: d.followers_delta >= 0 ? '#10b981' : '#f43f5e',
  }));

  return (
    <div className="bg-surface-container-lowest p-6 sm:p-8 rounded-2xl shadow-sm ghost-border">
      <h3 className="font-bold text-lg text-on-surface mb-6 font-headline flex items-center gap-2">
        <span className="material-symbols-outlined text-[20px]" style={{ color: '#8b5cf6' }}>person_add</span>
        Crecimiento de Seguidores
      </h3>
      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
          <defs>
            <linearGradient id="gradFollowers" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
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
            yAxisId="followers"
            orientation="left"
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={formatNumber}
          />
          <YAxis
            yAxisId="delta"
            orientation="right"
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => (v > 0 ? `+${v}` : String(v))}
          />
          <Tooltip
            contentStyle={{
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
              fontSize: '12px',
              fontWeight: 600,
            }}
            formatter={(value: number, name: string) => {
              if (name === 'followers') return [formatNumber(value), 'Seguidores'];
              if (name === 'followers_delta') return [(value > 0 ? '+' : '') + value, 'Variación'];
              return [value, name];
            }}
          />
          <ReferenceLine yAxisId="delta" y={0} stroke="#e2e8f0" strokeWidth={1} />
          <Area
            yAxisId="followers"
            type="monotone"
            dataKey="followers"
            stroke="#8b5cf6"
            strokeWidth={2}
            fill="url(#gradFollowers)"
          />
          <Bar
            yAxisId="delta"
            dataKey="followers_delta"
            radius={[3, 3, 0, 0]}
            fill="#10b981"
            // Color each bar based on positive/negative value
            label={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
      <div className="flex items-center gap-6 mt-4 ml-2">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#8b5cf6' }} />
          <span className="text-xs font-bold text-slate-500">Seguidores</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-emerald-500" />
          <span className="text-xs font-bold text-slate-500">Variación diaria</span>
        </div>
      </div>
    </div>
  );
}
