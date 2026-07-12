-- asset_type and deal_type are enums, not text. Casting explicitly also means an
-- invalid value is rejected by the database, not just by the route: the enum is
-- the last line of defence if the API is ever bypassed.
create or replace function public.create_requirement(payload jsonb)
returns table (id uuid, ref_code text)
language plpgsql
as $$
declare
  new_id uuid;
  new_ref text;
begin
  insert into public.tenant_briefs (
    title, asset_type, deal_type, district_id, city,
    size_min_sqm, size_max_sqm, budget_sqm_max, timeline,
    must_haves, notes, contact_name, contact_email, contact_phone, status
  )
  values (
    payload->>'title',
    (payload->>'asset_type')::public.asset_type,
    (payload->>'deal_type')::public.deal_type,
    nullif(payload->>'district_id','')::uuid,
    coalesce(nullif(payload->>'city',''), 'Riyadh'),
    nullif(payload->>'size_min_sqm','')::numeric,
    nullif(payload->>'size_max_sqm','')::numeric,
    nullif(payload->>'budget_sqm_max','')::numeric,
    nullif(payload->>'timeline',''),
    coalesce(
      (select array_agg(value::text) from jsonb_array_elements_text(payload->'must_haves')),
      '{}'::text[]
    ),
    nullif(payload->>'notes',''),
    nullif(payload->>'contact_name',''),
    nullif(payload->>'contact_email',''),
    nullif(payload->>'contact_phone',''),
    'open'
  )
  returning tenant_briefs.id, tenant_briefs.ref_code into new_id, new_ref;

  insert into public.requirement_notifications (brief_id, audience)
  select new_id, a from unnest(array['broker','landlord','sat']) as a;

  return query select new_id, new_ref;
end;
$$;
