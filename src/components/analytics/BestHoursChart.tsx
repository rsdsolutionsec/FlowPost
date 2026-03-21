interface BestHoursChartProps {
  data: { day: number; hour: number; value: number }[];
  loading?: boolean;
}

const DAY_LABELS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const HOUR_LABELS = Array.from({ length: 24 }, (_, i) => (i % 3 === 0 ? `${i}h` : ''));

export default function BestHoursChart({ data, loading }: BestHoursChartProps) {
  if (loading) {
    return (
      <div className="bg-surface-container-lowest p-6 sm:p-8 rounded-2xl shadow-sm ghost-border min-h-[280px] flex items-center justify-center">
        <div className="w-full h-[200px] bg-slate-50 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!data.length) {
    return (
      <div className="bg-surface-container-lowest p-6 sm:p-8 rounded-2xl shadow-sm ghost-border min-h-[280px] flex flex-col items-center justify-center">
        <span className="material-symbols-outlined text-5xl text-slate-200 mb-3">schedule</span>
        <p className="text-slate-400 font-bold text-sm">Datos no disponibles para esta cuenta</p>
      </div>
    );
  }

  const maxValue = Math.max(...data.map(d => d.value), 1);

  // Build lookup: day -> hour -> value
  const grid: Record<number, Record<number, number>> = {};
  for (const point of data) {
    if (!grid[point.day]) grid[point.day] = {};
    grid[point.day][point.hour] = point.value;
  }

  return (
    <div className="bg-surface-container-lowest p-6 sm:p-8 rounded-2xl shadow-sm ghost-border">
      <h3 className="font-bold text-lg text-on-surface mb-6 font-headline flex items-center gap-2">
        <span className="material-symbols-outlined text-[20px]" style={{ color: '#8b5cf6' }}>schedule</span>
        Mejores Horarios para Publicar
      </h3>

      <div className="overflow-x-auto">
        <div className="min-w-[520px]">
          {/* Hour labels */}
          <div className="flex mb-1 ml-10">
            {HOUR_LABELS.map((label, h) => (
              <div key={h} className="flex-1 text-center text-[9px] font-bold text-slate-400">
                {label}
              </div>
            ))}
          </div>

          {/* Grid rows (one per day) */}
          {DAY_LABELS.map((dayLabel, dayIndex) => (
            <div key={dayIndex} className="flex items-center mb-0.5">
              <div className="w-10 text-[10px] font-bold text-slate-500 shrink-0">{dayLabel}</div>
              {Array.from({ length: 24 }, (_, hour) => {
                const value = grid[dayIndex]?.[hour] ?? 0;
                const opacity = value / maxValue;
                return (
                  <div
                    key={hour}
                    className="flex-1 h-6 rounded-[2px] mx-px"
                    style={{
                      backgroundColor: `rgba(139,92,246,${opacity})`,
                      minWidth: 0,
                    }}
                    title={`${dayLabel} ${hour}:00 — ${value} seguidores`}
                  />
                );
              })}
            </div>
          ))}

          {/* Color scale legend */}
          <div className="flex items-center gap-2 mt-3 ml-10">
            <span className="text-[10px] font-bold text-slate-400">Menos</span>
            <div className="flex gap-px">
              {[0.1, 0.3, 0.5, 0.7, 0.9].map(op => (
                <div key={op} className="w-5 h-3 rounded-sm" style={{ backgroundColor: `rgba(139,92,246,${op})` }} />
              ))}
            </div>
            <span className="text-[10px] font-bold text-slate-400">Más</span>
          </div>
        </div>
      </div>
    </div>
  );
}
