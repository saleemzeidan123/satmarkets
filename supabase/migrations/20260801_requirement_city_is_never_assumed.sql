-- PKG-A11Y-1, finding 117. A requirement whose payload names no city was filed
-- in Riyadh.
--
-- `20260714_public_write_paths_restored.sql` wrote the city column as
--
--     coalesce(nullif(payload->>'city',''), 'Riyadh')
--
-- so a brief that stated no location was stored as a brief that stated Riyadh.
-- Nothing downstream can tell the two apart afterwards: the board renders
-- `r.city` as fact, matching filters on it, and the poster is never shown the
-- value that was chosen for them. A person searching for space in Jeddah whose
-- city field failed to reach this function has their requirement shown to Riyadh
-- landlords, and the row carries no marker saying the city was assumed.
--
-- The HTTP path has not been able to reach this default since PKG-DEM1 closed
-- finding 102: `src/app/api/requirements/route.ts` derives the city from the
-- district row, falls back to a recognised `cityKey`, and returns 400 "Choose a
-- location" when neither yields one. That fix is upstream of the defect, not the
-- defect. The function is SECURITY DEFINER and callable by `anon` and
-- `authenticated`, so the API route is one caller of it and not a gate in front
-- of it; a direct PostgREST call, a future server action, an admin script or a
-- restored older client all still reach the coalesce.
--
-- A default is the wrong shape of answer here regardless of which value it
-- picks. The city is not a preference with a sensible fallback, it is the single
-- fact that decides who sees the requirement. When it is absent the honest
-- outcome is a refused write and a caller that has to say what it meant, which
-- is what the API route already does at its own layer.
--
-- The raise uses an explicit sqlstate so a caller can tell "you left the city
-- out" apart from a constraint violation. `check_violation` (23514) is the
-- closest standard class: the payload failed a stated requirement of the write.
--
-- Everything else in the function is unchanged from
-- `20260714_public_write_paths_restored.sql`, including the pinned search_path,
-- the hardcoded 'open' status and the notification rows, which is why the whole
-- body is restated rather than patched: `create or replace function` has no
-- partial form, and a reader comparing the two files should be able to see that
-- one line differs.

create or replace function public.create_requirement(payload jsonb)
returns table(id uuid, ref_code text)
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  new_id uuid;
  new_ref text;
  in_city text := nullif(btrim(payload->>'city'), '');
begin
  if in_city is null then
    raise exception 'create_requirement: the payload names no city, and a requirement is not filed in a city nobody stated'
      using errcode = 'check_violation', hint = 'Resolve the city from the district or ask the poster, then call again.';
  end if;

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
    in_city,
    nullif(payload->>'size_min_sqm','')::numeric,
    nullif(payload->>'size_max_sqm','')::numeric,
    nullif(payload->>'budget_sqm_max','')::numeric,
    nullif(payload->>'timeline',''),
    coalesce((select array_agg(value::text) from jsonb_array_elements_text(payload->'must_haves')), '{}'::text[]),
    nullif(payload->>'notes',''),
    nullif(payload->>'contact_name',''),
    nullif(payload->>'contact_email',''),
    nullif(payload->>'contact_phone',''),
    'open'   -- not the caller's to choose. A brief arrives open; the market closes it.
  )
  returning tenant_briefs.id, tenant_briefs.ref_code into new_id, new_ref;

  insert into public.requirement_notifications (brief_id, audience)
  select new_id, a from unnest(array['broker','landlord','sat']) as a;

  return query select new_id, new_ref;
end;
$function$;
