import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { SITEMAP_ROUTES, HELD_ROUTES, PRIVATE_PREFIXES } from "@/lib/routePolicy";
import { fieldsFor } from "@/lib/assetFields";

/**
 * Home prototype-link ruling, regression coverage (its own fifth bullet:
 * "Add regression coverage that prevents public Home feature links from
 * targeting held or private routes").
 *
 * THE DEFECT THIS REPLACES. MarketingHome.tsx's twelve-tile feature grid
 * linked five tiles to /invest, /dashboard, /pricing, /deal and /compare, and
 * its closing CTA linked to /dashboard and /find, presenting a private
 * prototype, an authenticated workspace and an explicitly held offer as if
 * each were a browsable public feature. Two of the twelve tiles (indices 3
 * and 8, "Investment underwriting" and "Deal tracking") were never even
 * reachable through the page's own tab grouping, which is recorded below so
 * a future edit that wires them into a group re-triggers this file's checks
 * rather than silently reintroducing the ruling's exact defect.
 *
 * WHY SOURCE-LEVEL. `npm test` has no React renderer wired in (see
 * `functionalTruth.test.ts`'s header for the same constraint), so this reads
 * the client component's own source the way `laws.test.ts` and
 * `reflow.test.ts` already do, rather than rendering it.
 */

const FILE = path.join(__dirname, "MarketingHome.tsx");
const SRC = fs.readFileSync(FILE, "utf8");

// Routes this specific page is allowed to link to even though they are not
// in SITEMAP_ROUTES: verified elsewhere in this package to be genuinely
// public with no session gate (/post-requirement, /list), or a real,
// currently-live page whose indexing is held for a content reason that has
// nothing to do with whether the page itself works (/about, /verification).
const HOME_HELD_OR_PRIVATE_ALLOW = new Set(["/post-requirement", "/list", "/about", "/verification"]);

// The ruling's own four named routes, verbatim, plus /pricing (named
// separately in its own bullet) and /invest (same PRIVATE_PREFIXES class as
// /deal and /compare, carrying its own on-page SampleBanner). A blanket
// string-literal ban is the strongest and least fragile check available: it
// catches the route appearing ANYWHERE in the file, not only inside one
// array a future edit might stop reading from.
const NEVER_LINKED = ["/compare", "/dashboard", "/deal", "/find", "/pricing", "/invest"];

test("Home: the ruling's named routes never appear as a quoted path anywhere in the file", () => {
  for (const route of NEVER_LINKED) {
    const re = new RegExp(`["'\`]${route}(?:["'\`?/])`);
    assert.ok(!re.test(SRC), `MarketingHome.tsx contains "${route}", which the Home prototype-link ruling explicitly forbids`);
  }
});

/**
 * PKG-DESIGN-2. The home page was rebuilt and the twelve-tile feature grid is
 * gone, so the four tests that read its `featLinks` and `PLANNED_FEATS` arrays
 * had nothing left to read. The ruling they enforced has not gone anywhere:
 * the home page may only send a reader to a public route, and may not present
 * a feature that is not live. They are re-expressed below against the page as
 * it now is, and they are stricter than the ones they replace: every link the
 * file contains is checked, not only the ones that happened to sit in one
 * array.
 */

// Every route this page can send a reader to: each `L("...")` call, plus the
// `/listings` the search and the suggestion list push to. The query string is
// dropped, because the policy is about the route.
function linkedRoutes(): string[] {
  const viaL = Array.from(SRC.matchAll(/\bL\((["'`])(\/[^"'`?]*)[^"'`]*\1\)/g)).map((m) => m[2]);
  const viaPush = Array.from(SRC.matchAll(/router\.push\(`\/\$\{locale\}(\/[a-z-]+)/g)).map((m) => m[1]);
  return Array.from(new Set([...viaL, ...viaPush]));
}

test("Home: every route the page links to is a real sitemap route or on the small verified-public allowlist", () => {
  const routes = linkedRoutes();
  assert.ok(routes.length >= 5, `expected the home page to link to at least five routes, found ${routes.join(", ")}; the extraction regex may be stale`);
  const bad: string[] = [];
  for (const route of routes) {
    const held = HELD_ROUTES.some((h) => h.path === route);
    const isPrivate = PRIVATE_PREFIXES.some((p) => route === p || route.startsWith(p + "/"));
    if ((held || isPrivate) && !HOME_HELD_OR_PRIVATE_ALLOW.has(route)) {
      bad.push(`"${route}" (held=${held}, private=${isPrivate})`);
    }
    if (!held && !isPrivate && !SITEMAP_ROUTES.includes(route) && !HOME_HELD_OR_PRIVATE_ALLOW.has(route)) {
      bad.push(`"${route}" is not in SITEMAP_ROUTES, HELD_ROUTES or PRIVATE_PREFIXES at all; route-policy and this page have drifted`);
    }
  }
  assert.deepEqual(bad, [], `the home page links to a held or private route outside the verified-public allowlist:\n${bad.join("\n")}`);
});

test("Home: no link is written as a bare path that skips the locale helper", () => {
  // A literal `href="/..."` would bypass both the locale prefix and the scan
  // above, which only reads `L(...)` and `router.push`.
  assert.doesNotMatch(SRC, /href="\//, "MarketingHome.tsx contains a hardcoded href; route it through L(...) so the ruling's scan can see it");
});

test("Home: a feature that is not live is not presented on the home page at all", () => {
  // The old grid carried five planned tiles, labelled honestly and still
  // spending a third of the grid on absence (audit finding 15). The page now
  // shows only what exists. If a planned item is ever added back it must use
  // the platform's one approved word, so this fails until it does.
  const mentionsPlanned = /planned/i.test(SRC.replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, ""));
  if (mentionsPlanned) {
    assert.match(SRC, /releaseLabel\("planned",\s*ar\)/, "a planned item must render releaseLabel(\"planned\", ar), the shared bilingual label");
  }
});

test("Home: the Listers directory (item 6) is a real, linked destination", () => {
  assert.match(SRC, /href=\{L\("\/listers"\)\}/, "MarketingHome.tsx should link to the real /listers directory built for item 6");
});

test("Home: every asset type in the directory names a measure the field registry actually records", () => {
  // The directory prints, beside each asset type, the first thing a listing of
  // that type is measured by. It reads the label from ASSET_FIELDS, so a key
  // that is not in the registry would print nothing, silently.
  const m = /const LEAD_MEASURE: Record<string, string> = \{([\s\S]*?)\};/.exec(SRC);
  assert.ok(m, "expected a `const LEAD_MEASURE: Record<string, string> = {...}` literal in MarketingHome.tsx");
  const pairs = Array.from(m![1].matchAll(/([a-z_]+):\s*"([a-z_]+)"/g)).map((x) => [x[1], x[2]] as const);
  assert.equal(pairs.length, 15, "LEAD_MEASURE should name one measure for each of the fifteen asset types");
  const missing = pairs.filter(([type, key]) => !fieldsFor(type).some((f) => f.key === key)).map(([type, key]) => `${type}.${key}`);
  assert.deepEqual(missing, [], `LEAD_MEASURE names a field the registry does not hold: ${missing.join(", ")}`);
  const types = /const ASSET_TYPES = \[([^\]]*)\]/.exec(SRC);
  assert.ok(types, "expected a `const ASSET_TYPES = [...]` literal in MarketingHome.tsx");
  const listed = Array.from(types![1].matchAll(/"([a-z_]+)"/g)).map((x) => x[1]).sort();
  assert.deepEqual(listed, pairs.map(([t]) => t).sort(), "ASSET_TYPES and LEAD_MEASURE must cover the same asset types");
});

test("Home: the page states no figure of its own", () => {
  // Law 3 and claims ledger C15. The approved drawings label example listings
  // and the hero building with rents. On the site those would be figures
  // nobody recorded. Every number this page prints must arrive through a prop.
  const code = SRC.replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
  // The lookarounds keep an `rgba(255,255,255,.3)` colour from reading as a
  // figure: a thousands group here is one that is not part of a longer
  // comma-separated run and does not follow an opening bracket.
  assert.doesNotMatch(code, /SAR|ريال|(?<![\d,(])\d{1,3},\d{3}(?![\d,])/, "MarketingHome.tsx contains a currency word or a formatted figure in its own source");
});

test("Home: the closing CTA no longer sends an anonymous visitor to an authenticated area", () => {
  // The bottom CTA used to read `L("/dashboard")` for "List your space". /list
  // is the real, already-honest public page for that intent (PKG-SUP1): it
  // describes the actual intake and says plainly that signing in comes
  // first, rather than an authenticated route this page cannot honestly
  // present as a public feature.
  assert.match(SRC, /href=\{L\("\/list"\)\}/, "the closing CTA's \"List your space\" button should target /list");
});
