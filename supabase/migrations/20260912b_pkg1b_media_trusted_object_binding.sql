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
-- INSERT ever permits for a non-trusted caller).
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
-- that predate this fix entirely, and that a real, out-of-band process has
-- independently confirmed are legitimate (see the fifth adversarial review
-- correction below). No later INSERT can ever receive true here (the
-- column defaults to false, and is trusted-column protected like
-- content_sha256/original_path), so once granted it is a permanent,
-- one-time historical fact, never confused with "recently inserted, still
-- unhashed".

alter table public.listing_media
  add column if not exists is_legacy_media boolean not null default false;

alter table public.listing_media
  add column if not exists derivation_verified boolean
    generated always as (content_sha256 is not null) stored;

create table if not exists public.listing_media_legacy_backfill_done (
  backfilled_at timestamptz not null default now()
);

comment on table public.listing_media_legacy_backfill_done is
  'Existence of any row records that this migration (20260912b_pkg1b_media_trusted_object_binding.sql) has already applied once. No automatic grant runs at migration time (fifth adversarial review); this is now purely a historical marker so reapplication stays idempotent. Never written to by application code.';

-- CORRECTION, FIFTH ADVERSARIAL REVIEW (the same-day round after the
-- fourth): the fourth round's own fix ("VALIDATED PROVENANCE, PRECISELY",
-- below this comment in the prior version of this file) granted
-- is_legacy_media whenever an object existed at the row's own path, that
-- path's folder-prefix matched the row's own account, visibility was
-- 'public', and no row anywhere recorded that path as moderation-removed.
-- The review's own framing corrected the threat model this rested on:
-- "the owner already holds full, legitimate access... so this check is
-- about strangers gaining access" is the WRONG boundary. The harm is not
-- what the owner can already reach; it is what becomes PUBLICLY TRUSTED,
-- which is then reachable by every stranger, not just the owner. Under
-- that corrected framing, folder-prefix matching does not help: an owner
-- can, within their OWN account's folder prefix, INSERT a row whose path
-- names:
--   - a DIFFERENT row's own preserved original (originals/... or
--     whatever path a genuinely-trusted row's own original_path records),
--   - a DIFFERENT listing's own private object, still within the same
--     account,
--   - an object that was never validated by anything at all, same
--     account, freshly placed in storage by any means the owner has
--     (the owner can write directly to their own storage folder; nothing
--     about that write goes through the application's own pipeline).
-- Folder location, visibility, timestamps, and object existence are
-- exactly the facts an owner's own session already controls or can
-- satisfy trivially; none of them are independent evidence that a
-- specific row's specific path was ever produced by the real trusted
-- pipeline. No query over listing_media/storage.objects alone can
-- manufacture that evidence retroactively for data the old application
-- never recorded a binding for: the pre-PKG-1B upload route wrote no
-- hash, no manifest, no audit log entry tying a row to proof its object
-- passed processing. That is a genuine, permanent absence of evidence,
-- not a query this migration failed to write.
--
-- THE CORRECTED MECHANISM: OPERATOR-ATTESTED, DRIFT-CHECKED, NEVER
-- SHAPE-INFERRED.
--
-- public.apply_verified_media_provenance(p_manifest, p_apply) replaces
-- public.grant_validated_legacy_media_trust(p_from, p_to, p_apply)
-- entirely (not merely renamed: the OLD function inferred candidates by
-- querying listing_media/storage.objects for a shape; the NEW one accepts
-- no such query at all). Trust originates OUTSIDE the database: an
-- operator independently establishes, by some real, out-of-band means
-- this migration does not and cannot specify in general (surviving old
-- application/server logs cross-referencing which object path a specific
-- row id's own upload request produced; a real re-upload of the actual
-- file through this package's own live, trusted pipeline, which then
-- supersedes the historical row entirely; or, at minimum, a named human's
-- own manual review, recorded outside this database, of the specific
-- row+object pair) which EXACT (row id, current path) pairs are
-- legitimate, and supplies them as p_manifest, a JSON array of
-- {"id": ..., "path": ...} objects. A row named nowhere in any manifest
-- is never granted trust by this function, ever, no matter how long it
-- has existed or how ordinary its shape looks; per instruction, it stays
-- untrusted, and the only remediation is the SAME real re-upload path a
-- brand new listing already uses (delete the untrusted row, or its
-- underlying file, and re-upload through the live Studio; the two-phase
-- write then computes a real content_sha256 itself, and this function is
-- never involved at all).
--
-- The function does not trust the manifest blindly either: for each
-- entry, it locks the exact candidate row (FOR UPDATE, so a concurrent
-- change cannot race this function's own decision, closing the fourth
-- review's own atomicity finding at the same time, see below) and
-- re-verifies, fresh, at the moment of the check, never from any
-- pre-computed snapshot:
--   1. The row still exists and is not already trusted some other way.
--   2. Its CURRENT path is EXACTLY the manifest's path. If it has
--      changed since the operator prepared the manifest, the entry is
--      stale and is refused, not silently applied to whatever the row
--      now happens to point at.
--   3. The object genuinely exists in storage at that exact path.
--   4. No row, of any id, anywhere, records this SAME path as its own
--      original_path: a manifest entry can never launder a path that is
--      actually another row's own preserved original into public trust.
--      original_path is itself trusted-column-protected (service_role
--      only), so this check is evidence an owner cannot forge.
--   5. No OTHER row currently references this SAME path with
--      visibility = 'private' or moderation_state = 'removed': a path
--      still recorded elsewhere as private or removed can never be
--      admitted to public trust through a different row's manifest entry.
--   6. The object's own folder-prefix (storage.foldername(name)[1])
--      equals the CANDIDATE ROW's own listing's account_id. This is the
--      same check the fourth review's own version of this function used,
--      kept, not dropped: the fifth review's own correction is that
--      folder-prefix matching (plus visibility/existence) must never be
--      treated as SUFFICIENT evidence to originate trust on its own, not
--      that it stops being a real, necessary integrity check once trust
--      is otherwise established by the manifest. An operator's manifest
--      can name the wrong row by mistake; this still refuses to let that
--      mistake grant a cross-account object, exactly as before.
-- None of checks 3 through 6 are, individually or together, ever treated
-- as ORIGINATING trust (that is what the fourth review's own version of
-- this function got wrong): they are integrity checks a manifest entry
-- must ALSO clear, on top of being named by the operator in the first
-- place, never a substitute for it. A row named nowhere in p_manifest
-- fails every single time, regardless of how cleanly it would pass 3-6.
--
-- ATOMICITY, CORRECTED TWICE (fourth review's finding, then the sixth
-- review's own correction of that fix).
--
-- The fourth review's own finding: a candidate array computed once, then
-- updated by that array alone, with no re-check between "selected" and
-- "granted", lets a concurrent transaction changing a candidate row's
-- facts in that window go uncaught.
--
-- The fifth/sixth review's own fix (FOR UPDATE on the candidate row,
-- re-checking its state, re-asserting its path in the UPDATE's own WHERE
-- clause) closed that for the CANDIDATE ROW's own facts, but the function
-- also depends on facts that live elsewhere: whether the referenced
-- object exists in storage.objects, and whether some OTHER listing_media
-- row currently claims the same path as its own original_path, or as a
-- private/removed reference. Those were read by separate, earlier
-- SELECT statements, never re-verified atomically with the write, and
-- never locked against a concurrent writer: a transaction that commits a
-- change to one of those OTHER facts in the gap between this function's
-- own read and its own write would not be caught, because re-checking
-- only the candidate row's own state (its path) does not protect facts
-- that live on a different row or a different table entirely.
--
-- THE FIX, THIS ROUND: exactly one thing decides every grant: a single
-- UPDATE statement (below) whose WHERE clause encodes every guard,
-- including the cross-row and cross-table ones, evaluated together
-- against one consistent read as of that ONE statement's own start, with
-- the candidate row locked for the statement's duration exactly as any
-- UPDATE locks the row it targets. There is no separate "check, then
-- write" step for the grant decision itself: a diagnostic re-check runs
-- ONLY afterward, ONLY to explain a refusal, and never decides anything.
--
-- This alone is not sufficient for the cross-row facts, because the
-- UPDATE's own WHERE-clause subqueries against storage.objects and other
-- listing_media rows are ordinary reads, not locks: a concurrent writer
-- to THOSE rows is not blocked by this statement the way a concurrent
-- writer to the CANDIDATE row is. `lock table ... in share row exclusive
-- mode` below, taken once per apply-mode call (never in report mode,
-- which writes nothing and accepts a preview may be marginally stale),
-- blocks every ordinary INSERT/UPDATE/DELETE against listing_media for
-- the duration of this call, closing the listing-media-to-listing-media
-- race completely; the matching lock on storage.objects closes the
-- object-existence race the same way. This is a real, stated operating
-- precondition, not merely a comment: apply-mode calls serialize against
-- every other write to either table while they run, which is why they
-- are expected to run briefly and during the write-pause window
-- described in the runbook, not as a background job competing with live
-- traffic.
--
-- LOCK MODE, CORRECTED TWICE DURING THIS ROUND'S OWN TESTING. Plain
-- `share mode` (tried first) does not conflict with itself: two
-- concurrent apply-mode calls both acquire it, then each independently
-- tries to escalate for its own per-entry UPDATE, which needs a
-- conflicting row-exclusive lock the OTHER session's own share lock is
-- blocking; both wait on each other, and Postgres's own deadlock detector
-- (correctly) aborted one, caught by this round's own deterministic
-- two-concurrent-apply-calls test as a genuine "deadlock detected", not a
-- timeout or an assumption. `share update exclusive` (tried second, to
-- fix that) turned out not to conflict with plain row exclusive at all
-- (it exists for VACUUM/ANALYZE/CREATE INDEX CONCURRENTLY specifically
-- because those must NOT block ordinary DML); a dedicated test using two
-- DIFFERENT rows (one the apply call's own candidate, one a concurrent
-- writer touches) rather than two calls racing the SAME row caught this:
-- the concurrent writer's plain UPDATE on the unrelated row was never
-- blocked at all, so the apply call proceeded on a stale read and would
-- have granted a row it should have refused. `share row exclusive` is
-- both self-exclusive (only one session at a time, so a second concurrent
-- apply-mode call blocks cleanly at the LOCK TABLE statement itself,
-- fully serialized before it ever reaches its own UPDATE) and conflicts
-- with row exclusive (so it genuinely blocks ordinary INSERT/UPDATE/
-- DELETE from any other session against ANY row in the table, not merely
-- the one row an apply call happens to also be targeting).
--
-- APPROVAL DRIFT, CLOSED (sixth adversarial review; the fifth review's
-- own preview-then-apply-then-compare pattern, in the reconciliation
-- script, reported drift only AFTER granting on it, which detects, but
-- does not prevent). Every apply-mode
-- entry now carries expected_status, taken verbatim from a PRIOR
-- p_apply=false call the caller actually ran: this function no longer
-- accepts an apply call it cannot verify was reviewed first. The grant
-- UPDATE's own WHERE clause requires expected_status = 'would_grant' as
-- ONE of its conditions, alongside every structural guard: an entry that
-- FAILED preview can never be granted merely because something changed
-- to make it newly eligible before apply ran (the exact gap named this
-- round), and an entry that PASSED preview but no longer does by the time
-- apply runs is refused by the same mechanism, symmetrically. Nothing is
-- granted unless it was both previously reviewed as grantable AND is
-- still, right now, in the one atomic statement that matters, exactly
-- that.
create or replace function public.apply_verified_media_provenance(
  p_manifest jsonb,
  p_apply boolean default false
)
returns table (
  id uuid,
  listing_id uuid,
  path text,
  created_at timestamptz,
  status text
)
language plpgsql
security definer
set search_path = public, storage
as $$
declare
  entry record;
  candidate record;
  updated record;
  s text;
begin
  if p_manifest is null or jsonb_typeof(p_manifest) <> 'array' then
    raise exception 'p_manifest must be a JSON array of {"id": ..., "path": ..., "expected_status": ...} objects, each independently verified by the caller before this function is ever invoked' using errcode = '22023';
  end if;

  if p_apply then
    -- Serializes this whole call against every other write to either
    -- table for its duration (see the comment above): the operating
    -- precondition that makes the single-statement grant below correct
    -- for facts that live outside the candidate row itself.
    lock table public.listing_media in share row exclusive mode;
    lock table storage.objects in share row exclusive mode;
  end if;

  for entry in
    select (elem->>'id')::uuid as m_id, (elem->>'path') as m_path, (elem->>'expected_status') as m_expected
    from jsonb_array_elements(p_manifest) as elem
  loop
    if p_apply and entry.m_expected is null then
      raise exception 'p_apply=true requires expected_status on every manifest entry (entry id %); run a p_apply=false preview first and pass its own reported status back verbatim, never call apply against an unreviewed manifest', entry.m_id using errcode = '22023';
    end if;

    updated := null;
    if p_apply then
      -- THE GRANT DECISION. One statement, one snapshot, every guard
      -- (approval, row state, path match, object existence + account
      -- folder, preserved-original reuse, private/removed-reference
      -- sharing) in its own WHERE clause; the row lock this UPDATE takes
      -- is what makes a concurrent grant attempt on the SAME row block
      -- and then correctly re-evaluate against post-commit state (proven
      -- in the isolated harness), and the table locks above make the
      -- cross-row/cross-table subqueries here safe against a concurrent
      -- writer changing what they'd see.
      update public.listing_media lm
        set is_legacy_media = true
        where lm.id = entry.m_id
          and lm.path = entry.m_path
          and entry.m_expected = 'would_grant'
          and lm.content_sha256 is null
          and lm.is_legacy_media = false
          and exists (
            select 1
            from storage.objects o
            join public.listings l on l.id = lm.listing_id
            where o.bucket_id = 'listing-media'
              and o.name = lm.path
              and (storage.foldername(o.name))[1] = l.account_id::text
          )
          and not exists (
            select 1 from public.listing_media other
            where other.original_path = lm.path
          )
          and not exists (
            select 1 from public.listing_media other
            where other.id <> lm.id
              and other.path = lm.path
              and (other.visibility = 'private' or other.moderation_state = 'removed')
          )
        returning lm.id, lm.listing_id, lm.path, lm.created_at into updated;

      if updated.id is not null then
        id := updated.id; listing_id := updated.listing_id; path := updated.path; created_at := updated.created_at;
        status := 'granted';
        return next;
        continue;
      end if;
    end if;

    -- Diagnostic chain: in report mode, this computes what WOULD happen.
    -- In apply mode, we only reach here when the atomic UPDATE above
    -- affected zero rows; this explains why, but decides nothing (the
    -- decision already happened, and was refused, above).
    select lm.id, lm.listing_id, lm.path, lm.created_at, lm.content_sha256, lm.is_legacy_media
      into candidate
      from public.listing_media lm
      where lm.id = entry.m_id;

    if not found then
      s := 'row_not_found';
    elsif candidate.content_sha256 is not null or candidate.is_legacy_media then
      s := 'already_trusted';
    elsif candidate.path is distinct from entry.m_path then
      s := 'path_drifted_since_manifest_was_prepared';
    elsif not exists (
      select 1 from storage.objects o
      where o.bucket_id = 'listing-media' and o.name = entry.m_path
    ) then
      s := 'object_missing_from_storage';
    elsif not exists (
      select 1
      from storage.objects o
      join public.listings l on l.id = candidate.listing_id
      where o.bucket_id = 'listing-media'
        and o.name = entry.m_path
        and (storage.foldername(o.name))[1] = l.account_id::text
    ) then
      s := 'object_outside_candidate_account_folder';
    elsif exists (
      select 1 from public.listing_media other
      where other.original_path = entry.m_path
    ) then
      s := 'path_is_a_recorded_preserved_original';
    elsif exists (
      select 1 from public.listing_media other
      where other.id <> candidate.id
        and other.path = entry.m_path
        and (other.visibility = 'private' or other.moderation_state = 'removed')
    ) then
      s := 'path_shared_with_a_private_or_removed_reference';
    else
      s := 'would_grant';
    end if;

    if p_apply then
      if entry.m_expected is distinct from 'would_grant' then
        -- This entry was never approved for a grant in the first place
        -- (its own prior preview reported something other than
        -- would_grant); report that precisely, regardless of how it
        -- happens to evaluate right now.
        s := 'refused_not_approved_for_grant';
      elsif s = 'would_grant' then
        -- expected_status WAS 'would_grant' (approved), the diagnostic
        -- chain here, run fresh, ALSO says would_grant right now, yet the
        -- atomic UPDATE above still affected zero rows a moment earlier.
        -- The only honest read is that something changed in the (small,
        -- but non-zero) gap between that UPDATE and this diagnostic
        -- SELECT; reporting a false 'would_grant' here, as if this entry
        -- were still simply pending, would misstate that nothing was
        -- ever granted for a reason.
        s := 'refused_state_changed_since_approval';
      end if;
    end if;

    id := coalesce(candidate.id, entry.m_id);
    listing_id := candidate.listing_id;
    path := coalesce(candidate.path, entry.m_path);
    created_at := candidate.created_at;
    status := s;
    return next;
  end loop;
end;
$$;

-- CORRECTION, FIFTH ADVERSARIAL REVIEW, item 2: revoking from PUBLIC alone
-- is not sufficient. Real production evidence (checked directly against
-- pg_default_acl this round): this project's own default-privilege
-- configuration grants EXECUTE on newly created functions to anon,
-- authenticated and service_role EXPLICITLY, by name, not only via the
-- PUBLIC pseudo-role (confirmed against every existing public-schema
-- function, both supabase_admin-owned and postgres-owned). A
-- `revoke ... from public` does not touch a direct, per-role grant, so it
-- would have left this SECURITY DEFINER function callable by anon and
-- authenticated in production despite the earlier version of this
-- migration's own intent. Every relevant role is now named explicitly,
-- and this is done for the trigger functions below too, even though
-- Postgres does not require trigger-firing itself to check the firing
-- role's own EXECUTE privilege (only CREATE TRIGGER, already gated by
-- table ownership, does): a trigger function remains directly callable as
-- an ordinary function by anyone holding EXECUTE on it, and there is no
-- legitimate reason for any role but service_role to ever call any
-- function in this migration directly.
revoke execute on function public.apply_verified_media_provenance(jsonb, boolean) from public, anon, authenticated;
grant execute on function public.apply_verified_media_provenance(jsonb, boolean) to service_role;

comment on function public.apply_verified_media_provenance(jsonb, boolean) is
  'The ONE place is_legacy_media is ever granted. Trust never ORIGINATES from row/object shape (path, folder, visibility, timestamps, existence): every grant traces to an explicit, operator-supplied manifest entry (id + expected path) established by a real process outside this database. p_apply=true additionally requires expected_status on every entry, taken from a prior p_apply=false call: an entry that failed preview is never granted merely because something later made it newly eligible, and an entry that passed preview is refused if anything changed by the time apply runs. The grant decision is one atomic UPDATE whose WHERE clause encodes every guard (path match, object existence + account folder, preserved-original reuse, private/removed-reference sharing), table-locked for its duration so those cross-row/cross-table facts cannot change mid-decision. service_role-only; revoked from anon/authenticated explicitly, not only from PUBLIC (see comment above). Structural guards only: this function verifies a manifest entry is not internally contradictory (drift, cross-account, reused/shared paths), never that the underlying file is actually the operator''s legitimate content; that judgment is the operator''s own, made before the entry ever reaches this function.';

-- No automatic backfill runs here (fifth adversarial review): there is no
-- manifest this migration file can safely embed sight-unseen, and
-- granting trust from anything OTHER than a real, reviewed manifest is
-- exactly what this correction removes. The marker row below exists only
-- so a later reapplication of this migration file stays idempotent and
-- so the table's own lockdown tests (below) remain meaningful; it grants
-- nothing.
do $$
begin
  if not exists (select 1 from public.listing_media_legacy_backfill_done) then
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
-- and its own safety must not rest on that unverified assumption. RLS
-- enabled with zero policies (matching 20260905b's own media_cleanup_queue
-- pattern exactly: complete default-deny for SELECT/INSERT/UPDATE/DELETE
-- regardless of any table-level grant) plus an explicit REVOKE (RLS does
-- not govern TRUNCATE at all, confirmed earlier this package's own
-- history with a real, disposable local reproduction; only an explicit
-- revoke closes that specific gap) is belt-and-suspenders on purpose:
-- this table's own safety must be provably true, not incidentally true
-- because of how RLS happens to interact with an assumed grant baseline.
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
      raise exception 'only public.apply_verified_media_provenance() may set is_legacy_media' using errcode = '42501';
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

revoke execute on function public.listing_media_protect_legacy_flag() from public, anon, authenticated;

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

revoke execute on function public.listing_media_freeze_object_identity() from public, anon, authenticated;

comment on function public.listing_media_freeze_object_identity() is
  'Closes the object-identity-substitution gap found by adversarial review of this migration''s own first version: derivation_verified/is_legacy_media alone proved a row was TRUSTED AT SOME POINT, never that its CURRENT path is what was trusted. INSERT remains free (the real two-phase upload write needs this); no non-trusted UPDATE may ever change path/source/listing_id again, closing the post-trust substitution, the legacy-row substitution, and the pre-finalization race uniformly.';

comment on column public.listing_media.is_legacy_media is
  'True only for rows granted trust by public.apply_verified_media_provenance(), itself driven entirely by an operator-supplied, out-of-band-verified manifest, never by row/object shape (path, folder, visibility, timestamps, existence) alone. Never true for any row inserted afterward. Trusted-column protected: only that function''s own service_role-only call may ever set it.';
comment on column public.listing_media.derivation_verified is
  'Stored generated column: true exactly when content_sha256 is not null. Lets anon/authenticated (and the storage policy''s own EXISTS clause) confirm a row went through the trusted upload pipeline without ever granting read access to content_sha256 itself.';
