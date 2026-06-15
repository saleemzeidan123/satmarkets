import type { RentIndexCell } from "@/lib/types";
export default function RentBand({ cell, labels }: {
  cell: RentIndexCell | null;
  labels: { rentBand: string; medianAsking: string; medianAchieved: string };
}) {
  if (!cell) return <div className="rounded-xl border border-dashed border-line p-4 text-sm text-charcoal/45">{labels.rentBand}: not enough verified data yet</div>;
  const conf = cell.confidence;
  return (
    <div className="rounded-xl border border-line bg-ivory-2/50 p-4">
      <div className="flex items-center justify-between">
        <div className="eyebrow">{labels.rentBand}</div>
        <span className={`badge ${conf==="high"?"badge-verified":"badge-gold"}`}>{conf} confidence</span>
      </div>
      <div className="mt-2 flex items-baseline gap-3">
        <div className="font-display text-3xl text-gold">{Math.round(cell.median_achieved_sqm).toLocaleString()}</div>
        <div className="text-xs text-charcoal/55">{labels.medianAchieved} SAR/sqm · {cell.deal_count} deals</div>
      </div>
    </div>
  );
}
