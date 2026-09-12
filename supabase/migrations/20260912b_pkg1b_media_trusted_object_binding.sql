-- PKG-LISTING-CREATION-1B, security closure correction. A trusted signal
-- that a listing_media row's own `path` was written by the real upload
-- pipeline, not merely asserted by the row's own account.
--
-- WHY THIS EXISTS.
--
-- Adversarial review of 20260912c's own storage policy (originally drafted
-- as 20260912b, before this migration was inserted ahead of it): that
-- policy treats `lm.path = objects.name`, for an otherwise-eligible row, as
-- proof the object is a legitimate public derivative. But `path`, `source`
-- and `visibility` are NOT trusted-column-protected (only content_sha256/
-- original_path/derived_*/moderation_state are, by design: the two-phase
-- upload write needs the owner's own session to set `path` and `visibility`
-- at INSERT time, before trusted finalization). This means an owner's own
-- session, calling PostgREST directly, can INSERT a new row on any of
-- their own eligible published listings with `path` set to an ARBITRARY
-- string, `visibility = 'public'` (or take the column default), and
-- `moderation_state` left at its own default ('unreviewed', the only value
-- INSERT ever permits for a non-trusted caller). If that arbitrary path
-- happens to match a real object anywhere in the bucket, whether another
-- account's own private or preserved-original object, or an object whose
-- own real media row was removed by moderation, the storage policy's own
-- EXISTS clause would admit it: the forged row IS eligible by every check
-- that clause makes, because none of those checks establish that THIS
-- row's own path was ever legitimately produced by the upload pipeline at
-- all, only that some eligible-looking row happens to reference it.
--
-- THE FIX: A SIGNAL THAT CANNOT BE FORGED, WHICH ALSO PRESERVES LEGACY.
--
-- content_sha256 is exactly this signal already: it can only ever be set
-- by service_role (20260902c's own trigger), which the real upload
-- pipeline is the only caller of, and which always writes its own freshly
-- generated `path` in the same request that later sets content_sha256, so
-- a row with content_sha256 set is provably the row that legitimately
-- produced the object at its own `path`, regardless of which account
-- owns it or what that path string happens to be. But content_sha256
-- itself is not readable by anon/authenticated (20260912's own grant
-- restriction), and Postgres RLS policy quals run with the QUERYING
-- role's own column privileges even when referencing a different table,
-- so the storage policy cannot reference content_sha256 directly without
-- either breaking for anon/authenticated entirely or requiring a broader
-- privilege grant that would defeat 20260912's own purpose.
--
-- derivation_verified is a STORED GENERATED column, computed once, at
-- WRITE time, from content_sha256: readers only ever need SELECT on the
-- generated column itself, never on content_sha256 to derive it (a stored
-- generated column's value is materialized when written, not recomputed
-- per read), so it can be safely granted to anon/authenticated: it reveals
-- only a boolean "was this row's path legitimately produced by the trusted
-- pipeline", never the hash itself.
--
-- is_legacy_media is the explicit, migration-safe distinction for rows
-- that predate this fix entirely: backfilled ONCE, below, capturing
-- exactly the set of rows that already existed (content_sha256 IS NULL,
-- the honest state of every row before this package's outcome C ever
-- existed) at the moment this migration runs. No later INSERT can ever
-- receive true here (the column defaults to false, and is trusted-column
-- protected like content_sha256/original_path), so this is a permanent,
-- one-time historical fact, never confused with "recently inserted,
-- still unhashed", which is exactly the gap "do not treat every newly
-- inserted null-hash row as legacy" names.

alter table public.listing_media
  add column if not exists is_legacy_media boolean not null default false;

alter table public.listing_media
  add column if not exists derivation_verified boolean
    generated always as (content_sha256 is not null) stored;

-- One-time backfill: every row with no content_sha256 AT THE MOMENT THIS
-- MIGRATION FIRST RUNS is, by definition, a row this package's own upload
-- pipeline never processed (outcome C did not exist before it). Must not
-- rerun on a later reapplication (this migration's own required
-- idempotency): a genuine new row created AFTER the first run (a pending
-- upload mid-pipeline, or a document row whose own content_sha256 has not
-- landed yet) would otherwise be wrongly swept up as "legacy" too, exactly
-- the gap this migration exists to avoid. Guarded the same way migration
-- D guards its own one-time constraint add (`do $$ if not exists ... $$`):
-- a real, queryable fact (the marker table's own existence) decides
-- whether the backfill has already happened, not a WHERE clause on
-- `listing_media` itself, which data changes over time could make
-- ambiguous.
create table if not exists public.listing_media_legacy_backfill_done (
  backfilled_at timestamptz not null default now()
);

do $$
begin
  if not exists (select 1 from public.listing_media_legacy_backfill_done) then
    update public.listing_media set is_legacy_media = true where content_sha256 is null;
    insert into public.listing_media_legacy_backfill_done default values;
  end if;
end $$;

comment on table public.listing_media_legacy_backfill_done is
  'Existence of any row records that the one-time is_legacy_media backfill (20260912b_pkg1b_media_trusted_object_binding.sql) has already run; stops a later reapplication of that migration from re-marking rows created since. Never written to by application code.';

-- Trusted-write boundary for is_legacy_media, matching 20260902b/c/d's own
-- pattern exactly: a caller's own session must never be able to assert
-- "this row is legacy" for a row it just created, which would trivially
-- defeat the whole point (a forged row claiming legacy status to bypass
-- the storage policy's own eligibility gate below).
create or replace function public.listing_media_protect_legacy_flag()
returns trigger
language plpgsql
as $$
begin
  if current_user = 'service_role' or (select rolsuper from pg_roles where rolname = current_user) then
    return new;
  end if;
  if TG_OP = 'INSERT' then
    if new.is_legacy_media is true then
      raise exception 'only the one-time migration backfill may set is_legacy_media' using errcode = '42501';
    end if;
  elsif TG_OP = 'UPDATE' then
    if new.is_legacy_media is distinct from old.is_legacy_media then
      raise exception 'is_legacy_media is a permanent historical fact and may not be changed' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists listing_media_protect_legacy_flag on public.listing_media;
create trigger listing_media_protect_legacy_flag
  before insert or update on public.listing_media
  for each row
  execute function public.listing_media_protect_legacy_flag();

-- derivation_verified needs no trigger of its own: it is a stored
-- generated column, and Postgres itself rejects any attempt to write to a
-- generated column directly (errcode 428C9), for every role including
-- service_role and a superuser. It can only ever change as a side effect
-- of content_sha256 changing, which is already fully governed by
-- 20260902c's own trigger.

grant select (is_legacy_media, derivation_verified) on public.listing_media to anon, authenticated;

comment on column public.listing_media.is_legacy_media is
  'True for exactly the rows that already existed, with no content_sha256, when this migration first ran (a one-time backfill). Never true for any row inserted afterward. Trusted-column protected: only the migration''s own backfill may ever set it.';
comment on column public.listing_media.derivation_verified is
  'Stored generated column: true exactly when content_sha256 is not null. Lets anon/authenticated (and the storage policy''s own EXISTS clause) confirm a row went through the trusted upload pipeline without ever granting read access to content_sha256 itself.';
