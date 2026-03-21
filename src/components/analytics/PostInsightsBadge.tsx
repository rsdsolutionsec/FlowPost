interface PostInsightsBadgeProps {
  impressions: number;
  reach: number;
  engagement: number;
}

function formatCompact(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'k';
  return n.toString();
}

export default function PostInsightsBadge({ impressions, reach, engagement }: PostInsightsBadgeProps) {
  if (!impressions && !reach && !engagement) return null;

  return (
    <div className="flex items-center gap-3 mt-2 text-[10px] font-bold text-slate-400">
      <span className="flex items-center gap-1">
        <span className="material-symbols-outlined text-[14px]">visibility</span>
        {formatCompact(impressions)}
      </span>
      <span className="flex items-center gap-1">
        <span className="material-symbols-outlined text-[14px]">group</span>
        {formatCompact(reach)}
      </span>
      <span className="flex items-center gap-1">
        <span className="material-symbols-outlined text-[14px]">favorite</span>
        {formatCompact(engagement)}
      </span>
    </div>
  );
}
