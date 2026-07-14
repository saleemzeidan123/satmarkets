-- 2026-07-14. PR-BD. Applied to production via the Supabase MCP; recorded here because
-- the repo is the source of truth for schema (PR-T).
--
-- The policy I wrote in the previous migration fell into the very trap that migration is
-- about, which is worth writing down rather than quietly correcting.
--
-- "owner or broker registers their own interest" had this in its WITH CHECK:
--
--     exists (select 1 from public.tenant_briefs b
--             where b.id = requirement_interests.brief_id and b.status = 'open')
--
-- A subquery inside a policy runs under RLS AS THE CALLER. tenant_briefs is write-only
-- for the public, so an owner or broker responding to a brief cannot SELECT it: they see
-- briefs through the requirements_public view, not through the table. The EXISTS was
-- therefore always false, the WITH CHECK always failed, and every legitimate response
-- was refused -- while the impersonation attempt was, correctly, also refused.
--
-- Which is precisely why you probe the ALLOWED case as well as the blocked one. A policy
-- that refuses everything is indistinguishable from a policy that is working.
--
-- The identical construct in "public may create a lead" is correct, because there the
-- referenced table (listings) IS readable by the caller, and we WANT it evaluated under
-- RLS: that is what stops an anonymous visitor lodging an enquiry against an unpublished
-- listing or one whose advertising licence has lapsed. Same construct, opposite need.
-- The question is always: can the caller read the table I am referencing?
--
-- Here the answer is no and must stay no, so the check moves into a SECURITY DEFINER
-- helper that can see the brief without granting the responder any power to read it.
create or replace function public.brief_is_open(p_brief uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.tenant_briefs b
    where b.id = p_brief and b.status = 'open'
  );
$$;

revoke all on function public.brief_is_open(uuid) from public;
grant execute on function public.brief_is_open(uuid) to authenticated, anon, service_role;

drop policy if exists "owner or broker registers their own interest" on public.requirement_interests;

create policy "owner or broker registers their own interest"
  on public.requirement_interests
  for insert
  to authenticated
  with check (
    account_id = app_account_id()
    and user_id = app_user_id()
    and public.brief_is_open(brief_id)
  );

-- Probed under impersonation, all three:
--   Faisal responds AS HIMSELF to an OPEN brief   -> ALLOWED
--   Faisal posts AS DOSSARY BROKERAGE             -> BLOCKED
--   Faisal responds to a CLOSED brief             -> BLOCKED
