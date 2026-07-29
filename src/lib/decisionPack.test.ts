import test from "node:test";
import assert from "node:assert/strict";
import {
  comparabilityLabel,
  comparabilityOf,
  decisionPack,
  effectiveRentSqm,
  packAsks,
  packCandidate,
  packDimensions,
  permitNumberOf,
  readinessFrom,
  readinessLabel,
  stateLabel,
  type PackDimension,
  type PackDimensionKind,
  type PackListing,
} from "./decisionPack";

const NOW = Date.parse("2026-07-18T00:00:00Z");
const daysAgo = (d: number) => new Date(NOW - d * 86400000).toISOString();
const daysAhead = (d: number) => new Date(NOW + d * 86400000).toISOString();

// A lease record with every dimension stated. Individual tests take this apart
// one field at a time, which is the only way to see what each absence does.
const FULL: PackListing = {
  id: "L1",
  deal_type: "lease",
  area_sqm: 600,
  asking_rent_sqm: 1800,
  service_charge_sqm: 150,
  vat_treatment: "exclusive",
  rent_free_months: 3,
  fitout_contribution: 180000,
  lease_term_months: 36,
  break_option_months: 24,
  fitout_condition: "fitted",
  availability_confirmed_at: daysAgo(3),
  ad_permit_number: "7200012345",
  ad_permit_expires_at: daysAhead(200),
  ownership_verified: true,
};

const of = (l: PackListing, kind: PackDimensionKind, now: number = NOW): PackDimension => {
  const d = packDimensions(l, now).find((x) => x.kind === kind);
  assert.ok(d, `expected a ${kind} dimension`);
  return d as PackDimension;
};

test("every dimension kind is emitted exactly once, for a lease and for a sale", () => {
  for (const l of [FULL, { ...FULL, deal_type: "sale" }]) {
    const dims = packDimensions(l, NOW);
    const kinds = dims.map((d) => d.kind);
    assert.equal(kinds.length, new Set(kinds).size, "no dimension may be emitted twice");
    for (const k of ["price", "size", "availability", "authority", "permit", "service_charge", "vat", "incentives", "tenure", "fitout"]) {
      assert.ok(kinds.includes(k as PackDimensionKind), `${k} missing for ${l.deal_type}`);
    }
  }
});

// An absent figure is never a zero. This is the rule the whole model rests on.
test("an absent rent free period never becomes zero months", () => {
  const l: PackListing = { ...FULL, rent_free_months: null, fitout_contribution: null };
  const d = of(l, "incentives");
  assert.equal(d.state, "unknown");
  assert.ok(!/\b0\b/.test(d.detail_en), "the sentence must not print a zero");
  assert.ok(d.ask_en && d.ask_ar);
  // And nothing downstream may quietly supply the missing input.
  assert.equal(effectiveRentSqm(l), null);
});

test("a stated incentive names the half of the pair that is still missing", () => {
  const noFree = of({ ...FULL, rent_free_months: null }, "incentives");
  assert.equal(noFree.state, "stated");
  assert.match(noFree.detail_en, /No rent free period is recorded\./);
  const noContribution = of({ ...FULL, fitout_contribution: null }, "incentives");
  assert.equal(noContribution.state, "stated");
  assert.match(noContribution.detail_en, /No fit out contribution is recorded\./);
});

// ADV-3A.1, finding 52. The pack is the surface where a counted noun is most
// visible and least forgiving: a decision pack that reads "قبل 3 يوماً" is
// arguing for its own carelessness while asking a tenant to trust its figures.
//
// These assert the RENDERED sentence, not the formatter. The formatter is
// already tested in format.test.ts; what can still go wrong here is a site that
// was missed, or one where the wrong position was chosen and the dual comes out
// nominative after a preposition.
test("the pack counts days and months the way Arabic counts them, at every boundary", () => {
  const days = (n: number) => of({ ...FULL, availability_confirmed_at: daysAgo(n) }, "availability");
  assert.match(days(1).detail_ar, /قبل يوم واحد/);
  assert.match(days(2).detail_ar, /قبل يومين/);
  assert.match(days(3).detail_ar, /قبل 3 أيام/);
  assert.match(days(10).detail_ar, /قبل 10 أيام/);
  assert.match(days(11).detail_ar, /قبل 11 يوماً/);
  assert.match(days(99).detail_ar, /قبل 99 يوماً/);
  assert.match(days(100).detail_ar, /قبل 100 يوم/);
  for (const n of [1, 2, 3, 10, 11, 99, 100]) {
    assert.ok(!/يومان/.test(days(n).detail_ar), `${n}: the dual after قبل is oblique`);
  }
  assert.match(days(1).detail_en, /1 day ago/);
  assert.match(days(3).detail_en, /3 days ago/);
});

test("the lease term and the break option agree with their numbers in both languages", () => {
  const t = (term: number, brk: number | null) => of({ ...FULL, lease_term_months: term, break_option_months: brk }, "tenure");
  assert.match(t(2, null).detail_ar, /^شهران،/, "a term opening its own sentence is nominative");
  assert.match(t(3, null).detail_ar, /^3 أشهر،/);
  assert.match(t(36, null).detail_ar, /^36 شهراً،/);
  assert.match(t(36, 2).detail_ar, /عند شهرين\./, "after عند the dual is oblique");
  assert.match(t(36, 3).detail_ar, /عند 3 أشهر\./);
  assert.match(t(36, 24).detail_ar, /عند 24 شهراً\./);
  assert.match(t(1, null).detail_en, /^1 month, stated by the lister\./);
  assert.match(t(36, 1).detail_en, /A break option is stated at 1 month\./);
  assert.match(t(36, 24).detail_en, /A break option is stated at 24 months\./);
});

test("a rent free period is counted, not concatenated, in both languages", () => {
  const inc = (free: number) => of({ ...FULL, rent_free_months: free }, "incentives");
  assert.match(inc(1).detail_en, /1 rent free month\b/, "one month is not months");
  assert.match(inc(2).detail_en, /2 rent free months/);
  assert.match(inc(1).detail_ar, /شهر واحد بلا إيجار/);
  assert.match(inc(2).detail_ar, /شهران بلا إيجار/);
  assert.match(inc(3).detail_ar, /3 أشهر بلا إيجار/);
  assert.match(inc(12).detail_ar, /12 شهراً بلا إيجار/);

  // And the same phrase inside the effective rent basis, where the term that
  // follows it IS governed and so takes the oblique dual.
  const basis = (free: number, term: number) => effectiveRentSqm({ ...FULL, rent_free_months: free, lease_term_months: term });
  assert.match(String(basis(3, 36)?.basis_ar), /3 أشهر بلا إيجار ضمن مدة 36 شهراً/);
  assert.match(String(basis(2, 24)?.basis_ar), /شهران بلا إيجار ضمن مدة 24 شهراً/);
  assert.match(String(basis(1, 2)?.basis_ar), /شهر واحد بلا إيجار ضمن مدة شهرين/);
  assert.match(String(basis(1, 36)?.basis_en), /1 rent free month over a 36 month term/);
});

test("incentives and tenure do not arise on a purchase", () => {
  const sale: PackListing = { ...FULL, deal_type: "sale", sale_price: 42000000, sale_price_sqm: 70000 };
  assert.equal(of(sale, "incentives").state, "not_applicable");
  assert.equal(of(sale, "tenure").state, "not_applicable");
  // A not_applicable dimension carries no ask: there is nothing to chase.
  assert.equal(of(sale, "incentives").ask_en, undefined);
});

test("effective rent is computed only when every input is on the record", () => {
  // 1800 over a 36 month term with 3 free months, less 180000 spread over 3 years
  // across 600 sqm: 1800 * 33/36 = 1650, minus 180000/600/3 = 100, so 1550.
  const e = effectiveRentSqm(FULL);
  assert.ok(e);
  assert.equal(e?.value, 1550);
  assert.match(String(e?.basis_en), /less the stated fit out contribution/);

  // Without a contribution the figure is the paid share alone, and the basis says so.
  const noContribution = effectiveRentSqm({ ...FULL, fitout_contribution: null });
  assert.equal(noContribution?.value, 1650);
  assert.ok(!/contribution/.test(String(noContribution?.basis_en)));

  // A contribution with no area cannot be turned into a rate, so it is dropped
  // rather than guessed at, and the basis stops claiming it.
  const noArea = effectiveRentSqm({ ...FULL, area_sqm: null });
  assert.equal(noArea?.value, 1650);
  assert.ok(!/contribution/.test(String(noArea?.basis_en)));

  // Any missing essential input returns null rather than a default.
  assert.equal(effectiveRentSqm({ ...FULL, asking_rent_sqm: null }), null);
  assert.equal(effectiveRentSqm({ ...FULL, lease_term_months: null }), null);
  assert.equal(effectiveRentSqm({ ...FULL, rent_free_months: null }), null);
  assert.equal(effectiveRentSqm({ ...FULL, lease_term_months: 0 }), null);
  assert.equal(effectiveRentSqm({ ...FULL, rent_free_months: 36 }), null, "free months may not equal the term");
  assert.equal(effectiveRentSqm({ ...FULL, rent_free_months: -1 }), null);
  assert.equal(effectiveRentSqm({ ...FULL, deal_type: "sale" }), null, "a purchase has no effective rent");
  assert.equal(effectiveRentSqm({ ...FULL, asking_rent_sqm: "" }), null, "an empty string is not a figure");
});

// SAT does not verify what a party asks for its own space.
test("a price is stated, never known", () => {
  assert.equal(of(FULL, "price").state, "stated");
  assert.equal(of({ ...FULL, deal_type: "sale", sale_price: 1000000 }, "price").state, "stated");
});

test("a lease with only a total falls back to it and says no rate is on the record", () => {
  const d = of({ ...FULL, asking_rent_sqm: null, asking_rent_total: 1080000 }, "price");
  assert.equal(d.state, "stated");
  assert.match(d.detail_en, /No rate per square metre is on the record\./);
});

test("no asking figure at all is unknown with an ask attached", () => {
  const d = of({ ...FULL, asking_rent_sqm: null, asking_rent_total: null }, "price");
  assert.equal(d.state, "unknown");
  assert.ok(d.ask_en && d.ask_ar);
});

test("an area is stated and always carries the missing net or gross basis", () => {
  const d = of(FULL, "size");
  assert.equal(d.state, "stated");
  assert.match(d.detail_en, /net or gross/);
  assert.equal(of({ ...FULL, area_sqm: null }, "size").state, "unknown");
  assert.equal(of({ ...FULL, area_sqm: 0 }, "size").state, "unknown", "a zero area states nothing");
});

test("availability moves from known to stated to stale as the affirmation ages", () => {
  assert.equal(of({ ...FULL, availability_confirmed_at: daysAgo(3) }, "availability").state, "known");
  assert.equal(of({ ...FULL, availability_confirmed_at: daysAgo(35) }, "availability").state, "stated");
  const stale = of({ ...FULL, availability_confirmed_at: daysAgo(120) }, "availability");
  assert.equal(stale.state, "stale");
  assert.ok(stale.ask_en, "a stale fact carries the ask that would refresh it");
  const none = of({ ...FULL, availability_confirmed_at: null }, "availability");
  assert.equal(none.state, "unknown");
  assert.ok(none.ask_en);
});

test("authority reads verified ownership, then verified authorization, then the claim", () => {
  const base: PackListing = { ...FULL, ownership_verified: null, authorization_verified: null, right_to_market_confirmed: null };
  const owned = of({ ...base, ownership_verified: true, authorization_verified: false, right_to_market_confirmed: false }, "authority");
  assert.equal(owned.state, "known");
  assert.match(owned.detail_en, /Ownership/);

  const authorized = of({ ...base, authorization_verified: true, right_to_market_confirmed: false }, "authority");
  assert.equal(authorized.state, "known");
  assert.match(authorized.detail_en, /authorization/);

  // A tick the lister set is a claim, and is never rendered as a check SAT ran.
  const claimed = of({ ...base, right_to_market_confirmed: true }, "authority");
  assert.equal(claimed.state, "stated");
  assert.match(claimed.detail_en, /No document has been checked/);

  const none = of(base, "authority");
  assert.equal(none.state, "unknown");
  assert.ok(none.ask_en);
});

test("the permit dimension reads both permit columns and all four states", () => {
  assert.equal(permitNumberOf(FULL), "7200012345");
  assert.equal(permitNumberOf({ ...FULL, ad_permit_number: null, ad_permit_no: "7200099999" }), "7200099999");
  assert.equal(permitNumberOf({ ...FULL, ad_permit_number: "  ", ad_permit_no: "7200088888" }), "7200088888");
  assert.equal(permitNumberOf({ ...FULL, ad_permit_number: null, ad_permit_no: null }), null);

  assert.equal(of(FULL, "permit").state, "known");
  // A number in the legacy column is the same credential.
  assert.equal(of({ ...FULL, ad_permit_number: null, ad_permit_no: "7200099999" }, "permit").state, "known");

  const noExpiry = of({ ...FULL, ad_permit_expires_at: null }, "permit");
  assert.equal(noExpiry.state, "stated");
  assert.equal(noExpiry.ask_en, undefined);

  const unparseable = of({ ...FULL, ad_permit_expires_at: "not a date" }, "permit");
  assert.equal(unparseable.state, "stated");

  const expired = of({ ...FULL, ad_permit_expires_at: daysAgo(2) }, "permit");
  assert.equal(expired.state, "stale");
  assert.ok(expired.ask_en);

  const none = of({ ...FULL, ad_permit_number: null, ad_permit_no: null }, "permit");
  assert.equal(none.state, "unknown");
  assert.ok(none.ask_en);
});

test("a missing service charge is not a service charge of nothing", () => {
  assert.equal(of(FULL, "service_charge").state, "stated");
  const d = of({ ...FULL, service_charge_sqm: null }, "service_charge");
  assert.equal(d.state, "unknown");
  assert.match(d.detail_en, /not the same as no service charge being payable/);
});

test("VAT treatment reads the enum and nothing else", () => {
  for (const v of ["inclusive", "exclusive", "exempt", "not_applicable"]) {
    assert.equal(of({ ...FULL, vat_treatment: v }, "vat").state, "stated", v);
  }
  assert.equal(of({ ...FULL, vat_treatment: null }, "vat").state, "unknown");
  assert.equal(of({ ...FULL, vat_treatment: "" }, "vat").state, "unknown");
  assert.equal(of({ ...FULL, vat_treatment: "something_else" }, "vat").state, "unknown");
});

test("tenure states the term and whether a break option is recorded", () => {
  assert.match(of(FULL, "tenure").detail_en, /break option is stated at 24 months/);
  assert.match(of({ ...FULL, break_option_months: null }, "tenure").detail_en, /No break option is recorded\./);
  assert.equal(of({ ...FULL, lease_term_months: null }, "tenure").state, "unknown");
});

test("a fit out condition of n_a states nothing", () => {
  assert.equal(of(FULL, "fitout").state, "stated");
  assert.equal(of({ ...FULL, fitout_condition: "n_a" }, "fitout").state, "unknown");
  assert.equal(of({ ...FULL, fitout_condition: null }, "fitout").state, "unknown");
});

test("an ask is attached exactly to the unresolved states", () => {
  const listings: PackListing[] = [
    FULL,
    { ...FULL, id: "L2", asking_rent_sqm: null, asking_rent_total: null, service_charge_sqm: null, availability_confirmed_at: daysAgo(120) },
    { ...FULL, id: "L3", deal_type: "sale", sale_price: 1000000 },
  ];
  for (const l of listings) {
    for (const d of packDimensions(l, NOW)) {
      const unresolved = d.state === "unknown" || d.state === "stale";
      assert.equal(Boolean(d.ask_en), unresolved, `${l.id} ${d.kind} ${d.state}`);
      assert.equal(Boolean(d.ask_ar), unresolved, `${l.id} ${d.kind} ${d.state}`);
    }
  }
});

test("readiness turns on the essentials, and not_applicable never counts against it", () => {
  assert.equal(readinessFrom(packDimensions(FULL, NOW)), "ready");

  // An expected fact missing is an ask, not a blocker.
  assert.equal(readinessFrom(packDimensions({ ...FULL, service_charge_sqm: null }, NOW)), "ask_first");
  // A stale essential is an ask, because the fact was stated and has aged.
  assert.equal(readinessFrom(packDimensions({ ...FULL, availability_confirmed_at: daysAgo(120) }, NOW)), "ask_first");
  // An absent essential is not something to ask around.
  assert.equal(readinessFrom(packDimensions({ ...FULL, area_sqm: null }, NOW)), "not_ready");
  assert.equal(readinessFrom(packDimensions({ ...FULL, availability_confirmed_at: null }, NOW)), "not_ready");
  assert.equal(readinessFrom(packDimensions({ ...FULL, ad_permit_number: null, ad_permit_no: null }, NOW)), "not_ready");

  // A sale with everything stated is ready even though two dimensions do not arise.
  const sale: PackListing = { ...FULL, deal_type: "sale", sale_price: 42000000, sale_price_sqm: 70000 };
  assert.equal(readinessFrom(packDimensions(sale, NOW)), "ready");
});

test("a candidate counts its own states", () => {
  const c = packCandidate(FULL, NOW);
  assert.equal(c.listing_id, "L1");
  assert.equal(c.readiness, "ready");
  assert.equal(c.unknown, 0);
  assert.equal(c.stale, 0);
  assert.equal(c.known + c.stated + c.stale + c.unknown, c.dimensions.filter((d) => d.state !== "not_applicable").length);
});

test("mixing a lease and a sale withholds the price comparison outright", () => {
  const cmp = comparabilityOf([FULL, { ...FULL, id: "L2", deal_type: "sale", sale_price: 1000000 }]);
  const price = cmp.find((c) => c.kind === "price");
  assert.equal(price?.comparable, false);
  assert.deepEqual(price?.excluded_ids, [], "a mixed shortlist excludes no single candidate; the comparison itself does not arise");
  // The lease only comparisons are not offered at all across a mixed shortlist.
  assert.equal(cmp.find((c) => c.kind === "occupancy_cost"), undefined);
  assert.equal(cmp.find((c) => c.kind === "effective_rent"), undefined);
});

test("a comparison is offered only when every candidate states its inputs", () => {
  const good = comparabilityOf([FULL, { ...FULL, id: "L2" }]);
  for (const k of ["price", "size", "occupancy_cost", "effective_rent"]) {
    const c = good.find((x) => x.kind === k);
    assert.equal(c?.comparable, true, k);
    assert.deepEqual(c?.excluded_ids, [], k);
  }

  const withGap = comparabilityOf([FULL, { ...FULL, id: "L2", service_charge_sqm: null }]);
  const occ = withGap.find((c) => c.kind === "occupancy_cost");
  assert.equal(occ?.comparable, false);
  assert.deepEqual(occ?.excluded_ids, ["L2"], "the candidate that cannot join is named, not dropped");
  assert.match(String(occ?.reason_en), /would rank the candidate that withheld it first/);
  // A gap in one comparison does not take the others down with it.
  assert.equal(withGap.find((c) => c.kind === "size")?.comparable, true);

  const noTerm = comparabilityOf([FULL, { ...FULL, id: "L2", lease_term_months: null }]);
  const eff = noTerm.find((c) => c.kind === "effective_rent");
  assert.equal(eff?.comparable, false);
  assert.deepEqual(eff?.excluded_ids, ["L2"]);
  assert.match(String(eff?.reason_en), /an assumption, not a calculation/);

  const noArea = comparabilityOf([FULL, { ...FULL, id: "L2", area_sqm: null }]);
  assert.equal(noArea.find((c) => c.kind === "size")?.comparable, false);
});

test("the size comparison carries its caveat even when it is comparable", () => {
  for (const set of [[FULL, { ...FULL, id: "L2" }], [FULL, { ...FULL, id: "L2", area_sqm: null }]]) {
    const size = comparabilityOf(set).find((c) => c.kind === "size");
    assert.ok(size?.caveat_en, "the net or gross caveat is permanent, not conditional");
    assert.ok(size?.caveat_ar);
    assert.match(String(size?.caveat_en), /net or gross/);
  }
});

test("a sale shortlist compares on price from either sale column", () => {
  const bySqm = comparabilityOf([
    { ...FULL, id: "L1", deal_type: "sale", sale_price_sqm: 70000, sale_price: null },
    { ...FULL, id: "L2", deal_type: "sale", sale_price: 42000000, sale_price_sqm: null },
  ]);
  assert.equal(bySqm.find((c) => c.kind === "price")?.comparable, true);

  const missing = comparabilityOf([
    { ...FULL, id: "L1", deal_type: "sale", sale_price: 42000000 },
    { ...FULL, id: "L2", deal_type: "sale", sale_price: null, sale_price_sqm: null },
  ]);
  assert.equal(missing.find((c) => c.kind === "price")?.comparable, false);
  assert.deepEqual(missing.find((c) => c.kind === "price")?.excluded_ids, ["L2"]);
});

test("an empty shortlist compares nothing rather than claiming everything", () => {
  const cmp = comparabilityOf([]);
  for (const c of cmp) assert.equal(c.comparable, false, c.kind);
  const pack = decisionPack([], NOW);
  assert.deepEqual(pack.candidates, []);
  assert.equal(pack.ready + pack.ask_first + pack.not_ready, 0);
});

test("the pack counts its candidates by readiness", () => {
  const pack = decisionPack(
    [
      FULL,
      { ...FULL, id: "L2", service_charge_sqm: null },
      { ...FULL, id: "L3", area_sqm: null },
    ],
    NOW,
  );
  assert.equal(pack.candidates.length, 3);
  assert.equal(pack.ready, 1);
  assert.equal(pack.ask_first, 1);
  assert.equal(pack.not_ready, 1);
  assert.equal(pack.ready + pack.ask_first + pack.not_ready, pack.candidates.length);
});

test("asks are deduplicated by wording and carry every listing they apply to", () => {
  const pack = decisionPack(
    [
      { ...FULL, id: "L1", service_charge_sqm: null },
      { ...FULL, id: "L2", service_charge_sqm: null },
      { ...FULL, id: "L3", vat_treatment: null },
    ],
    NOW,
  );
  const asks = packAsks(pack);
  const sc = asks.filter((a) => a.kind === "service_charge");
  assert.equal(sc.length, 1, "one wording, one ask");
  assert.deepEqual(sc[0].listing_ids, ["L1", "L2"]);
  const vat = asks.filter((a) => a.kind === "vat");
  assert.equal(vat.length, 1);
  assert.deepEqual(vat[0].listing_ids, ["L3"]);
  // A complete pack has nothing to chase.
  assert.deepEqual(packAsks(decisionPack([FULL], NOW)), []);
});

test("labels are bilingual and distinct in both languages", () => {
  for (const r of ["ready", "ask_first", "not_ready"] as const) {
    assert.notEqual(readinessLabel(r, false), readinessLabel(r, true));
  }
  const en = new Set(["known", "stated", "stale", "unknown", "not_applicable"].map((s) => stateLabel(s as never, false)));
  assert.equal(en.size, 5, "each state reads differently in English");
  const ar = new Set(["known", "stated", "stale", "unknown", "not_applicable"].map((s) => stateLabel(s as never, true)));
  assert.equal(ar.size, 5, "each state reads differently in Arabic");
  for (const k of ["price", "size", "occupancy_cost", "effective_rent"] as const) {
    assert.ok(comparabilityLabel(k, false).length > 0);
    assert.ok(comparabilityLabel(k, true).length > 0);
  }
});

// Law 7 and the em dash law, checked on the model's own output rather than on
// the source, because the strings are assembled at runtime.
test("no output string carries an em dash or an Arabic Indic numeral", () => {
  const listings: PackListing[] = [
    FULL,
    { ...FULL, id: "L2", deal_type: "sale", sale_price: 42000000, sale_price_sqm: 70000 },
    { ...FULL, id: "L3", asking_rent_sqm: null, asking_rent_total: 1080000, service_charge_sqm: null, vat_treatment: null, fitout_condition: null, lease_term_months: null, availability_confirmed_at: null, ad_permit_number: null, ad_permit_no: null, ownership_verified: null, authorization_verified: null, right_to_market_confirmed: null },
    { ...FULL, id: "L4", availability_confirmed_at: daysAgo(120), ad_permit_expires_at: daysAgo(5) },
  ];
  const pack = decisionPack(listings, NOW);
  const strings: string[] = [];
  for (const c of pack.candidates) {
    for (const d of c.dimensions) {
      strings.push(d.label_en, d.label_ar, d.detail_en, d.detail_ar);
      if (d.ask_en) strings.push(d.ask_en);
      if (d.ask_ar) strings.push(d.ask_ar);
    }
  }
  for (const c of pack.comparisons) {
    strings.push(c.reason_en, c.reason_ar);
    if (c.caveat_en) strings.push(c.caveat_en);
    if (c.caveat_ar) strings.push(c.caveat_ar);
  }
  for (const a of packAsks(pack)) strings.push(a.ask_en, a.ask_ar);
  for (const l of listings) {
    const e = effectiveRentSqm(l);
    if (e) strings.push(e.basis_en, e.basis_ar);
  }
  assert.ok(strings.length > 100, "the sweep must actually cover the model's output");
  for (const s of strings) {
    assert.ok(!/\u2014/.test(s), `em dash in: ${s}`);
    assert.ok(!/\u2013/.test(s), `en dash in: ${s}`);
    assert.ok(!/[\u0660-\u0669]/.test(s), `Arabic Indic numeral in: ${s}`);
    assert.ok(!/قم ب|قومي ب|قوموا ب|يقوم ب/.test(s), `banned imperative construction in: ${s}`);
    assert.ok(!/الخاصة بك|الخاص بك|رحلتك|لا تتردد|لا تفوت|عالم من/.test(s), `banned phrase in: ${s}`);
  }
});

test("large figures print with Western grouping in both languages", () => {
  const d = of({ ...FULL, deal_type: "sale", sale_price: 42000000, sale_price_sqm: null }, "price");
  assert.match(d.detail_en, /42,000,000/);
  assert.match(d.detail_ar, /42,000,000/);
});
