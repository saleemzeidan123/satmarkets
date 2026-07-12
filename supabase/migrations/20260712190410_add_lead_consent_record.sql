-- SM-P0-004: representation is a mandate. PDPL wants an auditable consent record,
-- not just a UI checkbox. Additive, nullable/defaulted; no policy change.
alter table public.leads
  add column if not exists consent boolean not null default false,
  add column if not exists consent_at timestamptz;
