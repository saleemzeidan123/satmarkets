// Client-safe published KPI constants (no server imports, importable from
// client components). Single source for the attributed Q1 2026 fallback
// figures; getPublishedKpis() in ./published overlays live DB values on top.
// Update ONLY here when a new quarter publishes, until every value is a DB row.
export const PUBLISHED_FALLBACK = {
  period: "Q1 2026",
  gradeAMedian: 2370,        // SAR/m2/yr, Riyadh Grade A office, published aggregate
  kafdMedian: 3700,          // SAR/m2/yr, KAFD Grade A office, published (real row)
  gradeAYoyPct: 2.1,         // Riyadh Grade A YoY, published
  gradeAOccupancyPct: 97.7,  // Riyadh Grade A occupancy, published
  source: "Published Q1 2026 benchmarks (JLL/CBRE/Knight Frank), attributed",
};
export type PublishedKpis = typeof PUBLISHED_FALLBACK;
