"use client";
import { useEffect, useRef, useState } from "react";
import "maplibre-gl/dist/maplibre-gl.css";

// Split-view map for /listings. District bubbles carry the count of spaces in
// the current filter, positioned at the district centroid (honest district-level
// placement); exact building pins render only where a listing has a geocoded
// building. Clicking a bubble filters the list to that district.

export interface DistrictBubble { id: string; name: string; lat: number; lng: number; count: number }
export interface ExactPin { id: string; title: string; lat: number; lng: number; price: string }

export default function ListingsMap({ locale, bubbles, pins, baseParams }: {
  locale: "en" | "ar"; bubbles: DistrictBubble[]; pins: ExactPin[]; baseParams: string;
}) {
  const ar = locale === "ar";
  const ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let map: any; let ro: ResizeObserver | undefined;
    let cancelled = false;
    import("maplibre-gl").then((mod) => {
      if (cancelled || !ref.current) return;
      const maplibregl = (mod as any).default ?? mod;
      map = new maplibregl.Map({ container: ref.current, style: "https://tiles.openfreemap.org/styles/positron", center: [46.68, 24.71], zoom: 9.2, minZoom: 4.8, maxZoom: 16 });
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), ar ? "top-left" : "top-right");
      ro = new ResizeObserver(() => { try { map.resize(); } catch {} });
      ro.observe(ref.current);
      map.on("load", () => {
        map.addSource("d", { type: "geojson", data: { type: "FeatureCollection", features: bubbles.map((b) => ({ type: "Feature", geometry: { type: "Point", coordinates: [b.lng, b.lat] }, properties: { id: b.id, name: b.name, count: b.count } })) } });
        map.addLayer({ id: "d-c", type: "circle", source: "d", paint: { "circle-color": "#3A6EA5", "circle-opacity": 0.85, "circle-radius": ["interpolate", ["linear"], ["get", "count"], 1, 13, 12, 22, 30, 30], "circle-stroke-width": 2, "circle-stroke-color": "#ffffff" } });
        map.addLayer({ id: "d-n", type: "symbol", source: "d", layout: { "text-field": ["to-string", ["get", "count"]], "text-size": 12, "text-font": ["Noto Sans Regular"] }, paint: { "text-color": "#ffffff" } });
        map.addSource("p", { type: "geojson", data: { type: "FeatureCollection", features: pins.map((p) => ({ type: "Feature", geometry: { type: "Point", coordinates: [p.lng, p.lat] }, properties: { id: p.id, title: p.title, price: p.price } })) } });
        map.addLayer({ id: "p-c", type: "circle", source: "p", paint: { "circle-color": "#1F8A5B", "circle-radius": 5.5, "circle-stroke-width": 1.5, "circle-stroke-color": "#ffffff" } });
        const tip = new maplibregl.Popup({ closeButton: false, offset: 12 });
        map.on("click", "d-c", (e: any) => {
          const f = e.features?.[0]; if (!f) return;
          const sp = new URLSearchParams(baseParams); sp.set("district", f.properties.id);
          window.location.href = `/${locale}/listings?${sp.toString()}`;
        });
        map.on("click", "p-c", (e: any) => {
          const f = e.features?.[0]; if (!f) return;
          window.location.href = `/${locale}/listings/${f.properties.id}`;
        });
        map.on("mouseenter", "d-c", (e: any) => {
          map.getCanvas().style.cursor = "pointer";
          const f = e.features?.[0]; if (!f) return;
          tip.setLngLat(e.lngLat).setHTML(`<div style="font:600 12px var(--sans,sans-serif);color:#14181B">${f.properties.name}</div><div style="font:11px var(--sans,sans-serif);color:#5B6470">${f.properties.count} ${ar ? "مساحة، انقر للتصفية" : "spaces, click to filter"}</div>`).addTo(map);
        });
        map.on("mouseleave", "d-c", () => { map.getCanvas().style.cursor = ""; tip.remove(); });
        map.on("mouseenter", "p-c", () => { map.getCanvas().style.cursor = "pointer"; });
        map.on("mouseleave", "p-c", () => { map.getCanvas().style.cursor = ""; });
      });
    });
    return () => { cancelled = true; try { ro?.disconnect(); map?.remove(); } catch {} };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <div className={"lst-map-panel" + (open ? " open" : "")}>
        <div ref={ref} style={{ position: "absolute", inset: 0 }} />
        <button type="button" className="btn primary lst-map-close" onClick={() => setOpen(false)}>{ar ? "إغلاق الخريطة" : "Close map"}</button>
        <span className="tag" style={{ position: "absolute", insetInlineStart: 10, bottom: 10, background: "rgba(255,255,255,.92)" }}>{ar ? "فقاعات على مستوى الموقع، ونقاط خضراء لمبانٍ محددة" : "Location-level bubbles, green dots are exact buildings"}</span>
      </div>
      <button type="button" className="btn primary lst-map-toggle" onClick={() => setOpen(true)}>{ar ? "عرض الخريطة" : "Show map"}</button>
    </>
  );
}
