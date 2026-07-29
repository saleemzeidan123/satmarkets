import { test } from "node:test";
import assert from "node:assert/strict";
import {
  formatNumber, formatInteger, formatDecimal, formatPercent, formatRange,
  formatUnit, formatArea, formatWithUnit, formatMoney,
  pluralCategory, plural, formatCount, formatCounted,
  bidiIsolate, ltrIsolate, resolveUnitKey, UNITS, COUNTED, fill, fillProse,
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

test("a subscription price carries the per-month unit from the table, not from the page", () => {
  // PKG-1C: the pricing page spelled this inline, "SAR/mo" and "ريال/شهر", the
  // last unit on a public page still living outside UNITS. The short form is the
  // one the tier cards render, so it is pinned in both languages.
  assert.equal(plain(formatUnit("sar_month", "en")), "SAR/month");
  assert.equal(plain(formatUnit("sar_month", "en", "short")), "SAR/mo");
  assert.equal(plain(formatUnit("sar_month", "ar")), "ريال/شهر");
  assert.equal(plain(formatUnit("sar_month", "ar", "short")), "ريال/شهر");
  // Unbreakable in Arabic, like every other composite unit.
  assert.equal(formatUnit("sar_month", "ar"), `ريال${WJ}/${WJ}شهر`);
  for (const legacy of ["SAR/mo", "SAR/month", "sar_month"]) {
    assert.equal(resolveUnitKey(legacy), "sar_month", legacy);
  }
  // The rent unit and the subscription unit must not collapse into each other.
  assert.notEqual(resolveUnitKey("SAR/m²/yr"), "sar_month");
});

test("snapshot: the pricing tier figures, both locales", () => {
  // Every tier price on the public pricing page, taken through the same two
  // functions the page calls. The 2,900 separator comes from the formatter now,
  // not from a comma typed into the English branch alone.
  const tiers = (loc: "en" | "ar") =>
    [0, 299, 899, 2900].map((v, i) => plain(formatInteger(v, loc) + (i ? " " + formatUnit("sar_month", loc, "short") : " " + formatUnit("sar", loc))));
  assert.deepEqual(tiers("en"), ["0 SAR", "299 SAR/mo", "899 SAR/mo", "2,900 SAR/mo"]);
  assert.deepEqual(tiers("ar"), ["0 ريال", "299 ريال/شهر", "899 ريال/شهر", "2,900 ريال/شهر"]);
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

test("the boundaries the finding names, at 1, 2, 3, 10, 11, 99 and 100", () => {
  // Finding 52 named these seven. They are the points where the Arabic rule
  // changes: the dual at 2, the plural from 3 to 10, the accusative singular
  // from 11 to 99, and the bare singular from 100.
  assert.deepEqual(
    [1, 2, 3, 10, 11, 99, 100].map((n) => formatCounted(n, "day", "ar")),
    ["يوم واحد", "يومان", "3 أيام", "10 أيام", "11 يوماً", "99 يوماً", "100 يوم"]
  );
  assert.deepEqual(
    [1, 2, 3, 10, 11, 99, 100].map((n) => formatCounted(n, "month", "ar")),
    ["شهر واحد", "شهران", "3 أشهر", "10 أشهر", "11 شهراً", "99 شهراً", "100 شهر"]
  );
  assert.deepEqual(
    [1, 2, 3, 10, 11, 99, 100].map((n) => formatCounted(n, "day", "en")),
    ["1 day", "2 days", "3 days", "10 days", "11 days", "99 days", "100 days"]
  );
});

test("the dual takes its oblique form after a preposition, and nothing else moves", () => {
  // "قبل يومان" is wrong Arabic. Everything either side of the dual already read
  // correctly in both positions, so the option must change the dual and only the
  // dual: a silent shift at 3 or at 11 would be a new defect wearing the fix.
  assert.equal(formatCounted(2, "day", "ar"), "يومان");
  assert.equal(formatCounted(2, "day", "ar", { oblique: true }), "يومين");
  assert.equal(formatCounted(2, "month", "ar", { oblique: true }), "شهرين");
  assert.equal(formatCounted(2, "rentFreeMonth", "ar", { oblique: true }), "شهرين بلا إيجار");
  for (const n of [0, 1, 3, 10, 11, 99, 100]) {
    assert.equal(
      formatCounted(n, "day", "ar", { oblique: true }),
      formatCounted(n, "day", "ar"),
      `${n} must not move`
    );
  }
  assert.equal(formatCounted(2, "day", "en", { oblique: true }), "2 days", "English has no such case");
});

test("every Arabic dual declares its oblique form, and the two are different", () => {
  // The invariant, rather than a list. A counted noun added later without an
  // oblique dual fails here instead of shipping "قبل قائمتان" to a page.
  for (const [noun, byLoc] of Object.entries(COUNTED)) {
    const ar = byLoc.ar as Record<string, string | undefined>;
    assert.ok(ar.twoOblique, `${noun}.ar.twoOblique missing`);
    assert.notEqual(ar.twoOblique, ar.two, `${noun}: the oblique dual is not the nominative one`);
  }
});

test("a fractional count keeps its fraction instead of being rounded into another number", () => {
  // formatInteger rounds, which is right for a whole count and wrong for a
  // figure. 1.5 months is not 2 months, and a decision pack that says it is has
  // changed the term.
  assert.equal(formatCounted(1.5, "month", "en"), "1.5 months");
  assert.equal(formatCounted(1.5, "month", "ar"), "1.5 شهر");
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

test("fillProse closes the gap an optional phrase leaves behind, in both scripts", () => {
  // The live defect: an ungraded listing rendered "N/A Serviced in Al Aqiq".
  // With the grade gone the sentence must still read as one.
  const en = "{grade} {type} in {place}, {area}. Indicative, not advice.";
  assert.equal(fillProse(en, { grade: "Grade A", type: "Office", place: "Al Olaya", area: "300 m²" }),
    "Grade A Office in Al Olaya, 300 m². Indicative, not advice.");
  assert.equal(fillProse(en, { grade: "", type: "Office", place: "Al Olaya", area: "300 m²" }),
    "Office in Al Olaya, 300 m². Indicative, not advice.");
  const ar = "{type} {grade} في {place}، {area}.";
  assert.equal(fillProse(ar, { type: "مكاتب", grade: "فئة أ", place: "العليا", area: "300 م²" }), "مكاتب فئة أ في العليا، 300 م².");
  assert.equal(fillProse(ar, { type: "مكاتب", grade: "", place: "العليا", area: "300 م²" }), "مكاتب في العليا، 300 م².");
  // An empty segment before punctuation must not leave a space in front of it,
  // in either script.
  assert.equal(fillProse("{title}{type} | SAT Markets", { title: "Serviced offices, Al Aqiq", type: "" }), "Serviced offices, Al Aqiq | SAT Markets");
  assert.equal(fillProse("{a} ، {b}", { a: "س", b: "ص" }), "س، ص");
  assert.equal(fillProse("  {a}  ", { a: "x" }), "x");
});

test("fillProse collapses spaces without touching the invisible controls", () => {
  // The unit formatters put word joiners and isolates in deliberately. A prose
  // filler that stripped them would silently undo PKG-1B.2's unbreakable unit.
  const area = formatArea(2000, "ar");
  const out = fillProse("{a}  {b}", { a: area, b: formatWithUnit(1420.5, "sar_sqm_year", "ar") });
  assert.equal(out, `${area} ${formatWithUnit(1420.5, "sar_sqm_year", "ar")}`);
  assert.match(out, /[\u2066-\u2069]/);
  assert.match(out, /\u2060/);
});
