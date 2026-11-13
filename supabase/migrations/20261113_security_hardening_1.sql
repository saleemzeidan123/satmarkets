-- Security hardening 1, part A. PREPARED, NOT APPLIED. Applying it is the
-- owner's decision; nothing in the application depends on it being applied,
-- and it can be applied before or after the application change that ships
-- beside it.
--
-- Found on 2026-11-13 by reading the production catalogue through the
-- read-only connector (pg_class, pg_proc, aclexplode, has_*_privilege). Every
-- statement below removes a permission nothing in this repository uses. The
-- reverse of each is written at the bottom.

-- 1. sat_publish_index_cell. SECURITY DEFINER, owned by postgres, no pinned
--    search_path, no check of who is calling, and executable by `anon` and
--    `authenticated`. Anyone holding the public key could call it over the API
--    and run the publish path for an index cell. The one caller in this
--    repository (src/lib/ingest/rentBasePipeline.ts) and the seed script both
--    use the service client.
revoke execute on function public.sat_publish_index_cell(uuid) from public, anon, authenticated;
grant execute on function public.sat_publish_index_cell(uuid) to service_role;
alter function public.sat_publish_index_cell(uuid) set search_path = public, pg_temp;

-- 2. demo_census. SECURITY DEFINER, tells any caller how many demonstration
--    rows each table holds. Called only by scripts/seed-demo.mjs with the
--    service client.
revoke execute on function public.demo_census() from public, anon, authenticated;
grant execute on function public.demo_census() to service_role;

-- 3. rent_index_cells and rent_index_asking. Views that run with their owner's
--    rights, readable by `anon`. rent_index_cells aggregates
--    public.rent_index_closures, a table no public role may read, with no
--    minimum group size: a district with one recorded deal returns that deal's
--    achieved rent and lease term. Neither view is read by the application
--    (the published index is public.rent_index_published, which is unaffected).
revoke select on public.rent_index_cells from anon, authenticated;
revoke select on public.rent_index_asking from anon, authenticated;

-- 4. TRUNCATE, REFERENCES and TRIGGER on every table, held by `anon` and
--    `authenticated` through the platform's default grants. Row security does
--    not govern TRUNCATE at all. The API has no verb for it, so this is not
--    reachable today; it is removed so that it never becomes reachable through
--    a function written later.
revoke truncate, references, trigger on all tables in schema public from anon, authenticated;
alter default privileges for role postgres in schema public revoke truncate, references, trigger on tables from anon, authenticated;
do $$
begin
  -- MAINTAIN exists from PostgreSQL 17. Production is 17; the local harness is 16.
  if current_setting('server_version_num')::int >= 170000 then
    execute 'revoke maintain on all tables in schema public from anon, authenticated';
    execute 'alter default privileges for role postgres in schema public revoke maintain on tables from anon, authenticated';
  end if;
end $$;

-- NOT FIXED HERE, because this role cannot fix it: public.spatial_ref_sys
-- (PostGIS's table of coordinate systems) is owned by supabase_admin, has row
-- security off, and supabase_admin has granted INSERT, UPDATE, DELETE and
-- TRUNCATE on it to `anon` and `authenticated`. `postgres` can neither enable
-- row security on a table it does not own nor revoke another role's grants, so
-- the REVOKE in step 4 leaves this one table as it is (PostgreSQL reports a
-- warning, not an error). It needs Supabase support, or PostGIS moved out of
-- the exposed schema. See docs/security-baseline.md, "Security hardening 1".

-- ROLLBACK, statement for statement:
--   grant execute on function public.sat_publish_index_cell(uuid) to anon, authenticated;
--   alter function public.sat_publish_index_cell(uuid) reset search_path;
--   grant execute on function public.demo_census() to anon, authenticated;
--   grant select on public.rent_index_cells, public.rent_index_asking to anon, authenticated;
--   grant truncate, references, trigger on all tables in schema public to anon, authenticated;
--   alter default privileges for role postgres in schema public grant truncate, references, trigger on tables to anon, authenticated;
