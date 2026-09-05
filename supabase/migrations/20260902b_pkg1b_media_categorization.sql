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
-- building/unit scope, current-vs-illustrative condition, an explicit cover
-- flag, a rights acknowledgement, a visibility state, and a moderation
-- state that does not imply approval before review has happened.
--
-- UNCATEGORISED IS A VALID, HONEST STATE.
--
-- shot_key stays nullable. Null means "not yet categorised", never "no
-- shot" and never inferred as any particular shot; the same convention this
-- package's own guidedEvidence.ts already uses for fulfilment being null on
-- a conditional item. No column here defaults to a guess.

alter table public.listing_media
  add column if not exists shot_key text null,
  add column if not exists media_scope text null
    check (media_scope in ('building', 'unit')),
  add column if not exists media_condition text null
    check (media_condition in ('current', 'illustrative')),
  add column if not exists is_cover boolean not null default false,
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

-- At most one cover photo per listing. A real DB constraint, not an
-- application-level "unset the old one first" convention that a concurrent
-- request could race past the same way PKG-LISTING-CREATION-1A's own review
-- found ownership needed enforcing in the query itself, not only in app
-- code.
create unique index if not exists listing_media_one_cover_per_listing
  on public.listing_media (listing_id)
  where is_cover;

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
