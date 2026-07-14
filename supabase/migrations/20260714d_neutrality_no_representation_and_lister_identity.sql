-- 2026-07-14. PR-BF. Applied to production via the Supabase MCP; recorded here because the
-- repo is the source of truth for schema (PR-T).
--
-- OWNER DECISION: SAT MARKETS DOES NOT ACT FOR ANYONE.
--
-- Every listing used to carry a second button beside "Contact the lister": "Request SAT
-- representation". On a platform whose entire proposition is neutrality, that button sat on
-- a BROKER'S OWN LISTING and offered the visitor a different agent: the platform's. A broker
-- reading it sees the referee holding out a shirt. You cannot run the market and compete in it.
--
-- The model is removed. Enquiries are one thing now: you contact the lister, directly.
-- Zero real users ever chose representation (16 rows, all demo), so nothing is lost.
--
-- The 'representation' value STAYS in the leads.path enum. History is not ours to rewrite.
-- But nothing new can be created with it: /api/leads refuses it, and so does this policy, so
-- someone calling PostgREST directly cannot make one either. Never enforce a rule in one
-- place only: the route can be bypassed, the policy cannot.
drop policy if exists "public may create a lead" on public.leads;

create policy "public may create a lead"
  on public.leads for insert to anon, authenticated
  with check (
    status = 'new'::lead_status
    and path = 'direct_contact'::lead_path   -- one path, and it is not to us
    and (
      (listing_id is null and brief_id is null)
      or exists (select 1 from public.listings l where l.id = leads.listing_id)
    )
  );

-- WHO IS LISTING THIS? Until now, nobody could tell.
--
-- `accounts` is invisible to the public (0 rows for anon, correctly: it holds commercial
-- registration numbers, legal names, verification records). The side effect was that every
-- listing on the exchange was ANONYMOUS. A tenant could not see who they were dealing with,
-- and, the part that matters here, a BROKER COULD NOT TELL WHICH LISTINGS BELONGED TO THE
-- COMPANY THAT RUNS THE PLATFORM.
--
-- You cannot ask people to trust a neutral exchange while hiding which stock is the
-- operator's. Neutrality you cannot check is just a claim.
--
-- This view exposes the MINIMUM a lister must show publicly and not one column more: name,
-- owner or licensed broker, verified or not, and whether they are us. No CR number, no legal
-- name, no contact details, no documents. It is restricted to accounts that ALREADY have a
-- published listing, so it cannot be used to enumerate everyone who has ever signed up.
--
-- is_operator is the DISCLOSURE. SAT Real Estate is a licensed brokerage AND it runs this
-- exchange; both are true and both are now shown, side by side, on its listings. It confers
-- nothing: SAT's listings sit in the same ranking, clear the same publish gate, need the same
-- advertising licence, and get no badge or placement another broker cannot earn. The only
-- thing SAT had at launch was a head start on paperwork -- already verified, already licensed,
-- so it could list on day one while other brokers were still signing up.
--
-- First in the queue, not first in the ranking.
create or replace view public.listers_public as
select
  a.id,
  a.name_en,
  a.name_ar,
  -- the operator's account type is 'sat' for permissions. On a listing it is a brokerage
  -- like any other, so that is how it is described.
  case when a.type::text = 'sat' then 'broker' else a.type::text end as lister_type,
  (a.type::text = 'sat')                                             as is_operator,
  (a.verification_status::text = 'verified')                         as is_verified,
  a.is_demo
from public.accounts a
where exists (
  select 1 from public.listings l
  where l.account_id = a.id and l.status = 'published'::listing_status
);

grant select on public.listers_public to anon, authenticated;

-- Probed as anon:
--   representation lead, direct insert  -> BLOCKED
--   direct_contact lead, direct insert  -> ALLOWED
--   listers_public                      -> SAT Real Estate / broker / is_operator=true,
--                                          listed among 8 other verified listers
