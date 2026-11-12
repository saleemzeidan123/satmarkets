-- public.map_anchors: reference points (metro stations, airports) read by the public listing page.
--
-- WHY THIS EXISTS.
-- The table had row level security disabled and carried effective INSERT, UPDATE, DELETE and
-- TRUNCATE grants for anon and authenticated, so any visitor holding the public key could rewrite
-- or empty it. Reported in the PKG-LISTING-CREATION-1B description; fixed directly in production on
-- 2026-11-12 by the statements below. This file records that change and is safe to run again.
--
-- The application only ever reads this table (src/app/[locale]/listings/[id]/page.tsx), so a public
-- read policy plus the removal of the write grants changes nothing a reader can see.

alter table public.map_anchors enable row level security;

drop policy if exists map_anchors_public_read on public.map_anchors;
create policy map_anchors_public_read on public.map_anchors
  for select to anon, authenticated using (true);

revoke insert, update, delete, truncate
  on public.map_anchors from anon, authenticated;
