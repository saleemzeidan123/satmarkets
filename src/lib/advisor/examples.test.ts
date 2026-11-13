import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { coverageExamples, examplePhrase, rowQuestion, shortPlace, type CoverageRow, type QuestionCopy } from "./examples";
import { ADVISOR_ASSETS, readAdvisorIntent } from "./intent";

// PKG-ADV-5. A suggestion is a question that has an answer.
//
// THE DEFECT THIS EXISTS TO KILL. On 13 November 2026 the deployed Advisor
// offered four starter questions and three of them returned "I do not have
// published Rent Index data for that location". The route held four example
// places under a comment that said each was backed by a published segment, and
// three were not. Nothing checked either list against the index.
//
// Both lists are gone. What these tests hold is the thing that replaced them: a
// question is assembled from a row, and a question assembled from a row is read
// back by the intent reader as the same district and the same asset type, in
// both languages. If that round trip ever breaks, the page would again be
// offering a question it cannot answer, and this file is where it fails.

const ROOT = join(__dirname, "..", "..");
const copy = (loc: string) =>
  JSON.parse(readFileSync(join(ROOT, "i18n", "dictionaries", `${loc}.json`), "utf8")).advisor as QuestionCopy;
const EN = copy("en");
const AR = copy("ar");

/** The seven cells production publishes today, as `/api/index/segments` returned them. */
const PUBLISHED: (CoverageRow & { canonical: string })[] = [
  { district_label: "Al Olaya, Riyadh", district_label_ar: "العليا، الرياض", asset_type: "retail", canonical: "Al Olaya" },
  { district_label: "Al Olaya, Riyadh", district_label_ar: "العليا، الرياض", asset_type: "office", canonical: "Al Olaya" },
  { district_label: "Al Yasmin", district_label_ar: "الياسمين", asset_type: "retail", canonical: "Al Yasmin" },
  { district_label: "Al Malqa", district_label_ar: "الملقا", asset_type: "office", canonical: "Al Malqa" },
  { district_label: "Al Sulaimaniyah", district_label_ar: "السليمانية", asset_type: "office", canonical: "Al Sulaimaniyah" },
  { district_label: "Al Muruj", district_label_ar: "المروج", asset_type: "office", canonical: "Al Muruj" },
  { district_label: "Al Nakheel", district_label_ar: "النخيل", asset_type: "warehouse", canonical: "Al Nakheel" },
];

test("the district is named as a person says it, without the city after a comma", () => {
  assert.equal(shortPlace("Al Olaya, Riyadh"), "Al Olaya");
  assert.equal(shortPlace("العليا، الرياض"), "العليا");
  assert.equal(shortPlace("Al Yasmin"), "Al Yasmin");
  assert.equal(shortPlace(""), "");
});

test("every published row asks its own question and is read back as itself, in both languages", () => {
  for (const row of PUBLISHED) {
    for (const [ar, c] of [[false, EN], [true, AR]] as const) {
      const q = rowQuestion("average", row, ar, c);
      assert.equal(typeof q, "string", `${row.district_label} ${row.asset_type}`);
      const i = readAdvisorIntent(q!);
      assert.equal(i.mode, "value", q!);
      assert.equal(i.asset, row.asset_type, q!);
      assert.equal(i.district, row.canonical, q!);
      assert.equal(i.figure, null, `a suggestion carries no figure: ${q}`);
    }
  }
});

test("the watch and find questions for a row reach the watch and the search", () => {
  for (const row of PUBLISHED) {
    for (const [ar, c] of [[false, EN], [true, AR]] as const) {
      const w = readAdvisorIntent(rowQuestion("watch", row, ar, c)!);
      assert.equal(w.mode, "watch");
      assert.equal(w.district, row.canonical);
      assert.equal(w.asset, row.asset_type);
      const f = readAdvisorIntent(rowQuestion("find", row, ar, c)!);
      assert.equal(f.mode, "search");
      assert.equal(f.district, row.canonical);
      assert.equal(f.asset, row.asset_type);
    }
  }
});

test("every asset type the advisor answers about has a word in both languages, and the word is read back", () => {
  for (const asset of ADVISOR_ASSETS) {
    const row: CoverageRow = { district_label: "Al Olaya, Riyadh", district_label_ar: "العليا، الرياض", asset_type: asset };
    for (const [ar, c] of [[false, EN], [true, AR]] as const) {
      const q = rowQuestion("average", row, ar, c);
      assert.equal(typeof q, "string", `${asset} has no word in ${ar ? "ar" : "en"}`);
      assert.equal(readAdvisorIntent(q!).asset, asset, q!);
    }
  }
});

test("a row whose asset type has no word produces no question rather than a raw key", () => {
  const row: CoverageRow = { district_label: "Al Olaya", district_label_ar: null, asset_type: "data_centre" };
  assert.equal(rowQuestion("average", row, false, EN), null);
  assert.equal(examplePhrase(row, false, EN), null);
});

test("examples name two districts before two asset types in one district", () => {
  assert.equal(coverageExamples(PUBLISHED, false, EN), "retail units in Al Olaya or retail units in Al Yasmin");
  assert.equal(coverageExamples(PUBLISHED, true, AR), "محلات التجزئة في العليا أو محلات التجزئة في الياسمين");
});

test("the place just asked about is never offered back", () => {
  for (const asked of ["Al Olaya", "olaya", "العليا"]) {
    const ex = coverageExamples(PUBLISHED, false, EN, asked);
    assert.equal(ex.includes("Al Olaya"), false, `${asked}: ${ex}`);
    assert.notEqual(ex, "");
  }
  // A place the index does not hold excludes nothing.
  assert.equal(coverageExamples(PUBLISHED, false, EN, "KAFD"), coverageExamples(PUBLISHED, false, EN));
});

test("examples are the index's own order, the same every time", () => {
  const a = coverageExamples(PUBLISHED, false, EN);
  for (let i = 0; i < 5; i++) assert.equal(coverageExamples(PUBLISHED, false, EN), a);
  assert.doesNotMatch(readFileSync(join(ROOT, "lib", "advisor", "examples.ts"), "utf8"), /Math\.random/);
});

test("no rows means no example, and the caller's sentence stands alone", () => {
  assert.equal(coverageExamples([], false, EN), "");
  assert.equal(coverageExamples([], true, AR), "");
});

test("the route holds no list of example places and no random pick", () => {
  const route = readFileSync(join(ROOT, "app", "api", "advisor", "route.ts"), "utf8");
  assert.doesNotMatch(route, /const EXAMPLES\b/);
  assert.doesNotMatch(route, /examplePair\(/);
  assert.doesNotMatch(route, /Math\.random/);
  assert.match(route, /quotableCoverage\(/);
});
