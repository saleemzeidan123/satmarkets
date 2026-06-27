import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Item = { label: string; sub: string; kind: string };

const GKEY = process.env.GOOGLE_MAPS_API_KEY || process.env.google_places_key || "";
const MBOX = process.env.MAPBOX_TOKEN || process.env.mapbox_token || "";

async function google(q: string): Promise<Item[] | null> {
  if (!GKEY) return null;
  try {
    const r = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Goog-Api-Key": GKEY },
      body: JSON.stringify({ input: q, includedRegionCodes: ["sa"], languageCode: "en" }),
      cache: "no-store",
    });
    if (!r.ok) return null;
    const j: any = await r.json();
    const out: Item[] = [];
    for (const s of j.suggestions || []) {
      const pp = s.placePrediction;
      if (!pp) continue;
      const label = pp.structuredFormat?.mainText?.text || pp.text?.text;
      if (!label) continue;
      let sub = pp.structuredFormat?.secondaryText?.text || "";
      sub = sub.replace(/,?\s*(Saudi Arabia|السعودية)$/i, "").trim();
      const types: string[] = pp.types || [];
      const kind = types.some((t) => /locality|administrative_area|country/.test(t))
        ? "city"
        : types.some((t) => /sublocality|neighborhood/.test(t))
        ? "district"
        : "place";
      out.push({ label, sub, kind });
      if (out.length >= 8) break;
    }
    return out;
  } catch {
    return null;
  }
}

async function mapbox(q: string): Promise<Item[] | null> {
  if (!MBOX) return null;
  try {
    const g: any = globalThis as any;
    const session =
      g.crypto && g.crypto.randomUUID ? g.crypto.randomUUID() : "sat-" + Math.random().toString(36).slice(2);
    const url =
      `https://api.mapbox.com/search/searchbox/v1/suggest?q=${encodeURIComponent(q)}` +
      `&access_token=${MBOX}&language=en&limit=8&country=sa` +
      `&proximity=46.6753,24.7136&session_token=${session}`;
    const r = await fetch(url, { cache: "no-store" });
    if (!r.ok) return null;
    const j: any = await r.json();
    const out: Item[] = [];
    for (const sg of j.suggestions || []) {
      const label = sg.name as string;
      if (!label) continue;
      let sub = String(sg.place_formatted || sg.address || "");
      sub = sub.replace(/,?\s*(Saudi Arabia|السعودية)$/i, "").trim();
      const ft = String(sg.feature_type || "");
      const kind = /place|locality|region|country/.test(ft)
        ? "city"
        : /neighborhood|district|postcode|locality/.test(ft)
        ? "district"
        : "place";
      out.push({ label, sub, kind });
      if (out.length >= 8) break;
    }
    return out;
  } catch {
    return null;
  }
}

async function photon(q: string): Promise<Item[]> {
  try {
    const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&lang=en&limit=15&lat=24.7136&lon=46.6753`;
    const r = await fetch(url, { headers: { "User-Agent": "SATMarkets/1.0 (satmarkets.sa)" }, cache: "no-store" });
    if (!r.ok) return [];
    const j: any = await r.json();
    const seen = new Set<string>();
    const items: Item[] = [];
    for (const f of j.features || []) {
      const pr = f.properties || {};
      if (pr.countrycode !== "SA") continue;
      const name: string = pr.name;
      if (!name) continue;
      const parts = [pr.district, pr.city, pr.county, pr.state].filter(
        (x: string, i: number, a: string[]) => x && x !== name && a.indexOf(x) === i
      );
      const sub = parts.slice(0, 2).join(", ");
      const key = (name + "|" + sub).toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      const ov = String(pr.osm_value || pr.type || "");
      const kind = /city|town|state|province/.test(ov)
        ? "city"
        : /suburb|neighbourhood|neighborhood|district|quarter|village/.test(ov)
        ? "district"
        : "place";
      items.push({ label: name, sub, kind });
      if (items.length >= 8) break;
    }
    return items;
  } catch {
    return [];
  }
}

export async function GET(req: Request) {
  const q = (new URL(req.url).searchParams.get("q") || "").trim();
  if (q.length < 2) return NextResponse.json({ items: [] });
  const g = await google(q);
  if (g && g.length) return NextResponse.json({ items: g, src: "google" });
  const m = await mapbox(q);
  if (m && m.length) return NextResponse.json({ items: m, src: "mapbox" });
  const items = await photon(q);
  return NextResponse.json({ items, src: GKEY || MBOX ? "osm_fallback" : "osm" });
}
