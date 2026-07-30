import { test } from "node:test";
import assert from "node:assert/strict";
import {
  MAX_PERIOD_AGE_MONTHS,
  MIN_AGGREGATION_K,
  MIN_COVERAGE_SHARE,
  PUBLISHABLE_GEOGRAPHIES,
  assessCoverage,
  type CoverageFailureCode,
  type CoverageInput,
} from "./coverage";

// ADV-5B. What this file is for.
//
// The failure this gate exists to prevent is not a wrong number. It is a number
// that reads as evidence because the surface around it is well built. So every
// test here asserts the CODE and not only the refusal: "the vendor did not tell
// us" and "the vendor told us and it is unsafe" are answered by different people
// and must not collapse into one message.

const ASOF = new Date("2026-07-30T00:00:00Z");

const good = (over: Partial<CoverageInput> = {}): CoverageInput => ({
  geography: "district",
  areaId: "riyadh-olaya",
  k: 400,
  periodEnd: "2026-06-30",
  coverageShare: 0.82,
  sampleBasis: "opted-in mobile SDK panel, weighted to GASTAT district population",
  methodNote: "device dwell clustering, known under-representation of over-65s",
  ...over,
});

const codes = (i: CoverageInput): CoverageFailureCode[] =>
  assessCoverage(i, ASOF).failures.map((f) => f.code);

test("coverage: a complete, current, well covered district figure publishes", () => {
  const v = assessCoverage(good(), ASOF);
  assert.equal(v.publishable, true);
  assert.deepEqual(v.failures, []);
  assert.equal(v.appliedThreshold, MIN_AGGREGATION_K);
});

// 1. Geography decides before the numbers do.

test("coverage: only city and district are publishable", () => {
  assert.deepEqual([...PUBLISHABLE_GEOGRAPHIES], ["city", "district"]);
  assert.equal(assessCoverage(good({ geography: "city" }), ASOF).publishable, true);
});

test("coverage: parcel and building are refused for a privacy reason", () => {
  for (const geography of ["parcel", "building"] as const) {
    assert.deepEqual(codes(good({ geography })), ["geography_not_publishable"]);
  }
});

test("coverage: an isochrone is refused under its own code, naming D27(a)", () => {
  const v = assessCoverage(good({ geography: "isochrone" }), ASOF);
  assert.deepEqual(
    v.failures.map((f) => f.code),
    ["geography_is_isochrone"]
  );
  assert.match(v.failures[0].detail, /D27\(a\)/);
  // The two refusals must never collapse: a bigger panel fixes neither, but only
  // one of them is a licence and architecture fact.
  assert.notEqual(
    codes(good({ geography: "isochrone" }))[0],
    codes(good({ geography: "parcel" }))[0]
  );
});

test("coverage: a perfect isochrone figure is still refused", () => {
  const v = assessCoverage(good({ geography: "isochrone", k: 90_000, coverageShare: 1 }), ASOF);
  assert.equal(v.publishable, false);
});

// 2. Null is not zero and is never a pass.

test("coverage: an absent k is its own code, distinct from a low k", () => {
  assert.deepEqual(codes(good({ k: null })), ["k_missing"]);
  assert.deepEqual(codes(good({ k: 0 })), ["k_below_threshold"]);
  assert.deepEqual(codes(good({ k: MIN_AGGREGATION_K - 1 })), ["k_below_threshold"]);
  assert.deepEqual(codes(good({ k: MIN_AGGREGATION_K })), []);
});

test("coverage: an absent coverage share is its own code, distinct from a low one", () => {
  assert.deepEqual(codes(good({ coverageShare: null })), ["coverage_share_missing"]);
  assert.deepEqual(codes(good({ coverageShare: 0 })), ["coverage_share_below_threshold"]);
  assert.deepEqual(codes(good({ coverageShare: 1.4 })), ["coverage_share_out_of_range"]);
  assert.deepEqual(codes(good({ coverageShare: MIN_COVERAGE_SHARE })), []);
});

test("coverage: an absent period is its own code, distinct from a stale one", () => {
  assert.deepEqual(codes(good({ periodEnd: null })), ["period_missing"]);
  assert.deepEqual(codes(good({ periodEnd: "last quarter" })), ["period_unparsable"]);
  assert.deepEqual(codes(good({ periodEnd: "2027-01-01" })), ["period_in_future"]);
  assert.deepEqual(codes(good({ periodEnd: "2023-01-01" })), ["period_stale"]);
});

test("coverage: the staleness limit is applied at its stated edge", () => {
  // A period ending one month inside the limit passes; well outside it fails.
  const inside = new Date(ASOF);
  inside.setUTCMonth(inside.getUTCMonth() - (MAX_PERIOD_AGE_MONTHS - 1));
  const outside = new Date(ASOF);
  outside.setUTCMonth(outside.getUTCMonth() - (MAX_PERIOD_AGE_MONTHS + 2));
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  assert.deepEqual(codes(good({ periodEnd: iso(inside) })), []);
  assert.deepEqual(codes(good({ periodEnd: iso(outside) })), ["period_stale"]);
});

// 3. The vendor's threshold governs when it is stricter.

test("coverage: the stricter of our floor and the vendor threshold is applied", () => {
  const strict = assessCoverage(good({ k: 400, vendorThreshold: 1000 }), ASOF);
  assert.equal(strict.appliedThreshold, 1000);
  assert.deepEqual(
    strict.failures.map((f) => f.code),
    ["k_below_threshold"]
  );

  const lax = assessCoverage(good({ k: 10, vendorThreshold: 5 }), ASOF);
  assert.equal(lax.appliedThreshold, MIN_AGGREGATION_K);
  assert.equal(lax.publishable, false);
});

// 4. Words are answers too, and blank is not one.

test("coverage: an empty sample basis or method note is unanswered", () => {
  assert.deepEqual(codes(good({ sampleBasis: "   " })), ["sample_basis_missing"]);
  assert.deepEqual(codes(good({ methodNote: null })), ["method_note_missing"]);
});

// 5. Every failure is collected.

test("coverage: an empty observation reports every gap at once", () => {
  const v = assessCoverage(
    {
      geography: "building",
      areaId: "x",
      k: null,
      periodEnd: null,
      coverageShare: null,
      sampleBasis: null,
      methodNote: null,
    },
    ASOF
  );
  assert.equal(v.publishable, false);
  assert.deepEqual(v.failures.map((f) => f.code), [
    "geography_not_publishable",
    "k_missing",
    "period_missing",
    "coverage_share_missing",
    "sample_basis_missing",
    "method_note_missing",
  ]);
});

test("coverage: every failure carries reviewer detail", () => {
  const v = assessCoverage(good({ k: null, coverageShare: null }), ASOF);
  for (const f of v.failures) assert.ok(f.detail.trim().length > 20, f.code);
});
