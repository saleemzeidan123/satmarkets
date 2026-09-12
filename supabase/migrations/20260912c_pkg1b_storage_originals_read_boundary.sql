-- PKG-LISTING-CREATION-1B, security closure. Storage-object read boundary:
-- distinguish a published listing's eligible derivative from its preserved
-- original.
--
-- WHY THIS EXISTS.
--
-- The real, live storage policy on this project (captured 2026-09-12,
-- read-only connection, "read media objects of published or own listing",
-- SELECT, roles {anon, authenticated}) grants access to any object whose
-- path's SECOND folder segment names a published listing:
--
--   (storage.foldername(name))[1] = app_account_id()::text
--   OR app_is_sat()
--   OR EXISTS (SELECT 1 FROM listings l
--              WHERE l.id::text = (storage.foldername(objects.name))[2]
--                AND l.status = 'published')
--
-- storage.foldername(name) returns every directory segment of the object
-- path. media/route.ts writes two shapes into the SAME bucket, under the
-- SAME account/listing prefix:
--   derivative:  {account}/{listing}/{uuid}.webp
--   original:    {account}/{listing}/originals/{uuid}.ext
-- Segment [2] is the listing id in BOTH shapes; the policy's third branch
-- never inspects segment [3] ('originals'), so it grants anon/authenticated
-- read (and, since Storage's sign endpoint enforces this same SELECT
-- policy, the ability to SIGN a URL for) the untouched original of any
-- published listing's photo, exactly as any of its derivatives. The
-- preserved original is kept specifically because it is untouched and may
-- carry EXIF/GPS the derivative pipeline strips (see 20260902d's own
-- header). The bucket itself is private (storage.buckets.public = false,
-- confirmed from the same read-only connection, not assumed from a code
-- comment); that setting is correct and is not changed by this migration,
-- but it does not by itself mitigate this gap, because Storage's
-- authenticated-read and sign-url endpoints both enforce RLS, not the
-- bucket's public/private flag, and this policy explicitly lists anon as
-- an allowed role.
--
-- THE FIX: CORRESPOND TO AN ELIGIBLE, TRUSTED MEDIA RECORD, NOT MERELY A
-- MATCHING PATH STRING.
--
-- Parsing path segments more carefully (e.g. also checking segment [3] for
-- literal 'originals') would be a second, independent copy of the storage
-- convention media/route.ts happens to use today, and would silently stop
-- protecting anything the moment that convention changes. Instead, the
-- third branch below requires the object to be the recorded DERIVATIVE of
-- an eligible listing_media row: lm.path = objects.name. original_path is
-- never compared, so no original object can ever satisfy this branch, for
-- any row, published or not, regardless of what path convention is used
-- now or later.
--
-- CORRECTION, same day, adversarial review: lm.path = objects.name alone
-- is NOT proof the row's own path was ever legitimately produced by the
-- upload pipeline. `path`, `source` and `visibility` are owner-writable
-- (the trusted-column triggers protect content_sha256/original_path/
-- derived_*/moderation_state, never these three, because the real
-- two-phase upload write needs the owner's own session to set path and
-- visibility at INSERT time). An owner's own session could otherwise
-- INSERT a brand-new row on any of their own eligible listings with path
-- set to an arbitrary string and reach this branch for an object they
-- never uploaded: another account's private or preserved-original object
-- if its path is known by any means, or an object whose own real media
-- row was removed by moderation. The clause below now also requires
-- `lm.derivation_verified or lm.is_legacy_media`
-- (20260912b_pkg1b_media_trusted_object_binding.sql): a forged row,
-- inserted directly rather than through the real upload pipeline, can
-- satisfy neither (derivation_verified only ever becomes true as a side
-- effect of the trusted content_sha256 write; is_legacy_media is a
-- permanent, migration-time-only historical fact no later INSERT can ever
-- acquire), so it is not eligible under any account, published listing,
-- or path string it might claim.
--
-- "Eligible" otherwise mirrors the real "public read media of published"
-- table policy's own qual exactly (status, demo/permit rules) AND this
-- package's own visibility/moderation rule (mediaVisibility.ts's
-- isPubliclyVisibleMedia: visibility = 'public' AND moderation_state <>
-- 'removed'), so a private, removed, or not-yet-finalized row's object is
-- not reachable this way either, and an orphan object with no matching
-- listing_media row at all (nothing to queue-clean yet, or already cleaned)
-- is reachable only through the owner's-own-folder branch, unchanged below.
--
-- WHAT IS UNCHANGED, ON PURPOSE.
--
-- The owner's-own-folder branch (segment [1] = app_account_id()) and the
-- app_is_sat() branch are untouched: an owner keeps full read/sign access
-- to every object under their own account prefix, including their own
-- originals and their own not-yet-public media, and SAT keeps the same
-- trusted access it already had. Flagged media (moderation_state =
-- 'flagged') stays reachable through the eligibility EXISTS clause, since
-- the established rule is that a flag is a pending concern, not a removal;
-- only 'removed' actually withdraws public reachability, matching the
-- already-decided product rule this migration does not revisit.
--
-- The "owner writes legal docs" / "owner or sat reads legal docs" policies
-- on the listing-legal-docs bucket, and the "lister writes own media
-- objects" INSERT policy on this bucket, are untouched: this migration
-- touches only the SELECT policy governing reads of the listing-media
-- bucket.

drop policy if exists "read media objects of published or own listing" on storage.objects;
-- Reapplication safety: CREATE POLICY has no OR REPLACE / IF NOT EXISTS
-- form in Postgres, so a rerun of this migration (this package's own
-- stated discipline: every migration must survive being reapplied) must
-- drop its OWN target name too, not only the name it originally replaced.
-- Caught by the isolated test harness's own Step 2 reapplication check,
-- not asserted.
drop policy if exists "read eligible media objects or own listing" on storage.objects;

create policy "read eligible media objects or own listing"
  on storage.objects for select
  to anon, authenticated
  using (
    bucket_id = 'listing-media'
    and (
      (storage.foldername(name))[1] = app_account_id()::text
      or app_is_sat()
      or exists (
        select 1
        from public.listing_media lm
        join public.listings l on l.id = lm.listing_id
        where lm.path = objects.name
          and (lm.derivation_verified or lm.is_legacy_media)
          and lm.visibility = 'public'
          and lm.moderation_state <> 'removed'
          and l.status = 'published'
          and (not l.is_demo or app.demo_visible())
          and coalesce(l.ad_permit_number, l.ad_permit_no) is not null
          and l.ad_permit_expires_at > now()
      )
    )
  );

comment on policy "read eligible media objects or own listing" on storage.objects is
  'Replaces "read media objects of published or own listing" (folder-membership only, matched both derivatives and preserved originals identically). The published-listing branch now requires the object to be the recorded derivative (lm.path, never lm.original_path) of an eligible, publicly-visible, TRUSTED listing_media row (derivation_verified or is_legacy_media: not merely any row an account asserts, since path/source/visibility are owner-writable and not otherwise proof of legitimate upload), mirroring the real "public read media of published" table policy''s own qual plus mediaVisibility.ts''s visibility/moderation rule. Owner-own-folder and app_is_sat() branches are unchanged.';
