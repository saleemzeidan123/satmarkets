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

// SM-P1-003b: the guard must be sign-aware. A source that says footfall rose 18%
// must not vouch for a claim that it fell 18%.
test("a sourced +18% does not vouch for a fabricated -18%", () => {
  assert.equal(unsourcedFigure("footfall index -18%", "footfall +18% yoy"), true);
});
test("a sourced +18% does not vouch for a worded decline of 18%", () => {
  assert.equal(unsourcedFigure("the rent index declined 18%", "rent index +18% yoy"), true);
  assert.equal(unsourcedFigure("rent index 18% down", "rent index +18% yoy"), true);
});
test("a sourced decline is vouched by an equivalent worded decline", () => {
  assert.equal(unsourcedFigure("the rent index fell 18%", "rent index -18% yoy"), false);
  assert.equal(unsourcedFigure("rent index -18%", "rent index declined 18% yoy"), false);
});
test("plus sign and no sign are the same positive value", () => {
  assert.equal(unsourcedFigure("rent index +18%", "rent index 18% yoy"), false);
  assert.equal(unsourcedFigure("rent index 18%", "rent index +18% yoy"), false);
});
test("a range dash is not read as a negative sign", () => {
  assert.equal(unsourcedFigure("asking 4,200 SAR", "rent band 2,000-4,200 SAR"), false);
});
test("polarity is not applied to levels, only to percentages", () => {
  assert.equal(unsourcedFigure("median rent 2,500 SAR", "rents came down from 3,000 to 2,500 SAR"), false);
});
test("Arabic worded decline is sign-aware", () => {
  assert.equal(unsourcedFigure("مؤشر الإيجار انخفض 18%", "rent index +18% yoy"), true);
  assert.equal(unsourcedFigure("مؤشر الإيجار انخفض 18%", "rent index -18% yoy"), false);
});
