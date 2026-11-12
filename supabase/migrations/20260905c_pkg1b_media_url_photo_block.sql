-- PKG-LISTING-CREATION-1B, Codex review round 2, item 12 (Fable
-- threat-model review): close the external-URL bypass at the database, not
-- only at the application route.
--
-- WHY THIS EXISTS, ON TOP OF ITEM 8's OWN FIX.
--
-- Item 8 stopped api/listings/route.ts and api/listings/[id]/route.ts from
-- accepting a client-supplied photo URL and turning it into a
-- listing_media row with source='url'. That closes the ONE path this
-- codebase's own application code offered. It does not close the
-- underlying capability: the RLS insert/update policy on listing_media
-- (defined in the base schema this repository's local migrations have
-- never held, see docs/pkg-listing-creation-1b-migration-runbook.md
-- section 4.1) exists to let an owner manage their OWN listing's media,
-- and has no reason to inspect the SHAPE of what they write, only whose
-- listing it is. A lister with their own valid session JWT can call
-- PostgREST directly (POST .../rest/v1/listing_media with their own
-- Authorization header), bypassing every Next.js route entirely, and nothing
-- before this migration stopped them from inserting exactly the row shape
-- item 8 was written to prevent: kind='photo', source='url', path pointed
-- at an arbitrary third-party (or another lister's own private) URL. This
-- is the same "application-route validation is not a database boundary"
-- lesson 20260902b/c/d's own trusted-column triggers already exist to
-- teach, applied here to a payload SHAPE rule instead of to a column-write
-- privilege.
--
-- WHY NO service_role OR SUPERUSER EXEMPTION, UNLIKE THE TRUSTED-COLUMN
-- TRIGGERS.
--
-- Those triggers exempt service_role because the legitimate upload
-- pipeline itself, running as service_role, is SUPPOSED to be able to set
-- content_sha256/original_path/derived_*/moderation_state: the boundary is
-- about WHO may write them, not whether the value should ever exist. This
-- rule is different in kind: there is no legitimate first-party workflow,
-- for ANY role including service_role, that creates a NEW listing_media
-- row combining kind='photo' with source='url' any more (item 8 removed
-- the only one that existed). If a future package deliberately builds a
-- server-side, validated remote-ingestion pipeline (item 8's own
-- runbook section states what that would need: SSRF/redirect/DNS-rebinding
-- protection, content-type verification, size limits), it is exactly the
-- kind of considered, reviewed change that should also revisit this
-- trigger, not silently route around it through an exempted role.
--
-- WHY EXISTING (LEGACY) ROWS ARE UNTOUCHED.
--
-- The trigger only rejects a row TRANSITIONING INTO the forbidden shape:
-- on INSERT, any new row with kind='photo' AND source='url'; on UPDATE,
-- only when the new row has that shape AND the old row did not already
-- (checked with IS DISTINCT FROM, which is also true correctly). An
-- existing legacy source='url' photo row can still have its shot_key,
-- media_scope, media_condition, alt_en/ar, sort_order, or any other column
-- updated by the categorization route (api/listings/[id]/media/[mediaId]/route.ts)
-- exactly as before: such an update leaves kind and source unchanged, so
-- OLD and NEW agree on the shape and the condition below is false. This
-- migration changes what NEW rows may become, never what already exists.
create or replace function public.listing_media_block_new_url_photos()
returns trigger
language plpgsql
as $$
begin
  if new.kind = 'photo' and new.source = 'url' then
    if TG_OP = 'INSERT' or old.kind is distinct from 'photo' or old.source is distinct from 'url' then
      raise exception 'New photo evidence must be uploaded, not attached by external URL.'
        using errcode = '23514'; -- check_violation: a payload-shape rule, not a privilege rule
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists listing_media_block_new_url_photos on public.listing_media;
create trigger listing_media_block_new_url_photos
  before insert or update on public.listing_media
  for each row
  execute function public.listing_media_block_new_url_photos();

comment on function public.listing_media_block_new_url_photos() is
  'Codex review round 2, item 12: rejects (23514) any INSERT or genuine transition-into of kind=photo + source=url on listing_media, for every role, no exemption. Closes the direct-PostgREST bypass of item 8''s own application-route fix. Existing legacy source=url photo rows are unaffected: only a row newly acquiring this exact shape is rejected, never an unrelated update to a row that already had it.';
