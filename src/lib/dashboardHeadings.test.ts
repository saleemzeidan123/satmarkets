import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

// ---------------------------------------------------------------------------
// Why this file exists
//
// Findings 143, 161 and 155, which are three reports of one property: the
// dashboard shell wraps every signed-in surface, so anything wrong with its
// structure is wrong on all ten routes at once, and nothing in the repository
// noticed.
//
//   143 and 161: the rail was an `<aside>` containing a `<div>`, so the eight
//   destinations a lister reaches the product through were a complementary
//   landmark and not a navigation one. A reader jumping by landmark found no
//   navigation region anywhere under /dashboard.
//
//   155: the shell rendered `<h1>{accountName}</h1>`, and each page then
//   rendered its own `<h1>`. The first heading on every page was therefore the
//   same string, and it did not say which page it was. Two routes, the overview
//   and viewings, had no first-level heading of their own at all, so removing
//   the shell heading without giving them one would have left them with none.
//
// The fix is structural, so the guard is structural. It asserts the shape the
// shell has to keep rather than the specific strings it currently holds: one
// named navigation landmark for the rail, no heading in the shell, and exactly
// one first-level heading per route. Each of the three findings was reported
// separately and none of them was reachable from a test, which is the actual
// defect this file addresses.
//
// What it cannot do is prove how any of this is announced. A `<nav>` with an
// `aria-label` is evidence that the markup is right. The screen-reader
// verification is recorded as outstanding in docs/findings-register.md and is
// not claimed here.
// ---------------------------------------------------------------------------

const ROOT = join(import.meta.dirname, "..", "..");
const DASH = join(ROOT, "src", "app", "[locale]", "dashboard");

/**
 * Source with its comments removed.
 *
 * These files explain their own structure, and the explanations quote the
 * markup they are about: the comment above the rail says why it is not two
 * `<nav>` elements, and the one above the topbar says what the `<h1>` used to
 * be. A scan that counts elements in the raw text counts those quotations too,
 * and then the file fails its own guard for describing itself accurately. Block
 * comments cover the JSX `{/* … *\/}` form as well, since that is a block
 * comment inside an expression container.
 */
function code(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^[ \t]*\/\/.*$/gm, "");
}

const LAYOUT = code(readFileSync(join(DASH, "layout.tsx"), "utf8"));
const DASHNAV = code(readFileSync(join(ROOT, "src", "components", "DashNav.tsx"), "utf8"));

function pages(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) pages(p, out);
    else if (name === "page.tsx") out.push(p);
  }
  return out;
}

const PAGES = pages(DASH);

test("the dashboard rail is a single named navigation landmark", () => {
  const navs = LAYOUT.match(/<nav\b/g) ?? [];
  assert.equal(
    navs.length,
    1,
    "the dashboard shell must declare exactly one <nav>. Zero is finding 143: an <aside> " +
      "exposes a complementary landmark, so the only route into the product announces as " +
      "an aside. Two is the other half of the trap: a second landmark over the same " +
      "destinations, which is what wrapping DashNav separately would produce.",
  );
  assert.match(
    LAYOUT,
    /<nav className="dside" aria-label=\{[^}]+\}>/,
    'the rail must be `<nav className="dside" aria-label={...}>`. The class carries the ' +
      "entire visual treatment, so the element name is free; the label is what " +
      "distinguishes this region from the site header's own navigation, which is already " +
      'named "Primary". An unnamed second nav is worse than none: it is announced and ' +
      "says nothing.",
  );
  assert.doesNotMatch(
    DASHNAV,
    /<nav\b/,
    "DashNav must not declare its own <nav>. It is mounted by the dashboard shell and by " +
      "nothing else, and the shell already provides the named landmark. Nesting one inside " +
      "the other gives two navigation regions over one item list, the inner one unnamed.",
  );
});

test("the dashboard shell renders no heading of its own", () => {
  assert.doesNotMatch(
    LAYOUT,
    /<h[1-6]\b/,
    "finding 155. The shell wraps every route under /dashboard, so a heading here is " +
      "repeated identically on all of them and describes none of them. The account name " +
      "belongs to the account, not to the page; it stays as text in the topbar and in the " +
      "rail's account link.",
  );
});

test("every dashboard route states its own page title exactly once", () => {
  assert.ok(PAGES.length >= 8, `only ${PAGES.length} dashboard pages found; the scan has stopped working`);
  const wrong: string[] = [];
  for (const p of PAGES) {
    const n = (code(readFileSync(p, "utf8")).match(/<h1\b/g) ?? []).length;
    if (n !== 1) wrong.push(`${p.slice(ROOT.length + 1)} has ${n}`);
  }
  assert.deepEqual(
    wrong,
    [],
    "each dashboard route must render exactly one <h1>, and must contain exactly one in " +
      "its source so that a page with two render branches cannot state a title on one and " +
      "nothing on the other. That is what the viewings page did: an <h2> when it had rows " +
      "and no heading at all when it was empty. Lift the title into one shared block used " +
      `by every branch. Offenders:\n${wrong.join("\n")}`,
  );
});

test("the rail label exists in both languages and is written in each script", () => {
  const en = JSON.parse(readFileSync(join(ROOT, "src", "i18n", "dictionaries", "en.json"), "utf8"));
  const ar = JSON.parse(readFileSync(join(ROOT, "src", "i18n", "dictionaries", "ar.json"), "utf8"));
  const e = en.dashboard?.navRailLabel;
  const a = ar.dashboard?.navRailLabel;
  assert.ok(typeof e === "string" && e.trim().length > 0, "dashboard.navRailLabel is missing from en.json");
  assert.ok(typeof a === "string" && a.trim().length > 0, "dashboard.navRailLabel is missing from ar.json");
  assert.match(
    a,
    /[؀-ۿ]/,
    "the Arabic rail label contains no Arabic. An accessible name that falls back to the " +
      "English string is a landmark an Arabic reader cannot identify, and it is invisible " +
      "on screen, so nothing about the page would look wrong.",
  );
  assert.notEqual(a, e, "the Arabic rail label is the English string");
});
