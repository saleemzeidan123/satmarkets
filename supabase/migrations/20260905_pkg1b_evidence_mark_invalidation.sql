-- PKG-LISTING-CREATION-1B, outcome A follow-up. Evidence marks must not
-- survive an asset-type change with a meaning they were never given.
--
-- WHY THIS EXISTS.
--
-- 20260902b's own clear_media_shot_keys_on_asset_type_change trigger exists
-- because shot_key is asset-type-specific vocabulary (mediaStandard.ts), and
-- a photo silently keeping a label from a taxonomy that no longer applies is
-- a defect that trigger was written to prevent. listing_evidence_marks has
-- the identical exposure and, until this migration, no equivalent: a mark
-- is keyed on the same item_key vocabulary, several of which are reused
-- across asset types with different meanings ("frontage": retail's shopfront
-- vs. showroom's display glazing; "back_of_house": retail's stockroom vs.
-- hospitality's kitchens and stores; "room_typical": hospitality's guest key
-- vs. worker_housing's occupancy room). A lister who marks "frontage"
-- unavailable while the listing is retail, then changes the asset type to
-- showroom, must not have that mark silently read as an assertion about
-- showroom's own, different "frontage" shot.
--
-- WHY THIS IS NOT THE SAME FIX SHAPE AS shot_key's OWN TRIGGER.
--
-- shot_key's trigger clears the value in place with a plain UPDATE.
-- listing_evidence_marks is append-only by construction (20260902's own
-- header comment, enforced by RLS: no update policy and no delete policy
-- exist on this table at all), so a clearing UPDATE would violate the same
-- invariant that makes this table trustworthy as an audit trail. The fix
-- here is a third kind of event, appended, never a rewrite: a listing whose
-- asset type changes gets one invalidated_by_asset_change row for every
-- item that was, at that instant, still effectively marked unavailable.
-- "Effective" is read the same way every other consumer of this table
-- already reads it (guidedEvidence.ts's currentEvidenceMarks: the latest
-- row per item_kind/item_key wins), so this migration adds no second
-- definition of "current state" for a future reader to drift against.
--
-- WHY THIS IS SAFE UNDER A LATER REVERSION.
--
-- Invalidation is itself just another row. If the asset type later changes
-- back to the original type, the invalidated mark's row is still the
-- latest one for that item (nothing un-appends it), so it stays
-- ineffective; the trigger firing again on the reversion finds nothing
-- currently effective for that item to invalidate a second time. A lister
-- who wants the mark to apply again must make that assertion again, as a
-- new, real, dated row. History is never erased or rewritten either way:
-- every row this table has ever held stays exactly as written.
--
-- WHY THE ACTOR IS THE REAL CALLER, NOT A SYSTEM PSEUDO-IDENTITY.
--
-- The insert policy below (unchanged from 20260902) requires
-- actor_user_id = app_user_id() and actor_account_id = app_account_id() on
-- every row, with no exception for a system-authored one. This trigger
-- function is deliberately NOT security definer, so it runs with the
-- privileges and session context of whoever is actually updating the
-- listing's asset_type (its owner, or SAT), and it reads that same
-- app_user_id()/app_account_id() for the invalidation rows it writes. This
-- is not a workaround: the person changing the asset type is genuinely who
-- caused the invalidation, so attributing it to them is the honest answer,
-- not a forgery the insert policy happens to tolerate. A service-role
-- operation with no real app-level actor (there is none in this codebase
-- today) would correctly fail this insert rather than either fabricate an
-- actor or silently skip the invalidation; that failure is the same
-- guarantee this policy already gives every other write to this table.

alter table public.listing_evidence_marks drop constraint if exists listing_evidence_marks_action_check;
alter table public.listing_evidence_marks add constraint listing_evidence_marks_action_check
  check (action in ('marked_unavailable', 'cleared', 'invalidated_by_asset_change'));

alter table public.listing_evidence_marks drop constraint if exists listing_evidence_marks_reason_shape;
alter table public.listing_evidence_marks add constraint listing_evidence_marks_reason_shape check (
  (action = 'marked_unavailable' and reason is not null and length(btrim(reason)) >= 8)
  or (action = 'cleared' and reason is null)
  -- Carries a system-generated note (which asset types, in which direction)
  -- rather than null: the audit trail should be able to say why on its own,
  -- without a reader having to reconstruct the listing's own asset_type
  -- history from elsewhere, which this schema does not separately track.
  or (action = 'invalidated_by_asset_change' and reason is not null)
);

create or replace function public.invalidate_evidence_marks_on_asset_type_change()
returns trigger
language plpgsql
as $$
begin
  if new.asset_type is distinct from old.asset_type then
    insert into public.listing_evidence_marks
      (listing_id, item_kind, item_key, action, reason, actor_user_id, actor_account_id)
    select
      latest.listing_id, latest.item_kind, latest.item_key,
      'invalidated_by_asset_change',
      'asset type changed from ' || old.asset_type || ' to ' || new.asset_type,
      public.app_user_id(), public.app_account_id()
    from (
      select distinct on (item_kind, item_key)
        listing_id, item_kind, item_key, action
      from public.listing_evidence_marks
      where listing_id = new.id
      order by item_kind, item_key, created_at desc
    ) as latest
    where latest.action = 'marked_unavailable';
  end if;
  return new;
end;
$$;

drop trigger if exists invalidate_evidence_marks_on_asset_type_change on public.listings;
create trigger invalidate_evidence_marks_on_asset_type_change
  after update of asset_type on public.listings
  for each row
  execute function public.invalidate_evidence_marks_on_asset_type_change();

comment on function public.invalidate_evidence_marks_on_asset_type_change() is
  'Appends an invalidated_by_asset_change row for every listing_evidence_marks item still effectively marked_unavailable at the moment a listing''s asset_type changes. Never updates or deletes an existing row: this table is append-only by policy (see 20260902), and this trigger only ever adds to it. Not security definer, deliberately: it writes as the real caller changing the asset type, subject to the same insert policy every other write to this table already is.';
