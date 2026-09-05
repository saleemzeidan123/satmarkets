import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { isPubliclyVisibleMedia, PUBLIC_MEDIA_VISIBILITY, HIDDEN_MODERATION_STATE } from "./mediaVisibility";

// PKG-LISTING-CREATION-1B, Codex finding: "media visibility must be
// enforced, not merely recorded." mediaVisibility.ts states the rule once;
// this file holds two different things to that rule.
//
// The first is the predicate itself, isPubliclyVisibleMedia(), tested
// directly against every combination of the two columns it reads.
//
// The second, and the one built specifically to survive a future change
// rather than only describe today's, is a scan of every file under
// src/app that queries listing_media at all. Every such file is
// classified, once, below: either PUBLIC (it can serve an anonymous
// reader, and must call scopeToPublicMedia or otherwise name the exact
// visibility/moderation_state conditions) or OWNER_SCOPED (ownership or
// session-gated, reads its own account's or its own SAT review queue's
// data regardless of visibility, by design, and is listed here with the
// reason). A file that queries listing_media and is in neither list fails
// this test: a future route that reads listing_media has to be filed into
// one category or the other, on purpose, rather than silently shipping
// unfiltered.

test("isPubliclyVisibleMedia: public and not removed is visible", () => {
  assert.equal(isPubliclyVisibleMedia({ visibility: "public", moderation_state: "unreviewed" }), true);
  assert.equal(isPubliclyVisibleMedia({ visibility: "public", moderation_state: "flagged" }), true);
});

test("isPubliclyVisibleMedia: private is never visible, whatever its moderation state", () => {
  assert.equal(isPubliclyVisibleMedia({ visibility: "private", moderation_state: "unreviewed" }), false);
  assert.equal(isPubliclyVisibleMedia({ visibility: "private", moderation_state: "flagged" }), false);
  assert.equal(isPubliclyVisibleMedia({ visibility: "private", moderation_state: "removed" }), false);
});

test("isPubliclyVisibleMedia: removed is never visible, even if public", () => {
  assert.equal(isPubliclyVisibleMedia({ visibility: "public", moderation_state: "removed" }), false);
});

test("isPubliclyVisibleMedia: unreviewed (the default, and today the only real state) stays visible", () => {
  // If this ever flipped, every photo on the platform would vanish: nothing
  // has ever been reviewed, because no review workflow exists yet.
  assert.equal(isPubliclyVisibleMedia({ visibility: "public", moderation_state: "unreviewed" }), true);
});

test("the exported constants match the migration's own vocabulary", () => {
  assert.equal(PUBLIC_MEDIA_VISIBILITY, "public");
  assert.equal(HIDDEN_MODERATION_STATE, "removed");
});

const ROOT = join(process.cwd(), "src", "app");

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name)) out.push(p);
  }
  return out;
}

const rel = (p: string) => p.split(join("src", "app"))[1].split("\\").join("/").replace(/^\//, "");

/**
 * Every file under src/app this scan has confirmed queries listing_media at
 * all, with why it is not a public-facing exposure. Each reads its own
 * account's data (ownership checked in the same route/page, elsewhere) or
 * writes only (no anonymous reader is involved either way). A file
 * removed from here without also being deleted, or moved without this
 * list following it, fails "every listing_media reader is classified"
 * below on purpose.
 */
const OWNER_SCOPED_SURFACES = new Set<string>([
  "[locale]/dashboard/listings/[id]/page.tsx",
  "[locale]/dashboard/listings/[id]/preview/page.tsx",
  "[locale]/dashboard/listings/page.tsx",
  "[locale]/dashboard/new/page.tsx",
  "api/listings/route.ts",
  "api/listings/[id]/route.ts",
  "api/listings/[id]/docs/route.ts",
  "api/listings/[id]/media/route.ts",
  "api/listings/[id]/media/[mediaId]/route.ts",
]);

/**
 * Every file under src/app this scan has confirmed serves listing_media to
 * a reader who is not authenticated as the listing's own owner (or SAT):
 * an anonymous visitor to the public listing page. Each MUST apply the
 * public-media rule; the assertion below fails if one does not.
 */
const PUBLIC_SURFACES = new Set<string>(["[locale]/listings/[id]/page.tsx"]);

test("every file under src/app that queries listing_media is classified as public or owner-scoped", () => {
  const queriesMedia = walk(ROOT).filter((p) => readFileSync(p, "utf8").includes('.from("listing_media")'));
  assert.ok(queriesMedia.length >= 8, `expected at least 8 files querying listing_media, found ${queriesMedia.length}; the scan itself may have stopped working`);

  const unclassified = queriesMedia
    .map(rel)
    .filter((r) => !OWNER_SCOPED_SURFACES.has(r) && !PUBLIC_SURFACES.has(r));
  assert.deepEqual(
    unclassified,
    [],
    `${unclassified.join(", ")} queries listing_media and is not in either list in mediaVisibility.test.ts. ` +
      "Add it to OWNER_SCOPED_SURFACES with a stated reason if it is ownership-gated, or to PUBLIC_SURFACES " +
      "(and make it call scopeToPublicMedia) if an anonymous reader can ever reach it.",
  );

  // The reverse direction: a listed file that no longer queries listing_media
  // at all (moved, deleted, or rewritten) should be removed from these sets
  // rather than left as a stale, unverifiable entry.
  const found = new Set(queriesMedia.map(rel));
  for (const listed of [...OWNER_SCOPED_SURFACES, ...PUBLIC_SURFACES]) {
    assert.ok(found.has(listed), `${listed} is listed in mediaVisibility.test.ts but no longer queries listing_media; remove the stale entry`);
  }
});

test("every PUBLIC_SURFACES file actually applies the public-media rule", () => {
  const missing: string[] = [];
  for (const r of PUBLIC_SURFACES) {
    const p = join(ROOT, r);
    const src = readFileSync(p, "utf8");
    if (!/scopeToPublicMedia/.test(src)) missing.push(r);
  }
  assert.deepEqual(
    missing,
    [],
    `${missing.join(", ")} is a declared public surface for listing_media but does not call scopeToPublicMedia(). ` +
      "A future unfiltered query on this route would serve private or removed media to an anonymous reader.",
  );
});
