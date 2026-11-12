import { test } from "node:test";
import assert from "node:assert/strict";
import { checkPathStatus, decideRowAction } from "./mediaCleanupReconciliation.mjs";

// Tenth adversarial review, item 1. Reproduced sequence this suite closes:
// sweep-unreferenced-media-objects.mjs queues a speculative candidate
// (reason "storage_object_unreferenced"); a legitimate listing then comes
// to reference that exact object; reconcile-media-cleanup-queue.mjs's own
// --apply, run later and independently, used to delete it anyway and mark
// the queue row resolved, because it applied one uniform "still present in
// storage? delete it" rule to every unresolved row regardless of reason.
// These tests exercise decideRowAction(), the actual producer/consumer
// boundary the real script calls for every row, not a paraphrase of it.

test("decideRowAction: REGRESSION, reproducing the exact reviewer scenario -- a speculative candidate whose object is confirmed to STILL EXIST (a reference appeared after the sweep looked) is never scheduled for deletion", () => {
  const row = { id: "q1", reason: "storage_object_unreferenced", storage_paths: ["acct1/listing1/late-reference.webp"] };
  const decision = decideRowAction(row, ["exists"]);
  assert.equal(decision.action, "skip_speculative", "a still-present, now-referenced object must never become a delete action");
});

test("decideRowAction: speculative candidates are skipped unconditionally, regardless of what the existence check found (exists, absent, or unknown)", () => {
  const row = { id: "q2", reason: "storage_object_unreferenced", storage_paths: ["a/b/x.webp", "a/b/y.webp"] };
  for (const statuses of [["exists", "exists"], ["absent", "absent"], ["unknown", "unknown"], ["exists", "absent"], ["exists", "unknown"]]) {
    const decision = decideRowAction(row, statuses);
    assert.equal(decision.action, "skip_speculative", `statuses=${JSON.stringify(statuses)} must still be skip_speculative, never delete or resolve`);
  }
});

test("decideRowAction: PENDING UPLOAD PROTECTION -- a speculative candidate whose object cannot even be confirmed to exist (lookup itself failed) is still never auto-resolved or deleted, only ever skip_speculative", () => {
  const row = { id: "q3", reason: "storage_object_unreferenced", storage_paths: ["acct1/listing1/mid-flight.webp"] };
  const decision = decideRowAction(row, ["unknown"]);
  assert.equal(decision.action, "skip_speculative");
});

test("decideRowAction: REFERENCED ORIGINAL PROTECTION -- a speculative candidate naming a preserved original's own path is never scheduled for deletion even when confirmed present", () => {
  const row = { id: "q4", reason: "storage_object_unreferenced", storage_paths: ["acct1/listing1/originals/preserved.jpg"] };
  const decision = decideRowAction(row, ["exists"]);
  assert.equal(decision.action, "skip_speculative");
});

test("decideRowAction: a CONFIRMED-FAILURE reason (e.g. upload_insert_failed) with any path status 'unknown' is left unresolved, never treated as proof of absence", () => {
  const row = { id: "q5", reason: "upload_insert_failed", storage_paths: ["a/b/x.webp", "a/b/y.webp"] };
  const decision = decideRowAction(row, ["absent", "unknown"]);
  assert.equal(decision.action, "skip_unknown", "one unconfirmed path must block resolution of the whole row, not just be silently ignored");
});

test("decideRowAction: a confirmed-failure reason whose every path is confirmed absent resolves as a no-op (nothing to delete)", () => {
  const row = { id: "q6", reason: "upload_insert_failed", storage_paths: ["a/b/x.webp", "a/b/y.webp"] };
  const decision = decideRowAction(row, ["absent", "absent"]);
  assert.equal(decision.action, "resolve_noop");
});

test("decideRowAction: a confirmed-failure reason with some paths still present schedules deletion of exactly those paths, not the already-absent ones", () => {
  const row = { id: "q7", reason: "upload_trusted_write_failed", storage_paths: ["a/b/derivative.webp", "a/b/originals/original.jpg"] };
  const decision = decideRowAction(row, ["exists", "absent"]);
  assert.equal(decision.action, "delete");
  assert.deepEqual(decision.paths, ["a/b/derivative.webp"]);
});

test("decideRowAction: a confirmed-failure reason with every path still present schedules deletion of all of them", () => {
  const row = { id: "q8", reason: "deletion_storage_remove_failed", storage_paths: ["a/b/x.webp", "a/b/originals/y.jpg"] };
  const decision = decideRowAction(row, ["exists", "exists"]);
  assert.equal(decision.action, "delete");
  assert.deepEqual(decision.paths, ["a/b/x.webp", "a/b/originals/y.jpg"]);
});

// checkPathStatus: LOOKUP FAILURES MUST REMAIN UNKNOWN, NOT BE TREATED AS
// PROOF OF ABSENCE. Mocked clients only: no real Storage call.

function mockSvc(existsImpl) {
  return { storage: { from: () => ({ exists: existsImpl }) } };
}

test("checkPathStatus: a clean, confirmed-present response is reported 'exists'", async () => {
  const svc = mockSvc(async () => ({ data: true, error: null }));
  assert.equal(await checkPathStatus(svc, "listing-media", "a/b/x.webp"), "exists");
});

test("checkPathStatus: a confirmed HTTP 400/404 'not found' response (exists() resolves data:false, per the vendored SDK's own exists() contract) is reported 'absent'", async () => {
  const svc = mockSvc(async () => ({ data: false, error: { message: "not found", status: 404 } }));
  assert.equal(await checkPathStatus(svc, "listing-media", "a/b/gone.webp"), "absent");
});

test("checkPathStatus: REGRESSION -- any other failure (network, rate-limit, 5xx; the vendored SDK's own exists() re-throws these rather than returning them as data:false) is reported 'unknown', never folded into 'absent'", async () => {
  const svc = mockSvc(async () => { throw new Error("fetch failed: network error"); });
  assert.equal(await checkPathStatus(svc, "listing-media", "a/b/x.webp"), "unknown");
});
