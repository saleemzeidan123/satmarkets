/**
 * mediaCleanupReconciliation.mjs — the shared, testable core of
 * scripts/reconcile-media-cleanup-queue.mjs, extracted specifically so its
 * own row-disposal decision is independently regression-tested (tenth
 * adversarial review, item 1), not only reachable by running the whole
 * script against a real Supabase project.
 *
 * WHY THIS EXISTS NOW, SPECIFICALLY. scripts/sweep-unreferenced-media-
 * objects.mjs (ninth adversarial review, item 2) durably records
 * SPECULATIVE candidates in media_cleanup_queue (reason
 * "storage_object_unreferenced"): objects unreferenced by any listing_media
 * row AT THE MOMENT THE SWEEP LOOKED. Every other reason in this table
 * (upload_original_failed, upload_insert_failed, upload_trusted_write_
 * failed, upload_service_role_unavailable, deletion_storage_remove_failed,
 * deletion_row_delete_failed) represents a CONFIRMED failure on a path that
 * can never legitimately become referenced later (each upload generates a
 * fresh randomUUID() path per request; a retry after a failed attempt
 * always names a NEW path, never the old one). The sweep's own candidates
 * carry no such guarantee: the sweep and this reconciler are two
 * independent script invocations, run at arbitrary, unrelated times, and a
 * genuinely slow or stalled request whose own INSERT was merely delayed
 * (not failed) can still commit, and reference the exact path the sweep
 * already flagged, at any point between the sweep's own scan and this
 * reconciler's own apply run. The prior version of this reconciler applied
 * one uniform rule (still present in storage? delete it) to every
 * unresolved row regardless of reason, which is safe for the six confirmed-
 * failure reasons and NOT safe for the sweep's own speculative one.
 *
 * THE FIX IS DELIBERATELY THE SMALLEST ONE, NOT AN APPROVAL SYSTEM.
 * decideRowAction() below refuses to ever return a "delete" action for
 * reason "storage_object_unreferenced", unconditionally, regardless of
 * whether the object is still confirmed present in storage and regardless
 * of --apply. This is a categorical exclusion, not a policy that could be
 * satisfied by evidence: a candidate in that reason class is never
 * automated-deleted by this script, full stop. A human reviewing the
 * report output (or a future, separately designed and reviewed mechanism)
 * remains the only path to actually removing one of these objects.
 *
 * THE SECOND FIX: A LOOKUP FAILURE IS NOT PROOF OF ABSENCE. The prior
 * pathExists() treated ANY error from a signed-URL attempt (network,
 * rate-limit, a transient 5xx) the same as a confirmed "object not found",
 * which could wrongly mark a row resolved (nothing to delete, already
 * gone) when the truth was simply "could not check this time". checkPath
 * Status() below uses the Storage SDK's own dedicated exists() method
 * (added to @supabase/storage-js since this project's own reconcile
 * script was first written; verified present in the vendored version this
 * project actually uses, 2.114.0), which itself distinguishes a genuine
 * HTTP 400/404 (object confirmed absent) from every other failure shape
 * (which it re-throws rather than folding into a boolean). Anything other
 * than a clean "true" or a confirmed-404-shaped "false" is reported here
 * as "unknown", and decideRowAction() never resolves a row as a no-op
 * unless EVERY one of its paths came back definitively "absent".
 */

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} svc
 * @param {string} bucket
 * @param {string} path
 * @returns {Promise<"exists" | "absent" | "unknown">}
 */
export async function checkPathStatus(svc, bucket, path) {
  try {
    const { data } = await svc.storage.from(bucket).exists(path);
    return data ? "exists" : "absent";
  } catch {
    // .exists() itself only resolves (never throws) for a clean success or
    // a confirmed HTTP 400/404 "not found"; anything else -- network,
    // rate-limit, 5xx, an unexpected shape -- is thrown as-is by the SDK.
    // Caught here and reported as genuinely unknown, never as absence.
    return "unknown";
  }
}

/**
 * Pure decision, no I/O: given one unresolved media_cleanup_queue row and
 * the already-resolved existence status of each of its own storage_paths
 * (same order), decides what this reconciler may do about it.
 *
 * @param {{ id: string; reason: string; storage_paths: string[] }} row
 * @param {("exists" | "absent" | "unknown")[]} pathStatuses
 * @returns
 *   {{ action: "skip_speculative" }}
 *   | {{ action: "skip_unknown" }}
 *   | {{ action: "resolve_noop" }}
 *   | {{ action: "delete"; paths: string[] }}
 */
export function decideRowAction(row, pathStatuses) {
  if (row.reason === "storage_object_unreferenced") {
    return { action: "skip_speculative" };
  }
  if (pathStatuses.includes("unknown")) {
    return { action: "skip_unknown" };
  }
  const existingPaths = row.storage_paths.filter((_, i) => pathStatuses[i] === "exists");
  if (existingPaths.length === 0) {
    return { action: "resolve_noop" };
  }
  return { action: "delete", paths: existingPaths };
}
