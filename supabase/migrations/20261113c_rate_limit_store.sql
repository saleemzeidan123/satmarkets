-- A shared rate limit counter, in the database the platform already has.
--
-- Every limiter in src/lib/ratelimit.ts was per-instance: each serverless
-- instance kept its own count, so a caller who spread requests across
-- instances got the full quota from each. docs/security-baseline.md has called
-- this the largest open gap since August. The owner chose this store on
-- 2026-11-13 over a Redis vendor or an edge rule, because it adds no vendor and
-- no new place for data to live.
--
-- What is stored: a bucket name and a count per time window. The bucket is the
-- limiter's name followed by a keyed hash of the caller's address, computed in
-- the application; no address is written here. Rows older than a day are
-- removed by the function itself.
--
-- Who can use it: service_role only. The table has row security on and no
-- policy, and the public roles hold nothing on it or on the function.

create table if not exists public.rate_limit_counters (
  bucket text not null,
  window_start timestamptz not null,
  hits integer not null default 0,
  primary key (bucket, window_start)
);

alter table public.rate_limit_counters enable row level security;
revoke all on table public.rate_limit_counters from public, anon, authenticated;

create index if not exists rate_limit_counters_window_idx on public.rate_limit_counters (window_start);

create or replace function public.rate_limit_hit(p_bucket text, p_window_seconds integer)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  w integer := greatest(1, least(coalesce(p_window_seconds, 60), 86400));
  slot timestamptz := to_timestamp(floor(extract(epoch from now()) / w) * w);
  n integer;
begin
  if p_bucket is null or length(p_bucket) = 0 or length(p_bucket) > 200 then
    raise exception 'rate_limit_hit: bad bucket';
  end if;

  insert into public.rate_limit_counters as c (bucket, window_start, hits)
  values (p_bucket, slot, 1)
  on conflict (bucket, window_start) do update set hits = c.hits + 1
  returning c.hits into n;

  -- Housekeeping, on about one call in two hundred, so the table cannot grow
  -- without bound and no scheduled job is needed.
  if random() < 0.005 then
    delete from public.rate_limit_counters where window_start < now() - interval '1 day';
  end if;

  return n;
end;
$$;

revoke execute on function public.rate_limit_hit(text, integer) from public, anon, authenticated;
grant execute on function public.rate_limit_hit(text, integer) to service_role;

-- ROLLBACK:
--   drop function if exists public.rate_limit_hit(text, integer);
--   drop table if exists public.rate_limit_counters;
