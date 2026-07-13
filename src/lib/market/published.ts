import { cache } from "react";
import { getSupabaseServer } from "@/lib/supabase/server";

// Rent Index headline figures.
//
// What was here before: a file of constants. gradeAMedian 2370, kafdMedian 3700,
// gradeAYoyPct 2.1, gradeAOccupancyPct 97.7, and on the page itself a hardcoded
// "3,630 KAFD prime". That last number is JLL's published Riyadh prime figure.
// The page's JSON-LD then told search engines `isBasedOn: ["JLL Q1 2026 published
// research", "CBRE ...", "Knight Frank ...", "SAMA ..."]`.
//
// Two separate problems, and the second is the serious one:
//   1. The figures were typed in, not measured.
//   2. They were attributed, in machine-readable structured data, to four named
//      organisations who did not produce them. JLL, CBRE and Knight Frank each
//      forbid reproduction of their research without written permission. That is
//      their licence, not our preference.
//
// So there is no fallback any more. A KPI is computed from published index cells
// or it is null, and null renders as a blank. A blank is not a failure of the
// product; it is the product telling the truth about its coverage.
//
// Every figure below traces to rent_index_published -> index_cells -> ingestion_run
// -> the source file. If it cannot, it does not exist.

export type PublishedKpis = {
  period: string | null;
  source: string | null;      // the source's own attribution label, from source_registry
  stat: "average" | "median" | null;  // REGA/Ejar publishes AVERAGES. Say which.
  officeRent: number | null;  // across sufficient office cells
  retailRent: number | null;
  cells: number;              // how many cells stand behind these numbers
  districts: number;
};

const EMPTY: PublishedKpis = {
  period: null,
  source: null,
  stat: null,
  officeRent: null,
  retailRent: null,
  cells: 0,
  districts: 0,
};

const mean = (xs: number[]) =>
  xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : null;

export const getPublishedKpis = cache(async (): Promise<PublishedKpis> => {
  try {
    const sb = getSupabaseServer();
    if (!sb) return EMPTY;

    // `sufficient` is the cell's own verdict on whether it had enough
    // transactions to say anything. A cell that failed its sample rule is not a
    // quieter number, it is not a number.
    const { data } = await sb
      .from("rent_index_published")
      .select("asset_type, median, district_id, period, source, stat_kind, sufficient")
      .eq("sufficient", true);

    const rows = (data ?? []) as {
      asset_type: string | null;
      median: number | null;
      district_id: string | null;
      period: string | null;
      source: string | null;
      stat_kind: "average" | "median" | null;
    }[];
    if (!rows.length) return EMPTY;

    const val = (asset: string) =>
      mean(
        rows
          .filter((r) => r.asset_type === asset && r.median != null)
          .map((r) => Number(r.median))
      );

    return {
      period: rows[0].period ?? null,
      source: rows[0].source ?? null,
      stat: rows[0].stat_kind ?? null,
      officeRent: val("office"),
      retailRent: val("retail"),
      cells: rows.length,
      districts: new Set(rows.map((r) => r.district_id).filter(Boolean)).size,
    };
  } catch {
    return EMPTY;
  }
});

// Year-on-year and occupancy are deliberately absent.
//
// YoY needs two periods of the same series; we have one. Occupancy has no source
// at all in this platform: the 97.7% that used to sit on the advisor page came
// from broker research we are not licensed to republish. Neither can be computed,
// so neither is offered. When a second Ejar period lands, YoY becomes a real
// calculation and belongs here.
