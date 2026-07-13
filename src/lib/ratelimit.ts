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
// Durable, cross-instance limiter (Codex P1-10).
//
// `allow()` above is per-instance. On serverless that is close to decorative: every
// cold start gets an empty bucket, so a fan-out of concurrent lambdas each grant the
// full quota, and an attacker paying for model calls simply forces new instances.
//
// `allowShared()` uses an Upstash/Vercel-KV REST endpoint when one is configured, so
// the window is shared across every instance. If no store is configured it degrades
// to the in-memory limiter rather than failing open entirely, and says so in the
// return value, so the caller (and we) never mistake "no store" for "protected".
// ---------------------------------------------------------------------------

const KV_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || "";
const KV_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || "";

export function limiterIsDurable(): boolean {
  return Boolean(KV_URL && KV_TOKEN);
}

export async function allowShared(
  name: string,
  req: Request,
  limit = 15,
  windowSec = 60
): Promise<{ ok: boolean; durable: boolean }> {
  if (!limiterIsDurable()) {
    return { ok: allow(name, req, limit, windowSec * 1000), durable: false };
  }
  const key = `rl:${name}:${clientIp(req)}`;
  try {
    // INCR then EXPIRE on first hit: one shared counter per IP per window.
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 1500);
    const res = await fetch(`${KV_URL}/pipeline`, {
      method: "POST",
      headers: { Authorization: `Bearer ${KV_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify([["INCR", key], ["EXPIRE", key, String(windowSec), "NX"]]),
      signal: ctrl.signal,
      cache: "no-store",
    });
    clearTimeout(timer);
    if (!res.ok) return { ok: allow(name, req, limit, windowSec * 1000), durable: false };
    const j: any = await res.json();
    const count = Number(j?.[0]?.result ?? 0);
    if (!Number.isFinite(count) || count <= 0) {
      return { ok: allow(name, req, limit, windowSec * 1000), durable: false };
    }
    return { ok: count <= limit, durable: true };
  } catch {
    // The store is unreachable. Fall back to the local window rather than opening
    // the endpoint entirely; a degraded limit beats no limit on a paid model proxy.
    return { ok: allow(name, req, limit, windowSec * 1000), durable: false };
  }
}
