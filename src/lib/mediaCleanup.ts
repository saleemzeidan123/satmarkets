import type { SupabaseClient } from "@supabase/supabase-js";

// PKG-LISTING-CREATION-1B, Codex review item 7: close the original-media
// orphan and deletion failure modes. Used by media/route.ts, docs/route.ts
// (upload-failure rollback) and media/[mediaId]/route.ts (deletion), the
// three places a storage object or listing_media row can be left behind by
// a failed cleanup attempt. See
// supabase/migrations/20260905b_pkg1b_media_cleanup_queue.sql for the table
// this writes to and the full reasoning for why it exists and who may read it.

/**
 * Runs a Supabase-style operation (anything resolving to `{ error }`, thrown
 * or returned) and calls `onFailure` for EITHER failure shape.
 *
 * WHY THIS EXISTS, SPECIFICALLY. Verified against this project's own
 * vendored SDK source: @supabase/storage-js's `.remove()` and
 * @supabase/postgrest-js's query builder both resolve to a normal
 * `{ data: null, error }` for an ordinary API-level failure (a bucket policy
 * refusal, an RLS-denied delete, a constraint violation), and only THROW for
 * a lower-level failure (a network error, a timeout). Every "best effort"
 * cleanup call this package had before this review wrapped the call in
 * try/catch and nothing else, which only ever catches the second, rarer
 * case. This wrapper is the one place both are handled, so a call site
 * cannot silently repeat the gap by writing its own bare try/catch again.
 */
export async function bestEffortWithFallback(
  // PromiseLike, not Promise: Supabase's PostgrestFilterBuilder is thenable
  // (awaitable) but structurally lacks catch/finally/Symbol.toStringTag, so a
  // bare `sb.from(...).delete()...` (no explicit await inside the arrow)
  // satisfies PromiseLike and not the stricter Promise type.
  operation: () => PromiseLike<{ error: unknown }>,
  onFailure: () => Promise<void>,
): Promise<void> {
  try {
    const { error } = await operation();
    if (error) await onFailure();
  } catch {
    await onFailure();
  }
}

/**
 * Removes `paths` from `bucket` and calls `onFailure` unless EVERY path was
 * actually confirmed removed.
 *
 * WHY THIS IS NOT JUST bestEffortWithFallback. Codex review round 2, item
 * 12 (Fable threat-model review), citing Supabase's own storage-js issue
 * tracker (github.com/orgs/supabase/discussions/5786,
 * github.com/supabase/supabase-js/issues/902): when a storage policy
 * silently filters out objects the caller is not allowed to delete,
 * `.remove()` can resolve with `{ data: [], error: null }`, a 200
 * "success" that removed nothing. bestEffortWithFallback's `if (error)`
 * check cannot see this at all, since there is no error. This function
 * additionally compares the returned array's length against the number of
 * paths requested, so a partial or total silent no-op is treated as a
 * failure and queued the same as a thrown exception or a real error would
 * be.
 */
export async function removeStorageObjects(
  sb: SupabaseClient,
  bucket: string,
  paths: string[],
  onFailure: () => Promise<void>,
): Promise<void> {
  try {
    const { data, error } = await sb.storage.from(bucket).remove(paths);
    if (error || (data ?? []).length !== paths.length) await onFailure();
  } catch {
    await onFailure();
  }
}

export type MediaCleanupReason =
  | "upload_original_failed"
  | "upload_insert_failed"
  | "upload_trusted_write_failed"
  | "upload_service_role_unavailable"
  | "deletion_storage_remove_failed"
  | "deletion_row_delete_failed";

/**
 * Durably records that `storagePaths` (and/or the listing_media row named by
 * `listingMediaId`) could not be confirmed deleted, so an operator can find
 * and resolve it later instead of it being lost the moment this request
 * ends. Never throws: this is itself the last line of defence for a
 * best-effort cleanup failure, so its own failure degrades to a structured
 * log line (captured by the hosting platform's own log retention) rather
 * than an unhandled rejection in a request that has already decided its
 * response. `serviceRole` may be null (the caller could not obtain one, or
 * this is the deletion path, which does not fail the request over it) --
 * the log-only fallback is what happens in that case too.
 */
export async function queueMediaCleanup(
  serviceRole: SupabaseClient | null,
  params: { listingId: string; listingMediaId?: string; storagePaths: string[]; reason: MediaCleanupReason },
): Promise<void> {
  if (serviceRole) {
    try {
      const { error } = await serviceRole.from("media_cleanup_queue").insert({
        listing_id: params.listingId,
        listing_media_id: params.listingMediaId ?? null,
        storage_paths: params.storagePaths,
        reason: params.reason,
      });
      if (!error) return;
      console.error("[media-cleanup-queue] insert returned an error; falling back to a log line", {
        ...params,
        dbError: error.message,
      });
      return;
    } catch (e) {
      console.error("[media-cleanup-queue] insert threw; falling back to a log line", {
        ...params,
        error: e instanceof Error ? e.message : String(e),
      });
      return;
    }
  }
  console.error("[media-cleanup-queue] no service-role client available; recording as a log line only", params);
}
