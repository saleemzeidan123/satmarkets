-- P0-6. Every listing wears a "VERIFIED OWNER" badge and /neutrality promises that
-- badge "comes from an authoritative record match or a human reviewer". There was no
-- write path through which any reviewer could ever have acted, and no record of who
-- decided what. A verification with no evidence and no actor is not a verification.
--
-- This is the append-only ledger behind the badge. One row per decision.
--
-- Verified behaviour (impersonation tests, 2026-07-13):
--   SAT appends as self ............ ALLOWED
--   owner verifies themselves ...... BLOCKED (rls)
--   SAT forges the actor ........... BLOCKED (rls)
--   decision with no stated basis .. BLOCKED (check)
--   SAT rewrites the ledger ........ 0 rows affected
--   SAT erases the ledger .......... 0 rows affected

create table if not exists public.verification_events (
  id            uuid primary key default gen_random_uuid(),
  account_id    uuid not null references public.accounts(id) on delete cascade,
  from_status   public.verification_status not null,
  to_status     public.verification_status not null,
  actor_user_id uuid references public.users(id),
  actor_email   text,
  basis         text not null check (length(btrim(basis)) >= 8),
  created_at    timestamptz not null default now()
);

create index if not exists verification_events_account_idx
  on public.verification_events(account_id, created_at desc);

alter table public.verification_events enable row level security;

drop policy if exists "sat reads verification events" on public.verification_events;
create policy "sat reads verification events"
  on public.verification_events for select
  using (public.app_is_sat());

-- Only SAT, and only as themselves: the actor cannot be forged.
drop policy if exists "sat appends verification events" on public.verification_events;
create policy "sat appends verification events"
  on public.verification_events for insert
  with check (public.app_is_sat() and actor_user_id = public.app_user_id());

-- Append-only by omission: no UPDATE policy and no DELETE policy exist, so with RLS
-- on, the ledger cannot be rewritten or erased even by SAT.

comment on table public.verification_events is
  'Append-only audit trail behind the verified-owner badge. Written only by SAT, only as themselves, never updated or deleted. Every badge traces to an actor, a time, and a stated basis.';
