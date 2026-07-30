import type { SourceRights } from "@/lib/sourceRights";
import { decideGeoDisplay, type GeoDenialCode } from "./boundary";
import type { Audience } from "./registry";
import {
  assessMobilityAgreement,
  type AgreementRecord,
  type ClauseId,
} from "./sufficiency";
import {
  assessCoverage,
  type CoverageFailure,
  type CoverageInput,
  type Geography,
} from "./coverage";

// ADV-5B. The mobility and visitation interface.
//
// Three gates in a fixed order, and the order is the design.
//
//   1. RIGHTS. May a figure from this source be shown to this audience.
//      `decideGeoDisplay` decides, and today it denies, because `geo_analytics`
//      has no row in `source_registry` and an unknown source has no rights. It
//      is the display decision and not the call decision: this function opens no
//      socket, so a missing endpoint is not the reason it refuses.
//   2. SUFFICIENCY. Does a recorded agreement answer the twelve Part E clauses.
//      Today none is recorded, under owner ruling 7.
//   3. COVERAGE. Is this particular figure one a reader may act on: geography,
//      aggregation count, period, observed share, sample basis and method.
//
// None of the three substitutes for another. A signed contract does not make a
// figure computed from eleven devices publishable. A well-covered panel does not
// make an unlicensed figure publishable. And a permitted, sufficient, well
// covered source still produces nothing at a geography we refuse to publish at.
//
// Running rights first is the same inversion argument as ADV-5A: a rights denial
// survives someone recording an agreement or improving a panel. Reporting a
// coverage problem while a rights problem is true files a licence question as a
// data-quality question, and data-quality questions get fixed by engineers
// without anyone reading a contract.
//
// WHAT THE RESULT TYPE CANNOT SAY.
//
// `MobilityAvailable` has no field for a device, a person, a trajectory, a visit
// or a timestamped event, and its `geography` is narrowed to `city | district`,
// so a parcel or building figure is not merely refused at runtime: it cannot be
// constructed. `k` is required rather than optional, so an available figure that
// does not know its own aggregation count does not typecheck. Part E requires an
// explicit contractual prohibition on user-level output; this is the same
// prohibition expressed where a future edit will actually meet it.
//
// Today this function returns `unavailable` on every input. That is the correct
// state and not a stub: the interface exists so that the day a source is
// permitted, publication is a separate reviewed decision from permission.

export type MobilityMetric =
  | "footfall_index"
  | "daytime_population"
  | "visit_frequency"
  | "median_dwell_minutes"
  | "catchment_share";

export type MobilityRequest = {
  metric: MobilityMetric;
  geography: Geography;
  areaId: string;
  audience: Audience;
};

/**
 * One aggregate as a permitted vendor would deliver it. Deliberately the shape
 * `assessCoverage` already reads, plus the value and the attribution, so there
 * is no second place where a figure's evidence is described.
 */
export type MobilityObservation = CoverageInput & {
  value: number;
  /** The vendor's required attribution string, verbatim. */
  attribution: string | null;
  /** The registered source the observation came from. */
  sourceId: string;
};

export type MobilityContext = {
  /** The register. Undefined means it was not read, and denies everything. */
  rights?: Map<string, SourceRights>;
  /** Recorded agreements. Defaults to the empty recorded set. */
  agreements?: readonly AgreementRecord[];
  /** The vendor's aggregate, when one exists. */
  observation?: MobilityObservation | null;
  /** Parameter rather than a clock read, so a verdict is reproducible. */
  asOf?: Date;
};

export type MobilityStage = "rights" | "sufficiency" | "data" | "coverage";

export type MobilityUnavailable = {
  status: "unavailable";
  /** The first gate that refused. Gates run in order and stop at the first. */
  stage: MobilityStage;
  /** Set only when `stage` is `rights`. */
  code: GeoDenialCode | null;
  /** Set only when `stage` is `sufficiency`. */
  unanswered: ClauseId[];
  /** Set only when `stage` is `coverage`. */
  failures: CoverageFailure[];
  /**
   * Internal only, on the `denialReason` rule: these quote licence and contract
   * reasoning and are never returned to a public caller.
   */
  reasons: string[];
};

export type MobilityAvailable = {
  status: "available";
  metric: MobilityMetric;
  /** Narrowed on purpose. A parcel figure cannot be constructed. */
  geography: "city" | "district";
  areaId: string;
  value: number;
  /** Required. A figure that cannot state its aggregation count is not one. */
  k: number;
  periodEnd: string;
  coverageShare: number;
  /** The method and its known biases, carried with the value. */
  method: string;
  /** The vendor's required attribution string, carried with the value. */
  attribution: string;
  sourceId: string;
};

export type MobilityResult = MobilityAvailable | MobilityUnavailable;

const unavailable = (
  stage: MobilityStage,
  reasons: string[],
  extra: Partial<Pick<MobilityUnavailable, "code" | "unanswered" | "failures">> = {}
): MobilityUnavailable => ({
  status: "unavailable",
  stage,
  code: extra.code ?? null,
  unanswered: extra.unanswered ?? [],
  failures: extra.failures ?? [],
  reasons,
});

/**
 * Resolve one mobility or visitation figure, or state why there is none.
 *
 * Never throws and never grants on absence. Every branch that cannot prove a
 * permission returns `unavailable`.
 */
export function mobilityFigure(
  req: MobilityRequest,
  ctx: MobilityContext = {}
): MobilityResult {
  // 1. Rights.
  const decision = decideGeoDisplay({
    capability: "mobility",
    audience: req.audience,
    rights: ctx.rights,
  });
  if (!decision.allowed) {
    return unavailable("rights", decision.reasons, { code: decision.code });
  }

  // 2. Sufficiency of the recorded agreement for the source we just permitted.
  const sourceId = decision.provider.sourceId;
  const suff = assessMobilityAgreement(sourceId, ctx.agreements);
  if (!suff.sufficient) {
    return unavailable("sufficiency", [...decision.reasons, ...suff.reasons], {
      unanswered: suff.unanswered,
    });
  }

  // 3. Is there an observation at all. Absence is not zero and not an error.
  const obs = ctx.observation ?? null;
  if (!obs) {
    return unavailable("data", [
      ...decision.reasons,
      `${sourceId}: no observation was supplied for ${req.metric} at ${req.geography} ${req.areaId}`,
    ]);
  }
  if (obs.sourceId !== sourceId) {
    return unavailable("data", [
      ...decision.reasons,
      `observation came from '${obs.sourceId}' but the permitted source is '${sourceId}', and a permission is not transferable between sources`,
    ]);
  }

  // 4. Coverage of this particular figure.
  const cov = assessCoverage(obs, ctx.asOf ?? new Date());
  const missingAttribution = !obs.attribution || obs.attribution.trim() === "";
  const failures: CoverageFailure[] = [...cov.failures];
  if (missingAttribution) {
    failures.push({
      code: "method_note_missing",
      detail: `${sourceId}: no attribution string was supplied, and an attribution invented at the render site is a breach with good intentions`,
    });
  }
  if (failures.length > 0) {
    return unavailable(
      "coverage",
      [...decision.reasons, ...failures.map((f) => `${sourceId}: ${f.detail}`)],
      { failures }
    );
  }

  // The narrowing below is not a cast for convenience. `assessCoverage` has
  // already refused every geography outside the publishable set, and refused a
  // null k, period, share, sample basis and method note, each with its own code.
  // Reaching this line means all of those are present and permitted.
  return {
    status: "available",
    metric: req.metric,
    geography: obs.geography as "city" | "district",
    areaId: obs.areaId,
    value: obs.value,
    k: obs.k as number,
    periodEnd: obs.periodEnd as string,
    coverageShare: obs.coverageShare as number,
    method: obs.methodNote as string,
    attribution: obs.attribution as string,
    sourceId,
  };
}
