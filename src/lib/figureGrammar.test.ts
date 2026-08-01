import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { formatInteger, formatRange, formatUnit } from "./format";
import { askingPrice, netArea } from "./listingFigures";

/**
 * PKG-FIG1. The grammar of a figure, guarded at the two levels it can break at.
 *
 * `format.ts` and `listingFigures.ts` already decide how a number, a unit and a
 * range are written. Neither can be broken by a caller that USES them; both are
 * broken by a caller that goes around them. So half of these tests are
 * behavioural, on the modules, and half are source scans, on the callers, and
 * the source scans are the ones that catch the actual defect class: a surface
 * spelling a figure itself.
 */

const codeOnly = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/[^\n]*/g, "$1");

const sources = (): string[] => {
  const out: string[] = [];
  const walk = (d: string) => {
    for (const f of readdirSync(d)) {
      const p = join(d, f);
      if (statSync(p).isDirectory()) walk(p);
      else if (/\.tsx?$/.test(p) && !/\.test\.tsx?$/.test(p)) out.push(p);
    }
  };
  walk("src");
  return out;
};

const read = (p: string) => codeOnly(readFileSync(p, "utf8"));

// ---------------------------------------------------------------------------
// Finding 125. The numerals, in a client component
// ---------------------------------------------------------------------------

test("finding 125: no shipped source calls toLocaleString with no locale", () => {
  // The defect, reproduced so the guard is measured against it rather than
  // asserted. `toLocaleString()` with no argument resolves the DEVICE locale. In
  // a server component that is one environment setting away from wrong; in a
  // client component it is simply wrong, on the reader's phone, today.
  const deviceDependent = (n: number, device: string) => n.toLocaleString(device);
  assert.notEqual(deviceDependent(1250, "ar-SA"), "1,250");
  assert.equal(formatInteger(1250, "ar"), "1,250");
  assert.equal(formatInteger(1250, "en"), "1,250");

  const bare: string[] = [];
  for (const p of sources()) if (/\.toLocaleString\(\s*\)/.test(read(p))) bare.push(p);
  assert.deepEqual(bare, [], "a surface resolved its digits from the reader's device");
});

test("finding 125: the two client components that render the Rent Index band pin their locale", () => {
  // Named rather than left to the sweep above, because these two are the reason
  // the sweep exists: `MarketingHome` is the front door and `MapExplorer` is the
  // explore map, both are `"use client"`, and both were rendering the published
  // REGA band. An Arabic-locale phone read the attributed figure in
  // Arabic-Indic digits on the first screen of the site.
  for (const p of ["src/components/MarketingHome.tsx", "src/components/MapExplorer.tsx"]) {
    const src = readFileSync(p, "utf8");
    assert.match(src, /^"use client";/, `${p}: no longer a client component, so this guard is aimed at the wrong file`);
    assert.match(read(p), /formatInteger|formatRange/, `${p}: stopped routing its figures through the formatter`);
  }
});

test("finding 125: a band with one end absent states neither end", () => {
  // `sel.bandHigh ?? 0` invented a ceiling of zero, and `band.band_low ? ...`
  // let a stated low print beside an absent high as "1,800-0". Zero is a figure
  // and nobody wrote it down. The shipped guard is a null check on BOTH ends, so
  // the property under test is that neither end survives alone.
  const shipped = (low: number | null, high: number | null) =>
    low != null && high != null ? formatRange(low, high, "en", 0) : "";
  assert.equal(shipped(1800, 2900), "1,800 to 2,900");
  assert.equal(shipped(1800, null), "");
  assert.equal(shipped(null, 2900), "");
  // The expressions this replaced, kept so the guard can fail against them.
  const invented = (high: number | null) => high ?? 0;
  assert.equal(invented(null), 0);
  for (const p of ["src/components/MapExplorer.tsx", "src/app/[locale]/building/[id]/page.tsx"]) {
    assert.equal(/bandHigh \?\? 0|band_high \?\? 0/.test(read(p)), false, `${p}: a band ceiling is being invented again`);
  }
});

// ---------------------------------------------------------------------------
// Finding 126. The Listing Studio preview
// ---------------------------------------------------------------------------

test("finding 126: the Studio preview renders the figures a visitor is served", () => {
  // The block is captioned "As a visitor will read it". The unit it printed was
  // a seventh spelling that no visitor surface renders, so the caption was false
  // on the one screen whose purpose is letting a lister check their own price.
  const studio = read("src/components/ListingStudio.tsx");
  assert.match(studio, /from "@\/lib\/listingFigures"/, "the preview stopped reading the module every visitor surface reads");

  // Scoped to the preview's own body, not to the file. The same two spellings
  // appear once more in this file on purpose, in the FORM LABEL that collects
  // the price, and that one has to stay: it is the record-level evidence
  // finding 120 turned on, the sentence the lister is reading while they type
  // the number, and therefore the only thing in the tree that says what
  // `listings.asking_rent_sqm` holds. A guard that deleted it would be removing
  // the evidence for the rule it is enforcing.
  const start = studio.indexOf("function preview(");
  assert.ok(start > 0, "the preview function was renamed, so this guard is aimed at nothing");
  const end = studio.indexOf("async function save(", start);
  assert.ok(end > start, "the preview function no longer ends where this guard thinks it does");
  const previewBody = studio.slice(start, end);
  for (const spelling of ["per sqm per year", "للمتر المربع سنوياً"]) {
    assert.equal(previewBody.includes(spelling), false, `the preview spelled the unit itself again: ${spelling}`);
  }
  // The label, asserted present rather than merely tolerated.
  assert.ok(
    studio.includes("Asking rent (SAR per sqm per year)") && studio.includes("الإيجار المطلوب (ريال للمتر المربع سنوياً)"),
    "the intake label that states what the rent column holds was removed; finding 120 lost its evidence",
  );
  assert.ok(previewBody.includes("askingPrice(") && previewBody.includes("netArea("), "the preview stopped drawing its figures from the module");

  // What a visitor is actually served, from the module the public card uses.
  assert.equal(askingPrice("1200", "lease", "en"), "1,200 SAR⁠/⁠m²⁠/⁠yr");
  assert.equal(askingPrice("900000", "sale", "en"), "900,000 SAR");
  // The spelling that shipped, beside it, so the difference is measured.
  const shippedPreview = (price: string, deal: string) =>
    `${Number(price).toLocaleString("en-US")} SAR${deal === "sale" ? "" : " per sqm per year"}`;
  assert.notEqual(shippedPreview("1200", "lease"), askingPrice("1200", "lease", "en"));

  // An unstated figure draws nothing, here as everywhere else.
  assert.equal(netArea("", "en"), null);
  assert.equal(askingPrice("", "lease", "en"), null);
  assert.equal(netArea("not a number", "ar"), null);
});

// ---------------------------------------------------------------------------
// Finding 127. The range separator
// ---------------------------------------------------------------------------

test("finding 127: a range is written once, in the language that reads it", () => {
  assert.equal(formatRange(1800, 2900, "en", 0), "1,800 to 2,900");
  assert.equal(formatRange(1800, 2900, "ar", 0), "⁨1,800 إلى 2,900⁩");
  // Arabic never receives the dash. This is the law ar-lint enforces inside the
  // dictionaries, asserted here on the value the formatter actually returns.
  assert.equal(/[\u2013\u2014]/.test(formatRange(1800, 2900, "ar", 0)), false);
  // Western numerals in both languages, on a range as much as on a bare figure.
  assert.equal(/[٠-٩]/.test(formatRange(1800, 2900, "ar", 0)), false);
  // Low to high, whichever way round the caller passes them, is NOT claimed:
  // the caller states which is which and the formatter states them in that
  // order. Asserted so the contract is visible rather than assumed.
  assert.equal(formatRange(2900, 1800, "en", 0), "2,900 to 1,800");
});

test("finding 127: the surfaces that spelled a range now route through formatRange", () => {
  // Four spellings of one range shipped: `1,800-2,900` with an en dash, the same
  // with spaces, an inline `ar ? " إلى " : "-"` branch, and `formatRange`. The
  // last one already existed.
  //
  // This began life as a tree-wide regex for "an interpolation joined to another
  // interpolation by a dash or by the Arabic connective", and that regex is not
  // a guard, it is a coincidence detector. Run against the tree it named
  // fourteen files, of which six matched a React key (`${x}-${y}`), an ISO date
  // (`${p.year}-${end}T00:00:00.000Z`) or a CSS calc (`calc(${a} - ${b})`), and
  // four more were correct prose that carries its own preposition. A guard whose
  // output is mostly noise gets suppressed, not read.
  //
  // So it is named files instead, which is what the finding actually was: these
  // eight are the surfaces that were rewired, and the property is that each one
  // still gets its range from the formatter that owns the separator.
  const rewired = [
    "src/components/MapExplorer.tsx",
    "src/components/MarketingHome.tsx",
    "src/app/[locale]/building/[id]/page.tsx",
    "src/app/[locale]/market/page.tsx",
    "src/app/[locale]/listings/page.tsx",
    "src/app/[locale]/ops/page.tsx",
    "src/lib/market/verdict.ts",
    "src/lib/rentIndexEvidence.ts",
  ];
  for (const p of rewired) {
    const src = read(p);
    assert.match(src, /formatRange\(/, `${p}: stopped routing its range through the formatter`);
    // The two spellings this package deleted, each one asserted absent by hand
    // rather than by a pattern that cannot tell a range from a React key.
    assert.equal(/\bإلى\s*"\s*:\s*"/.test(src), false, `${p}: an inline Arabic-or-dash branch is back`);
    assert.equal(/\}\s*[\u2013\u2014]\s*\$\{/.test(src), false, `${p}: a dash separator is back between two figures`);
  }
});

test("finding 127: no Arabic string literal in shipped source carries an en dash", () => {
  // The same rule ar-lint now enforces, asserted here too so it survives a
  // change to the lint script and fails in the suite rather than only at the
  // gate. `src/lib/market/verdict.ts` built `النطاق 1,800-2,900` in source and
  // neither the dictionary walk nor the em dash sweep could see it, because both
  // were scoped to a directory rather than to the language.
  const literal = /"[^"\n]*"|'[^'\n]*'|`[^`]*`/g;
  const offenders: string[] = [];
  for (const p of sources()) {
    const hits = (readFileSync(p, "utf8").match(literal) || []).filter(
      (s) => /[\u0600-\u06FF]/.test(s) && /\u2013/.test(s),
    );
    if (hits.length) offenders.push(`${p}: ${hits[0].slice(0, 60)}`);
  }
  assert.deepEqual(offenders, [], "an en dash is back inside Arabic copy");
});

// ---------------------------------------------------------------------------
// Finding 128. The figures the Advisor and the match explainer hand a reader
// ---------------------------------------------------------------------------

test("finding 128: the Advisor's watch baseline does not quote a storage key as a unit", () => {
  // The band came back from PostgREST with `unit` holding the STORED key,
  // `sar_sqm_yr`, written by `ingest/rentBasePipeline.ts` and aliased in
  // `format.ts`. It was interpolated straight into the answer, so an Arabic
  // reply quoting the published, REGA-attributed, licence-gated,
  // passport-carrying band ended in a Latin snake_case identifier. The three
  // figures beside it arrived as PostgREST strings and were interpolated raw,
  // so they were ungrouped as well.
  //
  // The same file already forbids the raw `2026-Q2` period form six lines
  // above, under Codex item 5, which is the same rule about the same class of
  // value reaching a reader in the shape the database keeps it in.
  const route = read("src/app/api/advisor/route.ts");
  assert.match(route, /formatUnit\(band\.unit,/, "the band unit stopped being resolved through the unit table");
  assert.match(route, /formatRange\(bLow, bHigh,/, "the baseline stopped routing its range through the formatter");
  assert.equal(/\$\{band\.band_low\}|\$\{band\.band_high\}|\$\{band\.median\}|\$\{band\.unit\}/.test(route), false,
    "a stored band value is being interpolated raw again");
  // `sar_sqm_yr` resolves to the same rendered unit as the canonical key, which
  // is why the alias exists and why the fix is a lookup rather than a rename of
  // stored data.
  assert.equal(formatUnit("sar_sqm_yr", "en", "short"), formatUnit("sar_sqm_year", "en", "short"));
  assert.equal(formatUnit("sar_sqm_yr", "ar", "short"), formatUnit("sar_sqm_year", "ar", "short"));

  // Codex item 2, applied to the same decision: a figure that cannot be
  // rendered must not reach the browser through the JSON either. One flag now
  // governs the sentence and the payload.
  assert.match(route, /const showBaseline = wGate\.mayShowFigure && baseline !== null;/,
    "the sentence and the payload are being gated by two different decisions again");
});

test("finding 128: the shortlist withholds an asking range it cannot state", () => {
  // `prices.map(Number)` yields NaN for a stored price that does not parse,
  // `Math.min(...[NaN])` is NaN, and the template that tested the result tested
  // a truthy string, so `"Asking runs NaN to NaN"` was reachable. It also spelled
  // the unit `SAR/m²·yr` with a middle dot, against the canonical English
  // `SAR/m²/yr`: an eighth spelling of the unit finding 120 consolidated once.
  const shortlist = read("src/app/api/advisor/shortlist/route.ts");
  assert.match(shortlist, /prices\.filter\(\(n: number\) => Number\.isFinite\(n\)\)/, "the unparseable price is back in the range");
  assert.match(shortlist, /formatUnit\("sar_sqm_year", locale, "short"\)/, "the shortlist is spelling the unit itself again");
  assert.equal(shortlist.includes("SAR/m²·yr"), false, "the eighth spelling of the lease unit is back");
  // The shipped expression, reproduced so this guard fails against it.
  const shipped = (raw: unknown[]) => {
    const n = raw.map(Number);
    return `${Math.min(...n)} to ${Math.max(...n)}`;
  };
  assert.equal(shipped(["nope", "1200"]), "NaN to NaN");
  // What the fix does with the same input: one stated price, no invented range
  // around it, and never the word NaN.
  const stated = ["nope", "1200"].map(Number).filter((n) => Number.isFinite(n));
  assert.deepEqual(stated, [1200]);
});

test("finding 128: the match explainer states its sizes and budgets in the platform's grammar", () => {
  // The size copy printed `1200 sqm` and `1200 متر مربع`: ungrouped, because its
  // local `fmt` was `String(n)`, and in a unit spelling no visitor surface
  // renders, beside a card reading `1,200 m²`. The budget copy printed
  // `2000 per sqm` and `2000 للمتر المربع`, which names an area and NO CURRENCY
  // AND NO PERIOD, for a column the form collects under the label
  // "Budget ceiling (SAR/m²/yr)". A rate with the currency taken off is not a
  // smaller version of the figure, it is a different figure.
  const m = read("src/lib/matching.ts");
  assert.match(m, /import \{ sizeRange \} from "\.\/requirementFigures";/, "the explainer stopped reading the demand-side module");
  assert.match(m, /formatWithUnit\(n, "sar_sqm_year", locale, "short", 0\)/, "the budget lost its currency and period again");
  // Scoped to a unit written directly after a figure, which is the defect. The
  // file also contains `يذكر المُدرِج الإيجار المطلوب للمتر المربع.`, a remedy
  // sentence telling a lister what to state. That is prose about a unit, not a
  // unit attached to a number, and a guard that could not tell the two apart
  // would be asking the copy to stop naming the thing it is about.
  for (const spelling of ["sqm", "متر مربع", "per sqm", "للمتر المربع"]) {
    const attached = new RegExp(`\\}\\s*${spelling.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`);
    assert.equal(attached.test(m), false, `the explainer spelled a unit itself again after a figure: ${spelling}`);
  }
  // Sensitivity: the shipped helper against the formatter, on the figure that
  // stood beside a card.
  const shippedFmt = (n: number) => (Number.isInteger(n) ? String(n) : String(Math.round(n * 10) / 10));
  assert.equal(shippedFmt(1200), "1200");
  assert.equal(formatInteger(1200, "en"), "1,200");
  assert.notEqual(shippedFmt(1200), formatInteger(1200, "en"));
});

test("finding 128: one budget column is rendered in one unit", () => {
  // `budgetCeiling` branched on the deal type and rendered a purchase budget as
  // a bare `SAR` total. `RequirementForm` has one unconditional budget input
  // under one label, and `matching.ts` compares the column it fills against a
  // rate per square metre for sales as well as leases. So the column meant one
  // thing to the form and to the matcher and a different thing to the renderer.
  const rf = read("src/lib/requirementFigures.ts");
  assert.match(rf, /formatUnit\("sar_sqm_year", locale, "short"\)/, "the unit is being branched on the deal type again");
  assert.equal(/deal === "lease" \? "sar_sqm_year" : "sar"/.test(rf), false, "the deal-type branch is back on the unit");
  // The intake form, which is the evidence. Exactly one budget input, under one
  // label, with no deal-type branch anywhere near it. If this ever becomes two
  // fields or a conditional label, the column is being asked to hold two units
  // and the renderer above is no longer the thing to change first.
  const form = read("src/app/[locale]/post-requirement/RequirementForm.tsx");
  const inputs = form.match(/id="pr-budget"/g) || [];
  assert.equal(inputs.length, 1, "the budget is no longer one field, so what the column holds has changed");
  assert.match(form, /\{pr\.budgetCeiling\}/, "the budget label stopped coming from the dictionary");
  assert.equal(/deal[_A-Za-z]*\s*===\s*"(lease|sale|buy)"[^\n]*budget/i.test(form), false,
    "the intake form grew a deal-type branch on the budget, which would change what the column means");
  // And the label itself, which is the sentence the occupier reads while they
  // type the number. English canon is the slash form; Arabic canon is the middle
  // dot. Both are `format.ts`'s, not hand-spelled here.
  const en = JSON.parse(readFileSync("src/i18n/dictionaries/en.json", "utf8"));
  const ar = JSON.parse(readFileSync("src/i18n/dictionaries/ar.json", "utf8"));
  assert.ok(String(en.postReq.budgetCeiling).includes(formatUnit("sar_sqm_year", "en", "short").replace(/⁠/g, "")),
    `the English budget label no longer states the unit format.ts renders: ${en.postReq.budgetCeiling}`);
  assert.ok(String(ar.postReq.budgetCeiling).includes(formatUnit("sar_sqm_year", "ar", "short").replace(/⁠/g, "")),
    `the Arabic budget label no longer states the unit format.ts renders: ${ar.postReq.budgetCeiling}`);
});
