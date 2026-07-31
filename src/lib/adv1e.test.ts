// ADV-1E regression gates. Codex item 8, eight properties, one file.
//
// WHY THESE ARE PROPERTIES AND NOT EXAMPLES.
//
// Finding 90 was not a wrong branch. Every branch involved was individually
// defensible: `sufficient = true` really is a necessary condition, the passport
// really did ask the licence, and the Advisor sentence really was reading the
// published row. The defect lived in the space between them, which is exactly
// the space an example-based test does not occupy. So each gate below either
// quantifies over a matrix of facts, or reads the repository itself and asserts
// a structural rule about which files may reach the table at all.
//
// The eight, in Codex's order:
//
//   1. `published` and `sufficient` cannot override withheld rights.
//   2. `noindex` is not treated as display authorization.
//   3. Synthetic figures always carry sample status.
//   4. Unauthorized figures never reach API or rendered payloads.
//   5. Advisor prose and passport use one decision.
//   6. No source is relabelled as SAT merely because public rights are missing.
//   7. English and Arabic expose identical figures and evidence states.
//   8. Enabling indexing cannot expose synthetic, unknown or withheld data.
//
// THE COMMENT TRAP, WHICH THIS FILE WOULD OTHERWISE WALK INTO.
//
// Gates 2 and 4 scan source files for tokens. Those same tokens appear in the
// prose of the files being scanned, and in the prose above. `codeOnly` strips
// block and line comments before any scan, the same guard `adv4b.test.ts`,
// `catalogue.test.ts`, `inventory.test.ts`, `launchGate.test.ts` and
// `adv1d.test.tsx` already carry, for the same reason each of them carries it.
//
// Paths are bare and relative because `npm test` runs from the repository root.
//
// No em dashes (Law 2).

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";

import {
  type PublicQuoteKind,
  type QuoteFacts,
  SAMPLE_STATEMENT,
  UNAVAILABLE_STATEMENT,
  WITHHELD_STATEMENT,
  QUOTE_STATEMENTS,
  decidePublicQuote,
  decidePublicQuoteNow,
  quoteStatement,
} from "./publicQuote";
import { type RentIndexCell, rentIndexQuoteGate, withheldGate } from "./rentIndexEvidence";
import { SAT_OWN_RECORD, publicSourceText } from "./evidenceView";
import type { SourceRights } from "./sourceRights";
import { previewEnvironmentNow } from "./launchGate";
import { REGA_RENT_INDEX_SOURCE_ID } from "./sources/catalogue";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const codeOnly = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/[^\n]*/g, "$1");

/** U+2014, constructed rather than typed: the Arabic lint forbids the literal. */
const EM_DASH = String.fromCharCode(0x2014);

/** Every non-test TypeScript file in the tree, so a new one cannot opt out. */
function sourceFiles(dir = "src"): string[] {
  const out: string[] = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = `${dir}/${e.name}`;
    if (e.isDirectory()) out.push(...sourceFiles(p));
    else if (/\.tsx?$/.test(e.name) && !/\.test\.tsx?$/.test(e.name)) out.push(p);
  }
  return out;
}

const rights = (over: Partial<SourceRights> = {}): SourceRights => ({
  sourceId: REGA_RENT_INDEX_SOURCE_ID,
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

/** The live row today: asserted but unverified, with O10 written against it. */
const REGA_TODAY = rights({ rightsStatus: "asserted_unverified", stopCondition: "O10 unresolved" });

const facts = (over: Partial<QuoteFacts> = {}): QuoteFacts => ({
  hasValue: true,
  sufficiency: "sufficient",
  recordDemoStatus: "not_flagged",
  dataClass: "real",
  tier: "sourced",
  sourceId: REGA_RENT_INDEX_SOURCE_ID,
  rights: rights(),
  asPublished: true,
  environment: "preview_labelled",
  ...over,
});

const cell = (over: Partial<RentIndexCell> = {}): RentIndexCell => ({
  district_id: "d1",
  asset_type: "office",
  segment: "all",
  unit: "sar_sqm_yr",
  period: "2026-Q2",
  median: 2370,
  band_low: 1780,
  band_high: 3080,
  sufficient: true,
  stat_kind: "average",
  data_class: "real",
  is_demo: false,
  ...over,
});

/** The cross product the quantified gates run over. */
const MATRIX: QuoteFacts[] = [];
for (const hasValue of [true, false]) {
  for (const sufficiency of ["sufficient", "insufficient", "unknown"] as const) {
    for (const recordDemoStatus of ["flagged_simulated", "not_flagged", "unknown"] as const) {
      for (const dataClass of ["real", "synthetic", null]) {
        for (const tier of ["entered", "verified", "computed", "sourced"] as const) {
          for (const sourceId of [REGA_RENT_INDEX_SOURCE_ID, null]) {
            for (const r of [rights(), REGA_TODAY, rights({ redisplayPolicy: "internal", derivedDisplayPolicy: "internal" }), null]) {
              for (const environment of ["preview_labelled", "production_unlabelled"] as const) {
                MATRIX.push(facts({ hasValue, sufficiency, recordDemoStatus, dataClass, tier, sourceId, rights: r, asPublished: true, environment }));
              }
            }
          }
        }
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Gate 1. Publication and sufficiency cannot override withheld rights
// ---------------------------------------------------------------------------

test("gate 1: a sufficient, published, real cell is still withheld when the licence is unread", () => {
  const d = decidePublicQuote(facts({ rights: null }));
  assert.equal(d.kind, "withheld");
  assert.equal(d.mayShowFigure, false);
  assert.deepEqual(d.reasons, ["third_party_rights_unread"]);
});

test("gate 1: a recorded stop condition withholds even when every policy column says public", () => {
  const d = decidePublicQuote(facts({ rights: REGA_TODAY }));
  assert.equal(d.kind, "withheld");
  assert.deepEqual(d.reasons, ["third_party_stop_condition_recorded"]);
});

test("gate 1: the status ceiling withholds an asserted row whose columns say public", () => {
  const d = decidePublicQuote(facts({ rights: rights({ rightsStatus: "asserted_unverified" }) }));
  assert.equal(d.kind, "withheld");
  assert.deepEqual(d.reasons, ["third_party_display_not_public"]);
});

test("gate 1: sufficiency is never sufficient on its own, across the whole matrix", () => {
  for (const f of MATRIX) {
    if (f.sufficiency !== "sufficient") continue;
    if (f.tier !== "sourced" && f.sourceId === null) continue;
    if (f.recordDemoStatus === "flagged_simulated" || f.dataClass === "synthetic") continue;
    const d = decidePublicQuote(f);
    if (d.mayShowFigure) {
      // The only way through is a readable, evidenced, publicly permitted row.
      assert.ok(f.rights, "a figure was shown with no rights row");
      assert.equal(f.rights?.rightsStatus, "evidenced");
      assert.equal(f.rights?.stopCondition, null);
    }
  }
});

test("gate 1: the input type carries no notion of being published", () => {
  const keys = Object.keys(facts());
  for (const banned of ["published", "status", "isPublished", "route"]) {
    assert.equal(keys.includes(banned), false, `${banned} must not be an input to the decision`);
  }
});

// ---------------------------------------------------------------------------
// Gate 2. noindex is not display authorization
// ---------------------------------------------------------------------------

test("gate 2: the decision cannot see indexing, robots headers, banners or CSS", () => {
  const keys = Object.keys(facts()).join(" ").toLowerCase();
  for (const banned of ["index", "robot", "banner", "css", "hidden", "visible"]) {
    assert.equal(keys.includes(banned), false, `${banned} must not be an input to the decision`);
  }
});

test("gate 2: publicQuote.ts and rentIndexEvidence.ts reference no indexing signal in code", () => {
  for (const f of ["src/lib/publicQuote.ts", "src/lib/rentIndexEvidence.ts"]) {
    const src = codeOnly(readFileSync(f, "utf8"));
    assert.equal(/noindex/i.test(src), false, `${f} reads noindex`);
    assert.equal(/robots/i.test(src), false, `${f} reads a robots signal`);
    assert.equal(/X-Robots/i.test(src), false, `${f} reads the robots header`);
  }
});

test("gate 2: noindex remains a response header and is set in exactly one place", () => {
  const owners = sourceFiles().filter((f) => /X-Robots-Tag/.test(codeOnly(readFileSync(f, "utf8"))));
  assert.deepEqual(owners, ["src/middleware.ts"]);
});

// ---------------------------------------------------------------------------
// Gate 3. Synthetic figures always carry sample status
// ---------------------------------------------------------------------------

test("gate 3: a synthetic figure is never authorized public, whatever else is true", () => {
  for (const f of MATRIX) {
    if (f.recordDemoStatus !== "flagged_simulated" && f.dataClass !== "synthetic") continue;
    if (!f.hasValue || f.sufficiency !== "sufficient") continue;
    const d = decidePublicQuote(f);
    assert.notEqual(d.kind, "authorized_public");
    if (d.mayShowFigure) {
      assert.equal(d.kind, "labelled_sample");
      assert.equal(d.requiresSampleStatement, true);
      assert.equal(quoteStatement(d.kind, false), SAMPLE_STATEMENT.en);
      assert.equal(quoteStatement(d.kind, true), SAMPLE_STATEMENT.ar);
    } else {
      assert.equal(d.kind, "withheld");
      assert.equal(f.environment, "production_unlabelled");
    }
  }
});

test("gate 3: a shown synthetic cell always hands its surface the sample sentence", () => {
  for (const row of [cell({ is_demo: true, data_class: "synthetic" }), cell({ is_demo: true, data_class: null }), cell({ is_demo: null, data_class: "synthetic" })]) {
    const g = rentIndexQuoteGate(row, { locale: "en" }, rights());
    if (!g.mayShowFigure) continue;
    assert.equal(g.kind, "labelled_sample");
    assert.equal(g.statement, SAMPLE_STATEMENT.en);
  }
});

test("gate 3: the sample sentence says both halves, in both languages", () => {
  assert.match(SAMPLE_STATEMENT.en, /Sample data/);
  assert.match(SAMPLE_STATEMENT.en, /Not a published market figure/);
  assert.ok(SAMPLE_STATEMENT.ar.length > 0);
  assert.notEqual(SAMPLE_STATEMENT.ar, SAMPLE_STATEMENT.en);
});

// ---------------------------------------------------------------------------
// Gate 4. Unauthorized figures never reach an API or a rendered payload
// ---------------------------------------------------------------------------

test("gate 4: every file that queries rent_index_published passes it through the decision", () => {
  const offenders: string[] = [];
  for (const f of sourceFiles()) {
    const src = codeOnly(readFileSync(f, "utf8"));
    if (!src.includes('from("rent_index_published")')) continue;
    if (!/@\/lib\/market\/quotable|@\/lib\/rentIndexEvidence/.test(src)) offenders.push(f);
  }
  assert.deepEqual(offenders, [], "these read the index table without the quote decision");
});

test("gate 4: the readers are the set we audited, so a new one has to be added deliberately", () => {
  const readers = sourceFiles().filter((f) => codeOnly(readFileSync(f, "utf8")).includes('from("rent_index_published")'));
  // Fourteen: nine rendered routes, four API routes and the shared KPI loader.
  assert.equal(readers.length, 14);
  for (const expected of [
    "src/app/api/advisor/route.ts",
    "src/app/api/advisor/shortlist/route.ts",
    "src/app/api/index/segments/route.ts",
    "src/app/api/saved/route.ts",
    "src/lib/market/published.ts",
  ]) {
    assert.ok(readers.includes(expected), `${expected} is no longer a known reader`);
  }
});

test("gate 4: a withheld cell hands the caller no figure and no passport", () => {
  const g = rentIndexQuoteGate(cell(), { locale: "en" }, REGA_TODAY);
  assert.equal(g.mayShowFigure, false);
  assert.deepEqual(g.passports, []);
  assert.equal(g.statement, WITHHELD_STATEMENT.en);
});

// ---------------------------------------------------------------------------
// Gate 5. Prose and passport are one decision
// ---------------------------------------------------------------------------

test("gate 5: passports exist exactly when the figure may be shown", () => {
  const rows = [cell(), cell({ is_demo: true, data_class: "synthetic" }), cell({ sufficient: false }), cell({ median: null, band_low: null, band_high: null }), cell({ is_demo: null, data_class: null })];
  for (const r of [rights(), REGA_TODAY, null]) {
    for (const row of rows) {
      const g = rentIndexQuoteGate(row, { locale: "en" }, r);
      if (g.mayShowFigure) assert.ok(g.statement === null || g.statement === SAMPLE_STATEMENT.en);
      else {
        assert.deepEqual(g.passports, [], "a withheld figure carried a passport");
        assert.notEqual(g.statement, null, "a withheld figure carried no explanation");
      }
    }
  }
});

test("gate 5: the Advisor route reaches the figure only through the shared gate", () => {
  const src = codeOnly(readFileSync("src/app/api/advisor/route.ts", "utf8"));
  assert.ok(src.includes("rentIndexQuoteGate"), "the Advisor route no longer calls the gate");
  assert.equal(src.includes("decidePublicQuote"), false, "the Advisor route decides for itself");
});

test("gate 5: no surface outside the two decision modules calls decidePublicQuote directly", () => {
  const callers = sourceFiles().filter((f) => {
    const src = codeOnly(readFileSync(f, "utf8"));
    return /decidePublicQuote(Now)?\s*\(/.test(src);
  });
  assert.deepEqual(callers.sort(), ["src/lib/evidenceView.ts", "src/lib/publicQuote.ts"]);
});

test("gate 5: the fallback verdict is a refusal and never a silence", () => {
  for (const locale of ["en", "ar"] as const) {
    const g = withheldGate(locale);
    assert.equal(g.mayShowFigure, false);
    assert.deepEqual(g.passports, []);
    assert.equal(g.statement, UNAVAILABLE_STATEMENT[locale]);
  }
});

// ---------------------------------------------------------------------------
// Gate 6. No source laundering
// ---------------------------------------------------------------------------

test("gate 6: SAT's own record can be claimed only by a genuine first-party value", () => {
  for (const f of MATRIX) {
    const d = decidePublicQuote(f);
    if (!d.mayNameSatOwnRecord) continue;
    assert.deepEqual(d.reasons, ["first_party_record"]);
    assert.equal(f.sourceId, null, "a sourced figure was relabelled as SAT's own");
    assert.notEqual(f.tier, "sourced");
    assert.notEqual(f.recordDemoStatus, "flagged_simulated");
    assert.notEqual(f.dataClass, "synthetic");
  }
});

test("gate 6: a missing licence withholds rather than falling through to first party", () => {
  for (const tier of ["entered", "verified", "computed", "sourced"] as const) {
    const d = decidePublicQuote(facts({ tier, rights: null }));
    assert.equal(d.kind, "withheld");
    assert.equal(d.mayNameSatOwnRecord, false);
  }
});

test("gate 6: a rights row for a different source is a mismatch, not a permission", () => {
  const d = decidePublicQuote(facts({ rights: rights({ sourceId: "some_other_source" }) }));
  assert.equal(d.kind, "withheld");
  assert.deepEqual(d.reasons, ["third_party_rights_mismatch"]);
});

test("gate 6: the phrase 'SAT Markets own record' is written in exactly one module", () => {
  // A structural gate rather than a behavioural one, because the defect this
  // guards is not a wrong branch, it is a second copy of the right branch. The
  // Rent Index table and the Evidence Passport each answered "who says so" with
  // their own hand-written ladder, and the phrase that had to stay reserved was
  // sitting in both. One writer, read by everyone, is the only arrangement in
  // which `mayNameSatOwnRecord` actually gates the claim.
  const writers = sourceFiles().filter((f) =>
    /SAT Markets own record/.test(codeOnly(readFileSync(f, "utf8"))),
  );
  assert.deepEqual(writers, ["src/lib/evidenceView.ts"]);
  // And the Arabic twin travels with it, so a surface cannot localise the claim
  // independently and drift out of the same reservation.
  //
  // The lookbehind is not decoration. Arabic prefixes attach without a space, so
  // a plain substring search finds the reserved phrase inside ordinary verbs:
  // `decisionPack.ts` says "تسجل سات ماركتس المساحة" ("SAT Markets records the
  // area"), which contains "سجل سات ماركتس" and is not a source claim at all.
  // Matching that would have made this gate cry wolf on its first run, and a
  // gate that cries wolf is a gate someone deletes.
  const arWriters = sourceFiles().filter((f) =>
    new RegExp(`(?<![\\u0600-\\u06FF])${SAT_OWN_RECORD.ar}`).test(codeOnly(readFileSync(f, "utf8"))),
  );
  assert.deepEqual(arWriters, ["src/lib/evidenceView.ts"]);
});

test("gate 6: the shared source text never names SAT for a sourced or sample view", () => {
  const base = {
    field: "rent_index_average",
    label: "Average",
    value: "1,420",
    source: null,
    mayNameSatOwnRecord: false,
    quote: "authorized_public" as PublicQuoteKind,
  };
  const named = publicSourceText({ ...base, mayNameSatOwnRecord: true } as any, false);
  assert.equal(named, SAT_OWN_RECORD.en);
  assert.equal(publicSourceText({ ...base, mayNameSatOwnRecord: true } as any, true), SAT_OWN_RECORD.ar);
  // The three views that must never reach that phrase: a third party we may not
  // name, a sample row, and a withheld figure.
  for (const v of [
    { ...base, quote: "withheld" as PublicQuoteKind },
    { ...base, quote: "unavailable" as PublicQuoteKind },
    { ...base, quote: "labelled_sample" as PublicQuoteKind },
  ]) {
    for (const ar of [false, true]) {
      const t = publicSourceText(v as any, ar);
      assert.notEqual(t, SAT_OWN_RECORD.en);
      assert.notEqual(t, SAT_OWN_RECORD.ar);
      assert.ok(t.trim().length > 0, "the field states its absence rather than going blank");
    }
  }
});

// ---------------------------------------------------------------------------
// Gate 7. English and Arabic expose identical figures and evidence states
// ---------------------------------------------------------------------------

test("gate 7: the decision is identical in both languages, figure for figure", () => {
  const rows = [cell(), cell({ is_demo: true, data_class: "synthetic" }), cell({ sufficient: false }), cell({ median: null }), cell({ median: null, band_low: null, band_high: null }), cell({ is_demo: null, data_class: null })];
  for (const r of [rights(), REGA_TODAY, rights({ rightsStatus: "prohibited" }), null]) {
    for (const row of rows) {
      const en = rentIndexQuoteGate(row, { locale: "en" }, r);
      const ar = rentIndexQuoteGate(row, { locale: "ar" }, r);
      assert.equal(en.kind, ar.kind);
      assert.equal(en.mayShowFigure, ar.mayShowFigure);
      assert.equal(en.passports.length, ar.passports.length);
      assert.equal(en.statement === null, ar.statement === null);
      if (en.statement !== null) assert.notEqual(en.statement, ar.statement);
    }
  }
});

test("gate 7: every public sentence has an Arabic twin and the two are distinct", () => {
  for (const s of QUOTE_STATEMENTS) {
    assert.ok(s.en.trim().length > 0);
    assert.ok(s.ar.trim().length > 0);
    assert.notEqual(s.en, s.ar);
    // Law 2 travels with the copy, not only with the code. The character is
    // built from its code point rather than written literally, because
    // `scripts/ar-lint.mjs` Sweep B bans the literal em dash in every source
    // file under `src` and would otherwise reject this test for the very
    // character it exists to forbid.
    assert.equal(s.en.includes(EM_DASH), false);
    assert.equal(s.ar.includes(EM_DASH), false);
    // Law 4: Western numerals in both locales, so no Arabic-Indic digits.
    assert.equal(/[٠-٩۰-۹]/.test(s.ar), false);
  }
});

test("gate 7: each kind resolves to one sentence per language and no kind is silent by accident", () => {
  const kinds: PublicQuoteKind[] = ["authorized_public", "labelled_sample", "withheld", "unavailable"];
  for (const k of kinds) {
    const en = quoteStatement(k, false);
    const ar = quoteStatement(k, true);
    assert.equal(en === null, ar === null);
    if (k === "authorized_public") assert.equal(en, null);
    else assert.notEqual(en, null);
  }
});

// ---------------------------------------------------------------------------
// Gate 8. Turning indexing on cannot expose sample, unknown or withheld data
// ---------------------------------------------------------------------------

test("gate 8: leaving the labelled preview withholds every synthetic figure", () => {
  for (const f of MATRIX) {
    if (f.recordDemoStatus !== "flagged_simulated" && f.dataClass !== "synthetic") continue;
    if (!f.hasValue || f.sufficiency !== "sufficient") continue;
    if (f.environment !== "production_unlabelled") continue;
    const d = decidePublicQuote(f);
    assert.equal(d.mayShowFigure, false);
    assert.deepEqual(d.reasons, ["flagged_simulated_outside_labelled_preview"]);
  }
});

test("gate 8: an unknown demo status is read as sourced, which asks the licence", () => {
  const g = rentIndexQuoteGate(cell({ is_demo: null, data_class: null }), { locale: "en" }, null);
  assert.equal(g.mayShowFigure, false);
  assert.equal(g.statement, WITHHELD_STATEMENT.en);
});

test("gate 8: the production environment is read at call time, not captured at import", () => {
  const before = process.env.SITE_ENV;
  const beforePublic = process.env.NEXT_PUBLIC_SITE_ENV;
  try {
    process.env.SITE_ENV = "production";
    process.env.NEXT_PUBLIC_SITE_ENV = "production";
    assert.equal(previewEnvironmentNow(), "production_unlabelled");
    const d = decidePublicQuoteNow({
      hasValue: true,
      sufficiency: "sufficient",
      recordDemoStatus: "flagged_simulated",
      dataClass: "synthetic",
      tier: "computed",
      sourceId: null,
      rights: null,
      asPublished: false,
    });
    assert.equal(d.kind, "withheld");
    assert.equal(d.mayShowFigure, false);
  } finally {
    if (before === undefined) delete process.env.SITE_ENV;
    else process.env.SITE_ENV = before;
    if (beforePublic === undefined) delete process.env.NEXT_PUBLIC_SITE_ENV;
    else process.env.NEXT_PUBLIC_SITE_ENV = beforePublic;
  }
});

test("gate 8: the same production environment still withholds an unread third-party licence", () => {
  const d = decidePublicQuote(facts({ environment: "production_unlabelled", rights: null }));
  assert.equal(d.kind, "withheld");
  assert.equal(d.mayShowFigure, false);
});
