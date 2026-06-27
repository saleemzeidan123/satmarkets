import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Item = { label: string; sub: string; kind: string };

export async function GET(req: Request) {
  const q = (new URL(req.url).searchParams.get("q") || "").trim();
  if (q.length < 2) return NextResponse.json({ items: [] });
  try {
    const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&lang=en&limit=15&lat=24.7136&lon=46.6753`;
    const r = await fetch(url, { headers: { "User-Agent": "SATMarkets/1.0 (satmarkets.sa)" }, cache: "no-store" });
    if (!r.ok) return NextResponse.json({ items: [] });
    const j: any = await r.json();
    const seen = new Set<string>();
    const items: Item[] = [];
    for (const f of j.features || []) {
      const p = f.properties || {};
      if (p.countrycode !== "SA") continue;
      const name: string = p.name;
      if (!name) continue;
      const parts = [p.district, p.city, p.county, p.state].filter(
        (x: string, i: number, a: string[]) => x && x !== name && a.indexOf(x) === i
      );
      const sub = parts.slice(0, 2).join(", ");
      const key = (name + "|" + sub).toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      const ov = String(p.osm_value || p.type || "");
      const kind = /city|town|state|province/.test(ov)
        ? "city"
        : /suburb|neighbourhood|neighborhood|district|quarter|village/.test(ov)
        ? "district"
        : "place";
      items.push({ label: name, sub, kind });
      if (items.length >= 8) break;
    }
    return NextResponse.json({ items });
  } catch {
    return NextResponse.json({ items: [] });
  }
}
