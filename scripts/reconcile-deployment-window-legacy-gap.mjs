#!/usr/bin/env node
/**
 * reconcile-deployment-window-legacy-gap.mjs — the bounded, one-time
 * remediation for the real deployment-sequencing gap security closure
 * review found (docs/pkg-listing-creation-1b-migration-runbook.md
 * section 21, item 4).
 *
 * THE GAP. 20260912b_pkg1b_media_trusted_object_binding.sql's own
 * one-time backfill marks is_legacy_media = true for every row with
 * content_sha256 IS NULL at the moment THAT migration first runs. The
 * currently-deployed application code (main, pre-PKG-1B) never writes
 * content_sha256 at all: that column, and the whole two-phase trusted-
 * write pattern, is part of this package's own application code, deployed
 * separately from (and, per the runbook's own corrected section 11,
 * strictly AFTER) the migrations. A real, legitimate upload made through
 * the OLD, still-currently-deployed app, in the window between "migrations
 * applied" and "new app code live" (or during any later period the OLD
 * app is running again, e.g. an application rollback with the new schema
 * still in place), lands with is_legacy_media = false AND
 * derivation_verified = false: correctly excluded by the trust gate from
 * public read (exactly as it must be for a genuinely forged row), but
 * WRONGLY excluded for this one, since it is a real, legitimate upload by
 * the row's own verified account owner, not an attacker.
 *
 * THE FIX, BOUNDED ON PURPOSE. This script marks is_legacy_media = true
 * for rows created strictly within an EXPLICIT, OPERATOR-SUPPLIED time
 * window (--from/--to, both required, no default). It is not, and must
 * never become, a general "re-run the backfill" tool: an unbounded
 * version of this exact query would let a forged row, inserted at ANY
 * time by ANY account, simply wait for someone to run this script and
 * acquire legacy status, exactly undoing the trust gate this whole
 * security-closure round exists to install. The window must be the
 * REAL, OBSERVED start (when the migrations were actually applied) and
 * end (when the new application code was confirmed live) of THIS
 * specific rollout, or of a specific rollback-then-forward-roll period,
 * never a guess and never "everything so far".
 *
 * Usage:
 *   node scripts/reconcile-deployment-window-legacy-gap.mjs --from=<ISO> --to=<ISO>              # report only
 *   node scripts/reconcile-deployment-window-legacy-gap.mjs --from=<ISO> --to=<ISO> --apply       # also mark
 *
 * Env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (same as
 * reconcile-media-cleanup-queue.mjs; this is the one place outside the
 * running app allowed to hold that key).
 */
import { createClient } from "@supabase/supabase-js";

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const APPLY = process.argv.includes("--apply");

function argValue(name) {
  const prefix = `--${name}=`;
  const hit = process.argv.find((a) => a.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : null;
}

const fromRaw = argValue("from");
const toRaw = argValue("to");

if (!URL_ || !SERVICE) {
  console.error("Missing env. Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}
if (!fromRaw || !toRaw) {
  console.error(
    "Missing --from/--to. Both are required, no default: this script must never run against an unbounded window.\n" +
      "  --from: the exact timestamp migrations were applied to this environment (ISO 8601)\n" +
      "  --to:   the exact timestamp the new application code was confirmed live (ISO 8601)\n" +
      "Example: node scripts/reconcile-deployment-window-legacy-gap.mjs --from=2026-09-15T10:00:00Z --to=2026-09-15T10:07:00Z",
  );
  process.exit(1);
}
const from = new Date(fromRaw);
const to = new Date(toRaw);
if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
  console.error("--from/--to must both parse as valid dates (ISO 8601).");
  process.exit(1);
}
if (from >= to) {
  console.error("--from must be strictly before --to.");
  process.exit(1);
}
// A sanity ceiling, not a hard rule this script trusts blindly: a genuine
// deployment window is minutes, not days. A much wider window is more
// likely a mistyped date than a real rollback period, and this script
// would otherwise happily "legalize" a much larger set of rows than any
// real gap could have produced. Overridable with --force-wide-window for
// the genuine, unusual case (an extended rollback), never silently.
const MAX_SANE_WINDOW_HOURS = 48;
const windowHours = (to.getTime() - from.getTime()) / 3_600_000;
if (windowHours > MAX_SANE_WINDOW_HOURS && !process.argv.includes("--force-wide-window")) {
  console.error(
    `--from/--to span ${windowHours.toFixed(1)} hours, over the ${MAX_SANE_WINDOW_HOURS}h sanity ceiling for a deployment window. ` +
      "If this is genuinely a real, extended rollback period, rerun with --force-wide-window. Otherwise, check the dates.",
  );
  process.exit(1);
}

const svc = createClient(URL_, SERVICE, { auth: { persistSession: false } });

async function main() {
  console.log(`Window: ${from.toISOString()} .. ${to.toISOString()} (${windowHours.toFixed(2)}h)${APPLY ? " (--apply: will mark is_legacy_media)" : " (report only; pass --apply to act)"}\n`);

  const { data: rows, error } = await svc
    .from("listing_media")
    .select("id, listing_id, path, source, created_at")
    .is("content_sha256", null)
    .eq("is_legacy_media", false)
    .gte("created_at", from.toISOString())
    .lt("created_at", to.toISOString())
    .order("created_at", { ascending: true });
  if (error) {
    console.error("Could not read listing_media:", error.message);
    process.exit(1);
  }
  if (!rows || rows.length === 0) {
    console.log("No rows fell into the deployment-window gap. Nothing to do.");
    return;
  }

  console.log(`${rows.length} row(s) created inside the window with no content_sha256 (uploaded through the old application code before the new one was live):\n`);
  for (const r of rows) {
    console.log(`  ${r.id}  listing=${r.listing_id}  source=${r.source}  path=${r.path}  created_at=${r.created_at}`);
  }

  if (!APPLY) {
    console.log("\nReport only. Pass --apply to mark these rows is_legacy_media = true.");
    return;
  }

  const ids = rows.map((r) => r.id);
  const { data: updated, error: updErr } = await svc
    .from("listing_media")
    .update({ is_legacy_media: true })
    .in("id", ids)
    .select("id");
  if (updErr) {
    console.error("Update failed:", updErr.message);
    process.exit(1);
  }
  console.log(`\nMarked ${(updated ?? []).length}/${ids.length} row(s) is_legacy_media = true.`);
  if ((updated ?? []).length !== ids.length) {
    console.error("Fewer rows updated than expected; re-run to check for rows that changed (e.g. gained a real content_sha256) between the report and this apply.");
  }
}

main();
