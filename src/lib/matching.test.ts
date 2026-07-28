import test from "node:test";
import assert from "node:assert/strict";
import {
  BUDGET_TOLERANCE_PCT,
  SIZE_TOLERANCE_PCT,
  compareMatches,
  matchExclusion,
  matchListing,
  matchReasons,
  ratePerSqm,
  verdictFrom,
  verdictLabel,
  type MatchListing,
  type MatchRequirement,
  type MatchResult,
} from "./matching";

const NOW = Date.parse("2026-07-18T00:00:00Z");
const daysAgo = (d: number) => new Date(NOW - d * 86400000).toISOString();

const REQ: MatchRequirement = {
  asset_type: "office",
  deal_type: "lease",
  city: "Riyadh",
  district_id: "11111111-1111-4111-8111-111111111111",
  size_min_sqm: 400,
  size_max_sqm: 800,
  budget_sqm_max: 2000,
  timeline: "Flexible",
  must_haves: [],
  is_demo: false,
};

const LST: MatchListing = {
  id: "L1",
  status: "published",
  asset_type: "office",
  deal_type: "lease",
  city: "Riyadh",
  district_id: "11111111-1111-4111-8111-111111111111",
  area_sqm: 600,
  asking_rent_sqm: 1800,
  sale_price: null,
  availability_confirmed_at: daysAgo(3),
  ad_permit_expires_at: "2027-01-01",
  is_demo: false,
};

const by = (r: MatchResult, key: string) => r.reasons.find((x) => x.key === key);

test("a listing that answers every stated dimension is an exact match", () => {
  const r = matchListing(REQ, LST, NOW);
  assert.equal(r.eligible, true);
  assert.equal(r.exclusion, null);
  assert.equal(r.verdict, "exact");
  assert.equal(r.failed, 0);
  assert.equal(r.unknown, 0);
  assert.equal(r.tolerance, 0);
  assert.ok(r.met >= 5);
});

test("a dimension the requirement does not state is not compared at all", () => {
  const bare: MatchRequirement = { asset_type: "office", deal_type: "lease", is_demo: false };
  const rs = matchReasons(bare, LST, NOW);
  assert.deepEqual(rs.map((x) => x.key), ["asset_type", "deal_type"]);
  // Silence is not a constraint, so it cannot inflate the count of things checked.
  assert.equal(matchListing(bare, LST, NOW).met, 2);
});

test("a fact the listing does not state is unknown, never a pass and never a fail", () => {
  const r = matchListing(REQ, { ...LST, area_sqm: null }, NOW);
  const size = by(r, "size");
  assert.equal(size?.state, "unknown");
  assert.equal(r.verdict, "needs_clarification");
  assert.equal(r.failed, 0);
});

test("every unknown names the fact that would resolve it, and nothing else carries a remedy", () => {
  const r = matchListing(
    { ...REQ, must_haves: ["Heavy power"] },
    { ...LST, area_sqm: null, city: null, district_id: null, asking_rent_sqm: null },
    NOW,
  );
  for (const reason of r.reasons) {
    if (reason.state === "unknown") {
      assert.ok(reason.remedy_en && reason.remedy_en.length > 0, reason.key);
      assert.ok(reason.remedy_ar && reason.remedy_ar.length > 0, reason.key);
    } else {
      assert.equal(reason.remedy_en, undefined, reason.key);
      assert.equal(reason.remedy_ar, undefined, reason.key);
    }
  }
});

test("a size just outside the range is a possible match that says by how much", () => {
  const r = matchListing(REQ, { ...LST, area_sqm: 840 }, NOW); // 5 percent over 800
  const size = by(r, "size");
  assert.equal(size?.state, "tolerance");
  assert.match(size?.reason_en ?? "", /5 percent/);
  assert.match(size?.reason_en ?? "", new RegExp(`${SIZE_TOLERANCE_PCT} percent margin`));
  assert.equal(r.verdict, "possible");
});

test("a size well outside the range is refused rather than stretched", () => {
  const r = matchListing(REQ, { ...LST, area_sqm: 1000 }, NOW);
  assert.equal(by(r, "size")?.state, "failed");
  assert.equal(r.verdict, "no");
});

test("the tolerance is applied to the near edge, not to the far one", () => {
  // 380 is 5 percent under a 400 minimum. The 800 maximum is irrelevant here.
  assert.equal(by(matchListing(REQ, { ...LST, area_sqm: 380 }, NOW), "size")?.state, "tolerance");
  assert.equal(by(matchListing(REQ, { ...LST, area_sqm: 300 }, NOW), "size")?.state, "failed");
});

test("budget is compared per square metre, and a sale rate is derived from price and area", () => {
  const sale: MatchListing = { ...LST, deal_type: "sale", asking_rent_sqm: null, sale_price: 6_000_000, area_sqm: 600 };
  assert.equal(ratePerSqm(sale), 10000);
  const saleReq: MatchRequirement = { ...REQ, deal_type: "sale", budget_sqm_max: 12000 };
  assert.equal(by(matchListing(saleReq, sale, NOW), "budget")?.state, "met");
  // No area means no rate. A missing figure is never read as zero, which would
  // silently pass every budget ceiling on the platform.
  assert.equal(ratePerSqm({ ...sale, area_sqm: null }), null);
  assert.equal(by(matchListing(saleReq, { ...sale, area_sqm: null }, NOW), "budget")?.state, "unknown");
});

test("a rent a little above the ceiling is possible, and well above is refused", () => {
  const near = matchListing(REQ, { ...LST, asking_rent_sqm: 2100 }, NOW); // 5 percent over
  assert.equal(by(near, "budget")?.state, "tolerance");
  assert.match(by(near, "budget")?.reason_en ?? "", new RegExp(`${BUDGET_TOLERANCE_PCT} percent margin`));
  assert.equal(by(matchListing(REQ, { ...LST, asking_rent_sqm: 3000 }, NOW), "budget")?.state, "failed");
});

test("a different district in the same city is possible, and no district at all is unknown", () => {
  const other = matchListing(REQ, { ...LST, district_id: "22222222-2222-4222-8222-222222222222" }, NOW);
  assert.equal(by(other, "district")?.state, "tolerance");
  assert.equal(other.verdict, "possible");
  const none = matchListing(REQ, { ...LST, district_id: null }, NOW);
  assert.equal(by(none, "district")?.state, "unknown");
});

test("a different city is a refusal, and the city is printed through the label table", () => {
  const r = matchListing({ ...REQ, district_id: null }, { ...LST, city: "jeddah", district_id: null }, NOW);
  const city = by(r, "city");
  assert.equal(city?.state, "failed");
  assert.match(city?.reason_en ?? "", /Jeddah/);
  assert.match(city?.reason_ar ?? "", /جدة/);
  assert.doesNotMatch(city?.reason_en ?? "", /jeddah/);
});

test("availability is only asked about when the timeline makes it part of the question", () => {
  assert.equal(by(matchListing(REQ, LST, NOW), "timeline"), undefined);
  const urgent = { ...REQ, timeline: "ASAP" };
  assert.equal(by(matchListing(urgent, LST, NOW), "timeline")?.state, "met");
  assert.equal(by(matchListing(urgent, { ...LST, availability_confirmed_at: daysAgo(40) }, NOW), "timeline")?.state, "tolerance");
  // An affirmation too old to answer the question is an open question, not a no.
  assert.equal(by(matchListing(urgent, { ...LST, availability_confirmed_at: daysAgo(200) }, NOW), "timeline")?.state, "unknown");
  assert.equal(by(matchListing(urgent, { ...LST, availability_confirmed_at: null }, NOW), "timeline")?.state, "unknown");
});

test("a free-text must-have is never inferred, so a brief that lists one has no exact match", () => {
  const r = matchListing({ ...REQ, must_haves: ["Heavy power", "Dock doors"] }, LST, NOW);
  const musts = r.reasons.filter((x) => x.dimension === "must_have");
  assert.equal(musts.length, 2);
  for (const m of musts) assert.equal(m.state, "unknown");
  assert.equal(r.verdict, "needs_clarification");
  assert.match(musts[0].reason_en, /"Heavy power"/);
});

test("must-haves are deduplicated and bounded, and blanks are dropped", () => {
  const many = ["Fitted", "fitted", "  ", "", ...Array.from({ length: 20 }, (_, i) => `need ${i}`)];
  const r = matchListing({ ...REQ, must_haves: many }, LST, NOW);
  const musts = r.reasons.filter((x) => x.dimension === "must_have");
  assert.equal(musts.length, 12);
  assert.equal(new Set(musts.map((m) => m.key)).size, 12);
});

test("one refusal outranks any number of passes, and one open question outranks any margin", () => {
  assert.equal(verdictFrom([]), "exact");
  assert.equal(verdictFrom([{ state: "met" } as any, { state: "tolerance" } as any]), "possible");
  assert.equal(verdictFrom([{ state: "tolerance" } as any, { state: "unknown" } as any]), "needs_clarification");
  assert.equal(verdictFrom([{ state: "unknown" } as any, { state: "failed" } as any]), "no");
  // The whole point: a warehouse does not answer a brief for an office however
  // well it matches on size, budget and location.
  const r = matchListing(REQ, { ...LST, asset_type: "warehouse" }, NOW);
  assert.equal(r.verdict, "no");
  assert.equal(by(r, "asset_type")?.state, "failed");
});

test("a listing that may not be offered is excluded before anything is compared", () => {
  for (const status of ["draft", "withdrawn", "expired", "under_review"]) {
    const r = matchListing(REQ, { ...LST, status }, NOW);
    assert.equal(r.eligible, false, status);
    assert.equal(r.verdict, "no", status);
    assert.equal(r.exclusion?.kind, "not_published", status);
    assert.deepEqual(r.reasons, [], status);
  }
});

test("the demonstration boundary is never crossed in either direction", () => {
  assert.equal(matchExclusion(REQ, { ...LST, is_demo: true }, NOW)?.kind, "demo_boundary");
  assert.equal(matchExclusion({ ...REQ, is_demo: true }, LST, NOW)?.kind, "demo_boundary");
  // Demo facing demo is a legitimate pairing inside the demonstration set.
  assert.equal(matchExclusion({ ...REQ, is_demo: true }, { ...LST, is_demo: true }, NOW), null);
});

test("an advertisement whose licence has expired is not offered, and one with no licence is left to the publication gate", () => {
  assert.equal(matchExclusion(REQ, { ...LST, ad_permit_expires_at: "2026-07-01" }, NOW)?.kind, "permit_expired");
  assert.equal(matchExclusion(REQ, { ...LST, ad_permit_expires_at: null }, NOW), null);
  assert.equal(matchExclusion(REQ, { ...LST, ad_permit_expires_at: "not a date" }, NOW), null);
});

test("reason keys are unique within one result, so a surface can key a list by them", () => {
  const r = matchListing({ ...REQ, timeline: "ASAP", must_haves: ["a", "b", "c"] }, LST, NOW);
  assert.equal(new Set(r.reasons.map((x) => x.key)).size, r.reasons.length);
});

test("the counts on the result are the states on the reasons, never a separate opinion", () => {
  const r = matchListing(
    { ...REQ, timeline: "ASAP", must_haves: ["Dock doors"] },
    { ...LST, area_sqm: 840, asking_rent_sqm: 3000 },
    NOW,
  );
  const count = (s: string) => r.reasons.filter((x) => x.state === s).length;
  assert.equal(r.met, count("met"));
  assert.equal(r.tolerance, count("tolerance"));
  assert.equal(r.unknown, count("unknown"));
  assert.equal(r.failed, count("failed"));
  assert.equal(r.met + r.tolerance + r.unknown + r.failed, r.reasons.length);
});

test("every reason speaks both languages, in Western numerals, with no em dash", () => {
  const r = matchListing(
    { ...REQ, timeline: "ASAP", must_haves: ["Heavy power"] },
    { ...LST, area_sqm: 840, city: "jeddah", district_id: null },
    NOW,
  );
  const arabic = /[؀-ۿ]/;
  for (const reason of r.reasons) {
    for (const s of [reason.label_en, reason.reason_en]) {
      assert.ok(s.trim().length > 0, reason.key);
      assert.doesNotMatch(s, /\u2014/, reason.key);
    }
    for (const s of [reason.label_ar, reason.reason_ar, reason.remedy_ar ?? "شيء"]) {
      assert.ok(s.trim().length > 0, reason.key);
      assert.match(s, arabic, `${reason.key} must be written in Arabic`);
      assert.doesNotMatch(s, /[٠-٩]/, `${reason.key} must use Western numerals`);
      assert.doesNotMatch(s, /\u2014/, reason.key);
    }
  }
});

test("exclusions speak both languages too", () => {
  for (const l of [{ ...LST, status: "draft" }, { ...LST, is_demo: true }, { ...LST, ad_permit_expires_at: "2020-01-01" }]) {
    const e = matchExclusion(REQ, l, NOW);
    assert.ok(e);
    assert.ok(e!.reason_en.trim().length > 0);
    assert.match(e!.reason_ar, /[؀-ۿ]/);
  }
});

test("matches sort by verdict first, then by how much was actually met", () => {
  const mk = (verdict: any, met: number, unknown: number): MatchResult =>
    ({ eligible: true, verdict, exclusion: null, reasons: [], met, tolerance: 0, unknown, failed: 0 });
  const list = [mk("no", 9, 0), mk("needs_clarification", 3, 1), mk("exact", 2, 0), mk("possible", 5, 0), mk("possible", 7, 0)];
  const sorted = [...list].sort(compareMatches);
  assert.deepEqual(sorted.map((x) => x.verdict), ["exact", "possible", "possible", "needs_clarification", "no"]);
  assert.equal(sorted[1].met, 7);
  // Fewer open questions wins a tie on verdict and met count.
  assert.deepEqual([mk("possible", 4, 3), mk("possible", 4, 1)].sort(compareMatches).map((x) => x.unknown), [1, 3]);
});

test("the verdict word is the same word everywhere, in both languages", () => {
  for (const v of ["exact", "possible", "needs_clarification", "no"] as const) {
    assert.ok(verdictLabel(v, false).length > 0);
    assert.match(verdictLabel(v, true), /[؀-ۿ]/);
  }
  assert.notEqual(verdictLabel("exact", false), verdictLabel("possible", false));
});
