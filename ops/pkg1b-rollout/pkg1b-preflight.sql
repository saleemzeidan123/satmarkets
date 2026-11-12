-- PKG-LISTING-CREATION-1B real-schema preflight (dry run). Nothing here persists.
-- Generated from branch pkg/listing-creation-1b at 5644262: the twelve PKG-LISTING-CREATION-1B migrations in runbook
-- section 11 order. The whole file is ONE statement (a DO block that EXECUTEs the migration text), so it is atomic
-- however the SQL runner sends it: all of it lands or none of it.
-- After the migrations run it deliberately raises an exception, which rolls everything back. Expected outcome: one
-- error whose message starts with PREFLIGHT_REACHED_END_AND_ROLLED_BACK. Any other error is a real finding.
do $pkg1b_rollout_outer$
declare j jsonb;
begin
  execute $pkg1b_rollout_sql$
-- >>>>> 20260902_pkg1b_durable_evidence_state.sql  sha256=bd123db64bf422d73913d94e54d9defc4dc05ea9aa675c9166877dc921e1e1e6
-- PKG-LISTING-CREATION-1B, outcome A. Durable evidence state.
--
-- WHY THIS EXISTS.
--
-- guidedEvidence.ts's "marked unavailable, with reason" state has lived in
-- Studio component state only since PKG-LISTING-CREATION-1A shipped: close
-- the tab and it is gone, so a lister who marks the yard photo unavailable
-- on Monday is asked for it again on Tuesday. The gap was disclosed, not
-- hidden (docs/pkg-listing-creation-1a-deferred-contracts.md item 2), and
-- this is the schema that closes it, drafted there and reviewed once during
-- that package's own Codex review before being applied here.
--
-- APPEND-ONLY, LIKE verification_events, FOR THE SAME REASON.
--
-- The deferred-contracts draft used a single mutable row per (listing_id,
-- item_key), updated or deleted in place. That loses history: there would be
-- no record of who marked something unavailable before it was later supplied,
-- or of a lister correcting their own prior mark. This table follows
-- 20260713_verification_events.sql's own pattern instead: one row per
-- action, nothing ever updated or deleted, "current state" read as the
-- latest row per (listing_id, item_kind, item_key). Marking something
-- unavailable, and later clearing that mark because the item was supplied,
-- are both actions in this ledger; neither erases the other.
--
-- WHAT THIS DELIBERATELY DOES NOT DO.
--
-- It has no notion of "supplied", "awaiting evidence", "not applicable" or
-- "unknown": those are derived at read time from the listing's own data
-- (a field has a value, a photo exists for a shot, and so on) by
-- guidedEvidence.ts, exactly as they are today. This table records only the
-- one fact that cannot be derived from data: a lister's explicit assertion
-- that a specific item does not exist for this property, and why. Marking
-- something unavailable here must never be read by any code as satisfying a
-- publication requirement; this migration creates no such reading, and none
-- should be added without a separate, explicit product decision.

create table if not exists public.listing_evidence_marks (
  id          uuid primary key default gen_random_uuid(),
  listing_id  uuid not null references public.listings(id) on delete cascade,
  item_kind   text not null check (item_kind in ('photo', 'fact')),
  item_key    text not null,
  action      text not null check (action in ('marked_unavailable', 'cleared')),
  -- Required for marked_unavailable (a real reason, not a rubber stamp: the
  -- same minimum-length discipline verification_events already applies to
  -- its own free-text `basis` column), forbidden for cleared (nothing to
  -- explain about no longer asserting something).
  reason      text,
  actor_user_id  uuid not null references public.users(id),
  actor_account_id uuid not null references public.accounts(id),
  created_at  timestamptz not null default now(),
  -- Codex review: created_at is transaction-stable in Postgres (every
  -- statement in the same transaction, and any statements whose clocks
  -- round to the same tick, can share an identical value), so it is not a
  -- total order on its own; two rows for the same item with the same
  -- created_at would make "current state" ambiguous. seq is the real,
  -- authoritative order: a database-generated identity value, monotonic
  -- and immutable once assigned, never reused, never settable by a caller.
  -- Every reader of "current state" (this migration's own index, the
  -- invalidation trigger in 20260905, and guidedEvidence.ts's
  -- currentEvidenceMarks()) orders by seq, not by created_at. created_at
  -- is kept as the human-readable timestamp the UI and audit views show;
  -- it is no longer load-bearing for ordering.
  seq         bigint generated always as identity,
  constraint listing_evidence_marks_reason_shape check (
    (action = 'marked_unavailable' and reason is not null and length(btrim(reason)) >= 8)
    or (action = 'cleared' and reason is null)
  )
);

-- The query every reader of "current state" actually runs: latest row per
-- item, by seq (the real total order), not created_at. DESC so a caller can
-- `distinct on (listing_id, item_kind, item_key) ... order by ... seq desc`
-- straight off this index.
create index if not exists listing_evidence_marks_current_idx
  on public.listing_evidence_marks (listing_id, item_kind, item_key, seq desc);

alter table public.listing_evidence_marks enable row level security;

-- Owner reads their own listing's marks. SAT reads all (reviewers need the
-- same visibility they already have over the listing itself via existing
-- policies elsewhere).
drop policy if exists "owner or sat reads evidence marks" on public.listing_evidence_marks;
create policy "owner or sat reads evidence marks"
  on public.listing_evidence_marks for select
  using (
    public.app_is_sat()
    or listing_id in (select id from public.listings where account_id = public.app_account_id())
  );

-- Owner writes on their own listing, or SAT writes (assisting a lister, or
-- correcting a record) - but never as someone else: the actor columns must
-- match the real caller, mirroring verification_events' own
-- "actor_user_id = public.app_user_id()" rule against a forged actor.
drop policy if exists "owner or sat appends evidence marks" on public.listing_evidence_marks;
create policy "owner or sat appends evidence marks"
  on public.listing_evidence_marks for insert
  with check (
    actor_user_id = public.app_user_id()
    and actor_account_id = public.app_account_id()
    and (
      public.app_is_sat()
      or listing_id in (select id from public.listings where account_id = public.app_account_id())
    )
  );

-- Append-only by omission: no UPDATE policy and no DELETE policy exist, so
-- with RLS on, no mark can be rewritten or erased by anyone, including SAT.

comment on table public.listing_evidence_marks is
  'Append-only ledger of "marked unavailable, here is why" and its clearing, per listing item. Current state for one item is its latest row by seq (not created_at, which is not a total order). Never updated or deleted. Marking an item unavailable is not, and must never be read as, satisfying a publication requirement.';

-- Codex review: concurrent conflict policy, stated once, here.
--
-- Two callers racing to mark and clear the same item (or two marks, or two
-- clears) are never rejected and never lock against each other: each is
-- its own INSERT into an append-only table, so both succeed and both are
-- durably recorded. There is no "conflict" in the lock-contention sense.
-- What decides which one is CURRENT is seq: whichever insert's identity
-- value is higher is later, full stop, and every reader agrees, because
-- every reader uses the same seq-ordered query. This is last-writer-wins
-- by a real total order, not by wall-clock time, and it is a deliberate
-- choice: the ledger's job is to record what was asserted and in what
-- order, not to arbitrate which caller "should have won" a race that both
-- callers experienced as a normal, unsynchronized action.
-- <<<<< 20260902_pkg1b_durable_evidence_state.sql

-- >>>>> 20260902b_pkg1b_media_categorization.sql  sha256=617025cb7ae39ae9d90d212f7b52f1728a1f1f5f25d2fa01db94ce936535ca93
-- PKG-LISTING-CREATION-1B, outcome B. Per-shot media categorization.
--
-- WHY THIS EXISTS.
--
-- listing_media records `kind` (photo | floorplan | brochure), not which of
-- mediaStandard.ts's named shots (approach, entrance, interior_wide, and the
-- asset-specific extras) a given photo answers. That gap is exactly what
-- made guidedEvidence.ts's per-shot coverage degrade to "any photo present"
-- in PKG-LISTING-CREATION-1A (deferred-contracts item 1); this migration is
-- that item's own drafted schema, extended with the rest of outcome B:
-- building/unit scope, current-vs-illustrative condition, a rights
-- acknowledgement, a visibility state, and a moderation state that does
-- not imply approval before review has happened.
--
-- UNCATEGORISED IS A VALID, HONEST STATE.
--
-- shot_key stays nullable. Null means "not yet categorised", never "no
-- shot" and never inferred as any particular shot; the same convention this
-- package's own guidedEvidence.ts already uses for fulfilment being null on
-- a conditional item. No column here defaults to a guess.
--
-- NO is_cover COLUMN, ON PURPOSE. Codex review: an earlier draft of this
-- migration added one, and the application deliberately never built a
-- control that could set it (mediaCategorization.ts's own header comment
-- named the reason: this codebase already has a working, sort_order = 0,
-- "cover photo" convention, used by the public listing page, the card
-- component, and the dashboard media manager's own "make cover" action). A
-- second, unused column recording the same fact a different way is a
-- double source of truth waiting to drift, not a deferred feature; the
-- ruling for this package is to keep the one rule that already works
-- everywhere rather than ship an inert column beside it. If a future
-- package genuinely needs a cover concept sort_order cannot express, that
-- is a new, deliberate design decision, not a column already sitting here
-- unused.

alter table public.listing_media
  add column if not exists shot_key text null,
  add column if not exists media_scope text null
    check (media_scope in ('building', 'unit')),
  add column if not exists media_condition text null
    check (media_condition in ('current', 'illustrative')),
  add column if not exists rights_acknowledged_by uuid null references public.users(id),
  add column if not exists rights_acknowledged_at timestamptz null,
  -- 'public' is the honest default, not 'private', for the same reason
  -- moderation_state below defaults to 'unreviewed' rather than an
  -- approved-sounding value: the default must describe what is actually
  -- true today, not what a future gate will eventually make true. Every
  -- existing and new photo is served on the public listing page right now
  -- with no visibility filter anywhere in that read path (confirmed by
  -- reading it, not assumed); recording 'private' here would have every row
  -- claim a restriction nothing enforces the moment this column exists. A
  -- future package that actually gates on this column changes the default
  -- then, when the gate is real, not before.
  add column if not exists visibility text not null default 'public'
    check (visibility in ('public', 'private')),
  -- Deliberately not "approved" / "pending_review": that vocabulary implies
  -- a review gate exists and something is queued behind it. Nothing in this
  -- codebase moderates media yet. "unreviewed" is the honest default; a
  -- future moderation workflow adds real states alongside it, not renames
  -- this one into a false claim of review having happened.
  add column if not exists moderation_state text not null default 'unreviewed'
    check (moderation_state in ('unreviewed', 'flagged', 'removed'));

-- Codex review: a trusted-write boundary, enforced here in the database,
-- not only by application-route logic (a signed-in user can call
-- Supabase/PostgREST directly with their own session, bypassing any route
-- that never runs).
--
-- A first version of this tried a column-level REVOKE from "authenticated"
-- and was wrong: Postgres's column-level REVOKE does not retract a
-- broader, pre-existing TABLE-level GRANT (this codebase's own
-- authenticated role already has table-level UPDATE on listing_media for
-- shot_key/media_scope/media_condition), so the REVOKE was a silent
-- no-op, caught only because an adversarial test actually tried the write
-- rather than trusting the SQL to mean what it said. A trigger is used
-- instead: it fires regardless of the grant structure already in place
-- (this migration does not need to know, or match, whatever the real
-- production table's existing grants are), and it is what the isolated
-- test harness's own adversarial tests actually exercise.
--
-- rights_acknowledged_by/at record who acknowledged rights and when: a
-- fact only that real action may produce, never a value the row's own
-- owner asserts about themselves. moderation_state is a SAT/reviewer
-- decision about content, not the lister's own to make (see the runbook's
-- own section on visibility vs. moderation authority). Both are written,
-- when a real workflow exists to write them, only through
-- getSupabaseServiceRole() (src/lib/supabase/serviceRole.ts), which
-- connects to Postgres AS Supabase's real service_role, the one role this
-- trigger exempts.
--
-- visibility is deliberately NOT protected here: it is the owner's own
-- privacy choice about their own photo (see item 6's ruling), so it stays
-- reachable through the ordinary owner-scoped RLS update policy once a
-- real control exists to set it, the same as shot_key/media_scope/
-- media_condition above.
create or replace function public.listing_media_protect_trusted_columns_b()
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
    if new.rights_acknowledged_by is not null
       or new.rights_acknowledged_at is not null
       or new.moderation_state is distinct from 'unreviewed' then
      raise exception 'only a trusted server process may set rights_acknowledged_by/at or a non-default moderation_state' using errcode = '42501';
    end if;
  elsif TG_OP = 'UPDATE' then
    if new.rights_acknowledged_by is distinct from old.rights_acknowledged_by
       or new.rights_acknowledged_at is distinct from old.rights_acknowledged_at
       or new.moderation_state is distinct from old.moderation_state then
      raise exception 'only a trusted server process may change rights_acknowledged_by/at or moderation_state' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists listing_media_protect_trusted_columns_b on public.listing_media;
create trigger listing_media_protect_trusted_columns_b
  before insert or update on public.listing_media
  for each row
  execute function public.listing_media_protect_trusted_columns_b();

-- "Changing the asset type must not silently retain incompatible media
-- classifications" (outcome B). The shot taxonomy is asset-type-specific
-- and lives in one place, mediaStandard.ts's TypeScript registry; a second,
-- SQL-side copy of that mapping would be exactly the kind of two
-- independently-drifting sources this codebase's own architecture
-- (listingPresentation.ts's "one truth model") exists to prevent. So this
-- trigger does not attempt to know which shot keys remain valid for a new
-- asset type: it conservatively clears every shot_key on the listing's
-- media whenever asset_type changes, forcing re-categorisation against the
-- new type's real taxonomy rather than risking a photo silently keeping a
-- label that no longer means what it says.
create or replace function public.clear_media_shot_keys_on_asset_type_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.asset_type is distinct from old.asset_type then
    update public.listing_media
      set shot_key = null
      where listing_id = new.id
        and shot_key is not null;
  end if;
  return new;
end;
$$;

drop trigger if exists clear_media_shot_keys_on_asset_type_change on public.listings;
create trigger clear_media_shot_keys_on_asset_type_change
  after update of asset_type on public.listings
  for each row
  execute function public.clear_media_shot_keys_on_asset_type_change();

comment on column public.listing_media.shot_key is
  'One of mediaStandard.ts''s MediaShot.key values for the listing''s current asset_type, or null if not yet categorised. Cleared automatically when the listing''s asset_type changes; see clear_media_shot_keys_on_asset_type_change.';
comment on column public.listing_media.moderation_state is
  'unreviewed is the honest default: no review has happened, not an implicit approval. flagged and removed are the only states a real moderation action can produce.';
-- <<<<< 20260902b_pkg1b_media_categorization.sql

-- >>>>> 20260902c_pkg1b_media_content_fingerprint.sql  sha256=76925066af3ca56a6c5736f5abcfc5f44811708c37cdc73c4f6bc7b348f2cfc1
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

-- Codex review: the hash's own honesty (see the comment above: "never
-- selected into any client-facing response") is a read-side convention.
-- This is the write-side counterpart, enforced by the database: a
-- caller's own session ("authenticated") must never be able to set an
-- arbitrary content_sha256 directly, which would let it either forge a
-- false duplicate-collision against another lister's upload or falsify
-- its own file's recorded fingerprint. Written only through
-- getSupabaseServiceRole() (src/lib/supabase/serviceRole.ts), after the
-- upload route has already verified session and listing ownership with
-- the ordinary client, matching the real hash of the bytes actually
-- received.
--
-- A trigger, not a column-level REVOKE: 20260902b's own comment records
-- why a REVOKE was tried first and does not actually work (a pre-existing
-- table-level GRANT silently outranks it). current_user = 'service_role'
-- is the one role this trigger exempts, matching exactly how
-- getSupabaseServiceRole() connects.
create or replace function public.listing_media_protect_trusted_columns_c()
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
    if new.content_sha256 is not null then
      raise exception 'only a trusted server process may set content_sha256' using errcode = '42501';
    end if;
  elsif TG_OP = 'UPDATE' then
    if new.content_sha256 is distinct from old.content_sha256 then
      raise exception 'only a trusted server process may change content_sha256' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists listing_media_protect_trusted_columns_c on public.listing_media;
create trigger listing_media_protect_trusted_columns_c
  before insert or update on public.listing_media
  for each row
  execute function public.listing_media_protect_trusted_columns_c();
-- <<<<< 20260902c_pkg1b_media_content_fingerprint.sql

-- >>>>> 20260902d_pkg1b_media_derivation_integrity.sql  sha256=20a5b04ec577ffad77c1c4370a3c0843ebf0975796ddc85c9316f44424b5ef09
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
-- <<<<< 20260902d_pkg1b_media_derivation_integrity.sql

-- >>>>> 20260905_pkg1b_evidence_mark_invalidation.sql  sha256=4cbbe887346bc6b592d833afec4eb15a93bc494c1c797ca218918bb3a7330853
-- PKG-LISTING-CREATION-1B, outcome A follow-up. Evidence marks must not
-- survive an asset-type change with a meaning they were never given.
--
-- WHY THIS EXISTS.
--
-- 20260902b's own clear_media_shot_keys_on_asset_type_change trigger exists
-- because shot_key is asset-type-specific vocabulary (mediaStandard.ts), and
-- a photo silently keeping a label from a taxonomy that no longer applies is
-- a defect that trigger was written to prevent. listing_evidence_marks has
-- the identical exposure and, until this migration, no equivalent: a mark
-- is keyed on the same item_key vocabulary, several of which are reused
-- across asset types with different meanings ("frontage": retail's shopfront
-- vs. showroom's display glazing; "back_of_house": retail's stockroom vs.
-- hospitality's kitchens and stores; "room_typical": hospitality's guest key
-- vs. worker_housing's occupancy room). A lister who marks "frontage"
-- unavailable while the listing is retail, then changes the asset type to
-- showroom, must not have that mark silently read as an assertion about
-- showroom's own, different "frontage" shot.
--
-- WHY THIS IS NOT THE SAME FIX SHAPE AS shot_key's OWN TRIGGER.
--
-- shot_key's trigger clears the value in place with a plain UPDATE.
-- listing_evidence_marks is append-only by construction (20260902's own
-- header comment, enforced by RLS: no update policy and no delete policy
-- exist on this table at all), so a clearing UPDATE would violate the same
-- invariant that makes this table trustworthy as an audit trail. The fix
-- here is a third kind of event, appended, never a rewrite: a listing whose
-- asset type changes gets one invalidated_by_asset_change row for every
-- item that was, at that instant, still effectively marked unavailable.
-- "Effective" is read the same way every other consumer of this table
-- already reads it (guidedEvidence.ts's currentEvidenceMarks: the latest
-- row per item_kind/item_key wins), so this migration adds no second
-- definition of "current state" for a future reader to drift against.
--
-- WHY THIS IS SAFE UNDER A LATER REVERSION.
--
-- Invalidation is itself just another row. If the asset type later changes
-- back to the original type, the invalidated mark's row is still the
-- latest one for that item (nothing un-appends it), so it stays
-- ineffective; the trigger firing again on the reversion finds nothing
-- currently effective for that item to invalidate a second time. A lister
-- who wants the mark to apply again must make that assertion again, as a
-- new, real, dated row. History is never erased or rewritten either way:
-- every row this table has ever held stays exactly as written.
--
-- WHY THE ACTOR IS THE REAL CALLER, NOT A SYSTEM PSEUDO-IDENTITY.
--
-- The insert policy below (unchanged from 20260902) requires
-- actor_user_id = app_user_id() and actor_account_id = app_account_id() on
-- every row, with no exception for a system-authored one. This trigger
-- function is deliberately NOT security definer, so it runs with the
-- privileges and session context of whoever is actually updating the
-- listing's asset_type (its owner, or SAT), and it reads that same
-- app_user_id()/app_account_id() for the invalidation rows it writes. This
-- is not a workaround: the person changing the asset type is genuinely who
-- caused the invalidation, so attributing it to them is the honest answer,
-- not a forgery the insert policy happens to tolerate. A service-role
-- operation with no real app-level actor (there is none in this codebase
-- today) would correctly fail this insert rather than either fabricate an
-- actor or silently skip the invalidation; that failure is the same
-- guarantee this policy already gives every other write to this table.

alter table public.listing_evidence_marks drop constraint if exists listing_evidence_marks_action_check;
alter table public.listing_evidence_marks add constraint listing_evidence_marks_action_check
  check (action in ('marked_unavailable', 'cleared', 'invalidated_by_asset_change'));

alter table public.listing_evidence_marks drop constraint if exists listing_evidence_marks_reason_shape;
alter table public.listing_evidence_marks add constraint listing_evidence_marks_reason_shape check (
  (action = 'marked_unavailable' and reason is not null and length(btrim(reason)) >= 8)
  or (action = 'cleared' and reason is null)
  -- Carries a system-generated note (which asset types, in which direction)
  -- rather than null: the audit trail should be able to say why on its own,
  -- without a reader having to reconstruct the listing's own asset_type
  -- history from elsewhere, which this schema does not separately track.
  or (action = 'invalidated_by_asset_change' and reason is not null)
);

create or replace function public.invalidate_evidence_marks_on_asset_type_change()
returns trigger
language plpgsql
as $$
begin
  if new.asset_type is distinct from old.asset_type then
    insert into public.listing_evidence_marks
      (listing_id, item_kind, item_key, action, reason, actor_user_id, actor_account_id)
    select
      latest.listing_id, latest.item_kind, latest.item_key,
      'invalidated_by_asset_change',
      'asset type changed from ' || old.asset_type || ' to ' || new.asset_type,
      public.app_user_id(), public.app_account_id()
    from (
      select distinct on (item_kind, item_key)
        listing_id, item_kind, item_key, action
      from public.listing_evidence_marks
      where listing_id = new.id
      -- seq, not created_at: the real total order (see 20260902's own
      -- comment on the column). Two rows sharing a created_at value would
      -- make DISTINCT ON's choice of "latest" arbitrary under the old
      -- ordering; seq never ties.
      order by item_kind, item_key, seq desc
    ) as latest
    where latest.action = 'marked_unavailable';
  end if;
  return new;
end;
$$;

drop trigger if exists invalidate_evidence_marks_on_asset_type_change on public.listings;
create trigger invalidate_evidence_marks_on_asset_type_change
  after update of asset_type on public.listings
  for each row
  execute function public.invalidate_evidence_marks_on_asset_type_change();

comment on function public.invalidate_evidence_marks_on_asset_type_change() is
  'Appends an invalidated_by_asset_change row for every listing_evidence_marks item still effectively marked_unavailable at the moment a listing''s asset_type changes. Never updates or deletes an existing row: this table is append-only by policy (see 20260902), and this trigger only ever adds to it. Not security definer, deliberately: it writes as the real caller changing the asset type, subject to the same insert policy every other write to this table already is.';
-- <<<<< 20260905_pkg1b_evidence_mark_invalidation.sql

-- >>>>> 20260905b_pkg1b_media_cleanup_queue.sql  sha256=8c2dbd6fd745b3da307cbce440b99c220afc4f339c898e921ed2e5b5739ff6eb
-- PKG-LISTING-CREATION-1B, Codex review item 7: close the original-media
-- orphan and deletion failure modes.
--
-- WHY THIS EXISTS.
--
-- media/route.ts writes the derivative to storage, then the original to
-- storage, then the listing_media row; media/[mediaId]/route.ts's DELETE
-- deletes the row first, then removes both storage objects. Every one of
-- those storage/DB steps can fail independently of the others, and until
-- this migration the only response to that was a "best effort" cleanup
-- attempt wrapped in try/catch with the failure silently discarded.
--
-- Verified directly against this project's own vendored SDK source (not
-- assumed): @supabase/storage-js's StorageFileApi.remove() and
-- @supabase/postgrest-js's query builder both resolve to a normal
-- `{ data, error }` result for an ordinary API-level failure (a storage
-- bucket policy refusal, an RLS-denied delete, a constraint violation) and
-- only THROW for a lower-level failure (a network error, a timeout). A bare
-- try/catch with no check of the returned `.error` therefore misses exactly
-- the class of failure most likely in practice: the request reached the
-- server and was refused, not dropped. src/lib/mediaCleanup.ts's
-- bestEffortWithFallback() now checks both.
--
-- WHY A DURABLE QUEUE, NOT A TOMBSTONE STATE ON listing_media ITSELF.
--
-- Codex's own note offered "tombstone/pending-deletion state, then storage
-- removal, then DB finalization" as the preferred shape. That shape earns
-- its complexity when the row itself still has a reader that needs to see
-- the in-between state. Here it does not: this package's own read path
-- (getPublicListingMedia, src/lib/queries/publicMedia.ts) has no use for a
-- "pending delete" listing_media row, and neither does the owner's own
-- Studio view once the row is gone from the table the owner reads. Adding a
-- transient status value to a live inventory table, for a state nothing
-- ever reads, would be exactly the kind of half-finished machinery this
-- project's own house rules ask not to build. What this table is for
-- instead is the actual requirement underneath Codex's suggestion: a
-- durable, retryable record that survives past the failed request, so an
-- orphan is discoverable rather than silently lost. It plays that role
-- whether the failure was mid-upload (the row was never finalized, or never
-- created at all) or mid-delete (the row is already correctly gone).
--
-- WHAT "RESOLVED" MEANS, AND THE RETENTION WINDOW.
--
-- A row here is resolved (resolved_at set) once an operator has confirmed,
-- by hand, that the named storage_paths no longer exist (or never needed to:
-- see reason) — there is no automatic reconciliation job in this
-- environment to set it. docs/pkg-listing-creation-1b-migration-runbook.md
-- section 16 gives the exact reconciliation query and states the policy: an
-- unresolved entry older than 30 days is a real operational gap, not a
-- theoretical one, and should be investigated before that window closes,
-- not after.
--
-- WHO CAN READ OR WRITE THIS TABLE.
--
-- RLS is enabled with NO policies for any command, which is a complete
-- default-deny for authenticated/anon regardless of any table-level GRANT
-- they hold (RLS policy absence blocks at the row level independently of
-- table privileges; this is the same mechanism 20260902b/c/d's own
-- trusted-column triggers rely on being unable to bypass, applied here to
-- an entire table rather than a handful of columns). Only service_role
-- (BYPASSRLS) and genuine Postgres superusers can ever see or write a row.
-- This is deliberate: every row names real internal storage paths, which is
-- operational detail no owner or anonymous caller has a legitimate reason
-- to read, and no legitimate reason to ever insert into either (only the
-- server's own trusted upload/delete code paths do).
create table if not exists public.media_cleanup_queue (
  id bigint generated always as identity primary key,
  listing_id uuid not null,
  listing_media_id uuid,
  storage_paths text[] not null default '{}',
  reason text not null,
  queued_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by text
);

comment on table public.media_cleanup_queue is
  'Durable record of a storage/DB cleanup step that could not be confirmed to have succeeded (Codex review, item 7). Not a live-inventory table: nothing in the application reads this to decide what to show. service_role/superuser only; see this migration''s own header for the full reasoning and docs/pkg-listing-creation-1b-migration-runbook.md section 16 for the reconciliation procedure.';
comment on column public.media_cleanup_queue.listing_media_id is
  'Informational only, no foreign key: the referenced row may legitimately still exist (a failed row-delete) or already be gone (a failed storage-remove after a successful row-delete), and a queue insert must never fail merely because that row''s lifecycle is ambiguous at the moment of queuing.';
comment on column public.media_cleanup_queue.storage_paths is
  'May be empty: some reasons (e.g. a listing_media row that itself failed to delete) name no storage path at all.';

alter table public.media_cleanup_queue enable row level security;

create index if not exists media_cleanup_queue_unresolved_idx
  on public.media_cleanup_queue (queued_at)
  where resolved_at is null;
-- <<<<< 20260905b_pkg1b_media_cleanup_queue.sql

-- >>>>> 20260905c_pkg1b_media_url_photo_block.sql  sha256=eaed33c90522a9f6a62eba64af78e03c60bfaea582d0f62ec65b99d3fb65b545
-- PKG-LISTING-CREATION-1B, Codex review round 2, item 12 (Fable
-- threat-model review): close the external-URL bypass at the database, not
-- only at the application route.
--
-- WHY THIS EXISTS, ON TOP OF ITEM 8's OWN FIX.
--
-- Item 8 stopped api/listings/route.ts and api/listings/[id]/route.ts from
-- accepting a client-supplied photo URL and turning it into a
-- listing_media row with source='url'. That closes the ONE path this
-- codebase's own application code offered. It does not close the
-- underlying capability: the RLS insert/update policy on listing_media
-- (defined in the base schema this repository's local migrations have
-- never held, see docs/pkg-listing-creation-1b-migration-runbook.md
-- section 4.1) exists to let an owner manage their OWN listing's media,
-- and has no reason to inspect the SHAPE of what they write, only whose
-- listing it is. A lister with their own valid session JWT can call
-- PostgREST directly (POST .../rest/v1/listing_media with their own
-- Authorization header), bypassing every Next.js route entirely, and nothing
-- before this migration stopped them from inserting exactly the row shape
-- item 8 was written to prevent: kind='photo', source='url', path pointed
-- at an arbitrary third-party (or another lister's own private) URL. This
-- is the same "application-route validation is not a database boundary"
-- lesson 20260902b/c/d's own trusted-column triggers already exist to
-- teach, applied here to a payload SHAPE rule instead of to a column-write
-- privilege.
--
-- WHY NO service_role OR SUPERUSER EXEMPTION, UNLIKE THE TRUSTED-COLUMN
-- TRIGGERS.
--
-- Those triggers exempt service_role because the legitimate upload
-- pipeline itself, running as service_role, is SUPPOSED to be able to set
-- content_sha256/original_path/derived_*/moderation_state: the boundary is
-- about WHO may write them, not whether the value should ever exist. This
-- rule is different in kind: there is no legitimate first-party workflow,
-- for ANY role including service_role, that creates a NEW listing_media
-- row combining kind='photo' with source='url' any more (item 8 removed
-- the only one that existed). If a future package deliberately builds a
-- server-side, validated remote-ingestion pipeline (item 8's own
-- runbook section states what that would need: SSRF/redirect/DNS-rebinding
-- protection, content-type verification, size limits), it is exactly the
-- kind of considered, reviewed change that should also revisit this
-- trigger, not silently route around it through an exempted role.
--
-- WHY EXISTING (LEGACY) ROWS ARE UNTOUCHED.
--
-- The trigger only rejects a row TRANSITIONING INTO the forbidden shape:
-- on INSERT, any new row with kind='photo' AND source='url'; on UPDATE,
-- only when the new row has that shape AND the old row did not already
-- (checked with IS DISTINCT FROM, which is also true correctly). An
-- existing legacy source='url' photo row can still have its shot_key,
-- media_scope, media_condition, alt_en/ar, sort_order, or any other column
-- updated by the categorization route (api/listings/[id]/media/[mediaId]/route.ts)
-- exactly as before: such an update leaves kind and source unchanged, so
-- OLD and NEW agree on the shape and the condition below is false. This
-- migration changes what NEW rows may become, never what already exists.
create or replace function public.listing_media_block_new_url_photos()
returns trigger
language plpgsql
as $$
begin
  if new.kind = 'photo' and new.source = 'url' then
    if TG_OP = 'INSERT' or old.kind is distinct from 'photo' or old.source is distinct from 'url' then
      raise exception 'New photo evidence must be uploaded, not attached by external URL.'
        using errcode = '23514'; -- check_violation: a payload-shape rule, not a privilege rule
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists listing_media_block_new_url_photos on public.listing_media;
create trigger listing_media_block_new_url_photos
  before insert or update on public.listing_media
  for each row
  execute function public.listing_media_block_new_url_photos();

comment on function public.listing_media_block_new_url_photos() is
  'Codex review round 2, item 12: rejects (23514) any INSERT or genuine transition-into of kind=photo + source=url on listing_media, for every role, no exemption. Closes the direct-PostgREST bypass of item 8''s own application-route fix. Existing legacy source=url photo rows are unaffected: only a row newly acquiring this exact shape is rejected, never an unrelated update to a row that already had it.';
-- <<<<< 20260905c_pkg1b_media_url_photo_block.sql

-- >>>>> 20260912_pkg1b_sensitive_media_column_grants.sql  sha256=d70a7c5230b81774713e99e44bdf87698344907b618fe150a5faab6ecbb08430
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
-- <<<<< 20260912_pkg1b_sensitive_media_column_grants.sql

-- >>>>> 20260912b_pkg1b_media_trusted_object_binding.sql  sha256=e721531f4619a016daddcdc9ec78fc042357ca6ab950dbf592d167ce42dc27e0
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
--
-- CORRECTION, SEVENTH ADVERSARIAL REVIEW (two passes: the first attempt,
-- below, was itself wrong, caught by actually running the harness
-- rather than by reasoning alone; see the second correction further
-- down): `current_user` is the WRONG primitive for THIS trigger's own
-- exemption as it originally stood, and the bug is real, not
-- theoretical. `apply_verified_media_provenance()` is SECURITY DEFINER:
-- its own UPDATE (which fires THIS trigger) executes with the IDENTITY
-- OF THE FUNCTION'S OWNER, not the calling role, for as long as
-- execution stays inside that function. Real production evidence
-- (checked directly this round, project-scoped read-only connector):
-- every function this project's own migrations create, without
-- exception, is owned by `postgres`, and `postgres` has `rolsuper =
-- false` in this project (confirmed against pg_roles; only the separate,
-- more restricted `supabase_admin` role is a true superuser here). So
-- once this migration is applied for real and `apply_verified_media_
-- provenance()` is owned by `postgres` (the normal CLI/dashboard
-- migration-runner identity), `current_user` INSIDE this trigger, fired
-- from THAT function's own UPDATE, would be `postgres`, NOT
-- `service_role`, and `postgres`'s own `rolsuper` is false: NEITHER half
-- of the ORIGINAL exemption would match, this trigger would raise its
-- own 42501 exception, and the function's own legitimate grant would
-- fail, every single time, in real production. Reproduced for real (not
-- merely reasoned) in the isolated harness: a `NOSUPERUSER` role
-- modelling the real `postgres` owner, granted ONLY the privileges its
-- own function body needs, made `apply_verified_media_provenance`'s
-- OWNER via `alter function ... owner to`, then called as service_role:
-- confirmed to fail with exactly this trigger's own exception before any
-- fix.
--
-- FIRST ATTEMPTED FIX (WRONG, caught by the isolated harness itself, not
-- by inspection): `session_user` instead of `current_user`. This is
-- correct in the abstract (SECURITY DEFINER changes `current_user`, never
-- `session_user`) but wrong for THIS platform specifically: checked
-- directly against real production (`pg_roles`/`pg_auth_members`), a
-- real PostgREST/Supabase connection authenticates as a SINGLE login
-- role, `authenticator`, which holds MEMBERSHIP in anon/authenticated/
-- service_role (all three themselves NOLOGIN) and reaches each one via
-- an ordinary `SET ROLE` per request. `session_user` for EVERY such
-- connection, regardless of which effective role a given request
-- represents, is therefore ALWAYS `authenticator`; `session_user =
-- 'service_role'` would never be true for a real service_role RPC call
-- either. The isolated harness's own `asServiceRole`/`asTestRole`/
-- `asAnonRole` helpers model the identical SET-ROLE-on-a-shared-
-- connection pattern (all `pg.getPgClient()` connections authenticate as
-- this harness's own bootstrapping identity, then `SET ROLE`), which is
-- exactly why the harness's own freeze-trigger regression tests caught
-- this attempt failing immediately: `session_user` there is ALWAYS the
-- harness's own superuser bootstrapping role, so the OLD `rolsuper`
-- half of a session_user-based check would incorrectly exempt EVERY
-- simulated role, not just the intended ones, defeating the trigger
-- entirely, the opposite failure from the one being fixed.
--
-- THE ACTUAL FIX: keep `current_user`, and add an explicit, DYNAMIC
-- check for the real, current owner of `apply_verified_media_provenance`
-- specifically (via `pg_proc`/`pg_get_userbyid`, not a hardcoded role
-- name, so this stays correct if that function is ever reassigned, e.g.
-- across Step 9's own rollback/reapply, which resets ownership to
-- whoever recreates it). This is safe, not a broadened exemption:
-- confirmed directly against real production that NONE of anon,
-- authenticated, service_role, or authenticator hold membership in
-- `postgres` (`pg_has_role(..., 'postgres', 'member')` is false for all
-- four), so no ordinary caller can ever cause `current_user` to become
-- that function's own owner by any means except genuinely executing
-- inside a SECURITY DEFINER function owned by it, which is exactly, and
-- only, the trust this exemption is meant to extend.
create or replace function public.listing_media_protect_legacy_flag()
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
--
-- CORRECTION, SEVENTH ADVERSARIAL REVIEW: the same dynamic function-owner
-- check as `listing_media_protect_legacy_flag()` above, for the identical
-- reason (this exact function does not currently get invoked from inside
-- a SECURITY DEFINER function's own UPDATE, since apply_verified_media_
-- provenance never changes path/source/listing_id, but the exemption is
-- written the same way on purpose: the bug class is about the CHECK, not
-- about whether today's one caller happens to avoid it, and a future
-- SECURITY DEFINER caller needing to touch these columns would hit the
-- exact same failure otherwise). `session_user` was tried and rejected
-- for this trigger too, for the same reason: real Supabase connections
-- all authenticate as `authenticator` regardless of effective role, so
-- session_user never equals service_role for a genuine RPC call either.
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
-- <<<<< 20260912b_pkg1b_media_trusted_object_binding.sql

-- >>>>> 20260912c_pkg1b_storage_originals_read_boundary.sql  sha256=3a91052617f5edee7764976d1a8b17b1e42f3dea400cda37577cc6936ab8dc7c
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
-- <<<<< 20260912c_pkg1b_storage_originals_read_boundary.sql

-- >>>>> 20260912d_pkg1b_media_row_visibility_boundary.sql  sha256=2c12c803cf9e15406a5aa6ab7e32716aa82cc4eaef29100d6e69928c93a363d1
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
-- <<<<< 20260912d_pkg1b_media_row_visibility_boundary.sql

-- >>>>> 20260912e_pkg1b_media_upload_contract_fence.sql  sha256=a1fe786293c29e40e45a72d77b9a381ddcdba6b63e5d5bf242c4c565cafe5ca9
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
-- <<<<< 20260912e_pkg1b_media_upload_contract_fence.sql
$pkg1b_rollout_sql$;
  select jsonb_build_object(
    'new_tables', (select count(*) from information_schema.tables where table_schema='public' and table_name in ('listing_evidence_marks','media_cleanup_queue')),
    'expected_12_new_cols', (select count(*) from information_schema.columns where table_schema='public' and table_name='listing_media' and column_name in ('shot_key','media_scope','media_condition','rights_acknowledged_by','rights_acknowledged_at','visibility','moderation_state','content_sha256','original_path','derived_transforms','derived_by','derived_at')),
    'is_cover_cols', (select count(*) from information_schema.columns where table_schema='public' and table_name='listing_media' and column_name='is_cover'),
    'fence_col', (select count(*) from information_schema.columns where table_schema='public' and table_name='listing_media' and column_name='upload_contract_version'),
    'listing_media_columns', (select count(*) from information_schema.columns where table_schema='public' and table_name='listing_media'),
    'listing_media_policies', (select count(*) from pg_policies where schemaname='public' and tablename='listing_media'),
    'storage_object_policies', (select count(*) from pg_policies where schemaname='storage' and tablename='objects'),
    'listing_media_triggers', (select count(*) from pg_trigger t where t.tgrelid='public.listing_media'::regclass and not t.tgisinternal),
    'media_rows', (select count(*) from public.listing_media),
    'listings', (select count(*) from public.listings)
  ) into j;
  raise exception 'PREFLIGHT_REACHED_END_AND_ROLLED_BACK %', j::text;
end
$pkg1b_rollout_outer$;
