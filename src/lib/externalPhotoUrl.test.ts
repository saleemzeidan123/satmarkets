import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// Codex review, item 8 (PKG-LISTING-CREATION-1B). Before this fix, a lister
// could paste an arbitrary third-party photo URL into the Studio and have it
// attached to a listing as ordinary listing_media, with none of the hashing,
// duplicate protection, type/size validation, EXIF handling, immutable
// original preservation or controlled storage a real upload gets through
// api/listings/[id]/media/route.ts. That let an unverified external link
// stand in as equivalent to verified evidence.
//
// The fix taken for 1B (the smaller of the two Codex-offered options: build a
// server-side ingestion pipeline for remote URLs, or stop accepting new ones)
// is to stop accepting new URL-sourced photos entirely: the Studio's "paste
// photo links" input is removed, and both routes that used to read
// body.photos and insert a new source='url' listing_media row of kind
// 'photo' no longer do so. Existing source='url' photo rows (mock listings,
// anything attached before this change) are untouched and keep displaying;
// this is a create/update-path restriction, not a read-path or data change.
//
// Floor-plan links (kind='floorplan') are deliberately NOT covered by this
// restriction: a floor plan is a single reference document, not one of the
// guided-evidence photo shots that a lister could pass off as verified
// property-condition evidence, and it already renders through a distinct,
// clearly-a-link UI rather than a photo gallery.
//
// Codex review round 2, item 12 (Fable threat-model review): the fix above
// only closes the Next.js application routes. A lister's own session JWT
// can call PostgREST directly (POST .../rest/v1/listing_media), bypassing
// every route this file checks entirely; the RLS insert policy on
// listing_media exists to check WHOSE listing this is, not the SHAPE of
// what is written, so nothing stopped that path from recreating exactly
// the row item 8 exists to prevent. Closed at the database instead:
// supabase/migrations/20260905c_pkg1b_media_url_photo_block.sql adds a
// BEFORE INSERT OR UPDATE trigger rejecting kind='photo' + source='url'
// for every role, no exemption (unlike the trusted-column triggers in
// migrations B/C/D, which do exempt service_role because a legitimate
// writer of those columns exists; no role has a legitimate reason to
// create this row shape any more). Adversarially proven in the isolated
// harness (docs/pkg-listing-creation-1b-isolated-test.mjs, Step 8e):
// authenticated AND service_role are both denied, with a check_violation
// (23514, a payload-shape rule, not the 42501 insufficient_privilege the
// trusted-column triggers use for a privilege rule); floorplan+url and
// photo+upload remain unaffected; and an existing legacy photo+url row
// (which predates the trigger, so was never itself subject to it) can
// still have unrelated columns like shot_key updated.
const ROOT = join(process.cwd(), "src");

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8");
}

// Matches the actual code shape that reads the field (Array.isArray(body.photos)
// or body.photos as ...), not this test suite's own explanatory prose about it
// (which necessarily contains the literal text "body.photos" too).
const READS_BODY_PHOTOS = /Array\.isArray\(\s*body\.photos\s*\)|body\.photos\s+as\s/;

test("the listing create route no longer reads body.photos to insert new photo media", () => {
  const src = read("app/api/listings/route.ts");
  assert.doesNotMatch(
    src,
    READS_BODY_PHOTOS,
    "api/listings/route.ts must not read body.photos: doing so re-opens the external-URL evidence bypass (Codex review, item 8).",
  );
});

test("the listing update route no longer reads body.photos to insert new photo media", () => {
  const src = read("app/api/listings/[id]/route.ts");
  assert.doesNotMatch(
    src,
    READS_BODY_PHOTOS,
    "api/listings/[id]/route.ts must not read body.photos: doing so re-opens the external-URL evidence bypass (Codex review, item 8).",
  );
});

test("neither listing route inserts a new source='url' row of kind='photo'", () => {
  // A crude but deliberate check: no insert call in either file should ever
  // combine kind: "photo" with source: "url" again. floorplan is exempt (see
  // header comment), so this only forbids the photo+url combination
  // specifically, not source: "url" on its own.
  const combo = /kind:\s*"photo"[\s\S]{0,40}source:\s*"url"|source:\s*"url"[\s\S]{0,40}kind:\s*"photo"/;
  for (const rel of ["app/api/listings/route.ts", "app/api/listings/[id]/route.ts"]) {
    assert.doesNotMatch(read(rel), combo, `${rel} must not insert a kind='photo'+source='url' row (Codex review, item 8).`);
  }
});

test("the Studio no longer offers a raw photo-URL paste box", () => {
  const src = read("components/ListingStudio.tsx");
  assert.doesNotMatch(
    src,
    /paste photo links|photo_urls/,
    "ListingStudio.tsx must not offer a way to type/paste a new photo URL: the server no longer accepts one (Codex review, item 8).",
  );
});

test("the database itself, not only the application routes, rejects a new photo+url row (Codex review round 2, item 12)", () => {
  const migration = readFileSync(join(process.cwd(), "supabase/migrations/20260905c_pkg1b_media_url_photo_block.sql"), "utf8");
  assert.match(
    migration,
    /before insert or update on public\.listing_media/,
    "the url-photo-block trigger must fire on both INSERT and UPDATE, or a direct PostgREST call (bypassing every route this file checks) can still create the row item 8 exists to prevent.",
  );
  assert.doesNotMatch(
    migration,
    /current_user\s*=\s*'service_role'/,
    "this rule must have NO role exemption, unlike the trusted-column triggers (B/C/D): no role, not even service_role, has a legitimate reason to create a new kind='photo'+source='url' row any more.",
  );
});

test("the canonical public media reader does not filter by source, so pre-existing url-sourced photos keep displaying", () => {
  const src = read("lib/queries/publicMedia.ts");
  // publicMedia.ts legitimately mentions "source" once, as a selected column
  // (PublicMediaRow.source, and in the .select(...) column list) so a caller
  // can tell upload from url apart if it ever needs to; the thing this test
  // actually forbids is a QUERY FILTER on it (.eq/.neq("source", ...)), which
  // would hide already-attached legacy url photos, not merely mark them.
  assert.doesNotMatch(
    src,
    /\.(eq|neq)\(\s*["']source["']/,
    "getPublicListingMedia() must not filter by source: this restriction (Codex review, item 8) is a create/update-path change only, and must not silently also hide already-attached legacy url photos.",
  );
});
