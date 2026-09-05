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
  constraint listing_evidence_marks_reason_shape check (
    (action = 'marked_unavailable' and reason is not null and length(btrim(reason)) >= 8)
    or (action = 'cleared' and reason is null)
  )
);

-- The query every reader of "current state" actually runs: latest row per
-- item. DESC on created_at so a caller can `distinct on (listing_id,
-- item_kind, item_key) ... order by ... created_at desc` straight off this
-- index.
create index if not exists listing_evidence_marks_current_idx
  on public.listing_evidence_marks (listing_id, item_kind, item_key, created_at desc);

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
  'Append-only ledger of "marked unavailable, here is why" and its clearing, per listing item. Current state for one item is its latest row. Never updated or deleted. Marking an item unavailable is not, and must never be read as, satisfying a publication requirement.';
