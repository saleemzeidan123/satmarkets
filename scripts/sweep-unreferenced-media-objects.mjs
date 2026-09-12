#!/usr/bin/env node
/**
 * sweep-unreferenced-media-objects.mjs — finds listing-media Storage objects
 * that no listing_media row references at all (neither as its own `path` nor
 * as its `original_path`), and durably records them in media_cleanup_queue
 * (reason: "storage_object_unreferenced") for human review.
 *
 * WHY THIS EXISTS NOW, SPECIFICALLY (ninth adversarial review, item 2).
 * `20260912e_pkg1b_media_upload_contract_fence.sql` makes `upload_
 * contract_version` NOT NULL with no default for ordinary callers. Once
 * that migration is live, ANY request still served by the OLD, currently-
 * deployed upload route (main's own `src/app/api/listings/[id]/media/
 * route.ts`, out of scope for this package to modify directly) will
 * upload its object to Storage successfully and then fail the
 * listing_media INSERT outright (23502). That route's own `insErr` branch
 * has no cleanup at all (confirmed by reading its real source on `main`),
 * so every such request leaves an orphaned object behind, silently, for
 * as long as the old route keeps receiving traffic. See this package's own
 * runbook, section 11a, for the two real mitigations (a prepared,
 * independent compatibility patch for that route,
 * docs/pkg-listing-creation-1b-precompat-route-patch.diff; and this
 * script, the safety net either way).
 *
 * THIS SCRIPT NEVER DELETES ANYTHING, AND NOTHING IT RECORDS IS EVER
 * AUTO-DELETED BY ANY OTHER SCRIPT EITHER. There is no call to
 * `storage.remove()` anywhere in this file, on purpose, not merely by
 * convention or flag-gating: age or absence-from-one-snapshot is never,
 * by itself, sufficient evidence an object is safe to remove (a legitimate
 * upload can be mid-flight between its own two requests; a legitimate
 * preserved original is referenced by `original_path`, not `path`, and
 * must be checked too). This script's only two possible actions are
 * "report a candidate" (default) and "durably record a candidate in
 * media_cleanup_queue for a human to review" (--apply).
 *
 * CORRECTION, TENTH ADVERSARIAL REVIEW: an earlier version of this
 * comment claimed `scripts/reconcile-media-cleanup-queue.mjs`'s own
 * `--apply` path was the eventual, safe home for actually deleting a
 * confirmed candidate. Reproduced as real: that reconciler processed
 * every unresolved row uniformly (still present in storage? delete it),
 * with no re-check of whether a listing_media row had since come to
 * reference the exact path this script recorded, between this script's own
 * scan and that reconciler's own later, independent run. A genuine
 * upload whose second request was merely slow, not failed, could commit
 * and reference that exact path in that window, and be deleted anyway.
 * `scripts/reconcile-media-cleanup-queue.mjs` now refuses, unconditionally,
 * to ever delete a row this script recorded (reason
 * "storage_object_unreferenced"), regardless of --apply and regardless of
 * whether the object is confirmed still present. A row this script records
 * stays a durable, reviewable signal only; actually removing the object,
 * if a human independently confirms it is truly safe, is not something
 * either script performs.
 *
 * WHAT COUNTS AS "REFERENCED". An object is protected the moment ANY
 * listing_media row names it, in EITHER its `path` OR its `original_path`
 * column, regardless of that row's own visibility/moderation/trust state.
 * A private, still-pending, not-yet-reconciled row protects its own
 * object exactly as much as a public one: this script has no opinion
 * about trust, only about whether the object is accounted for by the
 * table at all.
 *
 * WHY AN EXPLICIT, REQUIRED AGE THRESHOLD, NEVER A DEFAULT. A freshly
 * uploaded object can legitimately have no referencing row yet for a
 * short moment (the client's own two requests are not atomic with each
 * other). This package has never picked an arbitrary "safe" wait out of
 * thin air (see the fence's own migration header for why "an arbitrary
 * delay" was rejected as a completion condition elsewhere in this same
 * package); the right threshold depends on what the operator is actually
 * sweeping for (a narrow post-cutover window immediately after applying
 * the fence calls for a short threshold measured in minutes to hours; a
 * routine hygiene sweep calls for something much more conservative, a day
 * or more), so this script refuses to guess and requires the operator to
 * say so explicitly every time.
 *
 * Usage:
 *   node scripts/sweep-unreferenced-media-objects.mjs --older-than-hours=2
 *   node scripts/sweep-unreferenced-media-objects.mjs --older-than-hours=2 --apply
 *
 * Env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (same two
 * reconcile-media-cleanup-queue.mjs requires).
 */
import { createClient } from "@supabase/supabase-js";

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const APPLY = process.argv.includes("--apply");
const BUCKET = "listing-media";
const LIST_PAGE_SIZE = 1000;
const MAX_WALK_DEPTH = 4; // account / listing / (file | "originals" / file) -- one spare level of slack, not a hardcoded exact shape
const REFERENCE_CHECK_CHUNK = 200; // stay well under typical PostgREST IN-list/URL-length limits

const olderThanArg = process.argv.find((a) => a.startsWith("--older-than-hours="));
const OLDER_THAN_HOURS = olderThanArg ? Number(olderThanArg.split("=")[1]) : NaN;

if (!URL_ || !SERVICE) {
  console.error("Missing env. Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}
if (!Number.isFinite(OLDER_THAN_HOURS) || OLDER_THAN_HOURS < 0) {
  console.error("Missing or invalid --older-than-hours=<N>. Required, no default: see this file's own header for why.");
  process.exit(1);
}

const svc = createClient(URL_, SERVICE, { auth: { persistSession: false } });
const cutoffMs = Date.now() - OLDER_THAN_HOURS * 3_600_000;

async function listAllObjectsUnder(prefix, depth, out) {
  if (depth > MAX_WALK_DEPTH) {
    console.error(`  walk depth exceeded ${MAX_WALK_DEPTH} under "${prefix}"; stopping this branch (unexpected folder shape -- investigate manually).`);
    return;
  }
  let offset = 0;
  for (;;) {
    const { data, error } = await svc.storage.from(BUCKET).list(prefix, {
      limit: LIST_PAGE_SIZE,
      offset,
      sortBy: { column: "name", order: "asc" },
    });
    if (error) {
      console.error(`  could not list "${prefix}": ${error.message}`);
      return;
    }
    if (!data || data.length === 0) break;
    for (const entry of data) {
      const fullPath = prefix ? `${prefix}/${entry.name}` : entry.name;
      // Supabase Storage represents a folder as a pseudo-entry with no id
      // and no metadata; a real object always has both.
      if (entry.id === null || entry.id === undefined) {
        await listAllObjectsUnder(fullPath, depth + 1, out);
      } else {
        out.push({ path: fullPath, createdAt: entry.created_at ?? entry.updated_at ?? null });
      }
    }
    if (data.length < LIST_PAGE_SIZE) break;
    offset += LIST_PAGE_SIZE;
  }
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function referencedPathSet(paths) {
  const referenced = new Set();
  for (const batch of chunk(paths, REFERENCE_CHECK_CHUNK)) {
    const [byPath, byOriginal] = await Promise.all([
      svc.from("listing_media").select("path").in("path", batch),
      svc.from("listing_media").select("original_path").in("original_path", batch),
    ]);
    if (byPath.error) throw new Error(`listing_media.path lookup failed: ${byPath.error.message}`);
    if (byOriginal.error) throw new Error(`listing_media.original_path lookup failed: ${byOriginal.error.message}`);
    for (const r of byPath.data ?? []) referenced.add(r.path);
    for (const r of byOriginal.data ?? []) if (r.original_path) referenced.add(r.original_path);
  }
  return referenced;
}

async function alreadyTrackedPathSet() {
  const { data, error } = await svc
    .from("media_cleanup_queue")
    .select("storage_paths")
    .is("resolved_at", null);
  if (error) throw new Error(`media_cleanup_queue lookup failed: ${error.message}`);
  const tracked = new Set();
  for (const row of data ?? []) for (const p of row.storage_paths ?? []) tracked.add(p);
  return tracked;
}

function listingIdFromPath(path) {
  // {accountId}/{listingId}/... or {accountId}/{listingId}/originals/... --
  // confirmed against src/app/api/listings/[id]/media/route.ts's own
  // objectKey/originalKey construction, both packages (main's current
  // route and this branch's new one) agree on this shape.
  const parts = path.split("/");
  return parts.length >= 2 ? parts[1] : null;
}

async function main() {
  console.log(`Walking bucket "${BUCKET}"...`);
  const all = [];
  await listAllObjectsUnder("", 0, all);
  console.log(`Found ${all.length} object(s) total.`);

  const candidateAge = all.filter((o) => o.createdAt && new Date(o.createdAt).getTime() < cutoffMs);
  console.log(`${candidateAge.length} object(s) older than ${OLDER_THAN_HOURS}h.`);
  if (candidateAge.length === 0) {
    console.log("Nothing to check further.");
    return;
  }

  const referenced = await referencedPathSet(candidateAge.map((o) => o.path));
  const tracked = await alreadyTrackedPathSet();

  const orphans = candidateAge.filter((o) => !referenced.has(o.path) && !tracked.has(o.path));
  console.log(
    `${candidateAge.length - orphans.length} already accounted for (referenced by a row, or already tracked in media_cleanup_queue).`,
  );
  console.log(`${orphans.length} candidate orphan(s)${APPLY ? " -- recording in media_cleanup_queue" : " (report only; pass --apply to record for review)"}.\n`);

  let recorded = 0;
  for (const o of orphans) {
    const listingId = listingIdFromPath(o.path);
    if (!listingId) {
      console.log(`  [skip, unexpected path shape, cannot derive listing_id] ${o.path}`);
      continue;
    }
    const ageHours = ((Date.now() - new Date(o.createdAt).getTime()) / 3_600_000).toFixed(1);
    console.log(`  [${APPLY ? "recording" : "would record"}] ${o.path} (created ${o.createdAt}, ${ageHours}h old, listing ${listingId})`);
    if (!APPLY) continue;
    const { error } = await svc.from("media_cleanup_queue").insert({
      listing_id: listingId,
      listing_media_id: null,
      storage_paths: [o.path],
      reason: "storage_object_unreferenced",
    });
    if (error) {
      console.error(`    could not record: ${error.message}`);
      continue;
    }
    recorded++;
  }

  console.log(
    `\n${orphans.length} candidate(s) found, ${APPLY ? `${recorded} recorded in media_cleanup_queue for review` : "0 recorded (pass --apply to record)"}. ` +
      `Nothing was deleted by this script; run reconcile-media-cleanup-queue.mjs to review and, if confirmed, act on recorded entries.`,
  );
}

main().catch((e) => {
  console.error("Sweep failed:", e instanceof Error ? e.message : String(e));
  process.exit(1);
});
