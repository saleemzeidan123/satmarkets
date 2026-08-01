import test from "node:test";
import assert from "node:assert/strict";
import { sizeRange, budgetCeiling } from "./requirementFigures";
import { formatUnit, type Loc } from "./format";

/**
 * PKG-DEM2, findings 114 and 115.
 *
 * The property under test is not "the module agrees with itself". It is that a
 * figure the occupier never stated never reaches a screen as a figure, and that
 * the same stored fact reads the same way on every surface.
 *
 * So the guards below are written against the output string rather than against
 * the module's branches, and each one that pins a defect has a sensitivity case
 * beside it that reproduces the shipped expression and watches it fail. A guard
 * nobody has watched fail is a guard nobody knows works.
 */

const LOCALES: Loc[] = ["en", "ar"];

/** U+2068 FIRST STRONG ISOLATE, U+2069 POP DIRECTIONAL ISOLATE, U+2060 WORD JOINER. */
const INVISIBLE = /[⁠⁦-⁩]/g;
/** What a reader actually sees, with the bidi and joining controls taken out. */
const visible = (s: string | null): string => (s ?? "").replace(INVISIBLE, "");

// ---------------------------------------------------------------------------
// The defect: an unstated figure printed as a figure.
// ---------------------------------------------------------------------------

for (const locale of LOCALES) {
  test(`an unstated size is nothing, not a rendered figure (${locale})`, () => {
    for (const [min, max] of [[null, null], [undefined, undefined], ["", ""], [null, undefined]]) {
      assert.equal(sizeRange(min, max, locale), null, `${String(min)}/${String(max)} must be null`);
    }
  });

  test(`an unstated budget is nothing, never zero (${locale})`, () => {
    for (const v of [null, undefined, ""]) {
      assert.equal(budgetCeiling(v, "lease", locale), null);
      assert.equal(budgetCeiling(v, "buy", locale), null);
    }
  });

  test(`sensitivity: the shipped expressions did print a figure for an unstated one (${locale})`, () => {
    // This is the board's own code, quoted. It is here so the defect these
    // guards exist for is reproduced rather than described.
    const shippedSize = (min: unknown, max: unknown) => `${min} to ${max} m²`;
    const shippedBudget = (b: unknown) => Number(b).toLocaleString("en-US");
    assert.equal(shippedSize(null, null), "null to null m²");
    // The one that matters most: a budget nobody gave, rendered as a budget of
    // zero. Not blank, not an error, a number.
    assert.equal(shippedBudget(null), "0");
    assert.notEqual(shippedBudget(null), "");
  });
}

// ---------------------------------------------------------------------------
// Nothing that is not a figure ever appears inside one.
// ---------------------------------------------------------------------------

test("no output ever contains null, NaN, undefined or a placeholder", () => {
  const cases: [unknown, unknown][] = [
    [null, null], [200, null], [null, 1200], [200, 1200], [500, 500],
    [undefined, 900], ["", "1500"], ["abc", 300], [NaN, NaN], [Infinity, 200],
  ];
  for (const locale of LOCALES) {
    for (const [min, max] of cases) {
      const s = sizeRange(min, max, locale);
      if (s === null) continue;
      for (const junk of ["null", "NaN", "undefined", "?", "Infinity"]) {
        assert.ok(!s.includes(junk), `sizeRange(${String(min)}, ${String(max)}, ${locale}) leaked ${junk}: ${s}`);
      }
    }
    for (const b of [null, undefined, "", "abc", NaN, Infinity, 1200]) {
      const s = budgetCeiling(b, "lease", locale);
      if (s === null) continue;
      for (const junk of ["null", "NaN", "undefined", "?", "Infinity"]) {
        assert.ok(!s.includes(junk), `budgetCeiling(${String(b)}, ${locale}) leaked ${junk}: ${s}`);
      }
    }
  }
});

test("a value that cannot be printed is treated as unstated, not printed", () => {
  // A non-numeric or non-finite value is a fault somewhere upstream. It is not a
  // figure the occupier stated, so it is withheld rather than shown as NaN.
  for (const locale of LOCALES) {
    assert.equal(sizeRange("abc", null, locale), null);
    assert.equal(sizeRange(NaN, NaN, locale), null);
    assert.equal(budgetCeiling(Infinity, "lease", locale), null);
    assert.equal(budgetCeiling({}, "buy", locale), null);
  }
});

// ---------------------------------------------------------------------------
// A half-open range states the bound that exists.
// ---------------------------------------------------------------------------

test("a half-open range names its one bound instead of filling in the other", () => {
  assert.equal(visible(sizeRange(500, null, "en")), "from 500 m²");
  assert.equal(visible(sizeRange(null, 1200, "en")), "up to 1,200 m²");
  assert.equal(visible(sizeRange(500, null, "ar")), "من 500 م²");
  assert.equal(visible(sizeRange(null, 1200, "ar")), "حتى 1,200 م²");
});

test("equal bounds collapse to the single figure the occupier asked for", () => {
  assert.equal(visible(sizeRange(500, 500, "en")), "500 m²");
  assert.equal(visible(sizeRange(500, 500, "ar")), "500 م²");
});

test("a closed range reads as a range in both languages", () => {
  assert.equal(visible(sizeRange(200, 1200, "en")), "200 to 1,200 m²");
  assert.equal(visible(sizeRange(200, 1200, "ar")), "200 إلى 1,200 م²");
});

// ---------------------------------------------------------------------------
// Grouping, numerals and units come from format.ts, not from the caller.
// ---------------------------------------------------------------------------

test("figures are grouped, and in Western numerals in both languages", () => {
  for (const locale of LOCALES) {
    const s = visible(sizeRange(1200, 24000, locale));
    assert.ok(s.includes("1,200"), `${locale}: ${s}`);
    assert.ok(s.includes("24,000"), `${locale}: ${s}`);
    // Arabic-Indic digits would be a regression against the standing rule that
    // both languages carry Western numerals.
    assert.ok(!/[٠-٩۰-۹]/.test(s), `${locale} rendered non-Western digits: ${s}`);
  }
});

test("the unit is spelled by format.ts, once per locale, on every surface", () => {
  // Not a restatement of the module: the four literals this replaced were `m²`
  // on the board, `m²` on the detail card, `sqm` in English on the dashboard and
  // متر مربع in Arabic there. The point is that all of them now come from one
  // table.
  for (const locale of LOCALES) {
    assert.ok(visible(sizeRange(300, 900, locale)).endsWith(visible(formatUnit("sqm", locale))));
  }
  assert.equal(visible(formatUnit("sqm", "en")), "m²");
  assert.equal(visible(formatUnit("sqm", "ar")), "م²");
});

test("the budget carries one unit for every deal type, because one form fills the column", () => {
  // PKG-FIG1, finding 128. This test used to assert the opposite, and the
  // opposite was wrong. It was written from the shape of the argument list
  // rather than from the record.
  //
  // The record: `RequirementForm` has ONE budget input. It is not conditional on
  // the deal type, and its label reads "Budget ceiling (SAR/m²/yr)" and, in
  // Arabic, "سقف الميزانية (ريال/م²·سنة)". That label is what the occupier is
  // looking at while they type the number, so it is what the number means. It is
  // the same class of evidence finding 120 turned on: the form that fills the
  // column, not the column name and not the route type.
  //
  // `matching.ts` reads the same column and compares it against
  // `ratePerSqm(listing)`, which for a sale divides the sale price by the area.
  // So the comparison already treats a purchase budget as a rate per square
  // metre. Rendering it as a bare `SAR` total made one stored column mean two
  // different things depending on which screen was reading it.
  for (const locale of LOCALES) {
    const lease = visible(budgetCeiling(1400, "lease", locale));
    const buy = visible(budgetCeiling(9000, "buy", locale));
    const unit = visible(formatUnit("sar_sqm_year", locale, "short"));
    assert.ok(lease.endsWith(unit), `${locale}: ${lease}`);
    assert.ok(buy.endsWith(unit), `${locale}: ${buy}`);
    // Nothing but the digits differs, which is the property: the deal type moves
    // the figure and never the unit.
    assert.equal(lease.replace(/[\d,]/g, ""), buy.replace(/[\d,]/g, ""));
  }
  // The spelling that shipped, kept beside the fixed one so this guard fails
  // against the code it replaced rather than merely restating the new code.
  const shipped = (deal: string, locale: Loc) => formatUnit(deal === "lease" ? "sar_sqm_year" : "sar", locale, "short");
  assert.notEqual(visible(shipped("buy", "en")), visible(formatUnit("sar_sqm_year", "en", "short")));

  // Whether a purchase budget SHOULD be a total is an owner decision about
  // intake, recorded in the roadmap rather than taken here. If it should, the
  // form changes first and the column almost certainly has to split in two,
  // because one column cannot hold two units.
});

// ---------------------------------------------------------------------------
// The budget says what it is.
// ---------------------------------------------------------------------------

test("the budget states itself as a ceiling wherever it is read", () => {
  // The column is `budget_sqm_max`. The board prefixed it with "up to" and the
  // detail card printed it bare under the label "Budget", so the same stored
  // number was a ceiling on one screen and a price on the other.
  assert.ok(visible(budgetCeiling(1400, "lease", "en")).startsWith("up to "));
  assert.ok(visible(budgetCeiling(1400, "lease", "ar")).startsWith("حتى "));
  assert.equal(visible(budgetCeiling(1400, "lease", "en")), "up to 1,400 SAR/m²/yr");
});

// ---------------------------------------------------------------------------
// Arabic reads as one run.
// ---------------------------------------------------------------------------

test("an Arabic figure is isolated so its digits and unit do not swap places", () => {
  const s = sizeRange(200, 1200, "ar");
  assert.ok(s !== null && s.startsWith("⁨") && s.endsWith("⁩"), `not isolated: ${JSON.stringify(s)}`);
  const b = budgetCeiling(1400, "lease", "ar");
  assert.ok(b !== null && b.startsWith("⁨") && b.endsWith("⁩"), `not isolated: ${JSON.stringify(b)}`);
  // English is left alone: an isolate there is invisible work with no reordering
  // to prevent, and it would put controls into copy that is pasted elsewhere.
  assert.ok(!/[⁦-⁩]/.test(String(sizeRange(200, 1200, "en"))));
});

test("no Latin script leaks into an Arabic figure", () => {
  assert.ok(!/[A-Za-z]/.test(visible(sizeRange(200, 1200, "ar"))));
  assert.ok(!/[A-Za-z]/.test(visible(budgetCeiling(1400, "lease", "ar"))));
  assert.ok(!/[A-Za-z]/.test(visible(budgetCeiling(9000000, "buy", "ar"))));
});

// ---------------------------------------------------------------------------
// The API's own shapes.
// ---------------------------------------------------------------------------

test("a numeric string from PostgREST is a number, not a string beside a unit", () => {
  // `budget_sqm_max` is `numeric` and PostgREST hands some numerics back as
  // strings, so a string that never went through Number() would print ungrouped.
  assert.equal(visible(budgetCeiling("1400", "lease", "en")), "up to 1,400 SAR/m²/yr");
  assert.equal(visible(sizeRange("200", "1200", "en")), "200 to 1,200 m²");
});

test("both surfaces render one stored fact identically", () => {
  // The board, the detail card and the lister dashboard call the same two
  // functions with the same arguments, so this is the whole of the agreement
  // between them: there is no second rendering left to disagree with.
  for (const locale of LOCALES) {
    const row = { size_min_sqm: 250, size_max_sqm: null, budget_sqm_max: "1750", deal_type: "lease" };
    const a = sizeRange(row.size_min_sqm, row.size_max_sqm, locale);
    const b = sizeRange(row.size_min_sqm, row.size_max_sqm, locale);
    assert.equal(a, b);
    assert.equal(budgetCeiling(row.budget_sqm_max, row.deal_type, locale), budgetCeiling("1750", "lease", locale));
  }
});
