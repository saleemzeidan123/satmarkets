import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { RENT_INDEX_SOURCE, RENT_INDEX_BASIS, rentIndexSource, rentIndexSourceLabel } from "@/lib/market/attribution";
import { buildValueEvidence, renderValue, detectRequestedSegment } from "@/lib/market/valueEvidence";
import { analyseDeal } from "@/lib/market/analyser";
import { type RentIndexCell, rentIndexQuoteGate } from "@/lib/rentIndexEvidence";
import { advisorQuoteMessage } from "@/lib/advisor/quote";
import { SAMPLE_STATEMENT } from "@/lib/publicQuote";
import type { SourceRights } from "@/lib/sourceRights";
import { REGA_RENT_INDEX_SOURCE_ID } from "@/lib/sources/catalogue";

/**
 * Strip comments before scanning a file for a string it must not say.
 *
 * The scans below look for a citation of the Rent Index that is not the full
 * attribution. A comment explaining why a composer no longer writes one has to
 * quote the thing it is explaining, and a comment that wraps the canonical
 * clause across a newline leaves half of it behind, which reads to the scan as
 * an unattributed citation. Neither reaches a user. What reaches a user is code.
 */
const codeOnly = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/[^\n]*/g, "$1");

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

const GEO_EN = "Al Olaya, Riyadh";
const GEO_AR = "العليا، الرياض";
const geo = (loc: "en" | "ar") => (loc === "ar" ? GEO_AR : GEO_EN);

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

// Codex remediation Batch 1: Law 8. The Rent Index is derived from the REGA
// Rental Index (Ejar) only. Public copy must never attribute figures to JLL,
// CBRE, Knight Frank or SAMA, and must not claim the index is built from our
// own listing/transaction data. Guards the two shipped-copy surfaces that broke
// the law; the advisor system prompt is excluded on purpose because it
// legitimately instructs the model to NEVER cite those houses.

const llms = readFileSync("public/llms.txt", "utf-8");
const legal = readFileSync("src/lib/legalContent.ts", "utf-8");

test("llms.txt does not attribute figures to banned research houses", () => {
  assert.doesNotMatch(llms, /JLL|CBRE|Knight Frank|\bSAMA\b/);
});
test("llms.txt does not carry the banned 'as compiled by' citation", () => {
  assert.doesNotMatch(llms, /as compiled by/i);
});
test("llms.txt attributes the Rent Index to REGA Rental Index (Ejar)", () => {
  assert.match(llms, /REGA Rental Index \(Ejar\)/);
});
test("Terms does not claim the index is derived from our own listing/transaction data", () => {
  assert.doesNotMatch(legal, /derived from verified listing and transaction data/);
});

// ---------------------------------------------------------------- ADV-3A.1
// Owner ruling 2: every Rent Index reference must retain the required
// attribution to the REGA Rental Index (Ejar).
//
// The four tests above read SHIPPED FILES. That is the hole this section closes.
// Reading the deployed Arabic advisor beside its English twin on the same
// question showed English naming REGA and Arabic naming no authority at all, in
// a sentence no dictionary gate could see because it is composed in TypeScript
// at request time. Three runtime composers had three different Arabic spellings,
// a fourth sat on /ops transliterating the authority as "ريجا", a fifth on
// /proto. So the guard below scans the SOURCE TREE, not the dictionaries: a
// sixth composer added tomorrow with a sixth spelling fails here.

const SRC = "src";

/** Every .ts/.tsx file under src, as [path, contents]. */
function sourceFiles(dir: string, out: [string, string][] = []): [string, string][] {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, e.name);
    if (e.isDirectory()) sourceFiles(full, out);
    else if (/\.tsx?$/.test(e.name)) out.push([full, readFileSync(full, "utf-8")]);
  }
  return out;
}

// attribution.ts quotes the three defective spellings in the comment that
// records why it exists; this file quotes them as needles. Nothing else may.
const SCAN_EXEMPT = new Set([join("src", "lib", "market", "attribution.ts"), join("src", "lib", "attribution.test.ts")]);

test("the canonical source names the authority in both languages", () => {
  assert.match(RENT_INDEX_SOURCE.en, /REGA Rental Index \(Ejar\)/);
  // The Arabic must name the General Real Estate Authority, not merely "the
  // rent index (Ejar)". That omission is the whole defect.
  assert.ok(RENT_INDEX_SOURCE.ar.includes("هيئة العامة للعقار"), RENT_INDEX_SOURCE.ar);
  assert.ok(RENT_INDEX_SOURCE.ar.includes("(إيجار)"), RENT_INDEX_SOURCE.ar);
  assert.equal(rentIndexSource(false), "REGA Rental Index (Ejar), average of registered rental contracts");
  assert.equal(rentIndexSource(true), `${RENT_INDEX_SOURCE.ar}، ${RENT_INDEX_BASIS.ar}`);
  assert.equal(rentIndexSource(false, ": "), `${RENT_INDEX_SOURCE.en}: ${RENT_INDEX_BASIS.en}`);
  assert.equal(rentIndexSource(true, ": "), `${RENT_INDEX_SOURCE.ar}: ${RENT_INDEX_BASIS.ar}`);
});

test("the composed sentences and the shipped dictionary say the same words", () => {
  // claims.test.ts asserts the dictionary side. This asserts they are one string,
  // so a future dictionary edit cannot silently split the two apart again.
  for (const loc of ["en", "ar"] as const) {
    const d = JSON.parse(readFileSync(join("src", "i18n", "dictionaries", `${loc}.json`), "utf-8"));
    // Finding 91. `advisor.sourceRentIndex` is the shipped attribution, and it
    // carries the statistical basis as well as the owner, so the identity check
    // lives here now. `advisor.sourceRega` was a bare authority name a component
    // could print beside any figure; it is now a sentence about permission, and
    // asserting it no longer names REGA is what stops it drifting back.
    assert.equal(d.advisor.sourceRentIndex, rentIndexSource(loc === "ar"), `${loc}.advisor.sourceRentIndex`);
    assert.equal(d.advisor.sourceRega.includes(RENT_INDEX_SOURCE[loc]), false, `${loc}.advisor.sourceRega: ${d.advisor.sourceRega}`);
    assert.equal(d.building.bandSource, RENT_INDEX_SOURCE[loc], `${loc}.building.bandSource`);
  }
});

test("a source we do not recognise is passed through, never relabelled as the Rent Index", () => {
  assert.equal(rentIndexSourceLabel("Riyadh Chamber survey", true), "Riyadh Chamber survey");
  assert.equal(rentIndexSourceLabel("", true), "");
  assert.equal(rentIndexSourceLabel(null, false), "");
  assert.equal(rentIndexSourceLabel(undefined, true), "");
});

test("every stored spelling of the Rent Index source resolves to the canonical clause", () => {
  // The stored column has held "rcri" and the full English name. The Arabic
  // composer used to match "rcri" only, so a row storing the English name printed
  // Latin script inside an Arabic sentence: finding 56 again, one layer down.
  for (const stored of ["rcri", "RCRI", "REGA Rental Index (Ejar)", "ejar"]) {
    assert.equal(rentIndexSourceLabel(stored, true), rentIndexSource(true), stored);
    assert.equal(rentIndexSourceLabel(stored, false), rentIndexSource(false), stored);
    assert.equal(/[A-Za-z]/.test(rentIndexSourceLabel(stored, true)), false, `Latin script in the Arabic label: ${stored}`);
  }
});

const ROW = {
  id: "rip-attr-test",
  district_label: "Al Olaya, Riyadh",
  district_label_ar: "العليا، الرياض",
  asset_type: "office",
  segment: "all",
  unit: "SAR/m2/yr",
  band_low: 1250,
  band_high: 1590,
  median: 1420,
  period: "2026-Q2",
  source: "rcri",
};

test("the rendered band names no source on its own, and names REGA once the gate has authorized it", () => {
  const supported = buildValueEvidence(ROW, null, null)!;
  const mismatch = buildValueEvidence(ROW, detectRequestedSegment("Grade A office in Al Olaya"), null)!;
  assert.equal(mismatch.supportStatus, "segment_mismatch", "the fixture must exercise the scope-refusal branch");
  // Finding 91. renderValue used to append the attribution unconditionally, on
  // every branch, including for a synthetic row whose own passport said the
  // opposite in the same response. The sentence is now silent about provenance.
  for (const ev of [supported, mismatch]) {
    for (const loc of ["en", "ar"] as const) {
      const t = renderValue(ev, loc);
      assert.equal(t.includes(RENT_INDEX_SOURCE[loc]), false, t);
      assert.equal(t.includes(RENT_INDEX_BASIS[loc]), false, t);
    }
  }
  // And the authority is still named, once, when the gate has authorized it.
  for (const loc of ["en", "ar"] as const) {
    const g = rentIndexQuoteGate(cell(), { locale: loc, geography: geo(loc) }, okRights());
    assert.equal(g.mayShowFigure, true, `${loc}: the authorized fixture must show a figure`);
    const msg = advisorQuoteMessage(g, renderValue(supported, loc));
    assert.ok(msg.includes(RENT_INDEX_SOURCE[loc]), msg);
    assert.equal(msg.split(RENT_INDEX_SOURCE[loc]).length - 1, 1, `${loc}: the authority is named more than once`);
  }
  // The live Arabic defect, stated as the thing that must not happen.
  const arMsg = advisorQuoteMessage(
    rentIndexQuoteGate(cell(), { locale: "ar", geography: GEO_AR }, okRights()),
    renderValue(supported, "ar"),
  );
  assert.ok(arMsg.includes("هيئة العامة للعقار"), "the Arabic answer named no authority");
});

test("a sample band is never attributed to REGA, in either language", () => {
  // The deployed defect: a synthetic row whose passport read "Sample data for
  // product testing" was introduced in prose as a REGA figure. One decision now
  // produces both, so the two cannot disagree.
  for (const loc of ["en", "ar"] as const) {
    const g = rentIndexQuoteGate(
      cell({ data_class: "synthetic", is_demo: true }),
      { locale: loc, geography: geo(loc) },
      okRights(),
    );
    assert.equal(g.kind, "labelled_sample", loc);
    const msg = advisorQuoteMessage(g, "1,420");
    assert.ok(msg.includes(SAMPLE_STATEMENT[loc]), msg);
    assert.equal(msg.includes(RENT_INDEX_SOURCE[loc]), false, msg);
    assert.equal(g.proseSource, null, `${loc}: a sample figure carries no source clause`);
  }
});

test("the deal check names no source, because the caller cannot decide one", () => {
  const base = { rate: "2100", size: "300", band: { band_low: 1800, average: 2180, band_high: 2400 }, unit: "SAR/m2/yr", assetType: "retail", segment: "all", locationLabel: "Al Olaya, Riyadh", period: "2026-Q2" };
  assert.equal(analyseDeal({ ...base, ar: false })!.text.includes(RENT_INDEX_SOURCE.en), false);
  assert.equal(analyseDeal({ ...base, locationLabel: GEO_AR, ar: true })!.text.includes(RENT_INDEX_SOURCE.ar), false);
});

test("no source file names the Rent Index without naming the authority", () => {
  // Strip the canonical clause, then any surviving "(إيجار)" is a composer that
  // wrote its own spelling. This catches spellings not yet invented, which is
  // the point: the four known bad forms were four different inventions.
  const offenders: string[] = [];
  for (const [path, text] of sourceFiles(SRC)) {
    if (SCAN_EXEMPT.has(path)) continue;
    if (codeOnly(text).split(RENT_INDEX_SOURCE.ar).join("").includes("(إيجار)")) offenders.push(path);
  }
  assert.deepEqual(offenders, [], `these files name the Rent Index without the REGA attribution: ${offenders.join(", ")}`);
});

test("the four spellings that actually shipped are gone from the source tree", () => {
  const KNOWN_BAD = ["مؤشر الإيجارات (إيجار)", "مؤشر الإيجار (إيجار)", "المؤشر الإيجاري (إيجار)", "مؤشر ريجا للإيجارات (إيجار)"];
  for (const [path, text] of sourceFiles(SRC)) {
    if (SCAN_EXEMPT.has(path)) continue;
    for (const bad of KNOWN_BAD) assert.equal(text.includes(bad), false, `${path} still carries "${bad}"`);
  }
});

test("the exemptions are real files, so a rename cannot silently disable the scan", () => {
  // A Set of paths that no longer exist would exempt nothing and be invisible.
  for (const path of SCAN_EXEMPT) assert.ok(readFileSync(path, "utf-8").length > 0, path);
});

// ------------------------------------------------- ADV-3A.1, second layer
// The source-tree scan above closed five runtime composers and then the live
// Arabic advisor showed a sixth reference, in the market-glimpse card, still
// reading "المؤشر الإيجاري (إيجار)" with no authority named. It was not a
// composer. It was a shipped dictionary string, and the scan reads .ts and .tsx
// only, so it could not have seen it.
//
// Eight keys carried it. In seven of the eight the English named REGA and the
// Arabic did not, which is the same bilingual-parity failure as the composers,
// one layer up. The eighth, advisor.bandLine, named no authority in either
// language. So the guard now scans the dictionaries with the same rule: strip
// the canonical clause, and anything still citing the index is an offender.
//
// The needle is the PARENTHESISED form. Ejar is also a tenancy registry and a
// contract, and "the Ejar lease", "Ejar registration" and the /about glossary
// line are references to that registry rather than to the Rent Index. Those are
// correct as written and must not be swept into the canonical name.

const INDEX_CITATION = { en: "Index (Ejar)", ar: "(إيجار)" } as const;

/** Every string value in a dictionary, with its dotted key path. */
function dictStrings(o: unknown, path = "", out: [string, string][] = []): [string, string][] {
  if (typeof o === "string") out.push([path, o]);
  else if (o && typeof o === "object")
    for (const [k, v] of Object.entries(o as Record<string, unknown>)) dictStrings(v, path ? `${path}.${k}` : k, out);
  return out;
}

test("no shipped dictionary string cites the Rent Index without naming the authority", () => {
  for (const loc of ["en", "ar"] as const) {
    const d = JSON.parse(readFileSync(join("src", "i18n", "dictionaries", `${loc}.json`), "utf-8"));
    const offenders = dictStrings(d)
      .filter(([, v]) => v.split(RENT_INDEX_SOURCE[loc]).join("").includes(INDEX_CITATION[loc]))
      .map(([k]) => k);
    assert.deepEqual(offenders, [], `${loc}: ${offenders.join(", ")}`);
  }
});

test("the eight keys that actually shipped the defect now carry the full attribution", () => {
  // Named individually rather than left to the scan, because a future edit that
  // deletes a key would pass a scan and still lose the attribution from a
  // sentence a reader sees.
  const KEYS = [
    "ld.sourceStrip",
    "advisor.bandLine",
    "advisor.snapshotNote",
    "rentIndex.intro",
    "rentIndex.metaDesc",
    "rentIndex.dsDesc",
    "rentIndex.dsBasedOn",
    "flyer.indexSource",
  ];
  for (const loc of ["en", "ar"] as const) {
    const d = JSON.parse(readFileSync(join("src", "i18n", "dictionaries", `${loc}.json`), "utf-8"));
    const byPath = new Map(dictStrings(d));
    for (const k of KEYS) {
      const v = byPath.get(k);
      assert.equal(typeof v, "string", `${loc}.${k} is missing`);
      assert.ok(v!.includes(RENT_INDEX_SOURCE[loc]), `${loc}.${k}: ${v}`);
    }
  }
});

test("the Ejar tenancy registry is still named as itself, not relabelled as the index", () => {
  // The correction above must not have swept the contract and glossary lines.
  const en = JSON.parse(readFileSync(join("src", "i18n", "dictionaries", "en.json"), "utf-8"));
  const byPath = new Map(dictStrings(en));
  for (const k of ["deal.term5Label", "deal.next2Title", "messages.tlContract"]) {
    const v = byPath.get(k);
    assert.equal(typeof v, "string", k);
    assert.equal(v!.includes(RENT_INDEX_SOURCE.en), false, `${k} was wrongly rewritten: ${v}`);
    assert.ok(/Ejar/.test(v!), k);
  }
});

test("no source file cites the Rent Index in English without naming the authority either", () => {
  // The Arabic half of this rule is the scan above. The English half was never
  // checked, and advisor.bandLine proved the defect is not Arabic-only.
  const offenders: string[] = [];
  for (const [path, text] of sourceFiles(SRC)) {
    if (SCAN_EXEMPT.has(path)) continue;
    if (codeOnly(text).split(RENT_INDEX_SOURCE.en).join("").includes(INDEX_CITATION.en)) offenders.push(path);
  }
  assert.deepEqual(offenders, [], `these files cite the Rent Index in English without REGA: ${offenders.join(", ")}`);
});
