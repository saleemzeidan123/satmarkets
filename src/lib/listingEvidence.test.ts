import { test } from "node:test";
import assert from "node:assert/strict";
import {
  type EvidenceListing,
  LISTING_EVIDENCE_FIELDS,
  listingEvidenceByField,
  listingEvidenceViews,
  listingPassports,
} from "@/lib/listingEvidence";
import { LISTING_DIMENSIONS } from "@/lib/listingVerification";
import { availabilityOf } from "@/lib/availability";
import { formatArea, formatMoney, formatWithUnit } from "@/lib/format";

// ADV-1C, Codex boundary 3. The producer is only worth what it produces, so this
// file tests the passports a REAL row makes rather than the shape of the type.
//
// The three questions it exists to answer:
//
//   1. Does a listing row actually reach a passport, field by field, with the
//      same string the tile beside it will render.
//   2. Does the passport claim anything the record does not support. A lister's
//      figure must stay `entered`, SAT's arithmetic must stay `computed`, and the
//      four filing checks must never read as a check on a number.
//   3. Do the two freshness signals on one page agree. The availability line and
//      the passport read the same column and must turn stale on the same day, or
//      the page tells a reader two things about one filing.

const NOW = Date.parse("2026-07-31T00:00:00Z");
const iso = (daysAgo: number) => new Date(NOW - daysAgo * 86_400_000).toISOString();

/** A demo row, because every published row in the corpus is one. Finding 3, D31. */
function lease(over: Partial<EvidenceListing> = {}): EvidenceListing {
  return {
    id: "l-1",
    asset_type: "office",
    deal_type: "lease",
    area_sqm: 640,
    asking_rent_sqm: 1450,
    service_charge_sqm: 180,
    availability_confirmed_at: iso(10),
    is_demo: true,
    ownership_verified: true,
    authorization_verified: true,
    verification_method: "seed",
    verified_at: iso(30),
    verified_by: null,
    lister_type: "owner_direct",
    ...over,
  };
}

function sale(over: Partial<EvidenceListing> = {}): EvidenceListing {
  return lease({
    deal_type: "sale",
    asking_rent_sqm: null,
    service_charge_sqm: null,
    sale_price: 9_600_000,
    ...over,
  });
}

const opts = { locale: "en" as const, geography: "Riyadh, Olaya", now: NOW };

test("a lease row reaches a passport for every figure it holds, and none for the ones it does not", () => {
  const p = listingPassports(lease(), opts);
  assert.deepEqual(
    p.map((x) => x.field),
    ["area_sqm", "asking_rent_sqm", "service_charge_sqm"],
  );

  // Absence is not a passport. A passport for a column the row does not hold
  // would render as `empty`, which is true but answers a question the page never
  // asked, and it is how an evidence panel becomes longer than the facts.
  const bare = listingPassports(lease({ service_charge_sqm: null, asking_rent_sqm: "" }), opts);
  assert.deepEqual(bare.map((x) => x.field), ["area_sqm"]);
  assert.deepEqual(listingPassports(lease({ area_sqm: null, asking_rent_sqm: null, service_charge_sqm: null }), opts), []);
});

test("the passport carries the same string the tile renders, from the same table", () => {
  // If these ever diverge the page shows one number and its evidence shows
  // another, which is worse than showing no evidence at all.
  const by = new Map(listingPassports(lease(), opts).map((p) => [p.field, p]));
  assert.equal(by.get("area_sqm")!.value, formatArea(640, "en"));
  assert.equal(by.get("asking_rent_sqm")!.value, formatWithUnit(1450, "sar_sqm_year", "en", "short", 0));
  assert.equal(by.get("service_charge_sqm")!.value, formatWithUnit(180, "sar_sqm_year", "en", "short", 0));

  const s = new Map(listingPassports(sale(), opts).map((p) => [p.field, p]));
  assert.equal(s.get("sale_price")!.value, formatMoney(9_600_000, "en"));
});

test("a lister's figure stays entered and consults no licence", () => {
  // Boundary 6 and owner ruling 7 together. Nothing on this page is someone
  // else's data, so nothing on this page may reach for someone else's licence,
  // and nothing may claim a check SAT did not perform.
  for (const p of [...listingPassports(lease(), opts), ...listingPassports(sale(), opts)]) {
    assert.notEqual(p.tier, "sourced", `${p.field} claims a source it does not have`);
    assert.equal(p.sourceId, undefined, `${p.field} carries a source id`);
    assert.notEqual(p.tier, "verified", `${p.field} claims SAT checked the number`);
    assert.equal(p.statistic, "single");
    assert.equal(p.subjectKind, "listing");
    assert.equal(p.subjectId, "l-1");
    assert.equal(p.assetType, "office");
  }
});

test("price per square metre is computed and derived, never entered", () => {
  const p = listingPassports(sale(), opts).find((x) => x.field === "sale_price_sqm");
  assert.ok(p, "a sale row with a price and an area must carry the derived figure");
  assert.equal(p!.tier, "computed");
  assert.equal(p!.transformation, "derived");
  assert.equal(p!.value, formatWithUnit(Math.round(9_600_000 / 640), "sar_sqm", "en", "short", 0));

  // The stored column is the same arithmetic on the same two numbers, so it is
  // still SAT's figure. Reporting it as entered would credit the lister with a
  // number they never filed.
  const stored = listingPassports(sale({ sale_price_sqm: 14_000 }), opts).find((x) => x.field === "sale_price_sqm");
  assert.equal(stored!.tier, "computed");
  assert.equal(stored!.transformation, "derived");
  assert.equal(stored!.value, formatWithUnit(14_000, "sar_sqm", "en", "short", 0));
});

test("a price with nothing to divide by produces no figure rather than a wrong one", () => {
  for (const row of [sale({ area_sqm: null }), sale({ area_sqm: 0 }), sale({ sale_price: null })]) {
    const p = listingPassports(row, opts).find((x) => x.field === "sale_price_sqm");
    assert.equal(p, undefined);
  }
});

test("a lease row never carries a sale figure and a sale row never carries a rent", () => {
  // The deal type decides, not the presence of a column. A row that holds both
  // is a data error, and publishing both would present the error as two facts.
  const l = listingPassports(lease({ sale_price: 9_600_000, sale_price_sqm: 14_000 }), opts).map((x) => x.field);
  assert.ok(!l.includes("sale_price") && !l.includes("sale_price_sqm"));
  const s = listingPassports(sale({ asking_rent_sqm: 1450, service_charge_sqm: 180 }), opts).map((x) => x.field);
  assert.ok(!s.includes("asking_rent_sqm") && !s.includes("service_charge_sqm"));
});

test("the verification scope names the filing questions and claims nothing about the number", () => {
  // Finding 24 is what a collapsed badge costs. Each dimension here names itself
  // precisely, and not one of them is a statement that anyone checked the figure.
  const p = listingPassports(lease(), opts)[0];
  const dims = (p.verification ?? []).map((r) => r.dimension);
  assert.deepEqual([...dims].sort(), [...LISTING_DIMENSIONS].sort());
  assert.ok(!dims.some((d) => /rent|price|area|value/.test(d)));
});

test("no published row today carries a verified dimension, and the record is why", () => {
  // Owner ruling 3 and finding 3: the corpus is a fixture loader's output. This
  // is asserted from the columns rather than trusted, so a future migration that
  // sets a flag without a check cannot quietly turn a tick on.
  const views = listingEvidenceViews(lease(), opts);
  for (const v of views) {
    assert.ok(v.verification.length > 0, "the filing checks must travel with the figure");
    assert.ok(!v.verification.some((r) => r.state === "verified"), "a seeded demo row must not read as verified");
  }
  // And the shape is not hard-coded to fail: a row that satisfies every one of
  // the four independent conditions does resolve.
  const real = lease({
    is_demo: false,
    verification_method: "nafath",
    verified_at: iso(5),
    verified_by: "sat-1",
    right_to_market_confirmed: true,
  });
  const good = listingEvidenceViews(real, opts)[0];
  assert.ok(good.verification.some((r) => r.state === "verified"), "a fully checked row must be able to resolve verified");
});

test("the passport and the availability line turn stale on the same day", () => {
  // Two freshness signals on one screen that disagree about one filing is the
  // defect this shares a constant to prevent.
  const rent = (days: number) =>
    listingEvidenceViews(lease({ availability_confirmed_at: iso(days) }), opts).find((v) => v.field === "asking_rent_sqm")!;

  assert.equal(availabilityOf(iso(30), NOW)!.state !== "stale", true);
  assert.notEqual(rent(30).freshness, "stale");

  assert.equal(availabilityOf(iso(90), NOW)!.state, "stale");
  assert.equal(rent(90).freshness, "stale");
  assert.ok(rent(90).states.includes("stale"));
  // Stale is shown with its date rather than withdrawn. Codex boundary 10.
  assert.ok(rent(90).value);
  assert.equal(rent(90).asOf, iso(90));
});

test("a stated area does not age, because it does not decay on a clock", () => {
  const old = listingEvidenceViews(lease({ availability_confirmed_at: iso(4000) }), opts).find((v) => v.field === "area_sqm")!;
  assert.equal(old.freshness, "unknown");
  assert.ok(!old.states.includes("stale"));
});

test("ADV-1C.1: a lister figure is shown as supplied, because nothing here checks a number", () => {
  // This test used to assert `held`, and `held` was wrong. Every verification
  // record a listing carries is a check on the FILING: who owns it, who is
  // authorised, whether there is a right to market, whether the advertisement is
  // permitted. None of them is a measurement of an area or a document
  // evidencing a rent. Codex correction 5 requires "supplied but not
  // independently verified" to be its own reading, and on a listing today that
  // is what every entered figure is.
  const v = listingEvidenceViews(lease(), opts).find((x) => x.field === "asking_rent_sqm")!;
  assert.deepEqual(v.states, ["unverified"]);
  assert.equal(v.value, formatWithUnit(1450, "sar_sqm_year", "en", "short", 0), "the figure is still shown");

  const area = listingEvidenceViews(lease(), opts).find((x) => x.field === "area_sqm")!;
  assert.ok(area.states.includes("unverified"));

  // And the filing checks are still carried, so the page can state them where
  // they belong. Qualifying the number did not cost the reader the other record.
  assert.ok(v.verification.length > 0, "the filing checks stopped travelling with the figure");
  assert.equal(
    v.verification.some((r) => r.dimension === "measurement" || r.dimension === "document"),
    false,
    "a listing now carries a check on the value itself, so this test is measuring the wrong thing",
  );
});

test("a computed figure says so in its state, every time", () => {
  const v = listingEvidenceViews(sale(), opts).find((x) => x.field === "sale_price_sqm")!;
  assert.ok(v.states.includes("derived"));
  assert.equal(v.state, "derived");
});

test("no listing view names a source, because no listing figure has one", () => {
  // The counterpart to the leak test in evidenceView.test.ts, at the surface
  // rather than at the type. A source block on a first-party figure would be an
  // attribution to a body that published nothing.
  for (const row of [lease(), sale()]) {
    for (const v of listingEvidenceViews(row, opts)) {
      assert.equal(v.source, null, `${v.field} names a source`);
      assert.equal(v.permissions.display, "public");
      // The recorded gap, stated as a gap: no clause covers bulk export of a
      // lister's own figures or their use as model input.
      assert.equal(v.permissions.export, "unknown");
      assert.equal(v.permissions.aiUse, "unknown");
    }
  }
});

test("the Arabic reading changes the figure and nothing about the judgement", () => {
  const en = listingEvidenceViews(sale(), opts);
  const ar = listingEvidenceViews(sale(), { ...opts, locale: "ar" });
  assert.deepEqual(ar.map((v) => v.field), en.map((v) => v.field));
  for (let i = 0; i < en.length; i++) {
    assert.deepEqual(ar[i].states, en[i].states);
    assert.equal(ar[i].tier, en[i].tier);
    assert.equal(ar[i].unit, en[i].unit);
    // Western numerals in both locales, Law 7, and no Latin unit on the Arabic
    // page. The area unit is م² in Arabic, so a bare "m²" would be the defect.
    assert.ok(!/[٠-٩]/.test(ar[i].value!), `${ar[i].field} carries Arabic-Indic digits`);
    assert.ok(!/[\u2014\u2013]/.test(ar[i].value!));
    assert.ok(/[؀-ۿ]/.test(ar[i].value!), `${ar[i].field} has no Arabic unit on the Arabic page`);
  }
});

test("the geography and asset type the caller resolved are the ones the view carries", () => {
  const v = listingEvidenceViews(lease(), opts)[0];
  assert.equal(v.geography, "Riyadh, Olaya");
  assert.equal(v.assetType, "office");
  assert.equal(v.subjectKind, "listing");
  // A listing figure describes a present state, not a reporting period.
  assert.equal(v.period, null);
});

test("every declared field is reachable, and the map is keyed by the column name", () => {
  // A field name nothing can produce is a name in a list, which is the failure
  // Codex boundary 7 names: a producer with no consumer, stated the other way up.
  const produced = new Set([
    ...listingPassports(lease(), opts).map((p) => p.field),
    ...listingPassports(sale(), opts).map((p) => p.field),
  ]);
  for (const f of LISTING_EVIDENCE_FIELDS) {
    assert.ok(produced.has(f), `${f} is declared but no row can produce it`);
  }
  const m = listingEvidenceByField(lease(), opts);
  assert.equal(m.get("asking_rent_sqm")!.field, "asking_rent_sqm");
  assert.equal(m.get("sale_price"), undefined);
});
