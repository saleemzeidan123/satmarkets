import { NextResponse } from "next/server";
import { allow } from "@/lib/ratelimit";
import { parseLatLng, isMapShareUrl } from "@/lib/parseLatLng";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Resolves a SHORTENED map share link (maps.app.goo.gl, goo.gl, ...) to
// coordinates by following its redirect and reading the lat/lng out of where it
// lands. We never call the Google Maps API. SSRF-guarded: the input must be a
// recognised map-share host, so this cannot be used to probe arbitrary URLs, and
// the coordinates come only from the resolved URL/body, nothing else is returned.
export async function GET(req: Request) {
  if (!allow("geo-resolve", req, 20)) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  const raw = (new URL(req.url).searchParams.get("url") || "").trim();
  if (!raw || !isMapShareUrl(raw)) return NextResponse.json({ error: "unsupported_url" }, { status: 400 });

  // The link might already contain coordinates (a long Google URL); read those first.
  const direct = parseLatLng(raw);
  if (direct) return NextResponse.json(direct);

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    const r = await fetch(raw, {
      redirect: "follow",
      signal: controller.signal,
      headers: { "User-Agent": "SATMarkets/1.0 (satmarkets.sa)" },
      cache: "no-store",
    }).finally(() => clearTimeout(timer));

    // The resolved URL is the richest source (e.g. .../@lat,lng or ...!3d..!4d..).
    const fromUrl = parseLatLng(r.url);
    if (fromUrl) return NextResponse.json(fromUrl);

    // Fall back to scanning the returned HTML for the coordinate pattern.
    const text = (await r.text()).slice(0, 200000);
    const fromBody = parseLatLng(text);
    if (fromBody) return NextResponse.json(fromBody);

    return NextResponse.json({ error: "no_coordinates" }, { status: 404 });
  } catch {
    return NextResponse.json({ error: "resolve_failed" }, { status: 502 });
  }
}
