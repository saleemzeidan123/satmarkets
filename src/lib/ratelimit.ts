import { createHmac } from "node:crypto";

// In-memory, per-instance sliding-window rate limiter. First-layer control for
// the paid-model endpoints (security audit H1: open model proxies are a cost
// abuse vector). Per-instance only, so on a serverless cold-start fan-out it
// does not share state. Back it with Vercel KV or Upstash for durable,
// cross-instance limits. Never throws; on doubt it allows.
const buckets = new Map<string, number[]>();

export function clientIp(req: Request): string {
  const xff = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim();
  return xff || req.headers.get("x-real-ip") || "unknown";
}

export function allow(name: string, req: Request, limit = 15, windowMs = 60000): boolean {
  const key = `${name}:${clientIp(req)}`;
  const now = Date.now();
  const arr = (buckets.get(key) || []).filter((t) => now - t < windowMs);
  if (arr.length >= limit) {
    buckets.set(key, arr);
    return false;
  }
  arr.push(now);
  buckets.set(key, arr);
  if (buckets.size > 5000) {
    for (const [k, v] of buckets) if (!v.some((t) => now - t < windowMs)) buckets.delete(k);
  }
  return true;
}

// ---------------------------------------------------------------------------
// Durable, cross-instance limiter (Codex P1-10; store added 2026-11-13).
//
// `allow()` above is per-instance. On serverless that is close to decorative: every
// cold start gets an empty bucket, so a fan-out of concurrent lambdas each grant the
// full quota, and an attacker paying for model calls simply forces new instances.
//
// `allowShared()` counts in a store every instance shares. Two stores are
// understood, tried in this order:
//
//   1. An Upstash or Vercel KV REST endpoint, when one is configured.
//   2. The platform's own database: `public.rate_limit_hit`
//      (supabase/migrations/20261113c_rate_limit_store.sql), reached with the
//      service key. This is the store the owner chose, because it adds no
//      vendor. It needs no configuration beyond what the application already
//      has.
//
// The local window is checked first. A caller one instance has already refused
// is refused without a round trip, which is also what keeps a flood from
// becoming a flood of database writes.
//
// If no store answers (none configured, the function not yet created, a
// timeout) the local answer stands and `durable` is false, so the caller, and
// we, never mistake "no store" for "protected".
// ---------------------------------------------------------------------------

const KV_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || "";
const KV_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || "";
const PG_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const PG_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const STORE_TIMEOUT_MS = 1500;

/** True when a shared store is configured. Whether it answers is reported per call. */
export function limiterIsDurable(): boolean {
  return Boolean((KV_URL && KV_TOKEN) || (PG_URL && PG_KEY));
}

/**
 * The key a shared counter is kept under. The caller's address never leaves
 * the application: what is stored is the limiter's name and a keyed hash of
 * the address, so the counter table holds nothing that identifies a person and
 * a copy of it cannot be turned back into addresses without the server's key.
 */
export function bucketKey(name: string, ip: string, secret: string): string {
  return `${name}:${createHmac("sha256", secret).update(`${name}:${ip}`).digest("hex").slice(0, 32)}`;
}

async function kvCount(key: string, windowSec: number): Promise<number | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), STORE_TIMEOUT_MS);
  try {
    // INCR then EXPIRE on first hit: one shared counter per caller per window.
    const res = await fetch(`${KV_URL}/pipeline`, {
      method: "POST",
      headers: { Authorization: `Bearer ${KV_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify([["INCR", key], ["EXPIRE", key, String(windowSec), "NX"]]),
      signal: ctrl.signal,
      cache: "no-store",
    });
    if (!res.ok) return null;
    const j: any = await res.json();
    const count = Number(j?.[0]?.result ?? 0);
    return Number.isFinite(count) && count > 0 ? count : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function pgCount(key: string, windowSec: number): Promise<number | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), STORE_TIMEOUT_MS);
  try {
    const res = await fetch(`${PG_URL}/rest/v1/rpc/rate_limit_hit`, {
      method: "POST",
      headers: { apikey: PG_KEY, Authorization: `Bearer ${PG_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ p_bucket: key, p_window_seconds: windowSec }),
      signal: ctrl.signal,
      cache: "no-store",
    });
    if (!res.ok) return null;
    const count = Number(await res.json());
    return Number.isFinite(count) && count > 0 ? count : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function allowShared(
  name: string,
  req: Request,
  limit = 15,
  windowSec = 60
): Promise<{ ok: boolean; durable: boolean }> {
  if (!allow(name, req, limit, windowSec * 1000)) return { ok: false, durable: false };
  const ip = clientIp(req);
  if (KV_URL && KV_TOKEN) {
    const n = await kvCount(`rl:${bucketKey(name, ip, KV_TOKEN)}`, windowSec);
    if (n != null) return { ok: n <= limit, durable: true };
  }
  if (PG_URL && PG_KEY) {
    const n = await pgCount(bucketKey(name, ip, PG_KEY), windowSec);
    if (n != null) return { ok: n <= limit, durable: true };
  }
  // No store answered. The local window has already said yes; a degraded limit
  // beats no limit, and beats refusing every visitor because a counter is down.
  return { ok: true, durable: false };
}
