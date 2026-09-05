-- PKG-LISTING-CREATION-1B, outcome D. Original/derivative integrity.
--
-- WHY THIS EXISTS.
--
-- mediaStandard.ts already carries a complete, tested machine-readable form of
-- Law 8 (media integrity): an allow list of transforms a derived photo is
-- permitted to have gone through (mediaIntegrityFaults, mediaPublishable,
-- MediaDerivation), reviewed and shipped, and never once called from real
-- upload code, because listing_media has never recorded a MediaDerivation for
-- any row. media/route.ts reads the client's original bytes, sniffs them,
-- re-encodes with sharp() (rotate to apply EXIF orientation, resize, convert
-- to webp) and then discards the original entirely; only the derivative is
-- ever stored. That discard is also what made 20260902c's own content_sha256
-- comment call the hash "of nothing verifiable": a hash of bytes nothing
-- keeps cannot be checked against anything. These columns, and the same
-- migration's own application-code counterpart in media/route.ts, are what
-- make both of those true statements false: the original is kept, and its
-- hash means something.
--
-- WHAT GETS RECORDED, AND WHY IT IS SHAPED THIS WAY.
--
-- Every photo this package's upload route stores goes through exactly the
-- same two permitted transforms, unconditionally: downscale (the resize) and
-- format_convert (the webp re-encode). Both are on mediaStandard.ts's ALLOW
-- LIST already, both permitted, with the law's own stated reason attached to
-- each ("removes resolution and invents none" / "container and codec only").
-- Nothing about EXIF-orientation correction is recorded as a transform: it
-- corrects how the already-recorded pixels are displayed, the same class of
-- operation the law already permits under lens_correction ("brings the frame
-- closer to the geometry of the space"), not a change to what a viewer would
-- conclude about the property. derived_by records WHAT applied the
-- transforms, not WHO: this package's pipeline runs unconditionally on every
-- upload with no human decision in the loop, so the honest value is a system
-- identifier ('system:upload-pipeline'), not an actor row. A future,
-- separate feature that lets a human apply an optional edit (the permitted
-- exposure/white_balance/straighten/noise_reduction set, per Law 8) would
-- append to derived_transforms and could set derived_by to that person, but
-- no such feature exists in this package and none is implied by this schema.
--
-- NULL-SAFE FOR EXISTING ROWS, NO BACKFILL, SAME DISCIPLINE AS 20260902c.
--
-- original_path, derived_by and derived_at stay null for every row written
-- before this migration; derived_transforms defaults to '{}' so existing
-- rows read as "nothing recorded", not as a false empty claim about a
-- specific transform having been checked and found absent. Hashing or
-- fetching every already-stored derivative to backfill a genuine original is
-- its own, separate piece of work, not a side effect of adding these columns.
--
-- PRIVATE BY CONVENTION, LIKE content_sha256, NOT BY A NEW RLS SURFACE HERE.
--
-- original_path is a storage object path. Every existing reader of
-- listing_media names its columns explicitly (grep across src/app confirms
-- no `select("*")` on this table anywhere), and original_path, derived_by
-- and derived_at are never added to any of those lists by this migration or
-- by the route change that accompanies it: the original is reachable only by
-- server code that already holds the service-role storage client, the same
-- boundary that already protects every other listing-media object today.
alter table public.listing_media
  add column if not exists original_path text null,
  add column if not exists derived_transforms text[] not null default '{}',
  add column if not exists derived_by text null,
  add column if not exists derived_at timestamptz null;

-- Exactly the two states media/route.ts can ever produce in one insert: a
-- legacy or not-yet-derived row (nothing recorded, not even a zero-length
-- transform list pretending to be a checked answer) or a fully-recorded one
-- (original kept, who/what applied it, when). A transform list is not
-- required to be non-empty in the second branch: a future pass-through case
-- (original already exactly right, nothing to transform) is still an honest,
-- fully-recorded state with zero transforms, and mediaIntegrityFaults()
-- already treats a zero-length transform list as trivially fault-free.
-- Postgres has no `ADD CONSTRAINT IF NOT EXISTS`, and this migration must
-- survive being reapplied (the same reapplication safety every migration in
-- this package is held to): guard it explicitly rather than let a rerun
-- fail on "constraint already exists".
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'listing_media_derivation_shape'
  ) then
    alter table public.listing_media
      add constraint listing_media_derivation_shape check (
        (original_path is null and derived_by is null and derived_at is null and cardinality(derived_transforms) = 0)
        or (original_path is not null and derived_by is not null and derived_at is not null)
      );
  end if;
end $$;

comment on column public.listing_media.original_path is
  'Storage path of the untouched original upload, preserved so mediaIntegrityFaults() can be answered rather than assumed. Null for rows written before this column existed, or for anything not yet run through the derivation pipeline. Never selected into any client-facing response.';
comment on column public.listing_media.derived_transforms is
  'The MediaTransform keys (mediaStandard.ts) applied to produce the stored file, in order. Every row this package''s upload route writes carries exactly [''downscale'',''format_convert'']. Empty for a legacy or not-yet-derived row, never a placeholder for "checked, none applied".';
comment on column public.listing_media.derived_by is
  'What applied derived_transforms: a system identifier (e.g. system:upload-pipeline) for this package''s unconditional processing, or in a future feature this schema does not itself add, the user who applied an optional edit.';
comment on column public.listing_media.derived_at is
  'When derived_transforms was applied. Set together with original_path and derived_by in the same insert; never updated afterwards, since a listing_media row''s file is replaced by deleting and re-uploading, not edited in place.';

-- Codex review: these four columns are the system's own record of what it
-- did to a file, not a fact a caller's own session may assert about
-- itself. A lister able to set original_path/derived_by/derived_at/
-- derived_transforms directly could claim a pipeline ran that never did
-- (or point original_path at a storage object that is not really theirs),
-- which is exactly the forged-provenance risk this migration's own
-- integrity model exists to close. Written only through
-- getSupabaseServiceRole() (src/lib/supabase/serviceRole.ts).
--
-- A trigger, not a column-level REVOKE: 20260902b's own comment records
-- why a REVOKE was tried first and does not actually work (a pre-existing
-- table-level GRANT silently outranks it). current_user = 'service_role'
-- is the one role this trigger exempts, matching exactly how
-- getSupabaseServiceRole() connects.
create or replace function public.listing_media_protect_trusted_columns_d()
returns trigger
language plpgsql
as $$
begin
  -- service_role is the trusted app-level write path, and is the intended,
  -- reachable exemption in production. A genuine Postgres superuser
  -- (rolsuper) is exempted too, since it holds strictly more power than
  -- this trigger could ever meaningfully restrict; this is a defence-in-depth
  -- exemption for whatever runs this migration (e.g. a self-hosted
  -- Postgres superuser), not a claim about what Supabase's own hosted
  -- SQL-editor session runs as. Codex review round 2, item 12 (Fable
  -- threat-model review, citing supabase.com/docs/guides/database/postgres/roles-superuser):
  -- Supabase's own `postgres` role in a managed project is NOT flagged
  -- rolsuper, so an operator using the Supabase dashboard's SQL editor does
  -- NOT reach this exemption and IS subject to this trigger like any other
  -- non-service_role session. That is not a defect: the trigger's actual
  -- job (blocking authenticated/anon from forging these columns) still
  -- holds regardless. If an operator genuinely needs to bypass this
  -- trigger from the SQL editor, the correct fix is an explicit,
  -- auditable role switch (e.g. `set role service_role;`, if the
  -- session's own privileges permit it) confirmed against the real
  -- project before it is relied on, not a signal to loosen this
  -- exemption; docs/pkg-listing-creation-1b-migration-runbook.md section
  -- 9 names this as a real-schema preflight question, not yet answered
  -- from this environment.
  if current_user = 'service_role' or (select rolsuper from pg_roles where rolname = current_user) then
    return new;
  end if;
  if TG_OP = 'INSERT' then
    if new.original_path is not null or new.derived_by is not null
       or new.derived_at is not null or cardinality(new.derived_transforms) > 0 then
      raise exception 'only a trusted server process may set original_path/derived_transforms/derived_by/derived_at' using errcode = '42501';
    end if;
  elsif TG_OP = 'UPDATE' then
    if new.original_path is distinct from old.original_path
       or new.derived_by is distinct from old.derived_by
       or new.derived_at is distinct from old.derived_at
       or new.derived_transforms is distinct from old.derived_transforms then
      raise exception 'only a trusted server process may change original_path/derived_transforms/derived_by/derived_at' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists listing_media_protect_trusted_columns_d on public.listing_media;
create trigger listing_media_protect_trusted_columns_d
  before insert or update on public.listing_media
  for each row
  execute function public.listing_media_protect_trusted_columns_d();
