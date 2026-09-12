#!/usr/bin/env node
/**
 * apply-verified-media-provenance.mjs — the operator-facing caller for
 * public.apply_verified_media_provenance() (20260912b_pkg1b_media_trusted_
 * object_binding.sql), replacing reconcile-deployment-window-legacy-gap.mjs
 * (fifth adversarial review; see the migration's own comment for the full
 * why this changed).
 *
 * THIS SCRIPT DOES NOT DISCOVER CANDIDATES. It never queries listing_media
 * or storage.objects to guess which rows are legitimate: that inference
 * (time window + content_sha256 IS NULL + object existence + folder
 * prefix match) was the exact vulnerability the fifth adversarial review
 * found, across four separate real forgery shapes an ordinary owner's own
 * session can produce. Every row this script can possibly grant trust to
 * must already be named, by id and expected path, in a manifest the
 * OPERATOR prepared by some real, out-of-band process before running this
 * script at all: cross-referencing surviving old application/server logs,
 * a named human's own recorded manual review of that specific row+object,
 * or (often simpler, and preferred where practical) a genuine re-upload of
 * the real file through the live, trusted pipeline, which computes a real
 * content_sha256 itself and does not need this script at all.
 *
 * Manifest format (JSON file, --manifest=<path>): an array of
 *   {"id": "<listing_media.id>", "path": "<expected current path>"}
 *
 * The database function re-validates every entry fresh against the row's
 * CURRENT, locked state, never trusting the manifest blindly: a path that
 * has drifted since the manifest was prepared, an object no longer in
 * storage, a path that is actually another row's own preserved original,
 * or a path still shared with a private or moderation-removed reference
 * are all refused regardless of manifest inclusion. This script reports
 * the function's own per-entry status for every manifest line, not only
 * the granted ones, so a rejected entry's reason is always visible.
 *
 * Usage:
 *   node scripts/apply-verified-media-provenance.mjs --manifest=<path>              # report only
 *   node scripts/apply-verified-media-provenance.mjs --manifest=<path> --apply       # also grant
 *
 * Env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (same as
 * reconcile-media-cleanup-queue.mjs; this is the one place outside the
 * running app allowed to hold that key; the RPC this script calls is
 * itself service_role-only, matching that same boundary at the database).
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const APPLY = process.argv.includes("--apply");

function argValue(name) {
  const prefix = `--${name}=`;
  const hit = process.argv.find((a) => a.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : null;
}

const manifestPath = argValue("manifest");

if (!URL_ || !SERVICE) {
  console.error("Missing env. Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}
if (!manifestPath) {
  console.error(
    "Missing --manifest=<path>. This script grants trust to NOTHING it discovers itself; " +
      "every row must already be named, by id and expected path, in a manifest YOU prepared " +
      "by a real, out-of-band process (old log cross-reference, a named human's own recorded " +
      "review, or a genuine re-upload through the live pipeline, which does not need this " +
      "script at all).\n" +
      "Manifest format: a JSON file containing an array of\n" +
      '  {"id": "<listing_media.id>", "path": "<expected current path>"}\n' +
      "Example: node scripts/apply-verified-media-provenance.mjs --manifest=./reviewed-rows.json",
  );
  process.exit(1);
}

let manifest;
try {
  manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
} catch (err) {
  console.error(`Could not read/parse --manifest=${manifestPath}: ${err.message}`);
  process.exit(1);
}
if (!Array.isArray(manifest) || manifest.length === 0) {
  console.error("Manifest must be a non-empty JSON array of {id, path} objects.");
  process.exit(1);
}
for (const [i, entry] of manifest.entries()) {
  if (typeof entry?.id !== "string" || typeof entry?.path !== "string" || !entry.id || !entry.path) {
    console.error(`Manifest entry ${i} is malformed: expected {"id": "...", "path": "..."}, got ${JSON.stringify(entry)}`);
    process.exit(1);
  }
}
// A sanity ceiling, not a hard rule this script trusts blindly: a genuine,
// reviewed manifest is a short, specific list an operator actually looked
// at, not an unbounded export. Overridable with --force-large-manifest for
// the genuine, unusual case, never silently.
const MAX_SANE_MANIFEST_SIZE = 200;
if (manifest.length > MAX_SANE_MANIFEST_SIZE && !process.argv.includes("--force-large-manifest")) {
  console.error(
    `Manifest has ${manifest.length} entries, over the ${MAX_SANE_MANIFEST_SIZE}-entry sanity ceiling for something an operator actually reviewed by hand. ` +
      "If this is genuinely a large, real reviewed batch, rerun with --force-large-manifest. Otherwise, check the file.",
  );
  process.exit(1);
}

const svc = createClient(URL_, SERVICE, { auth: { persistSession: false } });

function report(rows) {
  const byStatus = new Map();
  for (const r of rows ?? []) {
    if (!byStatus.has(r.status)) byStatus.set(r.status, []);
    byStatus.get(r.status).push(r);
  }
  for (const [status, statusRows] of byStatus) {
    console.log(`  ${status} (${statusRows.length}):`);
    for (const r of statusRows) {
      console.log(`    ${r.id}  listing=${r.listing_id ?? "?"}  path=${r.path ?? "?"}`);
    }
  }
}

async function main() {
  console.log(
    `Manifest: ${manifestPath} (${manifest.length} entr${manifest.length === 1 ? "y" : "ies"})` +
      `${APPLY ? " (--apply: will call apply_verified_media_provenance with p_apply=true)" : " (report only; pass --apply to act)"}\n`,
  );

  // Always call with p_apply=false first, even when --apply was passed:
  // reports exactly what WOULD happen, against the identical manifest the
  // real apply call below uses. The manifest file itself is what pins
  // approval (item 3's own "bind approval to an explicit validated
  // manifest and reject drift"): both calls send the SAME entries, read
  // once, above, never re-derived from a fresh database query.
  const { data: preview, error: previewErr } = await svc.rpc("apply_verified_media_provenance", {
    p_manifest: manifest,
    p_apply: false,
  });
  if (previewErr) {
    console.error("Preview call failed:", previewErr.message);
    process.exit(1);
  }
  console.log("Preview:");
  report(preview);

  if (!APPLY) {
    console.log("\nReport only. Pass --apply to grant trust to the entries above marked would_grant.");
    return;
  }

  const { data: applied, error: applyErr } = await svc.rpc("apply_verified_media_provenance", {
    p_manifest: manifest,
    p_apply: true,
  });
  if (applyErr) {
    console.error("Apply failed:", applyErr.message);
    process.exit(1);
  }

  console.log(`\nApply result:`);
  report(applied);

  // Drift check, item 3: the preview and apply calls must agree on WHICH
  // rows were eligible. Both calls re-validate fresh against the SAME
  // pinned manifest, so any difference means real database state changed
  // between the two calls (a row was touched by something else in the
  // window between them), not that this script silently expanded or
  // changed what an operator approved. Reported loudly, never silently
  // absorbed into a success message.
  const previewWouldGrant = new Set((preview ?? []).filter((r) => r.status === "would_grant").map((r) => r.id));
  const grantedIds = new Set((applied ?? []).filter((r) => r.status === "granted").map((r) => r.id));
  const drifted = [...previewWouldGrant].filter((id) => !grantedIds.has(id));
  const unexpected = [...grantedIds].filter((id) => !previewWouldGrant.has(id));
  if (drifted.length > 0 || unexpected.length > 0) {
    console.log("\nDRIFT DETECTED between preview and apply, against the SAME manifest:");
    if (drifted.length > 0) {
      console.log(`  ${drifted.length} row(s) the preview said would_grant did NOT end up granted: ${drifted.join(", ")}`);
    }
    if (unexpected.length > 0) {
      console.log(`  ${unexpected.length} row(s) were granted that the preview did NOT report as would_grant: ${unexpected.join(", ")}`);
    }
    console.log("This means a row's own state changed between the two calls above (this script issues them back to back, so the window is small but not zero). Re-run with the same manifest to see the current state before treating this as resolved.");
    process.exitCode = 1;
    return;
  }
  console.log(`\nNo drift: exactly the ${grantedIds.size} row(s) the preview identified as would_grant were granted.`);
}

main();
