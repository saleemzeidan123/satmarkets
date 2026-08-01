import test from "node:test";
import assert from "node:assert/strict";
import { netArea, askingPrice, annualTotal, priceParts, priceUnit, priceUnitKey } from "./listingFigures";
import { formatUnit, type Loc } from "./format";

/**
 * PKG-SUP2, findings 120 to 124.
 *
 * The property under test is not "the module agrees with itself". It is that a
 * lease rate the platform collects per year is read back per year on every
 * surface including the lister's own, that a figure no record states never
 * reaches a screen as a figure, and that neither language's digits depend on the
 * reader's device.
 *
 * Each guard that pins a shipped defect has a sensitivity case beside it that
 * reproduces the shipped expression and watches it fail. A guard nobody has
 * watched fail is a guard nobody knows works.
 */

const LOCALES: Loc[] = ["en", "ar"];

/** U+2068 FIRST STRONG ISOLATE, U+2069 POP DIRECTIONAL ISOLATE, U+2060 WORD JOINER. */
const INVISIBLE = /[⁠⁦-⁩]/g;
/** What a reader actually sees, with the bidi and joining controls taken out. */
const visible = (s: string | null): string => (s ?? "").replace(INVISIBLE, "");

// ---------------------------------------------------------------------------
// Finding 120. The rent is annual, and three surfaces said it was not.
// ---------------------------------------------------------------------------

test("a lease rate is stated per square metre PER YEAR, in both languages", () => {
  // The intake label is "Asking rent (SAR per sqm per year)" and, in Arabic,
  // "الإيجار المطلوب (ريال للمتر المربع سنوياً)". This is the read-back of that
  // same column, so the year is not optional decoration on it.
  assert.equal(visible(askingPrice(1400, "lease", "en")), "1,400 SAR/m²/yr");
  assert.equal(visible(askingPrice(1400, "lease", "ar")), "1,400 ريال/م²·سنة");
  assert.equal(visible(askingPrice(1400, "lease", "en", "long")), "1,400 SAR/m²/year");
  assert.equal(visible(askingPrice(1400, "lease", "ar", "long")), "1,400 ريال/م²·سنة");
});

test("sensitivity: the shipped dashboard expressions dropped the year", () => {
  // The lister dashboard and the listing table quoted, with their dictionary
  // values inlined. Both read a per-year column and printed a unit that is not
  // per year, which is the whole finding.
  const shippedDashboard = (rent: number, ar: boolean) =>
    Number(rent).toLocaleString("en-US") + (ar ? " ريال/م²" : " SAR/m²");
  assert.equal(shippedDashboard(1400, false), "1,400 SAR/m²");
  assert.equal(shippedDashboard(1400, true), "1,400 ريال/م²");
  // The defect in one line: what the lister typed, and what they were shown.
  assert.notEqual(shippedDashboard(1400, false), visible(askingPrice(1400, "lease", "en")));
  assert.ok(!shippedDashboard(1400, false).includes("yr"));
  assert.ok(visible(askingPrice(1400, "lease", "en")).includes("yr"));
  assert.ok(!shippedDashboard(1400, true).includes("سنة"));
  assert.ok(visible(askingPrice(1400, "lease", "ar")).includes("سنة"));
});

test("a sale price is an amount, not a rate, and the deal type is what decides", () => {
  assert.equal(priceUnitKey("sale"), "sar");
  assert.equal(priceUnitKey("lease"), "sar_sqm_year");
  // A missing or unrecognised deal type falls to the lease unit rather than to
  // the bare currency, because the bare currency is the reading that understates
  // a rate by a factor of the whole floor plate. Withholding is safe; a rate
  // read as a total is not.
  assert.equal(priceUnitKey(null), "sar_sqm_year");
  assert.equal(priceUnitKey(undefined), "sar_sqm_year");
  assert.equal(priceUnitKey("Sale"), "sar", "the column is not guaranteed lower case");
  for (const locale of LOCALES) {
    assert.equal(visible(askingPrice(9000000, "sale", locale)), visible(`9,000,000 ${formatUnit("sar", locale)}`));
    assert.notEqual(visible(askingPrice(1400, "lease", locale)), visible(askingPrice(1400, "sale", locale)));
  }
});

// ---------------------------------------------------------------------------
// Finding 121 and 122. A figure no record states is not printed.
// ---------------------------------------------------------------------------

test("an unstated area is nothing, not a unit with a hole in front of it", () => {
  for (const locale of LOCALES) {
    for (const v of [null, undefined, ""]) assert.equal(netArea(v, locale), null, String(v));
  }
});

test("an unstated price is nothing, never zero and never on-request-as-a-number", () => {
  for (const locale of LOCALES) {
    for (const v of [null, undefined, ""]) {
      assert.equal(askingPrice(v, "lease", locale), null);
      assert.equal(askingPrice(v, "sale", locale), null);
    }
  }
});

test("sensitivity: the shipped flyer and dashboard printed the hole", () => {
  // The printable flyer, quoted. A listing with no stated area produced a tile
  // reading "null m²" on a document a broker hands to a client.
  const shippedFlyerArea = (a: unknown) => `${a} m²`;
  assert.equal(shippedFlyerArea(null), "null m²");
  assert.equal(shippedFlyerArea(undefined), "undefined m²");
  // The lister dashboard's requirement panel, quoted. A brief that deliberately
  // left its size open was advertised to every lister as "? to ? m²".
  const shippedMatchSpec = (min: unknown, max: unknown) =>
    (min || "?") + " to " + (max || "?") + " m²";
  assert.equal(shippedMatchSpec(null, null), "? to ? m²");
  assert.equal(shippedMatchSpec(500, null), "500 to ? m²");
});

test("a value that cannot be printed is treated as unstated, not printed", () => {
  for (const locale of LOCALES) {
    assert.equal(netArea("abc", locale), null);
    assert.equal(netArea(NaN, locale), null);
    assert.equal(netArea(Infinity, locale), null);
    assert.equal(askingPrice({}, "lease", locale), null);
    assert.equal(askingPrice(Infinity, "sale", locale), null);
  }
});

test("no output ever contains null, NaN, undefined, Infinity or a placeholder", () => {
  const junk = ["null", "NaN", "undefined", "Infinity", "?"];
  const values: unknown[] = [null, undefined, "", "abc", NaN, Infinity, -Infinity, {}, 0, 1200, "1200", 12000.6];
  for (const locale of LOCALES) {
    for (const v of values) {
      for (const s of [netArea(v, locale), askingPrice(v, "lease", locale), askingPrice(v, "sale", locale)]) {
        if (s === null) continue;
        for (const j of junk) assert.ok(!s.includes(j), `${String(v)} in ${locale} leaked ${j}: ${s}`);
      }
      for (const a of values) {
        const s = annualTotal(v, a, "lease", locale);
        if (s === null) continue;
        for (const j of junk) assert.ok(!s.includes(j), `annualTotal(${String(v)}, ${String(a)}) leaked ${j}: ${s}`);
      }
    }
  }
});

// ---------------------------------------------------------------------------
// A derived figure needs both of its inputs.
// ---------------------------------------------------------------------------

test("the annual total is stated only where the rate AND the area are stated", () => {
  assert.equal(visible(annualTotal(1400, 500, "lease", "en")), "700,000 SAR/yr");
  assert.equal(visible(annualTotal(1400, 500, "lease", "ar")), "700,000 ريال/سنة");
  // A missing half is not a zero half. Multiplying through a null would state a
  // total of zero, or a total equal to the other input, and no record supports
  // either.
  assert.equal(annualTotal(1400, null, "lease", "en"), null);
  assert.equal(annualTotal(null, 500, "lease", "en"), null);
  assert.equal(annualTotal(null, null, "lease", "en"), null);
  // Sensitivity: what the arithmetic does when a null is allowed through.
  assert.equal(Number(1400) * Number(null), 0);
  assert.equal(Number(null) * Number(500), 0);
});

test("a sale has no annual total, because the price is already the whole amount", () => {
  for (const locale of LOCALES) {
    assert.equal(annualTotal(9000000, 500, "sale", locale), null);
  }
});

// ---------------------------------------------------------------------------
// Finding 123. Numerals, grouping and one spelling per unit.
// ---------------------------------------------------------------------------

test("figures are grouped, and in Western numerals in both languages", () => {
  for (const locale of LOCALES) {
    for (const s of [netArea(12000, locale), askingPrice(1400000, "sale", locale), annualTotal(1400, 12000, "lease", locale)]) {
      assert.ok(s !== null);
      assert.match(visible(s), /\d{1,3},\d{3}/, `${locale} rendered an ungrouped figure: ${s}`);
      assert.ok(!/[٠-٩۰-۹]/.test(String(s)), `${locale} rendered non-Western digits: ${s}`);
    }
  }
});

test("sensitivity: the shipped explore card and shortlist read the device, not the page", () => {
  // `Number(price).toLocaleString()` with no locale argument. Both call sites
  // are client components, so the runtime default is the BROWSER's locale, and
  // an Arabic-locale device got Arabic-Indic digits on a public page. This
  // reproduces that resolution explicitly rather than describing it.
  const deviceDependent = (n: number, deviceLocale: string) => n.toLocaleString(deviceLocale);
  assert.match(deviceDependent(1400, "ar-EG"), /[٠-٩]/);
  assert.equal(deviceDependent(1400, "ar-EG"), "١٬٤٠٠");
  // And the shipped area expressions, which grouped nothing at all.
  assert.equal(`${12000} m²`, "12000 m²");
  for (const locale of LOCALES) {
    assert.ok(!/[٠-٩]/.test(String(askingPrice(1400, "lease", locale))));
    assert.equal(visible(netArea(12000, locale)), visible(`12,000 ${formatUnit("sqm", locale)}`));
  }
});

test("the unit is spelled by format.ts, one way per locale, on every surface", () => {
  // Before this module the same unit was written four ways: "SAR/m²·yr" on the
  // broker profile and the map pin, "SAR/m²/yr" on the listing page, "SAR/m²"
  // on the lister dashboard and in /find, and "ريال/م²/سنة" in the saved
  // shortlist against "ريال/م²·سنة" everywhere else in Arabic.
  for (const locale of LOCALES) {
    assert.ok(visible(askingPrice(1400, "lease", locale)).endsWith(visible(formatUnit("sar_sqm_year", locale, "short"))));
    assert.ok(visible(netArea(500, locale)).endsWith(visible(formatUnit("sqm", locale))));
    assert.equal(visible(priceUnit("lease", locale)), visible(formatUnit("sar_sqm_year", locale, "short")));
    assert.equal(visible(priceUnit("sale", locale)), visible(formatUnit("sar", locale, "short")));
  }
  assert.equal(visible(formatUnit("sar_year", "en", "short")), "SAR/yr");
  assert.equal(visible(formatUnit("sar_year", "ar", "short")), "ريال/سنة");
});

// ---------------------------------------------------------------------------
// Arabic reads as one run, and carries no Latin.
// ---------------------------------------------------------------------------

test("an Arabic figure is isolated so its digits and unit do not swap places", () => {
  for (const s of [netArea(2000, "ar"), askingPrice(1400, "lease", "ar"), annualTotal(1400, 500, "lease", "ar")]) {
    assert.ok(s !== null && s.startsWith("⁨") && s.endsWith("⁩"), `not isolated: ${JSON.stringify(s)}`);
  }
  // English is left alone: an isolate there is invisible work with no reordering
  // to prevent, and it would put controls into copy that is pasted elsewhere.
  assert.ok(!/[⁦-⁩]/.test(String(netArea(2000, "en"))));
  assert.ok(!/[⁦-⁩]/.test(String(askingPrice(1400, "lease", "en"))));
});

test("no Latin script leaks into an Arabic figure", () => {
  // The explore card, the saved shortlist, /me, /find and the compare table all
  // wrote `m²` as a literal, so an Arabic reader was shown a Latin unit inside
  // Arabic prose, with dir="ltr" forced around it on three of them.
  for (const s of [netArea(2000, "ar"), askingPrice(1400, "lease", "ar"), askingPrice(9000000, "sale", "ar"), annualTotal(1400, 500, "lease", "ar")]) {
    assert.ok(!/[A-Za-z]/.test(visible(s)), `Latin in an Arabic figure: ${s}`);
  }
});

// ---------------------------------------------------------------------------
// The API's own shapes.
// ---------------------------------------------------------------------------

test("a numeric string from PostgREST is a number, not a string beside a unit", () => {
  // `asking_rent_sqm`, `sale_price` and `area_sqm` are `numeric`, and PostgREST
  // hands some numerics back as strings.
  assert.equal(visible(askingPrice("1400", "lease", "en")), "1,400 SAR/m²/yr");
  assert.equal(visible(netArea("12000", "en")), "12,000 m²");
  assert.equal(visible(annualTotal("1400", "500", "lease", "en")), "700,000 SAR/yr");
});

test("one stored row reads the same on every surface that renders it", () => {
  // The explore card, the lister dashboard, the flyer, the compare table and the
  // saved shortlist now call the same two functions with the same arguments, so
  // this is the whole of the agreement between them.
  const row = { asking_rent_sqm: "1750", sale_price: null, area_sqm: 640, deal_type: "lease" };
  for (const locale of LOCALES) {
    assert.equal(askingPrice(row.asking_rent_sqm, row.deal_type, locale), askingPrice(1750, "lease", locale));
    assert.equal(netArea(row.area_sqm, locale), netArea("640", locale));
  }
});

// ---------------------------------------------------------------------------
// The split form, for the three cards that set the unit in a smaller weight.
// ---------------------------------------------------------------------------

test("the split price is the joined price, taken apart", () => {
  // `/me`, the explore card, the listing panel and the Advisor list all draw the
  // amount large and the unit quiet. The typography is theirs; the two strings
  // are not. If these ever diverge, one of those cards is stating a unit the
  // module did not choose.
  for (const locale of LOCALES) {
    for (const [price, deal] of [[1400, "lease"], [9000000, "sale"], ["1750", "lease"]] as const) {
      const p = priceParts(price, deal, locale);
      assert.ok(p);
      // `visible` is applied to BOTH sides: the unit carries word joiners of its
      // own, and the joined form adds a bidi isolate in Arabic. A card that
      // renders the parts in two elements loses that isolate, which is why the
      // three that do it wrap each part in its own `bdi`.
      assert.equal(visible(askingPrice(price, deal, locale)), visible(`${p!.value} ${p!.unit}`));
    }
  }
});

test("an absent price yields no parts, so no card can print a lone unit", () => {
  // The Advisor results list chose its unit by asking whether `asking_rent_sqm`
  // was set and printed it in its own element, so a row with no price rendered
  // "On request" with "SAR/m2/yr" underneath it: a unit qualifying nothing.
  // /me did the same with a ternary that emitted the empty string.
  for (const locale of LOCALES) {
    for (const v of [null, undefined, ""]) {
      assert.equal(priceParts(v, "lease", locale), null);
      assert.equal(priceParts(v, "sale", locale), null);
    }
  }
  // The shipped Advisor expression, watched failing.
  const shippedAdvisorUnit = (rent: number | null, unitSqmYr: string, sar: string) => (rent ? unitSqmYr : sar);
  assert.equal(shippedAdvisorUnit(null, "SAR/m²·yr", "SAR"), "SAR");
});

test("a sale listing is not quoted per square metre because a rent column is empty", () => {
  // Two surfaces decided the unit from `asking_rent_sqm != null`, which is null
  // on every sale listing, so a sale was labelled "SAR" only by accident of that
  // column being the one they looked at. The deal type decides it.
  assert.equal(priceUnitKey("sale"), "sar");
  assert.equal(priceUnitKey("SALE"), "sar");
  assert.equal(priceUnitKey("lease"), "sar_sqm_year");
  // An unknown or absent deal type falls to the lease unit, because every
  // published row in the inventory carries one and a lease is the default deal.
  assert.equal(priceUnitKey(null), "sar_sqm_year");
  assert.equal(priceUnitKey(undefined), "sar_sqm_year");
});

test("the shortlist payload carries the deal type, or a sale states no price at all", () => {
  // Finding 124. `/api/advisor/shortlist` forwarded `asking_rent_sqm` and
  // nothing else, and that column is null on a sale, so a shortlist run for
  // sales returned rows whose price line was simply missing. This is the whole
  // of what the route now has to send for /find to state a price.
  const saleRow = { deal_type: "sale", asking_rent_sqm: null, sale_price: 9000000, area_sqm: 640 };
  const shown = askingPrice(saleRow.deal_type === "sale" ? saleRow.sale_price : saleRow.asking_rent_sqm, saleRow.deal_type, "en");
  assert.equal(visible(shown), "9,000,000 SAR");
  // The shipped expression: the sale price was never read.
  const shippedFind = (r: { asking_rent_sqm: number | null }) => (r.asking_rent_sqm != null ? "shown" : "nothing");
  assert.equal(shippedFind(saleRow), "nothing");
});

test("an area of zero is a stated area and an absent area is not", () => {
  // `Number(l.area_sqm)` on the Advisor page turned a null into 0, so a listing
  // that states no area told the occupier it had none.
  assert.equal(visible(netArea(0, "en")), "0 m²");
  assert.equal(netArea(null, "en"), null);
  assert.equal(Number(null), 0);
});
