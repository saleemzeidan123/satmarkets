-- 2026-11-13f. PKG-DATA-2. PREPARED, NOT APPLIED. The owner applies it.
--
-- Two tables for the weekly job that loads the Real Estate General Authority's
-- "Rental indicators" files from the National Open Data Platform.
--
--   official_leasing_loads   one row per dataset the job has tried: what the
--                            file was (hash, size, rows), and whether it was
--                            published or rejected and why. This is the log.
--   official_leasing_counts  the contract counts of a published load, one row
--                            per city and district. Counts only. There is no
--                            column a rent could be stored in, and the check
--                            constraints refuse a zero or a negative count.
--
-- WHO MAY DO WHAT. The public site may read a load that is published and the
-- counts that belong to one, and nothing else. A load is written as rejected
-- first and marked published only after its counts are in, so a half-loaded
-- quarter is never visible. Only the service role writes, and it is used by
-- one route, behind the cron secret.
--
-- Until this runs the page shows the quarter that ships with the code, so
-- merging before applying changes nothing a reader sees.
--
-- Safe to run twice.

create table if not exists public.official_leasing_loads (
  dataset_id      text primary key,
  source_id       text not null references public.source_registry (source_id),
  title_en        text not null,
  title_ar        text,
  dataset_url     text not null,
  resource_url    text not null,
  region          text not null,
  period          text not null check (period ~ '^[0-9]{4}-Q[1-4]$'),
  official_sha256 text not null check (official_sha256 ~ '^[0-9a-f]{64}$'),
  official_bytes  integer not null check (official_bytes > 0),
  official_rows   integer not null check (official_rows >= 0),
  commercial_rows integer not null check (commercial_rows >= 0),
  status          text not null check (status in ('published', 'rejected')),
  reason          text,
  retrieved_at    timestamptz not null default now()
);

create table if not exists public.official_leasing_counts (
  dataset_id text not null references public.official_leasing_loads (dataset_id) on delete cascade,
  city       text not null,
  district   text not null,
  office     integer check (office > 0),
  shop       integer check (shop > 0),
  showroom   integer check (showroom > 0),
  primary key (dataset_id, city, district),
  check (office is not null or shop is not null or showroom is not null)
);

create index if not exists official_leasing_loads_latest on public.official_leasing_loads (region, status, period desc);

alter table public.official_leasing_loads  enable row level security;
alter table public.official_leasing_counts enable row level security;

revoke all on public.official_leasing_loads, public.official_leasing_counts from anon, authenticated;
grant select on public.official_leasing_loads, public.official_leasing_counts to anon, authenticated;

-- The job writes with the service role. Stated here so the tables do not
-- depend on whatever the default privileges happen to be.
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant select, insert, update, delete on public.official_leasing_loads, public.official_leasing_counts to service_role;
  end if;
end $$;

drop policy if exists official_leasing_loads_public_read on public.official_leasing_loads;
create policy official_leasing_loads_public_read on public.official_leasing_loads
  for select to anon, authenticated using (status = 'published');

drop policy if exists official_leasing_counts_public_read on public.official_leasing_counts;
create policy official_leasing_counts_public_read on public.official_leasing_counts
  for select to anon, authenticated using (
    exists (select 1 from public.official_leasing_loads l where l.dataset_id = official_leasing_counts.dataset_id and l.status = 'published')
  );
