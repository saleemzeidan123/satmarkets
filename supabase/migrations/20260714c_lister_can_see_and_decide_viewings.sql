-- 2026-07-14. PR-BE. Applied to production via the Supabase MCP; recorded here because
-- the repo is the source of truth for schema (PR-T).
--
-- A TENANT BOOKS A VIEWING ON YOUR BUILDING AND YOU CANNOT SEE IT.
--
-- viewings had exactly two policies:
--   "public request viewings"  INSERT  with check (status = 'requested')   -- anyone may ask
--   "sat all viewings"         ALL     using (app_is_sat())                -- only SAT may look
--
-- No SELECT policy for the owner of the listing. So the request landed in the table, the
-- visitor was told it had been sent, and the one person who had to act on it never learned
-- it existed. The only surface that displayed viewings was /verify/viewings: SAT-only,
-- linked from nowhere, and gated by a `?key=` in the QUERY STRING -- a credential in a URL,
-- which ends up in server logs and Referer headers.
--
-- That is a broken feature, and on this platform it is also a neutrality problem. SAT runs
-- a licensed brokerage of its own, and was the ONLY party who could see which tenants
-- wanted to view which buildings. /neutrality commitment 03 exists to forbid precisely that
-- kind of operator-only data advantage.
--
-- The lister now sees viewings on their own listings and decides them. SAT keeps its access
-- for moderation; it is simply no longer the only one with eyes.

-- 1. See them.
create policy "lister reads viewings on own listings"
  on public.viewings for select to authenticated
  using (
    exists (select 1 from public.listings l
            where l.id = viewings.listing_id and l.account_id = app_account_id())
  );

-- 2. Decide them.
--
-- USING says which rows you may touch: only viewings on a listing you own.
-- WITH CHECK says what the row may BECOME.
--
-- Note the vocabulary. viewing_status is: requested, confirmed, completed, no_show,
-- cancelled. There is no 'declined' -- a refusal IS a cancellation. A lister may move a
-- viewing to confirmed, cancelled, completed or no_show, and may NOT walk it backwards to
-- 'requested', because a status you can rewind is a status that can lie about what happened.
create policy "lister decides viewings on own listings"
  on public.viewings for update to authenticated
  using (
    exists (select 1 from public.listings l
            where l.id = viewings.listing_id and l.account_id = app_account_id())
  )
  with check (
    status in ('confirmed'::viewing_status, 'cancelled'::viewing_status,
               'completed'::viewing_status, 'no_show'::viewing_status)
    and exists (select 1 from public.listings l
                where l.id = viewings.listing_id and l.account_id = app_account_id())
  );

-- Probed under impersonation, all five:
--   Faisal SEES viewings on HIS listing        -> 1 row   (want 1)
--   Faisal sees NOURA's viewing                -> 0 rows  (want 0)
--   Faisal CONFIRMS on his own listing         -> ALLOWED
--   Faisal confirms NOURA's viewing            -> BLOCKED (0 rows)
--   Faisal REWINDS a viewing to 'requested'    -> BLOCKED
