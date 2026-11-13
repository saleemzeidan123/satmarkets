-- Security hardening 1, part B. PREPARED, NOT APPLIED.
--
-- ORDER MATTERS. Apply this only AFTER the application change that ships
-- beside it is live in production (src/app/api/requirements/route.ts calling
-- create_requirement through the service client) and after confirming that
-- production has a service key (GET /api/cron/expire-permits answers
-- "configured": true; it did on 2026-11-13). Applied before that, the public
-- "post a requirement" form stops working.
--
-- create_requirement is SECURITY DEFINER and executable by `anon`. The route
-- validates and rate-limits; the function does neither. Anyone holding the
-- public key can call the function directly over the API and skip the route:
-- unlimited briefs, any length, any contact details, each one fanning out
-- three notification rows. Once the route writes with the service client the
-- public roles need no EXECUTE at all.
revoke execute on function public.create_requirement(jsonb) from public, anon, authenticated;
grant execute on function public.create_requirement(jsonb) to service_role;

-- ROLLBACK:
--   grant execute on function public.create_requirement(jsonb) to anon, authenticated;
