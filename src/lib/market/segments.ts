// Public Rent Index segment contract (PKG-0A.1, Codex correction 1).
//
// The database column is named `median`, but the stored value is an arithmetic
// AVERAGE: the ingestion pipeline writes it straight from REGA's avg_rent
// (rentBasePipeline.ts: `median: sufficient ? r.avg_rent : null`), and the
// source registry for rega_ejar records "Publishes AVERAGES, not medians".
// The physical column rename is deferred as supervised schema work (register
// rank 31); this module is the boundary that stops the misnomer at the API
// edge. Every public payload derived from rent_index_published must pass
// through it, so no consumer, developer, analytics job or AI system can read
// an average under the name median.
//
// The public shape intentionally has NO `median` key. There are no known
// external consumers of /api/index/segments (the only callers are the Advisor
// page and WatchBanner, updated in the same commit), so no compatibility alias
// is carried.

export type IndexRowLike = {
  district_label: string;
  district_label_ar?: string | null;
  district_id?: string | null;
  asset_type: string;
  segment?: string | null;
  band_low: number | string | null;
  band_high: number | string | null;
  median: number | string | null; // DB column name; value is an average
  unit: string;
  period: string;
  source?: string | null;
};

export type PublicIndexSegment = {
  district_label: string;
  district_label_ar: string | null;
  district_id: string | null;
  asset_type: string;
  segment: string | null;
  band_low: number | string | null;
  band_high: number | string | null;
  average: number | string | null;
  unit: string;
  period: string;
  source: string | null;
};

export function toPublicSegment(row: IndexRowLike): PublicIndexSegment {
  return {
    district_label: row.district_label,
    district_label_ar: row.district_label_ar ?? null,
    district_id: row.district_id ?? null,
    asset_type: row.asset_type,
    segment: row.segment ?? null,
    band_low: row.band_low,
    band_high: row.band_high,
    average: row.median,
    unit: row.unit,
    period: row.period,
    source: row.source ?? null,
  };
}
