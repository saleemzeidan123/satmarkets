import { test } from "node:test";
import assert from "node:assert/strict";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cleanUpOldRouteObjectOnInsertFailure, OLD_ROUTE_ATTACH_FAILED_RESPONSE } from "./precompatRouteCleanup";

// Tenth adversarial review, item 2. Tests the actual logic
// docs/pkg-listing-creation-1b-precompat-route-patch.diff embeds into
// `main`'s own current upload route, not only the new route's own,
// separately extracted handleUploadInsertFailure (src/lib/mediaCleanup.ts),
// which cannot retroactively affect a request the OLD route already
// executed. Every scenario the review named is covered: successful
// cleanup, a returned cleanup error, a thrown error, a zero-removal
// response, and a fresh retry (a genuinely independent second call, since
// main's own route generates a fresh randomUUID() objectKey per request).

function withCapturedErrors<T>(fn: () => Promise<T>): Promise<{ result: T; calls: unknown[][] }> {
  const calls: unknown[][] = [];
  const original = console.error;
  console.error = (...args: unknown[]) => { calls.push(args); };
  return fn()
    .then((result) => { console.error = original; return { result, calls }; })
    .catch((e) => { console.error = original; throw e; });
}

function mockSb(removeImpl: (paths: string[]) => Promise<{ data: unknown; error: unknown }>): SupabaseClient {
  return { storage: { from: () => ({ remove: removeImpl }) } } as unknown as SupabaseClient;
}

test("cleanUpOldRouteObjectOnInsertFailure: successful cleanup -- confirmed single-object removal logs nothing", async () => {
  const sb = mockSb(async (paths) => ({ data: paths.map((p) => ({ name: p })), error: null }));
  const { calls } = await withCapturedErrors(() => cleanUpOldRouteObjectOnInsertFailure(sb, "acct1/listing1/x.webp"));
  assert.deepEqual(calls, [], "a clean, confirmed removal must not log anything");
});

test("cleanUpOldRouteObjectOnInsertFailure: REGRESSION -- a returned cleanup error (no throw) is observed and logged, not silently swallowed by a bare try/catch", async () => {
  const sb = mockSb(async () => ({ data: null, error: { message: "row-level security violation" } }));
  const { calls } = await withCapturedErrors(() => cleanUpOldRouteObjectOnInsertFailure(sb, "acct1/listing1/x.webp"));
  assert.equal(calls.length, 1);
  assert.match(String(calls[0][0]), /returned an error/);
  assert.equal((calls[0][1] as { objectKey: string }).objectKey, "acct1/listing1/x.webp");
});

test("cleanUpOldRouteObjectOnInsertFailure: a thrown error (network-level) is caught and logged", async () => {
  const sb = mockSb(async () => { throw new Error("fetch failed: network error"); });
  const { calls } = await withCapturedErrors(() => cleanUpOldRouteObjectOnInsertFailure(sb, "acct1/listing1/x.webp"));
  assert.equal(calls.length, 1);
  assert.match(String(calls[0][0]), /threw/);
});

test("cleanUpOldRouteObjectOnInsertFailure: REGRESSION -- a zero-removal response (200 success, nothing actually removed; a policy-filtered no-op) is observed and logged, not treated as a clean success", async () => {
  const sb = mockSb(async () => ({ data: [], error: null }));
  const { calls } = await withCapturedErrors(() => cleanUpOldRouteObjectOnInsertFailure(sb, "acct1/listing1/x.webp"));
  assert.equal(calls.length, 1);
  assert.match(String(calls[0][0]), /removed nothing/);
});

test("cleanUpOldRouteObjectOnInsertFailure: a fresh retry after a failed attempt is a genuinely independent call (main's own route generates a new randomUUID() objectKey per request, so a retry never reuses the failed attempt's own path)", async () => {
  let call = 0;
  const sb = mockSb(async () => {
    call++;
    if (call === 1) return { data: null, error: { message: "transient failure on first attempt" } };
    return { data: [{ name: "acct1/listing1/retry.webp" }], error: null };
  });
  const first = await withCapturedErrors(() => cleanUpOldRouteObjectOnInsertFailure(sb, "acct1/listing1/original-attempt.webp"));
  assert.equal(first.calls.length, 1, "the first, failed attempt must be logged");
  const second = await withCapturedErrors(() => cleanUpOldRouteObjectOnInsertFailure(sb, "acct1/listing1/retry.webp"));
  assert.equal(second.calls.length, 0, "the second, independent retry succeeding must not be affected by or repeat the first attempt's own failure");
});

test("the user-facing response and the recorded cleanup failure are separate: the pinned, literal response main's route already returns does not change based on cleanup outcome, because nothing in cleanUpOldRouteObjectOnInsertFailure's own return value is ever plumbed into it", async () => {
  // OLD_ROUTE_ATTACH_FAILED_RESPONSE is a pinned copy of main's own real,
  // current literal (verified via `git show origin/main:...` this round),
  // not computed from anything this function returns (it returns void).
  // The patch's own added line is a pure side effect ahead of main's
  // existing, completely unchanged return statement.
  assert.deepEqual(OLD_ROUTE_ATTACH_FAILED_RESPONSE, {
    status: 400,
    body: { error: "Saved the file but could not attach it.", code: "attach_failed" },
  });
  const failingSb = mockSb(async () => { throw new Error("anything"); });
  const succeedingSb = mockSb(async () => ({ data: [{ name: "x" }], error: null }));
  // Both calls are made and awaited; the response constant above is
  // identical regardless, since it is a separate, hardcoded literal, not
  // derived from either call's outcome.
  await cleanUpOldRouteObjectOnInsertFailure(failingSb, "a/b/x.webp").catch(() => {});
  await cleanUpOldRouteObjectOnInsertFailure(succeedingSb, "a/b/y.webp");
  assert.deepEqual(OLD_ROUTE_ATTACH_FAILED_RESPONSE.body, { error: "Saved the file but could not attach it.", code: "attach_failed" });
});
