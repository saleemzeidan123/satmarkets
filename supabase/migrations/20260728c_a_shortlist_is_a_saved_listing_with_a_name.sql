-- 2026-07-28. ADV-2D. Applied to production via the Supabase MCP; recorded here because
-- the repo is the source of truth for schema (PR-T).
--
-- THE SHORTLIST ALREADY EXISTED, IN THE WRONG PLACE.
--
-- /[locale]/saved lets an occupier file a saved space into a named folder, and it writes
-- that folder map to localStorage under "satm_saved_folders". The page says so on its own
-- face: it prints a note that folders are device-local. That is the embryonic shortlist,
-- and it has the two defects a shortlist cannot have. It does not follow the person to a
-- second device, and it is not readable by the server, so nothing can be built FROM it:
-- not a decision pack, not a comparison, not a viewing request covering three candidates.
--
-- The saved list itself was moved to the account already (saved_listings, one row per
-- user and listing, RLS "user manages own saved listings" scoping every command to
-- user_id = app_user_id()). The grouping was left behind in the browser. So this is not a
-- new table and not a new concept. It is the name catching up with the row it belongs to.
--
-- One nullable column. Null means saved but not filed, which is the ordinary case and
-- stays the default: a person who never names a shortlist is not made to.
alter table public.saved_listings
  add column if not exists shortlist text;

comment on column public.saved_listings.shortlist is
  'Optional occupier-chosen shortlist name. Null means saved but unfiled. Replaces the device-local satm_saved_folders map.';

-- A name, not a document. Trimmed length between 1 and 60 rules out both the empty string
-- pretending to be a name (use null for that) and a name long enough to be a note.
alter table public.saved_listings
  add constraint saved_listings_shortlist_len
  check (shortlist is null or (length(btrim(shortlist)) between 1 and 60));

-- The read this supports is "every space on this shortlist", always within one user.
create index if not exists saved_listings_user_shortlist_idx
  on public.saved_listings (user_id, shortlist);

-- No new policy. The existing ALL policy is user_id = app_user_id() for both using and
-- with check, so a name may only be written on a row the writer already owns, and a
-- shortlist cannot be read across users. Nothing about the column changes that reach.
