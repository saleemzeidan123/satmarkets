import type { SupabaseClient } from "@supabase/supabase-js";
import { type RentIndexCell, rentIndexQuoteGate } from "@/lib/rentIndexEvidence";
import { getSourceRightsOrNull } from "@/lib/queries/sourceRights";
import { REGA_RENT_INDEX_SOURCE_ID } from "@/lib/sources/catalogue";
import type { CoverageRow } from "@/lib/advisor/examples";

// PKG-ADV-5. The server half of `examples.ts`: the read of the index that the
// examples are assembled from. See that file for why there is no list.

const COLUMNS =
  "district_label, district_label_ar, district_id, asset_type, segment, band_low, band_high, median, unit, period, source, sufficient, stat_kind, data_class, is_demo";

/**
 * The cells the Advisor may quote, as district and asset type only.
 *
 * It carries no figure, so nothing here needs a licence to be said; the gate is
 * consulted anyway, because an example that leads to "I hold a cell but may not
 * show it" is a dead end of the same kind as an example with no cell at all.
 * Any failure returns an empty list, and an empty list is a sentence with no
 * example in it.
 */
export async function quotableCoverage(sb: SupabaseClient | null, locale: "en" | "ar"): Promise<CoverageRow[]> {
  if (!sb) return [];
  try {
    const { data, error } = await sb.from("rent_index_published").select(COLUMNS).eq("sufficient", true).order("median", { ascending: false });
    if (error || !data) return [];
    const rights = await getSourceRightsOrNull(REGA_RENT_INDEX_SOURCE_ID);
    const out: CoverageRow[] = [];
    for (const row of data as unknown as Array<CoverageRow & RentIndexCell>) {
      const geography = locale === "ar" ? row.district_label_ar || row.district_label : row.district_label;
      if (!rentIndexQuoteGate(row as RentIndexCell, { locale, geography }, rights).mayShowFigure) continue;
      out.push({ district_label: row.district_label, district_label_ar: row.district_label_ar ?? null, asset_type: row.asset_type });
    }
    return out;
  } catch {
    return [];
  }
}
