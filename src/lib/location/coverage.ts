// ADV-5B. The coverage-validation gate.
//
// Sufficiency asks whether we are allowed to have the figure. Coverage asks
// whether the figure we have is one a reader may act on. They are different
// questions and neither substitutes for the other: a signed agreement does not
// make a number computed from eleven devices in a district publishable, and a
// well-covered panel does not make an unlicensed number publishable either.
//
// THREE RULES DECIDE EVERY BRANCH IN THIS FILE.
//
// 1. NULL IS NOT ZERO AND IS NEVER A PASS. A missing k is not "k = 0" and it is
//    not "k is fine". Every absent field has its own failure code, distinct from
//    the code for a present value that is too low, because "the vendor did not
//    tell us" and "the vendor told us and it is unsafe" are different facts and
//    they are answered by different people.
// 2. EVERY FAILURE IS COLLECTED. Same reason as `sufficiency.ts`: a reviewer
//    deciding whether a source is usable should see all of it at once.
// 3. THE GEOGRAPHY DECIDES BEFORE THE NUMBERS DO. A parcel or building figure is
//    refused for a privacy reason no sample size can cure, and an isochrone
//    figure is refused for a licence reason, which is a separate code because
//    D27(a) is a separate constraint: no isochrone table exists in this schema,
//    the server holds no Navigation-scoped token, and Mapbox forbids caching
//    isochrone results at all. Collapsing the two into one code would let a
//    future reader assume that buying a bigger panel fixes the isochrone case.
//    It does not.
//
// Nothing here asserts that any figure exists. `RECORDED_AGREEMENTS` is empty
// and `mobility.ts` denies before it reaches this file. This is the gate that
// will run on the day a source is permitted, written now so that the permission
// and the publication decision are never the same commit.

/** What a figure is attached to. */
export type Geography = "city" | "district" | "parcel" | "building" | "isochrone";

/**
 * The geographies a mobility or visitation figure may ever be published at.
 *
 * City and district only. Both are administrative units we already index, both
 * are large enough that an aggregate over them is not a description of a small
 * number of identifiable people, and both survive a reader asking what the
 * boundary is.
 */
export const PUBLISHABLE_GEOGRAPHIES: readonly Geography[] = ["city", "district"];

/**
 * Minimum aggregation threshold applied on our side.
 *
 * This is a floor, not the standard. Part E requires the VENDOR'S stated
 * threshold to be recorded, because a threshold applied after the fact by the
 * buyer cannot undo re-identification that already happened upstream. When a
 * vendor states a higher number, the higher number governs, which is why
 * `assessCoverage` takes the effective threshold as an argument.
 */
export const MIN_AGGREGATION_K = 50;

/** Older than this and the figure is history, not a current market signal. */
export const MAX_PERIOD_AGE_MONTHS = 18;

/** Share of the geography the panel actually observes, as a fraction of 1. */
export const MIN_COVERAGE_SHARE = 0.6;

export type CoverageFailureCode =
  | "geography_not_publishable"
  | "geography_is_isochrone"
  | "k_missing"
  | "k_below_threshold"
  | "period_missing"
  | "period_unparsable"
  | "period_in_future"
  | "period_stale"
  | "coverage_share_missing"
  | "coverage_share_out_of_range"
  | "coverage_share_below_threshold"
  | "sample_basis_missing"
  | "method_note_missing";

export type CoverageFailure = {
  code: CoverageFailureCode;
  /** Internal reviewer text. Never rendered, on the `denialReason` rule. */
  detail: string;
};

export type CoverageInput = {
  geography: Geography;
  /** The city or district id the figure describes. */
  areaId: string;
  /** Devices, panelists or records behind the aggregate. Null when unstated. */
  k: number | null;
  /** Last day of the observation period, ISO `YYYY-MM-DD`. Null when unstated. */
  periodEnd: string | null;
  /** Observed share of the geography, 0 to 1. Null when unstated. */
  coverageShare: number | null;
  /** How the sample is constructed, in the vendor's words. */
  sampleBasis: string | null;
  /** The method and its known biases, in the vendor's words. */
  methodNote: string | null;
  /**
   * The vendor's own stated minimum aggregation threshold, when recorded. The
   * effective threshold is the larger of this and `MIN_AGGREGATION_K`.
   */
  vendorThreshold?: number | null;
};

export type CoverageVerdict = {
  publishable: boolean;
  failures: CoverageFailure[];
  /** The threshold actually applied, so a reviewer can see which one won. */
  appliedThreshold: number;
};

const MONTH_MS = 30.436875 * 24 * 60 * 60 * 1000;

const monthsBetween = (from: Date, to: Date): number =>
  (to.getTime() - from.getTime()) / MONTH_MS;

/**
 * Decide whether one figure may be published.
 *
 * `asOf` is a parameter rather than a clock read so the verdict is reproducible
 * from its inputs, which is the same reason `boundary.ts` reads no environment.
 */
export function assessCoverage(
  input: CoverageInput,
  asOf: Date = new Date()
): CoverageVerdict {
  const failures: CoverageFailure[] = [];
  const vendor =
    typeof input.vendorThreshold === "number" && Number.isFinite(input.vendorThreshold)
      ? input.vendorThreshold
      : 0;
  const appliedThreshold = Math.max(MIN_AGGREGATION_K, vendor);

  // Geography first. A privacy refusal and a licence refusal are different codes.
  if (input.geography === "isochrone") {
    failures.push({
      code: "geography_is_isochrone",
      detail:
        "D27(a): no isochrone table exists in this schema, the server holds no Navigation-scoped token, and isochrone results may not be cached. This is a licence and architecture refusal, and a larger panel does not change it.",
    });
  } else if (!PUBLISHABLE_GEOGRAPHIES.includes(input.geography)) {
    failures.push({
      code: "geography_not_publishable",
      detail: `${input.geography} is below the publishable unit. An aggregate over a single parcel or building describes a small number of identifiable occupants, which no sample size cures.`,
    });
  }

  // k. Absent and too low are separate answers from separate people.
  if (input.k === null || input.k === undefined || !Number.isFinite(input.k)) {
    failures.push({
      code: "k_missing",
      detail:
        "no aggregation count was supplied. An unstated k is not a small k and it is not a safe k: it is an unanswered question, and Part E requires the vendor to answer it.",
    });
  } else if (input.k < appliedThreshold) {
    failures.push({
      code: "k_below_threshold",
      detail: `k = ${input.k} is below the applied threshold of ${appliedThreshold}.`,
    });
  }

  // Period.
  if (!input.periodEnd) {
    failures.push({
      code: "period_missing",
      detail:
        "no period end was supplied, so the figure cannot be dated, and an undated figure is read as current forever.",
    });
  } else {
    const end = new Date(`${input.periodEnd}T00:00:00Z`);
    if (Number.isNaN(end.getTime())) {
      failures.push({
        code: "period_unparsable",
        detail: `period end '${input.periodEnd}' is not an ISO date.`,
      });
    } else if (end.getTime() > asOf.getTime()) {
      failures.push({
        code: "period_in_future",
        detail: `period end ${input.periodEnd} is after the assessment date, which means the feed or the clock is wrong. Neither is a reason to publish.`,
      });
    } else {
      const age = monthsBetween(end, asOf);
      if (age > MAX_PERIOD_AGE_MONTHS) {
        failures.push({
          code: "period_stale",
          detail: `period ended ${input.periodEnd}, about ${Math.round(age)} months before the assessment date, past the ${MAX_PERIOD_AGE_MONTHS} month limit.`,
        });
      }
    }
  }

  // Coverage share.
  const share = input.coverageShare;
  if (share === null || share === undefined || !Number.isFinite(share)) {
    failures.push({
      code: "coverage_share_missing",
      detail:
        "no coverage share was supplied. A figure for a geography the panel may not observe at all is not a low-confidence figure, it is a fabricated one.",
    });
  } else if (share < 0 || share > 1) {
    failures.push({
      code: "coverage_share_out_of_range",
      detail: `coverage share ${share} is not a fraction of 1, so the feed is being read wrongly.`,
    });
  } else if (share < MIN_COVERAGE_SHARE) {
    failures.push({
      code: "coverage_share_below_threshold",
      detail: `coverage share ${share} is below the ${MIN_COVERAGE_SHARE} minimum.`,
    });
  }

  // Sample construction and method. Part E asks for both in the vendor's words,
  // so an empty string is not an answer, exactly as in `sufficiency.ts`.
  if (!input.sampleBasis || input.sampleBasis.trim() === "") {
    failures.push({
      code: "sample_basis_missing",
      detail:
        "how the sample is constructed is unstated. A device panel is not the population, and a figure that cannot say which it is will be read as the population.",
    });
  }
  if (!input.methodNote || input.methodNote.trim() === "") {
    failures.push({
      code: "method_note_missing",
      detail:
        "the method and its known biases are unstated, so the figure cannot carry its method to the render site, which every published figure in this product does.",
    });
  }

  return { publishable: failures.length === 0, failures, appliedThreshold };
}
