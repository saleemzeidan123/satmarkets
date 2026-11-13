-- 2026-11-13e. PKG-DATA-1. PREPARED, NOT APPLIED. An owner decision, not a fix.
--
-- WHAT IT DOES. Lets the public site read public.source_registry, the table of
-- recorded data rights, and takes away the write grants the public roles hold
-- on it.
--
-- WHY IT IS NEEDED. Row level security is on for this table and it has no
-- policy, so the public roles read zero rows (checked on production,
-- 2026-11-13: nine rows in the table, none visible to the site). That is
-- finding 88's state. Every rights check on a public page therefore denies,
-- and it would go on denying after 20261113d registers the open data source:
-- the leasing activity section on /market would never be drawn. /sources says
-- so itself today: "The register returned no rows to this page".
--
-- WHAT ELSE CHANGES WHEN IT RUNS. This is why it is a decision.
--   /sources          lists the register, row by row, as the page was built to.
--   Rent Index pages  rega_ejar becomes readable. It is asserted_unverified,
--                     which denies every public right, so no index figure
--                     appears. The reason shown changes from "no permission is
--                     recorded" to "the recorded permission does not cover
--                     this".
--   Other sources     any figure whose row is evidenced for public display
--                     becomes showable where a page already asks for it.
--                     gastat_sama is the one such row today.
-- Nothing is written, and no right is widened: the rows say what they said.
--
-- WHAT IS EXPOSED. The whole row: names, policies, licence_ref, the review
-- note. It is the content of the /sources page and holds nothing private. If a
-- private note is ever wanted on a source, it goes in another table.
--
-- The write grants are removed for the same reason as in 20261113: row level
-- security already refuses the writes, and a grant that only a policy stands
-- behind is one policy away from being live.
--
-- Safe to run twice.

revoke insert, update, delete, truncate, references, trigger on public.source_registry from anon, authenticated;

drop policy if exists source_registry_public_read on public.source_registry;
create policy source_registry_public_read on public.source_registry
  for select to anon, authenticated using (true);
