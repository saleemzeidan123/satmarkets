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

// Security closure correction (second adversarial review): every fixture
// below now also states derivation_verified/is_legacy_media explicitly,
// matching MediaVisibilityRow's own required fields. A finalized real
// upload is derivation_verified: true, is_legacy_media: false; a genuine
// pre-migration row is the reverse; a forged or not-yet-finalized row is
// both false, and must never read as publicly visible regardless of its
// visibility/moderation_state values.
const finalized = { derivation_verified: true, is_legacy_media: false };
const legacy = { derivation_verified: false, is_legacy_media: true };
const untrusted = { derivation_verified: false, is_legacy_media: false };

test("isPubliclyVisibleMedia: public and not removed is visible, for a finalized upload", () => {
  assert.equal(isPubliclyVisibleMedia({ visibility: "public", moderation_state: "unreviewed", ...finalized }), true);
  assert.equal(isPubliclyVisibleMedia({ visibility: "public", moderation_state: "flagged", ...finalized }), true);
});

test("isPubliclyVisibleMedia: public and not removed is visible, for genuine legacy media", () => {
  assert.equal(isPubliclyVisibleMedia({ visibility: "public", moderation_state: "unreviewed", ...legacy }), true);
  assert.equal(isPubliclyVisibleMedia({ visibility: "public", moderation_state: "flagged", ...legacy }), true);
});

test("isPubliclyVisibleMedia: private is never visible, whatever its moderation state", () => {
  assert.equal(isPubliclyVisibleMedia({ visibility: "private", moderation_state: "unreviewed", ...finalized }), false);
  assert.equal(isPubliclyVisibleMedia({ visibility: "private", moderation_state: "flagged", ...finalized }), false);
  assert.equal(isPubliclyVisibleMedia({ visibility: "private", moderation_state: "removed", ...finalized }), false);
});

test("isPubliclyVisibleMedia: removed is never visible, even if public", () => {
  assert.equal(isPubliclyVisibleMedia({ visibility: "public", moderation_state: "removed", ...finalized }), false);
});

test("isPubliclyVisibleMedia: unreviewed (the default, and today the only real state) stays visible", () => {
  // If this ever flipped, every photo on the platform would vanish: nothing
  // has ever been reviewed, because no review workflow exists yet.
  assert.equal(isPubliclyVisibleMedia({ visibility: "public", moderation_state: "unreviewed", ...finalized }), true);
});

test("isPubliclyVisibleMedia: a forged or not-yet-finalized row is never visible, even with public+unreviewed", () => {
  // The exact gap the second adversarial review found: a row inserted
  // directly (bypassing the upload route) or still mid-two-phase-write can
  // have visibility=public and moderation_state=unreviewed (both column
  // defaults) without ever having been through the trusted pipeline.
  assert.equal(isPubliclyVisibleMedia({ visibility: "public", moderation_state: "unreviewed", ...untrusted }), false);
  assert.equal(isPubliclyVisibleMedia({ visibility: "public", moderation_state: "flagged", ...untrusted }), false);
});

test("the exported constants match the migration's own vocabulary", () => {
  assert.equal(PUBLIC_MEDIA_VISIBILITY, "public");
  assert.equal(HIDDEN_MODERATION_STATE, "removed");
});

// Codex review, item 3: the scan now covers the complete src tree (not
// only src/app, where a query helper under src/lib would previously have
// gone unseen), and every OWNER_SCOPED entry must show a real ownership
// or SAT-reviewer check nearby, not merely a comment claiming one exists.
const ROOT = join(process.cwd(), "src");

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name)) out.push(p);
  }
  return out;
}

const rel = (p: string) => p.split(join("src"))[1].split("\\").join("/").replace(/^\//, "");

/**
 * Every file under src this scan has confirmed queries listing_media
 * directly, with why it is not a public-facing exposure. Each reads its
 * own account's data (ownership checked in the same route/page) or the
 * SAT reviewer's own visibility, or writes only (no anonymous reader is
 * involved either way). A file removed from here without also being
 * deleted, or moved without this list following it, fails "every
 * listing_media reader is classified" below on purpose.
 */
const OWNER_SCOPED_SURFACES = new Set<string>([
  "app/[locale]/dashboard/listings/[id]/page.tsx",
  "app/[locale]/dashboard/listings/[id]/preview/page.tsx",
  "app/[locale]/dashboard/listings/page.tsx",
  "app/[locale]/dashboard/new/page.tsx",
  "app/api/listings/route.ts",
  "app/api/listings/[id]/route.ts",
  "app/api/listings/[id]/docs/route.ts",
  "app/api/listings/[id]/media/route.ts",
  "app/api/listings/[id]/media/[mediaId]/route.ts",
]);

/**
 * Every file under src this scan has confirmed is a real, executed query
 * an anonymous visitor's request can reach: today, exactly the one
 * canonical reader (src/lib/queries/publicMedia.ts). Each MUST apply the
 * public-media rule; the assertion below fails if one does not.
 */
const PUBLIC_SURFACES = new Set<string>(["lib/queries/publicMedia.ts"]);

test("every file under src that queries listing_media directly is classified as public or owner-scoped", () => {
  const queriesMedia = walk(ROOT).filter((p) => readFileSync(p, "utf8").includes('.from("listing_media")'));
  assert.ok(queriesMedia.length >= 9, `expected at least 9 files querying listing_media, found ${queriesMedia.length}; the scan itself may have stopped working`);

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

test("the canonical public reader actually applies the public-media rule", () => {
  const src = readFileSync(join(ROOT, "lib/queries/publicMedia.ts"), "utf8");
  assert.match(
    src,
    /scopeToPublicMedia/,
    "src/lib/queries/publicMedia.ts is the declared canonical reader for listing_media but does not call " +
      "scopeToPublicMedia(). A future unfiltered query here would serve private or removed media to an anonymous reader.",
  );
});

// Codex review round 3, item 2: matches the same dataOk-distinguishing
// shape src/lib/queries/listings.ts's own getListingById/getBuildingById
// already use, checked the same way this codebase already checks those
// (source inspection, since none of these query-layer functions has a
// mocked-client unit test anywhere in this repo; a real client is only
// exercised live or via the structural scan above).
test("the canonical public reader distinguishes a real query failure from a genuinely empty result", () => {
  const src = readFileSync(join(ROOT, "lib/queries/publicMedia.ts"), "utf8");
  assert.match(
    src,
    /dataOk/,
    "getPublicListingMedia() must return a dataOk flag: without it, a Supabase outage and a listing with no " +
      "photos are indistinguishable to every caller, the same defect class getListingById/getBuildingById were " +
      "already fixed for.",
  );
  assert.match(
    src,
    /error\s*}\s*=\s*await\s+scopeToPublicMedia|const\s*{\s*data,\s*error\s*}/,
    "the query's own returned error must actually be read, not discarded, or dataOk can never become false.",
  );
});

test("the public listing page consumes the canonical reader, not a query of its own", () => {
  const src = readFileSync(join(ROOT, "app/[locale]/listings/[id]/page.tsx"), "utf8");
  assert.match(
    src,
    /getPublicListingMedia/,
    "the public listing detail page must call getPublicListingMedia(), the one canonical reader, rather than " +
      "construct its own listing_media query (which is exactly how this package's own visibility gap happened).",
  );
  assert.doesNotMatch(
    src,
    /\.from\("listing_media"\)/,
    "the public listing detail page should not query listing_media directly at all now that " +
      "getPublicListingMedia() exists; a direct query here would be a second, independently-drifting copy of the public-media rule.",
  );
});

/**
 * Codex review: "a comment is not proof." Every OWNER_SCOPED file must
 * show a real session check (getSessionUser, or a su./session variable
 * this codebase's own convention already uses) AND a real ownership
 * comparison (account_id checked against the caller's own, or an
 * is_sat/isSat escape hatch for the reviewer role) somewhere in its
 * source, not merely a claim in this test file that one exists elsewhere.
 */
test("every OWNER_SCOPED file actually contains a session and ownership check, not only a claim in this test", () => {
  const missingSession: string[] = [];
  const missingOwnership: string[] = [];
  for (const r of OWNER_SCOPED_SURFACES) {
    const src = readFileSync(join(ROOT, r), "utf8");
    if (!/getSessionUser|createServerClient|getSupabaseServer/.test(src)) missingSession.push(r);
    const hasComparison = /account_id\s*(!==|===)\s*su\.accountId|su\.accountId\s*(!==|===)\s*.*account_id/.test(src);
    const hasQueryScope = /\.eq\(\s*["']account_id["']\s*,\s*su\.accountId\s*\)/.test(src);
    const hasOwnAccountWrite = /account_id:\s*su\.accountId/.test(src);
    const hasSatEscape = /su\.isSat|isSat/.test(src);
    if (!hasComparison && !hasQueryScope && !hasOwnAccountWrite && !hasSatEscape) {
      missingOwnership.push(r);
    }
  }
  assert.deepEqual(missingSession, [], `${missingSession.join(", ")} is OWNER_SCOPED but has no visible session-resolution call at all`);
  assert.deepEqual(
    missingOwnership,
    [],
    `${missingOwnership.join(", ")} is OWNER_SCOPED but shows no account-ownership comparison or SAT escape hatch; ` +
      "either it is missing a real authorization check, or this scan's pattern needs updating to recognise the one it has.",
  );
});

// Security closure, 2026-09-12: content_sha256 and original_path SELECT is
// revoked from anon/authenticated at the database (20260912_pkg1b_sensitive_
// media_column_grants.sql). A query chain against listing_media that
// references either column, run through the ordinary session client (`sb`,
// getSupabaseServer()'s own conventional name in every route in this
// package), would now fail with a permission error at runtime, not merely
// omit the column: this exact defect shipped once (media/route.ts's own
// duplicate-content precheck, and media/[mediaId]/route.ts's own DELETE
// handler, both fixed in the same change that added the grant restriction).
// A comment explaining the fix is not proof it stays fixed; this scans the
// real source, the same discipline the rest of this file already applies.
const SENSITIVE_COLUMN_ROUTES = [
  "app/api/listings/[id]/media/route.ts",
  "app/api/listings/[id]/docs/route.ts",
  "app/api/listings/[id]/media/[mediaId]/route.ts",
];

test("every listing_media query chain referencing content_sha256 or original_path uses the service-role client, never the ordinary session client", () => {
  const violations: string[] = [];
  let sensitiveChainsFound = 0;
  for (const r of SENSITIVE_COLUMN_ROUTES) {
    const src = readFileSync(join(ROOT, r), "utf8");
    // Captures the client variable immediately before .from("listing_media"),
    // then everything up to that statement's own closing semicolon (fluent
    // Supabase query chains never contain an internal semicolon), so a
    // LATER, unrelated statement's own comment mentioning these column
    // names can never be mistaken for part of THIS chain.
    const chainRe = /(\w+)\s*\.from\("listing_media"\)((?:(?!;)[\s\S])*?);/g;
    let m: RegExpExecArray | null;
    while ((m = chainRe.exec(src))) {
      const [, client, chain] = m;
      // Quoted string literal (.eq("content_sha256", ...), .select("original_path"))
      // or object-literal key (content_sha256: value): real usage. A bare
      // mention in a comment (explaining the trusted-write boundary, which
      // several of these chains legitimately have nearby) has neither
      // quotes nor a following colon and must not trip this.
      if (/["']content_sha256["']|["']original_path["']|\bcontent_sha256\s*:|\boriginal_path\s*:/.test(chain)) {
        sensitiveChainsFound++;
        if (client !== "serviceRole") {
          violations.push(`${r}: a listing_media query chain via \`${client}\` references content_sha256/original_path (must use serviceRole)`);
        }
      }
    }
  }
  assert.ok(sensitiveChainsFound >= 5, `expected at least 5 sensitive-column query chains across ${SENSITIVE_COLUMN_ROUTES.join(", ")}, found ${sensitiveChainsFound}; the scan itself may have stopped matching`);
  assert.deepEqual(violations, [], violations.join("\n"));
});

// Security closure, 2026-09-12, Codex review: the DELETE handler's own
// original_path lookup (added by the fix above) once discarded its own
// query error and treated a failed/unavailable lookup identically to
// "confirmed, this row has no original", then deleted the row's own
// listing_media record anyway, permanently losing the only durable
// reference to a real preserved-original object. This is the source-level
// discipline that must never regress: no mocked-client test exists
// anywhere in this repo for API route handlers (only real Postgres RLS
// proof, in the isolated harness, and structural source scans, here), so
// this is deliberately a scan of the actual control flow, not a
// description of it.
test("media/[mediaId]/route.ts's DELETE handler refuses (does not proceed to delete) when serviceRole is unavailable or the original_path lookup itself errors, and scopes that lookup by both media id and listing id", () => {
  const src = readFileSync(join(ROOT, "app/api/listings/[id]/media/[mediaId]/route.ts"), "utf8");
  const del = src.slice(src.indexOf("export async function DELETE"), src.indexOf("export async function PATCH"));
  assert.ok(del.length > 0, "could not isolate the DELETE handler's own source; the scan itself may need updating");

  assert.match(
    del,
    /if\s*\(\s*!serviceRole\s*\)\s*\{\s*\n?\s*return NextResponse\.json/,
    "the DELETE handler must return early when getSupabaseServiceRole() is null, before attempting the original_path lookup or the row delete",
  );

  const serviceRoleIdx = del.indexOf("if (!serviceRole)");
  const deleteCallIdx = del.indexOf('.from("listing_media").delete()');
  assert.ok(serviceRoleIdx >= 0 && deleteCallIdx > serviceRoleIdx, "the !serviceRole check must appear before the row is deleted");

  assert.match(
    del,
    /error:\s*originalLookupErr\s*\}[\s\S]{0,20}=\s*await\s+serviceRole/,
    "the original_path lookup must actually capture its own error (not discard it via a bare `{ data }` destructure)",
  );
  assert.match(
    del,
    /if\s*\(\s*originalLookupErr\s*\)\s*\{\s*\n?\s*return NextResponse\.json/,
    "a real originalLookupErr must refuse the request (return early), not fall through to deleting the row with an unconfirmed original_path",
  );

  const lookupChainStart = del.indexOf('.select("original_path")');
  assert.ok(lookupChainStart >= 0, "could not find the original_path select; the scan itself may need updating");
  const lookupChain = del.slice(lookupChainStart, del.indexOf(".maybeSingle()", lookupChainStart));
  assert.match(lookupChain, /\.eq\("id",\s*params\.mediaId\)/, "the privileged original_path lookup must scope by media id");
  assert.match(lookupChain, /\.eq\("listing_id",\s*params\.id\)/, "the privileged original_path lookup must ALSO scope by listing id, not id alone");

  assert.ok(
    deleteCallIdx > del.indexOf("originalLookupErr"),
    "the row delete must happen strictly after the original_path lookup and its own error check, never before",
  );
});
