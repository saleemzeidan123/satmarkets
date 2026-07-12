-- SM-P0-005. Two structural problems behind the API bugs:
--
-- 1. ref_code was generated in the route as "R-" + Math.random(). With ~80k
--    values and no unique constraint, collisions are a matter of time and two
--    briefs could share a reference. References are now issued by the database
--    from a sequence, so they are unique by construction and the client cannot
--    choose one.
-- 2. The brief insert and its notification rows were two separate statements.
--    If the second failed the brief existed with nobody notified, silently.
--    create_requirement() does both in one transaction: either the brief and its
--    notifications exist, or neither does.

create sequence if not exists public.requirement_ref_seq start with 20500;

alter table public.tenant_briefs
  alter column ref_code set default ('R-' || nextval('public.requirement_ref_seq')::text);

create unique index if not exists tenant_briefs_ref_code_key
  on public.tenant_briefs (ref_code) where ref_code is not null;
