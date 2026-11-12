-- PKG-LISTING-CREATION-1B, Codex review item 7: close the original-media
-- orphan and deletion failure modes.
--
-- WHY THIS EXISTS.
--
-- media/route.ts writes the derivative to storage, then the original to
-- storage, then the listing_media row; media/[mediaId]/route.ts's DELETE
-- deletes the row first, then removes both storage objects. Every one of
-- those storage/DB steps can fail independently of the others, and until
-- this migration the only response to that was a "best effort" cleanup
-- attempt wrapped in try/catch with the failure silently discarded.
--
-- Verified directly against this project's own vendored SDK source (not
-- assumed): @supabase/storage-js's StorageFileApi.remove() and
-- @supabase/postgrest-js's query builder both resolve to a normal
-- `{ data, error }` result for an ordinary API-level failure (a storage
-- bucket policy refusal, an RLS-denied delete, a constraint violation) and
-- only THROW for a lower-level failure (a network error, a timeout). A bare
-- try/catch with no check of the returned `.error` therefore misses exactly
-- the class of failure most likely in practice: the request reached the
-- server and was refused, not dropped. src/lib/mediaCleanup.ts's
-- bestEffortWithFallback() now checks both.
--
-- WHY A DURABLE QUEUE, NOT A TOMBSTONE STATE ON listing_media ITSELF.
--
-- Codex's own note offered "tombstone/pending-deletion state, then storage
-- removal, then DB finalization" as the preferred shape. That shape earns
-- its complexity when the row itself still has a reader that needs to see
-- the in-between state. Here it does not: this package's own read path
-- (getPublicListingMedia, src/lib/queries/publicMedia.ts) has no use for a
-- "pending delete" listing_media row, and neither does the owner's own
-- Studio view once the row is gone from the table the owner reads. Adding a
-- transient status value to a live inventory table, for a state nothing
-- ever reads, would be exactly the kind of half-finished machinery this
-- project's own house rules ask not to build. What this table is for
-- instead is the actual requirement underneath Codex's suggestion: a
-- durable, retryable record that survives past the failed request, so an
-- orphan is discoverable rather than silently lost. It plays that role
-- whether the failure was mid-upload (the row was never finalized, or never
-- created at all) or mid-delete (the row is already correctly gone).
--
-- WHAT "RESOLVED" MEANS, AND THE RETENTION WINDOW.
--
-- A row here is resolved (resolved_at set) once an operator has confirmed,
-- by hand, that the named storage_paths no longer exist (or never needed to:
-- see reason) — there is no automatic reconciliation job in this
-- environment to set it. docs/pkg-listing-creation-1b-migration-runbook.md
-- section 16 gives the exact reconciliation query and states the policy: an
-- unresolved entry older than 30 days is a real operational gap, not a
-- theoretical one, and should be investigated before that window closes,
-- not after.
--
-- WHO CAN READ OR WRITE THIS TABLE.
--
-- RLS is enabled with NO policies for any command, which is a complete
-- default-deny for authenticated/anon regardless of any table-level GRANT
-- they hold (RLS policy absence blocks at the row level independently of
-- table privileges; this is the same mechanism 20260902b/c/d's own
-- trusted-column triggers rely on being unable to bypass, applied here to
-- an entire table rather than a handful of columns). Only service_role
-- (BYPASSRLS) and genuine Postgres superusers can ever see or write a row.
-- This is deliberate: every row names real internal storage paths, which is
-- operational detail no owner or anonymous caller has a legitimate reason
-- to read, and no legitimate reason to ever insert into either (only the
-- server's own trusted upload/delete code paths do).
create table if not exists public.media_cleanup_queue (
  id bigint generated always as identity primary key,
  listing_id uuid not null,
  listing_media_id uuid,
  storage_paths text[] not null default '{}',
  reason text not null,
  queued_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by text
);

comment on table public.media_cleanup_queue is
  'Durable record of a storage/DB cleanup step that could not be confirmed to have succeeded (Codex review, item 7). Not a live-inventory table: nothing in the application reads this to decide what to show. service_role/superuser only; see this migration''s own header for the full reasoning and docs/pkg-listing-creation-1b-migration-runbook.md section 16 for the reconciliation procedure.';
comment on column public.media_cleanup_queue.listing_media_id is
  'Informational only, no foreign key: the referenced row may legitimately still exist (a failed row-delete) or already be gone (a failed storage-remove after a successful row-delete), and a queue insert must never fail merely because that row''s lifecycle is ambiguous at the moment of queuing.';
comment on column public.media_cleanup_queue.storage_paths is
  'May be empty: some reasons (e.g. a listing_media row that itself failed to delete) name no storage path at all.';

alter table public.media_cleanup_queue enable row level security;

create index if not exists media_cleanup_queue_unresolved_idx
  on public.media_cleanup_queue (queued_at)
  where resolved_at is null;
