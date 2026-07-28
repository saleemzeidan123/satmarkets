-- 2026-07-28. ADV-2D. Applied to production via the Supabase MCP; recorded here because
-- the repo is the source of truth for schema (PR-T).
--
-- YOU BOOK A VIEWING AND THEN IT DISAPPEARS.
--
-- 20260714c gave the lister eyes on viewings against their own listings, which fixed the
-- half of the workflow where a request landed in a table nobody could act on. It did not
-- fix the other half. After that migration viewings had four policies:
--
--   "public request viewings"                 INSERT  with check (status = 'requested')
--   "lister reads viewings on own listings"    SELECT  using (listing belongs to my account)
--   "lister decides viewings on own listings"  UPDATE  using (listing belongs to my account)
--   "sat all viewings"                         ALL     using (app_is_sat())
--
-- Nothing there is addressed to the person who booked. A signed-in occupier asks to see a
-- warehouse on Thursday, the lister confirms it or cancels it, and the requester is never
-- told either way and cannot look it up. The status column records an outcome that the one
-- party waiting on it has no route to.
--
-- The column to hang that on already existed. viewings.requested_by references users(id)
-- and has been nullable and unwritten since the table was created: /api/viewings never
-- stamped it, so even a signed-in booking filed itself anonymously. Two changes here, and
-- a third in the route.
--
-- 1. A person may read the viewing they booked.
--
-- Anonymous bookings stay anonymous. requested_by is null on those rows and app_user_id()
-- is null for an anonymous caller, and `null = null` is null rather than true in SQL, so
-- the null-guard is not decoration: without it every anonymous row would be readable by
-- every other anonymous caller.
create policy "requester reads own viewings"
  on public.viewings for select to authenticated
  using (requested_by is not null and requested_by = app_user_id());

-- 2. A booking may not be filed in somebody else's name.
--
-- The insert policy is deliberately open, because asking to view a space is a public act
-- and requiring an account to ask would empty the funnel. But an open INSERT plus a new
-- ownership-carrying column is an invitation: the publishable key is public, so a caller
-- could post straight at PostgREST with somebody else's user id in requested_by and plant
-- a viewing in their list. The check now says a row may be filed anonymously, or in your
-- own name, and in no other name.
--
-- ALTER rather than DROP and CREATE on purpose. Dropping it would leave a window, however
-- short, in which no INSERT policy exists and every public booking on the live site fails.
alter policy "public request viewings"
  on public.viewings
  with check (
    status = 'requested'::viewing_status
    and (requested_by is null or requested_by = app_user_id())
  );

-- The route is the third change: /api/viewings now stamps requested_by from the session
-- when the booker is signed in, and leaves it null when they are not. Nothing about the
-- anonymous path changes, and no existing row is backfilled: a viewing that was booked
-- without an identity does not acquire one retrospectively.
