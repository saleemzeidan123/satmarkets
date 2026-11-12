#!/usr/bin/env node
/**
 * reconcile-media-cleanup-queue.mjs — the operational half of
 * media_cleanup_queue (supabase/migrations/20260905b_pkg1b_media_cleanup_queue.sql).
 *
 * Codex review round 3, item 4. The queue itself is durable (a real table,
 * service_role/superuser only, written whenever an upload rollback or a
 * deletion's storage cleanup could not be confirmed). Turning an unresolved
 * row into an actual answer — does the object still exist, should it be
 * deleted, is this now resolved — was, before this script, a hand-typed SQL
 * procedure documented in the runbook. That is honest but not operationally
 * usable: nobody runs a paragraph of prose. This script IS the reconciliation
 * procedure, runnable, not merely described.
 *
 * WHAT THIS SCRIPT IS NOT. It is not a scheduled job: nothing in this
 * codebase invokes it automatically, so "run this weekly" (the runbook's own
 * recommendation) is still an operator's own responsibility, not a promise
 * this script keeps by existing. It is not durable in the way the queue
 * TABLE is durable: if this process crashes mid-run, whatever it already
 * resolved stays resolved (each row is finalized independently) and whatever
 * it had not reached yet is untouched, so a re-run picks up exactly where it
 * left off — but there is no separate audit trail of the SCRIPT'S OWN runs,
 * only of the queue rows it touches.
 *
 * For each unresolved queue row, oldest first (the actual per-row decision
 * lives in mediaCleanupReconciliation.mjs's own decideRowAction(), which
 * this file only calls -- kept there specifically so it is independently
 * regression-tested, tenth adversarial review, item 1):
 *   0. Reason "storage_object_unreferenced" (written only by
 *      scripts/sweep-unreferenced-media-objects.mjs) is a SPECULATIVE
 *      candidate, never a confirmed failure, and is skipped here
 *      unconditionally, regardless of --apply and regardless of what the
 *      existence check below would find. See mediaCleanupReconciliation.mjs
 *      for why: unlike every other reason in this table, this one has no
 *      guarantee the object cannot still become legitimately referenced
 *      after the sweep looked and before this script runs.
 *   1. For every path in storage_paths, ask Storage whether the object still
 *      exists (the Storage SDK's own exists() call). A failure that is NOT
 *      a confirmed "not found" (network, rate-limit, a transient 5xx) is
 *      its own third outcome, "unknown", and is never treated as proof of
 *      absence.
 *   2. If any path's status is "unknown": skip the row, left unresolved for
 *      a retry. Never resolved on a lookup this script could not actually
 *      complete.
 *   3. If every path is confirmed already gone: mark the row resolved.
 *      Nothing to delete; a retry, or an unrelated cleanup, already
 *      finished the job.
 *   4. If any path is confirmed to still exist:
 *        - default (no --apply): report it and take no action.
 *        - --apply: delete the remaining objects, confirm the delete
 *          actually removed them (the same removed-count check
 *          src/lib/mediaCleanup.ts's removeStorageObjects() uses, for the
 *          same reason: a policy-filtered delete can silently return 200
 *          with nothing removed), and only mark resolved if it did.
 *
 * Usage:
 *   node scripts/reconcile-media-cleanup-queue.mjs                # report only
 *   node scripts/reconcile-media-cleanup-queue.mjs --apply         # also delete + resolve
 *   node scripts/reconcile-media-cleanup-queue.mjs --resolved-by="saleem"  # attribution (default: whoami-style env, else "unattributed")
 *
 * Env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (the same two
 * this codebase's own getSupabaseServiceRole() requires; this script is the
 * one place outside the running app that is allowed to hold that key).
 */
import { createClient } from "@supabase/supabase-js";
import { checkPathStatus, decideRowAction } from "./mediaCleanupReconciliation.mjs";

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const APPLY = process.argv.includes("--apply");
const RESOLVED_BY = (process.argv.find((a) => a.startsWith("--resolved-by=")) || "").split("=")[1]
  || process.env.USER || process.env.USERNAME || "unattributed";
const BUCKET = "listing-media";

if (!URL_ || !SERVICE) {
  console.error("Missing env. Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const svc = createClient(URL_, SERVICE, { auth: { persistSession: false } });

async function main() {
  const { data: rows, error } = await svc
    .from("media_cleanup_queue")
    .select("id, listing_id, listing_media_id, storage_paths, reason, queued_at")
    .is("resolved_at", null)
    .order("queued_at", { ascending: true });
  if (error) {
    console.error("Could not read media_cleanup_queue:", error.message);
    process.exit(1);
  }
  if (!rows || rows.length === 0) {
    console.log("No unresolved entries.");
    return;
  }

  console.log(`${rows.length} unresolved entr${rows.length === 1 ? "y" : "ies"}${APPLY ? " (--apply: will delete and resolve)" : " (report only; pass --apply to act)"}.\n`);

  let resolvedNoop = 0, resolvedDeleted = 0, stillPresent = 0, deleteFailed = 0, skippedSpeculative = 0, skippedUnknown = 0;

  for (const row of rows) {
    const ageDays = ((Date.now() - new Date(row.queued_at).getTime()) / 86_400_000).toFixed(1);
    const paths = row.storage_paths || [];
    const pathStatuses = await Promise.all(paths.map((p) => checkPathStatus(svc, BUCKET, p)));
    const decision = decideRowAction(row, pathStatuses);

    if (decision.action === "skip_speculative") {
      // Never auto-deleted, unconditionally, regardless of --apply or of
      // whether the object is confirmed still present: see
      // mediaCleanupReconciliation.mjs's own header for why. Left
      // unresolved on purpose; only a human (or a future, separately
      // designed and reviewed mechanism) may act on this class.
      console.log(`[skip, speculative candidate -- never auto-deleted, review manually] queue#${row.id} (${row.reason}, ${ageDays}d old): ${paths.join(", ")}`);
      skippedSpeculative++;
      continue;
    }

    if (decision.action === "skip_unknown") {
      console.log(`[skip, could not confirm existence for at least one path -- left unresolved for a retry] queue#${row.id} (${row.reason}, ${ageDays}d old): ${paths.join(", ")}`);
      skippedUnknown++;
      continue;
    }

    if (decision.action === "resolve_noop") {
      console.log(`[resolve, nothing to delete] queue#${row.id} (${row.reason}, ${ageDays}d old): all ${paths.length} path(s) confirmed already gone.`);
      resolvedNoop++;
      if (APPLY) {
        await svc.from("media_cleanup_queue").update({ resolved_at: new Date().toISOString(), resolved_by: RESOLVED_BY }).eq("id", row.id);
      }
      continue;
    }

    // decision.action === "delete"
    const existing = decision.paths;
    const ageFlag = Number(ageDays) > 30 ? " ⚠ past the 30-day retention window" : "";
    console.log(`[${APPLY ? "deleting" : "would delete"}] queue#${row.id} (${row.reason}, ${ageDays}d old${ageFlag}): ${existing.join(", ")}`);
    stillPresent++;
    if (!APPLY) continue;

    const { data: removed, error: rmErr } = await svc.storage.from(BUCKET).remove(existing);
    if (rmErr || (removed ?? []).length !== existing.length) {
      console.error(`  delete failed or partial for queue#${row.id}; left unresolved for a retry (${rmErr ? rmErr.message : `removed ${(removed ?? []).length}/${existing.length}`}).`);
      deleteFailed++;
      continue;
    }
    await svc.from("media_cleanup_queue").update({ resolved_at: new Date().toISOString(), resolved_by: RESOLVED_BY }).eq("id", row.id);
    resolvedDeleted++;
  }

  console.log(
    `\n${resolvedNoop} resolved (already gone), ${resolvedDeleted} resolved (deleted), ${stillPresent} with objects still present${APPLY ? "" : " (not deleted: pass --apply)"}, ` +
      `${deleteFailed} delete failures left unresolved, ${skippedSpeculative} speculative candidate(s) skipped (never auto-deleted), ${skippedUnknown} left unresolved (existence could not be confirmed).`,
  );
}

main();
