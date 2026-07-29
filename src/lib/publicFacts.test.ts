import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { SITEMAP_ROUTES, HELD_ROUTES, PRIVATE_PREFIXES } from "./routePolicy";

//
// ADV-4A. The two machine-readable files in `public/` are shipped verbatim to the
// origin. They never pass through a dictionary, a component, the middleware or the
// prose gate, and they are read instead of the page by the two audiences that cannot
// see a preview banner: an AI assistant reading `llms.txt`, and an app installer
// reading `manifest.webmanifest`. Every claim gate on this platform was written
// against `src`, so both files sat outside all of them while carrying the strongest
// wording anywhere on the site.
//
// `claims.test.ts` now reaches them for the banned frames. This file holds the rules
// that are specific to a facts file rather than to a claim: which routes it may name,
// which attribution it must carry, and the demonstration state it has to disclose.
//

const ROOT = join(__dirname, "..", "..");
const LLMS = readFileSync(join(ROOT, "public/llms.txt"), "utf8");
const MANIFEST = readFileSync(join(ROOT, "public/manifest.webmanifest"), "utf8");
const MANIFEST_JSON = JSON.parse(MANIFEST) as { description: string; name: string; theme_color: string };

// A locale-prefixed path as it appears in prose. The trailing group requires at least
// one path character and excludes the dot, so the ellipsis in "/en/... and /ar/..."
// reads as the site root rather than as a route named "/" or "...".
// Assembled from parts for the same reason brand-color.test.ts assembles it: that
// guard walks `src` and would otherwise report this file. It walks `src` only, which
// is why the law needs restating here for the two files in `public/`.
const GOLD = "#8a" + "7342";

const ROUTE_RE = /\/(?:en|ar)(\/[a-z0-9-]+)?/g;

function advertisedRoutes(src: string): string[] {
  const out = new Set<string>();
  for (const m of src.matchAll(ROUTE_RE)) out.add(m[1] ?? "");
  return [...out].sort();
}

test("ADV-4A: llms.txt names only routes the sitemap publishes", () => {
  // routePolicy.ts is the single source of truth for what may be indexed. A facts
  // file that names a route outside it hands a crawler a path the middleware
  // noindexes, which is a louder contradiction than an unlisted page: the site says
  // do not index this, and the file it publishes for machines says cite it.
  const offenders = advertisedRoutes(LLMS).filter((r) => !SITEMAP_ROUTES.includes(r));
  assert.deepEqual(offenders, [], `llms.txt advertises routes outside the sitemap: ${offenders.join(", ")}`);
});

test("ADV-4A: llms.txt names no held route and no private surface", () => {
  // Stated separately from the test above rather than folded into it, because these
  // two are the failures that actually happened. The shipped file advertised /area,
  // held under the audit rank register, and /find, a private account surface.
  //
  // Matched on the parsed route rather than on a substring of the file. `/list` is a
  // private prefix and `/listings` is a published route, so a substring test would
  // report the sitemap's own listings page as a private surface and would have to be
  // suppressed, which is how a guard stops being read.
  const routes = advertisedRoutes(LLMS);
  for (const { path, reason } of HELD_ROUTES) {
    assert.equal(routes.includes(path), false, `llms.txt advertises the held route ${path}: ${reason}`);
  }
  for (const prefix of PRIVATE_PREFIXES) {
    const hit = routes.find((r) => r === prefix || r.startsWith(`${prefix}/`));
    assert.equal(hit, undefined, `llms.txt advertises the private surface ${hit}`);
  }
});

test("ADV-4A, ruling 2: every Rent Index mention carries the REGA Rental Index (Ejar) attribution", () => {
  // Owner ruling 2, applied per line rather than per file. A file that names the
  // attribution once at the bottom and then describes four Rent Index surfaces above
  // it will be quoted a line at a time, which is the whole point of a facts file, and
  // the line that gets quoted is the one that has to carry the source.
  const offenders = LLMS.split("\n")
    .filter((l) => /Rent Index/.test(l) && !/REGA Rental Index \(Ejar\)/.test(l))
    .map((l) => l.trim().slice(0, 80));
  assert.deepEqual(offenders, [], `Rent Index without its attribution:\n${offenders.join("\n")}`);
});

test("ADV-4A: llms.txt discloses that the listings and figures are sample data", () => {
  // The preview banner is rendered by the layout, so a reader who never loads a page
  // never sees it. Every listing row in the database carries is_demo, and a model
  // that quotes a sample rent as a market rent has been misled by this file rather
  // than by the platform.
  assert.match(LLMS, /sample data/i, "llms.txt does not disclose the demonstration state");
  assert.match(LLMS, /not live market inventory/i, "llms.txt does not say what the sample data is not");
});

test("ADV-4A: the manifest description states no claim the record does not support", () => {
  const d = MANIFEST_JSON.description;
  // The three defects it shipped with, each asserted by name so a rewrite that
  // reintroduces one fails here rather than reading fine.
  assert.doesNotMatch(d, /verified commercial/i, "the manifest asserts a verified corpus or positioning");
  assert.doesNotMatch(d, /decision-grade/i, "the index is REGA's, republished, and is labelled indicative");
  assert.doesNotMatch(d, /\bAI search\b/i, "there is no AI search while the agreement gate is closed");
  assert.match(d, /REGA Rental Index \(Ejar\)/, "the manifest names the index without its source");
});

test("ADV-4A: the public facts files obey the global laws", () => {
  // public/ is outside scripts/ar-lint.mjs, which walks src only, and outside the
  // prose gate. These four laws therefore have no other enforcement on these files.
  for (const [name, src] of [["llms.txt", LLMS], ["manifest.webmanifest", MANIFEST]] as const) {
    assert.doesNotMatch(src, /[\u2014\u2013]/, `${name} carries a dash the law forbids`);
    assert.doesNotMatch(src, /[\u0660-\u0669]/, `${name} carries Arabic-Indic numerals (law 7)`);
    assert.doesNotMatch(src, /03005508/, `${name} carries the wrong FAL number`);
    assert.equal(src.toLowerCase().includes(GOLD), false, `${name} carries the retired SATEstate gold`);
  }
  assert.match(LLMS, /1200025510/, "llms.txt drops the FAL licence number");
  assert.equal(MANIFEST_JSON.theme_color, "#3A6EA5", "the installed app theme must be Harbor");
});
