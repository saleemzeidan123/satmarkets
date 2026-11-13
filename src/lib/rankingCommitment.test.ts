import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

// PKG-DESIGN-5A. "Ranking is never sold" is printed on the results page and on
// /neutrality. A sentence like that is only worth printing while the code that
// orders the results cannot read a payment, so this file holds the code to the
// sentence. Source-level, like every other law test here.

const strip = (s: string) => s.replace(/\{\/\*[\s\S]*?\*\/\}/g, "").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
const PAGE = strip(fs.readFileSync(path.join(import.meta.dirname, "../app/[locale]/listings/page.tsx"), "utf8"));
const dict = (lang: string) => JSON.parse(fs.readFileSync(path.join(import.meta.dirname, `../i18n/dictionaries/${lang}.json`), "utf8"));

test("the results page orders listings by nothing a lister can pay for", () => {
  // Every word under which a paid position has ever been hidden in a listings
  // product. None may appear in the page that fetches, filters and sorts.
  assert.doesNotMatch(PAGE, /sponsor|promot|boost|featured|\bpaid\b|priority_rank|is_sat_listed|is_operator/i, "listings/page.tsx reads a field that could carry a paid or operator preference into the order");
  // The sorts the page can run, by name. A new one has to be added here on purpose.
  const sorts = Array.from(PAGE.matchAll(/sort === "([a-z_]+)"/g)).map((m) => m[1]).sort();
  assert.deepEqual(Array.from(new Set(sorts)), ["best", "rent", "rent_desc", "size", "size_desc"], "the set of sort orders changed; confirm none of them reads a payment before extending this list");
  assert.match(PAGE, /\.order\("created_at", \{ ascending: false \}\)/, "the default order must stay newest first, read from the record's own date");
});

test("the commitment is stated on the results page and links to the page that spells it out", () => {
  assert.match(PAGE, /<Link href=\{`\/\$\{locale\}\/neutrality`\} className="rs-ranknote">\{dl\.rankNote\}<\/Link>/, "the results count line must state the ranking rule and link to /neutrality");
  const neutrality = strip(fs.readFileSync(path.join(import.meta.dirname, "../app/[locale]/neutrality/page.tsx"), "utf8"));
  assert.match(neutrality, /\[c\.cPaidT, c\.cPaidB\]/, "/neutrality must carry the paid-space commitment");
});

test("the commitment says the same four things in both languages", () => {
  const en = dict("en"), ar = dict("ar");
  assert.equal(en.listings.rankNote, "Ranking is never sold.");
  assert.ok(ar.listings.rankNote.length > 0);
  // Not sold; labelled; outside the ranking; nothing on sale yet.
  for (const w of ["cannot be bought", "labelled as paid", "outside the ranked list", "No paid space is on sale during this preview"]) {
    assert.ok(en.neutrality.cPaidB.includes(w), `neutrality.cPaidB (en) must say: ${w}`);
  }
  for (const w of ["لا يمكن شراء الترتيب", "مدفوعة", "خارج قائمة الترتيب", "خلال هذه المعاينة"]) {
    assert.ok(ar.neutrality.cPaidB.includes(w), `neutrality.cPaidB (ar) must say: ${w}`);
  }
});
