import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { type RentIndexCell, rentIndexEvidenceViews, rentIndexQuoteGate, withheldGate } from "@/lib/rentIndexEvidence";
import { publicSourceText } from "@/lib/evidenceView";
import { advisorQuoteMessage } from "@/lib/advisor/quote";
import { SAMPLE_STATEMENT, SOURCE_NOT_DISCLOSED, UNAVAILABLE_STATEMENT, WITHHELD_STATEMENT } from "@/lib/publicQuote";
import { RENT_INDEX_SOURCE } from "@/lib/market/attribution";
import { toPublicSegment } from "@/lib/market/segments";
import type { SourceRights } from "@/lib/sourceRights";
import { REGA_RENT_INDEX_SOURCE_ID } from "@/lib/sources/catalogue";

// FINDING 91. THE ATTRIBUTION IS PART OF THE QUOTE DECISION, NOT BESIDE IT.
//
// ADV-1E made the FIGURE decision canonical: one function decides whether a
// number may be shown, and prose, APIs and passports all read it. What it did
// not make canonical was the SOURCE NAME. Codex item 7's live run found the
// consequence in the deployed Advisor: for a synthetic row, the answer ended
//
//   "Source: REGA Rental Index (Ejar), average of registered rental contracts."
//
// while the Evidence Passport printed immediately below it, describing the same
// number, read
//
//   "Source: Sample data for product testing. Not a published market figure."
//
// with `source: null` and a gate verdict of `labelled_sample`. The API payload
// for the same request shipped `band.source = "REGA Rental Index (Ejar)"`.
//
// Root cause: `buildValueEvidence` defaulted a null source column to the literal
// authority name, and `renderValue` printed it unconditionally. Three Codex
// rules broke at once. Item 5, prose and passport must never disagree. Item 3,
// synthetic data must not be described as REGA market evidence. Item 1, one
// decision for server rendering, APIs, Advisor prose, passports and
// machine-readable outputs.
//
// The correction removes source naming from the composers entirely and moves it
// onto the gate, so the tests below assert one thing in many shapes: whatever
// decides the figure also decides the name, and nothing downstream may write
// its own.

const okRights = (over: Partial<SourceRights> = {}): SourceRights => ({
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

// `geography` is not decoration. Without it the gate yields no value, no source
// and an "empty" state, and every assertion below would pass for the wrong
// reason.
const GEO = { en: "Al Olaya, Riyadh", ar: "العليا، الرياض" } as const;
const opts = (loc: "en" | "ar") => ({ locale: loc, geography: GEO[loc] }) as const;

const cell = (over: Partial<RentIndexCell> = {}): RentIndexCell => ({
  district_id: "d1",
  asset_type: "office",
  segment: "all",
  unit: "sar_sqm_yr",
  period: "2026-Q2",
  median: 1420,
  band_low: 1250,
  band_high: 1590,
  sufficient: true,
  stat_kind: "average",
  data_class: "real",
  is_demo: false,
  ...over,
});

const LOCALES = ["en", "ar"] as const;

// The four meanings Codex item 1 requires the boundary to distinguish, plus the
// statistical case, each expressed as a row and a rights record rather than as a
// flag someone can set.
const STATES = [
  { name: "authorized public evidence", row: cell(), rights: okRights(), kind: "authorized_public" },
  { name: "labelled preview sample", row: cell({ data_class: "synthetic", is_demo: true }), rights: okRights(), kind: "labelled_sample" },
  { name: "withheld, rights unread", row: cell(), rights: null, kind: "withheld" },
  {
    name: "withheld, display not public",
    row: cell(),
    rights: okRights({ redisplayPolicy: "internal", derivedDisplayPolicy: "internal" }),
    kind: "withheld",
  },
  { name: "unavailable, sample insufficient", row: cell({ sufficient: false }), rights: okRights(), kind: "unavailable" },
] as const;

test("finding 91: the figure, the statement and the source name always agree", () => {
  for (const s of STATES) {
    for (const loc of LOCALES) {
      const ar = loc === "ar";
      const views = rentIndexEvidenceViews(s.row, opts(loc), s.rights);
      const g = rentIndexQuoteGate(s.row, opts(loc), s.rights);
      const label = `${s.name} (${loc})`;

      assert.equal(g.kind, s.kind, label);

      // The second hole. The gate consulted the quote decision but not
      // publishability, so a passport that had already emptied its own value
      // still authorized prose to print one. `mayShowFigure` is now true only
      // when a passport actually carries a number.
      const carried = views.filter((v) => v.value !== null);
      assert.equal(g.mayShowFigure, carried.length > 0, `${label}: mayShowFigure disagrees with the passports`);
      assert.equal(g.passports.length, carried.length, `${label}: passport count`);

      if (g.mayShowFigure) {
        // Containment, not equality. The prose clause may carry the statistical
        // basis that the passport shows in its own field, which is more
        // precision about the same party. What it may never do is name a party
        // the passport does not.
        assert.ok(
          g.sourceText.includes(publicSourceText(carried[0], ar)),
          `${label}: prose source and lead passport source differ: ${g.sourceText} / ${publicSourceText(carried[0], ar)}`,
        );
      } else {
        assert.equal(g.proseSource, null, `${label}: a withheld figure carries a source clause`);
        assert.equal(g.sourceText, SOURCE_NOT_DISCLOSED[loc], `${label}: sourceText`);
        assert.equal(g.passports.length, 0, `${label}: passports survive a withheld figure`);
      }
    }
  }
});

test("finding 91: English and Arabic reach the same verdict on the same row", () => {
  for (const s of STATES) {
    const en = rentIndexQuoteGate(s.row, opts("en"), s.rights);
    const ar = rentIndexQuoteGate(s.row, opts("ar"), s.rights);
    assert.equal(en.kind, ar.kind, `${s.name}: kind`);
    assert.equal(en.mayShowFigure, ar.mayShowFigure, `${s.name}: mayShowFigure`);
    assert.equal(en.passports.length, ar.passports.length, `${s.name}: passport count`);
    assert.equal(en.statement === null, ar.statement === null, `${s.name}: statement presence`);
  }
});

test("finding 91: an authorized figure is attributed, once, in the reader's language", () => {
  for (const loc of LOCALES) {
    const g = rentIndexQuoteGate(cell(), opts(loc), okRights());
    assert.equal(g.mayShowFigure, true, loc);
    const msg = advisorQuoteMessage(g, "1,420");
    assert.ok(msg.includes(RENT_INDEX_SOURCE[loc]), `${loc}: ${msg}`);
    assert.equal(msg.split(RENT_INDEX_SOURCE[loc]).length - 1, 1, `${loc}: named more than once: ${msg}`);
    assert.equal(msg.includes(SAMPLE_STATEMENT[loc]), false, `${loc}: real evidence labelled as sample: ${msg}`);
  }
});

test("finding 91: a sample figure carries the sample statement and never the authority", () => {
  for (const loc of LOCALES) {
    const ar = loc === "ar";
    const row = cell({ data_class: "synthetic", is_demo: true });
    const g = rentIndexQuoteGate(row, opts(loc), okRights());
    assert.equal(g.kind, "labelled_sample", loc);
    const msg = advisorQuoteMessage(g, "1,420");
    assert.ok(msg.includes(SAMPLE_STATEMENT[loc]), `${loc}: ${msg}`);
    assert.equal(msg.includes(RENT_INDEX_SOURCE[loc]), false, `${loc}: sample data attributed to REGA: ${msg}`);
    assert.equal(g.proseSource, null, loc);
    for (const v of g.passports) {
      assert.equal(v.source, null, `${loc}: a sample passport named a source`);
      assert.equal(publicSourceText(v, ar), SAMPLE_STATEMENT[loc], loc);
    }
  }
});

test("finding 91: a withheld or absent figure produces a statement and no number", () => {
  for (const loc of LOCALES) {
    const w = rentIndexQuoteGate(cell(), opts(loc), null);
    const wMsg = advisorQuoteMessage(w, "1,420");
    assert.equal(wMsg, WITHHELD_STATEMENT[loc], `${loc}: ${wMsg}`);
    assert.equal(wMsg.includes("1,420"), false, `${loc}: the withheld figure reached the reader`);
    assert.equal(wMsg.includes(RENT_INDEX_SOURCE[loc]), false, `${loc}: a withheld figure named its source`);

    const a = rentIndexQuoteGate(cell({ median: null, band_low: null, band_high: null }), opts(loc), okRights());
    const aMsg = advisorQuoteMessage(a, "1,420");
    assert.equal(aMsg, UNAVAILABLE_STATEMENT[loc], `${loc}: ${aMsg}`);

    // Withheld and unavailable are different facts about the world. "We hold a
    // figure you may not have" must never read as "no figure exists".
    assert.notEqual(wMsg, aMsg, loc);
  }
});

test("finding 91: the fallback verdict names nothing at all", () => {
  for (const loc of LOCALES) {
    const g = withheldGate(loc);
    assert.equal(g.mayShowFigure, false, loc);
    assert.equal(g.proseSource, null, loc);
    assert.equal(g.sourceText, SOURCE_NOT_DISCLOSED[loc], loc);
    assert.deepEqual(g.passports, [], loc);
    assert.equal(g.sourceText.includes(RENT_INDEX_SOURCE[loc]), false, loc);
  }
});

test("finding 91: the public segment payload serialises the decision, never the column", () => {
  // The stored column said "rega_ejar" for the synthetic rows that shipped the
  // defect. The payload must carry what we may say, not what we read.
  const row = { district_label: "Al Olaya, Riyadh", district_label_ar: "العليا، الرياض", district_id: "d1", asset_type: "office", segment: "all", unit: "sar_sqm_yr", period: "2026-Q2", median: 1420, band_low: 1250, band_high: 1590, source: "rega_ejar" };
  for (const loc of LOCALES) {
    const sample = rentIndexQuoteGate(cell({ data_class: "synthetic", is_demo: true }), opts(loc), okRights());
    const pub = toPublicSegment(row, sample.sourceText) as Record<string, unknown>;
    assert.equal(pub.source, SAMPLE_STATEMENT[loc], loc);
    assert.notEqual(pub.source, row.source, loc);

    const held = rentIndexQuoteGate(cell(), opts(loc), null);
    const heldPub = toPublicSegment(row, held.sourceText) as Record<string, unknown>;
    assert.equal(heldPub.source, SOURCE_NOT_DISCLOSED[loc], loc);
  }
});

test("finding 91: the corrected composers hold no attribution helper of their own", () => {
  // Comments have to quote what they explain. Only code is scanned.
  const codeOnly = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/[^\n]*/g, "$1");
  const ROOT = join(__dirname, "..");

  // `rentIndexEvidence.ts` is excluded on purpose: it is the gate, and the gate
  // is the one place allowed to decide a source name.
  const COMPOSERS = [
    "lib/market/valueEvidence.ts",
    "lib/market/analyser.ts",
    "lib/market/segments.ts",
    "app/api/advisor/route.ts",
    "app/api/index/segments/route.ts",
  ];
  const BANNED = ["rentIndexSource", "rentIndexSourceLabel", "RENT_INDEX_SOURCE", "RENT_INDEX_BASIS"];

  for (const rel of COMPOSERS) {
    const code = codeOnly(readFileSync(join(ROOT, rel), "utf-8"));
    for (const banned of BANNED) {
      // Word boundaries, not substring: `REGA_RENT_INDEX_SOURCE_ID` contains
      // `RENT_INDEX_SOURCE`, and a route that legitimately reads the rights row
      // for that source id is not composing an attribution. `_` is a word
      // character, so `\b` refuses to match inside the longer identifier.
      assert.equal(new RegExp(`\\b${banned}\\b`).test(code), false, `${rel} composes its own attribution via ${banned}`);
    }
    for (const loc of LOCALES) {
      for (const line of code.split("\n")) {
        // The Advisor system prompt spells the canonical English attribution so
        // the model can refuse a wrong one. That is knowledge given to a model,
        // never a clause printed beside a number. The exemption is per line
        // rather than per file, so a new hardcoded clause in the same route
        // still fails here.
        if (line.includes("instruction(") || line.includes("phrase`")) continue;
        assert.equal(line.includes(RENT_INDEX_SOURCE[loc]), false, `${rel} hardcodes the ${loc} attribution: ${line.trim()}`);
      }
    }
  }
});
