#!/usr/bin/env node
/**
 * reconcile-deployment-window-legacy-gap.mjs — the bounded remediation for
 * the real deployment-sequencing gap security closure found
 * (docs/pkg-listing-creation-1b-migration-runbook.md section 21).
 *
 * THE GAP. The currently-deployed application code (main, pre-PKG-1B)
 * never writes content_sha256 at all: that column, and the whole
 * two-phase trusted-write pattern, is part of this package's own
 * application code, deployed separately from (and, per the runbook's own
 * corrected section 11, strictly AFTER) the migrations. A real,
 * legitimate upload made through the OLD, still-currently-deployed app,
 * in the window between "migrations applied" and "new app code live" (or
 * during any later period the OLD app is running again, e.g. an
 * application rollback with the new schema still in place), lands with
 * is_legacy_media = false AND derivation_verified = false: correctly
 * excluded by the trust gate from public read (exactly as it must be for
 * a genuinely forged row), but WRONGLY excluded for this one, since it is
 * a real, legitimate upload by the row's own verified account owner, not
 * an attacker.
 *
 * CORRECTION (fourth adversarial review): an earlier version of this
 * script granted trust to EVERY row matching the time window alone
 * (created_at, content_sha256 IS NULL). That is not sufficient evidence:
 * an authenticated owner can insert a FORGED row on their own eligible
 * listing, inside the SAME window, with `path` naming a known object
 * belonging to a DIFFERENT account (or one already moderation-removed).
 * Dates, source='upload', object existence, and listing ownership alone
 * do not distinguish that row from a genuine one. This script no longer
 * grants trust itself at all: it is a thin, bounded, windowed CALLER of
 * public.grant_validated_legacy_media_trust() (20260912b_pkg1b_media_
 * trusted_object_binding.sql), the ONE place real object existence,
 * same-account folder provenance, and "never moderation-removed" are
 * verified, atomically, before any row is granted trust. The migration's
 * own one-time backfill calls the identical function with no time window;
 * this script supplies the window on top of the same checks, never
 * instead of them.
 *
 * THE WINDOW IS STILL BOUNDED, ON PURPOSE, EVEN THOUGH PROVENANCE IS NOW
 * VALIDATED. Provenance validation closes the specific forgery this
 * review named; the explicit window remains valuable for a separate
 * reason, auditability and blast-radius: a single reconciliation run
 * should touch exactly the rows a specific, named rollout or rollback
 * period could plausibly have produced, not "everything that happens to
 * pass validation, whenever this is run." --from/--to remain required,
 * with no default.
 *
 * Usage:
 *   node scripts/reconcile-deployment-window-legacy-gap.mjs --from=<ISO> --to=<ISO>              # report only
 *   node scripts/reconcile-deployment-window-legacy-gap.mjs --from=<ISO> --to=<ISO> --apply       # also mark
 *
 * Env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (same as
 * reconcile-media-cleanup-queue.mjs; this is the one place outside the
 * running app allowed to hold that key; the RPC this script calls is
 * itself service_role-only, matching that same boundary at the database).
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
// deployment window is minutes, not days. Overridable with
// --force-wide-window for the genuine, unusual case (an extended
// rollback), never silently.
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
  console.log(`Window: ${from.toISOString()} .. ${to.toISOString()} (${windowHours.toFixed(2)}h)${APPLY ? " (--apply: will call grant_validated_legacy_media_trust with p_apply=true)" : " (report only; pass --apply to act)"}\n`);

  // Always call with p_apply=false first, even when --apply was passed:
  // this reports exactly what WOULD be granted before anything is
  // written, using the identical validated candidate set the real apply
  // call would use (the function recomputes it fresh each call; nothing
  // here is cached between the two calls).
  const { data: preview, error: previewErr } = await svc.rpc("grant_validated_legacy_media_trust", {
    p_from: from.toISOString(),
    p_to: to.toISOString(),
    p_apply: false,
  });
  if (previewErr) {
    console.error("Could not compute the validated candidate set:", previewErr.message);
    process.exit(1);
  }

  // A separate, unvalidated report: rows the naive time+hash-null
  // condition alone would have matched, but that FAILED provenance
  // validation. These are not silently granted, and not silently
  // ignored either: item 3's own "report the remediation needed."
  const { data: allInWindow, error: allErr } = await svc
    .from("listing_media")
    .select("id, listing_id, path, source, created_at, visibility")
    .is("content_sha256", null)
    .eq("is_legacy_media", false)
    .gte("created_at", from.toISOString())
    .lt("created_at", to.toISOString());
  if (allErr) {
    console.error("Could not read listing_media for the unvalidated-candidate report:", allErr.message);
    process.exit(1);
  }
  const validatedIds = new Set((preview ?? []).map((r) => r.id));
  const failedValidation = (allInWindow ?? []).filter((r) => !validatedIds.has(r.id));

  if ((preview ?? []).length === 0 && failedValidation.length === 0) {
    console.log("No rows fell into the deployment-window gap. Nothing to do.");
    return;
  }

  if ((preview ?? []).length > 0) {
    console.log(`${preview.length} row(s) validated: real object, same-account folder provenance, never moderation-removed. ${APPLY ? "Granting is_legacy_media = true." : "Would grant is_legacy_media = true (pass --apply to act)."}\n`);
    for (const r of preview) {
      console.log(`  GRANT  ${r.id}  listing=${r.listing_id}  path=${r.path}  created_at=${r.created_at}`);
    }
  }
  if (failedValidation.length > 0) {
    console.log(`\n${failedValidation.length} row(s) matched the time window but FAILED provenance validation. NOT granted. Needs manual remediation (confirm the real object, re-upload through the new app, or leave untrusted):\n`);
    for (const r of failedValidation) {
      console.log(`  UNVALIDATED  ${r.id}  listing=${r.listing_id}  visibility=${r.visibility}  path=${r.path}  created_at=${r.created_at}`);
    }
  }

  if (!APPLY) {
    console.log("\nReport only. Pass --apply to grant trust to the validated rows above.");
    return;
  }
  if ((preview ?? []).length === 0) {
    console.log("\nNothing validated in this window; --apply has nothing to do.");
    return;
  }

  const { data: applied, error: applyErr } = await svc.rpc("grant_validated_legacy_media_trust", {
    p_from: from.toISOString(),
    p_to: to.toISOString(),
    p_apply: true,
  });
  if (applyErr) {
    console.error("Apply failed:", applyErr.message);
    process.exit(1);
  }
  console.log(`\nGranted is_legacy_media = true to ${(applied ?? []).length} row(s).`);
  if ((applied ?? []).length !== preview.length) {
    console.log("Fewer rows granted than previewed; a row's own state (e.g. its content_sha256) likely changed between the preview and apply calls above. Re-run to check the current state.");
  }
}

main();
