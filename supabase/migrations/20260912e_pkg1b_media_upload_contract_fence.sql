-- PKG-LISTING-CREATION-1B, security closure correction. A genuine,
-- permanent closure for the "delayed old-app write" risk, replacing a
-- completion condition proven false by adversarial review.
--
-- STATED EXPLICITLY, NINTH ADVERSARIAL REVIEW: upload_contract_version is
-- a COMPATIBILITY CHECK, not a provenance or trust signal, and must
-- never be described, read, or relied upon as one. It proves only that
-- an INSERT was produced by code that knows the current write contract
-- (i.e., is not the specific old, unreviewed route this migration exists
-- to fence out); it proves nothing whatsoever about the uploaded file's
-- own legitimacy or safety. That is, and remains, entirely
-- content_sha256/derivation_verified's own job (20260902c's trigger,
-- service_role-only) and, for historical rows, apply_verified_media_
-- provenance()'s own operator-manifest guards (20260912b). A row can
-- have upload_contract_version = 1 and still be exactly as untrusted as
-- any other unmanifested row: this column changes nothing about who may
-- read `is_legacy_media`/`derivation_verified`, what grants trust, or
-- what the storage/table read policies require. Its only effect is
-- narrower and purely structural: whether the INSERT is even accepted
-- at all.
--
-- WHY THE PRIOR "COMPLETION CONDITION" WAS ACTUALLY FALSE.
--
-- The prior rollout procedure treated "two consecutive reconciliation
-- scans agree" as proof the deployment window was closed. That is not a
-- proof of anything except "nothing new landed in the interval between
-- those two scans": the currently-deployed (pre-package) upload route
-- keeps ordinary INSERT privilege on public.listing_media forever once
-- the write-pause is lifted (`GRANT INSERT ... TO authenticated`, runbook
-- section 11 step 5, never revoked again), so an old-app request that
-- happens to be slower than even the widest interval an operator chose
-- to wait between scans can ALWAYS still land after the operator has
-- declared the window closed. No number of scans, no chosen delay, and
-- no invented maximum request lifetime changes this: a scan can only
-- ever report what already exists at the moment it runs, never bound
-- what might still arrive afterward. This was proven, not merely
-- asserted, in the isolated harness's own new regression (Step 8i):
-- resume, two agreeing scans, "declare complete" exactly as the prior
-- procedure said to, and ONLY THEN release a delayed old-app-shaped
-- insert; it lands successfully, silently, with the prior design.
--
-- THE ACTUAL FIX: A PERMANENT, STRUCTURAL FENCE, NOT A BETTER SCAN.
--
-- The real distinguishing fact between the old (pre-package) upload
-- route and this package's own new one is not timing at all, it is
-- CODE: the old route's own INSERT statement (`src/app/api/listings/
-- [id]/media/route.ts` as it stands on `main`, confirmed by reading its
-- real source this round) supplies exactly `listing_id, path, kind,
-- source, mime, bytes, sort_order, alt_en, plan_type`, nothing else,
-- relying on column defaults for the rest; the NEW route (this branch)
-- supplies one column more, `visibility: 'private'`, explicitly, on
-- every insert. A NOT NULL column with NO DEFAULT is the one thing
-- Postgres will never let an INSERT statement skip, regardless of
-- privilege, regardless of how long that statement takes to finally
-- execute, and regardless of how many migrations have applied in the
-- meantime: the old route's own INSERT, unmodified and unaware such a
-- column now exists, fails outright (23502, not_null_violation) the
-- instant this migration is live, forever, not for a bounded window.
-- This closes the exact gap the false completion condition could not:
-- there is no scan to schedule, no interval to choose, and no residual
-- obligation to keep checking that the risk has not resurfaced, because
-- the old route structurally cannot produce a compliant row again,
-- ever, unless it is itself changed to supply this column (which would
-- make it, by definition, no longer the old, un-reviewed route).
--
-- WHY A NEW COLUMN, NOT A DIFFERENT MECHANISM. An RPC-routed write
-- boundary (forcing every insert through a SECURITY DEFINER function,
-- the same pattern apply_verified_media_provenance already uses) would
-- close the identical gap, but requires reimplementing this route's own
-- insert shape a second time, inside a new PL/pgSQL function, purely to
-- recreate what one already-correct application-code insert does today.
-- Tightening `visibility`'s own existing default (removing it, since the
-- new route already sets visibility explicitly) was considered and
-- rejected: it would silently reclassify the old route's own omitted
-- value from "public" to "erroring", true, but it would also silently
-- change the MEANING of an existing, semantically-loaded column instead
-- of adding a narrowly-scoped, purpose-built one, and would need every
-- other legitimate caller of this table (including this harness's own
-- many admin-issued fixture rows, none of which are modelling real
-- application traffic) to be individually re-examined for whether it
-- happens to also omit visibility for unrelated reasons. A new,
-- single-purpose column is the smaller, more legible change: its own
-- name states exactly what it is for, and it cannot collide with any
-- other column's own, pre-existing meaning.
--
-- upload_contract_version also has a real, ongoing purpose beyond this
-- one rollout: an honest, permanent record of which write-contract
-- version actually produced each row, useful for any future migration
-- of the upload path itself, not merely a disposable fence.

alter table public.listing_media
  add column if not exists upload_contract_version smallint;

-- Backfill: every row that already exists at the moment this migration
-- first runs predates this column's own existence by definition. 0 is an
-- explicit, honest "written before this fence existed" marker, distinct
-- from any real contract version a client will ever supply (the current,
-- new route supplies 1; a future contract change would supply 2, and so
-- on). Never confused with a genuine client-supplied value: no client
-- code, old or new, could ever legitimately supply 0 itself (see the
-- trigger below, which reserves 0 for trusted, non-application callers
-- only).
update public.listing_media set upload_contract_version = 0 where upload_contract_version is null;

alter table public.listing_media alter column upload_contract_version set not null;

-- Auto-default ONLY for service_role and superuser: this package's own
-- trusted-pipeline code, and this harness's own admin/fixture-setup
-- connection, neither of which is modelling real end-user application
-- traffic and neither of which this fence is aimed at. An ordinary
-- authenticated (or anon) caller receives NO default and NO help: they
-- must supply a real value themselves, which is the entire point. This
-- is deliberately not a column DEFAULT expression (Postgres column
-- defaults do not reliably support a role-conditional subquery the way
-- a trigger can) and deliberately not a broader default available to
-- every role (which would defeat the fence for the OLD route too, since
-- it is itself an ordinary `authenticated` caller).
create or replace function public.listing_media_default_contract_version_for_trusted_callers()
returns trigger
language plpgsql
as $$
begin
  if new.upload_contract_version is null then
    if current_user = 'service_role' or (select rolsuper from pg_roles where rolname = current_user) then
      new.upload_contract_version := 0;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists listing_media_default_contract_version on public.listing_media;
create trigger listing_media_default_contract_version
  before insert on public.listing_media
  for each row
  execute function public.listing_media_default_contract_version_for_trusted_callers();

revoke execute on function public.listing_media_default_contract_version_for_trusted_callers() from public, anon, authenticated;

comment on column public.listing_media.upload_contract_version is
  'Which write-contract version actually produced this row''s own INSERT. 0 is reserved for pre-fence history and trusted-caller (service_role/superuser) convenience inserts; the live application route sets 1. A NOT NULL column with no default: the real, permanent mechanism (not a time-bounded scan) closing the risk of a stale, unreviewed upload route inserting successfully after this migration has applied. See this migration''s own header comment for the full reasoning and the false completion condition it replaces.';

-- Extends 20260912b_pkg1b_media_trusted_object_binding.sql's own
-- listing_media_freeze_object_identity() trigger (defined before this
-- column existed, so it could not reference it there) to freeze
-- upload_contract_version the same, unconditional way as path/source/
-- listing_id: once set, by whichever real write contract produced the
-- row, nothing legitimate ever needs to change it, and there is no
-- reason to leave it mutable when everything else identity-related on
-- this row already is not.
create or replace function public.listing_media_freeze_object_identity()
returns trigger
language plpgsql
as $$
declare
  trusted_fn_owner text;
begin
  select pg_get_userbyid(p.proowner) into trusted_fn_owner
    from pg_proc p
    where p.proname = 'apply_verified_media_provenance' and p.pronamespace = 'public'::regnamespace;
  if current_user = 'service_role'
     or current_user = trusted_fn_owner
     or (select rolsuper from pg_roles where rolname = current_user) then
    return new;
  end if;
  if TG_OP = 'UPDATE' then
    if new.path is distinct from old.path
       or new.source is distinct from old.source
       or new.listing_id is distinct from old.listing_id
       or new.upload_contract_version is distinct from old.upload_contract_version then
      raise exception 'path, source, listing_id and upload_contract_version may not be changed once a row exists; delete and re-upload instead' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;
