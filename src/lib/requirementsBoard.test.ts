import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

// PKG-DESIGN-7. The requirements board is drawn like the results it mirrors.
const root = path.join(import.meta.dirname, "../..");
const strip = (s: string) => s.replace(/\{\/\*[\s\S]*?\*\/\}/g, "").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
const PAGE = strip(fs.readFileSync(path.join(root, "src/app/[locale]/requirements/page.tsx"), "utf8"));
const dict = (l: string) => JSON.parse(fs.readFileSync(path.join(root, `src/i18n/dictionaries/${l}.json`), "utf8")).req;

test("the figures a lister scans for sit under labels, each drawn only when present", () => {
  assert.match(PAGE, /\{size \? <span className="rq-fig"><span className="rq-k">\{dict\.req\.colSize\}<\/span>/);
  assert.match(PAGE, /\{budget \? <span className="rq-fig"><span className="rq-k">\{dict\.req\.colBudget\}<\/span>/);
  assert.match(PAGE, /\{when \? <span className="rq-fig"><span className="rq-k">\{dict\.req\.timeline\}<\/span>/);
});

test("the board is one ruled list, not a grid of boxed cards with a chip on every word", () => {
  assert.match(PAGE, /<ol className="rq-list">/);
  assert.doesNotMatch(PAGE, /className="card pad lift"/);
  assert.doesNotMatch(PAGE, /className="chip"/);
  // The amber sample tag read as the "stale" signal used on result rows.
  assert.doesNotMatch(PAGE, /#FCD34D|#92400E|#FFFBEB/);
});

test("every word the board prints comes from the dictionary, in both languages", () => {
  assert.doesNotMatch(PAGE, /`\$\{r\.interest\} interested`|مهتم`/, "the interest count was spliced into an English sentence in code");
  for (const k of ["colSize", "colBudget", "interestedN", "interestedOne", "boardCount", "boardCountOne"]) {
    assert.ok(dict("en")[k] && dict("ar")[k], `req.${k} must exist in both dictionaries`);
  }
});
