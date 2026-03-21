interface OverviewCardsProps {
  impressions: number;
  reach: number;
  engagement: number;
  engagementRate: number;
  loading?: boolean;
  // Optional IG-specific metrics
  profileViews?: number;
  accountsEngaged?: number;
  websiteClicks?: number;
  showIgMetrics?: boolean;
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'k';
  return n.toString();
}

export default function OverviewCards({
  impressions, reach, engagement, engagementRate, loading,
  profileViews, accountsEngaged, websiteClicks, showIgMetrics,
}: OverviewCardsProps) {
  const cards = [
    { title: 'Impresiones', value: impressions, icon: 'visibility', color: 'indigo' },
    { title: 'Alcance', value: reach, icon: 'group', color: 'blue' },
    { title: 'Engagement', value: engagement, icon: 'favorite', color: 'rose' },
    { title: 'Tasa Engagement', value: engagementRate, icon: 'trending_up', color: 'emerald', isRate: true },
  ];

  const colorMap: Record<string, string> = {
    indigo: 'bg-indigo-50 text-indigo-600',
    blue: 'bg-blue-50 text-blue-600',
    rose: 'bg-rose-50 text-rose-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    violet: 'bg-violet-50 text-violet-600',
    amber: 'bg-amber-50 text-amber-600',
    teal: 'bg-teal-50 text-teal-600',
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {cards.map(card => (
          <div key={card.title} className="bg-surface-container-lowest p-5 sm:p-6 rounded-2xl shadow-sm ghost-border">
            <div className="flex justify-between items-start mb-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colorMap[card.color]}`}>
                <span className="material-symbols-outlined">{card.icon}</span>
              </div>
            </div>
            {loading ? (
              <div className="h-9 w-24 bg-slate-100 rounded-lg animate-pulse" />
            ) : (
              <h3 className="text-2xl sm:text-3xl font-extrabold text-on-surface tracking-tight">
                {card.isRate ? `${card.value.toFixed(1)}%` : formatNumber(card.value)}
              </h3>
            )}
            <p className="text-sm font-medium text-on-surface-variant mt-1">{card.title}</p>
          </div>
        ))}
      </div>

      {showIgMetrics && (
        <div className="grid grid-cols-3 gap-4">
          <SecondaryMetricCard
            title="Visitas al perfil"
            value={profileViews ?? 0}
            icon="person"
            color="violet"
            loading={loading}
            colorMap={colorMap}
          />
          <SecondaryMetricCard
            title="Cuentas engagadas"
            value={accountsEngaged ?? 0}
            icon="groups"
            color="amber"
            loading={loading}
            colorMap={colorMap}
          />
          <SecondaryMetricCard
            title="Clics en enlace"
            value={websiteClicks ?? 0}
            icon="link"
            color="teal"
            loading={loading}
            colorMap={colorMap}
          />
        </div>
      )}
    </div>
  );
}

function SecondaryMetricCard({
  title, value, icon, color, loading, colorMap,
}: {
  title: string;
  value: number;
  icon: string;
  color: string;
  loading?: boolean;
  colorMap: Record<string, string>;
}) {
  function formatNumber(n: number): string {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
    if (n >= 1_000) return (n / 1_000).toFixed(1) + 'k';
    return n.toString();
  }

  return (
    <div className="bg-surface-container-lowest p-4 rounded-2xl shadow-sm ghost-border flex items-center gap-3">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${colorMap[color]}`}>
        <span className="material-symbols-outlined text-[18px]">{icon}</span>
      </div>
      <div>
        {loading ? (
          <div className="h-6 w-16 bg-slate-100 rounded-lg animate-pulse" />
        ) : (
          <p className="text-xl font-extrabold text-on-surface tracking-tight">{formatNumber(value)}</p>
        )}
        <p className="text-xs font-medium text-on-surface-variant">{title}</p>
      </div>
    </div>
  );
}
