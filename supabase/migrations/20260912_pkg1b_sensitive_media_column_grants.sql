-- PKG-LISTING-CREATION-1B, security closure. Column-scoped read boundary
-- for listing_media's own integrity/provenance columns.
--
-- WHY THIS EXISTS.
--
-- 20260902c/d's own comments already establish that content_sha256,
-- original_path, derived_transforms, derived_by and derived_at must "never
-- be selected into any client-facing response", and rely on every
-- application-level reader naming its columns explicitly to make that true.
-- That is an application-code convention, not a database boundary: Postgres
-- RLS is a ROW filter, never a column filter, so the existing "public read
-- media of published" policy (which has no column awareness at all) already
-- lets a direct PostgREST call with the public anon key read these columns
-- for any published listing's media, entirely bypassing this codebase's own
-- query-level column lists. A real, verified production grant snapshot
-- (read-only connection to the actual project, 2026-09-12) confirms anon
-- and authenticated both hold table-wide SELECT on listing_media today, no
-- column list, which is exactly the precondition this migration closes.
--
-- WHY REVOKE, NOT JUST A NARROWER GRANT.
--
-- 20260902b/c/d already discovered, and recorded, that a column-level
-- REVOKE does not retract a broader table-level GRANT already in force
-- (Postgres checks table-level and column-level ACLs independently; either
-- one passing is enough), which is why the write-side protection for these
-- same columns uses triggers instead. For SELECT there is no trigger
-- equivalent (Postgres has no per-column read hook), but the underlying fix
-- IS complete for SELECT specifically, unlike for INSERT/UPDATE: revoke the
-- existing table-wide SELECT outright, then grant SELECT back scoped to an
-- explicit column list that excludes the five sensitive columns. Once the
-- broad grant is actually gone, only the listed columns are reachable, by
-- either the table-level or column-level path. This is the same principle
-- the security-closure review that requested this migration stated
-- directly: a narrower grant alongside an untouched broader one changes
-- nothing, the broader one must actually be removed.
--
-- WHAT STAYS READABLE, AND WHY.
--
-- Every column NOT in the sensitive set, including visibility and
-- moderation_state: getPublicListingMedia() (src/lib/queries/publicMedia.ts)
-- filters on both via the ordinary session/anon-key client
-- (scopeToPublicMedia in mediaVisibility.ts), so restricting either would
-- break the one canonical public reader this package's own round-2 review
-- introduced specifically to be the single source of truth for public media
-- visibility. rights_acknowledged_by/at, shot_key, media_scope and
-- media_condition are also left readable: none of them is documented
-- anywhere in this package as "never client-facing" (only the five below
-- carry that language, in their own migrations' own comments); restricting
-- them without a demonstrated need risks breaking a legitimate owner- or
-- SAT-facing display this migration cannot fully audit, for a privacy gain
-- that is not demonstrated (a bare uuid foreign key, not itself resolvable
-- to PII by an anonymous caller).
--
-- FUTURE COLUMNS ARE NOT AUTOMATICALLY READABLE.
--
-- A column-scoped GRANT only covers the columns named here. A future
-- migration that adds a new listing_media column intended to be
-- client-facing must add it to the GRANT list below explicitly. This is a
-- deliberate fail-closed default, not an oversight to fix later.
--
-- service_role and postgres are never touched: both need full access to
-- write and read every column (the trusted-write boundary triggers already
-- depend on service_role being exempt from restriction, and this migration
-- keeps that symmetric on the read side).
--
-- COMPATIBILITY. Two application read sites named content_sha256 or
-- original_path through the ordinary session client and are fixed in the
-- same change set that introduces this migration (media/route.ts's and
-- docs/route.ts's own duplicate-content prechecks now read through
-- getSupabaseServiceRole(); media/[mediaId]/route.ts's DELETE handler now
-- fetches original_path the same way). See those files' own comments for
-- why each is safe to read via service_role at that point (listing
-- ownership is always confirmed first, with the ordinary client).

revoke select on public.listing_media from anon, authenticated;

grant select (
  id, listing_id, path, kind, sort_order, alt_en, alt_ar, created_at,
  is_demo, source, mime, bytes, plan_type,
  shot_key, media_scope, media_condition,
  rights_acknowledged_by, rights_acknowledged_at,
  visibility, moderation_state
) on public.listing_media to anon, authenticated;

comment on column public.listing_media.content_sha256 is
  'SHA-256 of the original uploaded bytes, computed before re-encoding. Null for rows written before this column existed (no backfill). SELECT is revoked from anon/authenticated at the grant level (this migration), not only omitted by application-code convention. Enforces cross-session upload duplicate protection via the unique index below.';
comment on column public.listing_media.original_path is
  'Storage path of the untouched original upload, preserved so mediaIntegrityFaults() can be answered rather than assumed. Null for rows written before this column existed, or for anything not yet run through the derivation pipeline. SELECT is revoked from anon/authenticated at the grant level (this migration), not only omitted by application-code convention.';
