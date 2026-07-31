import {
  mayDisplayDerived,
  mayRedisplay,
  type SourceRights,
} from "@/lib/sourceRights";

// ADV-1. The Evidence Passport.
//
// A passport is everything that has to be true about one displayed value before
// that value is allowed to be a claim. Not a wrapper around a number: a record
// of what the number IS, and the platform's only answer to the question "may we
// say this, and in what words".
//
// WHY IT IS SHAPED THIS WAY.
//
// provenance.ts already answers "where did this come from" in four tiers, and
// that tier is still the spine here. But a tier alone has never been enough to
// decide whether a value may be shown, because a value can be perfectly well
// sourced and still be a lie in position. The failures this module exists to
// make impossible are all of that kind, and every one of them has actually
// happened on this platform:
//
//   1. A DEMO VERIFICATION READING AS A VERIFICATION. Every verification record
//      the platform holds is is_demo, and each one's own basis text says no
//      Wathq lookup and no REGA lookup was performed. The pages nevertheless
//      rendered verified ticks, because the badge read a boolean and the boolean
//      did not know it was a fixture. Here, a demo record can never produce a
//      verified state. Not by convention. By the type's own resolver.
//   2. A FACT ABOUT ONE THING PRESENTED AS A FACT ABOUT ANOTHER. A building's
//      year of completion shown as the unit's. A segment average shown as this
//      unit's rent. Both are true statements and both are false claims, and the
//      only thing that distinguishes them is the subject. So the passport
//      carries its subject's kind and `attribution()` decides whether it may be
//      the page's own fact, context, or nothing.
//   3. A NUMBER WITH NO STATISTIC. An average and a median are different
//      quantities, so a figure whose statistic kind is unknown is not a weakly
//      labelled figure, it is an unlabelled one, and it does not publish.
//   4. AN UNKNOWN QUIETLY BECOMING A KNOWN. This is the one the directive names
//      outright: AI must never convert unknown data into known data. The defence
//      is that "known" is not a flag anyone can set. `isKnown()` is derived, and
//      confidence is derived, from dimensions that each have an explicit unknown
//      member which coerces to the restrictive side.
//
// WHAT THIS MODULE DOES NOT DO.
//
// It does not restate rights. `sourceRights.ts` owns the question of what a
// licence permits, and this module takes a SourceRights row and asks it. A
// second copy of a permission is a second thing to forget to update.
//
// It does not decide verification truth for a listing either. `gate.ts` remains
// the truth source and `ownerVerified()` remains its narrowest claim. What this
// adds is dimension-level resolution, so a page can say which of ownership,
// authorization, permit and identity was actually checked instead of collapsing
// all of them into one badge. That collapse is register findings 3 and 24 and
// owner decision O3.
//
// It is pure. No React, no Supabase, no clock except the one you pass in. A rule
// that can only run inside a request is a rule that cannot be unit tested.
//
// No em dashes (Law 2). Western numerals in both locales (Law 4).

// ---------------------------------------------------------------------------
// Entity kinds
// ---------------------------------------------------------------------------

/**
 * WHAT a fact is about. The location side of the taxonomy is already typed by
 * D10 in `locationKind.ts` and is not duplicated here; these are the things a
 * listing, a document or a figure can be a fact about.
 *
 * `property` is the title, the legal parcel. `building` is one structure on it.
 * `unit` is a demised space inside a building. `development` is a masterplanned
 * scheme of several buildings, and under Law 7 it is never a district.
 * `listing` is an offer to lease or sell, which is not a physical thing and does
 * not inherit the physical thing's facts. `segment` is a market cell, a
 * geography and asset type over a period, which is what the Rent Index
 * describes and what a single unit never is.
 */
export type EntityKind =
  | "property"
  | "development"
  | "building"
  | "unit"
  | "listing"
  | "segment";

const ENTITY_KINDS: readonly EntityKind[] = [
  "property",
  "development",
  "building",
  "unit",
  "listing",
  "segment",
];

/**
 * An unrecognised kind is not coerced to a plausible neighbour. D10 settled the
 * same question for locations: coercing an unknown kind to `area` was rejected
 * because `area` is itself a real assertion. The same holds here, so an
 * unrecognised kind returns null and the caller has to handle not knowing.
 */
export function normalizeEntityKind(v: unknown): EntityKind | null {
  return typeof v === "string" && (ENTITY_KINDS as readonly string[]).includes(v)
    ? (v as EntityKind)
    : null;
}

/**
 * Whether a fact recorded about `subject` may appear on a page about `page`.
 *
 *   own      it is the page's own fact and may be stated plainly
 *   context  it is true, and about something else, so it may only appear
 *            attributed to that something else
 *   denied   it does not describe the page's subject at all
 *
 * The asymmetry is the point. A building fact is context on a unit page, because
 * the building contains the unit. A unit fact on a building page is denied,
 * because one unit is not evidence about the building. Read downward it is
 * context; read upward it is a fabrication.
 */
export type Attribution = "own" | "context" | "denied";

export function attribution(subject: EntityKind, page: EntityKind): Attribution {
  if (subject === page) return "own";

  // Downward containment: the larger thing is legitimate context for the
  // smaller one, and must be labelled as being about the larger thing.
  const CONTAINS: Record<EntityKind, readonly EntityKind[]> = {
    property: ["building", "unit", "listing"],
    development: ["building", "unit", "listing"],
    building: ["unit", "listing"],
    // A segment describes a market, so it is context for anything inside that
    // market and never that thing's own value.
    segment: ["property", "development", "building", "unit", "listing"],
    unit: ["listing"],
    listing: [],
  };
  if (CONTAINS[subject].includes(page)) return "context";

  // A listing is an offer. Its asking terms are facts about the offer, never
  // about the physical asset, so they do not travel upward at all.
  return "denied";
}

// ---------------------------------------------------------------------------
// The dimensions
// ---------------------------------------------------------------------------

/**
 * What kind of quantity the value is. Law 6 keeps average and median distinct
 * and this type is where that separation is enforced: there is no normalisation
 * path from one into the other, and `unknown` never resolves into either.
 */
export type StatisticKind =
  | "single"
  | "average"
  | "median"
  | "count"
  | "range"
  | "rate"
  | "index"
  | "unknown";

const STATISTIC_KINDS: readonly StatisticKind[] = [
  "single",
  "average",
  "median",
  "count",
  "range",
  "rate",
  "index",
  "unknown",
];

export function normalizeStatisticKind(v: unknown): StatisticKind {
  return typeof v === "string" && (STATISTIC_KINDS as readonly string[]).includes(v)
    ? (v as StatisticKind)
    : "unknown";
}

/**
 * What was done to the source's own number before it reached the screen.
 *
 * `as_published` is the source's figure unchanged. `unit_converted` is the same
 * quantity in different units, which is arithmetic and not interpretation.
 * `aggregated` and `derived` produce a number the source never published, which
 * is a different permission question and is why `sourceRights` separates
 * redisplay from derived display. `modelled` is an assumption made visible: it
 * is never a fact, and under owner ruling 4 the surfaces built on it stay
 * illustrative.
 */
export type Transformation =
  | "as_published"
  | "unit_converted"
  | "aggregated"
  | "derived"
  | "modelled"
  | "unknown";

const TRANSFORMATIONS: readonly Transformation[] = [
  "as_published",
  "unit_converted",
  "aggregated",
  "derived",
  "modelled",
  "unknown",
];

export function normalizeTransformation(v: unknown): Transformation {
  return typeof v === "string" && (TRANSFORMATIONS as readonly string[]).includes(v)
    ? (v as Transformation)
    : "unknown";
}

/** Whether the underlying sample is large enough for the figure to mean anything. */
export type Sufficiency = "sufficient" | "insufficient" | "unknown";

export function normalizeSufficiency(v: unknown): Sufficiency {
  return v === "sufficient" || v === "insufficient" ? v : "unknown";
}

/** Derived from the as-of date and the field's own tolerance. Never authored. */
export type Freshness = "current" | "ageing" | "stale" | "unknown";

/** Derived from every other dimension. Never authored. See `confidenceOf`. */
export type Confidence = "high" | "moderate" | "low" | "none";

// ---------------------------------------------------------------------------
// Verification, at the level of a dimension rather than a badge
// ---------------------------------------------------------------------------

/**
 * The separate factual questions that a single "Verified" badge used to answer
 * all at once. Owner decision O3 asked for exactly this split, and register
 * findings 3 and 24 are what the collapse cost: a listing whose lister type
 * contradicted its badge, and page metadata that hardcoded owner-verified
 * wording regardless of the record.
 */
export type VerificationDimension =
  | "ownership"
  | "authorization"
  | "right_to_market"
  | "ad_permit"
  | "identity"
  | "deed"
  | "licence"
  | "availability"
  | "measurement"
  | "document";

export type VerificationState =
  | "verified"
  | "not_verified"
  | "expired"
  | "not_applicable"
  | "unknown";

export type VerificationRecord = {
  dimension: VerificationDimension;
  /** As stored. Read it through `verificationStateOf`, never directly. */
  state: VerificationState;
  /** ISO date of the check. A verified state without one cannot be current. */
  checkedAt?: string | null;
  /** How it was checked, e.g. "Wathq deed lookup". Shown, not inferred. */
  method?: string | null;
  /** Who checked, by role rather than by name. Saleem's identity is never public copy. */
  actorRole?: string | null;
  /** The stated basis, quoted from the record rather than summarised. */
  basis?: string | null;
  /**
   * True when the record is seeded fixture data.
   *
   * This single flag is the structural form of the whole ruling-3 correction.
   * Every verification record on the platform today is is_demo, and every one of
   * them says in its own basis text that no government register was consulted.
   * A fixture may populate a page; it may not confer a claim. So a demo record
   * resolves to `not_verified` and there is no argument that gets past it.
   */
  isDemo?: boolean;
};

/**
 * The state a record may actually be shown as.
 *
 * Three demotions, all downward, none reversible by a caller:
 *   a demo record is not a verification;
 *   an unrecognised state is not a verification;
 *   a verified record with no date of check is not a verification, because
 *   "verified" with no when is a claim that cannot expire and therefore cannot
 *   be wrong, which is the shape of wallpaper rather than evidence.
 */
export function verificationStateOf(r: VerificationRecord): VerificationState {
  if (r.isDemo === true) return "not_verified";
  const s = r.state;
  if (s === "not_applicable" || s === "expired" || s === "not_verified") return s;
  if (s === "verified") return r.checkedAt ? "verified" : "not_verified";
  return "not_verified";
}

/** True only when at least one dimension genuinely resolves to verified. */
export function anyVerified(rs: readonly VerificationRecord[]): boolean {
  return rs.some((r) => verificationStateOf(r) === "verified");
}

/** The dimensions that resolve to verified, in the order given. */
export function verifiedDimensions(
  rs: readonly VerificationRecord[]
): VerificationDimension[] {
  return rs.filter((r) => verificationStateOf(r) === "verified").map((r) => r.dimension);
}

// ---------------------------------------------------------------------------
// Corrections
// ---------------------------------------------------------------------------

/**
 * Append-only. A correction is a new entry, never an edit to the old value, so
 * the history of what the platform once said stays readable. `market_comps` and
 * `research_metrics` already work this way at the row level; this is the same
 * discipline at the field level.
 */
export type CorrectionKind = "correction" | "restatement" | "retraction";

/**
 * Words a person filed, in the language they filed them in.
 *
 * A pair is a correction filed in both languages. A bare string is a correction
 * filed in one, and `reasonLang` records which, so a page can mark the text as
 * foreign rather than pass it off as the reader's own language.
 *
 * SAT never translates one of these. Codex boundary 10 forbids filling missing
 * evidence with generated wording, and the stated reason a figure changed is
 * evidence: a machine translation of it is a sentence nobody filed, sitting in
 * the record as though somebody had.
 */
export type FiledReason = string | { en: string; ar: string };

export type CorrectionEntry = {
  at: string;
  kind: CorrectionKind;
  /** Why, in the words of whoever made the correction. */
  reason: FiledReason;
  /** The language a bare `reason` was filed in. Absent means unrecorded. */
  reasonLang?: "en" | "ar" | null;
  actorRole?: string | null;
  /** What was displayed before, so the record shows what was withdrawn. */
  previousDisplay?: string | null;
};

/**
 * The reason as this reader should receive it, and whether it is in their
 * language.
 *
 * `foreign` is the language tag a surface must put on the text, and it is
 * non-null only when the filed language is known AND differs from the reader's.
 * Unknown stays unmarked: asserting a language we were not told is a claim, and
 * a wrong `lang` attribute makes a screen reader pronounce the sentence as
 * gibberish, which is worse than leaving it unsaid.
 */
export function readCorrectionReason(
  c: CorrectionEntry,
  ar: boolean
): { text: string; foreign: "en" | "ar" | null } {
  if (typeof c.reason !== "string") {
    return { text: ar ? c.reason.ar : c.reason.en, foreign: null };
  }
  const filed = c.reasonLang ?? null;
  const reader = ar ? "ar" : "en";
  return { text: c.reason, foreign: filed && filed !== reader ? filed : null };
}

/** Latest entry by date, or null. Ties resolve to the later position in the array. */
export function latestCorrection(
  history: readonly CorrectionEntry[] | undefined
): CorrectionEntry | null {
  if (!history || history.length === 0) return null;
  return history.reduce((best, e) =>
    Date.parse(e.at) >= Date.parse(best.at) ? e : best
  );
}

/** A retracted value is never known, never publishable, never a claim. */
export function isRetracted(p: EvidencePassport): boolean {
  return latestCorrection(p.corrections)?.kind === "retraction";
}

// ---------------------------------------------------------------------------
// The passport
// ---------------------------------------------------------------------------

export type EvidencePassport = {
  /** Machine field name, e.g. "rent_sar_sqm_year". Used in logs and corrections. */
  field: string;
  /** What the fact is about. Null when the subject is not known, which denies. */
  subjectKind: EntityKind | null;
  /** Stable id of the subject, so a correction can be traced to one thing. */
  subjectId?: string | null;

  /**
   * The value, already formatted for display, or null.
   *
   * Null is a first-class state and it means unknown. It never renders as zero,
   * as a dash that reads like a value, or as an estimate. Law 3.
   */
  value: string | null;
  unit?: string | null;

  tier: ProvenanceTierRef;
  statistic: StatisticKind;
  transformation: Transformation;
  sufficiency: Sufficiency;

  /**
   * The asset type the fact is about, e.g. "office" or "warehouse".
   *
   * ADV-1C, Codex boundary 4. A rent figure means nothing without it: the same
   * number is unremarkable for one asset type and impossible for another, and a
   * reader who cannot see which one it describes cannot check it. Held as the
   * registry slug rather than a label, so the renderer resolves it in the
   * reader's own language through `assetLabel` and the Arabic page never shows
   * an English asset name.
   */
  assetType?: string | null;

  /** Registered source id, required when tier is "sourced". Rights resolve from it. */
  sourceId?: string | null;
  /** The period the figure describes, e.g. "2026-Q2". Not the date we fetched it. */
  period?: string | null;
  /** The geography the figure describes, e.g. "Riyadh, Olaya". */
  geography?: string | null;

  /** When the value was last true to our knowledge. Drives freshness. */
  asOf?: string | null;
  /** How long this kind of field stays current. Absent means we cannot say. */
  maxAgeDays?: number | null;

  verification?: readonly VerificationRecord[];
  corrections?: readonly CorrectionEntry[];
};

/**
 * Kept structurally identical to `ProvenanceTier` in provenance.ts rather than
 * imported, because provenance.ts is the rendering layer and importing it here
 * would make the policy module depend on the presentation module. The test file
 * asserts the two stay in step.
 */
export type ProvenanceTierRef = "entered" | "verified" | "computed" | "sourced";

// ---------------------------------------------------------------------------
// Derived state
// ---------------------------------------------------------------------------

/**
 * Freshness from the as-of date and the field's own tolerance.
 *
 * Both inputs are required. A field with no stated tolerance is not fresh by
 * default; we simply do not know how long it stays true, and saying so is the
 * honest answer. Ageing begins at 60 percent of the allowance so a surface can
 * warn before a figure is wrong rather than after.
 */
export function freshnessOf(p: EvidencePassport, now: number): Freshness {
  if (!p.asOf || !p.maxAgeDays || p.maxAgeDays <= 0) return "unknown";
  const t = Date.parse(p.asOf);
  if (Number.isNaN(t)) return "unknown";
  const ageDays = (now - t) / 86_400_000;
  if (ageDays < 0) return "unknown"; // dated in the future: a data error, not freshness
  if (ageDays > p.maxAgeDays) return "stale";
  return ageDays > p.maxAgeDays * 0.6 ? "ageing" : "current";
}

/**
 * Confidence, derived and never authored.
 *
 * There is deliberately no `confidence` field on the passport. A confidence a
 * caller can set is a confidence a caller can raise, and the one thing this
 * package exists to prevent is unknown data being promoted into known data by
 * something that wanted it to be known. Every input below is either observed or
 * an explicit unknown, and every unknown pushes downward.
 */
export function confidenceOf(p: EvidencePassport, now: number): Confidence {
  if (p.value === null || p.value === undefined) return "none";
  if (isRetracted(p)) return "none";
  if (p.subjectKind === null) return "none";
  if (p.sufficiency !== "sufficient") return "none";
  if (p.statistic === "unknown") return "none";
  if (p.transformation === "unknown") return "none";
  // A sourced figure with no registered source is a figure with no source.
  if (p.tier === "sourced" && !p.sourceId) return "none";

  const fresh = freshnessOf(p, now);
  if (fresh === "stale" || fresh === "unknown") return "low";

  // An assumption is never more than weakly held, however current it is.
  if (p.transformation === "modelled") return "low";

  if (p.tier === "entered") return "low";

  if (p.tier === "verified") {
    return anyVerified(p.verification ?? []) && fresh === "current" ? "high" : "moderate";
  }
  // sourced and computed
  return fresh === "current" ? "moderate" : "low";
}

/**
 * Whether this passport represents something the platform actually knows.
 *
 * This is the function the assistant layer consults before it is allowed to
 * state a figure. Everything it depends on is derived, so there is no path by
 * which a prompt, a caller or a model can make an unknown into a known.
 */
export function isKnown(p: EvidencePassport, now: number): boolean {
  return p.value !== null && p.value !== undefined && confidenceOf(p, now) !== "none";
}

// ---------------------------------------------------------------------------
// Publishability
// ---------------------------------------------------------------------------

/**
 * How a value may appear, once it is allowed to appear at all.
 *
 *   fact          stated plainly as the page subject's own value
 *   context       stated, attributed to the other subject it actually describes
 *   illustrative  shown as a worked assumption, never as evidence
 */
export type DisplayForm = "fact" | "context" | "illustrative";

export type PublishDecision = {
  allowed: boolean;
  form: DisplayForm | null;
  /** Always populated, on allow as well as deny, so a log line reads either way. */
  reasons: string[];
};

export type PublishContext = {
  /** The entity kind of the page the value would appear on. */
  pageKind: EntityKind;
  /** Public page or an internal/authenticated surface. */
  audience: "internal" | "public";
  /** Rights row for `sourceId`. Absent denies, per sourceRights' first rule. */
  rights?: SourceRights | null;
  now: number;
};

/**
 * The single question every surface asks before rendering a value.
 *
 * Deny paths are checked before allow paths and every unknown denies. The order
 * matters for the reason text more than for the outcome: a caller reading the
 * first reason should learn the most fundamental thing that is wrong, not the
 * most technical.
 */
export function publishability(
  p: EvidencePassport,
  ctx: PublishContext
): PublishDecision {
  const reasons: string[] = [];
  const deny = (r: string): PublishDecision => ({ allowed: false, form: null, reasons: [r] });

  if (p.value === null || p.value === undefined) return deny("no value: unknown is stated as unknown");
  if (isRetracted(p)) return deny("retracted: the latest correction withdrew this value");
  if (p.subjectKind === null) return deny("unknown subject kind");

  const attr = attribution(p.subjectKind, ctx.pageKind);
  if (attr === "denied") {
    return deny(`subject mismatch: a ${p.subjectKind} fact does not describe a ${ctx.pageKind}`);
  }

  if (!isKnown(p, ctx.now)) {
    // isKnown already folded in sufficiency, statistic, transformation and tier,
    // so name the specific one rather than repeating the summary.
    if (p.sufficiency !== "sufficient") return deny("sample not sufficient");
    if (p.statistic === "unknown") return deny("statistic kind unknown: an unlabelled figure is not a figure");
    if (p.transformation === "unknown") return deny("transformation unknown");
    if (p.tier === "sourced" && !p.sourceId) return deny("sourced with no registered source");
    return deny("not known: confidence resolves to none");
  }

  // Rights. Only a sourced value carries someone else's permission; an entered
  // or verified value about our own inventory does not consult the ledger.
  if (p.tier === "sourced") {
    const rights = ctx.rights;
    if (!rights) return deny("no rights row for the registered source");
    if (rights.sourceId !== p.sourceId) return deny("rights row does not match the declared source");
    // Redisplay covers the source's own published figure. Anything we changed
    // into a number they never published is the derived question instead.
    //
    // Finding 89. This module used to answer that question itself, with a local
    // three-line `permits` that read the policy column and nothing else. It was
    // not a paraphrase of the rule in `sourceRights.ts`; it was a different
    // rule, because it ignored `rights_status` and therefore ignored the
    // downward ceiling that is the whole reason the column exists. For
    // `rega_ejar`, whose `redisplay_policy` is `public` and whose
    // `rights_status` is `asserted_unverified`, the local copy answered yes to
    // a public audience where `mayRedisplay` answers no. The moment a rights
    // row became readable at runtime, this file would have authorised public
    // redisplay of a figure whose own stop condition says O10 is unresolved.
    //
    // The header of this module already stated the rule it was breaking: it
    // does not restate rights, it asks the module that owns them. A second copy
    // of a permission is a second thing to forget to update, and this is what
    // that costs.
    const ownFigure = p.transformation === "as_published" || p.transformation === "unit_converted";
    const allowed = ownFigure
      ? mayRedisplay(rights, ctx.audience)
      : mayDisplayDerived(rights, ctx.audience);
    if (!allowed) {
      return deny(
        ownFigure
          ? `licence does not permit redisplay to a ${ctx.audience} audience`
          : `licence does not permit derived display to a ${ctx.audience} audience`
      );
    }
    reasons.push(`licence permits ${ownFigure ? "redisplay" : "derived display"}`);
    // A published figure must carry what makes it meaningful. Any of these
    // missing turns a citation into a decoration.
    if (!p.period) return deny("published figure with no period");
    if (!p.geography) return deny("published figure with no geography");
  }

  if (p.transformation === "modelled") {
    reasons.push("modelled: shown as an assumption, never as evidence");
    return { allowed: true, form: "illustrative", reasons };
  }

  reasons.push(`confidence ${confidenceOf(p, ctx.now)}`, `freshness ${freshnessOf(p, ctx.now)}`);
  return { allowed: true, form: attr === "own" ? "fact" : "context", reasons };
}

// ---------------------------------------------------------------------------
// Bilingual labels
// ---------------------------------------------------------------------------

const ENTITY_LABEL: Record<EntityKind, [string, string]> = {
  property: ["Property", "العقار"],
  development: ["Development", "المشروع"],
  building: ["Building", "المبنى"],
  unit: ["Unit", "الوحدة"],
  listing: ["Listing", "العرض"],
  segment: ["Market segment", "شريحة السوق"],
};

export function entityKindLabel(k: EntityKind, ar: boolean): string {
  return ENTITY_LABEL[k][ar ? 1 : 0];
}

const STATISTIC_LABEL: Record<StatisticKind, [string, string]> = {
  single: ["Value", "قيمة"],
  average: ["Average", "المتوسط"],
  median: ["Median", "الوسيط"],
  count: ["Count", "العدد"],
  range: ["Range", "النطاق"],
  rate: ["Rate", "المعدل"],
  index: ["Index", "المؤشر"],
  unknown: ["Unlabelled", "غير مُعرّف"],
};

export function statisticLabel(s: StatisticKind, ar: boolean): string {
  return STATISTIC_LABEL[s][ar ? 1 : 0];
}

/**
 * What SAT did to the figure between receiving it and showing it.
 *
 * ADV-1C, Codex boundary 4. The transformation was already on the passport and
 * already decided whether the redisplay or the derived clause of a licence
 * applies, but nothing could render it, so a reader had no way to tell a
 * republished number from one we produced. These are the words for that.
 */
const TRANSFORMATION_LABEL: Record<Transformation, [string, string]> = {
  as_published: ["As published", "كما نُشرت"],
  unit_converted: ["Unit converted", "محوّلة الوحدة"],
  aggregated: ["Aggregated by SAT", "جمّعتها سات"],
  derived: ["Derived by SAT", "اشتقّتها سات"],
  modelled: ["Modelled assumption", "افتراض نموذجي"],
  unknown: ["Not stated", "غير مذكور"],
};

export function transformationLabel(t: Transformation, ar: boolean): string {
  return TRANSFORMATION_LABEL[t][ar ? 1 : 0];
}

/**
 * Whether the records behind a figure amount to one. `insufficient` is a real
 * answer and is never rounded up to a small number, which is the whole reason
 * the field exists.
 */
const SUFFICIENCY_LABEL: Record<Sufficiency, [string, string]> = {
  sufficient: ["Sufficient", "كافية"],
  insufficient: ["Not sufficient", "غير كافية"],
  unknown: ["Not assessed", "لم تُقيَّم"],
};

export function sufficiencyLabel(v: Sufficiency, ar: boolean): string {
  return SUFFICIENCY_LABEL[v][ar ? 1 : 0];
}

const FRESHNESS_LABEL: Record<Freshness, [string, string]> = {
  current: ["Current", "محدّث"],
  ageing: ["Ageing", "يقادم"],
  stale: ["Out of date", "غير محدّث"],
  unknown: ["Age not known", "التاريخ غير معروف"],
};

export function freshnessLabel(f: Freshness, ar: boolean): string {
  return FRESHNESS_LABEL[f][ar ? 1 : 0];
}

const VERIFICATION_LABEL: Record<VerificationDimension, [string, string]> = {
  ownership: ["Ownership", "الملكية"],
  authorization: ["Authorisation to market", "التفويض بالتسويق"],
  right_to_market: ["Right to market", "حق التسويق"],
  ad_permit: ["Advertising permit", "تصريح الإعلان"],
  identity: ["Identity", "الهوية"],
  deed: ["Title deed", "الصك"],
  licence: ["Licence", "الترخيص"],
  availability: ["Availability", "التوفر"],
  measurement: ["Measured area", "المساحة المقاسة"],
  document: ["Document", "المستند"],
};

export function verificationDimensionLabel(
  d: VerificationDimension,
  ar: boolean
): string {
  return VERIFICATION_LABEL[d][ar ? 1 : 0];
}

const STATE_LABEL: Record<VerificationState, [string, string]> = {
  verified: ["Verified", "موثّق"],
  not_verified: ["Not verified", "غير موثّق"],
  expired: ["Expired", "منتهٍ"],
  not_applicable: ["Not applicable", "لا ينطبق"],
  unknown: ["Not verified", "غير موثّق"],
};

export function verificationStateLabel(s: VerificationState, ar: boolean): string {
  return STATE_LABEL[s][ar ? 1 : 0];
}

/**
 * The one line a surface shows when there is no value.
 *
 * It says what is missing rather than leaving a gap, because a blank reads as
 * "nothing to say here" and the truthful statement is "we do not hold this".
 */
export function unknownLabel(ar: boolean): string {
  return ar ? "غير متوفر لدينا" : "Not held";
}
