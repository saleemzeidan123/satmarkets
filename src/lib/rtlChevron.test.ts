import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

/**
 * PKG-DISCOVERY-1 item 8, RTL composition and directional icons. Every
 * `Icon.chevr` "back" affordance on the platform rotates 180deg in English
 * (the icon points right by default; a back control needs it pointing left)
 * and must NOT rotate in Arabic, where the icon's own default orientation
 * already points the reading-backward direction. Four of five call sites
 * carried the `ar ? "none" : "rotate(180deg)"` conditional; the fifth,
 * `requirements/[id]/page.tsx`, hardcoded the rotation unconditionally, so
 * its back chevron pointed the wrong way for every Arabic reader. Found by
 * source audit during PKG-DISCOVERY-1 item 8's cross-route sweep, fixed in
 * the same commit that discovered it, and guarded here so a sixth call site
 * cannot reintroduce the same one-line mistake unnoticed.
 *
 * WHY SOURCE-LEVEL. No React renderer in `npm test` (the constraint every
 * other law test in this repo states for itself); a live per-locale render
 * comparison is what `scripts/mobile-sheet-probe.mjs` proves for the one
 * component that already has a Playwright fixture. This test instead proves
 * every current call site by construction: enumerate every file that
 * imports and renders `Icon.chevr` as a back affordance, and assert none of
 * them rotates unconditionally.
 */

const SITES = [
  "app/[locale]/requirements/[id]/page.tsx",
  "app/[locale]/list/page.tsx",
  "app/[locale]/dashboard/enquiries/[id]/page.tsx",
  "app/[locale]/docs/page.tsx",
  "components/MessagesClient.tsx",
];

test("rtl chevrons: every known Icon.chevr back-affordance call site still exists at its recorded path", () => {
  for (const rel of SITES) {
    const p = path.join(__dirname, "..", rel);
    assert.ok(fs.existsSync(p), `expected back-chevron site ${rel} no longer exists; if it moved, update SITES here, and if it was removed, this test's enumeration must shrink deliberately, not silently`);
  }
});

test("rtl chevrons: none of the enumerated back-affordance sites rotates 180deg unconditionally", () => {
  for (const rel of SITES) {
    const body = fs.readFileSync(path.join(__dirname, "..", rel), "utf8");
    const rotations = Array.from(body.matchAll(/transform:\s*("rotate\(180deg\)"|ar \? "none" : "rotate\(180deg\)")/g));
    assert.ok(rotations.length > 0, `${rel}: expected to find at least one Icon.chevr rotation transform; the site's markup may have changed shape`);
    for (const m of rotations) {
      assert.equal(m[1], 'ar ? "none" : "rotate(180deg)"', `${rel}: found a bare, unconditional "rotate(180deg)". This back chevron would point the wrong way in Arabic.`);
    }
  }
});

test("rtl chevrons: no Icon.chevr call site outside the enumerated list exists yet (a new one must be added here deliberately)", () => {
  const out = execSync(`grep -rln "Icon.chevr" src/app src/components || true`, { cwd: path.join(__dirname, "..", ".."), encoding: "utf8" });
  const found = out.split("\n").map((l: string) => l.trim()).filter(Boolean).filter((l: string) => !l.endsWith(".test.ts") && !l.endsWith(".test.tsx"));
  const expected = SITES.map((s) => `src/${s}`).sort();
  assert.deepEqual(found.sort(), expected, "the set of files rendering Icon.chevr changed; update SITES in this test to cover the new or removed call site's RTL mirroring");
});
