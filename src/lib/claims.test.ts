import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

//
// Owner ruling 3 and 4 (2026-07-28) regression guard.
//
// Ruling 3: claims are determined from actual record-level evidence, never inferred
// from route type or generic wording. Ruling 4: named comparables are anonymised
// unless each one has a lawful documented public source and permission for this use.
//
// Both rulings are about surfaces that state more than the data behind them supports.
// A page that overstates does not fail a typecheck, does not fail a build and reads
// perfectly well, which is exactly why it needs a test. The two modelling surfaces,
// /invest and /hbu, are the ones that carried the defect, because a model that shows
// its arithmetic invites the reader to believe its inputs.
//
// The guard is written against the shipped artefacts, the page source and both
// dictionaries, rather than against a helper the pages could stop calling.
//

const ROOT = join(__dirname, "..");
const EN = JSON.parse(readFileSync(join(ROOT, "i18n/dictionaries/en.json"), "utf8"));
const AR = JSON.parse(readFileSync(join(ROOT, "i18n/dictionaries/ar.json"), "utf8"));
const INVEST = readFileSync(join(ROOT, "app/[locale]/invest/page.tsx"), "utf8");
const HBU = readFileSync(join(ROOT, "app/[locale]/hbu/page.tsx"), "utf8");

// Assertions about what a page asserts have to read the code, not the commentary
// around it. Both pages carry a header explaining what was removed and why, and that
// explanation necessarily quotes the wording it removed.
function code(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/.*$/gm, "$1");
}
const INVEST_CODE = code(INVEST);
const HBU_CODE = code(HBU);

// Real Riyadh buildings and companies that appeared as comparables in these two
// tables. Anonymised under ruling 4 because we hold neither the transaction record
// nor a documented permission to attach a price to a named building.
const NAMED_REAL_SUBJECTS = [
  "Olaya Tower", "Al Akaria", "Akaria Plaza", "Tahlia Gate", "Granada Oasis",
  "برج العليا", "العقارية بلازا", "بوابة التحلية", "واحة غرناطة",
];

function compRows(dict: any, section: "invest" | "hbu"): string[][] {
  const c = dict[section]?.comps;
  assert.ok(Array.isArray(c) && c.length > 0, `${section}.comps missing`);
  return c as string[][];
}

// --- ruling 4: no named comparable without a documented source ---

for (const section of ["invest", "hbu"] as const) {
  for (const [locale, dict] of [["en", EN], ["ar", AR]] as const) {
    test(`ruling 4: ${section}.comps names no real building or company (${locale})`, () => {
      const flat = compRows(dict, section).flat().join(" | ");
      for (const name of NAMED_REAL_SUBJECTS) {
        assert.ok(!flat.includes(name), `${section}.comps (${locale}) names "${name}", which has no documented source or permission`);
      }
    });
  }
}

test("ruling 4: the two comparable tables carry the same anonymised set", () => {
  // They are twin illustrations of the same worked example. If one is corrected and
  // the other drifts, the product contradicts itself about the same four rows.
  assert.deepEqual(EN.invest.comps, EN.hbu.comps);
  assert.deepEqual(AR.invest.comps, AR.hbu.comps);
});

// --- ruling 3: the comparable tables claim no verification ---

const VERIFICATION_WORDS = [/verified/i, /موثّق/, /موثق/];

for (const section of ["invest", "hbu"] as const) {
  for (const [locale, dict] of [["en", EN], ["ar", AR]] as const) {
    test(`ruling 3: ${section} comparables note claims no verification (${locale})`, () => {
      const note = String(dict[section].compsNote ?? "");
      assert.ok(note.length > 0, `${section}.compsNote (${locale}) is empty`);
      for (const w of VERIFICATION_WORDS) {
        assert.doesNotMatch(note, w, `${section}.compsNote (${locale}) asserts verification for illustrative rows`);
      }
    });
    test(`ruling 3: ${section} source column reads as simulated, not verified (${locale})`, () => {
      const src = String(dict[section].compsSourceSimulated ?? "");
      assert.ok(src.length > 0, `${section}.compsSourceSimulated (${locale}) is missing`);
      for (const w of VERIFICATION_WORDS) assert.doesNotMatch(src, w);
    });
  }
}

test("ruling 3: neither modelling page renders the verified badge", () => {
  // Verified green is reserved for evidence-backed verification. On these two pages
  // there is no record to back it, so the component must not be reachable at all.
  for (const [name, src] of [["invest", INVEST_CODE], ["hbu", HBU_CODE]] as const) {
    assert.doesNotMatch(src, /<Verified\b/, `${name} renders <Verified>`);
    assert.doesNotMatch(src, /^\s*import\s.*\bVerified\b.*from/m, `${name} imports Verified`);
  }
});

// --- ruling 3: the model asserts no figure of its own ---

test("ruling 3: /invest states no cap rate as verified", () => {
  assert.doesNotMatch(INVEST_CODE, /verified comp/i);
  // Every model input is the reader's, so each is state with a starting value.
  for (const input of ["potentialNoi", "pricingCap"]) {
    assert.match(INVEST_CODE, new RegExp(`useState\\(`), "model inputs must be state");
    assert.match(INVEST_CODE, new RegExp(`\\[${input},\\s*set`), `${input} must be a user input, not a compiled constant`);
  }
});

test("ruling 3: the /invest export names no real building", () => {
  const m = INVEST_CODE.match(/a\.download\s*=\s*"([^"]+)"/);
  assert.ok(m, "expected a download filename in the CSV export");
  const filename = m![1].toLowerCase();
  for (const name of NAMED_REAL_SUBJECTS) {
    assert.ok(!filename.includes(name.toLowerCase().replace(/\s+/g, "-")), `export filename carries "${name}" off the platform`);
  }
  assert.ok(!filename.includes("olaya"));
});

test("ruling 3: /invest tells the reader whose assumptions these are", () => {
  for (const [locale, dict] of [["en", EN], ["ar", AR]] as const) {
    const note = String(dict.invest.assumptionsNote ?? "");
    assert.ok(note.length > 40, `invest.assumptionsNote (${locale}) is missing or too short to carry the point`);
  }
  assert.match(INVEST_CODE, /iv\.assumptionsNote/, "the note exists in the dictionary but the page does not render it");
});

// --- bilingual parity for the keys this correction introduced ---

test("ruling 3: the corrected invest and hbu keys exist in both locales", () => {
  for (const section of ["invest", "hbu"] as const) {
    const en = Object.keys(EN[section]).sort();
    const ar = Object.keys(AR[section]).sort();
    assert.deepEqual(en, ar, `${section} key sets differ between locales`);
  }
});

test("ruling 3: the retired recency chip is gone from both pages and both dictionaries", () => {
  // "Last 6 months" described a query over transaction records. There is no such
  // query and there are no such records, so the key is removed rather than reworded,
  // which stops a future page from reviving it.
  for (const section of ["invest", "hbu"] as const) {
    for (const [locale, dict] of [["en", EN], ["ar", AR]] as const) {
      assert.equal("last6mo" in dict[section], false, `${section}.last6mo still present (${locale})`);
    }
  }
  assert.doesNotMatch(INVEST_CODE, /last6mo/);
  assert.doesNotMatch(HBU_CODE, /last6mo/);
});
