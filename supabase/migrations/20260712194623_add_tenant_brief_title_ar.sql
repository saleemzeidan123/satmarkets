-- Arabic parity (SM-P1-005): requirement briefs had no Arabic title, so /ar
-- rendered English titles on the board, the detail page and the dashboard.
-- Additive only. Note: CREATE OR REPLACE VIEW can only APPEND columns, so
-- title_ar goes last rather than beside title.
alter table public.tenant_briefs add column if not exists title_ar text;

create or replace view public.requirements_public as
  select id, ref_code, title, asset_type, deal_type, district_id, city,
         size_min_sqm, size_max_sqm, budget_sqm_max, timeline, must_haves,
         status, created_at, title_ar
  from public.tenant_briefs
  where status = any (array['open'::text, 'active'::text, 'new'::text, 'published'::text]);
