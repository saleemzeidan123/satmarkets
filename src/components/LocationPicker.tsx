"use client";
import { useEffect, useRef, useState } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import { nearestLocation, locationById, type LocationPoint } from "@/lib/nearestLocation";
import { parseLatLng, isMapShareUrl } from "@/lib/parseLatLng";
import { placeName } from "@/lib/displayName";
import { cityLabel } from "@/lib/labels";
import { kindLabel } from "@/lib/locationKind";
import { assessLocationConsistency } from "@/lib/locationConsistency";

// Lets a lister place the exact building: search, click the map, drag the pin, or
// type coordinates. Coordinates are the source of truth.
//
// FINDING 137 CHANGED WHAT THIS COMPONENT IS ALLOWED TO DO WITH THEM.
//
// It used to derive the location from the pin on every move and overwrite
// whatever was on file, and it labelled the result "District" whatever it was.
// Both were wrong. The nearest row to a pin is frequently a development, and Law
// 7 says a development is never a district, so the label now comes from
// `locationKind.ts`. And a value already on file is a fact the lister or SAT
// recorded, so a later pin may OFFER to replace it but may never do so silently:
// the offer is a button the lister presses. Only an empty location is filled
// from the pin, which is a first answer, not a rewrite.
//
// SAT holds one point per location and no boundaries, so nothing here is ever
// presented as a confirmed match. `locationConsistency.ts` carries that rule and
// the words for it.

const STYLE = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";
const RIYADH: [number, number] = [46.6753, 24.7136];

export interface LocationValue { lat: number | null; lng: number | null; districtId: string | null }

export default function LocationPicker({ locale, districts, value, onChange }: {
  locale: "en" | "ar";
  districts: LocationPoint[];
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

  const recorded = locationById(value.districtId, districts);
  const nearest = lat != null && lng != null ? nearestLocation(lat, lng, districts) : null;
  const shown = recorded ?? nearest;
  const consistency = assessLocationConsistency({ lat, lng, recorded, nearest });
  const alternative = recorded && nearest && nearest.id !== recorded.id ? nearest : null;

  const named = (row: LocationPoint) => {
    const n = placeName(row, ar ? "ar" : "en");
    const k = kindLabel(row.kind, ar);
    return n ? `${n} (${k})` : k;
  };

  // Central update: set state, move the marker, bubble up. The recorded location
  // is carried through untouched; only an empty one is answered from the pin.
  const place = (la: number, ln: number, fly: boolean) => {
    setLat(la); setLng(ln);
    const keep = value.districtId ? value.districtId : nearestLocation(la, ln, districts)?.id ?? null;
    onChange({ lat: la, lng: ln, districtId: keep });
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
      // Arabic street labels on the Saudi basemap need the RTL shaping plugin in
      // every locale, or they render as disconnected, reversed glyphs. Lazy and
      // registered once globally.
      try { const M: any = maplibregl; if (!M.__rtl) { M.__rtl = true; M.setRTLTextPlugin("https://unpkg.com/@mapbox/mapbox-gl-rtl-text@0.2.3/mapbox-gl-rtl-text.min.js", () => {}, true); } } catch {}
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
      <p className="text-[11px] text-charcoal/45">{t("Click the map or drag the pin to your building. If no location is on file yet, the closest one is offered from your pin. It is a best match, not a confirmed boundary.", "انقر على الخريطة أو اسحب العلامة إلى المبنى. إذا لم يكن هناك موقع مسجّل بعد، يُقترح أقرب موقع من علامتك، وهو أقرب تطابق وليس حدوداً مؤكدة.")}</p>
      <div className="flex gap-3">
        <input className={inp + " flex-1"} type="number" step="any" placeholder={t("Latitude", "خط العرض")} value={lat ?? ""}
          onChange={(e) => { const v = e.target.value === "" ? null : Number(e.target.value); setLat(v); if (v != null && Number.isFinite(v) && lng != null) place(v, lng, true); }} />
        <input className={inp + " flex-1"} type="number" step="any" placeholder={t("Longitude", "خط الطول")} value={lng ?? ""}
          onChange={(e) => { const v = e.target.value === "" ? null : Number(e.target.value); setLng(v); if (v != null && Number.isFinite(v) && lat != null) place(lat, v, true); }} />
      </div>
      <div className="text-[12px] text-charcoal/60">
        {shown
          ? <>{kindLabel(shown.kind, ar)}: <span className="font-medium">{placeName(shown, ar ? "ar" : "en")}</span>{shown.city ? <span className="text-charcoal/45">, {cityLabel(shown.city, ar ? "ar" : "en")}</span> : null} <span className="text-charcoal/40">({recorded ? t("on file", "المسجّل") : t("from your pin", "من موقع العلامة")})</span></>
          : <span className="text-charcoal/45">{t("Place a pin to set the location.", "ضع علامة لتحديد الموقع.")}</span>}
      </div>

      {consistency.verdict === "contradicted" && (
        <p role="status" className="text-[12px] rounded border border-charcoal/25 px-3 py-2 leading-relaxed">
          {ar ? consistency.statement_ar : consistency.statement_en}{" "}
          {t("Move the pin, choose the right location, or leave it for SAT to review.", "حرّك العلامة، أو اختر الموقع الصحيح، أو اتركه لمراجعة سات.")}
        </p>
      )}

      {alternative && recorded && (
        <div className="text-[12px] rounded border border-charcoal/15 px-3 py-2 leading-relaxed">
          <p className="text-charcoal/70">
            {ar
              ? `أقرب موقع إلى علامتك هو ${named(alternative)}. هذا العرض يسجّل ${named(recorded)}، ولم يُغيَّر.`
              : `Your pin is closest to ${named(alternative)}. This listing records ${named(recorded)}, and that has not been changed.`}
          </p>
          <button
            type="button"
            className="mt-2 min-h-[44px] rounded border border-harbor px-3 text-harbor hover:bg-harbor/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-harbor focus-visible:ring-offset-2"
            onClick={() => { if (lat != null && lng != null) onChange({ lat, lng, districtId: alternative.id }); }}
          >
            {ar ? `استخدم ${placeName(alternative, "ar")} بدلاً منه` : `Use ${placeName(alternative, "en")} instead`}
          </button>
        </div>
      )}
    </div>
  );
}
