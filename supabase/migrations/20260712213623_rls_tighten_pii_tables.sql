-- SM-P0-008: lock down PII tables that were world-readable / world-writable.
-- Before this, leads / requirement_interests / tenant_briefs all had a policy of
-- SELECT USING (true), which - because the anon key ships in the browser bundle -
-- meant anyone could read every lead name/email/phone/message, every brief, and
-- every respondent identity straight from the REST endpoint. The five INSERT
-- policies of WITH CHECK (true) similarly let anyone write past the hardened API.
--
-- Idempotent: drops both the legacy AND the new policy names before creating,
-- so it re-applies cleanly. Deletes no data.

-- 1. leads: the listing's owner, or SAT. Never the public.
drop policy if exists "leads_read_demo"           on public.leads;
drop policy if exists "public submit leads"        on public.leads;
drop policy if exists "sat read unattached leads"  on public.leads;
create policy "sat read unattached leads" on public.leads
  for select using (listing_id is null and app_is_sat());

-- 2. requirement_interests: only the brief owner and SAT see who responded.
drop policy if exists "ri_select_public"       on public.requirement_interests;
drop policy if exists "ri_insert_public"       on public.requirement_interests;
drop policy if exists "ri_select_brief_owner"  on public.requirement_interests;
create policy "ri_select_brief_owner" on public.requirement_interests
  for select using (
    app_is_sat()
    or account_id = app_account_id()
    or exists (
      select 1 from public.tenant_briefs b
      where b.id = requirement_interests.brief_id
        and b.created_by = app_user_id()
    )
  );

-- 3. tenant_briefs: the author and SAT. Not the world.
drop policy if exists "briefs_read_demo"     on public.tenant_briefs;
drop policy if exists "public submit briefs" on public.tenant_briefs;

-- 4. market_watches: no anon INSERT; the API writes with the service role.
drop policy if exists "mw_insert_public" on public.market_watches;

-- 5. signup_requests: stays open to unauthenticated users, but shape-constrained;
--    status defaults to 'new' and WITH CHECK runs AFTER defaults, so pin 'new'.
drop policy if exists "public submit signup requests" on public.signup_requests;
create policy "public submit signup requests" on public.signup_requests
  for insert with check (
    email is not null
    and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]{2,}$'
    and length(email) <= 200
    and length(coalesce(full_name, '')) between 2 and 120
    and coalesce(status, 'new') = 'new'
  );
drop policy if exists "sat read signup requests" on public.signup_requests;
create policy "sat read signup requests" on public.signup_requests
  for select using (app_is_sat());

-- 6. RLS enabled on all five.
alter table public.leads                 enable row level security;
alter table public.requirement_interests enable row level security;
alter table public.tenant_briefs         enable row level security;
alter table public.market_watches        enable row level security;
alter table public.signup_requests       enable row level security;
