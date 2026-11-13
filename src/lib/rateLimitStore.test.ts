import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { allowShared, bucketKey } from "./ratelimit";

// The shared rate limit store (2026-11-13). The limiter used to count per
// server instance, which a caller defeats by spreading requests. These tests
// hold the three things that make the shared count worth having: every route
// uses it, it never stores an address, and it fails to the local window
// instead of failing open or refusing everyone.

const root = path.join(import.meta.dirname, "../..");
const walk = (d: string): string[] => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
const routes = walk(path.join(root, "src/app/api")).filter((f) => f.endsWith("route.ts"));
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

test("no route counts on the per-instance limiter alone", () => {
  const local = routes.filter((f) => /(?<![A-Za-z.])allow\(/.test(strip(fs.readFileSync(f, "utf8")))).map((f) => path.relative(root, f));
  assert.deepEqual(local, [], "these routes call the per-instance allow() directly; use allowShared()");
  const shared = routes.filter((f) => /await allowShared\(/.test(fs.readFileSync(f, "utf8")));
  assert.ok(shared.length >= 33, `expected every limited route on the shared limiter, found ${shared.length}`);
});

test("the stored key carries no address and cannot be reversed without the server key", () => {
  const k = bucketKey("signup", "203.0.113.7", "server-secret-one");
  assert.match(k, /^signup:[0-9a-f]{32}$/);
  assert.doesNotMatch(k, /203|113/);
  assert.equal(k, bucketKey("signup", "203.0.113.7", "server-secret-one"), "the same caller must land in the same bucket");
  assert.notEqual(k, bucketKey("signup", "203.0.113.8", "server-secret-one"));
  assert.notEqual(k, bucketKey("leads", "203.0.113.7", "server-secret-one"), "limiters must not share a bucket");
  assert.notEqual(k, bucketKey("signup", "203.0.113.7", "server-secret-two"), "the hash must depend on the server key");
});

test("with no store answering, the local window still limits and says it is not durable", async () => {
  const req = new Request("https://example.test/api/x", { headers: { "x-forwarded-for": "198.51.100.23" } });
  const seen: boolean[] = [];
  for (let i = 0; i < 5; i++) {
    const r = await allowShared("test-fallback", req, 3, 60);
    assert.equal(r.durable, false, "no store is configured in the test environment");
    seen.push(r.ok);
  }
  assert.deepEqual(seen, [true, true, true, false, false]);
});

test("the store is closed to the public roles and keeps itself small", () => {
  const sql = fs.readFileSync(path.join(root, "supabase/migrations/20261113c_rate_limit_store.sql"), "utf8");
  assert.match(sql, /alter table public\.rate_limit_counters enable row level security;/);
  assert.match(sql, /revoke all on table public\.rate_limit_counters from public, anon, authenticated;/);
  assert.match(sql, /security definer\s+set search_path = public, pg_temp/);
  assert.match(sql, /revoke execute on function public\.rate_limit_hit\(text, integer\) from public, anon, authenticated;/);
  assert.match(sql, /grant execute on function public\.rate_limit_hit\(text, integer\) to service_role;/);
  assert.match(sql, /delete from public\.rate_limit_counters where window_start < now\(\) - interval '1 day';/);
  assert.doesNotMatch(sql, /create policy/i, "the counter table must have no policy: service_role only");
});

test("the limiter gives the store a deadline", () => {
  const src = fs.readFileSync(path.join(root, "src/lib/ratelimit.ts"), "utf8");
  assert.match(src, /const STORE_TIMEOUT_MS = 1500;/);
  assert.equal((src.match(/setTimeout\(\(\) => ctrl\.abort\(\), STORE_TIMEOUT_MS\)/g) ?? []).length, 2);
});
