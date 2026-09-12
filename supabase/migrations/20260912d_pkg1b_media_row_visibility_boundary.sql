-- PKG-LISTING-CREATION-1B, security closure. Row-level visibility boundary
-- for listing_media itself, not only for its storage objects.
--
-- WHY THIS EXISTS, DISCOVERED WHILE BUILDING THE ADVERSARIAL TEST HARNESS.
--
-- The real, currently-live "public read media of published" policy
-- (captured verbatim, 2026-09-12) is:
--
--   EXISTS (SELECT 1 FROM listings l
--           WHERE l.id = listing_media.listing_id
--             AND l.status = 'published'
--             AND (NOT l.is_demo OR app.demo_visible())
--             AND COALESCE(l.ad_permit_number, l.ad_permit_no) IS NOT NULL
--             AND l.ad_permit_expires_at > now())
--
-- This qual is about the LISTING only. It has no reference anywhere to
-- listing_media.visibility or listing_media.moderation_state. Once those
-- columns exist (20260902b), this means the ROW-LEVEL policy itself lets
-- through every media row of a published, permit-valid listing, including
-- one an owner has explicitly set visibility = 'private', or one SAT has
-- moderation_state = 'removed'. src/lib/queries/publicMedia.ts's own
-- getPublicListingMedia() adds visibility/moderation_state as an
-- APPLICATION-level filter on top, but a direct PostgREST call that omits
-- that filter (e.g. GET .../listing_media?listing_id=eq.<id>, no
-- visibility= parameter) is not subject to it, and the database's own row
-- policy does not supply it either. What such a call would return is
-- bounded (20260912_pkg1b_sensitive_media_column_grants.sql already
-- revokes content_sha256/original_path/derived_* from anon/authenticated
-- regardless of which row policy admits the row), but path, alt_en/ar,
-- shot_key and the rest of a private or removed row would still be
-- disclosed, which is exactly the "media visibility, moderation" boundary
-- this package's own security-closure review names as required at the
-- underlying access boundary, not only in application query shapes.
-- Proven against the real policy text itself, not assumed: the isolated
-- test harness (docs/pkg-listing-creation-1b-isolated-test.mjs, Step 1b)
-- reproduces this qual verbatim and an unrelated authenticated/anonymous
-- role genuinely sees a private and a removed row before this migration
-- applies.
--
-- WHY REPLACE, NOT SUPPLEMENT.
--
-- Permissive policies combine with OR: adding a second, narrower SELECT
-- policy alongside "public read media of published" would not restrict
-- anything, since the old, broader policy already admits the row on its
-- own. The old policy is dropped and replaced, not left in place.
--
-- WHAT THIS DOES NOT CHANGE.
--
-- The owner-CRUD policies (owner selects/inserts/updates/deletes own
-- listing media) are untouched: an owner still sees and manages every
-- state of their own media regardless of visibility/moderation, exactly as
-- today. A SAT-wide read policy, if one exists in the real schema beyond
-- what this session's read-only connection captured, is also untouched;
-- this migration only replaces the one named "public read media of
-- published".
--
-- CORRECTION, same-day second adversarial review: this policy's own first
-- version required visibility/moderation_state but still admitted a
-- forged or not-yet-finalized row (a direct INSERT bypassing the upload
-- route, or a genuinely pending row with visibility flipped early),
-- exactly the class of row 20260912c_pkg1b_storage_originals_read_
-- boundary.sql's own storage-side fix already excludes from Storage. That
-- left a real, if narrower, gap open at the ROW level: such a row's own
-- non-sensitive columns (path, alt_en/ar, shot_key) were still readable
-- via a direct PostgREST metadata call and via getPublicListingMedia()
-- (which relies on this same RLS boundary, not a query-level filter of
-- its own), presenting an unfinished or forged record as if it were valid
-- public media, even though its underlying storage object was already
-- correctly unreachable. This migration's own qual now requires
-- `(derivation_verified OR is_legacy_media)` too
-- (20260912b_pkg1b_media_trusted_object_binding.sql), aligning table-row
-- eligibility with storage eligibility exactly, so a denied object can
-- never leave its own metadata record presented as valid public media.

drop policy if exists "public read media of published" on public.listing_media;
-- Reapplication safety: CREATE POLICY has no OR REPLACE / IF NOT EXISTS
-- form in Postgres, so a rerun of this migration must drop its OWN target
-- name too, not only the name it originally replaced (the same fix
-- 20260912b_pkg1b_storage_originals_read_boundary.sql needed, caught there
-- first by the isolated test harness's own Step 2 reapplication check).
drop policy if exists "public read eligible media of published" on public.listing_media;

create policy "public read eligible media of published" on public.listing_media for select
  using (
    visibility = 'public'
    and moderation_state <> 'removed'
    and (derivation_verified or is_legacy_media)
    and exists (
      select 1 from public.listings l
      where l.id = listing_media.listing_id
        and l.status = 'published'
        and (not l.is_demo or app.demo_visible())
        and coalesce(l.ad_permit_number, l.ad_permit_no) is not null
        and l.ad_permit_expires_at > now()
    )
  );

comment on policy "public read eligible media of published" on public.listing_media is
  'Replaces "public read media of published" (listing eligibility only, no awareness of the media row''s own visibility/moderation_state, and, in this migration''s own first version, no awareness of trust either). Requires: visibility=public and moderation_state<>removed, matching mediaVisibility.ts''s isPubliclyVisibleMedia() exactly; derivation_verified or is_legacy_media, matching the storage policy''s own trust gate exactly (20260912b/c); and the listing published with a valid, unexpired permit, passing the demo-visibility rule.';
