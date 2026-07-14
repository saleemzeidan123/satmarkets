-- 2026-07-14. PR-BA + PR-BB + PR-BC. Applied to production via the Supabase MCP;
-- recorded here because the repo is the source of truth for schema (PR-T).
--
-- ROOT CAUSE
-- ==========
-- 20260712213623_rls_tighten_pii_tables.sql (SM-P0-008) was a real and necessary fix:
-- leads, tenant_briefs and requirement_interests were world-READABLE, so anyone holding
-- the anon key (which ships in the browser bundle) could read every lead's name, email,
-- phone and message. That had to stop, and it did.
--
-- But it dropped FIVE public INSERT policies and recreated exactly ONE:
--
--   drop policy "public submit leads"            -- no replacement  -> leads dead
--   drop policy "public submit briefs"           -- no replacement  -> briefs dead
--   drop policy "ri_insert_public"               -- no replacement  -> interests dead
--   drop policy "mw_insert_public"               -- no replacement  -> watches dead
--   drop policy "public submit signup requests"  -- RECREATED       -> signup lived
--
-- Which is exactly why signup was the only public write that worked. Locking the door
-- against reading also locked it against writing. Nothing failed loudly: the forms
-- returned 500s to strangers, while every row in those tables had been put there by the
-- service-role seeder, so the demo looked healthy the whole time.
--
-- A table whose only writer is a privileged script is a table whose real write path is
-- untested. Had the seeder been forbidden the service key from the start, SM-P0-008
-- would have broken the build the day it landed.
--
-- Every policy below is WRITE-ONLY for the public: you may put a thing in, you may not
-- take other people's things out. The SELECT tightening from SM-P0-008 survives intact.

-- 1. leads. "Contact the lister": the conversion action of the entire product.
create policy "public may create a lead"
  on public.leads for insert to anon, authenticated
  with check (
    status = 'new'::lead_status
    and (
      (listing_id is null and brief_id is null)
      -- the subquery runs under RLS as the CALLER, so an anonymous visitor can only
      -- enquire about a listing that is published AND carries an unexpired advertising
      -- licence. The compliance guarantee reaches the write path for free.
      or exists (select 1 from public.listings l where l.id = leads.listing_id)
    )
  );

-- 2. tenant_briefs. An occupier telling the market what they need.
create policy "public may post a requirement"
  on public.tenant_briefs for insert to anon, authenticated
  with check (status = 'open');

-- 3. requirement_interests. An owner or broker answering that brief. The policy
--    re-states the route's rule AT THE DATABASE: you may only register interest AS
--    YOURSELF, and only against an open brief.
create policy "owner or broker registers their own interest"
  on public.requirement_interests for insert to authenticated
  with check (
    account_id = app_account_id()
    and user_id = app_user_id()
    and exists (
      select 1 from public.tenant_briefs b
      where b.id = requirement_interests.brief_id and b.status = 'open'
    )
  );

-- 4. market_watches. Write-only: a watch carries a contact_email, so it is PII.
create policy "public may create a market watch"
  on public.market_watches for insert to anon, authenticated
  with check (true);

-- 5. create_requirement() becomes SECURITY DEFINER.
--
--    A WRITE-ONLY TABLE AND A `RETURNING` CLAUSE CANNOT COEXIST. The function ended in
--        returning tenant_briefs.id, tenant_briefs.ref_code into new_id, new_ref;
--    RETURNING requires SELECT; tenant_briefs has no SELECT policy for the public, by
--    design; and Postgres reports that refusal as "new row violates row-level security
--    policy", which points at the WITH CHECK and sends you to fix the wrong thing. The
--    identical INSERT succeeds the moment RETURNING is removed. This is the same trap as
--    `.select()` after an insert in a Supabase call (see /api/leads), in a second
--    language.
--
--    SECURITY DEFINER is safe here precisely because the function is narrow: it maps a
--    fixed list of fields and hardcodes status to 'open'. There is no column to smuggle.
--    search_path is pinned, or an attacker able to create objects in an earlier schema
--    could shadow a table this function writes to and have it run as the owner.
create or replace function public.create_requirement(payload jsonb)
returns table(id uuid, ref_code text)
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  new_id uuid;
  new_ref text;
begin
  insert into public.tenant_briefs (
    title, asset_type, deal_type, district_id, city,
    size_min_sqm, size_max_sqm, budget_sqm_max, timeline,
    must_haves, notes, contact_name, contact_email, contact_phone, status
  )
  values (
    payload->>'title',
    (payload->>'asset_type')::public.asset_type,
    (payload->>'deal_type')::public.deal_type,
    nullif(payload->>'district_id','')::uuid,
    coalesce(nullif(payload->>'city',''), 'Riyadh'),
    nullif(payload->>'size_min_sqm','')::numeric,
    nullif(payload->>'size_max_sqm','')::numeric,
    nullif(payload->>'budget_sqm_max','')::numeric,
    nullif(payload->>'timeline',''),
    coalesce((select array_agg(value::text) from jsonb_array_elements_text(payload->'must_haves')), '{}'::text[]),
    nullif(payload->>'notes',''),
    nullif(payload->>'contact_name',''),
    nullif(payload->>'contact_email',''),
    nullif(payload->>'contact_phone',''),
    'open'   -- not the caller's to choose. A brief arrives open; the market closes it.
  )
  returning tenant_briefs.id, tenant_briefs.ref_code into new_id, new_ref;

  insert into public.requirement_notifications (brief_id, audience)
  select new_id, a from unnest(array['broker','landlord','sat']) as a;

  return query select new_id, new_ref;
end;
$function$;
