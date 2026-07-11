import { test } from "node:test";
import assert from "node:assert/strict";
import { unsourcedFigure } from "./guard";

// Regression protection for Law 3 (no unsourced figures). The critical case is
// the substring bug: an allowed "12,500" must NOT vouch for a fabricated "2,500".
// Run with `npm test`.

test("catches overlapping substring value (12,500 does not vouch for 2,500)", () => {
  assert.equal(unsourcedFigure("the median rent is 2,500", "index band 12,500"), true);
});
test("allows an exact sourced value", () => {
  assert.equal(unsourcedFigure("asking 4,200 SAR", "band 2,000 to 4,200 SAR"), false);
});
test("normalizes thousands separators (2,500 == 2500)", () => {
  assert.equal(unsourcedFigure("rent 2,500", "median 2500"), false);
});
test("normalizes decimals (97.70% == 97.7)", () => {
  assert.equal(unsourcedFigure("occupancy is 97.70%", "occupancy 97.7%"), false);
});
test("normalizes Arabic-Indic digits against ASCII source", () => {
  assert.equal(unsourcedFigure("السعر ٢٥٠٠ ريال", "price 2500 SAR"), false);
  assert.equal(unsourcedFigure("السعر ٣٥٠٠ ريال", "price 2500 SAR"), true);
});
test("ignores numbers with no rent/price/unit context", () => {
  assert.equal(unsourcedFigure("ready within 3 months, 24 desks", ""), false);
});
test("flags a bare number in rent context absent from source", () => {
  assert.equal(unsourcedFigure("the median is 2,500", ""), true);
});
test("empty text is never unsourced", () => {
  assert.equal(unsourcedFigure("", "2,500"), false);
});
test("partial-digit fabrication (200 not vouched by 12,000)", () => {
  assert.equal(unsourcedFigure("yield around 200 per sqm", "band 12,000 per sqm"), true);
});
