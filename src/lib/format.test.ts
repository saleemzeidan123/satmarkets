import { test } from "node:test";
import assert from "node:assert/strict";
import {
  formatNumber, formatInteger, formatDecimal, formatPercent, formatRange,
  formatUnit, formatArea, formatWithUnit, formatMoney,
  pluralCategory, plural, formatCount, formatCounted,
  bidiIsolate, ltrIsolate, resolveUnitKey, UNITS, COUNTED, fill,
} from "./format";

const FSI = "⁨", PDI = "⁩", LRI = "⁦", WJ = "⁠";
/** Strip the invisible bidi and joiner controls so a snapshot reads as a human sees it. */
const plain = (s: string) => s.replace(/[⁠⁦⁨⁩]/g, "");
const AR_INDIC = /[٠-٩۰-۹]/;

// ------------------------------------------------------------------ numerals

test("numerals are Western in both locales, whatever the runtime default locale is", () => {
  // The defect: a bare n.toLocaleString() resolves the RUNTIME locale. Simulate a
  // device set to Arabic by asserting our formatter against what the unpinned call
  // would produce there, and require ours to stay Latin.
  const unpinned = (1250).toLocaleString("ar-SA");
  assert.match(unpinned, AR_INDIC, "precondition: an Arabic runtime locale really does emit Arabic-Indic digits");
  for (const loc of ["en", "ar"] as const) {
    assert.equal(formatNumber(1250, loc), "1,250");
    assert.doesNotMatch(formatNumber(1250, loc), AR_INDIC);
    assert.doesNotMatch(formatDecimal(1250.04, loc), AR_INDIC);
  }
});

test("grouping and decimals are stable", () => {
  assert.equal(formatInteger(1250.4, "ar"), "1,250");
  assert.equal(formatInteger(1250.6, "en"), "1,251");
  assert.equal(formatDecimal(1250.04, "en"), "1,250.04");
  assert.equal(formatDecimal(1420.5, "ar"), "1,420.5");
  assert.equal(formatDecimal(1420.0, "en"), "1,420", "no trailing zeros");
  assert.equal(formatNumber(NaN, "en"), "");
  assert.equal(formatNumber(Infinity, "ar"), "");
});

test("percentages carry the sign only when asked, and isolate in Arabic", () => {
  assert.equal(formatPercent(5.2, "en"), "5.2%");
  assert.equal(formatPercent(5.2, "en", { signed: true }), "+5.2%");
  assert.equal(formatPercent(-1.8, "en"), "-1.8%");
  assert.equal(formatPercent(0, "en", { signed: true }), "0%");
  assert.equal(formatPercent(5, "ar"), `${FSI}5%${PDI}`);
  assert.equal(plain(formatPercent(-1.8, "ar", { signed: true })), "-1.8%");
});

test("a range always reads low to high, in both languages", () => {
  assert.equal(formatRange(1250.04, 1590.96, "en"), "1,250.04 to 1,590.96");
  assert.equal(formatRange(1250.04, 1590.96, "ar"), "1,250.04 إلى 1,590.96");
});

// --------------------------------------------------------------------- units

test("every unit key has one rendering per locale and per length", () => {
  for (const [key, forms] of Object.entries(UNITS)) {
    for (const loc of ["en", "ar"] as const) {
      for (const len of ["long", "short"] as const) {
        const v = forms[loc][len];
        assert.ok(v && v.trim().length, `${key}.${loc}.${len} is empty`);
        assert.doesNotMatch(v, AR_INDIC, `${key}.${loc}.${len} carries Arabic-Indic digits`);
        assert.doesNotMatch(v, /[\u2014\u2013]/, `${key}.${loc}.${len} carries a dash (Law 2)`);
      }
    }
  }
});

test("the Arabic rent unit is the one agreed spelling, and cannot break mid-unit", () => {
  assert.equal(plain(formatUnit("sar_sqm_year", "ar")), "ريال/م²·سنة");
  assert.equal(plain(formatUnit("sar_sqm_year", "en")), "SAR/m²/year");
  assert.equal(plain(formatUnit("sar_sqm_year", "en", "short")), "SAR/m²/yr");
  // Word joiners sit on both sides of every separator, so the token has no break
  // opportunity inside itself (the PKG-1B.2 closure rule, now centralised).
  assert.equal(formatUnit("sar_sqm_year", "ar"), `ريال${WJ}/${WJ}م²${WJ}·${WJ}سنة`);
});

test("the six legacy spellings all resolve to the same unit key", () => {
  for (const legacy of ["SAR/m²·yr", "SAR/m²/yr", "SAR/m²/year", "SAR / m² / yr", "m²/yr", "sqm/yr"]) {
    assert.equal(resolveUnitKey(legacy), "sar_sqm_year", legacy);
    assert.equal(plain(formatUnit(legacy, "ar")), "ريال/م²·سنة", legacy);
  }
  assert.equal(resolveUnitKey("ريال/م²·سنة"), null, "an already-rendered Arabic unit is not a key");
});

test("an unknown unit is passed through, never silently dropped", () => {
  assert.equal(plain(formatUnit("SAR/bay/mo", "en")), "SAR/bay/mo");
  assert.equal(formatUnit(null, "ar"), "");
});

test("a figure and its unit are isolated as one composite, with the right direction", () => {
  // Arabic composite: first strong character is Arabic, so the run stays RTL and
  // the unit sits where an Arabic reader expects it. A forced LTR isolate here
  // would be a bidi defect, not a fix.
  assert.equal(formatArea(2000, "ar"), `${FSI}2,000 م²${PDI}`);
  assert.equal(formatArea(2000, "en"), "2,000 m²");
  assert.equal(plain(formatWithUnit(1420.5, "sar_sqm_year", "ar")), "1,420.5 ريال/م²·سنة");
  assert.equal(plain(formatWithUnit(1420.5, "sar_sqm_year", "en")), "1,420.5 SAR/m²/year");
  assert.equal(plain(formatMoney(900000, "ar")), "900,000 ريال");
  assert.equal(formatMoney(900000, "en"), "900,000 SAR");
});

test("isolation helpers use the characters they claim to", () => {
  assert.equal(bidiIsolate("x"), `${FSI}x${PDI}`);
  assert.equal(ltrIsolate("x"), `${LRI}x${PDI}`);
});

// ------------------------------------------------------------------- plurals

test("our plural categories agree with Intl.PluralRules for 0 to 200, in both languages", () => {
  for (const loc of ["en", "ar"] as const) {
    const rules = new Intl.PluralRules(loc === "ar" ? "ar" : "en");
    for (let n = 0; n <= 200; n++) {
      assert.equal(pluralCategory(n, loc), rules.select(n), `${loc} ${n}`);
    }
  }
});

test("Arabic uses all six categories and English only two", () => {
  assert.deepEqual([0, 1, 2, 3, 10, 11, 99, 100, 103].map((n) => pluralCategory(n, "ar")),
    ["zero", "one", "two", "few", "few", "many", "many", "other", "few"]);
  assert.deepEqual([0, 1, 2, 11, 100].map((n) => pluralCategory(n, "en")),
    ["other", "one", "other", "other", "other"]);
});

test("months are counted the way Arabic actually counts them", () => {
  // This is the defect: English logic gave "3 شهر". Arabic takes the plural for
  // 3 to 10, the accusative singular for 11 to 99, and drops the numeral entirely
  // for the singular and the dual.
  assert.equal(formatCounted(1, "month", "ar"), "شهر واحد");
  assert.equal(formatCounted(2, "month", "ar"), "شهران");
  assert.equal(formatCounted(3, "month", "ar"), "3 أشهر");
  assert.equal(formatCounted(6, "month", "ar"), "6 أشهر");
  assert.equal(formatCounted(12, "month", "ar"), "12 شهراً");
  assert.equal(formatCounted(100, "month", "ar"), "100 شهر");
  assert.equal(formatCounted(0, "month", "ar"), "0 شهر");
  assert.equal(formatCounted(1, "month", "en"), "1 month");
  assert.equal(formatCounted(2, "month", "en"), "2 months");
  assert.equal(formatCounted(12, "month", "en"), "12 months");
});

test("the other counted nouns follow the same rule", () => {
  assert.equal(formatCounted(1, "match", "en"), "1 match");
  assert.equal(formatCounted(4, "match", "en"), "4 matches");
  assert.equal(formatCounted(4, "match", "ar"), "4 مطابقات");
  assert.equal(formatCounted(2, "district", "ar"), "حيان");
  assert.equal(formatCounted(15, "district", "ar"), "15 حياً");
  assert.equal(formatCounted(1000, "listing", "en"), "1,000 listings", "counts are grouped too");
});

test("every counted noun declares all six Arabic forms and both English forms", () => {
  for (const [noun, byLoc] of Object.entries(COUNTED)) {
    for (const cat of ["zero", "one", "two", "few", "many", "other"] as const) {
      assert.ok((byLoc.ar as Record<string, string>)[cat], `${noun}.ar.${cat} missing`);
    }
    assert.ok(byLoc.en.one && byLoc.en.other, `${noun}.en incomplete`);
    for (const v of [...Object.values(byLoc.ar), ...Object.values(byLoc.en)]) {
      assert.doesNotMatch(String(v), AR_INDIC);
      assert.doesNotMatch(String(v), /[\u2014\u2013]/);
    }
  }
});

test("plural() falls back to `other` when a category is not declared", () => {
  assert.equal(plural(3, { other: "items" }, "ar"), "items");
  assert.equal(plural(1, { one: "item", other: "items" }, "en"), "item");
});

// ------------------------------------------------------------- snapshot pack

test("snapshot: the figures a public page actually renders, both locales", () => {
  const snap = (loc: "en" | "ar") => [
    formatRange(1250.04, 1590.96, loc),
    formatWithUnit(1420.5, "SAR/m²·yr", loc),
    formatArea(2000, loc),
    formatMoney(900000, loc),
    formatPercent(5.2, loc, { signed: true }),
    formatCounted(3, "month", loc),
    formatCounted(12, "month", loc),
    formatCounted(7, "match", loc),
  ].map(plain);

  assert.deepEqual(snap("en"), [
    "1,250.04 to 1,590.96",
    "1,420.5 SAR/m²/year",
    "2,000 m²",
    "900,000 SAR",
    "+5.2%",
    "3 months",
    "12 months",
    "7 matches",
  ]);
  assert.deepEqual(snap("ar"), [
    "1,250.04 إلى 1,590.96",
    "1,420.5 ريال/م²·سنة",
    "2,000 م²",
    "900,000 ريال",
    "+5.2%",
    "3 أشهر",
    "12 شهراً",
    "7 مطابقات",
  ]);
});

test("fill puts values into dictionary prose and keeps a missing key visible", () => {
  assert.equal(fill("{what} in {place} | SAT Markets", { what: "Offices", place: "Al Olaya" }), "Offices in Al Olaya | SAT Markets");
  assert.equal(fill("{what} في {place}", { what: "مكاتب", place: "العليا" }), "مكاتب في العليا");
  // A hole in a sentence must be loud, not silent.
  assert.equal(fill("{a} and {b}", { a: "one" }), "one and {b}");
  // Numbers are accepted and stringified, and an empty value is legitimate.
  assert.equal(fill("{n} left", { n: 0 }), "0 left");
  assert.equal(fill("x{in}y", { in: "" }), "xy");
  // Nothing that is not a placeholder is touched.
  assert.equal(fill("100% { spaced } {}", {}), "100% { spaced } {}");
});
