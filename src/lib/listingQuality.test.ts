import { test } from "node:test";
import assert from "node:assert/strict";
import {
  assessListing,
  contradictionsOf,
  scoreFromChecks,
  bandFrom,
  bandLabel,
  scopeLabel,
  weightLabel,
  missingChecks,
  PHOTO_SET_MIN,
  type ListingFacts,
  type QualityCheck,
  type ContradictionKind,
  type QualityBand,
  type CheckWeight,
  type QualityScope,
} from "./listingQuality";
import { ASSET_FIELDS } from "./assetFields";

const NOW = Date.parse("2026-07-28T00:00:00Z");

// A listing with every essential supplied and no contradiction, used as the base
// that each negative case perturbs by exactly one field.
function complete(): ListingFacts {
  return {
    asset_type: "office",
    deal_type: "lease",
    title_en: "Fitted floor in Olaya",
    title_ar: "دور مجهّز في العليا",
    description_en: "A fitted floor with its own reception.",
    description_ar: "دور مجهّز باستقبال خاص.",
    area_sqm: 500,
    asking_rent_sqm: 1400,
    lease_term_months: 60,
    break_option_months: 36,
    rent_free_months: 3,
    lat: 24.69,
    lng: 46.68,
    district_id: "d-olaya",
    building_id: "b-1",
    contact_phone: "0500000000",
    ad_permit_number: "1234567890",
    ad_permit_expires_at: "2027-01-01T00:00:00Z",
    right_to_market_confirmed: true,
    availability_confirmed_at: "2026-07-20T00:00:00Z",
    published_at: "2026-07-01T00:00:00Z",
    expires_at: "2026-10-01T00:00:00Z",
    floorplan_url: "https://example.com/plan.pdf",
    video_url: "https://youtu.be/abc",
    photo_count: 8,
    document_count: 2,
    // The three office fields that map to typed columns live on the row, exactly
    // as the composer and intakeValidation put them there.
    building_grade: "a",
    fitout_condition: "fitted",
    parking_ratio: "1 per 60 m2",
    attributes: {
      floor_level: 12,
      floor_plate_sqm: 900,
      floor_efficiency_pct: 82,
      ceiling_height_m: 3.1,
    },
  };
}

// The corpus as it actually stands: published, gated, and empty of everything a
// reader would want. Every one of the 88 published rows is shaped like this.
function corpusShaped(): ListingFacts {
  return {
    asset_type: "office",
    deal_type: "lease",
    title_en: "Office space",
    title_ar: "مساحة مكتبية",
    area_sqm: 420,
    asking_rent_sqm: 1200,
    district_id: "d-olaya",
    contact_phone: "0500000000",
    right_to_market_confirmed: true,
    availability_confirmed_at: "2026-07-10T00:00:00Z",
    published_at: "2026-07-01T00:00:00Z",
    expires_at: "2026-10-01T00:00:00Z",
    photo_count: 0,
    document_count: 0,
    attributes: {},
  };
}

test("the score is a pure function of the check list and nothing else", () => {
  for (const facts of [complete(), corpusShaped(), {} as ListingFacts]) {
    const q = assessListing(facts, NOW);
    assert.equal(q.score, scoreFromChecks(q.checks));
  }
  // Shuffling the checks cannot change the score, because it reads state and
  // weight only. A score that depended on anything outside the list would drift.
  const q = assessListing(complete(), NOW);
  const reversed = [...q.checks].reverse();
  assert.equal(scoreFromChecks(reversed), q.score);
});

test("no exported entry point produces a score without its checks", async () => {
  const mod = await import("./listingQuality");
  for (const [name, value] of Object.entries(mod)) {
    if (typeof value !== "function") continue;
    if (name === "scoreFromChecks") continue;   // takes the reasons as its argument
    if (name === "assessListing") continue;     // returns them alongside the score
    const out = (() => {
      try {
        return (value as (...a: unknown[]) => unknown)(complete(), NOW);
      } catch {
        return null;
      }
    })();
    assert.notEqual(typeof out, "number", `${name} returns a bare number`);
  }
});

test("check keys are unique, so no reason is counted twice", () => {
  const q = assessListing(complete(), NOW);
  const keys = q.checks.map((c) => c.key);
  assert.equal(new Set(keys).size, keys.length);
});

test("every check carries a label and a reason in both locales", () => {
  const seen = new Set<string>();
  for (const assetType of Object.keys(ASSET_FIELDS)) {
    const q = assessListing({ ...complete(), asset_type: assetType }, NOW);
    for (const c of q.checks) {
      if (seen.has(c.key)) continue;
      seen.add(c.key);
      for (const s of [c.label_en, c.label_ar, c.why_en, c.why_ar]) {
        assert.ok(s.trim().length > 0, `${c.key} has an empty string`);
        assert.ok(!/\u2014/.test(s), `${c.key} contains an em dash`);
        assert.ok(!/[٠-٩]/.test(s), `${c.key} contains eastern numerals`);
      }
      assert.notEqual(c.label_en, c.label_ar, `${c.key} label is not translated`);
      assert.notEqual(c.why_en, c.why_ar, `${c.key} reason is not translated`);
    }
  }
  assert.ok(seen.size > 100, "the sweep should cover the whole registry");
});

test("quality never speaks in the vocabulary of verification", () => {
  // D24: completeness says what a lister supplied. src/lib/listingVerification.ts
  // says what SAT checked against an outside authority. If a completeness label
  // could be read as the second, a reader would take an omission for a failed
  // check, or worse, a full listing for a checked one.
  const forbidden = /verif|موثّق/i;
  for (const assetType of Object.keys(ASSET_FIELDS)) {
    const q = assessListing({ ...complete(), asset_type: assetType }, NOW);
    for (const c of q.checks) {
      for (const s of [c.label_en, c.label_ar, c.why_en, c.why_ar]) {
        assert.ok(!forbidden.test(s), `${c.key}: ${s}`);
      }
    }
  }
  const bands: QualityBand[] = ["contradicted", "incomplete", "basic", "good", "strong"];
  const weights: CheckWeight[] = ["essential", "expected", "enriching"];
  const scopes: QualityScope[] = [
    "identity", "space", "commercial", "media", "location", "compliance", "contact",
  ];
  for (const ar of [false, true]) {
    for (const b of bands) assert.ok(!forbidden.test(bandLabel(b, ar)));
    for (const w of weights) assert.ok(!forbidden.test(weightLabel(w, ar)));
    for (const s of scopes) assert.ok(!forbidden.test(scopeLabel(s, ar)));
  }
});

test("an absent value is missing, never inferred as satisfied", () => {
  const q = assessListing({ asset_type: "office", deal_type: "lease" }, NOW);
  const byKey = new Map(q.checks.map((c) => [c.key, c]));
  for (const key of ["title_en", "title_ar", "area_sqm", "price", "photos", "coordinates",
    "ad_permit", "permit_expiry", "right_to_market", "contact"]) {
    assert.equal(byKey.get(key)?.state, "missing", key);
  }
  assert.equal(q.contradictions.length, 0, "an empty listing contradicts nothing");
  assert.equal(q.band, "incomplete");
  assert.equal(q.score, 0);
});

test("a tristate left unanswered reads as missing, not as a no", () => {
  // intakeValidation never stores "unknown", so the key is simply absent. The
  // point of this test is that nothing downstream turns that absence into a
  // negative answer about the space.
  const facts = complete();
  const ejar = assessListing(facts, NOW).checks.find((c) => c.key === "field:ejar_registered");
  assert.equal(ejar?.state, "missing");
  const withNo = assessListing(
    { ...facts, attributes: { ...(facts.attributes as object), ejar_registered: false } },
    NOW,
  ).checks.find((c) => c.key === "field:ejar_registered");
  assert.equal(withNo?.state, "present", "a stored answer of no is still an answer");
});

test("a field whose external source is not wired is not applicable, not missing", () => {
  const q = assessListing(complete(), NOW);
  const zoning = q.checks.find((c) => c.key === "field:zoning_balady");
  assert.equal(zoning?.state, "not_applicable");
  const retail = assessListing({ ...complete(), asset_type: "retail" }, NOW);
  for (const key of ["field:catchment_population", "field:footfall"]) {
    assert.equal(retail.checks.find((c) => c.key === key)?.state, "not_applicable", key);
  }
});

test("not applicable leaves the denominator, so it cannot lower a score", () => {
  const checks: QualityCheck[] = [
    { key: "a", scope: "space", weight: "essential", state: "present",
      label_en: "a", label_ar: "أ", why_en: "a", why_ar: "أ" },
    { key: "b", scope: "space", weight: "essential", state: "not_applicable",
      label_en: "b", label_ar: "ب", why_en: "b", why_ar: "ب" },
  ];
  assert.equal(scoreFromChecks(checks), 100);
  assert.equal(scoreFromChecks([checks[1]]), 0, "a list of only not applicable scores 0");
  assert.equal(scoreFromChecks([]), 0);
});

test("weights are ordered, so an essential omission costs more than an enriching one", () => {
  const base = (state: "present" | "missing", weight: CheckWeight): QualityCheck => ({
    key: `${weight}-${state}`, scope: "space", weight, state,
    label_en: "x", label_ar: "س", why_en: "x", why_ar: "س",
  });
  const withoutEssential = scoreFromChecks([
    base("missing", "essential"), base("present", "expected"), base("present", "enriching"),
  ]);
  const withoutEnriching = scoreFromChecks([
    base("present", "essential"), base("present", "expected"), base("missing", "enriching"),
  ]);
  assert.ok(withoutEssential < withoutEnriching);
});

test("the score stays inside 0 to 100 across the whole registry", () => {
  for (const assetType of Object.keys(ASSET_FIELDS)) {
    for (const facts of [complete(), corpusShaped(), {}]) {
      const q = assessListing({ ...facts, asset_type: assetType } as ListingFacts, NOW);
      assert.ok(q.score >= 0 && q.score <= 100, `${assetType} scored ${q.score}`);
      assert.ok(Number.isInteger(q.score));
    }
  }
});

test("a missing essential forces incomplete however high the rest scores", () => {
  const facts = { ...complete(), title_ar: null };
  const q = assessListing(facts, NOW);
  assert.deepEqual(q.missingEssential, ["title_ar"]);
  assert.equal(q.band, "incomplete");
  assert.ok(q.score > 65, "the rest of the listing is otherwise well filled");
});

test("a contradiction outranks incompleteness", () => {
  const facts = { ...complete(), title_ar: null, sale_price: 9000000 };
  const q = assessListing(facts, NOW);
  assert.ok(q.missingEssential.length > 0);
  assert.ok(q.contradictions.length > 0);
  assert.equal(q.band, "contradicted");
  assert.equal(bandFrom(100, [], q.contradictions), "contradicted");
});

test("band thresholds", () => {
  assert.equal(bandFrom(100, [], []), "strong");
  assert.equal(bandFrom(85, [], []), "strong");
  assert.equal(bandFrom(84, [], []), "good");
  assert.equal(bandFrom(65, [], []), "good");
  assert.equal(bandFrom(64, [], []), "basic");
  assert.equal(bandFrom(0, [], []), "basic");
});

test("the corpus as it stands reads incomplete with nothing contradicted", () => {
  const q = assessListing(corpusShaped(), NOW);
  assert.equal(q.contradictions.length, 0);
  assert.equal(q.band, "incomplete");
  for (const key of ["photos", "coordinates", "ad_permit", "permit_expiry"]) {
    assert.ok(q.missingEssential.includes(key), key);
  }
  const missing = missingChecks(q).map((c) => c.key);
  assert.deepEqual(
    missing.slice(0, q.missingEssential.length),
    q.missingEssential,
    "essentials are listed first, in check order",
  );
  assert.ok(missing.includes("description_en") && missing.includes("description_ar"));
});

// ADV-3A.1, finding 52. A contradiction statement is shown to the lister as the
// reason their listing is held back, so it is read closely and its own grammar
// is part of whether it is believed. `عند` and `البالغة` both govern what
// follows, so every counted phrase here is oblique.
test("contradiction statements count their months correctly in both languages", () => {
  const of = (facts: ListingFacts, kind: ContradictionKind) =>
    contradictionsOf(facts, NOW).find((c) => c.kind === kind)!;

  const brk = (term: number, b: number) =>
    of({ ...complete(), lease_term_months: term, break_option_months: b }, "break_after_lease_term");
  assert.match(brk(1, 2).statement_ar, /عند شهرين يقع بعد مدة العقد البالغة شهر واحد/);
  assert.match(brk(2, 3).statement_ar, /عند 3 أشهر يقع بعد مدة العقد البالغة شهرين/);
  assert.match(brk(24, 36).statement_ar, /عند 36 شهراً يقع بعد مدة العقد البالغة 24 شهراً/);
  assert.match(brk(1, 2).statement_en, /break option at 2 months falls after the lease term of 1 month\./);

  const free = (term: number, f: number) =>
    of({ ...complete(), lease_term_months: term, rent_free_months: f, break_option_months: null }, "rent_free_over_lease_term");
  assert.match(free(1, 2).statement_ar, /البالغة شهرين أطول من مدة العقد البالغة شهر واحد/);
  assert.match(free(2, 3).statement_ar, /البالغة 3 أشهر أطول من مدة العقد البالغة شهرين/);
  assert.match(free(1, 2).statement_en, /rent free period of 2 months is longer than the lease term of 1 month\./);
  assert.match(free(2, 3).statement_en, /rent free period of 3 months is longer than the lease term of 2 months\./);

  for (const st of [brk(1, 2).statement_ar, brk(2, 3).statement_ar, free(1, 2).statement_ar, free(2, 3).statement_ar]) {
    assert.ok(!/شهران/.test(st), "a governed dual is oblique, never nominative");
  }
});

test("each contradiction kind fires on its own case and on nothing else", () => {
  const cases: Array<[ContradictionKind, ListingFacts]> = [
    ["rent_total_vs_rate", { ...complete(), area_sqm: 500, asking_rent_sqm: 1400, asking_rent_total: 500000 }],
    ["sale_price_vs_rate", { ...complete(), deal_type: "sale", asking_rent_sqm: null, area_sqm: 500, sale_price: 10000000, sale_price_sqm: 30000 }],
    ["lease_with_sale_price", { ...complete(), sale_price: 9000000 }],
    ["sale_with_rent", { ...complete(), deal_type: "sale" }],
    ["break_after_lease_term", { ...complete(), lease_term_months: 24, break_option_months: 36 }],
    ["rent_free_over_lease_term", { ...complete(), lease_term_months: 2, rent_free_months: 3, break_option_months: null }],
    ["expiry_before_publication", { ...complete(), expires_at: "2026-06-01T00:00:00Z" }],
    ["permit_expired_while_published", { ...complete(), ad_permit_expires_at: "2026-01-01T00:00:00Z" }],
    ["mezzanine_over_area", { ...complete(), asset_type: "warehouse", attributes: { mezzanine_gla_sqm: 900 } }],
    ["value_outside_declared_range", { ...complete(), attributes: { floor_efficiency_pct: 140 } }],
  ];
  for (const [kind, facts] of cases) {
    const kinds = contradictionsOf(facts, NOW).map((c) => c.kind);
    assert.ok(kinds.includes(kind), `${kind} did not fire`);
  }
  assert.deepEqual(contradictionsOf(complete(), NOW), []);
  assert.deepEqual(contradictionsOf(corpusShaped(), NOW), []);
  assert.deepEqual(contradictionsOf({}, NOW), []);
});

test("a rate and a total that agree within tolerance are not reported", () => {
  const exact = { ...complete(), area_sqm: 500, asking_rent_sqm: 1400, asking_rent_total: 700000 };
  assert.deepEqual(contradictionsOf(exact, NOW), []);
  const withinTolerance = { ...exact, asking_rent_total: 707000 };   // 1 percent out
  assert.deepEqual(contradictionsOf(withinTolerance, NOW), []);
  const outside = { ...exact, asking_rent_total: 740000 };           // 5.7 percent out
  assert.equal(contradictionsOf(outside, NOW).length, 1);
});

test("every contradiction states itself in both locales and names its fields", () => {
  const facts: ListingFacts = {
    ...complete(),
    deal_type: "sale",
    area_sqm: 500,
    sale_price: 10000000,
    sale_price_sqm: 30000,
    expires_at: "2026-06-01T00:00:00Z",
    ad_permit_expires_at: "2026-01-01T00:00:00Z",
    attributes: { floor_efficiency_pct: 140 },
  };
  const found = contradictionsOf(facts, NOW);
  assert.ok(found.length >= 4);
  for (const c of found) {
    assert.ok(c.fields.length > 0, c.kind);
    assert.ok(c.statement_en.trim().length > 0 && c.statement_ar.trim().length > 0, c.kind);
    assert.notEqual(c.statement_en, c.statement_ar, c.kind);
    for (const s of [c.statement_en, c.statement_ar]) {
      assert.ok(!/\u2014/.test(s), `${c.kind} contains an em dash`);
      assert.ok(!/[٠-٩]/.test(s), `${c.kind} contains eastern numerals`);
    }
  }
});

test("a contradiction never guesses which of the two values is right", () => {
  // The shape of the statement is the guarantee: it names both figures and says
  // they cannot both hold. Correcting one of them is a contributor action, not a
  // reading, so nothing here proposes a replacement value.
  const facts = { ...complete(), area_sqm: 500, asking_rent_sqm: 1400, asking_rent_total: 900000 };
  const [c] = contradictionsOf(facts, NOW);
  assert.equal(c.kind, "rent_total_vs_rate");
  assert.deepEqual(c.fields, ["asking_rent_total", "asking_rent_sqm", "area_sqm"]);
  assert.ok(/900000/.test(c.statement_en) && /1400/.test(c.statement_en));
  assert.ok(!/should be|correct value|replace/i.test(c.statement_en));
});

test("deal type decides which price shape applies", () => {
  const lease = assessListing({ ...complete(), asking_rent_sqm: null }, NOW);
  assert.equal(lease.checks.find((c) => c.key === "price")?.state, "missing");
  assert.equal(lease.checks.find((c) => c.key === "price")?.label_en, "Asking rent");

  const sale = assessListing(
    { ...complete(), deal_type: "sale", asking_rent_sqm: null, sale_price: 9000000 }, NOW);
  assert.equal(sale.checks.find((c) => c.key === "price")?.state, "present");
  assert.equal(sale.checks.find((c) => c.key === "price")?.label_en, "Asking price");
  assert.deepEqual(sale.contradictions, []);
});

test("registry weight is read from the registry, never guessed", () => {
  const q = assessListing(complete(), NOW);
  const byKey = new Map(q.checks.map((c) => [c.key, c]));
  for (const field of ASSET_FIELDS.office) {
    if (field.key === "asking_rent_sqm" || field.key === "sale_price") {
      assert.equal(byKey.has(`field:${field.key}`), false, "the price check owns this key");
      continue;
    }
    const c = byKey.get(`field:${field.key}`);
    assert.ok(c, field.key);
    const expected: CheckWeight = field.required
      ? "essential"
      : field.filterable ? "expected" : "enriching";
    assert.equal(c.weight, expected, field.key);
  }
});

test("a registry field that maps to a typed column reads the column", () => {
  // building_grade lives on the listings table, not in attributes. Reading only
  // the jsonb would report a filled column as missing.
  const facts: ListingFacts = { ...complete(), attributes: {}, building_grade: "a" };
  const c = assessListing(facts, NOW).checks.find((x) => x.key === "field:building_grade");
  assert.equal(c?.state, "present");
});

test("an asset type with no registry produces platform checks only, and no throw", () => {
  const q = assessListing({ ...complete(), asset_type: "chalet" }, NOW);
  assert.equal(q.checks.filter((c) => c.key.startsWith("field:")).length, 0);
  assert.ok(q.checks.length > 0);
  assert.equal(q.checks.find((c) => c.key === "title_en")?.state, "present");
  const none = assessListing({ ...complete(), asset_type: null }, NOW);
  assert.equal(none.checks.filter((c) => c.key.startsWith("field:")).length, 0);
});

test("the photograph set threshold is stated, not implied", () => {
  const facts = { ...complete(), photo_count: PHOTO_SET_MIN - 1 };
  const q = assessListing(facts, NOW);
  assert.equal(q.checks.find((c) => c.key === "photos")?.state, "present");
  assert.equal(q.checks.find((c) => c.key === "photo_set")?.state, "missing");
  const met = assessListing({ ...facts, photo_count: PHOTO_SET_MIN }, NOW);
  assert.equal(met.checks.find((c) => c.key === "photo_set")?.state, "present");
});

test("an expired licence is present as a fact and reported as a contradiction", () => {
  const facts = { ...complete(), ad_permit_expires_at: "2026-01-01T00:00:00Z" };
  const q = assessListing(facts, NOW);
  assert.equal(q.checks.find((c) => c.key === "permit_expiry")?.state, "present");
  assert.ok(q.contradictions.some((c) => c.kind === "permit_expired_while_published"));
  assert.equal(q.band, "contradicted");
});

test("an unpublished listing is not marked down for a licence date in the past", () => {
  const facts = { ...complete(), published_at: null, ad_permit_expires_at: "2026-01-01T00:00:00Z" };
  assert.deepEqual(contradictionsOf(facts, NOW), []);
});

test("unreadable dates and numbers are ignored rather than assumed", () => {
  const facts: ListingFacts = {
    ...complete(),
    availability_confirmed_at: "not a date",
    ad_permit_expires_at: "soon",
    area_sqm: Number.NaN,
  };
  const q = assessListing(facts, NOW);
  assert.equal(q.checks.find((c) => c.key === "availability_confirmed")?.state, "missing");
  assert.equal(q.checks.find((c) => c.key === "permit_expiry")?.state, "missing");
  assert.equal(q.checks.find((c) => c.key === "area_sqm")?.state, "missing");
  assert.deepEqual(q.contradictions, []);
});

test("a fully supplied listing reads strong with no essential missing", () => {
  const facts = complete();
  const office = ASSET_FIELDS.office;
  const attributes: Record<string, unknown> = { ...(facts.attributes as object) };
  for (const f of office) {
    if (f.column || f.available === false) continue;
    if (attributes[f.key] !== undefined) continue;
    attributes[f.key] = f.type === "boolean" ? true
      : f.type === "number" || f.type === "integer" || f.type === "money" ? 1
      : f.type === "enum" ? Object.keys(f.options ?? { x: ["x", "x"] })[0]
      : "stated";
  }
  const filled: ListingFacts = {
    ...facts, attributes,
    building_grade: "a", fitout_condition: "fitted", parking_ratio: "1 per 60 m2",
  };
  const q = assessListing(filled, NOW);
  assert.deepEqual(q.missingEssential, []);
  assert.deepEqual(q.contradictions, []);
  assert.equal(q.band, "strong");
});

// PKG-LS3. A floor plan can arrive as a link in the column or as a listing_media
// row of kind "floorplan". The check read only the column, so a lister who
// uploaded a plan through the docs panel was told it was missing while the page
// above them displayed it.
test("a floor plan uploaded as media satisfies the floor plan check", () => {
  const state = (f: ListingFacts) =>
    assessListing(f, NOW).checks.find((c) => c.key === "floorplan")?.state;

  const noColumn: ListingFacts = { ...complete(), floorplan_url: null };
  assert.equal(state({ ...noColumn, floorplan_count: 1 }), "present");
  assert.equal(state({ ...noColumn, floorplan_count: 3 }), "present");
});

test("neither a link nor an uploaded plan still reads missing", () => {
  const state = (f: ListingFacts) =>
    assessListing(f, NOW).checks.find((c) => c.key === "floorplan")?.state;

  const base: ListingFacts = { ...complete(), floorplan_url: null };
  assert.equal(state(base), "missing");
  assert.equal(state({ ...base, floorplan_count: 0 }), "missing");
  assert.equal(state({ ...base, floorplan_count: null }), "missing");
  // A caller that cannot supply the count leaves it undefined and the check
  // falls back to the column alone rather than assuming either way.
  assert.equal(state({ ...base, floorplan_count: undefined }), "missing");
  // The column on its own is unchanged by any of this.
  assert.equal(state({ ...complete(), floorplan_count: 0 }), "present");
});
