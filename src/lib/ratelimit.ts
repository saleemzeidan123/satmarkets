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
