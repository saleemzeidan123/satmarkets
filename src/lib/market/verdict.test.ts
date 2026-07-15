import { test } from "node:test";
import assert from "node:assert/strict";
import { pickIndexRow, marketVerdict, type IndexRow } from "./verdict";

// Regression protection for the verdict engine (the calls that turn a price into
// "below / within / above band"). Pure functions, no IO. Run with `npm test`.

const row = (p: Partial<IndexRow> = {}): IndexRow => ({
  asset_type: "office", segment: "grade_a", unit: "sar_sqm_year",
  band_low: 1800, median: 2400, band_high: 2900, period: "Q1 2026",
  district_label: "Al Olaya", district_label_ar: "العليا", ...p,
});

// ---- pickIndexRow: segment preference and grade routing ----
test("pickIndexRow prefers grade_a for offices", () => {
  const rows = [row({ segment: "grade_b", median: 1150 }), row({ segment: "grade_a", median: 2400 })];
  assert.equal(pickIndexRow(rows, "office")?.segment, "grade_a");
});
test("pickIndexRow routes grade B and C to grade_b first", () => {
  const rows = [row({ segment: "grade_a", median: 2400 }), row({ segment: "grade_b", median: 1150 })];
  assert.equal(pickIndexRow(rows, "office", "b")?.segment, "grade_b");
  assert.equal(pickIndexRow(rows, "office", "c")?.segment, "grade_b");
});
test("pickIndexRow routes grade A+ and A to grade_a first", () => {
  const rows = [row({ segment: "grade_b", median: 1150 }), row({ segment: "grade_a", median: 2400 })];
  assert.equal(pickIndexRow(rows, "office", "a_plus")?.segment, "grade_a");
  assert.equal(pickIndexRow(rows, "office", "a")?.segment, "grade_a");
});
test("pickIndexRow ignores wrong unit and null median", () => {
  const rows = [row({ segment: "grade_a", unit: "sar_desk_month" }), row({ segment: "grade_b", median: null }), row({ segment: "blended", median: 1500 })];
  assert.equal(pickIndexRow(rows, "office")?.segment, "blended");
});
test("pickIndexRow falls back to first usable candidate", () => {
  assert.equal(pickIndexRow([row({ segment: "weird", median: 999 })], "office")?.segment, "weird");
});
test("pickIndexRow returns null on empty rows and asset mismatch", () => {
  assert.equal(pickIndexRow([], "office"), null);
  assert.equal(pickIndexRow([row({ asset_type: "retail" })], "office"), null);
});

// ---- marketVerdict: na paths ----
test("marketVerdict is na without asking rent, row, or median", () => {
  assert.equal(marketVerdict(null, row()).status, "na");
  assert.equal(marketVerdict(2000, null).status, "na");
  assert.equal(marketVerdict(2000, row({ median: null })).status, "na");
});

// ---- marketVerdict: band edges ----
test("marketVerdict is below at or under the low edge", () => {
  assert.equal(marketVerdict(1800, row()).status, "below");
  assert.equal(marketVerdict(1500, row()).status, "below");
});
test("marketVerdict is above at or over the high edge", () => {
  assert.equal(marketVerdict(2900, row()).status, "above");
  assert.equal(marketVerdict(3200, row()).status, "above");
});
test("marketVerdict is within strictly inside the band", () => {
  assert.equal(marketVerdict(2400, row()).status, "within");
  assert.equal(marketVerdict(2000, row()).status, "within");
  assert.equal(marketVerdict(2800, row()).status, "within");
});

// ---- marketVerdict: delta and grounded bilingual output ----
test("marketVerdict deltaPct sign tracks the median", () => {
  assert.equal(marketVerdict(2400, row()).deltaPct, 0);
  assert.ok((marketVerdict(2000, row()).deltaPct as number) < 0);
  assert.ok((marketVerdict(2800, row()).deltaPct as number) > 0);
});
test("marketVerdict lines are grounded, bilingual and non-advice", () => {
  const v = marketVerdict(2600, row());
  assert.match(v.line_en, /Indicative, not advice\./);
  assert.match(v.line_en, /Q1 2026/);
  assert.match(v.line_en, /Grade A offices/);
  assert.match(v.line_en, /Al Olaya/);
  assert.match(v.line_ar, /مؤشر استرشادي وليس نصيحة/);
});
test("marketVerdict without a band falls back to the median edges", () => {
  // low = high = median = 2400, asking == low, so classified below
  assert.equal(marketVerdict(2400, row({ band_low: null, band_high: null })).status, "below");
});

import { isSqmYear } from "./verdict";

test("isSqmYear accepts every per-sqm-per-year label variant", () => {
  assert.equal(isSqmYear("sar_sqm_year"), true);
  assert.equal(isSqmYear("SAR/m2/yr"), true);
  assert.equal(isSqmYear("sar_sqm_yr"), true);
  assert.equal(isSqmYear("SAR / m² / year"), true);
});

test("isSqmYear rejects non per-sqm-per-year units and blanks", () => {
  assert.equal(isSqmYear("sar_desk_month"), false);
  assert.equal(isSqmYear("sar_sqm_month"), false);
  assert.equal(isSqmYear(null), false);
  assert.equal(isSqmYear(""), false);
});

// ---- Codex remediation Batch 2: the Rent Index publishes AVERAGES (stat_kind
// 'average'), so the verdict copy must say "average"/"متوسط", never
// "median"/"وسيط". Guards against a silent regression to median wording. ----
test("verdict copy says average, never median (below band)", () => {
  const v = marketVerdict(1500, row());
  assert.equal(v.status, "below");
  assert.match(v.line_en, /average/);
  assert.doesNotMatch(v.line_en, /median/);
  assert.match(v.line_ar, /متوسط/);
  assert.doesNotMatch(v.line_ar, /وسيط/);
});
test("verdict copy says average, never median (above band)", () => {
  const v = marketVerdict(3500, row());
  assert.equal(v.status, "above");
  assert.match(v.line_en, /average/);
  assert.doesNotMatch(v.line_en, /median/);
  assert.doesNotMatch(v.line_ar, /وسيط/);
});
test("verdict copy says average, never median (within band)", () => {
  const v = marketVerdict(2400, row());
  assert.equal(v.status, "within");
  assert.match(v.line_en, /average/);
  assert.doesNotMatch(v.line_en, /median/);
  assert.doesNotMatch(v.line_ar, /وسيط/);
});
