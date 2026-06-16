import { unitLabel, segmentLabel } from "@/lib/labels";
export interface PubBand {
  band_low: number | null; band_high: number | null; median: number | null;
  unit: string; segment: string | null; sufficient: boolean;
}
export default function RentBand({ row, labels, locale }: {
  row: PubBand | null;
  labels: { rentBand: string; median: string; notEnough: string };
  locale: "en"|"ar";
}) {
  if (!row || !row.sufficient || row.median == null) {
    return <div className="rounded-xl border border-dashed border-line p-4 text-sm text-charcoal/45">{labels.rentBand}: {labels.notEnough}</div>;
  }
  return (
    <div className="rounded-xl border border-line bg-ivory-2/50 p-4">
      <div className="flex items-center justify-between">
        <div className="eyebrow">{labels.rentBand}</div>
        {row.segment && <span className="badge badge-gold">{segmentLabel(row.segment, locale)}</span>}
      </div>
      <div className="mt-2 flex items-baseline gap-3">
        <div className="font-display text-3xl text-gold">{Math.round(row.median).toLocaleString()}</div>
        <div className="text-xs text-charcoal/55">
          {row.band_low != null ? `${row.band_low.toLocaleString()}–${row.band_high!.toLocaleString()} · ` : ""}{unitLabel(row.unit, locale)}
        </div>
      </div>
      <div className="mt-1 text-[11px] text-charcoal/40">{labels.median}</div>
    </div>
  );
}
