"use client";
// COLOUR POLICY (decision D14 exception): every colour in this file is MapLibre GL
// paint (heatmap ramps, cluster/circle/line/fill colours, the asset-type category
// palette, the selected-ring rgba(), and symbol text/halo colours). MapLibre paint
// cannot resolve CSS custom properties, so these values are LITERAL, but they are
// sourced from ONE named place, src/theme/palette.ts, which mirrors the CSS tokens,
// rather than scattered inline hex (PKG-1B).
import { useEffect, useRef, useState } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import { photoFor } from "@/lib/photos";
import { getDictionary } from "@/i18n/getDictionary";
import { mapLocale } from "@/lib/mapLocale";
import { ASSET_COLORS as COLORS, BRAND, HEAT_RAMP, MAP } from "@/theme/palette";
import { formatInteger, formatRange, formatUnit, type Loc } from "@/lib/format";

export interface MapBuilding {
 id: string; name: string; place: string; asset: string; assetLabel: string;
 grade: string; size: number | null; lat: number; lng: number;
 band: number | null; bandLow: number | null; bandHigh: number | null; unit: string | null; listings: number;
 /**
  * ADV-1E. The sentence that must accompany this building's band, already in
  * the reader's language, or null when the band needs none.
  *
  * The map used to show a band for any row the table called `sufficient`, which
  * is a fact about sample size and not about whether SAT may publish what the
  * sample produced. The page now decides per row and sends only bands it may
  * show; a band it may show only as sample data arrives with this sentence, and
  * the sentence renders beside the number in both the rail card and the detail
  * panel, because a map has no single place a caption could sit and still be
  * about one building.
  */
 bandNote?: string | null;
}
const gradeFmt = (g: string) => (({ a_plus: "A+", a: "A", b: "B", c: "C" } as any)[g] || "");
// PKG-FIG2, finding 129. This branched on one unit key and spelled four
// literals, three of which disagreed with the table: the English lease unit used
// a middle dot against the canonical slash, and BOTH Arabic spellings used a
// slash where every other Arabic surface on the platform uses the middle dot, so
// the map read "ريال/م²/سنة" while the listing beneath it read "ريال/م²·سنة" for
// the same figure. A map that shows a band and a card that shows the same band
// were disagreeing about what the band is measured in.
//
// A null unit still falls back to the annual per-square-metre rate, which is
// what the branch did and what the index rows carry; the fallback is now stated
// once rather than implied by the shape of a ternary.
const unitFmt = (u: string | null, l: string) => formatUnit(u ?? "sar_sqm_year", (l === "ar" ? "ar" : "en") as Loc, "short");

type Mode = "pins" | "heat" | "zone";

function pointInPolygon(pt: [number, number], poly: [number, number][]) {
 let inside = false;
 for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
  const xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
  const intersect = ((yi > pt[1]) !== (yj > pt[1])) && (pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi);
  if (intersect) inside = !inside;
 }
 return inside;
}

export default function MapExplorer({ buildings, locale, t, assetOrder, assetLabels }: {
 buildings: MapBuilding[]; locale: "en" | "ar";
 t: { all: string; available: string; viewListings: string; rentBand: string; size: string; grade: string; sqm: string; noData: string; results: string; close: string; clusterUnit: string };
 assetOrder: string[]; assetLabels: Record<string, string>;
}) {
 const ar = locale === "ar";
 // PKG-FIG1, finding 125. Every figure on the map was a bare `toLocaleString()`
 // in a client component, so the band, the pin label and the selected building's
 // size all resolved their digits from the reader's device rather than from the
 // page. `sel.bandHigh ?? 0` separately invented a band ceiling of zero whenever
 // the high end was absent, which is a figure nobody published.
 const fig = (n: number) => formatInteger(Math.round(n), locale);
 const ref = useRef<HTMLDivElement>(null);
 const mapRef = useRef<any>(null);
 const [active, setActive] = useState<string>("all");
 const [sel, setSel] = useState<MapBuilding | null>(null);
 const [ready, setReady] = useState(false);
 const [mode, setMode] = useState<Mode>("pins");
 const [zoneCount, setZoneCount] = useState<number | null>(null);

 // mobile synced carousel
 const [inView, setInView] = useState<MapBuilding[]>([]);
 const [selId, setSelId] = useState<string | null>(null);
 const railRef = useRef<HTMLDivElement>(null);
 const selIdRef = useRef<string | null>(null);
 const inViewRef = useRef<MapBuilding[]>([]);
 const programmaticRef = useRef(false);
 const scrollTimerRef = useRef<any>(null);

 const modeRef = useRef<Mode>("pins");
 const activeRef = useRef<string>("all");
 const zonePtsRef = useRef<[number, number][]>([]);

 const L = getDictionary(locale).mapExplorer;

 function buildFC(list: MapBuilding[]) {
  return { type: "FeatureCollection", features: list.map((b) => ({
   type: "Feature", geometry: { type: "Point", coordinates: [b.lng, b.lat] },
   properties: { ...b, priceLabel: b.band != null ? formatInteger(Math.round(b.band), locale) : "" },
  })) };
 }
 const filtered = () => (activeRef.current === "all" ? buildings : buildings.filter((b) => b.asset === activeRef.current));

 // recompute the buildings inside the current viewport for the mobile carousel
 function refreshInView() {
  const map = mapRef.current;
  if (!map || modeRef.current !== "pins") { inViewRef.current = []; setInView([]); return; }
  let bounds: any; try { bounds = map.getBounds(); } catch { return; }
  const list = filtered().filter((b) => bounds.contains([b.lng, b.lat]));
  list.sort((a, c) => (c.listings - a.listings) || ((a.band ?? 1e15) - (c.band ?? 1e15)));
  const capped = list.slice(0, 40);
  inViewRef.current = capped;
  setInView(capped);
  if (selIdRef.current && !capped.some((b) => b.id === selIdRef.current)) selectBuilding(null, false);
 }

 // select a building: highlight its pin (via the sel source ring) and optionally pan to it
 function selectBuilding(id: string | null, pan: boolean) {
  selIdRef.current = id; setSelId(id);
  const map = mapRef.current;
  const b = id ? buildings.find((x) => x.id === id) : null;
  if (map && map.getSource && map.getSource("sel")) {
   map.getSource("sel").setData({ type: "FeatureCollection", features: b ? [{ type: "Feature", geometry: { type: "Point", coordinates: [b.lng, b.lat] }, properties: {} }] : [] });
  }
  if (pan && b && map) { programmaticRef.current = true; map.easeTo({ center: [b.lng, b.lat], duration: 500 }); }
 }

 // rail scrolled: snap-select the centered card and pan the map to it
 function onRailScroll() {
  const rail = railRef.current; if (!rail) return;
  if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
  scrollTimerRef.current = setTimeout(() => {
   const cx = rail.scrollLeft + rail.clientWidth / 2;
   let best: string | null = null, bd = 1e9;
   rail.querySelectorAll<HTMLElement>("[data-bid]").forEach((el) => {
    const c = el.offsetLeft + el.offsetWidth / 2; const d = Math.abs(c - cx);
    if (d < bd) { bd = d; best = el.getAttribute("data-bid"); }
   });
   if (best && best !== selIdRef.current) selectBuilding(best, true);
  }, 90);
 }

 function scrollRailTo(id: string) {
  const rail = railRef.current; if (!rail) return;
  const el = rail.querySelector<HTMLElement>(`[data-bid="${id}"]`);
  if (el) el.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
 }

 function recomputeZone() {
  const map = mapRef.current; if (!map || !map.getSource("zone")) return;
  const pts = zonePtsRef.current;
  const ring = pts.length >= 3 ? [...pts, pts[0]] : pts;
  map.getSource("zone").setData({ type: "FeatureCollection", features: [
   ...(pts.length >= 3 ? [{ type: "Feature", geometry: { type: "Polygon", coordinates: [ring] }, properties: {} }] : []),
   ...(pts.length >= 1 && pts.length < 3 ? [{ type: "Feature", geometry: { type: "LineString", coordinates: pts }, properties: {} }] : []),
   ...pts.map((p) => ({ type: "Feature", geometry: { type: "Point", coordinates: p }, properties: {} })),
  ] });
  if (pts.length >= 3) setZoneCount(filtered().filter((b) => pointInPolygon([b.lng, b.lat], pts)).length);
  else setZoneCount(null);
 }
 function clearZone() { zonePtsRef.current = []; setZoneCount(null); recomputeZone(); }

 useEffect(() => {
  let map: any; let ro: any; let cancelled = false; let hoverId: any = null;
  (async () => {
   const maplibregl = (await import("maplibre-gl")).default;
   try { const M:any = maplibregl; if (!M.__rtl) { M.__rtl = true; M.setRTLTextPlugin("https://unpkg.com/@mapbox/mapbox-gl-rtl-text@0.2.3/mapbox-gl-rtl-text.min.js", () => {}, true); } } catch {}
   if (cancelled || !ref.current) return;
   map = new maplibregl.Map({ container: ref.current, style: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
    center: [45.0, 24.5], zoom: 5.3, minZoom: 5, maxZoom: 17, locale: mapLocale(locale) });
   mapRef.current = map;
   ro = new ResizeObserver(() => { try { map.resize(); } catch {} }); if (ref.current) ro.observe(ref.current);
   map.addControl(new maplibregl.NavigationControl({ showCompass: false }), ar ? "top-left" : "top-right");

   // style.load, not load. Under maplibre 4.7.1 "load" never fires, so every source,
   // layer and setReady(true) below was unreachable and /map spun forever.
   map.on("style.load", () => {
    map.addSource("b", { type: "geojson", data: buildFC(buildings), cluster: true, clusterRadius: 46, clusterMaxZoom: 13, generateId: true });
    map.addSource("all", { type: "geojson", data: buildFC(buildings) });
    map.addSource("zone", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
    map.addSource("sel", { type: "geojson", data: { type: "FeatureCollection", features: [] } });

    // heat (hidden until heat mode)
    map.addLayer({ id: "heat", type: "heatmap", source: "all", layout: { visibility: "none" }, paint: {
     "heatmap-weight": ["interpolate", ["linear"], ["coalesce", ["get", "listings"], 0], 0, 0.5, 8, 1],
     "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 9, 0.9, 15, 1.4],
     "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 9, 22, 14, 50],
     "heatmap-opacity": 0.8,
     "heatmap-color": ["interpolate", ["linear"], ["heatmap-density"],
      0, "rgba(58,110,165,0)", 0.2, HEAT_RAMP[0], 0.4, HEAT_RAMP[1], 0.6, HEAT_RAMP[2], 0.8, HEAT_RAMP[3], 1, HEAT_RAMP[4]],
    }});

    // zone polygon
    map.addLayer({ id: "zone-fill", type: "fill", source: "zone", filter: ["==", "$type", "Polygon"], paint: { "fill-color": MAP.zoneFill, "fill-opacity": 0.12 }});
    map.addLayer({ id: "zone-line", type: "line", source: "zone", filter: ["!=", "$type", "Point"], paint: { "line-color": MAP.zoneLine, "line-width": 2, "line-dasharray": [2, 1.5] }});
    map.addLayer({ id: "zone-vtx", type: "circle", source: "zone", filter: ["==", "$type", "Point"], paint: { "circle-radius": 4, "circle-color": MAP.zoneLine, "circle-stroke-width": 2, "circle-stroke-color": MAP.pinStroke }});

    // clusters
    map.addLayer({ id: "cl-halo", type: "circle", source: "b", filter: ["has", "point_count"], paint: {
     "circle-color": MAP.cluster, "circle-opacity": 0.16, "circle-radius": ["step", ["get", "point_count"], 28, 5, 36, 15, 46] }});
    map.addLayer({ id: "cl", type: "circle", source: "b", filter: ["has", "point_count"], paint: {
     "circle-color": ["step", ["get", "point_count"], MAP.clusterSmall, 5, MAP.clusterMid, 15, MAP.clusterLarge],
     "circle-radius": ["step", ["get", "point_count"], 17, 5, 22, 15, 28], "circle-stroke-width": 3, "circle-stroke-color": MAP.pinStroke }});
    map.addLayer({ id: "cl-count", type: "symbol", source: "b", filter: ["has", "point_count"], layout: {
     "text-field": ["get", "point_count_abbreviated"], "text-font": ["Noto Sans Regular"], "text-size": 13 }, paint: { "text-color": MAP.labelHalo }});

    const colorMatch: any[] = ["match", ["get", "asset"]];
    Object.entries(COLORS).forEach(([k, v]) => colorMatch.push(k, v)); colorMatch.push(BRAND.clusterNeutral);

    // selected building ring
    map.addLayer({ id: "pt-sel", type: "circle", source: "sel", paint: {
     "circle-radius": ["interpolate", ["linear"], ["zoom"], 9, 12, 13, 17, 16, 24], "circle-color": "rgba(58,110,165,0.14)",
     "circle-stroke-width": 3, "circle-stroke-color": MAP.pin }});

    map.addLayer({ id: "pt-glow", type: "circle", source: "b", filter: ["!", ["has", "point_count"]], paint: {
     "circle-color": colorMatch, "circle-opacity": 0.16, "circle-radius": ["interpolate", ["linear"], ["zoom"], 9, 12, 13, 18, 16, 26] }});
    map.addLayer({ id: "pt", type: "circle", source: "b", filter: ["!", ["has", "point_count"]], paint: {
     "circle-color": colorMatch, "circle-radius": ["interpolate", ["linear"], ["zoom"], 9, 6.5, 13, 9, 16, 13],
     "circle-stroke-width": 2.5, "circle-stroke-color": MAP.pinStroke }});
    // LoopNet-style price label (zoomed in)
    map.addLayer({ id: "pt-price", type: "symbol", source: "b", minzoom: 12,
     filter: ["all", ["!", ["has", "point_count"]], ["!=", ["get", "priceLabel"], ""]], layout: {
     "text-field": ["get", "priceLabel"], "text-font": ["Noto Sans Regular"], "text-size": 11.5,
     "text-offset": [0, -1.5], "text-anchor": "bottom", "text-allow-overlap": false }, paint: {
     "text-color": MAP.labelInk, "text-halo-color": MAP.labelHalo, "text-halo-width": 1.6 }});
    map.addLayer({ id: "pt-hit", type: "circle", source: "b", filter: ["!", ["has", "point_count"]], paint: {
     "circle-color": MAP.hit, "circle-opacity": 0, "circle-radius": ["interpolate", ["linear"], ["zoom"], 9, 15, 13, 21, 16, 30] }});

    const tip = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 14, className: "satm-tip" });
    map.on("mousemove", "pt-hit", (e: any) => {
     if (modeRef.current !== "pins") return;
     map.getCanvas().style.cursor = "pointer";
     const f = e.features[0];
     if (hoverId !== null) map.setFeatureState({ source: "b", id: hoverId }, { hover: false });
     hoverId = f.id; map.setFeatureState({ source: "b", id: hoverId }, { hover: true });
     const p = f.properties;
     tip.setLngLat(f.geometry.coordinates).setHTML(`<div style="font:600 12px Inter,sans-serif;color:${BRAND.inkWarm}">${esc(p.name)}</div><div style="font:11px Inter,sans-serif;color:${BRAND.clusterNeutral}">${esc(p.assetLabel)}${p.priceLabel ? " · " + esc(p.priceLabel) : ""}</div>`).addTo(map);
    });
    map.on("mouseleave", "pt-hit", () => { map.getCanvas().style.cursor = ""; if (hoverId !== null) map.setFeatureState({ source: "b", id: hoverId }, { hover: false }); hoverId = null; tip.remove(); });
    map.on("click", "pt-hit", (e: any) => {
     if (modeRef.current === "zone") return;
     const p = e.features[0].properties;
     const b: MapBuilding = { ...p, size: p.size === "null" || p.size == null ? null : Number(p.size), band: p.band === "null" || p.band == null ? null : Number(p.band), bandLow: p.bandLow === "null" || p.bandLow == null ? null : Number(p.bandLow), bandHigh: p.bandHigh === "null" || p.bandHigh == null ? null : Number(p.bandHigh), bandNote: p.bandNote === "null" || p.bandNote == null || p.bandNote === "" ? null : String(p.bandNote), listings: Number(p.listings) || 0 };
     setSel(b);
     if (!inViewRef.current.some((x) => x.id === b.id)) {
      const full = buildings.find((x) => x.id === b.id);
      if (full) { inViewRef.current = [full, ...inViewRef.current].slice(0, 40); setInView(inViewRef.current); }
     }
     selectBuilding(b.id, false);
     setTimeout(() => scrollRailTo(b.id), 40);
    });
    map.on("click", "cl", (e: any) => {
     const f = map.queryRenderedFeatures(e.point, { layers: ["cl"] })[0];
     map.getSource("b").getClusterExpansionZoom(f.properties.cluster_id).then((z: number) => map.easeTo({ center: f.geometry.coordinates, zoom: Math.max(z + 0.4, map.getZoom() + 1.5), duration: 600 }));
    });
    map.on("mouseenter", "cl", () => map.getCanvas().style.cursor = "pointer");
    map.on("mouseleave", "cl", () => map.getCanvas().style.cursor = "");

    // zone drawing
    map.on("click", (e: any) => {
     if (modeRef.current !== "zone") return;
     zonePtsRef.current = [...zonePtsRef.current, [e.lngLat.lng, e.lngLat.lat]];
     recomputeZone();
    });

    // keep the mobile carousel in sync as the user moves the map (skip our own programmatic pans)
    map.on("moveend", () => {
     if (programmaticRef.current) { programmaticRef.current = false; return; }
     refreshInView();
    });

    try {
     const lons = buildings.map((b) => b.lng), lats = buildings.map((b) => b.lat);
     map.fitBounds([[Math.min(...lons), Math.min(...lats)], [Math.max(...lons), Math.max(...lats)]], { padding: 70, maxZoom: 12.5, duration: 0 });
    } catch {}
    setReady(true); setTimeout(() => { try { map.resize(); } catch {} refreshInView(); }, 120);
   });
  })();
  return () => { cancelled = true; if (ro) ro.disconnect(); if (map) map.remove(); };
 }, [buildings, locale]);

 // asset filter
 useEffect(() => {
  activeRef.current = active;
  const map = mapRef.current; if (!map || !map.getSource || !map.getSource("b")) return;
  map.getSource("b").setData(buildFC(filtered()));
  map.getSource("all").setData(buildFC(filtered()));
  if (modeRef.current === "zone") recomputeZone();
  else refreshInView();
 }, [active]);

 // mode switching
 useEffect(() => {
  modeRef.current = mode;
  const map = mapRef.current; if (!map || !map.getLayer || !map.getLayer("heat")) return;
  const pinLayers = ["cl-halo", "cl", "cl-count", "pt-sel", "pt-glow", "pt", "pt-price", "pt-hit"];
  const showPins = mode !== "heat";
  pinLayers.forEach((id) => { try { map.setLayoutProperty(id, "visibility", showPins ? "visible" : "none"); } catch {} });
  try { map.setLayoutProperty("heat", "visibility", mode === "heat" ? "visible" : "none"); } catch {}
  map.getCanvas().style.cursor = mode === "zone" ? "crosshair" : "";
  if (mode !== "zone") clearZone();
  if (mode !== "pins") { setSel(null); selectBuilding(null, false); inViewRef.current = []; setInView([]); }
  else refreshInView();
 }, [mode]);

 const shown = filtered().length;
 const side = ar ? "left" : "right";

 return (
  <div className="relative overflow-hidden rounded-2xl border border-line shadow-card">
   <style>{`.map-rail::-webkit-scrollbar{display:none}.map-rail{scrollbar-width:none}`}</style>
   <div ref={ref} className="h-[68vh] min-h-[440px] w-full bg-ivory-2" />

   {/* loading overlay */}
   {!ready && (
    <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 bg-ivory-2/80 backdrop-blur-sm">
     <div className="h-7 w-7 animate-spin rounded-full border-2 border-signal/30 border-t-signal" />
     <span className="text-[0.78125rem] text-charcoal/65">{L.loading}</span>
    </div>
   )}

   {/* top controls */}
   <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex flex-col gap-2 p-3">
    {/* mode segmented */}
    <div className="flex flex-wrap items-center gap-2">
     <div className="pointer-events-auto inline-flex rounded-full border border-line bg-white/95 p-0.5 shadow-sm backdrop-blur">
      {(["pins", "heat", "zone"] as Mode[]).map((m) => (
       <button key={m} onClick={() => setMode(m)} className={`rounded-full px-3 py-1 text-[0.75rem] transition ${mode === m ? "bg-signal text-white" : "text-charcoal/65 hover:text-charcoal"}`}>{L[m]}</button>
      ))}
     </div>
     {mode === "zone" && zoneCount != null && (
      <span className="pointer-events-auto rounded-full bg-signal px-3 py-1 text-[0.75rem] text-white shadow-sm">{zoneCount} {L.inZone}</span>
     )}
     {mode === "zone" && (
      <button onClick={clearZone} className="pointer-events-auto rounded-full border border-line bg-white/95 px-3 py-1 text-[0.75rem] text-charcoal/65 shadow-sm backdrop-blur hover:text-charcoal">{L.clear}</button>
     )}
    </div>
    {/* asset chips (hidden in zone draw to reduce clutter) */}
    {mode !== "zone" && (
     <div className="chip-rail map-rail pointer-events-auto flex items-center gap-1.5 overflow-x-auto lg:flex-wrap lg:overflow-visible [&>button]:shrink-0" style={{ maxWidth: "100%" }}>
      <button onClick={() => setActive("all")} className={`pointer-events-auto rounded-full border px-3 py-1 text-[0.75rem] shadow-sm backdrop-blur transition ${active === "all" ? "border-signal bg-signal text-white" : "border-line bg-white/90 text-charcoal/70 hover:border-signal/50"}`}>{t.all}</button>
      {assetOrder.map((a) => (
       <button key={a} onClick={() => setActive(a)} className={`pointer-events-auto flex items-center gap-1.5 rounded-full border px-3 py-1 text-[0.75rem] shadow-sm backdrop-blur transition ${active === a ? "border-signal bg-signal text-white" : "border-line bg-white/90 text-charcoal/70 hover:border-signal/50"}`}>
        <span className="inline-block h-2 w-2 rounded-full" style={{ background: COLORS[a] || BRAND.clusterNeutral }} />{assetLabels[a] || a}
       </button>
      ))}
     </div>
    )}
    {mode === "zone" && zoneCount == null && (
     <div className="pointer-events-none max-w-sm rounded-xl bg-charcoal/85 px-3 py-2 text-[0.75rem] leading-snug text-ivory backdrop-blur">{L.drawHint}</div>
    )}
   </div>

   {/* result count (desktop; on mobile the carousel implies the set) */}
   {ready && mode !== "zone" && (
    <div className="pointer-events-none absolute bottom-3 start-3 z-10 hidden rounded-full bg-charcoal/85 px-3 py-1 text-[0.6875rem] text-ivory backdrop-blur sm:block">{shown} {t.results}</div>
   )}

   {/* mobile synced carousel: swipe cards -> map pans, tap a pin -> rail scrolls */}
   {ready && mode === "pins" && inView.length > 0 && (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 sm:hidden">
     <div className="mx-3 mb-1.5 inline-flex rounded-full bg-charcoal/80 px-2.5 py-0.5 text-[0.625rem] text-ivory backdrop-blur">{L.swipeHint}</div>
     <div ref={railRef} onScroll={onRailScroll} className="map-rail pointer-events-auto flex snap-x snap-mandatory gap-2.5 overflow-x-auto px-3 pb-3" style={{ WebkitOverflowScrolling: "touch" }}>
      {inView.map((b) => {
       const on = b.id === selId;
       return (
        <article key={b.id} data-bid={b.id}
         onClick={(e) => { if ((e.target as HTMLElement).closest("a")) return; selectBuilding(b.id, true); scrollRailTo(b.id); }}
         className="w-[82%] max-w-[320px] shrink-0 snap-center cursor-pointer">
         <div className={`flex overflow-hidden rounded-2xl border bg-white shadow-lift transition ${on ? "border-signal ring-2 ring-signal/35" : "border-line"}`}>
          <img src={photoFor(b.asset, b.id)} alt="" className="h-[96px] w-[96px] shrink-0 object-cover" />
          <div className="min-w-0 flex-1 p-2.5">
           <div className="truncate font-display text-[0.875rem] leading-tight text-charcoal">{b.name}</div>
           <div className="mt-0.5 truncate text-[0.71875rem] text-charcoal/65">{b.place}{gradeFmt(b.grade) ? " · " + t.grade + " " + gradeFmt(b.grade) : ""}</div>
           {b.band != null ? (
            <div className="mt-1 flex items-baseline gap-1">
             <span className="font-display text-[1rem] text-charcoal">{fig(b.band)}</span>
             <span className="text-[0.625rem] text-charcoal/65">{unitFmt(b.unit, locale)}</span>
            </div>
           ) : (<div className="mt-1 text-[0.6875rem] text-charcoal/65">{t.noData}</div>)}
           {b.band != null && b.bandNote ? (
            <div className="mt-0.5 text-[0.625rem] leading-snug text-charcoal/65">{b.bandNote}</div>
           ) : null}
           <div className="mt-1 flex items-center justify-between">
            <span className="text-[0.6875rem] text-charcoal/70">{b.listings} {t.available}</span>
            <a href={`/${locale}/building/${b.id}`} className="text-[0.71875rem] font-medium text-signal">{t.viewListings} {locale === "ar" ? "←" : "→"}</a>
           </div>
          </div>
         </div>
        </article>
       );
      })}
     </div>
    </div>
   )}

   {/* detail panel (desktop) */}
   {sel && (
    <div className={`absolute bottom-3 z-20 hidden w-[330px] sm:block ${side === "right" ? "right-3" : "left-3"}`}>
     <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-lift">
      <div className="relative h-32">
       <img src={photoFor(sel.asset, sel.id)} alt="" className="h-full w-full object-cover" />
       <button onClick={() => setSel(null)} aria-label={t.close} className="absolute end-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur">×</button>
       <span className="absolute start-2 top-2 rounded-md px-2 py-0.5 text-[0.625rem] text-white" style={{ background: COLORS[sel.asset] || BRAND.clusterNeutral }}>{sel.assetLabel}</span>
      </div>
      <div className="p-4">
       <h3 className="font-display text-[1.0625rem] leading-snug text-charcoal">{sel.name}</h3>
       <div className="mt-1 text-[0.78125rem] text-charcoal/65">{sel.place}{sel.size ? " · " + fig(sel.size) + " " + t.sqm : ""}{gradeFmt(sel.grade) ? " · " + t.grade + " " + gradeFmt(sel.grade) : ""}</div>
       {sel.band != null ? (
        <div className="mt-3 rounded-xl border border-line bg-ivory-2/50 p-3">
         <div className="text-[0.625rem] uppercase tracking-wide text-charcoal/65">{t.rentBand}</div>
         <div className="mt-0.5 flex items-baseline gap-2">
          <span className="font-display text-2xl text-charcoal">{fig(sel.band)}</span>
          <span className="text-[0.6875rem] text-charcoal/65">{sel.bandLow != null && sel.bandHigh != null ? formatRange(sel.bandLow, sel.bandHigh, locale, 0) + " · " : ""}{unitFmt(sel.unit, locale)}</span>
         </div>
         {sel.bandNote ? <div className="mt-1 text-[0.6875rem] leading-snug text-charcoal/65">{sel.bandNote}</div> : null}
        </div>
       ) : (<div className="mt-3 rounded-xl border border-dashed border-line p-3 text-[0.75rem] text-charcoal/65">{t.noData}</div>)}
       <div className="mt-3 flex items-center justify-between">
        <span className="text-[0.78125rem] text-charcoal/70">{sel.listings} {t.available}</span>
        <a href={`/${locale}/building/${sel.id}`} className="text-[0.78125rem] font-medium text-signal hover:underline">{t.viewListings} {locale === "ar" ? "←" : "→"}</a>
       </div>
      </div>
     </div>
    </div>
   )}
  </div>
 );
}
function esc(s: string) { return String(s).replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
