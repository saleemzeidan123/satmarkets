import { timingSafeEqual } from "crypto";

// Constant-time bearer-token check for privileged endpoints. The token is read
// from the Authorization header, never from the request body.
export function authed(req: Request, secret: string | undefined): boolean {
  if (!secret || secret.length < 24) return false;
  const got = (req.headers.get("authorization") || "").replace(/^Bearer /, "");
  const a = Buffer.from(got);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}
