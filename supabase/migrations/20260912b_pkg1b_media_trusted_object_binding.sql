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

create table if not exists public.listing_media_legacy_backfill_done (
  backfilled_at timestamptz not null default now()
);

comment on table public.listing_media_legacy_backfill_done is
  'Existence of any row records that the one-time is_legacy_media backfill (20260912b_pkg1b_media_trusted_object_binding.sql) has already run; stops a later reapplication of that migration from re-marking rows created since. Never written to by application code.';

-- CORRECTION, third adversarial review: a plain "content_sha256 IS NULL"
-- backfill (this migration's own original version) grants is_legacy_media
-- to ANY row shaped that way, with no check that the row's own `path`
-- genuinely, verifiably belongs to its own account. An authenticated
-- owner could INSERT a forged row on their own eligible listing, `path`
-- naming a KNOWN object belonging to a DIFFERENT account (another
-- lister's own private or preserved-original file), with source='upload'
-- and no content_sha256; that row is shaped identically to a genuine
-- historical row this migration is meant to grandfather in. Dates,
-- source='upload', object existence, and listing ownership ALONE are not
-- sufficient evidence: the SAME problem applies identically to
-- scripts/reconcile-deployment-window-legacy-gap.mjs's own, separate
-- trust-granting path (a real upload gap between this migration applying
-- and the new application code going live), so both are addressed here,
-- together, through the ONE function below, rather than two independently
-- maintained copies of the same logic that could drift apart.
--
-- VALIDATED PROVENANCE, PRECISELY.
--
-- A candidate row may be granted is_legacy_media = true only when ALL of:
--   1. visibility = 'public'. A row from THIS package's own two-phase
--      upload write is NEVER 'private' unless it is still genuinely
--      pending (phase 1 only); a truly pre-existing row was defaulted to
--      'public' the instant this column was added, never explicitly set.
--      Excluding 'private' rows here closes a real, separate risk: if a
--      still-in-flight pending upload were granted legacy trust while its
--      own trusted finalization has not yet completed, an owner's later
--      visibility flip (already proven closed for the derivation_verified
--      path, 20260912c's own adversarial tests) would reopen an
--      equivalent bypass through the is_legacy_media path instead.
--   2. The referenced object genuinely exists in storage.objects for the
--      listing-media bucket at this exact path.
--   3. That object's own folder-prefix (storage.foldername(name)[1])
--      equals the ROW'S OWN listing's account_id: the object is
--      demonstrably within the uploading account's own namespace, not
--      merely a path string the row's own INSERT happened to assert.
--      This is what an INSERT-time RLS check cannot express (it verifies
--      listing ownership, never what the free-text path column contains)
--      and what closes the cross-account forgery scenario completely.
--   4. No row, of any id, anywhere, currently records this SAME path with
--      moderation_state = 'removed': an object that was ever the subject
--      of a real moderation decision may never be re-admitted to public
--      trust merely because a fresh row happens to reference the same
--      path.
-- Same-account self-reference (an owner pointing a second row at their
-- OWN already-private or already-removed object) is not treated as a
-- distinct forgery case: the owner already holds full, legitimate access
-- to every object under their own account prefix regardless of this
-- table (the storage policy's own owner-folder branch, unconditional),
-- so this check is about STRANGERS gaining access, not about what an
-- owner may already reach through their own account.
--
-- ATOMIC BY CONSTRUCTION. The candidate set is computed once, into a
-- plain array, inside this one function call; the same array both drives
-- the UPDATE (when p_apply) and the returned report, so there is no
-- window between "checked eligible" and "granted trust" for the
-- underlying facts to change, and no way for the two to silently diverge.
--
-- p_from/p_to are optional: null on both (this migration's own call,
-- below) means "no time window, validate every remaining null-hash
-- candidate"; scripts/reconcile-deployment-window-legacy-gap.mjs supplies
-- both, narrowing the candidate set to its own explicit, operator-
-- supplied deployment window, on top of the SAME provenance checks, not
-- instead of them.
create or replace function public.grant_validated_legacy_media_trust(
  p_from timestamptz default null,
  p_to timestamptz default null,
  p_apply boolean default false
)
returns table (
  id uuid,
  listing_id uuid,
  path text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public, storage
as $$
declare
  matched_ids uuid[];
begin
  select coalesce(array_agg(c.id), array[]::uuid[]) into matched_ids
  from (
    select lm.id, lm.path, l.account_id
    from public.listing_media lm
    join public.listings l on l.id = lm.listing_id
    where lm.content_sha256 is null
      and lm.is_legacy_media = false
      and lm.visibility = 'public'
      and (p_from is null or lm.created_at >= p_from)
      and (p_to is null or lm.created_at < p_to)
  ) c
  where exists (
    select 1 from storage.objects o
    where o.bucket_id = 'listing-media'
      and o.name = c.path
      and (storage.foldername(o.name))[1] = c.account_id::text
  )
  and not exists (
    select 1 from public.listing_media removed_check
    where removed_check.path = c.path
      and removed_check.moderation_state = 'removed'
  );

  if p_apply and array_length(matched_ids, 1) > 0 then
    update public.listing_media lm set is_legacy_media = true where lm.id = any(matched_ids);
  end if;

  return query
    select lm.id, lm.listing_id, lm.path, lm.created_at
    from public.listing_media lm
    where lm.id = any(matched_ids)
    order by lm.created_at;
end;
$$;

revoke all on function public.grant_validated_legacy_media_trust(timestamptz, timestamptz, boolean) from public;
grant execute on function public.grant_validated_legacy_media_trust(timestamptz, timestamptz, boolean) to service_role;

comment on function public.grant_validated_legacy_media_trust(timestamptz, timestamptz, boolean) is
  'The ONE place is_legacy_media is ever granted, for both this migration''s own one-time backfill and scripts/reconcile-deployment-window-legacy-gap.mjs''s own later, windowed calls. Validates real object existence, same-account folder provenance, and no prior moderation removal before granting; service_role-only.';

-- One-time backfill, itself now provenance-validated, not blanket: every
-- row with no content_sha256 that ALSO independently proves real,
-- same-account, never-removed provenance at the moment this migration
-- first runs. A row that fails validation (a dangling path, a
-- cross-account reference, or a path that was moderation-removed) is left
-- untrusted, on purpose, and surfaced by the reporting query in the
-- runbook (section 21) rather than silently granted.
do $$
begin
  if not exists (select 1 from public.listing_media_legacy_backfill_done) then
    perform public.grant_validated_legacy_media_trust(null, null, true);
    insert into public.listing_media_legacy_backfill_done default values;
  end if;
end $$;

-- CORRECTION, same-day second adversarial review: this table was created
-- above with no explicit grant or RLS, relying implicitly on whatever
-- Supabase's own default-privilege configuration happens to be for a
-- newly created public-schema table. This package's own real, confirmed
-- production evidence (docs/pkg-listing-creation-1b-migration-runbook.md
-- section 18) is that anon/authenticated hold broad, unrestricted
-- SELECT/INSERT/UPDATE/DELETE/TRUNCATE by default on every table checked
-- so far; there is no reason to assume this ONE new table is different,
-- and its own safety must not rest on that unverified assumption. If a
-- client could TRUNCATE or DELETE this table's one row, a later
-- reapplication of this same migration (already required to be safe,
-- see above) would treat the backfill as never having run and mark
-- EVERY currently-null-hash row (including a genuinely pending, not-yet-
-- finalized upload, or a forged row) as legacy, defeating the entire
-- point. RLS enabled with zero policies (matching 20260905b's own
-- media_cleanup_queue pattern exactly: complete default-deny for
-- SELECT/INSERT/UPDATE/DELETE regardless of any table-level grant) plus
-- an explicit REVOKE (RLS does not govern TRUNCATE at all, confirmed
-- earlier this package's own history with a real, disposable local
-- reproduction; only an explicit revoke closes that specific gap) is
-- belt-and-suspenders on purpose: this table's own safety must be
-- provably true, not incidentally true because of how RLS happens to
-- interact with an assumed grant baseline.
alter table public.listing_media_legacy_backfill_done enable row level security;
revoke all on public.listing_media_legacy_backfill_done from public, anon, authenticated;

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

-- CORRECTION, same-day second adversarial review: derivation_verified only
-- ever proves "content_sha256 was set for THIS ROW at some point". It does
-- NOT bind that fact to the row's CURRENT path, because path/source/
-- listing_id are NOT trusted-column-protected above (INSERT-time values
-- are legitimately owner-supplied, before finalization exists to protect
-- anything yet). Without the freeze below, an owner could: legitimately
-- upload one real photo (derivation_verified becomes true), then UPDATE
-- that same row's path to point at a DIFFERENT object entirely (another
-- account's private/original object, or an object whose own real media
-- row was removed by moderation) -- content_sha256 is unchanged, so
-- derivation_verified stays true, and the storage policy's own
-- `lm.path = objects.name AND derivation_verified` check would admit the
-- substituted object. The identical problem applies to an
-- is_legacy_media = true row: nothing stopped its path from being
-- repointed either. A THIRD variant is a race, not merely a later
-- update: between the real upload route's own INSERT (path set, not yet
-- trusted) and its OWN later trusted UPDATE (which sets content_sha256
-- but has never touched path), a concurrent request on the owner's own
-- session could repoint path in that window; the later trusted UPDATE
-- would then finalize trust for a row now pointing somewhere else
-- entirely, since that UPDATE never re-asserts path.
--
-- THE FIX: path/source/listing_id are never UPDATE-able by a non-trusted
-- caller, unconditionally, regardless of the row's trust state at the
-- time. This is deliberately NOT conditional on "only once already
-- trusted": the race above is exploitable precisely because the row is
-- NOT YET trusted at the moment of the malicious update, so a
-- trust-state-conditional freeze would not close it. Nothing in this
-- codebase ever legitimately updates these three columns after INSERT
-- (grep across src confirms: the reorder PATCH touches only sort_order,
-- the categorize PATCH touches only shot_key/media_scope/media_condition;
-- there is no "replace this photo's file in place" feature anywhere,
-- only delete-and-reupload), so this closes the gap with no loss of any
-- real capability. Captions (alt_en/alt_ar), categorization, ordering
-- and the owner's own visibility choice are all untouched by this
-- trigger and remain exactly as writable as before.
create or replace function public.listing_media_freeze_object_identity()
returns trigger
language plpgsql
as $$
begin
  if current_user = 'service_role' or (select rolsuper from pg_roles where rolname = current_user) then
    return new;
  end if;
  if TG_OP = 'UPDATE' then
    if new.path is distinct from old.path
       or new.source is distinct from old.source
       or new.listing_id is distinct from old.listing_id then
      raise exception 'path, source and listing_id may not be changed once a row exists; delete and re-upload instead' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists listing_media_freeze_object_identity on public.listing_media;
create trigger listing_media_freeze_object_identity
  before update on public.listing_media
  for each row
  execute function public.listing_media_freeze_object_identity();

comment on function public.listing_media_freeze_object_identity() is
  'Closes the object-identity-substitution gap found by adversarial review of this migration''s own first version: derivation_verified/is_legacy_media alone proved a row was TRUSTED AT SOME POINT, never that its CURRENT path is what was trusted. INSERT remains free (the real two-phase upload write needs this); no non-trusted UPDATE may ever change path/source/listing_id again, closing the post-trust substitution, the legacy-row substitution, and the pre-finalization race uniformly.';

comment on column public.listing_media.is_legacy_media is
  'True only for rows that both predate this migration (no content_sha256 when it first ran) AND independently passed public.grant_validated_legacy_media_trust()''s own real-object/same-account/never-removed provenance check; never granted on shape (dates, source=upload, listing ownership) alone. Never true for any row inserted afterward. Trusted-column protected: only that function''s own service_role-only call may ever set it.';
comment on column public.listing_media.derivation_verified is
  'Stored generated column: true exactly when content_sha256 is not null. Lets anon/authenticated (and the storage policy''s own EXISTS clause) confirm a row went through the trusted upload pipeline without ever granting read access to content_sha256 itself.';
