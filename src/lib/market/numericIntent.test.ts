import { test } from "node:test";
import assert from "node:assert/strict";
import { readNumericIntent, detectRequestedPeriod } from "./numericIntent";

// PKG-1B.2 regression suite (Codex items 1, 2 and 3). Every question below is one
// Codex actually asked on the live preview and got a wrong answer to. The defect was
// always the same: the value path took the FIRST number in the sentence and presented
// it back as the user's rent, so a reporting year became "your figure".

test("Codex 1: a reporting year is never treated as a comparison rent (EN)", () => {
  const n = readNumericIntent("What was the office band in Al Olaya in 2026?");
  assert.equal(n.rent, null);
  assert.equal(n.rentBasis, null);
  assert.deepEqual(n.years, [2026]);
  assert.equal(n.requestedPeriod, "2026");
});

test("Codex 2: the same holds in Arabic", () => {
  const n = readNumericIntent("ما هو نطاق المكاتب في العليا في 2026؟");
  assert.equal(n.rent, null);
  assert.deepEqual(n.years, [2026]);
  assert.equal(n.requestedPeriod, "2026");
});

test("Codex 3: a request for a past year carries that year, and is not a rent", () => {
  const en = readNumericIntent("What was the office band in Al Olaya in 2025?");
  assert.equal(en.rent, null);
  assert.equal(en.requestedPeriod, "2025");
  // "the 2025 band" cues the year from the RIGHT as well as the left.
  const trailing = readNumericIntent("Show me the 2025 band for Al Olaya offices");
  assert.equal(trailing.rent, null);
  assert.equal(trailing.requestedPeriod, "2025");
  const ar = readNumericIntent("ما نطاق مكاتب العليا لعام 2025؟");
  assert.equal(ar.rent, null);
  assert.equal(ar.requestedPeriod, "2025");
});

test("a genuine rent comparison IS recognized, from its unit", () => {
  const n = readNumericIntent("Is 1,600 SAR/m² fair for an Al Olaya office?");
  assert.equal(n.rent, 1600);
  assert.equal(n.rentBasis, "unit");
  assert.equal(n.requestedPeriod, null);
  assert.deepEqual(n.years, []);
});

test("a rent comparison is recognized in Arabic, including Arabic-Indic digits", () => {
  const n = readNumericIntent("هل 1,600 ريال/م² عادل لمكتب في العليا؟");
  assert.equal(n.rent, 1600);
  assert.equal(n.rentBasis, "unit");
  const indic = readNumericIntent("هل ١٦٠٠ ريال/م² عادل لمكتب في العليا؟");
  assert.equal(indic.rent, 1600);
});

test("a rent stated without a unit is accepted only when the sentence is a comparison", () => {
  const compared = readNumericIntent("We pay 1,750 for our Al Olaya office, is that fair?");
  assert.equal(compared.rent, 1750);
  assert.equal(compared.rentBasis, "comparison");
  // No comparison language, no unit: nothing is promoted to a rent.
  const bare = readNumericIntent("Tell me about 1,750 in Al Olaya");
  assert.equal(bare.rent, null);
});

test("an area request is an area, never a rent and never a year", () => {
  const n = readNumericIntent("I need 2,000 m² in Al Olaya.");
  assert.equal(n.rent, null);
  assert.deepEqual(n.areas, [2000]);
  assert.deepEqual(n.years, []);
  assert.equal(n.requestedPeriod, null);
  for (const q of ["I need 2,000 m2 in Al Olaya.", "I need 2,000 sqm in Al Olaya.", "أحتاج 2,000 متر مربع في العليا."]) {
    const m = readNumericIntent(q);
    assert.deepEqual(m.areas, [2000], q);
    assert.equal(m.rent, null, q);
  }
});

test("percentages and budgets are separated from rents", () => {
  const pct = readNumericIntent("Alert me if the Al Olaya office band moves by 5%");
  assert.deepEqual(pct.percents, [5]);
  assert.equal(pct.rent, null);
  const budget = readNumericIntent("My budget is 900,000 SAR for an Al Olaya office");
  assert.deepEqual(budget.budgets, [900000]);
  assert.equal(budget.rent, null);
});

test("a mixed question keeps every number in its own bucket", () => {
  const n = readNumericIntent("In 2025 we paid 1,450 SAR/m² for 2,000 m², is that 5% above market?");
  assert.equal(n.rent, 1450);
  assert.equal(n.rentBasis, "unit");
  assert.deepEqual(n.areas, [2000]);
  assert.deepEqual(n.percents, [5]);
  assert.deepEqual(n.years, [2025]);
  assert.equal(n.requestedPeriod, "2025");
});

test("an explicit quarter is parsed in both languages and both orders", () => {
  assert.equal(detectRequestedPeriod("What is the 2025-Q3 office band?", []), "2025-Q3");
  assert.equal(detectRequestedPeriod("What is the Q3 2025 office band?", []), "2025-Q3");
  assert.equal(detectRequestedPeriod("ما نطاق المكاتب في الربع الثالث 2025؟", []), "2025-Q3");
  assert.equal(detectRequestedPeriod("What is the office band in Al Olaya?", []), null);
});

// Codex closure patch (27 July). A bare in-range integer used to be claimed as a
// year before the sentence-level comparison fallback could ever see it, so an
// explicit rent comparison whose figure happens to fall in 1900-2100 was answered
// with a historical-period refusal. Comparison intent now outranks the bare-integer
// year default; an EXPLICIT year cue still outranks both.

test("Codex closure: an in-range rent in a comparison sentence is a rent, not a year (EN)", () => {
  const n = readNumericIntent("Is 2000 fair for an Al Olaya office?");
  assert.equal(n.rent, 2000);
  assert.equal(n.rentBasis, "comparison");
  assert.deepEqual(n.years, []);
  assert.equal(n.requestedPeriod, null);
});

test("Codex closure: the same holds in Arabic", () => {
  const n = readNumericIntent("هل 2000 مناسب لمكتب في العليا؟");
  assert.equal(n.rent, 2000);
  assert.equal(n.rentBasis, "comparison");
  assert.deepEqual(n.years, []);
  assert.equal(n.requestedPeriod, null);
});

test("Codex closure: an explicit year cue still wins, even for the same figure", () => {
  const n = readNumericIntent("What was the office band in Al Olaya in 2000?");
  assert.equal(n.rent, null);
  assert.equal(n.rentBasis, null);
  assert.deepEqual(n.years, [2000]);
  assert.equal(n.requestedPeriod, "2000");
  // And a cue INSIDE a comparison sentence keeps the year a year.
  const both = readNumericIntent("Is 1,600 SAR/m² fair for an Al Olaya office in 2000?");
  assert.equal(both.rent, 1600);
  assert.equal(both.rentBasis, "unit");
  assert.deepEqual(both.years, [2000]);
});

test("a thousands-separated quantity is not mistaken for a year", () => {
  // "2,000" is a quantity; "2026" with no separator is a year. This is the rule that
  // stops an area request being answered as a period request.
  assert.deepEqual(readNumericIntent("2,000 m² please").years, []);
  assert.deepEqual(readNumericIntent("in 2026").years, [2026]);
});

// ------------------------------------------------------- ADV-3A.1, item 5
// A bound the person put on a search is not a figure they offered for judgement.
// "under 1,600 SAR/m2" is the most they will pay. It is kept in `caps` rather than
// discarded, so a later search layer can still filter by it.

test("a per-area ceiling is a cap, not an offered rent", () => {
  const n = readNumericIntent("Fitted Grade A office in Granada, around 300 m², under 1,600 SAR/m²");
  assert.equal(n.rent, null);
  assert.deepEqual(n.caps, [1600]);
  assert.deepEqual(n.areas, [300]);
});

test("every ordinary way of writing a bound is recognised, in both languages", () => {
  for (const q of [
    "office below 1,200 SAR per sqm",
    "office up to 1,200 SAR/m²",
    "office no more than 1,200 SAR/m²",
    "office at most 1,200 SAR/m²",
    "office max 1,200 SAR/m²",
    "مكتب بأقل من 1,200 ريال/م²",
    "مكتب لا يزيد عن 1,200 ريال/م²",
    "مكتب بحد أقصى 1,200 ريال/م²",
  ]) {
    const n = readNumericIntent(q);
    assert.equal(n.rent, null, q);
    assert.deepEqual(n.caps, [1200], q);
  }
});

test("a floor is a bound too, so it does not become an offered rent", () => {
  const n = readNumericIntent("warehouse over 400 SAR/m² in Sulay");
  assert.equal(n.rent, null);
  assert.deepEqual(n.caps, [400]);
});

test("a bound inside an explicit comparison is still the rent they pay", () => {
  const n = readNumericIntent("we pay under 1,600 SAR/m2, is that fair");
  assert.equal(n.rent, 1600);
  assert.equal(n.rentBasis, "unit");
  assert.deepEqual(n.caps, []);
});

test("the cap rule touches only per-area rents, never a budget, an area, a percent or a year", () => {
  const b = readNumericIntent("My budget is 900,000 SAR for an office in Al Olaya");
  assert.deepEqual(b.budgets, [900000]);
  assert.deepEqual(b.caps, []);
  const a = readNumericIntent("office under 300 m² in Hittin");
  assert.deepEqual(a.areas, [300]);
  assert.deepEqual(a.caps, []);
  const p = readNumericIntent("alert me when rents move more than 3%");
  assert.deepEqual(p.percents, [3]);
  assert.deepEqual(p.caps, []);
  const y = readNumericIntent("what happened after 2024");
  assert.deepEqual(y.years, [2024]);
  assert.deepEqual(y.caps, []);
});
