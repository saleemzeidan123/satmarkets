import { NextResponse } from "next/server";
import { allow } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Free-form location search that returns COORDINATES, for the listing location
// picker. The existing /api/places endpoint returns labels only (it optimizes for
// district autocomplete); this one returns lat/lng so the map pin can jump to a
// searched place. Backed by Photon (komoot), which includes geometry and needs no
// key, and is filtered to Saudi Arabia.
type GeoItem = { label: string; sub: string; lat: number; lng: number };

export async function GET(req: Request) {
  if (!allow("geocode", req, 30)) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  const q = (new URL(req.url).searchParams.get("q") || "").trim();
  if (q.length < 2) return NextResponse.json({ items: [] });

  try {
    const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&lang=en&limit=15&lat=24.7136&lon=46.6753`;
    const r = await fetch(url, { headers: { "User-Agent": "SATMarkets/1.0 (+https://github.com/saleemzeidan123/satmarkets)" }, cache: "no-store" });
    if (!r.ok) return NextResponse.json({ items: [] });
    const j: { features?: Array<{ properties?: Record<string, unknown>; geometry?: { coordinates?: number[] } }> } = await r.json();
    const seen = new Set<string>();
    const items: GeoItem[] = [];
    for (const feat of j.features || []) {
      const pr = (feat.properties || {}) as Record<string, unknown>;
      if (pr.countrycode !== "SA") continue;
      const coords = feat.geometry?.coordinates;
      if (!coords || coords.length < 2) continue;
      const lng = Number(coords[0]);
      const lat = Number(coords[1]);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
      const name = String(pr.name ?? "");
      if (!name) continue;
      const parts = [pr.district, pr.city, pr.county, pr.state]
        .map((x) => (x ? String(x) : ""))
        .filter((x, i, a) => x && x !== name && a.indexOf(x) === i);
      const sub = parts.slice(0, 2).join(", ");
      const key = (name + "|" + sub).toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      items.push({ label: name, sub, lat, lng });
      if (items.length >= 8) break;
    }
    return NextResponse.json({ items });
  } catch {
    return NextResponse.json({ items: [] });
  }
}
