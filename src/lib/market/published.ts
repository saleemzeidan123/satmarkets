import { cache } from "react";
import { getSupabaseServer } from "@/lib/supabase/server";

// Single source for the published headline KPIs shown across the marketing
// surfaces. The fallbacks are the verified, source-attributed Q1 2026 figures;
// update ONLY here when a new quarter publishes, until every value is a DB row.
// Today, KAFD Grade A office median is a real row in rent_index_published; the
// Riyadh aggregate median, YoY and occupancy have no single row yet, so they
// stay as the attributed fallbacks (Law 3: every figure keeps its source line).
const FALLBACK = {
  period: "Q1 2026",
  gradeAMedian: 2370,        // SAR/m2/yr, Riyadh Grade A office, published aggregate
  kafdMedian: 3700,          // SAR/m2/yr, KAFD Grade A office, published (real row)
  gradeAYoyPct: 2.1,         // Riyadh Grade A YoY, published
  gradeAOccupancyPct: 97.7,  // Riyadh Grade A occupancy, published
  source: "Published Q1 2026 benchmarks (JLL/CBRE/Knight Frank), attributed",
};
export type PublishedKpis = typeof FALLBACK;

export const getPublishedKpis = cache(async (): Promise<PublishedKpis> => {
  try {
    const sb = getSupabaseServer();
    if (!sb) return FALLBACK;
    const { data } = await sb.from("rent_index_published")
      .select("district_label, median, period, sufficient")
      .eq("asset_type", "office").eq("segment", "grade_a").eq("sufficient", true);
    const rows = (data ?? []) as { district_label: string | null; median: number | null; period: string | null }[];
    if (!rows.length) return FALLBACK;
    const kafd = rows.find((r) => String(r.district_label ?? "").toLowerCase().includes("kafd"));
    return {
      ...FALLBACK,
      kafdMedian: kafd?.median != null ? Number(kafd.median) : FALLBACK.kafdMedian,
      period: (kafd?.period || rows[0]?.period) ?? FALLBACK.period,
    };
  } catch {
    return FALLBACK;
  }
});
