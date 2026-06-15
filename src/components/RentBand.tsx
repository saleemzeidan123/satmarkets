import type { RentIndexCell } from "@/lib/types";

// Displays a verified rent band from the index. Never a model-generated number.
export default function RentBand({ cell, labels }: {
  cell: RentIndexCell | null;
  labels: { rentBand: string; medianAsking: string; medianAchieved: string };
}) {
  if (!cell) {
    return <div className="text-sm text-charcoal/50">{labels.rentBand}: not enough verified data yet</div>;
  }
  return (
    <div className="rounded-lg border border-charcoal/10 p-4">
      <div className="text-xs uppercase tracking-wide text-charcoal/50">{labels.rentBand}</div>
      <div className="mt-1 flex items-baseline gap-4">
        <div className="text-2xl text-gold">{Math.round(cell.median_achieved_sqm)}</div>
        <div className="text-xs text-charcoal/60">{labels.medianAchieved} · {cell.deal_count} deals · {cell.confidence}</div>
      </div>
    </div>
  );
}
