import test from "node:test";
import assert from "node:assert/strict";
import { gradePhrase, gradeLabel, cityLabel, cityKey, CITY_SPELLINGS } from "./labels";

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
  //
  // This used to use al-kharj as its example, which was accurate and is no
  // longer: Al Kharj is a city the districts source actually holds, so it is now
  // named rather than prettified (finding 104). The example moved to a string no
  // source returns, because a fallback test has to be about the fallback.
  assert.equal(cityKey("nowhere-town"), null);
  assert.equal(cityLabel("nowhere-town", "en"), "Nowhere Town");
  assert.equal(cityLabel("nowhere-town", "ar"), "Nowhere Town");
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
  // Over the whole table rather than a remembered six, so a city added with an
  // English name in both columns fails here rather than on the Arabic page.
  const keys = Object.keys(CITY_SPELLINGS);
  assert.ok(keys.length > 0);
  for (const c of keys) {
    assert.equal(/[A-Za-z]/.test(cityLabel(c, "ar")), false, c);
  }
});

test("every city the districts source holds resolves in both languages", () => {
  // PKG-DEM1, finding 104. Measured on the deployment: /ar/locations printed
  // fifteen of these in Latin letters inside Arabic sentences, across twenty of
  // the seventy seven location cards, because the table stopped at six.
  //
  // This list is static and says so. Tests here have no database, so the guard
  // cannot enumerate the source itself; it pins what the source was measured to
  // return. A twenty second city would not fail this test, which is why the
  // package's live evidence sweep of /ar/locations is the other half of the
  // check and is recorded in the handback.
  const measured = [
    "Riyadh", "Jeddah", "Khobar", "Dammam", "Makkah", "Madinah", "Dhahran", "Taif",
    "Al Ahsa", "Jubail", "Yanbu", "Tabuk", "Buraidah", "Abha", "Khamis Mushait",
    "Hail", "Najran", "Jazan", "Al Kharj", "Sakaka", "Arar",
  ];
  for (const c of measured) {
    assert.equal(cityKey(c), c, `${c} is not a canonical key`);
    assert.equal(/[A-Za-z]/.test(cityLabel(c, "ar")), false, `${c} still renders in Latin for an Arabic reader`);
    assert.ok(cityLabel(c, "en").length > 0);
  }
});

test("the city guard catches the shape it was written for", () => {
  // A guard nobody has watched fail is a guard nobody knows works. These are the
  // three judgements the two tests above make, written as the strings they meet.
  assert.equal(/[A-Za-z]/.test("الظهران"), false, "an Arabic name passes");
  assert.equal(/[A-Za-z]/.test("Dhahran"), true, "the shipped defect must be caught");
  assert.equal(cityKey("a city no source returns"), null, "an unknown key stays unknown");
});
