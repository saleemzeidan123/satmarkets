import type { RentIndexCell } from "@/lib/types";
import { confLabel } from "@/lib/labels";
export default function RentBand({ cell, labels, locale }: {
  cell: RentIndexCell | null;
  labels: { rentBand: string; medianAchieved: string; notEnough: string };
  locale: "en"|"ar";
}) {
  if (!cell) return <div className="rounded-xl border border-dashed border-line p-4 text-sm text-charcoal/45">{labels.rentBand}: {labels.notEnough}</div>;
  return (
    <div className="rounded-xl border border-line bg-ivory-2/50 p-4">
      <div className="flex items-center justify-between">
        <div className="eyebrow">{labels.rentBand}</div>
        <span className={`badge ${cell.confidence==="high"?"badge-verified":"badge-gold"}`}>{confLabel(cell.confidence, locale)}</span>
      </div>
      <div className="mt-2 flex items-baseline gap-3">
        <div className="font-display text-3xl text-gold">{Math.round(cell.median_achieved_sqm).toLocaleString()}</div>
        <div className="text-xs text-charcoal/55">{labels.medianAchieved} · {cell.deal_count}</div>
      </div>
    </div>
  );
}
