#!/usr/bin/env node
/**
 * apply-verified-media-provenance.mjs — the operator-facing caller for
 * public.apply_verified_media_provenance() (20260912b_pkg1b_media_trusted_
 * object_binding.sql), replacing reconcile-deployment-window-legacy-gap.mjs.
 * See the migration's own comment for the full history of why this
 * mechanism replaced two earlier, shape-based ones.
 *
 * THIS SCRIPT DOES NOT DISCOVER CANDIDATES. It never queries listing_media
 * or storage.objects to guess which rows are legitimate. Every row this
 * script can possibly grant trust to must already be named, by id and
 * expected path, in a manifest the OPERATOR prepared by some real,
 * out-of-band process before running this script at all: cross-referencing
 * surviving old application/server logs, a named human's own recorded
 * manual review of that specific row+object, or (often simpler, and
 * preferred where practical) a genuine re-upload of the real file through
 * the live, trusted pipeline, which computes a real content_sha256 itself
 * and does not need this script at all.
 *
 * The database function's own structural guards (path match, object
 * existence within the right account's folder, not a reused preserved
 * original, not shared with a private/removed reference) catch a manifest
 * that is internally CONTRADICTORY. They cannot and do not verify that a
 * structurally clean entry is actually the operator's own legitimate file:
 * that judgment is the operator's, made before an id ever reaches this
 * script. A row passing every guard is not proof the operator was right to
 * include it, only proof the inclusion is not self-contradictory.
 *
 * TWO-STEP WORKFLOW (recommended for anything beyond a rehearsal).
 *   1. node scripts/apply-verified-media-provenance.mjs --manifest=<path>
 *      Reads a plain manifest (array of {"id", "path"}), calls the
 *      database function in report mode, prints the result, and writes
 *      <path>.reviewed.json: the SAME entries, each now carrying the
 *      status the database just computed, as expected_status. This file
 *      is the pinned, reviewable artifact: open it, read it, confirm it
 *      looks right.
 *   2. node scripts/apply-verified-media-provenance.mjs --approved=<path>.reviewed.json --apply
 *      Reads EXACTLY that file (refuses anything lacking expected_status
 *      on every entry) and calls apply with it unchanged. The database
 *      function re-validates every entry against its own CURRENT, locked
 *      state and grants only entries whose expected_status was
 *      'would_grant' AND whose fresh re-check still agrees; anything that
 *      drifted since step 1, in either direction, is refused and reported,
 *      never silently granted or silently dropped.
 *
 * ONE-STEP CONVENIENCE (for rehearsal/automation, not the reviewed path).
 *   node scripts/apply-verified-media-provenance.mjs --manifest=<path> --apply
 *   Runs preview and apply back to back in one process, using the
 *   preview's own just-computed statuses as expected_status. This still
 *   gets the database's own real protection (nothing is granted unless it
 *   passes both the expected_status match and every structural guard,
 *   freshly, in one atomic statement) but skips the human pause to
 *   actually read the reviewed file before deciding.
 *
 * Env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (same as
 * reconcile-media-cleanup-queue.mjs; this is the one place outside the
 * running app allowed to hold that key; the RPC this script calls is
 * itself service_role-only, matching that same boundary at the database).
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync } from "node:fs";

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const APPLY = process.argv.includes("--apply");

function argValue(name) {
  const prefix = `--${name}=`;
  const hit = process.argv.find((a) => a.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : null;
}

const manifestPath = argValue("manifest");
const approvedPath = argValue("approved");

if (!URL_ || !SERVICE) {
  console.error("Missing env. Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}
if (!manifestPath && !approvedPath) {
  console.error(
    "Missing --manifest=<path> or --approved=<path>. This script grants trust to NOTHING it discovers " +
      "itself; see this file's own header comment for the two-step (recommended) and one-step workflows.\n" +
      "Plain manifest format: a JSON file containing an array of\n" +
      '  {"id": "<listing_media.id>", "path": "<expected current path>"}\n' +
      "Example: node scripts/apply-verified-media-provenance.mjs --manifest=./reviewed-rows.json",
  );
  process.exit(1);
}
if (manifestPath && approvedPath) {
  console.error("Pass either --manifest or --approved, not both: they are the two different steps of the same workflow, never combined in one call.");
  process.exit(1);
}
if (approvedPath && !APPLY) {
  console.error("--approved is only for the apply step (pass --apply too). To preview, use --manifest instead.");
  process.exit(1);
}

function loadPlainManifest(path) {
  let raw;
  try {
    raw = JSON.parse(readFileSync(path, "utf8"));
  } catch (err) {
    console.error(`Could not read/parse ${path}: ${err.message}`);
    process.exit(1);
  }
  if (!Array.isArray(raw) || raw.length === 0) {
    console.error("Manifest must be a non-empty JSON array of {id, path} objects.");
    process.exit(1);
  }
  for (const [i, entry] of raw.entries()) {
    if (typeof entry?.id !== "string" || typeof entry?.path !== "string" || !entry.id || !entry.path) {
      console.error(`Manifest entry ${i} is malformed: expected {"id": "...", "path": "..."}, got ${JSON.stringify(entry)}`);
      process.exit(1);
    }
  }
  return raw;
}

function loadApprovedManifest(path) {
  const raw = loadPlainManifest(path);
  for (const [i, entry] of raw.entries()) {
    if (typeof entry.expected_status !== "string" || !entry.expected_status) {
      console.error(
        `Entry ${i} (id=${entry.id}) in ${path} has no expected_status. ` +
          "This must be a *.reviewed.json file produced by a prior --manifest (report) run, not a plain manifest: " +
          "the database itself will refuse an apply call missing this on any entry, since it is what proves the entry was actually reviewed.",
      );
      process.exit(1);
    }
  }
  return raw;
}

// A sanity ceiling, not a hard rule this script trusts blindly: a genuine,
// reviewed manifest is a short, specific list an operator actually looked
// at, not an unbounded export. Overridable with --force-large-manifest for
// the genuine, unusual case, never silently.
const MAX_SANE_MANIFEST_SIZE = 200;
function checkSize(manifest) {
  if (manifest.length > MAX_SANE_MANIFEST_SIZE && !process.argv.includes("--force-large-manifest")) {
    console.error(
      `Manifest has ${manifest.length} entries, over the ${MAX_SANE_MANIFEST_SIZE}-entry sanity ceiling for something an operator actually reviewed by hand. ` +
        "If this is genuinely a large, real reviewed batch, rerun with --force-large-manifest. Otherwise, check the file.",
    );
    process.exit(1);
  }
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

async function runPreview(manifest) {
  const { data, error } = await svc.rpc("apply_verified_media_provenance", {
    p_manifest: manifest,
    p_apply: false,
  });
  if (error) {
    console.error("Preview call failed:", error.message);
    process.exit(1);
  }
  return data ?? [];
}

async function runApply(approvedManifest) {
  const { data, error } = await svc.rpc("apply_verified_media_provenance", {
    p_manifest: approvedManifest,
    p_apply: true,
  });
  if (error) {
    console.error("Apply failed:", error.message);
    process.exit(1);
  }
  return data ?? [];
}

async function main() {
  if (approvedPath) {
    // Step 2 of the two-step workflow: the file itself IS the pinned
    // approval, already carrying expected_status from whenever step 1
    // ran. Nothing here re-derives anything.
    const approved = loadApprovedManifest(approvedPath);
    checkSize(approved);
    console.log(`Applying ${approved.length} pre-approved entr${approved.length === 1 ? "y" : "ies"} from ${approvedPath}\n`);
    const applied = await runApply(approved);
    console.log("Apply result:");
    report(applied);
    const grantedCount = applied.filter((r) => r.status === "granted").length;
    const refusedCount = applied.filter((r) => r.status !== "granted").length;
    console.log(`\n${grantedCount} granted, ${refusedCount} refused (see each entry's own status above for why). This IS the accurate applied/rejected result: nothing here is a guess or a post-hoc comparison.`);
    if (refusedCount > 0) {
      console.log("A refused entry was either never approved for a grant, or its state changed since step 1 ran. Re-run --manifest on the original plain manifest to see current state before re-approving.");
    }
    return;
  }

  const manifest = loadPlainManifest(manifestPath);
  checkSize(manifest);
  console.log(`Manifest: ${manifestPath} (${manifest.length} entr${manifest.length === 1 ? "y" : "ies"})\n`);

  const preview = await runPreview(manifest);
  console.log("Preview:");
  report(preview);

  const reviewedPath = `${manifestPath}.reviewed.json`;
  const reviewed = manifest.map((entry) => {
    const row = preview.find((r) => r.id === entry.id);
    return { id: entry.id, path: entry.path, expected_status: row ? row.status : "row_not_found" };
  });
  writeFileSync(reviewedPath, JSON.stringify(reviewed, null, 2));
  console.log(`\nWrote ${reviewedPath}: the entries above, pinned with their own just-computed status.`);

  if (!APPLY) {
    console.log(`Report only. Review ${reviewedPath}, then run:\n  node scripts/apply-verified-media-provenance.mjs --approved=${reviewedPath} --apply`);
    return;
  }

  // One-step convenience: apply immediately using the statuses just
  // computed above, skipping the pause to read the file. Still fully
  // protected at the database level (expected_status required and
  // re-verified atomically); only the human-review step is skipped.
  console.log("\n--apply passed with --manifest (one-step convenience, no review pause): applying immediately using the statuses just computed above.");
  const applied = await runApply(reviewed);
  console.log("Apply result:");
  report(applied);
  const grantedCount = applied.filter((r) => r.status === "granted").length;
  const refusedCount = applied.filter((r) => r.status !== "granted").length;
  console.log(`\n${grantedCount} granted, ${refusedCount} refused.`);
}

main();
