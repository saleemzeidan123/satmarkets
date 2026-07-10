import { cache } from "react";
import { getSupabaseServer } from "@/lib/supabase/server";
import { PUBLISHED_FALLBACK, type PublishedKpis } from "./published-fallback";

// getPublishedKpis overlays live DB values on the client-safe fallback constants
// (see ./published-fallback). KAFD Grade A office median is a real row in
// rent_index_published; the Riyadh aggregate median, YoY and occupancy have no
// single row yet, so they stay as the attributed fallbacks (Law 3: every figure
// keeps its source line).
const FALLBACK = PUBLISHED_FALLBACK;
export type { PublishedKpis };

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
