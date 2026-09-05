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
 * For each unresolved queue row, oldest first:
 *   1. For every path in storage_paths, ask Storage whether the object still
 *      exists (a signed-URL attempt: Supabase has no direct "exists" call,
 *      and this is cheaper than a download).
 *   2. If every path is already gone: mark the row resolved. Nothing to
 *      delete; a retry, or an unrelated cleanup, already finished the job.
 *   3. If any path still exists:
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

async function pathExists(path) {
  // No direct "does this object exist" call in the Storage API; a signed-URL
  // attempt is the cheapest real check (no bytes transferred either way).
  const { error } = await svc.storage.from(BUCKET).createSignedUrl(path, 60);
  return !error;
}

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

  let resolvedNoop = 0, resolvedDeleted = 0, stillPresent = 0, deleteFailed = 0;

  for (const row of rows) {
    const ageDays = ((Date.now() - new Date(row.queued_at).getTime()) / 86_400_000).toFixed(1);
    const paths = row.storage_paths || [];
    const existing = [];
    for (const p of paths) {
      if (await pathExists(p)) existing.push(p);
    }

    if (existing.length === 0) {
      console.log(`[resolve, nothing to delete] queue#${row.id} (${row.reason}, ${ageDays}d old): all ${paths.length} path(s) already gone.`);
      resolvedNoop++;
      if (APPLY) {
        await svc.from("media_cleanup_queue").update({ resolved_at: new Date().toISOString(), resolved_by: RESOLVED_BY }).eq("id", row.id);
      }
      continue;
    }

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

  console.log(`\n${resolvedNoop} resolved (already gone), ${resolvedDeleted} resolved (deleted), ${stillPresent} with objects still present${APPLY ? "" : " (not deleted: pass --apply)"}, ${deleteFailed} delete failures left unresolved.`);
}

main();
