import { test, before, mock } from "node:test";
import assert from "node:assert/strict";

// Drives the REAL, exported POST handler from
// src/app/api/listings/[id]/media/route.ts end to end (real sharp
// re-encode, real magic-byte sniff, real crypto.randomUUID), not only the
// extracted cleanUpOldRouteObjectOnInsertFailure helper in isolation.
// Reviewer instruction: do not rely on the copied response-literal
// constant as proof of handler behavior, every assertion below reads the
// actual NextResponse the real handler returned. Three dependencies are
// mocked via node:test's own mock.module(): @/lib/supabase/server and
// @/lib/auth/session (which would otherwise reach a real Supabase project
// or a real Next.js cookie store), and @/lib/ratelimit (simple,
// deterministic, in-memory logic unrelated to this regression, mocked
// only because this environment's real-alias resolution for an unmocked
// @/ specifier proved unreliable once the route is loaded this way, not
// because the real limiter matters here).
//
// This file deliberately does NOT live under src/app: src/lib/
// next16Surface.test.ts's own route-module inventory scans every .ts file
// under src/app looking for a `params:` type annotation, and this file's
// own mock request object (`{ params: Promise.resolve(...) }`) is a VALUE,
// not a type, that the scanner's regex cannot tell apart from one; living
// here instead avoids being swept into that inventory at all, rather than
// changing an existing, working project-wide law to carve out an
// exception for one test file.
//
// Run via `npm run test:precompat-media-route`, which needs
// --experimental-strip-types and --experimental-test-module-mocks; not
// part of `npm test`. `src/app/api/listings/[id]/media/package.json`
// ({"type":"module"}) exists only so that route and its own dependency
// graph load as genuine ESM under plain Node for this test; Next.js's own
// build never reads it and is unaffected (confirmed: a full `npm run
// build` with it present is unchanged).

// A minimal, real, valid 1x1 PNG (not merely bytes with the right magic
// number): sharp must actually decode and re-encode it, the same as any
// real upload. Round-tripped through sharp directly before this test was
// written to confirm it decodes cleanly.
const PNG_1X1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);

type Terminal = { data?: unknown; error?: unknown; count?: number | null };

function chainable(terminal: Terminal) {
  const obj: Record<string, unknown> = {};
  const self = () => obj;
  obj.select = self;
  obj.eq = self;
  obj.insert = self;
  obj.single = () => Promise.resolve({ data: terminal.data ?? null, error: terminal.error ?? null });
  obj.then = (resolve: (v: unknown) => void, reject?: (e: unknown) => void) =>
    Promise.resolve({ data: terminal.data ?? null, error: terminal.error ?? null, count: terminal.count ?? null }).then(resolve, reject);
  return obj;
}

function makeMockSb(opts: {
  insertError: unknown;
  removeImpl: (paths: string[]) => Promise<{ data: unknown; error: unknown }>;
}) {
  let listingMediaCalls = 0;
  return {
    from(table: string) {
      if (table === "listings") return chainable({ data: { id: "listing-1", account_id: "acct-1" } });
      if (table === "listing_media") {
        listingMediaCalls++;
        // First call: the per-kind count select. Second call: the insert.
        if (listingMediaCalls === 1) return chainable({ count: 0 });
        return chainable({ data: null, error: opts.insertError });
      }
      throw new Error(`unexpected table in test: ${table}`);
    },
    storage: {
      from(_bucket: string) {
        return {
          upload: async () => ({ error: null }),
          remove: opts.removeImpl,
          createSignedUrl: async () => ({ data: { signedUrl: "https://example.test/signed" } }),
        };
      },
    },
  };
}

function makeRequest(): Request {
  const form = new FormData();
  form.set("file", new File([PNG_1X1], "test.png", { type: "image/png" }));
  return new Request("http://localhost/api/listings/listing-1/media", { method: "POST", body: form });
}

let currentSb: unknown = null;
let POST: typeof import("../app/api/listings/[id]/media/route").POST;
let NextRequest: typeof import("next/server").NextRequest;

// Registered and imported inside a `before` hook, not at module top level:
// this file has no "type": "module" declaration on `main` (out of scope to
// add just for a test's own convenience), so tsx's own CJS transform for a
// bare .ts file here does not support top-level await; every await needed
// for setup happens inside an async hook instead.
before(async () => {
  mock.module("@/lib/supabase/server", {
    namedExports: { getSupabaseServer: async () => currentSb },
  });
  mock.module("@/lib/auth/session", {
    namedExports: {
      getSessionUser: async () => ({ authId: "auth-1", userId: "user-1", email: "a@b.test", accountId: "acct-1", isSat: false }),
    },
  });
  // Real rate-limiter behaviour is deliberately not exercised here (it is
  // simple, deterministic, in-memory logic unrelated to this regression);
  // mocked to a fixed "allow" only because this environment's real-alias
  // resolution for @/ specifiers is unreliable for a module NOT already
  // intercepted by mock.module, not because the real limiter is a concern.
  mock.module("@/lib/ratelimit", {
    namedExports: { allow: () => true },
  });
  POST = (await import("../app/api/listings/[id]/media/route")).POST;
  NextRequest = (await import("next/server")).NextRequest;
});

function withCapturedErrors<T>(fn: () => Promise<T>): Promise<{ result: T; calls: unknown[][] }> {
  const calls: unknown[][] = [];
  const original = console.error;
  console.error = (...args: unknown[]) => {
    // Node's own one-time-per-process "module mocking is experimental"
    // warning happens to land on whichever test runs first; it is not
    // something this route's own code ever logs, so it is filtered here
    // rather than treated as a real assertion target.
    if (typeof args[0] === "string" && args[0].includes("ExperimentalWarning")) return;
    calls.push(args);
  };
  return fn()
    .then((result) => { console.error = original; return { result, calls }; })
    .catch((e) => { console.error = original; throw e; });
}

async function runOnce(removeImpl: (paths: string[]) => Promise<{ data: unknown; error: unknown }>) {
  currentSb = makeMockSb({ insertError: { message: "simulated insert failure (e.g. the fence's own 23502)" }, removeImpl });
  const req = new NextRequest(makeRequest());
  const { result: res, calls } = await withCapturedErrors(() =>
    POST(req, { params: Promise.resolve({ id: "listing-1" }) }),
  );
  const body = await res.json();
  return { status: res.status, body, calls };
}

test("real handler: successful cleanup on insert failure -- the object is removed, nothing is logged, and the user sees the existing attach_failed response unchanged", async () => {
  const { status, body, calls } = await runOnce(async (paths) => ({ data: paths.map((p) => ({ name: p })), error: null }));
  assert.equal(status, 400);
  assert.deepEqual(body, { error: "Saved the file but could not attach it.", code: "attach_failed" });
  assert.deepEqual(calls, [], "a clean, confirmed removal must not log anything");
});

test("real handler: REGRESSION -- storage.remove() returns an error without throwing; the real handler observes and logs it, response unchanged", async () => {
  const { status, body, calls } = await runOnce(async () => ({ data: null, error: { message: "row-level security violation" } }));
  assert.equal(status, 400);
  assert.deepEqual(body, { error: "Saved the file but could not attach it.", code: "attach_failed" });
  assert.equal(calls.length, 1);
  assert.match(String(calls[0][0]), /returned an error/);
});

test("real handler: storage.remove() throws; the real handler catches and logs it, response unchanged", async () => {
  const { status, body, calls } = await runOnce(async () => { throw new Error("network error"); });
  assert.equal(status, 400);
  assert.deepEqual(body, { error: "Saved the file but could not attach it.", code: "attach_failed" });
  assert.equal(calls.length, 1);
  assert.match(String(calls[0][0]), /threw/);
});

test("real handler: REGRESSION -- storage.remove() resolves success with a zero-length removal (policy-filtered no-op); the real handler observes and logs it, response unchanged", async () => {
  const { status, body, calls } = await runOnce(async () => ({ data: [], error: null }));
  assert.equal(status, 400);
  assert.deepEqual(body, { error: "Saved the file but could not attach it.", code: "attach_failed" });
  assert.equal(calls.length, 1);
  assert.match(String(calls[0][0]), /removed nothing/);
});

test("real handler: a fresh retry is a genuinely independent request -- the real route generates a new randomUUID() objectKey each call, so a second, real POST is unaffected by the first attempt's own failure", async () => {
  const first = await runOnce(async () => ({ data: null, error: { message: "first attempt fails" } }));
  assert.equal(first.calls.length, 1);
  const second = await runOnce(async (paths) => ({ data: paths.map((p) => ({ name: p })), error: null }));
  assert.equal(second.status, 400, "the retry's own insert is still simulated failing in this test, only its cleanup differs");
  assert.equal(second.calls.length, 0, "the retry's own successful cleanup must not be affected by, or repeat, the first attempt's own logged failure");
});
