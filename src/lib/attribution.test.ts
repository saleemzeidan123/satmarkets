import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { RENT_INDEX_SOURCE, RENT_INDEX_BASIS, rentIndexSource, rentIndexSourceLabel } from "@/lib/market/attribution";
import { buildValueEvidence, renderValue, detectRequestedSegment } from "@/lib/market/valueEvidence";
import { analyseDeal } from "@/lib/market/analyser";

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
    assert.equal(d.advisor.sourceRega, RENT_INDEX_SOURCE[loc], `${loc}.advisor.sourceRega`);
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

test("the rendered band names REGA in both languages, on both value branches", () => {
  const supported = buildValueEvidence(ROW, null, null)!;
  const mismatch = buildValueEvidence(ROW, detectRequestedSegment("Grade A office in Al Olaya"), null)!;
  assert.equal(mismatch.supportStatus, "segment_mismatch", "the fixture must exercise the scope-refusal branch");
  for (const ev of [supported, mismatch]) {
    assert.ok(renderValue(ev, "en").includes(rentIndexSource(false)), renderValue(ev, "en"));
    assert.ok(renderValue(ev, "ar").includes(rentIndexSource(true)), renderValue(ev, "ar"));
    // The live Arabic defect, stated as the thing that must not happen.
    assert.ok(renderValue(ev, "ar").includes("هيئة العامة للعقار"), "the Arabic band named no authority");
  }
});

test("the deal check names REGA in both languages", () => {
  const base = { rate: "2100", size: "300", band: { band_low: 1800, average: 2180, band_high: 2400 }, unit: "SAR/m2/yr", assetType: "retail", segment: "all", locationLabel: "Al Olaya, Riyadh", period: "2026-Q2" };
  assert.ok(analyseDeal({ ...base, ar: false })!.text.includes(rentIndexSource(false, ": ")));
  assert.ok(analyseDeal({ ...base, locationLabel: "العليا، الرياض", ar: true })!.text.includes(rentIndexSource(true, ": ")));
});

test("no source file names the Rent Index without naming the authority", () => {
  // Strip the canonical clause, then any surviving "(إيجار)" is a composer that
  // wrote its own spelling. This catches spellings not yet invented, which is
  // the point: the four known bad forms were four different inventions.
  const offenders: string[] = [];
  for (const [path, text] of sourceFiles(SRC)) {
    if (SCAN_EXEMPT.has(path)) continue;
    if (text.split(RENT_INDEX_SOURCE.ar).join("").includes("(إيجار)")) offenders.push(path);
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
