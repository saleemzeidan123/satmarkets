import { test } from "node:test";
import assert from "node:assert/strict";
import { bestEffortWithFallback, queueMediaCleanup, removeStorageObjects } from "./mediaCleanup";

// Codex review, item 7. bestEffortWithFallback's whole reason to exist is a
// verified fact about the real SDKs (see mediaCleanup.ts's own header): a
// Supabase storage/postgrest call can fail in TWO shapes, a thrown exception
// (network-level) or a resolved `{ error }` (API-level), and the pre-review
// code only ever handled the first. These tests exercise both shapes
// directly, with no real Supabase client, because the function's whole
// contract is "call onFailure for either failure shape" and nothing about
// that contract needs a real client to prove.

test("bestEffortWithFallback: calls onFailure when the operation throws", async () => {
  let called = false;
  await bestEffortWithFallback(
    () => { throw new Error("network exploded"); },
    async () => { called = true; },
  );
  assert.equal(called, true);
});

test("bestEffortWithFallback: calls onFailure when the operation resolves with a non-null error (no throw)", async () => {
  let called = false;
  await bestEffortWithFallback(
    () => Promise.resolve({ error: { message: "row-level security violation" } }),
    async () => { called = true; },
  );
  assert.equal(called, true, "an API-level error returned as { error } (not thrown) must still trigger the fallback");
});

test("bestEffortWithFallback: does NOT call onFailure when the operation succeeds", async () => {
  let called = false;
  await bestEffortWithFallback(
    () => Promise.resolve({ error: null }),
    async () => { called = true; },
  );
  assert.equal(called, false);
});

test("bestEffortWithFallback: accepts a thenable that is not a full Promise (matches Supabase's own builder shape)", async () => {
  let called = false;
  const thenable: PromiseLike<{ error: unknown }> = {
    then(onfulfilled) {
      return Promise.resolve({ error: "boom" }).then(onfulfilled);
    },
  };
  await bestEffortWithFallback(
    () => thenable,
    async () => { called = true; },
  );
  assert.equal(called, true);
});

// Codex review round 2, item 12 (Fable threat-model review, citing
// github.com/orgs/supabase/discussions/5786 and
// github.com/supabase/supabase-js/issues/902): a storage policy that
// silently filters out objects the caller may not delete can resolve
// .remove() with `{ data: [], error: null }`, a 200 "success" that removed
// nothing at all. bestEffortWithFallback's plain `if (error)` check cannot
// see this; removeStorageObjects exists specifically to.
function fakeStorage(removeResult: { data: unknown[] | null; error: unknown } | "throw") {
  return {
    storage: {
      from(bucket: string) {
        assert.equal(bucket, "listing-media");
        return {
          remove(paths: string[]) {
            if (removeResult === "throw") throw new Error("network exploded");
            return Promise.resolve(removeResult);
          },
        };
      },
    },
  };
}

test("removeStorageObjects: does not call onFailure when every path is confirmed removed", async () => {
  let called = false;
  await removeStorageObjects(fakeStorage({ data: ["a", "b"], error: null }) as never, "listing-media", ["a", "b"], async () => { called = true; });
  assert.equal(called, false);
});

test("removeStorageObjects: calls onFailure on a real, returned error", async () => {
  let called = false;
  await removeStorageObjects(fakeStorage({ data: null, error: { message: "denied" } }) as never, "listing-media", ["a"], async () => { called = true; });
  assert.equal(called, true);
});

test("removeStorageObjects: calls onFailure when the operation throws", async () => {
  let called = false;
  await removeStorageObjects(fakeStorage("throw") as never, "listing-media", ["a"], async () => { called = true; });
  assert.equal(called, true);
});

test("removeStorageObjects: calls onFailure on a policy-filtered silent no-op (200, empty array, no error)", async () => {
  let called = false;
  await removeStorageObjects(fakeStorage({ data: [], error: null }) as never, "listing-media", ["a", "b"], async () => { called = true; });
  assert.equal(called, true, "a 200 response that removed nothing must still be treated as a failure");
});

test("removeStorageObjects: calls onFailure on a PARTIAL silent no-op (fewer objects removed than requested)", async () => {
  let called = false;
  await removeStorageObjects(fakeStorage({ data: ["a"], error: null }) as never, "listing-media", ["a", "b"], async () => { called = true; });
  assert.equal(called, true, "removing only 1 of 2 requested paths must be treated as a failure, not a partial success");
});

function fakeServiceRole(insertResult: { error: { message: string } | null }) {
  const calls: unknown[] = [];
  return {
    calls,
    client: {
      from(table: string) {
        assert.equal(table, "media_cleanup_queue");
        return {
          insert(row: unknown) {
            calls.push(row);
            return Promise.resolve(insertResult);
          },
        };
      },
    },
  };
}

test("queueMediaCleanup: inserts one row naming the listing, path(s) and reason", async () => {
  const fake = fakeServiceRole({ error: null });
  await queueMediaCleanup(fake.client as never, {
    listingId: "listing-1",
    storagePaths: ["acct/listing-1/a.webp", "acct/listing-1/originals/a.jpg"],
    reason: "upload_trusted_write_failed",
  });
  assert.equal(fake.calls.length, 1);
  assert.deepEqual(fake.calls[0], {
    listing_id: "listing-1",
    listing_media_id: null,
    storage_paths: ["acct/listing-1/a.webp", "acct/listing-1/originals/a.jpg"],
    reason: "upload_trusted_write_failed",
  });
});

test("queueMediaCleanup: carries listingMediaId through when given", async () => {
  const fake = fakeServiceRole({ error: null });
  await queueMediaCleanup(fake.client as never, {
    listingId: "listing-1",
    listingMediaId: "media-9",
    storagePaths: [],
    reason: "deletion_row_delete_failed",
  });
  assert.equal((fake.calls[0] as { listing_media_id: string }).listing_media_id, "media-9");
});

test("queueMediaCleanup: never throws when the queue insert itself fails", async () => {
  const fake = fakeServiceRole({ error: { message: "queue table unreachable" } });
  await assert.doesNotReject(() =>
    queueMediaCleanup(fake.client as never, { listingId: "listing-1", storagePaths: ["x"], reason: "upload_insert_failed" }),
  );
});

test("queueMediaCleanup: never throws when the queue insert call itself throws", async () => {
  const client = { from() { throw new Error("client misconfigured"); } };
  await assert.doesNotReject(() =>
    queueMediaCleanup(client as never, { listingId: "listing-1", storagePaths: ["x"], reason: "upload_insert_failed" }),
  );
});

test("queueMediaCleanup: never throws when no service-role client is available at all", async () => {
  await assert.doesNotReject(() =>
    queueMediaCleanup(null, { listingId: "listing-1", storagePaths: ["x"], reason: "upload_service_role_unavailable" }),
  );
});
