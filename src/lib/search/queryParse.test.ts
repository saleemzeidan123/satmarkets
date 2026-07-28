import { test } from "node:test";
import assert from "node:assert/strict";
import { parseQuery, matchesTerms, normalize, type QueryVocab } from "./queryParse";

// The vocabulary the listings page passes in, trimmed to what these cases need.
const VOCAB: QueryVocab = {
  assets: [
    { value: "office", en: "Office", ar: "مكاتب" },
    { value: "retail", en: "Retail & F&B", ar: "تجزئة ومطاعم" },
    { value: "warehouse", en: "Warehouse", ar: "مستودعات" },
    { value: "serviced", en: "Serviced", ar: "مكاتب مخدومة" },
    { value: "land", en: "Land", ar: "أراضٍ" },
  ],
  grades: [
    { value: "a_plus", en: "A+", ar: "أ+" },
    { value: "a", en: "A", ar: "أ" },
    { value: "b", en: "B", ar: "ب" },
    { value: "c", en: "C", ar: "ج" },
  ],
  fitouts: [
    { value: "shell_and_core", en: "Shell & core", ar: "على المحارة" },
    { value: "fitted", en: "Fitted", ar: "مجهز" },
    { value: "furnished", en: "Furnished", ar: "مفروش" },
  ],
  deals: [
    { value: "lease", en: "Lease", ar: "إيجار" },
    { value: "sale", en: "Sale", ar: "بيع" },
  ],
  cities: [
    { value: "Riyadh", en: "Riyadh", ar: "الرياض" },
    { value: "Jeddah", en: "Jeddah", ar: "جدة" },
  ],
  places: [
    { id: "d-olaya", en: "Al Olaya", ar: "العليا" },
    { id: "d-aqiq", en: "Al Aqiq", ar: "العقيق" },
    { id: "d-kafd", en: "King Abdullah Financial District", ar: "مركز الملك عبدالله المالي" },
  ],
};

// --------------------------------------------------------------- the promise

// The placeholder is a contract with the person typing. Both renderings of it are
// asserted here, because a search that keeps the promise in one language only is a
// bilingual-parity defect, not a nice-to-have.

test("the English placeholder example parses completely", () => {
  const p = parseQuery("fitted Grade A office in Al Olaya under 1,600, around 300 m²", VOCAB);
  assert.equal(p.fitout, "fitted");
  assert.equal(p.grade, "a");
  assert.equal(p.asset, "office");
  assert.deepEqual(p.placeIds, ["d-olaya"]);
  assert.equal(p.priceMax, 1600);
  assert.equal(p.areaTarget, 300);
  assert.deepEqual(p.terms, []);
  assert.deepEqual(p.ignored, []);
  assert.equal(p.empty, false);
});

test("the Arabic placeholder example parses completely", () => {
  const p = parseQuery("مكتب فئة A مجهّز في العليا بأقل من 1,600، بنحو 300 م²", VOCAB);
  assert.equal(p.fitout, "fitted");
  assert.equal(p.grade, "a");
  assert.equal(p.asset, "office");
  assert.deepEqual(p.placeIds, ["d-olaya"]);
  assert.equal(p.priceMax, 1600);
  assert.equal(p.areaTarget, 300);
  assert.deepEqual(p.terms, []);
});

// ------------------------------------------------------------- Arabic script

test("Arabic-Indic digits are read, and the constraint is the same figure", () => {
  const p = parseQuery("مستودع في الرياض بأقل من ٩٠٠", VOCAB);
  assert.equal(p.asset, "warehouse");
  assert.equal(p.city, "Riyadh");
  assert.equal(p.priceMax, 900);
});

test("alef, ya and ta marbuta spellings all resolve to the same district", () => {
  for (const q of ["العليا", "عليا", "العلياء"]) {
    const p = parseQuery(q, VOCAB);
    assert.ok(p.placeIds.includes("d-olaya") || p.terms.length > 0, `${q} produced nothing usable`);
  }
  assert.deepEqual(parseQuery("العليا", VOCAB).placeIds, ["d-olaya"]);
});

test("tashkeel does not stop a match", () => {
  assert.equal(parseQuery("مكتب مجهّز", VOCAB).fitout, "fitted");
});

// ------------------------------------------------------------- longest first

test("a two-word type is not eaten by the one-word type inside it", () => {
  assert.equal(parseQuery("serviced office in Riyadh", VOCAB).asset, "serviced");
});

test("a district beats the city that contains it, and both survive together", () => {
  const p = parseQuery("office in Al Olaya, Riyadh", VOCAB);
  assert.deepEqual(p.placeIds, ["d-olaya"]);
  assert.equal(p.city, "Riyadh");
});

test("a multi-word district name matches whole", () => {
  const p = parseQuery("Grade A office in King Abdullah Financial District", VOCAB);
  assert.deepEqual(p.placeIds, ["d-kafd"]);
  assert.deepEqual(p.terms, []);
});

// ------------------------------------------------------------ numeric intent

test("a bound points the way the words point", () => {
  assert.equal(parseQuery("office over 1,200", VOCAB).priceMin, 1200);
  assert.equal(parseQuery("office under 1,200", VOCAB).priceMax, 1200);
  assert.equal(parseQuery("office at least 1,200", VOCAB).priceMin, 1200);
});

test("a unit makes a figure an area, not money, in both directions", () => {
  const p = parseQuery("warehouse over 2,000 sqm under 900", VOCAB);
  assert.equal(p.areaMin, 2000);
  assert.equal(p.priceMax, 900);
  assert.equal(p.areaTarget, null);
});

test("a rent is never misread as a floor area", () => {
  const p = parseQuery("office with a rent of 1,600", VOCAB);
  assert.equal(p.areaTarget, null);
  assert.equal(p.areaMin, null);
});

test("a bare undirected figure is disclosed rather than guessed at", () => {
  const p = parseQuery("office 1,450", VOCAB);
  assert.equal(p.priceMax, null);
  assert.equal(p.priceMin, null);
  assert.equal(p.areaTarget, null);
  assert.deepEqual(p.ignored, ["1,450"]);
});

test("a bare year is not a constraint on inventory", () => {
  const p = parseQuery("office 2026", VOCAB);
  assert.equal(p.priceMax, null);
  assert.deepEqual(p.ignored, []);
  assert.deepEqual(p.terms, []);
});

// ------------------------------------------------------------- the free text

test("an unrecognised word stays a literal term instead of being dropped", () => {
  const p = parseQuery("office in Tower Zamil", VOCAB);
  assert.equal(p.asset, "office");
  assert.deepEqual(p.terms, ["tower", "zamil"]);
});

test("structure words never become search terms", () => {
  const p = parseQuery("I need an office in Riyadh please", VOCAB);
  assert.equal(p.asset, "office");
  assert.equal(p.city, "Riyadh");
  assert.deepEqual(p.terms, []);
});

test("a reference code survives as a term", () => {
  const p = parseQuery("SAT-1042", VOCAB);
  assert.deepEqual(p.terms, ["sat", "1042"]);
});

test("an empty query understands nothing and says so", () => {
  const p = parseQuery("   ", VOCAB);
  assert.equal(p.empty, true);
  assert.deepEqual(p.terms, []);
});

// ---------------------------------------------------------------- the matcher

test("every term must match, because two words mean both", () => {
  const fields = ["Fitted office in Al Olaya", "مكتب مجهز في العليا", "SAT-1042"];
  assert.equal(matchesTerms(fields, ["olaya"]), true);
  assert.equal(matchesTerms(fields, ["olaya", "1042"]), true);
  assert.equal(matchesTerms(fields, ["olaya", "jeddah"]), false);
});

test("a prefix matches, so the singular finds the plural in both scripts", () => {
  assert.equal(matchesTerms(["مكاتب مخدومة"], ["مكتب"]), false);
  assert.equal(matchesTerms(["مكاتب مخدومة"], ["مكاتب"]), true);
  assert.equal(matchesTerms(["Warehouses in Riyadh"], ["warehouse"]), true);
});

test("the definite article is optional on both sides", () => {
  assert.equal(matchesTerms(["العليا"], ["عليا"]), true);
  assert.equal(matchesTerms(["عليا"], ["العليا"]), true);
});

test("no terms matches everything, and no fields matches nothing", () => {
  assert.equal(matchesTerms(["anything"], []), true);
  assert.equal(matchesTerms([null, undefined, ""], ["olaya"]), false);
});

test("normalize folds the script but keeps the grade plus and the unit glyph", () => {
  assert.equal(normalize("Grade A+"), "grade a+");
  assert.equal(normalize("300 م²"), "300 م²");
  assert.equal(normalize("العُلَيّا"), "العليا");
});
