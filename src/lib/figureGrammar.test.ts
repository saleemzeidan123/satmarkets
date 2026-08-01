import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { UNITS, fill, formatInteger, formatRange, formatUnit, unitText } from "./format";
import { askingPrice, netArea } from "./listingFigures";
import { normalizeStatisticKind, statisticLabel } from "./evidence";
import { agreedStatistic, agreedUnit, appendUnit, figureCellOf, statUnitHeading, withUnit } from "./market/columnHeading";

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

// ---------------------------------------------------------------------------
// Finding 129. One table for a unit
// ---------------------------------------------------------------------------

/**
 * Findings 120, 124, 128 and 129 were the same defect arriving four times: a
 * surface spelling a unit itself. Each was fixed by rewiring the call sites,
 * and each time a new spelling appeared where the previous sweep had not
 * looked. The reason was structural rather than careless. There were FOUR unit
 * tables, not one, and only the first was typed:
 *
 *   src/lib/format.ts          UNITS, the canon
 *   src/lib/labels.ts          a two-entry map exported as `unitLabel`, dead
 *   src/lib/attributeDisplay.ts  a six-entry EN to AR map
 *   src/lib/market/valueEvidence.ts  two regexes and a private joinUnit
 *
 * These guards are on the structure. The spellings themselves are held by the
 * ar-lint rule, which reads the canonical set out of format.ts so it cannot
 * become a fifth table.
 */

test("finding 129: format.ts is the only unit table left", () => {
  // The dead one, deleted outright: two entries, spaced spellings nothing
  // rendered, and zero callers anywhere in the tree.
  const labels = read("src/lib/labels.ts");
  assert.equal(/export const unitLabel/.test(labels), false, "labels.ts exports a unit table again");
  assert.equal(/SAR ?\/ ?m²/.test(labels), false, "labels.ts is spelling a unit again");

  // The two live ones, now callers of format.ts rather than copies of it.
  for (const p of ["src/lib/attributeDisplay.ts", "src/lib/market/valueEvidence.ts"]) {
    const src = read(p);
    assert.match(src, /formatUnit\(/, `${p} stopped rendering its units through format.ts`);
    assert.equal(/["'`]ريال/.test(src), false, `${p} is spelling an Arabic unit itself again`);
    assert.equal(/Record<string, ?string>\s*=\s*\{[^}]*م²/.test(src), false, `${p} grew a private EN to AR unit map again`);
  }

  // And no shipped source pins half a number format: the numbering system fixed
  // and the rest left to whichever CLDR data the runtime carries. On a client
  // component that runtime is the visitor's browser.
  for (const p of sources()) {
    const src = read(p);
    if (/toLocaleDateString|new Date\(|\.created_at|inLanguage/.test(src)) continue;
    assert.equal(/toLocaleString\([^)]*ar-SA/.test(src), false, `${p} formats a number from the runtime's Arabic CLDR data instead of format.ts`);
  }
});

test("finding 129: every unit the asset field registry stores resolves to the table", () => {
  // This is the guard that closes the class rather than one instance of it. The
  // registry is where a unit enters the platform; if a string here does not
  // resolve, `formatUnit` passes it through verbatim, which is deliberate and
  // is also why nobody sees it. Sixteen fields stored "m" and there was no
  // alias for it, so sixteen fields printed a Latin "m" on an Arabic page.
  //
  // `months` and `years` are excluded because they are counted nouns, not
  // units: they go through `formatCounted`, which is asserted separately in
  // attributeDisplay.test.ts (finding 52).
  const registry = readFileSync("src/lib/assetFields.ts", "utf8");
  const stored = [...registry.matchAll(/unit: "([^"]+)"/g)].map((m) => m[1]);
  assert.ok(stored.length > 30, `only ${stored.length} units found; the registry shape changed`);
  for (const unit of new Set(stored)) {
    if (unit === "months" || unit === "years") continue;
    const ar = formatUnit(unit, "ar", "short").replace(/⁠/g, "");
    assert.equal(/[A-Za-z]/.test(ar), false, `the registry stores ${JSON.stringify(unit)} and it renders as Latin script in Arabic: ${ar}`);
  }
});

test("finding 129: the front door does not spell the platform's most-used unit itself", () => {
  // The live instance. `MarketingHome.tsx` held the lease unit twice in its own
  // copy objects, once per language, and the English one, " SAR/m²·yr", did not
  // match the table. It was on the first screen of the site six times: the band
  // panel, the band caption and three featured price cards.
  const home = read("src/components/MarketingHome.tsx");
  assert.equal(/^\s*unit:/m.test(home), false, "the front door is carrying its own unit spelling again");
  assert.match(home, /formatUnit\("sar_sqm_year"/, "the front door stopped taking its unit from format.ts");

  // Sensitivity: the shipped literal beside the canon, so this fails against
  // the code it replaced rather than restating the new code.
  const shipped = " SAR/m²·yr";
  assert.notEqual(shipped.trim(), formatUnit("sar_sqm_year", "en", "short").replace(/⁠/g, ""));
  assert.equal(formatUnit("sar_sqm_year", "en", "short").replace(/⁠/g, ""), "SAR/m²/yr");
});

test("finding 129: a legacy spelling resolves to the canon instead of passing through", () => {
  // Stored rows and seed data still hold the old spellings, and an alias is the
  // only thing standing between a stored string and the screen. Each pair below
  // is a spelling that exists somewhere in data or in an older file, and the
  // canon it must land on.
  const cases: [string, string, string][] = [
    ["SAR/m²·yr", "SAR/m²/yr", "ريال/م²·سنة"],
    ["sar_sqm_yr", "SAR/m²/yr", "ريال/م²·سنة"],
    ["SAR / m² / yr", "SAR/m²/yr", "ريال/م²·سنة"],
    ["m", "m", "م"],
    ["kN/m²", "kN/m²", "ك.ن/م²"],
    ["L", "L", "لتر"],
    ["t/m²", "t/m²", "طن/م²"],
  ];
  for (const [stored, en, ar] of cases) {
    assert.equal(formatUnit(stored, "en", "short").replace(/⁠/g, ""), en, `EN: ${stored}`);
    assert.equal(formatUnit(stored, "ar", "short").replace(/⁠/g, ""), ar, `AR: ${stored}`);
  }
});

test("finding 129: the ar-lint unit rule is aimed at the table, not at a copy of it", () => {
  // A hardcoded canonical list inside the gate would be a fifth table, and it
  // would be wrong the first time UNITS changed. The gate reads format.ts, so
  // this asserts the two shapes it depends on are still there.
  const gate = readFileSync("scripts/ar-lint.mjs", "utf8");
  assert.match(gate, /readFileSync\("src\/lib\/format\.ts"/, "the unit gate stopped reading the canon from format.ts");
  assert.match(gate, /unit-law/, "the unit gate lost its explicit exemption marker");
  const fmt = readFileSync("src/lib/format.ts", "utf8");
  assert.match(fmt, /export const UNITS = \{/, "the gate slices on this exact string");
  assert.match(fmt, /\} as const;/, "the gate slices on this exact string");
});

// ---------------------------------------------------------------------------
// Finding 130. The statistic, resolved beside the row rather than frozen in copy
// ---------------------------------------------------------------------------

test("finding 130: a band cannot reach the client without the statistic it is", () => {
  const home = readFileSync("src/components/MarketingHome.tsx", "utf8");
  // `stat?: string` would let a band travel with no statistic and let the
  // caption fall back to whatever word the dictionary happened to hold, which is
  // the defect itself. The field is required, so the compiler is the real guard
  // and this only asserts the compiler is still pointed at it.
  assert.match(home, /export type HeroBand = \{[^}]*\bstat: string/, "HeroBand stopped requiring the statistic");
  assert.equal(/\bstat\?:/.test(home), false, "the statistic became optional on HeroBand");

  const front = read("src/app/[locale]/page.tsx");
  assert.match(front, /statisticLabel\(normalizeStatisticKind\(r\.stat_kind\), ar\)/, "the front door stopped resolving the statistic from the row it describes");
  assert.match(front, /\.select\("[^"]*stat_kind/, "the front door select dropped stat_kind, so the label would have nothing to resolve from");
});

test("finding 130: an unlabelled row does not become an average on the way to the screen", () => {
  // Behavioural, and this is the whole of Law 6 in three lines: `unknown` has no
  // path into a named statistic, and the two named ones have no path into each
  // other.
  const avg = statisticLabel(normalizeStatisticKind("average"), false);
  const med = statisticLabel(normalizeStatisticKind("median"), false);
  const unk = statisticLabel(normalizeStatisticKind(null), false);
  assert.notEqual(avg, med);
  assert.notEqual(unk, avg);
  assert.notEqual(unk, med);
  assert.equal(statisticLabel(normalizeStatisticKind("Average"), false), unk, "a near miss resolved into the real thing");

  // The dictionary holds the sentence and the row supplies the word, in both
  // languages, so the caption can no longer assert a statistic of its own.
  for (const loc of ["en", "ar"] as const) {
    const d = JSON.parse(readFileSync(`src/i18n/dictionaries/${loc}.json`, "utf8"));
    // PKG-FIG2 closure, finding 132. The pattern moved from `home` to `common`
    // when the Rent Index, the listings index cut and the front door turned out
    // to need the same one sentence shape. A second copy under `home` would be
    // the second table this package exists to remove.
    assert.equal(d.home.statUnit, undefined, `${loc}: the front door kept a private copy of the shared pattern`);
    assert.match(d.common.statUnit, /\{stat\}/, `${loc}: the caption pattern lost its statistic slot`);
    assert.match(d.common.statUnit, /\{unit\}/, `${loc}: the caption pattern lost its unit slot`);
    assert.equal(d.home.medianUnit, undefined, `${loc}: the key that hardcoded one statistic came back`);
  }

  // Sensitivity: the shipped strings this replaced. Both named a statistic in
  // the copy, so both read the same whatever the row underneath said.
  for (const shipped of ["Average {unit}", "المتوسط {unit}"]) {
    assert.equal(/\{stat\}/.test(shipped), false);
  }
});

// ---------------------------------------------------------------------------
// Finding 131. Not how a unit is spelled, but who spelled it and in what language
// ---------------------------------------------------------------------------

test("finding 131: unitText and formatUnit differ by word joiners and by nothing else", () => {
  const strip = (s: string) => s.replace(/⁠/g, "");
  for (const key of Object.keys(UNITS)) {
    for (const loc of ["en", "ar"] as const) {
      for (const len of ["long", "short"] as const) {
        const joined = formatUnit(key, loc, len);
        const plain = unitText(key, loc, len);
        assert.equal(strip(joined), plain, `${key}/${loc}/${len}: the two spellings of one unit diverged`);
        assert.equal(/⁠/.test(plain), false, `${key}/${loc}/${len}: unitText leaked a word joiner`);
      }
    }
  }
  // The reason the second function exists, stated as a difference rather than as
  // a comment: a CSV header has no line to break, and an invisible U+2060 that
  // leaves the platform is a control character in someone else's spreadsheet.
  assert.equal(unitText("sar_sqm_year", "en", "short"), "SAR/m²/yr");
  assert.notEqual(formatUnit("sar_sqm_year", "en", "short"), "SAR/m²/yr");
});

test("finding 131: no Arabic dictionary value spells a unit in English", () => {
  // The authorship rule, aimed at the data half of the finding and expressed
  // against the table rather than against a copy of it. `SAR/yr` is a canonical
  // spelling, which is why the PKG-FIG2 spelling gate passed it while it sat
  // inside an Arabic sentence: a gate that checks how a unit is spelled cannot
  // see who spelled it.
  const arSpellings = new Set<string>(Object.values(UNITS).flatMap((u) => [u.ar.long, u.ar.short]));
  const enOnly = [...new Set(Object.values(UNITS).flatMap((u) => [u.en.long, u.en.short]))]
    // The English metre is `m`. A one-letter match inside Arabic prose is noise,
    // so the limit is stated here rather than discovered later.
    .filter((s) => s.length >= 2 && !arSpellings.has(s));
  assert.ok(enOnly.length >= 8, `only ${enOnly.length} English-only unit spellings; the table shape changed under this test`);

  const offenders: string[] = [];
  const walkVals = (v: unknown, at: string) => {
    if (typeof v === "string") {
      if (!/[؀-ۿ]/.test(v)) return;
      for (const u of enOnly) {
        const esc = u.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        // `_` is a word character, so a plain word boundary matched `SAR` inside
        // the identifier `SAR_SQM_YR_AR` and accused a clean file three times.
        if (new RegExp(`(?<![A-Za-z0-9_])${esc}(?![A-Za-z0-9_])`).test(v)) offenders.push(`${at} carries ${JSON.stringify(u)}: ${v}`);
      }
    } else if (Array.isArray(v)) v.forEach((x, i) => walkVals(x, `${at}[${i}]`));
    else if (v && typeof v === "object") for (const [k, x] of Object.entries(v as Record<string, unknown>)) walkVals(x, `${at}.${k}`);
  };
  walkVals(JSON.parse(readFileSync("src/i18n/dictionaries/ar.json", "utf8")), "ar");
  assert.deepEqual(offenders, [], `Arabic copy spelling a unit in English:\n${offenders.join("\n")}`);
});

test("finding 131: the labels that spelled their own unit now hold a slot for it", () => {
  const keys: [string, string][] = [
    ["invest", "csvAcqPrice"],
    ["invest", "csvIndValue"],
    ["invest", "csvNoi"],
    ["invest", "csvPotentialNoi"],
    ["invest", "potentialNoi"],
    ["invest", "kNoi"],
    ["hbu", "kNoi"],
  ];
  for (const loc of ["en", "ar"] as const) {
    const d = JSON.parse(readFileSync(`src/i18n/dictionaries/${loc}.json`, "utf8"));
    for (const [section, key] of keys) {
      const v = d[section][key] as string;
      assert.match(v, /\{unit\}/, `${loc}.${section}.${key} stopped taking its unit from the table`);
      assert.equal(/SAR|ريال/.test(v), false, `${loc}.${section}.${key} spells a currency unit in its own copy`);
      // `fill` leaves an unmatched placeholder visible, so a caller that forgets
      // the slot is a defect nobody can miss rather than a silent one.
      assert.equal(fill(v, { unit: unitText("sar_year", loc, "short") }).includes("{unit}"), false);
    }
  }
});

test("finding 131: the unit-law exemption is usable in the files that need it", () => {
  const gate = readFileSync("scripts/ar-lint.mjs", "utf8");
  // The marker is a comment and the text being scanned has had its comments
  // removed, so the marker has to be read from the original line. Blanking a
  // comment in place rather than deleting it is what keeps the two line arrays
  // in step: the old stripper collapsed a block comment's newlines, so every
  // line index after it moved and the documented exemption could not be used in
  // a TypeScript file at all. It was reachable only from a `.json` file, which
  // is the one kind of file that cannot hold a comment.
  assert.match(gate, /const exempt = \(rawLines, i\) =>/, "the gate stopped reading the marker from the raw line");
  assert.match(gate, /m\.replace\(\/\[\^\\n\]\/g, " "\)/, "the comment stripper stopped preserving line count");

  // The property the exemption rests on, asserted rather than described.
  const stripComments = (s: string) =>
    s
      .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
      .replace(/(^|[^:])\/\/[^\n]*/g, (m, p1) => p1 + " ".repeat(m.length - p1.length));
  const sample = "a\n/* one\n   two */ b\nc // three\n";
  const before = sample.split("\n");
  const after = stripComments(sample).split("\n");
  assert.equal(after.length, before.length, "the stripper changed the number of lines");
  for (let i = 0; i < before.length; i++) assert.equal(after[i].length, before[i].length, `line ${i} changed width`);

  // Each marker sits on the same line as the literal it exempts. A marker on the
  // line above exempts the line above, which is a different line.
  for (const p of ["src/lib/search/aiParse.ts", "src/lib/search/queryParse.ts", "src/lib/market/numericIntent.ts"]) {
    const hits = readFileSync(p, "utf8").split(/\r?\n/).filter((l) => /unit-law/.test(l));
    assert.equal(hits.length, 1, `${p}: expected exactly one unit-law marker, found ${hits.length}`);
    assert.match(hits[0], /[؀-ۿ]/, `${p}: the unit-law marker is not on the line carrying the Arabic literal`);
  }
});

// ---------------------------------------------------------------------------
// Finding 132. A heading is a claim about the column under it
// ---------------------------------------------------------------------------

test("finding 132: a column names a statistic only when every cell agrees", () => {
  const avg = { stat_kind: "average", unit: "SAR/m2/yr" };
  const med = { stat_kind: "median", unit: "SAR/m2/yr" };

  assert.equal(agreedStatistic([avg, avg, avg].map(figureCellOf)), "average");
  assert.equal(agreedStatistic([avg, med, avg].map(figureCellOf)), null, "one median among the averages did not deny the heading");
  assert.equal(agreedStatistic([]), null, "an empty column named a statistic");

  // The defect exactly: the shipped code read `rows[0].stat_kind`, so the first
  // row's word became the whole set's word. Order must not decide.
  assert.equal(agreedStatistic([avg, med].map(figureCellOf)), agreedStatistic([med, avg].map(figureCellOf)));

  // The shipped rule, written out, so this test can fail against it rather than
  // merely describe it. `columnHeading.ts` is new, so reverting the callers does
  // not exercise the module; the rule it replaced has to be stated here.
  const shipped = (rows: { stat_kind: string }[]) => normalizeStatisticKind(rows[0].stat_kind);
  assert.equal(shipped([avg, med]), "average");
  assert.notEqual(agreedStatistic([avg, med].map(figureCellOf)), shipped([avg, med]), "agreement collapsed back into the first row's word");
  assert.notEqual(shipped([avg, med]), shipped([med, avg]), "the rule under test was not actually order dependent");

  // `unknown` is a name for having no name, so it never earns a heading.
  assert.equal(agreedStatistic([{ stat_kind: null, unit: "SAR/m2/yr" }].map(figureCellOf)), null);
  assert.equal(agreedStatistic([{ stat_kind: "Average", unit: "SAR/m2/yr" }].map(figureCellOf)), null, "a near miss resolved into a real statistic");
});

test("finding 132: a column names a unit only when every cell agrees, and a missing unit denies it", () => {
  const yr = figureCellOf({ stat_kind: "average", unit: "SAR/m2/yr" });
  const mo = figureCellOf({ stat_kind: "average", unit: "SAR/m2/mo" });
  const bare = figureCellOf({ stat_kind: "average" });

  assert.equal(agreedUnit([yr, yr]), "sar_sqm_year");
  // The half of the defect a reader cannot detect. The header said SAR/m² over
  // rows storing SAR/m2/yr, and per year against per month is a factor of twelve.
  assert.notEqual(agreedUnit([yr, yr]), "sar_sqm");
  assert.equal(agreedUnit([yr, mo]), null, "a mixed period still produced one unit");
  // The narrow select carries no `unit`. It must cost the heading its unit.
  assert.equal(agreedUnit([yr, bare]), null, "a row that arrived without a unit did not deny the column");
  assert.equal(agreedUnit([]), null);

  for (const loc of ["en", "ar"] as const) {
    const pattern = JSON.parse(readFileSync(`src/i18n/dictionaries/${loc}.json`, "utf8")).common.statUnit;
    assert.equal(appendUnit("Rent", null, loc, pattern), "Rent", `${loc}: a column with no agreed unit printed one anyway`);
    assert.match(withUnit("Rent", [yr, yr], loc, pattern), new RegExp(unitText("sar_sqm_year", loc, "short").replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `${loc}: the agreed unit did not reach the heading`);
    assert.equal(withUnit("Rent", [yr, mo], loc, pattern), "Rent", `${loc}: a mixed column printed a unit`);

    // The heading itself: the statistic when the cells agree, the neutral
    // quantity word when they do not, and never the other way round.
    const words = { neutral: "Rent", pattern };
    assert.match(statUnitHeading([yr, yr], loc, words), new RegExp(statisticLabel("average", loc === "ar").replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `${loc}: an agreed column lost its statistic`);
    // `mo` differs from `yr` only in its unit, so a heading over the two still
    // agrees about the statistic. Disagreement about the statistic is a separate
    // pair, and the neutral word is what it must fall back to.
    const medYr = figureCellOf({ stat_kind: "median", unit: "SAR/m2/yr" });
    assert.equal(statUnitHeading([yr, medYr], loc, words).includes(statisticLabel("average", loc === "ar")), false, `${loc}: a mixed column still claimed a statistic`);
    assert.equal(statUnitHeading([yr, medYr], loc, words).includes(statisticLabel("median", loc === "ar")), false, `${loc}: a mixed column claimed the other statistic instead`);
    assert.match(statUnitHeading([yr, medYr], loc, words), /^Rent/, `${loc}: a mixed column lost the neutral quantity word`);
  }
});

test("finding 132: no surface spells a statistic or a unit over figures it did not read", () => {
  // The five shipped strings. Each named a statistic in copy, and three of them
  // spelled a unit that dropped the period the stored unit carried.
  for (const loc of ["en", "ar"] as const) {
    const d = JSON.parse(readFileSync(`src/i18n/dictionaries/${loc}.json`, "utf8"));
    for (const [section, key] of [["listings", "colMedian"], ["rentIndex", "thMedian"]] as const) {
      assert.equal(d[section][key], undefined, `${loc}: ${section}.${key}, the heading that asserted its own statistic, came back`);
    }
    const spelled = /SAR\s*\/\s*m|ريال\s*\//;
    for (const [section, key] of [["listings", "colStat"], ["listings", "colBand"], ["rentIndex", "thStat"], ["rentIndex", "thBand"], ["rentIndex", "heatSubReal"], ["rentIndex", "kpiOffice"], ["rentIndex", "kpiRetail"], ["marketPage", "kpiMedianOffice"], ["flyer", "officeAvg"]] as const) {
      const v = d[section][key];
      assert.equal(typeof v, "string", `${loc}: ${section}.${key} is missing`);
      assert.equal(spelled.test(v), false, `${loc}: ${section}.${key} spells a unit the unit table owns: ${v}`);
    }
    // The clause the heat-map sentence gave up so it could end where the unit
    // does. Without it the thin-sample explanation would have been lost.
    assert.equal(typeof d.rentIndex.heatSubRealThin, "string", `${loc}: the thin-sample clause went missing`);
    // The two rent tiles said different things in the two languages: English
    // named no statistic, Arabic named "average". Parity is the point.
    assert.equal(/\{unit\}/.test(d.rentIndex.kpiOffice), false, `${loc}: the office tile still interpolates a unit the page chose`);
  }

  // The callers, scanned. A dictionary can be right and the page can still spell
  // its own heading, which is how this shipped in the first place.
  const ri = read("src/app/[locale]/rent-index/page.tsx");
  assert.match(ri, /statUnitHeading\(cells, loc/, "the Rent Index heading stopped resolving from its rows");
  assert.match(ri, /withUnit\(ri\.thBand, cells, loc/, "the band heading stopped resolving its unit");
  assert.equal(/formatUnit\("sar_sqm_year"/.test(ri), false, "the Rent Index went back to naming the unit of a figure it had not looked at");

  const dl = read("src/app/[locale]/listings/page.tsx");
  assert.match(dl, /statUnitHeading\(idxCells, locale/, "the listings index cut stopped resolving its heading");
  assert.equal(/Number\(r\.median\)\.toLocaleString/.test(dl), false, "the index cut went back to spelling its own numerals");

  // One layer down, the same shape: the first row's word presented as the set's.
  const pubSrc = read("src/lib/market/published.ts");
  assert.equal(/rows\[0\]\.stat_kind/.test(pubSrc), false, "the published KPIs went back to reading the first row's statistic");
  assert.match(pubSrc, /stat: agreedStatistic\(cells\)/, "the published statistic stopped requiring agreement");
  assert.match(pubSrc, /unit: agreedUnit\(cells\)/, "the published unit stopped requiring agreement");
});
