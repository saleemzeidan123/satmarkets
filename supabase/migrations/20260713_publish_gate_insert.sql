-- The publish gate had a hole you could drive a marketplace through.
--
-- enforce_listing_publish_gate() is a good rule: nothing enters status
-- 'published' without a confirmed right to market and an unexpired advertising
-- permit on file. But the trigger was BEFORE UPDATE only. An INSERT that set
-- status = 'published' directly never met the gate at all.
--
-- That is not hypothetical. It is how six of the seven listings currently live on
-- the platform came to be published with no advertising permit and
-- authorization_verified = false, on a platform that told visitors "every listing
-- permit-checked" and showed a green Verified tick on every one of them.
--
-- Two changes:
--   1. The trigger now fires BEFORE INSERT OR UPDATE. There is no longer a door
--      into 'published' that does not pass the gate.
--   2. The exception now names what is actually missing, instead of saying that
--      some unspecified hard gate failed. An owner who cannot publish deserves to
--      be told why, and the API surfaces this text.
--
-- The function keeps the original semantics precisely, including its null
-- handling: ownership_verified and authorization_verified default to PASS when
-- unset, right_to_market_confirmed defaults to FAIL when unset. Widening those
-- defaults is a policy decision and is not made here.
--
-- Existing rows are deliberately NOT touched. Retro-archiving live inventory, or
-- worse, inventing permit numbers to make them pass, are both decisions for the
-- business, not for a migration. What this migration guarantees is only that the
-- hole is shut from here on. src/lib/gate.ts mirrors this logic so the UI can
-- show each listing's real state rather than a badge that is always on.

create or replace function public.enforce_listing_publish_gate()
returns trigger
language plpgsql
as $$
declare
  j jsonb;
  missing text[] := array[]::text[];
  permit  text;
begin
  -- Only guard the transition INTO published. On INSERT there is no OLD row, so
  -- any insert that lands directly on 'published' is a transition into it.
  if new.status = 'published'
     and (tg_op = 'INSERT' or old.status is distinct from 'published') then

    j := to_jsonb(new);
    permit := coalesce(j->>'ad_permit_number', j->>'ad_permit_no');

    -- array_append, not the || operator: text[] || text resolves to the array-literal
    -- cast and fails with "malformed array literal". The first cut of this migration
    -- had exactly that bug, and it made every publish fail for the wrong reason while
    -- looking precisely like the gate working. It was only caught by probing the
    -- allowed case as well as the blocked one.

    if not coalesce((j->>'ownership_verified')::boolean, true) then
      missing := array_append(missing, 'ownership not verified');
    end if;
    if not coalesce((j->>'authorization_verified')::boolean, true) then
      missing := array_append(missing, 'authorisation to market not verified');
    end if;
    if not coalesce(new.right_to_market_confirmed, false) then
      missing := array_append(missing, 'right to market not confirmed');
    end if;
    if permit is null then
      missing := array_append(missing, 'no advertising permit on file');
    elsif (j->>'ad_permit_expires_at') is not null
          and (j->>'ad_permit_expires_at')::timestamptz <= now() then
      missing := array_append(missing, 'advertising permit expired');
    end if;

    if array_length(missing, 1) > 0 then
      raise exception 'publish gate: listing % cannot be published: %',
        coalesce(new.reference_code, new.id::text),
        array_to_string(missing, '; ')
        using errcode = 'check_violation';
    end if;
  end if;

  return new;
end
$$;

drop trigger if exists trg_publish_gate on public.listings;

create trigger trg_publish_gate
  before insert or update on public.listings
  for each row execute function public.enforce_listing_publish_gate();
