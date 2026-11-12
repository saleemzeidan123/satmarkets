-- PKG-LISTING-CREATION-1B, outcome B. Per-shot media categorization.
--
-- WHY THIS EXISTS.
--
-- listing_media records `kind` (photo | floorplan | brochure), not which of
-- mediaStandard.ts's named shots (approach, entrance, interior_wide, and the
-- asset-specific extras) a given photo answers. That gap is exactly what
-- made guidedEvidence.ts's per-shot coverage degrade to "any photo present"
-- in PKG-LISTING-CREATION-1A (deferred-contracts item 1); this migration is
-- that item's own drafted schema, extended with the rest of outcome B:
-- building/unit scope, current-vs-illustrative condition, a rights
-- acknowledgement, a visibility state, and a moderation state that does
-- not imply approval before review has happened.
--
-- UNCATEGORISED IS A VALID, HONEST STATE.
--
-- shot_key stays nullable. Null means "not yet categorised", never "no
-- shot" and never inferred as any particular shot; the same convention this
-- package's own guidedEvidence.ts already uses for fulfilment being null on
-- a conditional item. No column here defaults to a guess.
--
-- NO is_cover COLUMN, ON PURPOSE. Codex review: an earlier draft of this
-- migration added one, and the application deliberately never built a
-- control that could set it (mediaCategorization.ts's own header comment
-- named the reason: this codebase already has a working, sort_order = 0,
-- "cover photo" convention, used by the public listing page, the card
-- component, and the dashboard media manager's own "make cover" action). A
-- second, unused column recording the same fact a different way is a
-- double source of truth waiting to drift, not a deferred feature; the
-- ruling for this package is to keep the one rule that already works
-- everywhere rather than ship an inert column beside it. If a future
-- package genuinely needs a cover concept sort_order cannot express, that
-- is a new, deliberate design decision, not a column already sitting here
-- unused.

alter table public.listing_media
  add column if not exists shot_key text null,
  add column if not exists media_scope text null
    check (media_scope in ('building', 'unit')),
  add column if not exists media_condition text null
    check (media_condition in ('current', 'illustrative')),
  add column if not exists rights_acknowledged_by uuid null references public.users(id),
  add column if not exists rights_acknowledged_at timestamptz null,
  -- 'public' is the honest default, not 'private', for the same reason
  -- moderation_state below defaults to 'unreviewed' rather than an
  -- approved-sounding value: the default must describe what is actually
  -- true today, not what a future gate will eventually make true. Every
  -- existing and new photo is served on the public listing page right now
  -- with no visibility filter anywhere in that read path (confirmed by
  -- reading it, not assumed); recording 'private' here would have every row
  -- claim a restriction nothing enforces the moment this column exists. A
  -- future package that actually gates on this column changes the default
  -- then, when the gate is real, not before.
  add column if not exists visibility text not null default 'public'
    check (visibility in ('public', 'private')),
  -- Deliberately not "approved" / "pending_review": that vocabulary implies
  -- a review gate exists and something is queued behind it. Nothing in this
  -- codebase moderates media yet. "unreviewed" is the honest default; a
  -- future moderation workflow adds real states alongside it, not renames
  -- this one into a false claim of review having happened.
  add column if not exists moderation_state text not null default 'unreviewed'
    check (moderation_state in ('unreviewed', 'flagged', 'removed'));

-- Codex review: a trusted-write boundary, enforced here in the database,
-- not only by application-route logic (a signed-in user can call
-- Supabase/PostgREST directly with their own session, bypassing any route
-- that never runs).
--
-- A first version of this tried a column-level REVOKE from "authenticated"
-- and was wrong: Postgres's column-level REVOKE does not retract a
-- broader, pre-existing TABLE-level GRANT (this codebase's own
-- authenticated role already has table-level UPDATE on listing_media for
-- shot_key/media_scope/media_condition), so the REVOKE was a silent
-- no-op, caught only because an adversarial test actually tried the write
-- rather than trusting the SQL to mean what it said. A trigger is used
-- instead: it fires regardless of the grant structure already in place
-- (this migration does not need to know, or match, whatever the real
-- production table's existing grants are), and it is what the isolated
-- test harness's own adversarial tests actually exercise.
--
-- rights_acknowledged_by/at record who acknowledged rights and when: a
-- fact only that real action may produce, never a value the row's own
-- owner asserts about themselves. moderation_state is a SAT/reviewer
-- decision about content, not the lister's own to make (see the runbook's
-- own section on visibility vs. moderation authority). Both are written,
-- when a real workflow exists to write them, only through
-- getSupabaseServiceRole() (src/lib/supabase/serviceRole.ts), which
-- connects to Postgres AS Supabase's real service_role, the one role this
-- trigger exempts.
--
-- visibility is deliberately NOT protected here: it is the owner's own
-- privacy choice about their own photo (see item 6's ruling), so it stays
-- reachable through the ordinary owner-scoped RLS update policy once a
-- real control exists to set it, the same as shot_key/media_scope/
-- media_condition above.
create or replace function public.listing_media_protect_trusted_columns_b()
returns trigger
language plpgsql
as $$
begin
  -- service_role is the trusted app-level write path, and is the intended,
  -- reachable exemption in production. A genuine Postgres superuser
  -- (rolsuper) is exempted too, since it holds strictly more power than
  -- this trigger could ever meaningfully restrict; this is a defence-in-depth
  -- exemption for whatever runs this migration (e.g. a self-hosted
  -- Postgres superuser), not a claim about what Supabase's own hosted
  -- SQL-editor session runs as. Codex review round 2, item 12 (Fable
  -- threat-model review, citing supabase.com/docs/guides/database/postgres/roles-superuser):
  -- Supabase's own `postgres` role in a managed project is NOT flagged
  -- rolsuper, so an operator using the Supabase dashboard's SQL editor does
  -- NOT reach this exemption and IS subject to this trigger like any other
  -- non-service_role session. That is not a defect: the trigger's actual
  -- job (blocking authenticated/anon from forging these columns) still
  -- holds regardless. If an operator genuinely needs to bypass this
  -- trigger from the SQL editor, the correct fix is an explicit,
  -- auditable role switch (e.g. `set role service_role;`, if the
  -- session's own privileges permit it) confirmed against the real
  -- project before it is relied on, not a signal to loosen this
  -- exemption; docs/pkg-listing-creation-1b-migration-runbook.md section
  -- 9 names this as a real-schema preflight question, not yet answered
  -- from this environment.
  if current_user = 'service_role' or (select rolsuper from pg_roles where rolname = current_user) then
    return new;
  end if;
  if TG_OP = 'INSERT' then
    if new.rights_acknowledged_by is not null
       or new.rights_acknowledged_at is not null
       or new.moderation_state is distinct from 'unreviewed' then
      raise exception 'only a trusted server process may set rights_acknowledged_by/at or a non-default moderation_state' using errcode = '42501';
    end if;
  elsif TG_OP = 'UPDATE' then
    if new.rights_acknowledged_by is distinct from old.rights_acknowledged_by
       or new.rights_acknowledged_at is distinct from old.rights_acknowledged_at
       or new.moderation_state is distinct from old.moderation_state then
      raise exception 'only a trusted server process may change rights_acknowledged_by/at or moderation_state' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists listing_media_protect_trusted_columns_b on public.listing_media;
create trigger listing_media_protect_trusted_columns_b
  before insert or update on public.listing_media
  for each row
  execute function public.listing_media_protect_trusted_columns_b();

-- "Changing the asset type must not silently retain incompatible media
-- classifications" (outcome B). The shot taxonomy is asset-type-specific
-- and lives in one place, mediaStandard.ts's TypeScript registry; a second,
-- SQL-side copy of that mapping would be exactly the kind of two
-- independently-drifting sources this codebase's own architecture
-- (listingPresentation.ts's "one truth model") exists to prevent. So this
-- trigger does not attempt to know which shot keys remain valid for a new
-- asset type: it conservatively clears every shot_key on the listing's
-- media whenever asset_type changes, forcing re-categorisation against the
-- new type's real taxonomy rather than risking a photo silently keeping a
-- label that no longer means what it says.
create or replace function public.clear_media_shot_keys_on_asset_type_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.asset_type is distinct from old.asset_type then
    update public.listing_media
      set shot_key = null
      where listing_id = new.id
        and shot_key is not null;
  end if;
  return new;
end;
$$;

drop trigger if exists clear_media_shot_keys_on_asset_type_change on public.listings;
create trigger clear_media_shot_keys_on_asset_type_change
  after update of asset_type on public.listings
  for each row
  execute function public.clear_media_shot_keys_on_asset_type_change();

comment on column public.listing_media.shot_key is
  'One of mediaStandard.ts''s MediaShot.key values for the listing''s current asset_type, or null if not yet categorised. Cleared automatically when the listing''s asset_type changes; see clear_media_shot_keys_on_asset_type_change.';
comment on column public.listing_media.moderation_state is
  'unreviewed is the honest default: no review has happened, not an implicit approval. flagged and removed are the only states a real moderation action can produce.';
