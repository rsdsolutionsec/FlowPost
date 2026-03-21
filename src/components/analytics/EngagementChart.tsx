import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

interface EngagementChartProps {
  data: { date: string; likes: number; comments: number; shares: number }[];
  loading?: boolean;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('es', { day: 'numeric', month: 'short' });
}

export default function EngagementChart({ data, loading }: EngagementChartProps) {
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
        <span className="material-symbols-outlined text-5xl text-slate-200 mb-3">bar_chart</span>
        <p className="text-slate-400 font-bold text-sm">Sin datos de engagement</p>
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
        <span className="material-symbols-outlined text-rose-500 text-[20px]">favorite</span>
        Engagement
      </h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
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
              const labels: Record<string, string> = {
                likes: 'Likes',
                comments: 'Comentarios',
                shares: 'Compartidos',
              };
              return [value, labels[name] || name];
            }}
          />
          <Bar dataKey="likes" stackId="a" fill="#f43f5e" radius={[0, 0, 0, 0]} />
          <Bar dataKey="comments" stackId="a" fill="#8b5cf6" radius={[0, 0, 0, 0]} />
          <Bar dataKey="shares" stackId="a" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
      <div className="flex items-center gap-4 mt-4 ml-2 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#f43f5e]" />
          <span className="text-xs font-bold text-slate-500">Likes</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#8b5cf6]" />
          <span className="text-xs font-bold text-slate-500">Comentarios</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#0ea5e9]" />
          <span className="text-xs font-bold text-slate-500">Compartidos</span>
        </div>
      </div>
    </div>
  );
}
