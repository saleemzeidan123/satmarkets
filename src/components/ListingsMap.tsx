"use client";
import { useEffect, useRef, useState } from "react";
import "maplibre-gl/dist/maplibre-gl.css";

// Split-view map for /listings. District bubbles carry the count of spaces in
// the current filter, positioned at the district centroid (honest district-level
// placement); exact building pins render only where a listing has a geocoded
// building. Clicking a bubble filters the list to that district.
// Reliability: a loading and error state so the panel is never a bare grey box,
// and a fallback basemap style if the primary tiles do not load.

export interface DistrictBubble { id: string; name: string; lat: number; lng: number; count: number }
export interface ExactPin { id: string; title: string; lat: number; lng: number; price: string }

const PRIMARY_STYLE = "https://tiles.openfreemap.org/styles/positron";
const FALLBACK_STYLE = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";

export default function ListingsMap({ locale, bubbles, pins, baseParams }: {
  locale: "en" | "ar"; bubbles: DistrictBubble[]; pins: ExactPin[]; baseParams: string;
}) {
  const ar = locale === "ar";
  const ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let map: any; let ro: ResizeObserver | undefined;
    let cancelled = false; let triedFallback = false; let ready = false;

    const addData = (m: any) => {
      if (m.getSource("d")) return;
      m.addSource("d", { type: "geojson", data: { type: "FeatureCollection", features: bubbles.map((b) => ({ type: "Feature", geometry: { type: "Point", coordinates: [b.lng, b.lat] }, properties: { id: b.id, name: b.name, count: b.count } })) } });
      m.addLayer({ id: "d-c", type: "circle", source: "d", paint: { "circle-color": "#3A6EA5", "circle-opacity": 0.85, "circle-radius": ["interpolate", ["linear"], ["get", "count"], 1, 13, 12, 22, 30, 30], "circle-stroke-width": 2, "circle-stroke-color": "#ffffff" } });
      m.addLayer({ id: "d-n", type: "symbol", source: "d", layout: { "text-field": ["to-string", ["get", "count"]], "text-size": 12, "text-font": ["Noto Sans Regular"] }, paint: { "text-color": "#ffffff" } });
      m.addSource("p", { type: "geojson", data: { type: "FeatureCollection", features: pins.map((p) => ({ type: "Feature", geometry: { type: "Point", coordinates: [p.lng, p.lat] }, properties: { id: p.id, title: p.title, price: p.price } })) } });
      m.addLayer({ id: "p-c", type: "circle", source: "p", paint: { "circle-color": "#1F8A5B", "circle-radius": 5.5, "circle-stroke-width": 1.5, "circle-stroke-color": "#ffffff" } });
    };

    const wire = (m: any, maplibregl: any) => {
      const tip = new maplibregl.Popup({ closeButton: false, offset: 12 });
      m.on("click", "d-c", (e: any) => { const f = e.features?.[0]; if (!f) return; const sp = new URLSearchParams(baseParams); sp.set("district", f.properties.id); window.location.href = `/${locale}/listings?${sp.toString()}`; });
      m.on("click", "p-c", (e: any) => { const f = e.features?.[0]; if (!f) return; window.location.href = `/${locale}/listings/${f.properties.id}`; });
      m.on("mouseenter", "d-c", (e: any) => { m.getCanvas().style.cursor = "pointer"; const f = e.features?.[0]; if (!f) return; tip.setLngLat(e.lngLat).setHTML(`<div style="font:600 12px var(--sans,sans-serif);color:#14181B">${f.properties.name}</div><div style="font:11px var(--sans,sans-serif);color:#5B6470">${f.properties.count} ${ar ? "مساحة، انقر للتصفية" : "spaces, click to filter"}</div>`).addTo(m); });
      m.on("mouseleave", "d-c", () => { m.getCanvas().style.cursor = ""; tip.remove(); });
      m.on("mouseenter", "p-c", () => { m.getCanvas().style.cursor = "pointer"; });
      m.on("mouseleave", "p-c", () => { m.getCanvas().style.cursor = ""; });
    };

    import("maplibre-gl").then((mod) => {
      if (cancelled || !ref.current) return;
      const maplibregl = (mod as any).default ?? mod;
      map = new maplibregl.Map({ container: ref.current, style: PRIMARY_STYLE, center: [46.68, 24.71], zoom: 9.2, minZoom: 4.8, maxZoom: 16 });
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), ar ? "top-left" : "top-right");
      ro = new ResizeObserver(() => { try { map.resize(); } catch {} });
      ro.observe(ref.current);
      [80, 300, 900, 2000].forEach((d) => setTimeout(() => { try { map.resize(); } catch {} }, d));

      const onReady = () => {
        if (ready || cancelled) return; ready = true;
        setStatus("ready");
        [60, 400].forEach((d) => setTimeout(() => { try { map.resize(); } catch {} }, d));
        try { addData(map); wire(map, maplibregl); } catch {}
      };
      map.on("load", onReady);

      const swapToFallback = () => {
        if (triedFallback || ready || cancelled) return;
        triedFallback = true;
        try {
          map.once("style.load", () => { if (cancelled) return; ready = true; setStatus("ready"); try { map.resize(); addData(map); } catch {} });
          map.setStyle(FALLBACK_STYLE);
        } catch { if (!cancelled) setStatus("error"); }
      };

      const failTimer = setTimeout(swapToFallback, 6000);
      map.on("load", () => clearTimeout(failTimer));
      map.on("error", () => { if (ready || cancelled) return; if (!triedFallback) swapToFallback(); else setStatus("error"); });
    }).catch(() => { if (!cancelled) setStatus("error"); });

    return () => { cancelled = true; try { ro?.disconnect(); map?.remove(); } catch {} };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <div className={"lst-map-panel" + (open ? " open" : "")}>
        <div ref={ref} style={{ position: "absolute", inset: 0 }} />
        {status !== "ready" && (
          <div aria-live="polite" style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 6, background: "var(--cool)", color: "var(--slate)", pointerEvents: "none", padding: 20, textAlign: "center" }}>
            <span className="mono" style={{ fontSize: 11, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--slate-2)" }}>{status === "error" ? (ar ? "الخريطة غير متاحة" : "Map unavailable") : (ar ? "يحمّل الخريطة" : "Loading map")}</span>
            <span style={{ fontSize: 12.5, maxWidth: 240 }}>{status === "error" ? (ar ? "تصفّح القائمة، وستعود الخريطة قريباً." : "Browse the list, the map will return shortly.") : (ar ? "لحظة." : "One moment.")}</span>
          </div>
        )}
        <button type="button" className="btn primary lst-map-close" onClick={() => setOpen(false)}>{ar ? "إغلاق الخريطة" : "Close map"}</button>
        <span className="tag" style={{ position: "absolute", insetInlineStart: 10, bottom: 10, background: "rgba(255,255,255,.92)" }}>{ar ? "فقاعات على مستوى الموقع، ونقاط خضراء لمبانٍ محددة" : "Location-level bubbles, green dots are exact buildings"}</span>
      </div>
      <button type="button" className="btn primary lst-map-toggle" onClick={() => setOpen(true)}>{ar ? "عرض الخريطة" : "Show map"}</button>
    </>
  );
}
