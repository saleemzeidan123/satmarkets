import test from "node:test";
import assert from "node:assert/strict";
import { gradePhrase, gradeLabel, cityLabel, cityKey } from "./labels";

test("gradePhrase disappears when a listing carries no grade", () => {
  // The live defect: a null grade printed the literal N/A into the middle of a
  // meta description, in Arabic as a Latin abbreviation. Absent is absent.
  for (const missing of [null, undefined, "", "n_a"] as const) {
    assert.equal(gradePhrase(missing, "en"), "");
    assert.equal(gradePhrase(missing, "ar"), "");
  }
  // gradeLabel keeps its chip behaviour; only prose changes.
  assert.equal(gradeLabel("n_a", "en"), "N/A");
  assert.equal(gradeLabel("n_a", "ar"), "N/A");
});

test("gradePhrase reads as a phrase in both scripts", () => {
  assert.equal(gradePhrase("a", "en"), "Grade A");
  assert.equal(gradePhrase("a", "ar"), "فئة أ");
  assert.equal(gradePhrase("a_plus", "en"), "Grade A+");
  assert.equal(gradePhrase("a_plus", "ar"), "فئة أ+");
  assert.equal(gradePhrase("b", "en"), "Grade B");
  assert.equal(gradePhrase("b", "ar"), "فئة ب");
  assert.equal(gradePhrase("c", "en"), "Grade C");
  assert.equal(gradePhrase("c", "ar"), "فئة ج");
});

test("gradePhrase carries no Latin script into Arabic prose", () => {
  for (const g of ["a", "a_plus", "b", "c"]) {
    // The plus sign is punctuation, not script. Letters are what must not leak.
    assert.equal(/[A-Za-z]/.test(gradePhrase(g, "ar")), false, g);
  }
});

// ------------------------------------------------------------------- cityLabel

test("the slug that broke the page resolves in both languages", () => {
  // The live defect, owner ruling 5: /listings?city=riyadh published the raw slug
  // as a heading and inside an Arabic meta description.
  assert.equal(cityLabel("riyadh", "en"), "Riyadh");
  assert.equal(cityLabel("riyadh", "ar"), "الرياض");
  assert.equal(cityKey("riyadh"), "Riyadh");
});

test("a city is recognised however it is spelled in a link", () => {
  const cases: [string, string][] = [
    ["Riyadh", "Riyadh"], ["RIYADH", "Riyadh"], ["ar-riyadh", "Riyadh"], ["الرياض", "Riyadh"],
    ["al-khobar", "Khobar"], ["khobar", "Khobar"], ["الخبر", "Khobar"],
    ["makkah_al_mukarramah", "Makkah"], ["mecca", "Makkah"], ["مكة المكرمة", "Makkah"],
    ["madinah", "Madinah"], ["المدينة المنورة", "Madinah"], ["jeddah", "Jeddah"], ["جدة", "Jeddah"],
    ["dammam", "Dammam"],
  ];
  for (const [input, key] of cases) assert.equal(cityKey(input), key, input);
});

test("an unknown key is never published as machine punctuation", () => {
  // Unknown stays unknown. It just stops looking like a URL fragment on a public page.
  assert.equal(cityKey("al-kharj"), null);
  assert.equal(cityLabel("al-kharj", "en"), "Al Kharj");
  assert.equal(cityLabel("al-kharj", "ar"), "Al Kharj");
  assert.equal(/[-_+.]/.test(cityLabel("some_other-city", "ar")), false);
});

test("no city, no label", () => {
  for (const empty of [null, undefined, ""] as const) {
    assert.equal(cityLabel(empty, "en"), "");
    assert.equal(cityLabel(empty, "ar"), "");
    assert.equal(cityKey(empty), null);
  }
});

test("the Arabic rendering carries no Latin letters for a known city", () => {
  for (const c of ["riyadh", "jeddah", "dammam", "khobar", "makkah", "madinah"]) {
    assert.equal(/[A-Za-z]/.test(cityLabel(c, "ar")), false, c);
  }
});
