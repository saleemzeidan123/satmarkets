import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import EvidencePassport from "@/components/EvidencePassport";
import { publicEvidenceView } from "@/lib/evidenceView";
import {
  RENT_INDEX_MAX_AGE_DAYS,
  periodEndIso,
  rentIndexEvidenceByField,
  rentIndexEvidenceViews,
  rentIndexPassports,
  rentIndexRecordClassOf,
  type RentIndexCell,
} from "@/lib/rentIndexEvidence";
import {
  effectivePolicy,
  mayDisplayDerived,
  mayRedisplay,
  type SourceRights,
} from "@/lib/sourceRights";
import { REGA_RENT_INDEX_SOURCE_ID } from "@/lib/sources/catalogue";
import { RENT_INDEX_SOURCE } from "@/lib/market/attribution";
import { buildValueEvidence, renderValue } from "@/lib/market/valueEvidence";

//
// ADV-1D, and four of Codex's eight required gates:
//
//   "EN and AR passport values and periods remain identical"
//   "unauthorized source details never render"
//   "a real route constructs and displays the complete passport"
//   "mobile disclosure remains at least 44px and overflow-free"
//
// The 44px half of the last one is measured against the built stylesheet in
// `EvidencePassport.render.test.tsx`, which resolves the cascade rather than
// asserting a number exists somewhere in the file. What is added here is the
// overflow half, which on this route is not a CSS question at all but a
// question of where in the markup the disclosure was mounted.
//

const NOW = Date.parse("2026-07-31T00:00:00Z");
const PAGE = "src/app/[locale]/rent-index/page.tsx";

/** Strip comments before scanning source for a token the comments also discuss. */
const codeOnly = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/[^\n]*/g, "$1");

/** A published cell of the shape `/rent-index` reads, with the wide select. */
const CELL: RentIndexCell = {
  district_id: "d-olaya",
  asset_type: "office",
  segment: "all",
  unit: "sar_sqm_yr",
  period: "2026-Q2",
  median: 1421,
  band_low: 1250,
  band_high: 1591,
  sufficient: true,
  stat_kind: "average",
  data_class: "synthetic",
  is_demo: true,
};

/** The same cell as it would arrive if it were real and not flagged. */
const REAL: RentIndexCell = { ...CELL, data_class: "real", is_demo: false };

/**
 * The `rega_ejar` row exactly as `20260728_source_rights_ledger.sql` leaves it.
 *
 * The migration sets four policies and the status, and deliberately does NOT set
 * `redisplay_policy`, which therefore keeps its pre-existing `public`. That
 * combination, a permissive column under a restrictive status, is the whole of
 * finding 89 and it is not a contrived fixture: it is the only source row on the
 * platform.
 */
const REGA_AS_RECORDED = {
  sourceId: REGA_RENT_INDEX_SOURCE_ID,
  storagePolicy: "full",
  redisplayPolicy: "public",
  derivedDisplayPolicy: "internal",
  exportPolicy: "none",
  aiRetrievalPolicy: "internal",
  modelInputPolicy: "none",
  rightsStatus: "asserted_unverified",
  stopCondition: "O10 unresolved. STOP-CONDITION-SENTINEL",
  reviewedAt: "2026-07-28T00:00:00.000Z",
  reviewedNote: "REVIEW-NOTE-SENTINEL",
} as SourceRights;

function render(view: Parameters<typeof EvidencePassport>[0]["view"], ar: boolean): string {
  return renderToStaticMarkup(
    <EvidencePassport view={view} label="x" ar={ar} locale={ar ? "ar" : "en"} />
  );
}

// ---------------------------------------------------------------------------
// Finding 89: one licence rule, not two
// ---------------------------------------------------------------------------

test("finding 89: the status ceiling applies wherever the permission is asked", () => {
  // The defect stated as an assertion. Reading the column alone answers yes.
  assert.equal(REGA_AS_RECORDED.redisplayPolicy, "public");
  // Reading the rule answers no, because `asserted_unverified` ceils at internal.
  assert.equal(mayRedisplay(REGA_AS_RECORDED, "public"), false);
  assert.equal(mayRedisplay(REGA_AS_RECORDED, "internal"), true);
  assert.equal(mayDisplayDerived(REGA_AS_RECORDED, "public"), false);
  // And the reported permission is the ceiled one, so what a reader is told
  // matches what the enforcement path did.
  assert.equal(effectivePolicy(REGA_AS_RECORDED, "redisplay"), "internal");
  assert.equal(effectivePolicy(REGA_AS_RECORDED, "export"), "none");
  assert.equal(effectivePolicy(REGA_AS_RECORDED, "ai_retrieval"), "internal");
});

test("finding 89: the evidence engine holds no second copy of the permission rule", () => {
  // The copy was a local `permits(policy, audience)` that read the column and
  // ignored the status. Its absence is the fix; its presence would be silent.
  const code = codeOnly(readFileSync("src/lib/evidence.ts", "utf8"));
  assert.equal(
    /function permits\s*\(/.test(code),
    false,
    "evidence.ts declares its own permission function again",
  );
  assert.ok(code.includes("may" + "Redisplay"), "evidence.ts no longer asks the module that owns rights");
  assert.ok(code.includes("may" + "DisplayDerived"), "evidence.ts no longer separates redisplay from derived display");

  const view = codeOnly(readFileSync("src/lib/evidenceView.ts", "utf8"));
  assert.ok(view.includes("effective" + "Policy"), "evidenceView.ts reports the raw policy column again");
  assert.equal(
    /display:\s*ctx\.rights\.redisplayPolicy/.test(view),
    false,
    "evidenceView.ts reports the raw redisplay column again",
  );
});

test("finding 89: a permissive column under a restrictive status withholds and says so", () => {
  const p = rentIndexPassports(REAL, { locale: "en", geography: "Al Olaya, Riyadh", now: NOW })[0];
  const v = publicEvidenceView(p, { pageKind: "segment", rights: REGA_AS_RECORDED, now: NOW });
  assert.equal(v.value, null, "a figure the licence ceiling withholds was published");
  assert.equal(v.permissions.display, "internal", "the panel reported the column rather than the rule");
  assert.ok(v.states.includes("restricted"), "the restricted state was left off a restricted figure");
});

// ---------------------------------------------------------------------------
// The three-way record rule
// ---------------------------------------------------------------------------

test("ADV-1D: a row's class comes from its own markers, and silence is not a yes", () => {
  assert.equal(rentIndexRecordClassOf(CELL), "flagged_simulated");
  assert.equal(rentIndexRecordClassOf(REAL), "not_flagged");
  // One marker saying real while the other says nothing is one fact and one
  // silence, and ADV-1C.1 correction 1 rules that the silence establishes
  // nothing.
  assert.equal(rentIndexRecordClassOf({ is_demo: false }), "unknown");
  assert.equal(rentIndexRecordClassOf({ data_class: "real" }), "unknown");
  assert.equal(rentIndexRecordClassOf({}), "unknown");
  // Either marker alone is enough to say simulated, because that direction is
  // the restrictive one.
  assert.equal(rentIndexRecordClassOf({ is_demo: true, data_class: "real" }), "flagged_simulated");
  assert.equal(rentIndexRecordClassOf({ is_demo: false, data_class: "synthetic" }), "flagged_simulated");
});

test("ADV-1D: an unknown row takes the stricter branch, so it withholds rather than shows", () => {
  const unknown = { ...CELL, data_class: undefined, is_demo: undefined };
  const p = rentIndexPassports(unknown, { locale: "en", now: NOW })[0];
  assert.equal(p.tier, "sourced", "an unknown row was displayed as SAT's own illustration");
  assert.equal(p.sourceId, REGA_RENT_INDEX_SOURCE_ID);
  // Sourced with no readable rights row withholds the value entirely.
  const v = publicEvidenceView(p, { pageKind: "segment", rights: null, now: NOW });
  assert.equal(v.value, null);
  assert.ok(v.states.includes("permission_unrecorded"));
});

test("ADV-1D: a flagged simulated row carries no source and is shown as illustrative", () => {
  const [avg, band] = rentIndexPassports(CELL, { locale: "en", geography: "Al Olaya, Riyadh", now: NOW });
  assert.equal(avg.tier, "computed");
  assert.equal(avg.sourceId, null, "REGA was named on a number REGA never published");
  assert.equal(avg.transformation, "modelled");
  // The band is SAT's arithmetic on both classes, so it is never `as_published`.
  assert.equal(band.field, "rent_index_band");
  assert.equal(band.statistic, "range");
  assert.notEqual(band.transformation, "as_published");
  const v = publicEvidenceView(avg, { pageKind: "segment", rights: null, now: NOW });
  assert.equal(v.value, "1,421", "the illustrative figure the page prints was withheld by its own passport");
  // `modelled` is one of the three transformations that make a figure SAT's own
  // arithmetic rather than the source's number, so the view must say `derived`
  // whatever else it says. See `statesOf` in `evidenceView.ts`.
  assert.ok(v.states.includes("derived"), "a modelled figure was presented as though published as-is");
  assert.equal(v.tier, "computed");
  assert.equal(v.source, null, "an illustrative figure named a source in the rendered view");
});

test("ADV-1D: the statistic is read from the record, never from the column name", () => {
  // Law 6. The column that holds the figure is named `median` and holds the
  // average, so the only safe source of the statistic is `stat_kind`.
  assert.equal(rentIndexPassports(CELL, { locale: "en", now: NOW })[0].statistic, "average");
  const asMedian = rentIndexPassports({ ...CELL, stat_kind: "median" }, { locale: "en", now: NOW })[0];
  assert.equal(asMedian.statistic, "median");
  const unlabelled = rentIndexPassports({ ...CELL, stat_kind: null }, { locale: "en", now: NOW })[0];
  assert.equal(unlabelled.statistic, "unknown");
  const v = publicEvidenceView(unlabelled, { pageKind: "segment", rights: null, now: NOW });
  assert.equal(v.value, null, "an unlabelled figure was published as though its statistic were known");
});

test("ADV-1D: freshness is measured from the period, not from when SAT wrote the row", () => {
  assert.equal(periodEndIso("2026-Q2"), "2026-06-30T00:00:00.000Z");
  assert.equal(periodEndIso("Q2 2026"), "2026-06-30T00:00:00.000Z");
  assert.equal(periodEndIso("nonsense"), null);
  assert.equal(RENT_INDEX_MAX_AGE_DAYS, 180);
  const p = rentIndexPassports(CELL, { locale: "en", now: NOW })[0];
  assert.equal(p.asOf, "2026-06-30T00:00:00.000Z");
  assert.equal(p.maxAgeDays, 180);
});

// ---------------------------------------------------------------------------
// Codex gate: EN and AR passport values and periods remain identical
// ---------------------------------------------------------------------------

test("Codex gate: EN and AR carry identical values and identical periods", () => {
  const en = rentIndexEvidenceByField(CELL, { locale: "en", geography: "Al Olaya, Riyadh", now: NOW }, null);
  const ar = rentIndexEvidenceByField(CELL, { locale: "ar", geography: "العليا، الرياض", now: NOW }, null);
  assert.deepEqual([...en.keys()].sort(), [...ar.keys()].sort(), "the two languages built different figures");
  for (const field of en.keys()) {
    const a = en.get(field)!;
    const b = ar.get(field)!;
    // PKG-FIG1, finding 127. This gate's own message says what it is for: "the
    // two languages print different numbers". It enforced that by comparing the
    // whole rendered string, which also forbade the two languages from using
    // their own words, and forcing one string on both is precisely what put an
    // en dash inside Arabic copy. A range is not a bare figure: English joins
    // two numbers with a word or a dash, Arabic joins them with إلى. The gate now
    // makes both halves of the claim explicitly, and together they are stricter
    // than the single equality they replace: the FIGURES must match in order,
    // and the two strings must differ by nothing except the connective and the
    // invisible isolate.
    const figures = (s: unknown) => String(s ?? "").match(/[0-9][0-9,.]*/g) ?? [];
    assert.deepEqual(figures(a.value), figures(b.value), `${field}: the two languages print different numbers`);
    assert.equal(
      String(a.value ?? "").replace(/ to /g, "|"),
      String(b.value ?? "").replace(/[\u2068\u2069]/g, "").replace(/ إلى /g, "|"),
      `${field}: the two languages differ by more than the connective`,
    );
    assert.equal(a.period, b.period, `${field}: the two languages report different periods`);
    assert.equal(a.asOf, b.asOf, `${field}: the two languages report different last-true dates`);
    assert.equal(a.unit, b.unit, `${field}: the two languages report different units`);
    assert.equal(a.statistic, b.statistic, `${field}: the two languages report different statistics`);
    assert.equal(a.transformation, b.transformation, `${field}: the two languages report different transformations`);
    assert.deepEqual(a.states, b.states, `${field}: the two languages report different states`);
    // Law 7. The Arabic value must be the same Western numerals, not
    // Eastern Arabic ones, which is exactly how a value can differ while
    // looking identical to a reader of only one of the two.
    assert.equal(/[٠-٩۰-۹]/.test(String(b.value ?? "")), false, `${field}: Eastern numerals in Arabic`);
  }
  // And the rendered panels agree too, since a value equal in the object and
  // reformatted in the component would satisfy the assertions above and still
  // print two different numbers.
  for (const field of en.keys()) {
    const value = en.get(field)!.value;
    assert.notEqual(value, null, `${field}: the fixture withheld its value, so this gate proves nothing`);
    const enHtml = render(en.get(field)!, false);
    const arHtml = render(ar.get(field)!, true);
    // The panel does NOT print the figure. That is deliberate and it is the
    // reason the object-level equality above is the real parity gate: the page
    // prints `view.value` once, beside the disclosure, from the same object in
    // both languages, so there is no second formatting path that could disagree.
    // Asserted rather than assumed, because a component that started printing
    // the value would give the figure a second rendering route and a locale that
    // formats it differently would then be invisible to every assertion above.
    assert.ok(!enHtml.includes(String(value)), `${field}: the English panel printed the figure itself`);
    assert.ok(!arHtml.includes(String(value)), `${field}: the Arabic panel printed the figure itself`);
    // The period is rendered from `view.period` in both panels, so a period that
    // reformatted in one language would show up here.
    assert.ok(enHtml.includes("2026-Q2"), `${field}: the English panel did not state the reporting period`);
    assert.ok(arHtml.includes("2026-Q2"), `${field}: the Arabic panel did not state the reporting period`);
  }
});

// ---------------------------------------------------------------------------
// Codex gate: unauthorized source details never render
// ---------------------------------------------------------------------------

test("Codex gate: no unauthorized source detail reaches either language", () => {
  // The row is real, so the passport declares `rega_ejar` and the rights row is
  // readable. It still refuses a public audience, and the refusal must not be
  // explained with the licence text that produced it.
  const p = rentIndexPassports(REAL, { locale: "en", geography: "Al Olaya, Riyadh", now: NOW })[0];
  const v = publicEvidenceView(p, { pageKind: "segment", rights: REGA_AS_RECORDED, now: NOW });
  for (const ar of [false, true]) {
    const html = render(v, ar);
    assert.ok(!html.includes("STOP-CONDITION-SENTINEL"), "the stop condition was rendered");
    assert.ok(!html.includes("REVIEW-NOTE-SENTINEL"), "the review note was rendered");
    assert.ok(!html.includes("1,421"), "a figure the licence withholds was rendered anyway");
    assert.ok(!html.includes("O10"), "internal licence reasoning was rendered");
  }
  // The licensor is not named on a withheld figure either: naming them is itself
  // a republication of the attribution the licence has not cleared.
  const en = render(v, false);
  assert.ok(!en.includes(RENT_INDEX_SOURCE.en), "a withheld figure named its licensor");
  assert.ok(!render(v, true).includes(RENT_INDEX_SOURCE.ar), "a withheld figure named its licensor in Arabic");
  // And the view object itself carries no internal field, so no future surface
  // can render one by choosing to.
  const json = JSON.stringify(v);
  assert.ok(!json.includes("STOP-CONDITION-SENTINEL"));
  assert.ok(!json.includes("REVIEW-NOTE-SENTINEL"));
  assert.equal("denialReason" in (v as object), false);
});

// ---------------------------------------------------------------------------
// Codex gate: a real route constructs and displays the complete passport
// ---------------------------------------------------------------------------

test("Codex gate: /rent-index builds its passports from the row and mounts them", () => {
  // The route is an async server component that opens a Supabase client, so it
  // cannot be rendered here without standing up a database and testing the
  // fixture instead of the page. What is assertable is the wiring: that the page
  // selects the columns a passport needs, resolves rights through the accessor
  // that can return null, builds views from the row and mounts the component.
  const src = readFileSync(PAGE, "utf8");
  const code = codeOnly(src);
  assert.ok(code.includes("import EvidencePassport"), "the route no longer imports the passport");
  assert.ok(/<EvidencePassport\s/.test(code), "the route no longer mounts the passport");
  assert.ok(code.includes("rentIndexEvidenceByField"), "the route no longer builds evidence from the row");
  assert.ok(
    code.includes("getSourceRightsOrNull"),
    "the route resolves rights through the denying accessor, which reports a refusal where none was recorded",
  );
  assert.equal(
    /getSourceRights\s*\(/.test(code.replace(/getSourceRightsOrNull/g, "")),
    false,
    "the route calls the enforcement accessor, whose fallback row collapses unrecorded into refused",
  );
  for (const col of ["district_id", "unit", "period", "data_class", "is_demo"]) {
    assert.ok(code.includes(col), `the route stopped selecting ${col}, which the passport reads`);
  }
  // Both figures are mounted, not just the headline one.
  assert.ok(code.includes("rent_index_average"), "the average passport is not mounted");
  assert.ok(code.includes("rent_index_band"), "the band passport is not mounted");
});

test("Codex gate: the machine-readable REGA claim does not ride on simulated rows", () => {
  // The human surface stamps every row "Sample". `isBasedOn` told a crawler the
  // same figures came from the REGA Rental Index (Ejar). Emitting it is now
  // conditional on the same decision that governs the visible figures.
  //
  // ADV-1E widened the predicate. It used to read "no row is flagged simulated",
  // which is a test of the demo markers alone: a real row whose publication
  // rights are unread or withheld passed it, and the crawler was told the REGA
  // index stood behind a figure the page itself would not print. Codex item 2
  // names metadata and structured data explicitly, so the claim now requires
  // every row to have been decided `authorized_public`, which is strictly
  // stronger: a simulated row is `labelled_sample` and fails it too.
  const code = codeOnly(readFileSync(PAGE, "utf8"));
  assert.match(
    code,
    /basedOnPermitted \? \{ isBasedOn/,
    "the dataset names its basis unconditionally again",
  );
  assert.match(
    code,
    /const basedOnPermitted = districts\.length > 0 && districts\.every\(\(d\) => d\.quote === "authorized_public"\)/,
    "the structured-data claim no longer requires every row to be authorized for public use",
  );
  // And the weaker demo-marker test is not what guards it any more.
  assert.equal(
    /basedOnPermitted = districts\.length > 0 && !districts\.some/.test(code),
    false,
    "the claim fell back to testing the demo markers, which withheld rights pass",
  );
});

// ---------------------------------------------------------------------------
// Codex gate: mobile disclosure overflow-free
// ---------------------------------------------------------------------------

test("Codex gate: the disclosure is mounted outside the horizontally scrolling table", () => {
  // The district table is `min-width: 640` inside `overflow-x: auto`, so at 320
  // and 360 it already scrolls sideways. A `<details>` inside a cell would add
  // the width of its longest evidence row to that scroll width, and a reader on
  // a phone would scroll horizontally to read the evidence for a figure. The
  // 44px half of this gate is measured against the built stylesheet in
  // `EvidencePassport.render.test.tsx`; this is the placement half.
  const code = codeOnly(readFileSync(PAGE, "utf8"));
  const scroller = code.indexOf("overflowX");
  const tableEnd = code.indexOf("tableNote");
  const mount = code.indexOf("<EvidencePassport");
  assert.ok(scroller > 0 && tableEnd > scroller, "the table markup is not where this test expects it");
  assert.ok(mount > tableEnd, "the passport was mounted inside the horizontally scrolling table");
  // And the evidence grid's tracks never demand more than the container has.
  assert.ok(
    code.includes("minmax(min(100%, 260px), 1fr)"),
    "the evidence grid declares a fixed minimum track, which overflows below that width",
  );
});

// ---------------------------------------------------------------------------
// ADV-1D: a card prints the figure its own passport cleared
// ---------------------------------------------------------------------------

test("ADV-1D: the rent index evidence card prints the passport's value, not the row's", () => {
  // The defect this closes. The card printed `d.figure`, read straight off the
  // row and shown whenever `sufficient` is true, directly above a passport that
  // decides separately whether the figure may be shown at all. Two answers to
  // one question, on one card, with no rule saying they must agree.
  const code = codeOnly(readFileSync(PAGE, "utf8"));
  const start = code.indexOf('id="evidence"');
  assert.ok(start > 0, "the evidence card is not where this test expects it");
  const card = code.slice(start);
  assert.ok(card.includes("{avg.value ?? ri.na}"), "the average tile no longer prints the passport's own value");
  assert.ok(card.includes("{band.value ?? ri.na}"), "the band tile no longer prints the passport's own value");
  assert.equal(/\{d\.figure\}/.test(card), false, "the evidence card prints the raw row figure again");
  assert.equal(/\{d\.band\}/.test(card), false, "the evidence card prints the raw row band again");
});

test("ADV-1D: that fallback is reachable, so it is a state and not decoration", () => {
  // The narrow select, expressed as data rather than as a worry. Both record
  // class markers absent, so the class is `unknown`, the stricter sourced branch
  // runs, no rights row is readable, and the passport withholds. The row still
  // holds the number, which is exactly the contradiction the card would have
  // printed.
  const { data_class, is_demo, ...narrow } = CELL;
  void data_class;
  void is_demo;
  assert.equal(rentIndexRecordClassOf(narrow), "unknown");
  const views = rentIndexEvidenceByField(narrow, { locale: "en", geography: "Al Olaya, Riyadh", now: NOW }, null);
  assert.equal(views.get("rent_index_average")!.value, null, "an unknown row published its value");
  assert.equal(views.get("rent_index_band")!.value, null, "an unknown row published its band");
  assert.equal(narrow.median, 1421, "the fixture stopped holding a figure, so this proves nothing");
});

// ---------------------------------------------------------------------------
// ADV-1D correction 4: the Advisor published-band surface
// ---------------------------------------------------------------------------

const ADVISOR_ROUTE = "src/app/api/advisor/route.ts";
const ADVISOR_PAGE = "src/app/[locale]/advisor/page.tsx";
const ADVISOR_HOOK = "src/lib/useAdvisorChat.ts";

/** The row the Advisor value path retrieves, with the wide select. */
const ADVISOR_ROW = {
  id: "ri-olaya-office-2026Q2",
  district_label: "Al Olaya, Riyadh",
  district_label_ar: "العليا، الرياض",
  district_id: "d-olaya",
  asset_type: "office",
  segment: "all",
  unit: "sar_sqm_yr",
  band_low: 1250,
  band_high: 1591,
  median: 1421,
  period: "2026-Q2",
  source: "REGA Rental Index (Ejar)",
  sufficient: true,
  stat_kind: "average",
  data_class: "synthetic",
  is_demo: true,
};

test("ADV-1D: the Advisor's published-band select carries the record class, and its fallback does not buy a claim", () => {
  const code = codeOnly(readFileSync(ADVISOR_ROUTE, "utf8"));
  const wide = /const V_WIDE = "([^"]+)"/.exec(code);
  const narrow = /const V_NARROW = "([^"]+)"/.exec(code);
  assert.ok(wide, "the value path no longer declares a wide column list");
  assert.ok(narrow, "the value path no longer declares a narrow fallback");
  const cols = wide![1].split(",").map((s) => s.trim());
  for (const c of ["sufficient", "stat_kind", "data_class", "is_demo"]) {
    assert.ok(cols.includes(c), `the wide select dropped ${c}, so the passport reads it as unknown`);
  }
  // The fallback must be the pre-ADV-1D list. A narrow select that carried one
  // of the four would answer with a class read from an incomplete record.
  for (const c of ["sufficient", "stat_kind", "data_class", "is_demo"]) {
    assert.equal(narrow![1].includes(c), false, `the narrow fallback selects ${c}, so a partial read now makes a claim`);
  }
  assert.match(code, /build\(V_WIDE\)/, "the wide list is declared and never used");
  assert.match(code, /build\(V_NARROW\)/, "the narrow list is declared and never used");
});

test("Codex gate: no passport rides on an Advisor answer whose figure the licence withheld", () => {
  const opts = { locale: "en" as const, geography: "Al Olaya, Riyadh", now: NOW };
  // Today's corpus: flagged simulated, shown as an illustration, both figures
  // cleared, so both passports attach.
  const shown = rentIndexEvidenceViews(ADVISOR_ROW as RentIndexCell, opts, null).filter((v) => v.value !== null);
  assert.equal(shown.length, 2, "the live row stopped producing the two passports the answer displays");

  // The same row as a real one. No rights row is readable, so the value is
  // withheld and nothing may be attached. The answer keeps its pre-ADV-1D shape
  // rather than showing a figure beside a panel that refuses it.
  const real = rentIndexEvidenceViews({ ...ADVISOR_ROW, data_class: "real", is_demo: false } as RentIndexCell, opts, null);
  assert.equal(real.length, 2, "the producer stopped producing views for a real row");
  assert.equal(real.filter((v) => v.value !== null).length, 0, "a withheld figure was attached to an answer anyway");

  // And the predicate is applied rather than described. ADV-1E moved it out of
  // the route and into `rentIndexQuoteGate`, which is the point: the route no
  // longer builds a passport set of its own, so there is no second set that
  // could be filtered by a second rule. The predicate is asserted where it now
  // lives, and the route is asserted to have no other source of passports. It
  // lives under the neutral name because `/rent-index` and `/api/index/segments`
  // quote the same cells and must reach the same verdict by the same route.
  const gateCode = codeOnly(readFileSync("src/lib/rentIndexEvidence.ts", "utf8"));
  assert.match(gateCode, /\.filter\(\(v\) => v\.value !== null\)/, "the gate stopped filtering withheld views");
  assert.match(gateCode, /export function rentIndexQuoteGate\(/, "the shared gate moved or was renamed");
  const code = codeOnly(readFileSync(ADVISOR_ROUTE, "utf8"));
  assert.match(code, /const passports = gate\.passports/, "the route builds its own passport set again");
  assert.equal(
    /rentIndexEvidenceViews\(/.test(code),
    false,
    "the route calls the view producer directly again, which is how finding 90 became possible",
  );
  assert.match(code, /getSourceRightsOrNull\(REGA_RENT_INDEX_SOURCE_ID\)/, "the route stopped resolving the source rights row");
  assert.equal(
    /[^r]getSourceRights\(/.test(code),
    false,
    "the denying variant is back, so an unread permission would render as a refusal",
  );
});

test("Codex gate: the Advisor passport carries the figure the Advisor printed, in both languages", () => {
  // Traceability stated as an equality rather than as an intention. The message
  // is a pure function of the typed result, the typed result is a pure function
  // of the row, and the passport is built from the same row. If any of the three
  // stopped agreeing, the number in the panel and the number in the sentence
  // would part company here.
  const ev = buildValueEvidence(ADVISOR_ROW as any, null, null, { requested: null, status: "none" });
  assert.ok(ev, "the fixture no longer forms a valid band");
  const langs: [("en" | "ar"), string][] = [
    ["en", "Al Olaya, Riyadh"],
    ["ar", "العليا، الرياض"],
  ];
  const seen = new Map<string, string>();
  for (const [loc, geography] of langs) {
    const views = rentIndexEvidenceByField(ADVISOR_ROW as RentIndexCell, { locale: loc, geography, now: NOW }, null);
    const avg = views.get("rent_index_average")!;
    const band = views.get("rent_index_band")!;
    const msg = renderValue(ev!, loc);
    assert.ok(msg.includes(avg.value!), `${loc}: the answer printed an average the passport does not carry`);
    // PKG-FIG1, finding 127. This split the passport value on a literal en dash,
    // which tied the gate to one language's separator and broke the moment the
    // Arabic stopped using it. It now takes every figure the passport carries and
    // requires all of them in the sentence, which is the claim the message makes,
    // with no separator in it at all.
    const bandFigures = band.value!.match(/[0-9][0-9,.]*/g) ?? [];
    assert.ok(bandFigures.length >= 2, `${loc}: the passport band no longer carries two figures`);
    for (const figure of bandFigures) {
      assert.ok(msg.includes(figure), `${loc}: the answer printed a band the passport does not carry`);
    }
    // Codex gate: EN and AR values and periods identical.
    for (const [field, v] of views) {
      const key = `${field}:value`;
      const per = `${field}:period`;
      if (seen.has(key)) {
        assert.deepEqual(
          String(v.value ?? "").match(/[0-9][0-9,.]*/g) ?? [],
          String(seen.get(key) ?? "").match(/[0-9][0-9,.]*/g) ?? [],
          `${field}: the two languages carry different values`,
        );
        assert.equal(v.period, seen.get(per), `${field}: the two languages carry different periods`);
      }
      seen.set(key, v.value!);
      seen.set(per, v.period!);
    }
  }
  // Western numerals in Arabic (Law 4), on the figure the Arabic reader sees.
  const arViews = rentIndexEvidenceByField(ADVISOR_ROW as RentIndexCell, { locale: "ar", geography: "العليا، الرياض", now: NOW }, null);
  for (const [, v] of arViews) {
    assert.equal(/[٠-٩۰-۹]/.test(v.value ?? ""), false, "an Arabic passport value used Eastern numerals");
  }
});

test("ADV-1D: the Advisor client carries evidence and never builds it", () => {
  const hook = codeOnly(readFileSync(ADVISOR_HOOK, "utf8"));
  assert.equal(
    /rentIndexEvidence|rentIndexPassports|publicEvidenceView\(/.test(hook),
    false,
    "the client constructs evidence, which puts the surface that displays a figure in charge of vouching for it",
  );
  assert.match(hook, /extra\.passports = ps/, "the value branch stopped carrying the passports through");
  assert.match(hook, /p\.value != null/, "the client stopped dropping withheld views");

  const page = codeOnly(readFileSync(ADVISOR_PAGE, "utf8"));
  assert.equal(
    /rentIndexEvidence|publicEvidenceView\(/.test(page),
    false,
    "the advisor page constructs evidence instead of rendering what it was given",
  );
  assert.match(page, /<EvidencePassport/, "the advisor page stopped rendering the passport");
});

test("Codex gate: the Advisor disclosure is mounted outside the fixed-height band bar", () => {
  // The same placement rule the Rent Index follows, for the same reason. The bar
  // is a fixed-height LTR measure with absolutely positioned children; a
  // `<details>` inside it would expand into a box that does not grow, and the
  // disclosure would overflow the message bubble at 320 pixels.
  const page = codeOnly(readFileSync(ADVISOR_PAGE, "utf8"));
  const track = page.indexOf("borderRadius: 999");
  const mount = page.indexOf("<EvidencePassport");
  const retry = page.indexOf("m.retry &&");
  assert.ok(track > 0 && retry > track, "the band block is not where this test expects it");
  assert.ok(mount > track, "the passport was mounted inside the band bar");
  assert.ok(mount < retry, "the passport moved out of the assistant message block");
});
