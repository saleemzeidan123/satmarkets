-- PKG-LISTING-CREATION-1B, outcome C. Cross-session upload duplicate
-- protection.
--
-- WHY THIS EXISTS.
--
-- uploadQuality.ts's findDuplicates() already fingerprints files (SHA-256)
-- within one client-side selection. It cannot see a photo already stored
-- from an earlier visit, because listing_media has never recorded a content
-- hash; this is deferred-contracts item 3's own drafted schema, made a real
-- uniqueness boundary rather than only an index.
--
-- A REAL CONSTRAINT, NOT ONLY A CLIENT WARNING.
--
-- An index alone lets two concurrent uploads of the same bytes both pass an
-- application-level "check first, then insert" race and both land. The
-- unique constraint below is what actually prevents that, atomically, the
-- same way PKG-LISTING-CREATION-1A's own review moved ownership enforcement
-- into the query itself rather than trusting application code alone to get
-- a check-then-act sequence right under concurrency.
--
-- NULL-SAFE FOR EXISTING ROWS.
--
-- content_sha256 is nullable; every row written before this migration has
-- no hash and none is backfilled here (hashing stored objects is its own,
-- separate piece of work, not a side effect of adding a column). Postgres
-- treats multiple NULLs in a unique constraint as non-conflicting by
-- standard SQL semantics, so old, unhashed rows never collide with each
-- other or block a new upload from being hashed correctly.
--
-- PRIVATE BY CONVENTION, NOT BY A NEW RLS SURFACE HERE.
--
-- This migration adds no new SELECT policy. The hash must never appear in
-- any response a browser can read; the discipline that guarantees that is
-- the same one PREVIEW_COLUMNS already established in
-- dashboard/listings/[id]/preview/page.tsx: every route that reads
-- listing_media names its columns explicitly and this one is never among
-- them for a client-facing response. A future reviewer checking this
-- migration for a public-role SELECT grant on content_sha256 will find
-- none was added, which is the point, not an oversight.

alter table public.listing_media
  add column if not exists content_sha256 text null;

-- The hash is computed from the ORIGINAL bytes, before re-encoding
-- (media/route.ts's `input` buffer, immediately after the magic-byte sniff
-- and before the sharp() call): two photographs that re-encode to
-- byte-identical WebP output are not necessarily the same original, and two
-- identical originals are not guaranteed to re-encode byte-identically
-- across a library version bump, so hashing the derivative would be neither
-- sound nor stable. See outcome D (original/derivative integrity) for where
-- that original actually gets preserved rather than discarded after
-- encoding, which this column's own honesty depends on: a hash of bytes
-- nothing keeps is a hash of nothing verifiable.
comment on column public.listing_media.content_sha256 is
  'SHA-256 of the original uploaded bytes, computed before re-encoding. Null for rows written before this column existed (no backfill). Never selected into any client-facing response. Enforces cross-session upload duplicate protection via the unique index below, not only an application-level check.';

create unique index if not exists listing_media_content_sha256_unique
  on public.listing_media (listing_id, content_sha256);
