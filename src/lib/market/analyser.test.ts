import { test } from "node:test";
import assert from "node:assert/strict";
import { num, validBand, spaceTypeLabel, rentUnitLabel, rateBasisLabel, pickSegment, analyseDeal, unitKind, isKnownUnit } from "./analyser";

// PKG-0B regression coverage for the Advisor analyser (Codex correction 5).

test("num rejects null, undefined, empty, whitespace, NaN, Infinity and booleans", () => {
  assert.equal(num(null), null);
  assert.equal(num(undefined), null);
  assert.equal(num(""), null);
  assert.equal(num("   "), null);
  assert.equal(num("x"), null);
  assert.equal(num(NaN), null);
  assert.equal(num(Infinity), null);
  assert.equal(num(-Infinity), null);
  assert.equal(num(true), null);
  // Genuine values pass, including "0" which is a real number here.
  assert.equal(num(0), 0);
  assert.equal(num("1,")?.toString, undefined); // "1," -> NaN -> null
  assert.equal(num("1420.5"), 1420.5);
  assert.equal(num(2180), 2180);
});

test("validBand rejects missing, null, empty, NaN and out-of-order values", () => {
  assert.equal(validBand(null), null);
  assert.equal(validBand({}), null);
  assert.equal(validBand({ low: 1, high: 3 }), null); // no average
  assert.equal(validBand({ low: null, average: 2, high: 3 }), null);
  assert.equal(validBand({ low: "", average: 2, high: 3 }), null);
  assert.equal(validBand({ low: 1, average: NaN, high: 3 }), null);
  assert.equal(validBand({ low: 3, average: 2, high: 1 }), null); // out of order
  assert.equal(validBand({ low: 1, average: 4, high: 3 }), null); // average above high
  // Stale stored shape (band.median) is accepted as average.
  assert.deepEqual(validBand({ low: 1, median: 2, high: 3 }), { low: 1, average: 2, high: 3 });
  // Public shape.
  assert.deepEqual(validBand({ band_low: 1000, average: 1500, band_high: 2000 }), { low: 1000, average: 1500, high: 2000 });
  // A false zero must not slip through as a valid band.
  assert.equal(validBand({ low: "", average: "", high: "" }), null);
});

test("validBand rejects zero and negative rent ranges (rents are positive)", () => {
  assert.equal(validBand({ low: 0, average: 0, high: 0 }), null);
  assert.equal(validBand({ low: 0, average: 100, high: 200 }), null); // zero low
  assert.equal(validBand({ low: -100, average: 100, high: 200 }), null); // negative low
  assert.equal(validBand({ low: 100, average: 0, high: 200 }), null); // zero average
  assert.equal(validBand({ low: 100, average: 150, high: 0 }), null); // zero high breaks order anyway
  assert.equal(validBand({ band_low: -5, average: -3, band_high: -1 }), null); // all negative, ordered
  assert.deepEqual(validBand({ low: 1, average: 1, high: 1 }), { low: 1, average: 1, high: 1 });
});

test("unit basis is never inferred: unknown/null/empty units are unsupported", () => {
  assert.equal(unitKind("SAR/m2/yr"), "sqm_year");
  assert.equal(unitKind("sar_sqm_yr"), "sqm_year");
  assert.equal(unitKind("sar_desk_month"), "desk_month");
  assert.equal(unitKind(null), null);
  assert.equal(unitKind(""), null);
  assert.equal(unitKind("SAR"), null);
  assert.equal(unitKind("bushels"), null);
  assert.equal(isKnownUnit("SAR/m2/yr"), true);
  assert.equal(isKnownUnit("weird"), false);
  // rentUnitLabel returns null (never a guessed basis) for unknown units.
  assert.equal(rentUnitLabel("weird", false), null);
  assert.equal(rentUnitLabel(null, true), null);
  // rateBasisLabel surfaces an explicit unsupported label, not a guessed unit.
  assert.equal(rateBasisLabel("weird", false), "Rent unit not supported");
  assert.equal(rateBasisLabel(null, true), "وحدة الإيجار غير مدعومة");
  // analyseDeal refuses to analyse an unknown unit even with a valid band+rate.
  assert.equal(analyseDeal({ rate: "2100", band: { band_low: 1, average: 2, band_high: 3 }, unit: "weird", assetType: "office", segment: "all", locationLabel: "X", period: "2026-Q2", ar: false }), null);
});

test("percentage maths never produce Infinity or NaN (average is guaranteed positive)", () => {
  // With a valid (positive) band, the delta% is always finite.
  const r = analyseDeal({ rate: "2100", band: { band_low: 1, average: 1, band_high: 3 }, unit: "SAR/m2/yr", assetType: "office", segment: "all", locationLabel: "X", period: "2026-Q2", ar: false })!;
  assert.ok(r, "expected result");
  assert.ok(Number.isFinite(r.quoted));
  assert.ok(!/Infinity|NaN/.test(r.text));
});

test("spaceTypeLabel returns human labels, never an internal compound key", () => {
  // The "all" segment adds no qualifier.
  assert.equal(spaceTypeLabel("retail", "all", false), "Retail & F&B");
  assert.equal(spaceTypeLabel("retail", "all", true), "تجزئة ومطاعم");
  assert.equal(spaceTypeLabel("office", "all", false), "Office");
  assert.equal(spaceTypeLabel("warehouse", "all", true), "مستودعات");
  // A real segment qualifier reads in human form.
  assert.equal(spaceTypeLabel("office", "grade_a", false), "Office · Grade A");
  // No output ever contains the internal pipe key.
  for (const [a, s] of [["retail", "all"], ["office", "grade_a"], ["warehouse", "modern"]] as const) {
    assert.ok(!spaceTypeLabel(a, s, false).includes("|"), `${a}|${s} leaked a pipe key (EN)`);
    assert.ok(!spaceTypeLabel(a, s, true).includes("|"), `${a}|${s} leaked a pipe key (AR)`);
  }
});

test("rentUnitLabel is localized, Western-numeral and uses م² in Arabic", () => {
  // Robust to the inconsistent stored unit strings.
  for (const u of ["sar_sqm_year", "SAR/m2/yr", "sar_sqm_yr"]) {
    assert.equal(rentUnitLabel(u, false), "SAR/m²/year");
    assert.equal(rentUnitLabel(u, true), "ريال/م²·سنة");
  }
  assert.equal(rentUnitLabel("sar_desk_month", false), "SAR/desk/month");
  assert.equal(rentUnitLabel("sar_desk_month", true), "ريال/مكتب·شهر");
  // Arabic never emits the raw ASCII unit.
  assert.ok(!rentUnitLabel("SAR/m2/yr", true)!.includes("m2"));
  assert.ok(rentUnitLabel("SAR/m2/yr", true)!.includes("م²"));
});

test("rateBasisLabel states the basis explicitly before input in both languages", () => {
  assert.equal(rateBasisLabel("SAR/m2/yr", false), "Quoted annual rent, SAR/m²/year");
  assert.equal(rateBasisLabel("SAR/m2/yr", true), "الإيجار السنوي المطلوب، ريال/م²·سنة");
  assert.equal(rateBasisLabel("sar_desk_month", false), "Quoted monthly rent, SAR/desk/month");
});

test("pickSegment never treats API order as intent", () => {
  const opts = ["retail|all", "office|all", "warehouse|all"];
  // Generic entry: no previous, no context -> require explicit choice.
  assert.equal(pickSegment(opts, "", null), "");
  assert.equal(pickSegment(opts, null, undefined), "");
  // A still-valid previous choice is preserved.
  assert.equal(pickSegment(opts, "office|all", null), "office|all");
  // An invalid previous choice is dropped, NOT snapped to opts[0].
  assert.equal(pickSegment(opts, "office|grade_a", null), "");
  // Valid page context is honoured.
  assert.equal(pickSegment(opts, "", "warehouse|all"), "warehouse|all");
  // Invalid context is ignored.
  assert.equal(pickSegment(opts, "", "office|grade_a"), "");
});

const BAND = { band_low: 1918.4, average: 2180, band_high: 2441.6 };
const baseInput = { rate: "2100", size: "300", band: BAND, unit: "SAR/m2/yr", assetType: "retail", segment: "all", locationLabel: "Al Olaya, Riyadh", period: "2026-Q2" };

test("analyseDeal returns null on invalid rate or band", () => {
  assert.equal(analyseDeal({ ...baseInput, rate: "", ar: false }), null);
  assert.equal(analyseDeal({ ...baseInput, rate: "0", ar: false }), null);
  assert.equal(analyseDeal({ ...baseInput, rate: "-5", ar: false }), null);
  assert.equal(analyseDeal({ ...baseInput, rate: "abc", ar: false }), null);
  assert.equal(analyseDeal({ ...baseInput, band: { band_low: 3, average: 2, high: 1 }, ar: false }), null);
});

test("analyseDeal English result: human labels, localized unit, sourced average separate from sample range", () => {
  const r = analyseDeal({ ...baseInput, ar: false })!;
  assert.ok(r, "expected a result");
  assert.ok(r.text.startsWith("Deal check: Retail & F&B, Al Olaya, Riyadh, at 2,100 SAR/m²/year."));
  assert.ok(r.text.includes("sits within the sample indicative range"));
  assert.ok(r.text.includes("REGA Rental Index (Ejar): average of registered rental contracts"));
  // No internal key, no raw ASCII unit in the sentence.
  assert.ok(!r.text.includes("|"));
  assert.ok(!r.text.includes("SAR/m2/yr"));
  assert.equal(r.verdict, "within");
  assert.equal(r.quoted, 2100);
});

test("analyseDeal Arabic result mirrors English with Arabic wording, Western numerals and م²", () => {
  // The caller localizes the location label; pass the Arabic form as the page does.
  const r = analyseDeal({ ...baseInput, locationLabel: "العليا، الرياض", ar: true })!;
  assert.ok(r.text.startsWith("فحص الصفقة: تجزئة ومطاعم، العليا، الرياض، عند 2,100 ريال/م²·سنة."), r.text.slice(0, 90));
  assert.ok(r.text.includes("يقع ضمن النطاق الاسترشادي التجريبي"));
  assert.ok(r.text.includes("المؤشر الإيجاري للهيئة العامة للعقار (إيجار): متوسط العقود المسجّلة"));
  assert.ok(!r.text.includes("|"));
  assert.ok(!r.text.includes("SAR/m2/yr"));
  assert.ok(r.text.includes("2,180")); // Western numerals
  assert.ok(r.text.includes("الربع الثاني 2026"));
});

test("analyseDeal below/above verdicts and annual calc only for sqm-year units", () => {
  const below = analyseDeal({ ...baseInput, rate: "1500", ar: false })!;
  assert.equal(below.verdict, "below");
  assert.ok(below.text.includes("sits below the sample indicative range"));
  assert.ok(below.text.includes("about") && below.text.includes("below the average"));
  // sqm-year: annual line present.
  assert.ok(below.text.includes("At 300 m² that is about 450,000 SAR a year."));
  // desk-month unit: no annual multiply.
  const desk = analyseDeal({ ...baseInput, unit: "sar_desk_month", rate: "1500", ar: false })!;
  assert.ok(!desk.text.includes("a year."));
});

test("analyseDeal EN/AR parity: same verdict, quoted and average for identical input", () => {
  const en = analyseDeal({ ...baseInput, ar: false })!;
  const arr = analyseDeal({ ...baseInput, ar: true })!;
  assert.equal(en.verdict, arr.verdict);
  assert.equal(en.quoted, arr.quoted);
  assert.deepEqual(en.band, arr.band);
});
