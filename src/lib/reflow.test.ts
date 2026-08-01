import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import test from "node:test";

// ---------------------------------------------------------------------------
// Why this file exists
//
// Findings 158 and 184, which are two reports of one property: a grid track
// declared with a fixed floor cannot become narrower than that floor, so at the
// SC 1.4.10 reference of 400 percent zoom on a 1280 wide screen, where the
// viewport is 320 CSS pixels, the track is wider than the box that holds it.
//
//   158: `gridTemplateColumns: "1fr 1fr"` on four form field pairs. Two fixed
//   tracks cannot become one, so each field was measured into a 117px column.
//
//   184: `repeat(auto-fill, minmax(320px, 1fr))` on the requirements board, a
//   320px card inside a 272px content box.
//
// Both were reachable only by looking. Nothing in the repository could see
// them, and the second one is invisible even to a browser check written the
// obvious way, because `html,body{max-width:100%;overflow-x:clip}` at
// sat-platform.css:630 and globals.css:220 means clipped overflow is not
// scrollable overflow: `scrollWidth - clientWidth` reports zero on every page
// of this site whatever the layout does. A 320px card in a 272px box loses its
// right 48px silently. That is how this survived review.
//
// So the guard is a source guard. It asserts the defect class cannot return:
// no fixed pixel floor in a `minmax()` that has no `min()` escape, and no fixed
// `1fr 1fr` pair inside the four critical journeys. Both rules carry named
// exemptions with the reason each one is exempt, so an exemption has to be
// argued rather than assumed.
//
// The idiom the fixes use is `minmax(min(100%, Npx), 1fr)`. It resolves
// identically to `minmax(Npx, 1fr)` at every width where the container is at
// least N wide, and collapses only in the case that previously overflowed. The
// non-regression half of that claim is measured, not asserted here:
// scripts/reflow-probe.mjs renders each site at seven viewports in both
// languages and reports the resolved track widths.
//
// What this file cannot do is prove how any of it renders. It reads text. The
// browser-emulated measurement is the probe; physical-device and screen-reader
// verification is recorded as outstanding in docs/findings-register.md and is
// not claimed here.
// ---------------------------------------------------------------------------

const ROOT = join(import.meta.dirname, "..", "..");
const SRC = join(ROOT, "src");

/**
 * Every file that renders, which deliberately excludes test files.
 *
 * This one describes the defect it forbids, and it names the forbidden value in
 * its own failure messages and exemption reasons, so a scan that read it would
 * fail on its own documentation. Stripping comments is not enough here: the
 * strings are the point. A test file is not a runtime surface, so the honest
 * boundary is to scan what ships.
 */
function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(tsx?|css)$/.test(name) && !/\.test\.(tsx?)$/.test(name)) out.push(p);
  }
  return out;
}

/** Repo-relative, forward slashed, so the exemption keys read the same everywhere. */
function rel(p: string): string {
  return relative(ROOT, p).split(sep).join("/");
}

const FILES = walk(SRC).map((p) => ({ path: rel(p), src: readFileSync(p, "utf8") }));

function sites(re: RegExp): { path: string; line: number; text: string }[] {
  const out: { path: string; line: number; text: string }[] = [];
  for (const f of FILES) {
    for (const m of f.src.matchAll(re)) {
      const line = f.src.slice(0, m.index).split("\n").length;
      out.push({ path: f.path, line, text: m[0] });
    }
  }
  return out;
}

// ---------------------------------------------------------------------------

/**
 * A `minmax()` floor given in an absolute unit, with no `min()` around it.
 *
 * `minmax(0, ...)` is not in scope: zero is already smaller than any container,
 * and it is the standard idiom for letting a track shrink below its content.
 * The unit alternation is what excludes it, since the pattern requires a unit
 * and `0` is written bare everywhere in this repository.
 */
const FIXED_FLOOR = /minmax\(\s*[0-9.]+(?:px|rem|em)\b/g;

/** path:line -> why that fixed floor is allowed to stay. */
const FLOOR_EXEMPT: Record<string, string> = {
  "src/app/[locale]/bilingual/page.tsx:101":
    "minmax(40px,auto) is a 40px label gutter on the internal bilingual comparison page, " +
    "which is a development surface, not a product journey. 40px is below every content " +
    "box measured here, so it cannot be the wider of the two.",
  "src/styles/sat-platform.css:705":
    ".lst-split's 300px track is the search results map panel. It does not need a min() " +
    "escape because it is removed entirely below its own breakpoint: sat-platform.css:710 " +
    "sets `.lst-split{grid-template-columns:1fr}` and :711 sets `.lst-map-panel{display:none}` " +
    "at max-width:1080px, so the 300px track exists only at widths where 300px fits.",
};

test("no grid track has a fixed pixel floor it cannot escape", () => {
  const bad = sites(FIXED_FLOOR)
    .filter((s) => !FLOOR_EXEMPT[`${s.path}:${s.line}`])
    .filter((s) => !/minmax\(\s*min\(/.test(s.text));
  assert.deepEqual(
    bad.map((s) => `${s.path}:${s.line} ${s.text}`),
    [],
    "finding 184. `minmax(Npx, 1fr)` puts an N pixel floor under a track, so once the " +
      "container is narrower than N the item is wider than the box that holds it. On this " +
      "site that does not produce a scrollbar, because html and body are `overflow-x:clip`, " +
      "so the excess is cut off and unreachable and no automated overflow check will see it. " +
      "Write `minmax(min(100%, Npx), 1fr)`: identical at every width where the container is " +
      "at least N wide, collapsing only in the case that was broken. If a site genuinely " +
      "needs the fixed floor, add it to FLOOR_EXEMPT with the reason, as the two current " +
      "entries do.",
  );
});

// ---------------------------------------------------------------------------

const FIXED_PAIR = /gridTemplateColumns:\s*"1fr 1fr"/g;

/**
 * The four critical journeys, by route and component prefix.
 *
 * A fixed pair outside them is still worth fixing, but it is not what this
 * guard is for: it exists so that the journeys Codex named in PKG-A11Y-1 keep
 * the property this package gave them.
 */
const JOURNEYS = [
  "src/app/[locale]/login",
  "src/app/[locale]/signup",
  "src/app/[locale]/dashboard",
  "src/app/[locale]/list",
  "src/app/[locale]/listings",
  "src/app/[locale]/post-requirement",
  "src/app/[locale]/requirements",
  "src/components/EditListingForm.tsx",
  "src/components/ListingStudio.tsx",
  "src/components/ProfileForm.tsx",
  "src/components/ListingDocsManager.tsx",
  "src/components/ListingMediaManager.tsx",
];

/** path:line -> why that fixed pair is allowed to stay. */
const PAIR_EXEMPT: Record<string, string> = {
  "src/app/[locale]/advisor/page.tsx:182":
    ".adv-jobs-grid is overridden to a single column at max-width:820px by " +
    "globals.css:412, which fires well above every width at which the pair would be too " +
    "narrow. The inline value is the wide-screen case only.",
  "src/app/[locale]/bilingual/page.tsx:138":
    "internal bilingual comparison page, a development surface and not a product journey.",
  "src/app/[locale]/deal/termsheet/page.tsx:65":
    "the term sheet preview is outside the four critical journeys of PKG-A11Y-1. Recorded " +
    "as out of scope rather than fixed blind, because it is a print-shaped document surface " +
    "and the right answer there is a layout decision, not this substitution.",
};

test("no critical journey lays a form out in a pair that cannot become one column", () => {
  const bad = sites(FIXED_PAIR)
    .filter((s) => JOURNEYS.some((j) => s.path === j || s.path.startsWith(j + "/")))
    .filter((s) => !PAIR_EXEMPT[`${s.path}:${s.line}`]);
  assert.deepEqual(
    bad.map((s) => `${s.path}:${s.line}`),
    [],
    "finding 158. `1fr 1fr` is two tracks at every width there will ever be. At 400 percent " +
      "zoom on a 1280 wide screen the viewport is 320 CSS pixels and the dashboard content " +
      "box is 246, which put each field in a 117px column. Use " +
      '`repeat(auto-fit, minmax(min(100%, 8rem), 1fr))`, which auto-fit collapses to one ' +
      "track only when two no longer fit and which is byte identical to `1fr 1fr` above that " +
      "point. Pick the floor against the container, not by habit: the requirement success " +
      "panel uses 7rem because its box is 40px narrower and 8rem would have collapsed a " +
      "layout that renders correctly on a 360px phone. Measure it with " +
      "scripts/reflow-probe.mjs before choosing.",
  );
});

test("the four journey field pairs carry the collapsing track, not the fixed one", () => {
  const want: [string, string][] = [
    ["src/components/EditListingForm.tsx", "8rem"],
    ["src/components/ProfileForm.tsx", "8rem"],
    ["src/app/[locale]/post-requirement/RequirementForm.tsx", "7rem"],
  ];
  for (const [path, floor] of want) {
    const f = FILES.find((x) => x.path === path);
    assert.ok(f, `${path} is missing; the scan has stopped working`);
    const track = `repeat(auto-fit, minmax(min(100%, ${floor}), 1fr))`;
    assert.ok(
      f!.src.includes(track),
      `${path} no longer declares \`${track}\`. This is the positive half of finding 158: ` +
        "the rule above only proves the old value is gone, and a rewrite that dropped the " +
        "grid entirely would satisfy it while losing the fix. The floors differ by container " +
        "and are not interchangeable.",
    );
  }
});

test("every exemption still names a real site", () => {
  const live = new Set([
    ...sites(FIXED_FLOOR).map((s) => `${s.path}:${s.line}`),
    ...sites(FIXED_PAIR).map((s) => `${s.path}:${s.line}`),
  ]);
  const stale = [...Object.keys(FLOOR_EXEMPT), ...Object.keys(PAIR_EXEMPT)].filter((k) => !live.has(k));
  assert.deepEqual(
    stale,
    [],
    "an exemption points at a line that no longer holds the value it excuses. Line numbers " +
      "move, so a stale key is not harmless: it silently stops excusing the site it was " +
      "written for and starts excusing whatever moved into that line, which is the same " +
      "class of mistake as the enumeration these guards replaced. Re-point it or delete " +
      `it. Stale:\n${stale.join("\n")}`,
  );
});

test("the reflow probe stays in the repository", () => {
  const p = join(ROOT, "scripts", "reflow-probe.mjs");
  const src = readFileSync(p, "utf8");
  assert.match(
    src,
    /overflow-x:\s*clip/,
    "scripts/reflow-probe.mjs must keep the note about `overflow-x:clip`. It is the reason " +
      "the probe measures per item overhang instead of document scroll width, and without " +
      "it the next person writes the check the obvious way and it passes on everything.",
  );
  assert.match(
    src,
    /min\(100%,/,
    "scripts/reflow-probe.mjs must still exercise the shipped track values. It is the only " +
      "evidence that the fixes do not move any layout from 360 upward.",
  );
});
