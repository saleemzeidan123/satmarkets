import { test } from "node:test";
import assert from "node:assert/strict";

import {
  attribution,
  anyVerified,
  confidenceOf,
  entityKindLabel,
  freshnessOf,
  freshnessLabel,
  isKnown,
  isRetracted,
  latestCorrection,
  normalizeEntityKind,
  normalizeStatisticKind,
  normalizeSufficiency,
  normalizeTransformation,
  publishability,
  statisticLabel,
  unknownLabel,
  verificationDimensionLabel,
  verificationStateLabel,
  verificationStateOf,
  verifiedDimensions,
  type EvidencePassport,
  type EntityKind,
  type StatisticKind,
  type Transformation,
  type VerificationDimension,
  type VerificationState,
} from "@/lib/evidence";
import { provenanceLabel, type ProvenanceTier } from "@/lib/provenance";
import type { SourceRights, UsePolicy } from "@/lib/sourceRights";

// A fixed clock. Everything time-dependent is relative to this, so no test
// changes behaviour when the suite runs at a different hour.
const NOW = Date.parse("2026-07-28T12:00:00Z");
const daysAgo = (n: number) => new Date(NOW - n * 86_400_000).toISOString();

const rights = (over: Partial<SourceRights> = {}): SourceRights => ({
  sourceId: "rega_rent_index",
  storagePolicy: "full",
  redisplayPolicy: "public",
  derivedDisplayPolicy: "public",
  exportPolicy: "public",
  aiRetrievalPolicy: "public",
  modelInputPolicy: "none",
  rightsStatus: "evidenced",
  stopCondition: null,
  reviewedAt: null,
  reviewedNote: null,
  ...over,
});

// A passport that passes everything, so each test can break exactly one thing
// and attribute the outcome to that one thing.
const good = (over: Partial<EvidencePassport> = {}): EvidencePassport => ({
  field: "rent_sar_sqm_year",
  subjectKind: "segment",
  subjectId: "riyadh-olaya-office",
  value: "1,450",
  unit: "SAR/sqm/year",
  tier: "sourced",
  statistic: "average",
  transformation: "as_published",
  sufficiency: "sufficient",
  sourceId: "rega_rent_index",
  period: "2026-Q2",
  geography: "Riyadh, Olaya",
  asOf: daysAgo(10),
  maxAgeDays: 120,
  ...over,
});

const ctx = (over: Partial<Parameters<typeof publishability>[1]> = {}) => ({
  pageKind: "segment" as EntityKind,
  audience: "public" as const,
  rights: rights(),
  now: NOW,
  ...over,
});

// ---------------------------------------------------------------------------
// Normalisers: every unknown coerces downward, never sideways into a plausible
// neighbour. This is the sourceRights discipline applied to a second module.
// ---------------------------------------------------------------------------

test("an unrecognised entity kind is null, not a plausible neighbour", () => {
  assert.equal(normalizeEntityKind("building"), "building");
  assert.equal(normalizeEntityKind("district"), null);
  assert.equal(normalizeEntityKind("Building"), null);
  assert.equal(normalizeEntityKind(undefined), null);
  assert.equal(normalizeEntityKind(null), null);
  assert.equal(normalizeEntityKind(7), null);
});

test("an unrecognised statistic kind coerces to unknown, and median never folds into average", () => {
  assert.equal(normalizeStatisticKind("median"), "median");
  assert.equal(normalizeStatisticKind("average"), "average");
  assert.equal(normalizeStatisticKind("mean"), "unknown");
  assert.equal(normalizeStatisticKind("typical"), "unknown");
  assert.equal(normalizeStatisticKind(null), "unknown");
});

test("an unrecognised transformation coerces to unknown", () => {
  assert.equal(normalizeTransformation("as_published"), "as_published");
  assert.equal(normalizeTransformation("modelled"), "modelled");
  assert.equal(normalizeTransformation("estimated"), "unknown");
  assert.equal(normalizeTransformation(undefined), "unknown");
});

test("sufficiency recognises only its two real states", () => {
  assert.equal(normalizeSufficiency("sufficient"), "sufficient");
  assert.equal(normalizeSufficiency("insufficient"), "insufficient");
  assert.equal(normalizeSufficiency("probably"), "unknown");
  assert.equal(normalizeSufficiency(true), "unknown");
});

// ---------------------------------------------------------------------------
// Attribution: the asymmetry is the whole point.
// ---------------------------------------------------------------------------

test("a fact about a thing is that thing's own fact", () => {
  for (const k of ["property", "development", "building", "unit", "listing", "segment"] as EntityKind[]) {
    assert.equal(attribution(k, k), "own", k);
  }
});

test("containment reads downward as context", () => {
  assert.equal(attribution("building", "unit"), "context");
  assert.equal(attribution("development", "building"), "context");
  assert.equal(attribution("property", "unit"), "context");
  assert.equal(attribution("unit", "listing"), "context");
});

test("containment does not read upward: one unit is not evidence about the building", () => {
  assert.equal(attribution("unit", "building"), "denied");
  assert.equal(attribution("building", "development"), "denied");
  assert.equal(attribution("unit", "property"), "denied");
});

test("a market segment is context for anything in it and never that thing's own value", () => {
  assert.equal(attribution("segment", "unit"), "context");
  assert.equal(attribution("segment", "listing"), "context");
  assert.equal(attribution("segment", "building"), "context");
  // and nothing inside the market describes the market
  assert.equal(attribution("unit", "segment"), "denied");
  assert.equal(attribution("listing", "segment"), "denied");
});

test("a listing's asking terms never travel up to the physical asset", () => {
  assert.equal(attribution("listing", "unit"), "denied");
  assert.equal(attribution("listing", "building"), "denied");
  assert.equal(attribution("listing", "property"), "denied");
});

// ---------------------------------------------------------------------------
// Verification: the demo demotion is the ruling-3 correction made structural.
// ---------------------------------------------------------------------------

test("a demo verification record is never a verification", () => {
  assert.equal(
    verificationStateOf({
      dimension: "ownership",
      state: "verified",
      checkedAt: daysAgo(1),
      isDemo: true,
    }),
    "not_verified"
  );
});

test("every verification record the platform actually holds today resolves to not verified", () => {
  // verification_events: 3 rows, all is_demo, each basis says no Wathq and no
  // REGA lookup. listing_verification_events: 94 rows on gate rega_permit, all
  // is_demo, behind listings holding no permit number.
  const asStored: readonly { dimension: VerificationDimension; state: VerificationState }[] = [
    { dimension: "ownership", state: "verified" },
    { dimension: "ad_permit", state: "verified" },
    { dimension: "authorization", state: "verified" },
  ];
  const records = asStored.map((r) => ({ ...r, checkedAt: daysAgo(3), isDemo: true }));
  assert.equal(anyVerified(records), false);
  assert.deepEqual(verifiedDimensions(records), []);
});

test("verified with no date of check is not verified", () => {
  assert.equal(
    verificationStateOf({ dimension: "identity", state: "verified", checkedAt: null }),
    "not_verified"
  );
  assert.equal(
    verificationStateOf({ dimension: "identity", state: "verified", checkedAt: daysAgo(2) }),
    "verified"
  );
});

test("an unrecognised verification state is not a verification", () => {
  assert.equal(
    verificationStateOf({
      dimension: "deed",
      state: "pending" as unknown as VerificationState,
      checkedAt: daysAgo(1),
    }),
    "not_verified"
  );
});

test("expired and not applicable survive unchanged, because both are honest answers", () => {
  assert.equal(
    verificationStateOf({ dimension: "ad_permit", state: "expired", checkedAt: daysAgo(400) }),
    "expired"
  );
  assert.equal(
    verificationStateOf({ dimension: "deed", state: "not_applicable" }),
    "not_applicable"
  );
});

test("dimensions resolve separately, so one real check does not verify the others", () => {
  const records = [
    { dimension: "ownership" as const, state: "verified" as const, checkedAt: daysAgo(5) },
    { dimension: "ad_permit" as const, state: "not_verified" as const },
    { dimension: "authorization" as const, state: "verified" as const, isDemo: true, checkedAt: daysAgo(5) },
  ];
  assert.deepEqual(verifiedDimensions(records), ["ownership"]);
  assert.equal(anyVerified(records), true);
});

// ---------------------------------------------------------------------------
// Corrections
// ---------------------------------------------------------------------------

test("the latest correction is the latest by date, not by array position", () => {
  const h = [
    { at: "2026-05-01T00:00:00Z", kind: "correction" as const, reason: "unit was wrong" },
    { at: "2026-06-01T00:00:00Z", kind: "retraction" as const, reason: "source withdrew the figure" },
    { at: "2026-04-01T00:00:00Z", kind: "restatement" as const, reason: "rounding" },
  ];
  assert.equal(latestCorrection(h)?.kind, "retraction");
  assert.equal(latestCorrection([]), null);
  assert.equal(latestCorrection(undefined), null);
});

test("a retracted value is not known and does not publish", () => {
  const p = good({
    corrections: [
      { at: daysAgo(30), kind: "correction", reason: "period corrected" },
      { at: daysAgo(2), kind: "retraction", reason: "the source withdrew this release" },
    ],
  });
  assert.equal(isRetracted(p), true);
  assert.equal(confidenceOf(p, NOW), "none");
  assert.equal(isKnown(p, NOW), false);
  const d = publishability(p, ctx());
  assert.equal(d.allowed, false);
  assert.match(d.reasons[0], /retracted/);
});

test("a correction that is not a retraction leaves the value publishable", () => {
  const p = good({
    corrections: [{ at: daysAgo(2), kind: "correction", reason: "geography label corrected" }],
  });
  assert.equal(isRetracted(p), false);
  assert.equal(publishability(p, ctx()).allowed, true);
});

// ---------------------------------------------------------------------------
// Freshness
// ---------------------------------------------------------------------------

test("freshness needs both an as-of date and a stated tolerance", () => {
  assert.equal(freshnessOf(good({ asOf: null }), NOW), "unknown");
  assert.equal(freshnessOf(good({ maxAgeDays: null }), NOW), "unknown");
  assert.equal(freshnessOf(good({ maxAgeDays: 0 }), NOW), "unknown");
  assert.equal(freshnessOf(good({ asOf: "not a date" }), NOW), "unknown");
});

test("freshness bands: current below 60 percent, ageing above it, stale past the allowance", () => {
  assert.equal(freshnessOf(good({ asOf: daysAgo(10), maxAgeDays: 100 }), NOW), "current");
  assert.equal(freshnessOf(good({ asOf: daysAgo(59), maxAgeDays: 100 }), NOW), "current");
  assert.equal(freshnessOf(good({ asOf: daysAgo(61), maxAgeDays: 100 }), NOW), "ageing");
  assert.equal(freshnessOf(good({ asOf: daysAgo(101), maxAgeDays: 100 }), NOW), "stale");
});

test("a date in the future is a data error, not freshness", () => {
  assert.equal(freshnessOf(good({ asOf: daysAgo(-5), maxAgeDays: 100 }), NOW), "unknown");
});

// ---------------------------------------------------------------------------
// Confidence is derived. This is the AI boundary at the value level.
// ---------------------------------------------------------------------------

test("there is no way to author confidence: it falls out of the dimensions", () => {
  // A caller cannot hand in a confidence, so the only lever is the evidence.
  assert.equal(confidenceOf(good(), NOW), "moderate");
  assert.equal(
    confidenceOf(
      good({
        tier: "verified",
        verification: [{ dimension: "measurement", state: "verified", checkedAt: daysAgo(3) }],
      }),
      NOW
    ),
    "high"
  );
});

test("every unknown drives confidence to none", () => {
  assert.equal(confidenceOf(good({ value: null }), NOW), "none");
  assert.equal(confidenceOf(good({ subjectKind: null }), NOW), "none");
  assert.equal(confidenceOf(good({ sufficiency: "unknown" }), NOW), "none");
  assert.equal(confidenceOf(good({ sufficiency: "insufficient" }), NOW), "none");
  assert.equal(confidenceOf(good({ statistic: "unknown" }), NOW), "none");
  assert.equal(confidenceOf(good({ transformation: "unknown" }), NOW), "none");
  assert.equal(confidenceOf(good({ sourceId: null }), NOW), "none");
});

test("a tier-verified passport with no genuine verification record is only moderate", () => {
  assert.equal(
    confidenceOf(
      good({
        tier: "verified",
        verification: [
          { dimension: "ownership", state: "verified", checkedAt: daysAgo(3), isDemo: true },
        ],
      }),
      NOW
    ),
    "moderate"
  );
});

test("a modelled figure is never more than low, however fresh", () => {
  assert.equal(
    confidenceOf(good({ tier: "computed", transformation: "modelled", asOf: daysAgo(1) }), NOW),
    "low"
  );
});

test("a lister-entered value is low, and stale drives anything to low", () => {
  assert.equal(confidenceOf(good({ tier: "entered", sourceId: null }), NOW), "low");
  assert.equal(confidenceOf(good({ asOf: daysAgo(400) }), NOW), "low");
  assert.equal(confidenceOf(good({ asOf: null }), NOW), "low");
});

test("unknown never becomes known, whatever else is right about the record", () => {
  const p = good({ value: null });
  assert.equal(isKnown(p, NOW), false);
  // and the honest rendering is a statement, not a blank
  assert.equal(unknownLabel(false), "Not held");
  assert.equal(unknownLabel(true), "غير متوفر لدينا");
});

// ---------------------------------------------------------------------------
// Publishability
// ---------------------------------------------------------------------------

test("the happy path publishes as a fact and says why", () => {
  const d = publishability(good(), ctx());
  assert.equal(d.allowed, true);
  assert.equal(d.form, "fact");
  assert.ok(d.reasons.length > 0);
  assert.ok(d.reasons.some((r) => /confidence/.test(r)));
});

test("a value about a containing thing publishes as context, not as the page's own fact", () => {
  const d = publishability(good({ subjectKind: "segment" }), ctx({ pageKind: "unit" }));
  assert.equal(d.allowed, true);
  assert.equal(d.form, "context");
});

test("a subject mismatch denies before anything else is considered", () => {
  const d = publishability(good({ subjectKind: "listing" }), ctx({ pageKind: "building" }));
  assert.equal(d.allowed, false);
  assert.match(d.reasons[0], /subject mismatch/);
});

test("no value denies, and says the unknown is stated as unknown", () => {
  const d = publishability(good({ value: null }), ctx());
  assert.equal(d.allowed, false);
  assert.match(d.reasons[0], /unknown/);
});

test("an unlabelled statistic does not publish", () => {
  const d = publishability(good({ statistic: "unknown" }), ctx());
  assert.equal(d.allowed, false);
  assert.match(d.reasons[0], /statistic kind unknown/);
});

test("an insufficient sample does not publish", () => {
  const d = publishability(good({ sufficiency: "insufficient" }), ctx());
  assert.equal(d.allowed, false);
  assert.match(d.reasons[0], /sufficient/);
});

test("a missing rights row denies: an unknown licence is not a permissive one", () => {
  const d = publishability(good(), ctx({ rights: null }));
  assert.equal(d.allowed, false);
  assert.match(d.reasons[0], /no rights row/);
});

test("a rights row for a different source denies", () => {
  const d = publishability(good(), ctx({ rights: rights({ sourceId: "somewhere_else" }) }));
  assert.equal(d.allowed, false);
  assert.match(d.reasons[0], /does not match/);
});

test("redisplay and derived display are separate permissions", () => {
  // The source's own published figure, where only redisplay is permitted.
  const onlyRedisplay = rights({ derivedDisplayPolicy: "none" as UsePolicy });
  assert.equal(publishability(good(), ctx({ rights: onlyRedisplay })).allowed, true);
  assert.equal(
    publishability(good({ transformation: "aggregated" }), ctx({ rights: onlyRedisplay })).allowed,
    false
  );

  // And the reverse, where we may publish our own derivation but not their figure.
  const onlyDerived = rights({ redisplayPolicy: "none" as UsePolicy });
  assert.equal(publishability(good(), ctx({ rights: onlyDerived })).allowed, false);
  assert.equal(
    publishability(good({ transformation: "derived" }), ctx({ rights: onlyDerived })).allowed,
    true
  );
});

test("an internal-only licence publishes internally and not publicly", () => {
  const internal = rights({ redisplayPolicy: "internal" as UsePolicy });
  assert.equal(publishability(good(), ctx({ rights: internal, audience: "public" })).allowed, false);
  assert.equal(
    publishability(good(), ctx({ rights: internal, audience: "internal" })).allowed,
    true
  );
});

test("unit conversion is arithmetic, so it stays on the redisplay permission", () => {
  const onlyRedisplay = rights({ derivedDisplayPolicy: "none" as UsePolicy });
  assert.equal(
    publishability(good({ transformation: "unit_converted" }), ctx({ rights: onlyRedisplay })).allowed,
    true
  );
});

test("a published figure with no period or no geography does not publish", () => {
  assert.equal(publishability(good({ period: null }), ctx()).allowed, false);
  assert.match(publishability(good({ period: null }), ctx()).reasons[0], /period/);
  assert.equal(publishability(good({ geography: null }), ctx()).allowed, false);
  assert.match(publishability(good({ geography: null }), ctx()).reasons[0], /geography/);
});

test("period and geography are required of sourced figures only, not of our own inventory", () => {
  const ownFact = good({
    tier: "entered",
    subjectKind: "listing",
    sourceId: null,
    period: null,
    geography: null,
    statistic: "single",
  });
  const d = publishability(ownFact, ctx({ pageKind: "listing", rights: null }));
  assert.equal(d.allowed, true);
  assert.equal(d.form, "fact");
});

test("a modelled figure publishes only as an illustration", () => {
  const d = publishability(
    good({ tier: "computed", transformation: "modelled", sourceId: null }),
    ctx({ rights: null })
  );
  assert.equal(d.allowed, true);
  assert.equal(d.form, "illustrative");
  assert.match(d.reasons.join(" "), /assumption/);
});

test("the HBU comparables shape: modelled, so never a fact even on its own page", () => {
  // Owner ruling 4. The four named Riyadh buildings became Comparable A to D and
  // the Source column reads Simulated. A simulated comparable is an assumption.
  const comp = good({
    field: "cap_rate",
    subjectKind: "building",
    subjectId: "comparable-a",
    value: "6.8",
    unit: "%",
    tier: "computed",
    statistic: "single",
    transformation: "modelled",
    sourceId: null,
    period: null,
    geography: null,
  });
  const d = publishability(comp, ctx({ pageKind: "building", rights: null }));
  assert.equal(d.form, "illustrative");
});

// ---------------------------------------------------------------------------
// Cross-module invariants
// ---------------------------------------------------------------------------

test("the passport tier stays in step with the provenance tier it mirrors", () => {
  // evidence.ts deliberately does not import the rendering module, so this test
  // is the joint that holds the two literal unions together. If a fifth tier is
  // ever added to provenance.ts, this fails rather than drifting silently.
  const tiers: ProvenanceTier[] = ["entered", "verified", "computed", "sourced"];
  const passportTiers: EvidencePassport["tier"][] = ["entered", "verified", "computed", "sourced"];
  assert.deepEqual([...tiers].sort(), [...passportTiers].sort());
  // and each one still renders a label in both locales
  for (const t of tiers) {
    assert.ok(provenanceLabel(t, {}, false).length > 0);
    assert.ok(provenanceLabel(t, {}, true).length > 0);
  }
});

test("every label exists in both locales and differs between them", () => {
  const kinds: EntityKind[] = ["property", "development", "building", "unit", "listing", "segment"];
  for (const k of kinds) {
    assert.notEqual(entityKindLabel(k, false), entityKindLabel(k, true), k);
    assert.ok(entityKindLabel(k, true).length > 0, k);
  }
  const stats: StatisticKind[] = ["single", "average", "median", "count", "range", "rate", "index", "unknown"];
  for (const s of stats) {
    assert.notEqual(statisticLabel(s, false), statisticLabel(s, true), s);
  }
  const dims: VerificationDimension[] = [
    "ownership", "authorization", "right_to_market", "ad_permit", "identity",
    "deed", "licence", "availability", "measurement", "document",
  ];
  for (const d of dims) {
    assert.notEqual(verificationDimensionLabel(d, false), verificationDimensionLabel(d, true), d);
  }
  for (const f of ["current", "ageing", "stale", "unknown"] as const) {
    assert.notEqual(freshnessLabel(f, false), freshnessLabel(f, true), f);
  }
});

test("average and median never share a label in either locale", () => {
  assert.notEqual(statisticLabel("average", false), statisticLabel("median", false));
  assert.notEqual(statisticLabel("average", true), statisticLabel("median", true));
});

test("an unknown verification state reads as not verified, never as a third state", () => {
  assert.equal(verificationStateLabel("unknown", false), verificationStateLabel("not_verified", false));
  assert.equal(verificationStateLabel("unknown", true), verificationStateLabel("not_verified", true));
});

test("no label contains an em dash or an Arabic-Indic numeral", () => {
  const all: string[] = [];
  for (const k of ["property", "development", "building", "unit", "listing", "segment"] as EntityKind[]) {
    all.push(entityKindLabel(k, false), entityKindLabel(k, true));
  }
  for (const s of ["single", "average", "median", "count", "range", "rate", "index", "unknown"] as StatisticKind[]) {
    all.push(statisticLabel(s, false), statisticLabel(s, true));
  }
  for (const d of ["ownership", "authorization", "right_to_market", "ad_permit", "identity", "deed", "licence", "availability", "measurement", "document"] as VerificationDimension[]) {
    all.push(verificationDimensionLabel(d, false), verificationDimensionLabel(d, true));
  }
  all.push(unknownLabel(false), unknownLabel(true));
  for (const s of all) {
    assert.doesNotMatch(s, /[\u2014\u2013]/, `dash in ${s}`);
    assert.doesNotMatch(s, /[\u0660-\u0669]/, `Arabic-Indic numeral in ${s}`);
  }
});

test("a transformation the build does not recognise blocks publication rather than passing through", () => {
  const t = normalizeTransformation("smoothed" as unknown as Transformation);
  assert.equal(t, "unknown");
  assert.equal(publishability(good({ transformation: t }), ctx()).allowed, false);
});
