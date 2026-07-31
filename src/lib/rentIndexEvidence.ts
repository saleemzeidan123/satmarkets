// ADV-1D. The Rent Index binding: one published cell, turned into passports.
//
// WHAT CODEX ASKED FOR, AND WHAT THE RECORD ALLOWS.
//
// Codex correction 4 asks for "an existing rights-cleared REGA Rental Index
// (Ejar) figure as the first complete Evidence Passport demonstration". Three
// record facts say no such figure exists on this platform today, and none of
// them is a matter of opinion:
//
//   1. `public.source_registry` carries `rega_ejar` at `rights_status =
//      'asserted_unverified'`, whose ceiling in `sourceRights.ts` is `internal`.
//      Its own `stop_condition` reads "O10 unresolved". So even a perfectly
//      real REGA figure may not be redisplayed to a public audience until the
//      permitted-use language is read and recorded.
//   2. Finding 88: the public runtime reads zero rows from `source_registry`,
//      so no rights row is available to a public request at all.
//   3. The rows themselves. The record read of 2026-07-28 in `claims.test.ts`
//      states `rent_index_published`: 7 rows, period 2026-Q2, data_class
//      'synthetic', is_demo true. The page's own footnote says the same thing
//      in words: pre-launch sample data illustrating the index mechanism.
//
// So the honest first demonstration is not a cleared REGA figure. Building one
// would mean attaching REGA's name to a number REGA never published, which is
// the exact failure ADV-1C.1 correction 1 forbids: do not infer authenticity
// from the absence of a marker, and do not create synthetic evidence merely to
// populate the passport. What is built here instead is the complete producer,
// mounted on the real route, rendering the truthful state of each real row. The
// day a real cell lands and a rights row is readable, the same code carries the
// REGA attribution with no change to this file.
//
// THE THREE-WAY RULE, AND WHY IT FAILS CLOSED IN BOTH DIRECTIONS.
//
// `rentIndexRecordClassOf` reads the row's own demo and data-class columns and
// answers one of three things. Each answer produces a different passport, and
// the differences are not cosmetic:
//
//   flagged_simulated  The row is SAT's own synthetic demonstration figure.
//                      tier `computed`, transformation `modelled`, NO source id.
//                      `publishability` returns `illustrative`: shown as a
//                      worked assumption, never as evidence. This is what the
//                      live rows are, and it is why the passport agrees with the
//                      "Sample" stamp already on every row rather than
//                      contradicting it.
//
//   not_flagged        A real cell. tier `sourced`, source id `rega_ejar`, so
//                      the licence decides. Today that resolves to
//                      `permission_unrecorded` and the value is withheld, which
//                      is correct: an unread permission is not a permission.
//
//   unknown            Treated as `not_flagged`, i.e. as sourced. That is the
//                      STRICTER of the two branches, not the more generous one:
//                      the sourced path consults the rights ledger and denies
//                      when it cannot read one, while the simulated path would
//                      display the figure as an illustration. An unknown demo
//                      status therefore withholds rather than shows, and no
//                      authenticity is inferred either way.
//
// WHY THE BAND IS A SEPARATE PASSPORT.
//
// `rentBasePipeline.ts` writes `band_low` and `band_high` as `avg_rent * 0.75`
// and `avg_rent * 1.3`. Those are SAT's arithmetic, not figures the source
// published, so they are the derived-display question and not the redisplay
// one, and `sourceRights.ts` separates the two for exactly this reason. Folding
// them into the average's passport would have one passport answering two
// different licence questions with one answer.
//
// WHY THE STATISTIC IS READ AND NEVER ASSERTED.
//
// Law 6 keeps average and median distinct, and this is the surface where the
// two are easiest to confuse: the column that physically holds the figure is
// named `median` and physically holds `avg_rent`. So the statistic comes from
// the row's own `stat_kind` column and from nothing else. A row with no
// `stat_kind` resolves to `unknown`, which `publishability` denies outright: an
// unlabelled figure is not a figure.
//
// No em dashes (Law 2). Western numerals in both locales (Law 4).

import {
  type EvidencePassport,
  type StatisticKind,
  type Sufficiency,
  normalizeStatisticKind,
} from "./evidence";
import { type Loc, formatInteger, resolveUnitKey } from "./format";
import { parsePeriod } from "./market/period";
import { REGA_RENT_INDEX_SOURCE_ID } from "./sources/catalogue";
import type { SourceRights } from "./sourceRights";
import { type PublicEvidenceView, publicEvidenceView } from "./evidenceView";
import { type PublicQuoteKind, quoteStatement } from "./publicQuote";

// ---------------------------------------------------------------------------
// The row
// ---------------------------------------------------------------------------

/**
 * The columns a Rent Index passport is built from, and no others.
 *
 * Every field is optional because `rent_index_published` is read by several
 * surfaces with several different `select()` lists, and PostgREST fails the
 * whole query on an unknown column, so a caller that cannot select a column
 * must be able to omit it rather than invent it. An omitted column is an
 * unknown, and every unknown here resolves to the restrictive side.
 *
 * Numbers are typed `number | string` because PostgREST returns numerics as
 * strings.
 */
export type RentIndexCell = {
  district_id?: string | null;
  asset_type?: string | null;
  segment?: string | null;
  /** The stored unit key, e.g. "sar_sqm_yr". Resolved, never trusted verbatim. */
  unit?: string | null;
  /** The period the figure describes, e.g. "2026-Q2". Not when we fetched it. */
  period?: string | null;
  /** Holds the source's AVERAGE despite the column name. See the header. */
  median?: number | string | null;
  band_low?: number | string | null;
  band_high?: number | string | null;
  sufficient?: boolean | null;
  /** "average" or "median", as recorded. Never inferred from the column name. */
  stat_kind?: string | null;
  data_class?: string | null;
  is_demo?: boolean | null;
};

export type RentIndexEvidenceOptions = {
  locale: Loc;
  /**
   * The district, already resolved in the reader's language by the caller. The
   * page holds both spellings; this module holds neither, and choosing one here
   * would put an English place name on the Arabic page.
   */
  geography?: string | null;
  now?: number;
};

// ---------------------------------------------------------------------------
// Record class
// ---------------------------------------------------------------------------

export type RentIndexRecordClass = "flagged_simulated" | "not_flagged" | "unknown";

/**
 * What the row says about itself.
 *
 * Two columns are read and they are read as an OR on the restrictive side: a
 * row is simulated if EITHER marker says so. `not_flagged` requires both to be
 * present and both to agree, because ADV-1C.1 correction 1 rules that the
 * absence of a demo marker establishes nothing. One column saying "real" while
 * the other says nothing is not two facts, it is one fact and one silence.
 */
export function rentIndexRecordClassOf(row: RentIndexCell): RentIndexRecordClass {
  if (row.is_demo === true || row.data_class === "synthetic") return "flagged_simulated";
  if (row.is_demo === false && row.data_class === "real") return "not_flagged";
  return "unknown";
}

// ---------------------------------------------------------------------------
// Freshness
// ---------------------------------------------------------------------------

/**
 * How long a published quarterly cell stays current: two quarters.
 *
 * A figure describing Q2 is superseded by Q3, which is published one quarter
 * later plus the compiler's own lag. Two quarters is therefore the point past
 * which a cell is not merely the latest one, it is one the series should
 * already have replaced. `freshnessOf` begins ageing at 60 percent of this, so
 * a reader is warned before the figure is wrong rather than after.
 */
export const RENT_INDEX_MAX_AGE_DAYS = 180;

/**
 * The last day of the period, which is when the figure was last true.
 *
 * Not `created_at`. When SAT wrote the row is a fact about SAT's pipeline, and
 * using it would make a stale figure look fresh every time the table was
 * rebuilt. An unparseable period yields null, which `freshnessOf` reads as
 * "unknown", which is the honest answer to a period we cannot read.
 */
export function periodEndIso(period: string | null | undefined): string | null {
  const p = parsePeriod(period ?? "");
  if (!p) return null;
  const END: Record<string, string> = { "1": "03-31", "2": "06-30", "3": "09-30", "4": "12-31" };
  const end = END[p.q];
  return end ? `${p.year}-${end}T00:00:00.000Z` : null;
}

// ---------------------------------------------------------------------------
// Fields
// ---------------------------------------------------------------------------

/**
 * The machine field names. Deliberately not the column names: the column that
 * carries the average is called `median`, and propagating that name into a
 * correction record, a log line and an export would carry Law 6's confusion
 * into every one of them.
 */
export const RENT_INDEX_EVIDENCE_FIELDS = ["rent_index_average", "rent_index_band"] as const;

export type RentIndexEvidenceField = (typeof RENT_INDEX_EVIDENCE_FIELDS)[number];

/** PostgREST numerics arrive as strings. Anything not a real number is nothing. */
function num(v: number | string | null | undefined): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

// ---------------------------------------------------------------------------
// Construction
// ---------------------------------------------------------------------------

/**
 * The passports for one published cell: the average, and the band around it.
 *
 * A passport is produced only for a figure the row actually holds. A passport
 * for an absent value would render as `empty`, which is true and is an answer
 * to a question the table never asked, because the table prints "n/a" in that
 * cell rather than a number.
 */
export function rentIndexPassports(
  row: RentIndexCell,
  opts: RentIndexEvidenceOptions
): EvidencePassport[] {
  const lp = opts.locale;
  const cls = rentIndexRecordClassOf(row);
  const simulated = cls === "flagged_simulated";

  const statistic: StatisticKind = normalizeStatisticKind(row.stat_kind);
  // The stored key, resolved through the one unit table. An unrecognised unit
  // is null rather than a guess: printing a unit we could not resolve would be
  // stating the one thing that makes the number mean anything, on no basis.
  const unit = resolveUnitKey(row.unit) ?? null;
  // Annotated, not inferred. Without the annotation the object literal widens
  // this to `string` and the passport stops being an `EvidencePassport`, which
  // the compiler reports at the push site rather than here.
  const sufficiency: Sufficiency =
    row.sufficient === true ? "sufficient" : row.sufficient === false ? "insufficient" : "unknown";

  const base = {
    subjectKind: "segment" as const,
    subjectId: [row.district_id, row.asset_type, row.segment, row.period]
      .map((x) => x ?? "")
      .join(":"),
    assetType: row.asset_type ?? null,
    unit,
    statistic,
    sufficiency,
    period: row.period ?? null,
    geography: opts.geography ?? null,
    asOf: periodEndIso(row.period),
    maxAgeDays: RENT_INDEX_MAX_AGE_DAYS,
    // ADV-1E. The record's own account of itself, carried onto the passport
    // rather than consumed here.
    //
    // This is the correction to Codex item 4. The `origin` split below sends a
    // simulated cell down `tier: "computed", sourceId: null`, which is true, and
    // which `publicEvidenceView` used to read as "then it is SAT's own record"
    // and label accordingly. It is not. It is a number SAT generated to exercise
    // the product, and describing it as SAT Markets' own record put the
    // exchange's name behind a figure the exchange never collected. The two
    // columns now travel with the figure, so the quote decision can tell a
    // synthetic cell from a first-party one instead of inferring from a null
    // source id.
    recordDemoStatus: cls,
    dataClass: row.data_class ?? null,
  };

  // The two halves of the three-way rule, expressed once each.
  const origin = simulated
    ? { tier: "computed" as const, sourceId: null }
    : { tier: "sourced" as const, sourceId: REGA_RENT_INDEX_SOURCE_ID };

  const out: EvidencePassport[] = [];

  const avg = num(row.median);
  if (avg !== null) {
    out.push({
      ...base,
      ...origin,
      field: "rent_index_average",
      value: formatInteger(Math.round(avg), lp),
      // A simulated cell is an assumption made visible. A real one is the
      // source's own figure, unchanged.
      transformation: simulated ? "modelled" : "as_published",
    });
  }

  const low = num(row.band_low);
  const high = num(row.band_high);
  if (low !== null && high !== null) {
    out.push({
      ...base,
      ...origin,
      field: "rent_index_band",
      // The same en dash the table cell prints, so the passport and the figure
      // beside it cannot disagree about what was displayed.
      value: `${formatInteger(Math.round(low), lp)}–${formatInteger(Math.round(high), lp)}`,
      statistic: "range",
      // Always SAT's arithmetic. On a real cell that makes it the derived
      // display question rather than the redisplay one; on a simulated cell it
      // is modelled twice over, since the input was modelled too.
      transformation: simulated ? "modelled" : "derived",
    });
  }

  return out;
}

/**
 * The same set as objects a public surface may render.
 *
 * `rights` is a parameter and it is nullable, and the null is load bearing.
 * `getSourceRightsOrNull` in `queries/sourceRights.ts` explains why nothing
 * here may call `getSourceRights`: its `deniedRights(id)` fallback returns a
 * row that matches the declared source, which would render "the permission
 * recorded for this source does not cover this audience" when in truth no
 * permission was recorded and none was read. Codex correction 5 asks for those
 * two to stay apart, so the caller resolves the row and passes null when there
 * was not one.
 */
export function rentIndexEvidenceViews(
  row: RentIndexCell,
  opts: RentIndexEvidenceOptions,
  rights: SourceRights | null
): PublicEvidenceView[] {
  const now = opts.now ?? Date.now();
  return rentIndexPassports(row, opts).map((p) =>
    publicEvidenceView(p, { pageKind: "segment", rights, now })
  );
}

/** Keyed by field, for a surface that renders a figure and its evidence together. */
export function rentIndexEvidenceByField(
  row: RentIndexCell,
  opts: RentIndexEvidenceOptions,
  rights: SourceRights | null
): Map<string, PublicEvidenceView> {
  return new Map(rentIndexEvidenceViews(row, opts, rights).map((v) => [v.field, v]));
}

// ---------------------------------------------------------------------------
// The gate
// ---------------------------------------------------------------------------

/**
 * ADV-1E. One verdict per published cell, for every surface that quotes one.
 *
 * FINDING 90, WHICH THIS EXISTS TO CLOSE.
 *
 * Three surfaces quoted this table by three different rules. `/rent-index`
 * printed the figure when the row said `sufficient`. `/api/advisor` printed it
 * from `renderValue`, which asks the same single question. `/api/index/segments`
 * printed it to any machine that asked, with no question at all. Meanwhile the
 * Evidence Passport beside all three asked the licence and withheld. A reader
 * could be told a number in a sentence, above a panel refusing to stand behind
 * it, and a crawler could be told the same number with nothing beside it.
 *
 * Codex item 5 rules that the prose and the passport must never disagree, and
 * the only way two things never disagree is for there to be one of them. Every
 * quoting surface now reads this, and this reads `decidePublicQuote` exactly
 * once, through the passport for the figure the surface would lead with.
 *
 * WHY THE AVERAGE DECIDES, AND WHY THERE IS A FALLBACK.
 *
 * The average is the figure a reader takes away and the band qualifies it, so
 * the average's decision governs. Where a row holds a band and no average, the
 * band is what would be quoted and its decision governs instead. Where it holds
 * neither there is nothing to decide about, and the answer is `unavailable`,
 * which is the same word used for a figure that does not exist, because that is
 * what this is.
 */
export type RentIndexQuoteGate = {
  /** The one decision, for the figure a surface would lead with. */
  readonly kind: PublicQuoteKind;
  /** Whether the prose, the payload, the chart and the metadata may carry it. */
  readonly mayShowFigure: boolean;
  /**
   * The sentence that must accompany the figure, or stand in place of it, in the
   * reader's language. Null only for `authorized_public`, which needs none.
   */
  readonly statement: string | null;
  /**
   * The passports that may travel with the answer.
   *
   * Empty when the figure is withheld or unavailable. ADV-1C.1 correction 4
   * permits a passport only where the displayed figure is completely traceable,
   * and where no figure is displayed there is no figure to trace: the refusal
   * travels as `statement`, in the prose, where a reader will actually meet it.
   */
  readonly passports: readonly PublicEvidenceView[];
};

/**
 * `rights` is nullable and the null is load bearing, for the reason
 * `queries/sourceRights.ts` gives: `getSourceRights` returns a denying row that
 * matches the id asked for, which renders as "the permission recorded for this
 * source does not cover this audience" when in truth no permission was recorded
 * and none was read. Callers pass `getSourceRightsOrNull`.
 */
export function rentIndexQuoteGate(
  row: RentIndexCell,
  opts: RentIndexEvidenceOptions,
  rights: SourceRights | null
): RentIndexQuoteGate {
  const views = rentIndexEvidenceViews(row, opts, rights);
  const lead =
    views.find((v) => v.field === "rent_index_average") ??
    views.find((v) => v.field === "rent_index_band") ??
    null;

  const kind: PublicQuoteKind = lead ? lead.quote : "unavailable";
  const mayShowFigure = kind === "authorized_public" || kind === "labelled_sample";

  return {
    kind,
    mayShowFigure,
    statement: quoteStatement(kind, opts.locale === "ar"),
    // The same non-null filter the Advisor route has always applied, kept for
    // the same reason: a view whose value was withheld is not evidence for a
    // figure. Under this gate a withheld view cannot occur beside a shown figure
    // anyway, because the shown figure and the view come out of one decision.
    passports: mayShowFigure ? views.filter((v) => v.value !== null) : [],
  };
}

/** The verdict a surface falls back to when it could not establish one. */
export function withheldGate(locale: Loc): RentIndexQuoteGate {
  return {
    kind: "unavailable",
    mayShowFigure: false,
    statement: quoteStatement("unavailable", locale === "ar"),
    passports: [],
  };
}
