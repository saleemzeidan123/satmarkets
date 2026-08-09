import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { SITEMAP_ROUTES, HELD_ROUTES, PRIVATE_PREFIXES } from "@/lib/routePolicy";

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

function extractArrayLiteral(name: string): string[] {
  const m = new RegExp(`const ${name} = \\[([^\\]]*)\\]`).exec(SRC);
  assert.ok(m, `expected a \`const ${name} = [...]\` array literal in MarketingHome.tsx`);
  return Array.from(m![1].matchAll(/"([^"]*)"/g)).map((x) => x[1]);
}

function extractNumberSet(name: string): number[] {
  const m = new RegExp(`const ${name} = new Set\\(\\[([^\\]]*)\\]\\)`).exec(SRC);
  assert.ok(m, `expected a \`const ${name} = new Set([...])\` literal in MarketingHome.tsx`);
  return Array.from(m![1].matchAll(/(\d+)/g)).map((x) => Number(x[1]));
}

test("Home: every non-blank featLinks entry is a real sitemap route or on the small verified-public allowlist", () => {
  const featLinks = extractArrayLiteral("featLinks");
  assert.ok(featLinks.length >= 10, "featLinks looks truncated; the extraction regex may be stale");
  const bad: string[] = [];
  featLinks.forEach((route, i) => {
    if (route === "") return; // a planned tile; covered by the next test
    const held = HELD_ROUTES.some((h) => h.path === route);
    const isPrivate = PRIVATE_PREFIXES.some((p) => route === p || route.startsWith(p + "/"));
    if ((held || isPrivate) && !HOME_HELD_OR_PRIVATE_ALLOW.has(route)) {
      bad.push(`featLinks[${i}] = "${route}" (held=${held}, private=${isPrivate})`);
    }
    if (!held && !isPrivate && !SITEMAP_ROUTES.includes(route) && !HOME_HELD_OR_PRIVATE_ALLOW.has(route)) {
      bad.push(`featLinks[${i}] = "${route}" is not in SITEMAP_ROUTES, HELD_ROUTES or PRIVATE_PREFIXES at all; route-policy and this page have drifted`);
    }
  });
  assert.deepEqual(bad, [], `Home feature tile(s) target a held or private route outside the verified-public allowlist:\n${bad.join("\n")}`);
});

test("Home: every planned-tile index has a blank featLinks entry, so it structurally cannot resolve to a real href", () => {
  const featLinks = extractArrayLiteral("featLinks");
  const planned = extractNumberSet("PLANNED_FEATS");
  assert.ok(planned.length >= 3, "PLANNED_FEATS looks smaller than expected; the extraction regex may be stale");
  for (const i of planned) {
    assert.equal(featLinks[i], "", `PLANNED_FEATS includes index ${i}, but featLinks[${i}] is "${featLinks[i]}", not blank`);
  }
});

test("Home: a planned tile is labelled with the platform's one approved not-live-yet word, never left silently unlinked", () => {
  assert.match(SRC, /import\s*\{\s*releaseLabel\s*\}\s*from\s*"@\/lib\/releaseState"/, "MarketingHome.tsx must import releaseLabel rather than invent its own planned-state copy");
  assert.match(SRC, /releaseLabel\("planned",\s*ar\)/, "a planned tile must render releaseLabel(\"planned\", ar), the shared bilingual label");
  // The planned branch must not carry the interactive .feat-card class (see
  // this file's own comment on why: `.feat-card:hover` cannot be defeated by
  // a modifier class without a specificity fight against load order).
  assert.doesNotMatch(SRC, /className="feat-card feat-card-planned"/, "a planned tile must not also carry the interactive .feat-card class");
});

test("Home: the Listers directory (item 6) is a real, linked destination, replacing the old dashboard tile", () => {
  assert.match(SRC, /"\/listers"/, "MarketingHome.tsx should link to the real /listers directory built for item 6");
  const featLinks = extractArrayLiteral("featLinks");
  assert.ok(featLinks.includes("/listers"), "featLinks must include /listers");
});

test("Home: the closing CTA no longer sends an anonymous visitor to an authenticated area", () => {
  // The bottom CTA used to read `L("/dashboard")` for "List your space". /list
  // is the real, already-honest public page for that intent (PKG-SUP1): it
  // describes the actual intake and says plainly that signing in comes
  // first, rather than an authenticated route this page cannot honestly
  // present as a public feature.
  assert.match(SRC, /href=\{L\("\/list"\)\}/, "the closing CTA's \"List your space\" button should target /list");
});
