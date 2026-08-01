import { cache } from "react";
import { getSupabaseServer } from "@/lib/supabase/server";
import { type Loc } from "@/lib/format";
import { quotableRentIndexRows } from "@/lib/market/quotable";
import { agreedStatistic, agreedUnit, figureCellOf } from "@/lib/market/columnHeading";
import { type StatisticKind } from "@/lib/evidence";
import { type UnitKey } from "@/lib/format";

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

// ADV-1E. `sufficient` was the only question this file asked, and it is the
// wrong one on its own: it is the cell's verdict on its own sample size, and it
// says nothing about whether SAT may publish what the sample produced. These
// KPIs are the most widely reproduced figures on the platform (the home hero,
// the Rent Index header, the printed flyer), so they now pass the same decision
// every other surface takes, and `statements` carries the sentence that has to
// travel with them.
export type PublishedKpis = {
  period: string | null;
  source: string | null;      // the source's own attribution label, from source_registry
  /**
   * PKG-FIG2 closure, finding 132. The statistic every quoted cell agrees on,
   * or null.
   *
   * This was `rows[0].stat_kind`: the first row's word, presented as the word
   * for the whole set. One median arriving among the averages would not have
   * changed it, and the three surfaces that print these figures would have gone
   * on saying "average" over a set that was no longer one. A set of mixed
   * statistics has no statistic, and null is how that is said.
   */
  stat: StatisticKind | null;
  /** The unit every quoted cell agrees on, or null. Never assumed from the asset. */
  unit: UnitKey | null;
  officeRent: number | null;  // across sufficient office cells
  retailRent: number | null;
  cells: number;              // how many cells stand behind these numbers
  districts: number;
  /** Sentences that must accompany any of the figures above. */
  statements: readonly string[];
};

const EMPTY: PublishedKpis = {
  period: null,
  source: null,
  stat: null,
  unit: null,
  officeRent: null,
  retailRent: null,
  cells: 0,
  districts: 0,
  statements: [],
};

const mean = (xs: number[]) =>
  xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : null;

export const getPublishedKpis = cache(async (locale: Loc = "en"): Promise<PublishedKpis> => {
  try {
    const sb = getSupabaseServer();
    if (!sb) return EMPTY;

    // `sufficient` is the cell's own verdict on whether it had enough
    // transactions to say anything. A cell that failed its sample rule is not a
    // quieter number, it is not a number. It is a necessary condition for a
    // figure, never a sufficient one: the decision below asks the second half.
    const { data } = await sb
      .from("rent_index_published")
      .select("asset_type, segment, unit, median, band_low, band_high, district_id, period, source, stat_kind, data_class, is_demo, sufficient")
      .eq("sufficient", true);

    // The average of a set of cells is a figure derived from every cell in it,
    // so one withheld cell must leave the set before the mean is taken rather
    // than after. `cells` and `districts` then describe what actually stands
    // behind the printed number, which is the claim those two tiles make.
    const quotable = await quotableRentIndexRows((data ?? []) as any[], locale);
    const rows = quotable.rows.map((q) => q.row) as unknown as {
      asset_type: string | null;
      median: number | null;
      district_id: string | null;
      period: string | null;
      source: string | null;
      stat_kind: string | null;
      unit: string | null;
    }[];
    if (!rows.length) return { ...EMPTY, statements: quotable.statements };

    // Read once, off the same rows the figures come from. `figureCellOf` is
    // tolerant of a row that arrived without a unit: it resolves to null, and a
    // single null denies the whole set, so a schema surprise costs us the unit
    // rather than buying us a guess about it.
    const cells = rows.map(figureCellOf);

    const val = (asset: string) =>
      mean(
        rows
          .filter((r) => r.asset_type === asset && r.median != null)
          .map((r) => Number(r.median))
      );

    return {
      period: rows[0].period ?? null,
      source: rows[0].source ?? null,
      stat: agreedStatistic(cells),
      unit: agreedUnit(cells),
      officeRent: val("office"),
      retailRent: val("retail"),
      cells: rows.length,
      districts: new Set(rows.map((r) => r.district_id).filter(Boolean)).size,
      statements: quotable.statements,
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
