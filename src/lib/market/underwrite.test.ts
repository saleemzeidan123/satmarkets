import { test } from "node:test";
import assert from "node:assert/strict";
import { underwrite } from "./underwrite";
import type { IndexRow } from "./verdict";

// The payback line is the one sentence in the buy-side underwrite that a person
// repeats to somebody else, so it is worth holding to the grammar of the
// language it is written in.
//
// ADV-3A.1, finding 52. It used to read `خلال ${pb} سنة`, which is the singular
// for every payback, and `pb` is a formatted string, so a payback of exactly two
// years read "خلال 2.0 سنة". `خلال` governs what follows, so the dual is oblique.

const row = (median: number): IndexRow =>
  ({ median, period: "2026-Q1", district_label: "Olaya", district_label_ar: "العليا" }) as IndexRow;

const ar = (salePriceSqm: number, marketRentSqm: number) =>
  underwrite({ sale_price_sqm: salePriceSqm, area_sqm: 500 }, row(marketRentSqm)).line_ar;

test("the payback is counted, and after خلال the dual is oblique", () => {
  assert.match(ar(2000, 1000), /استرداد خلال سنتين تقريباً/);
  assert.match(ar(3000, 1000), /استرداد خلال 3 سنوات تقريباً/);
  assert.match(ar(10000, 1000), /استرداد خلال 10 سنوات تقريباً/);
  assert.match(ar(11000, 1000), /استرداد خلال 11 سنة تقريباً/);
  assert.match(ar(1000, 1000), /استرداد خلال سنة واحدة تقريباً/);
  assert.ok(!/سنتان/.test(ar(2000, 1000)), "the governed dual is never nominative");
});

test("a fractional payback keeps its fraction rather than being rounded to another figure", () => {
  // 2,500 over 1,000 is 2.5 years. Rounding that to "سنتين" would be a different
  // claim about the same asset, which Law 3 does not allow a display layer to make.
  assert.match(ar(2500, 1000), /استرداد خلال 2\.5 سنة تقريباً/);
  assert.match(ar(12500, 1000), /استرداد خلال 13 سنة تقريباً/, "past ten the figure itself is whole");
});

test("both languages report the same yield, and neither invents a benchmark", () => {
  const u = underwrite({ sale_price_sqm: 20000, area_sqm: 500 }, row(1000));
  assert.equal(u.status, "ok");
  assert.equal(u.grossYieldPct, 5);
  assert.equal(u.paybackYears, 20);
  assert.match(u.line_en, /implied gross yield ~5\.0%/);
  assert.match(u.line_ar, /عائد إجمالي ضمني ~5\.0%/);
  assert.match(u.line_en, /Indicative, not advice\./);
  assert.match(u.line_ar, /مؤشر استرشادي وليس نصيحة\./);
});

test("with no sale price or no market rent there is no estimate and no number", () => {
  const u = underwrite({ area_sqm: 500 }, row(1000));
  assert.equal(u.status, "na");
  assert.equal(u.paybackYears, null);
  assert.ok(!/[0-9]/.test(u.line_ar), u.line_ar);
});
