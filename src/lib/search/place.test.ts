import { test } from "node:test";
import assert from "node:assert/strict";
import { resolvePlace } from "@/lib/search/place";
import { rulesParse } from "@/lib/search/aiParse";

// A small stand-in for the districts table, ordered the way the defect needed it
// to be ordered: KAFD first, so a first-match-wins city test picks it.
const DISTRICTS = [
  { id: "d-kafd", name_en: "KAFD", name_ar: "واجهة الرياض المالية", city: "Riyadh" },
  { id: "d-olaya", name_en: "Al Olaya", name_ar: "العليا", city: "Riyadh" },
  { id: "d-qurtubah", name_en: "Qurtubah", name_ar: "قرطبة", city: "Riyadh" },
  { id: "d-sulay", name_en: "Sulay", name_ar: "السلي", city: "Riyadh" },
  { id: "d-faisaliyah", name_en: "Al Faisaliyah", name_ar: "الفيصلية", city: "Dammam" },
  { id: "d-rawdah", name_en: "Al Rawdah", name_ar: "الروضة", city: "Jeddah" },
];

const forQuery = (q: string) => {
  const p = rulesParse(q);
  return { parsed: p, place: resolvePlace(q, p.district, p.city, DISTRICTS) };
};

// ---------------------------------------------------------------- finding 55

test("a city query resolves to the city, never to one district of it", () => {
  const { place } = forQuery("warehouse for lease in Riyadh");
  assert.equal(place.district, null, "no district was typed, so none may be applied");
  assert.equal(place.applied?.kind, "city");
  assert.equal(place.applied?.en, "Riyadh");
  assert.deepEqual(place.cityDistrictIds, ["d-kafd", "d-olaya", "d-qurtubah", "d-sulay"]);
});

test("the exact live sentence cannot be produced: KAFD is never named by a Riyadh query", () => {
  const { place } = forQuery("warehouse for lease in Riyadh");
  assert.notEqual(place.applied?.en, "KAFD");
  assert.notEqual(place.applied?.ar, "واجهة الرياض المالية");
});

test("an Arabic city query resolves the city, so a Dammam district is excluded", () => {
  const { parsed, place } = forQuery("مستودع للإيجار في الرياض 800 متر مربع");
  assert.equal(parsed.city, "Riyadh");
  assert.equal(place.applied?.kind, "city");
  assert.equal(place.applied?.ar, "الرياض");
  assert.ok(place.cityDistrictIds, "a city filter must be applied");
  assert.equal(
    place.cityDistrictIds!.includes("d-faisaliyah"),
    false,
    "a Dammam district may not answer a Riyadh query"
  );
});

test("Arabic city names survive the prepositional and article prefixes people type", () => {
  for (const q of ["مكاتب بالرياض", "مستودع في الرياض", "محل بجدة", "مكتب في الدمام"]) {
    assert.notEqual(rulesParse(q).city, null, q);
  }
  assert.equal(rulesParse("مكاتب بالرياض").city, "Riyadh");
  assert.equal(rulesParse("محل بجدة").city, "Jeddah");
  assert.equal(rulesParse("مكتب في الدمام").city, "Dammam");
});

test("the longest city spelling wins, so Makkah al Mukarramah is not read as Makkah alone", () => {
  assert.equal(rulesParse("retail in Makkah al Mukarramah").city, "Makkah");
  assert.equal(rulesParse("تجزئة في مكة المكرمة").city, "Makkah");
});

test("a district the person named beats the city that contains it", () => {
  const { place } = forQuery("office in Al Olaya, Riyadh");
  assert.equal(place.district?.id, "d-olaya");
  assert.equal(place.applied?.kind, "district");
  assert.equal(place.cityDistrictIds, null, "a district filter replaces the city filter, it does not add to it");
});

test("a district synonym still resolves to its district", () => {
  const { place } = forQuery("Grade A office in KAFD");
  assert.equal(place.district?.id, "d-kafd");
  assert.equal(place.applied?.kind, "district");
});

test("a city we hold no districts in yields an empty id list, not a missing filter", () => {
  const { place } = forQuery("office in Khobar");
  assert.equal(place.applied?.kind, "city");
  assert.deepEqual(place.cityDistrictIds, [], "an empty list is the answer; null would mean no place was asked for");
});

test("a query naming no place applies no place filter", () => {
  const { place } = forQuery("fitted office 300 sqm");
  assert.equal(place.district, null);
  assert.equal(place.cityDistrictIds, null);
  assert.equal(place.applied, null);
});

test("a row with no English name cannot match every query by being first", () => {
  const rows = [{ id: "d-blank", name_en: null, name_ar: null, city: "Riyadh" }, ...DISTRICTS];
  const p = resolvePlace("fitted office 300 sqm", null, null, rows);
  assert.equal(p.district, null);
});

test("the city column is read through the same fold as everything else", () => {
  const rows = [{ id: "d-x", name_en: "Test", name_ar: "اختبار", city: "riyadh" }];
  const p = resolvePlace("warehouse in Riyadh", null, "Riyadh", rows);
  assert.deepEqual(p.cityDistrictIds, ["d-x"]);
});
