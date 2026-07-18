"use client";
import { useEffect, useRef, useState } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import { nearestDistrict, type DistrictPoint } from "@/lib/nearestDistrict";
import { parseLatLng, isMapShareUrl } from "@/lib/parseLatLng";

// Lets a lister place the exact building: search, click the map, drag the pin, or
// type coordinates. The district is derived from the pin (nearest centroid), so
// the lister never hunts through a long dropdown and can place a building even in
// an area the district list does not name precisely. Coordinates are the source
// of truth; the district is a best-guess assignment for the Rent Index and search.

const STYLE = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";
const RIYADH: [number, number] = [46.6753, 24.7136];

export interface LocationValue { lat: number | null; lng: number | null; districtId: string | null }

export default function LocationPicker({ locale, districts, value, onChange }: {
  locale: "en" | "ar";
  districts: DistrictPoint[];
  value: LocationValue;
  onChange: (v: { lat: number; lng: number; districtId: string | null }) => void;
}) {
  const ar = locale === "ar";
  const t = (en: string, a: string) => (ar ? a : en);
  const mapEl = useRef<HTMLDivElement>(null);
  const mapRef = useRef<unknown>(null);
  const markerRef = useRef<unknown>(null);
  const [lat, setLat] = useState<number | null>(value.lat);
  const [lng, setLng] = useState<number | null>(value.lng);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Array<{ label: string; sub: string; lat: number; lng: number }>>([]);
  const [resolving, setResolving] = useState(false);

  const district = lat != null && lng != null ? nearestDistrict(lat, lng, districts) : null;

  // Central update: set state, move the marker, derive the district, bubble up.
  const place = (la: number, ln: number, fly: boolean) => {
    setLat(la); setLng(ln);
    const d = nearestDistrict(la, ln, districts);
    onChange({ lat: la, lng: ln, districtId: d?.id ?? null });
    const m = markerRef.current as { setLngLat: (c: [number, number]) => void } | null;
    if (m) m.setLngLat([ln, la]);
    const map = mapRef.current as { easeTo: (o: unknown) => void; getZoom: () => number } | null;
    if (map && fly) map.easeTo({ center: [ln, la], zoom: Math.max(map.getZoom(), 14) });
  };

  useEffect(() => {
    let cancelled = false;
    let map: { remove: () => void } | null = null;
    import("maplibre-gl").then((mod) => {
      if (cancelled || !mapEl.current) return;
      const maplibregl = ((mod as { default?: unknown }).default ?? mod) as any;
      const start: [number, number] = value.lng != null && value.lat != null ? [value.lng, value.lat] : RIYADH;
      const m = new maplibregl.Map({ container: mapEl.current, style: STYLE, center: start, zoom: value.lat != null ? 14 : 10, attributionControl: false });
      m.addControl(new maplibregl.NavigationControl({ showCompass: false }), ar ? "top-left" : "top-right");
      m.addControl(new maplibregl.AttributionControl({ compact: true }));
      mapRef.current = m;
      map = m;
      const marker = new maplibregl.Marker({ draggable: true, color: "#3A6EA5" }).setLngLat(start).addTo(m);
      markerRef.current = marker;
      marker.on("dragend", () => { const p = marker.getLngLat(); place(p.lat, p.lng, false); });
      m.on("click", (e: { lngLat: { lat: number; lng: number } }) => place(e.lngLat.lat, e.lngLat.lng, false));
    });
    return () => { cancelled = true; try { map?.remove(); } catch { /* ignore */ } };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The search box accepts three things: a place name (geocoded), a pasted Google
  // Maps link, or a bare "lat, lng" pair. A link or coordinates places the pin
  // directly; a shortened share link (maps.app.goo.gl) is resolved server-side.
  useEffect(() => {
    const s = q.trim();
    if (s.length < 2) { setResults([]); setResolving(false); return; }
    // Coordinates already present in the pasted text: place immediately.
    const direct = parseLatLng(s);
    if (direct) { setResults([]); setResolving(false); place(direct.lat, direct.lng, true); return; }
    const id = setTimeout(async () => {
      // A shortened map share link hides the coordinates behind a redirect.
      if (isMapShareUrl(s)) {
        setResolving(true);
        try {
          const r = await fetch(`/api/geo/resolve?url=${encodeURIComponent(s)}`);
          const j = await r.json();
          if (Number.isFinite(j.lat) && Number.isFinite(j.lng)) {
            setResults([]); setResolving(false); place(Number(j.lat), Number(j.lng), true); return;
          }
        } catch { /* fall through to place-name search */ }
        setResolving(false);
      }
      try {
        const r = await fetch(`/api/geocode?q=${encodeURIComponent(s)}`);
        const j = await r.json();
        setResults(Array.isArray(j.items) ? j.items : []);
      } catch { setResults([]); }
    }, 350);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const inp = "w-full rounded border border-charcoal/20 px-3 py-2";
  return (
    <div className="space-y-2">
      <div className="relative">
        <input className={inp} placeholder={t("Search, or paste a Google Maps link or coordinates", "ابحث، أو الصق رابط خرائط جوجل أو الإحداثيات")} value={q} onChange={(e) => setQ(e.target.value)} />
        {resolving && <p className="text-[11px] text-charcoal/45 mt-1">{t("Resolving the map link...", "جارٍ فتح رابط الخريطة...")}</p>}
        {results.length > 0 && (
          <div className="absolute z-10 mt-1 w-full rounded border border-line bg-white shadow max-h-56 overflow-auto">
            {results.map((r, i) => (
              <button type="button" key={i} className="block w-full text-left px-3 py-2 hover:bg-ivory-2 text-[13px]" onClick={() => { setQ(r.label); setResults([]); place(r.lat, r.lng, true); }}>
                <span className="font-medium">{r.label}</span>{r.sub ? <span className="text-charcoal/50"> · {r.sub}</span> : null}
              </button>
            ))}
          </div>
        )}
      </div>
      <div ref={mapEl} style={{ height: 260, borderRadius: 8, overflow: "hidden", border: "1px solid #dfe3e8" }} />
      <p className="text-[11px] text-charcoal/45">{t("Click the map or drag the pin to your building. The district is set from where you place it.", "انقر على الخريطة أو اسحب العلامة إلى المبنى، ويُحدَّد الحي من موقع العلامة.")}</p>
      <div className="flex gap-3">
        <input className={inp + " flex-1"} type="number" step="any" placeholder={t("Latitude", "خط العرض")} value={lat ?? ""}
          onChange={(e) => { const v = e.target.value === "" ? null : Number(e.target.value); setLat(v); if (v != null && Number.isFinite(v) && lng != null) place(v, lng, true); }} />
        <input className={inp + " flex-1"} type="number" step="any" placeholder={t("Longitude", "خط الطول")} value={lng ?? ""}
          onChange={(e) => { const v = e.target.value === "" ? null : Number(e.target.value); setLng(v); if (v != null && Number.isFinite(v) && lat != null) place(lat, v, true); }} />
      </div>
      <div className="text-[12px] text-charcoal/60">
        {district
          ? <>{t("District", "الحي")}: <span className="font-medium">{ar ? (district.name_ar || district.name_en) : district.name_en}</span>{district.city ? <span className="text-charcoal/45">, {district.city}</span> : null} <span className="text-charcoal/40">({t("from your pin", "من موقع العلامة")})</span></>
          : <span className="text-charcoal/45">{t("Place a pin to set the location.", "ضع علامة لتحديد الموقع.")}</span>}
      </div>
    </div>
  );
}
