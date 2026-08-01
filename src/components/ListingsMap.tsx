"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import "maplibre-gl/dist/maplibre-gl.css";
import { getDictionary } from "@/i18n/getDictionary";
// MapLibre paint cannot read CSS custom properties; these values come from the
// central palette module (mirrors the CSS tokens) rather than inline hex (PKG-1B).
import { BRAND, MAP } from "@/theme/palette";

// Split-view map for /listings. District bubbles carry the count of spaces in
// the current filter, positioned at the district centroid (honest district-level
// placement); exact building pins render only where a listing has a geocoded
// building. Clicking a bubble filters the list to that district.
// Reliability: a loading and error state so the panel is never a bare grey box,
// and a fallback basemap style if the primary tiles do not load.
// Booking-style link: hovering a listing card rings its building pin, and
// hovering a pin highlights and scrolls to the matching card (both by listing id).

export interface DistrictBubble { id: string; name: string; lat: number; lng: number; count: number }
export interface ExactPin { id: string; title: string; lat: number; lng: number; price: string }

// Basemap. Carto positron is primary because it actually renders under maplibre 4.7.1.
// OpenFreeMap positron fetches its tiles (200) but paints nothing and never reaches
// isStyleLoaded(), so "load" and "idle" never fire. Kept only as a last-resort fallback.
const PRIMARY_STYLE = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";
const FALLBACK_STYLE = "https://tiles.openfreemap.org/styles/positron";

export default function ListingsMap({ locale, bubbles, pins, baseParams, initialBbox, selectedDistrict }: {
  locale: "en" | "ar"; bubbles: DistrictBubble[]; pins: ExactPin[]; baseParams: string; initialBbox?: number[]; selectedDistrict?: string | null;
}) {
  const ar = locale === "ar";
  const t2 = getDictionary(ar ? "ar" : "en").listingsMap;
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const mapRef = useRef<any>(null);
  const readyRef = useRef(false);
  const selectedRef = useRef<string | null>(null);
  const [moved, setMoved] = useState(false);
  /* ELITE-4 J3-3 / J3-5: refs for the keyboard equivalents of the canvas marks and
     for the dialog behaviour of the full-screen panel below 1080px. */
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const applyRef = useRef<((m: any, id: string | null) => void) | null>(null);
  // Names for the parts of the map that exist only on the canvas. Local and inline,
  // in the pattern this file already uses for the legend below.
  const t3 = ar
    ? { mapRegion: "خريطة المساحات المعروضة", districtList: "الأحياء على الخريطة", pinList: "المباني على الخريطة", spaces: "مساحة" }
    : { mapRegion: "Map of listed spaces", districtList: "Districts on the map", pinList: "Buildings on the map", spaces: "spaces" };

  useEffect(() => {
    let map: any; let ro: ResizeObserver | undefined;
    let cancelled = false; let triedFallback = false; let ready = false;
    selectedRef.current = selectedDistrict ?? null;

    const pinById = new Map<string, [number, number]>(pins.map((p) => [p.id, [p.lng, p.lat]]));
    const EMPTY = { type: "FeatureCollection", features: [] as any[] };
    const ringFC = (co: [number, number]) => ({ type: "FeatureCollection", features: [{ type: "Feature", geometry: { type: "Point", coordinates: co }, properties: {} }] });
    let hoverCard: Element | null = null;
    const setRing = (co: [number, number] | null) => { if (map && map.getSource && map.getSource("hl")) map.getSource("hl").setData((co ? ringFC(co) : EMPTY) as any); };
    const cardEl = (id: string) => document.querySelector<HTMLElement>('.listing[data-lid="' + id + '"]');

    const onOver = (e: any) => {
      const c = e.target && e.target.closest ? e.target.closest(".listing[data-lid]") : null;
      if (!c || c === hoverCard) return;
      hoverCard = c;
      const id = c.getAttribute("data-lid");
      const co = id ? pinById.get(id) : undefined;
      setRing(co ?? null);
    };
    const onOut = (e: any) => {
      if (!hoverCard) return;
      const to = e.relatedTarget;
      if (to && to.closest && to.closest(".listing[data-lid]") === hoverCard) return;
      hoverCard = null; setRing(null);
    };

    const bubbleFC = () => ({ type: "FeatureCollection", features: bubbles.map((b) => ({ type: "Feature", id: b.id, geometry: { type: "Point", coordinates: [b.lng, b.lat] }, properties: { id: b.id, name: b.name, count: b.count } })) });
    const pinFC = () => ({ type: "FeatureCollection", features: pins.map((p) => ({ type: "Feature", id: p.id, geometry: { type: "Point", coordinates: [p.lng, p.lat] }, properties: { id: p.id, title: p.title, price: p.price } })) });
    // Radius the bubble scales by count; larger minimum (16) so small districts are
    // still an easy target. The hit layer below reuses this plus a padding.
    const RADIUS = ["interpolate", ["linear"], ["get", "count"], 1, 16, 12, 24, 30, 34];

    const addData = (m: any) => {
      if (m.getSource("d")) return;
      // Zoom-gated crossfade: district bubbles OWN the overview and fade out as the
      // user drills in (maxzoom 14.5), while exact building pins are hidden at overview
      // zoom and fade IN past z12. So the two mark systems never fight for the same
      // pixel: bubbles above ~z13, pins below. This is the real de-overlap.
      const D_FADE = ["interpolate", ["linear"], ["zoom"], 12.5, 0.9, 14, 0];
      const P_FADE = ["interpolate", ["linear"], ["zoom"], 12, 0, 13.5, 1];
      // promoteId lets feature-state (selected ring) key off the district id.
      m.addSource("d", { type: "geojson", promoteId: "id", data: bubbleFC() as any });
      m.addLayer({ id: "d-c", type: "circle", source: "d", maxzoom: 14.5, paint: {
        "circle-color": ["case", ["boolean", ["feature-state", "selected"], false], MAP.pinSelected, MAP.pin],
        "circle-opacity": D_FADE as any,
        "circle-radius": RADIUS as any,
        "circle-stroke-width": ["case", ["boolean", ["feature-state", "selected"], false], 3.5, 2],
        "circle-stroke-color": ["case", ["boolean", ["feature-state", "selected"], false], MAP.pinSelectedStroke, MAP.pinStroke],
        "circle-stroke-opacity": D_FADE as any,
      } });
      m.addLayer({ id: "d-n", type: "symbol", source: "d", maxzoom: 14.5, layout: { "text-field": ["to-string", ["get", "count"]], "text-size": 12, "text-font": ["Noto Sans Regular"] }, paint: { "text-color": MAP.pinStroke, "text-opacity": D_FADE as any } });
      // Transparent padded hit target on top, so clicks/hover land on a generous area
      // even though the visible disc is smaller. Events bind to this layer.
      m.addLayer({ id: "d-hit", type: "circle", source: "d", maxzoom: 14.5, paint: { "circle-color": MAP.hit, "circle-opacity": 0, "circle-radius": ["+", RADIUS as any, 10] } });

      m.addSource("p", { type: "geojson", promoteId: "id", data: pinFC() as any });
      m.addSource("hl", { type: "geojson", data: EMPTY });
      m.addLayer({ id: "p-hl", type: "circle", source: "hl", minzoom: 11.5, paint: { "circle-color": "rgba(58,110,165,0.14)", "circle-radius": 12, "circle-stroke-width": 3, "circle-stroke-color": MAP.pin } });
      m.addLayer({ id: "p-c", type: "circle", source: "p", minzoom: 11.5, paint: { "circle-color": MAP.pin, "circle-radius": 6.5, "circle-stroke-width": 1.5, "circle-stroke-color": MAP.pinStroke, "circle-opacity": P_FADE as any, "circle-stroke-opacity": P_FADE as any } });
      m.addLayer({ id: "p-hit", type: "circle", source: "p", minzoom: 11.5, paint: { "circle-color": MAP.hit, "circle-opacity": 0, "circle-radius": 16 } });
      applySelected(m, selectedRef.current);
    };

    // Move the amber selected ring to a district id (or clear it).
    const applySelected = (m: any, id: string | null) => {
      try {
        const prev = selectedRef.current;
        if (prev && m.getSource("d")) m.setFeatureState({ source: "d", id: prev }, { selected: false });
        selectedRef.current = id;
        if (id && m.getSource("d")) m.setFeatureState({ source: "d", id }, { selected: true });
      } catch {}
    };
    /* ELITE-4 J3-3: publish the selection handler so the visually-hidden district
       buttons below drive exactly the same state as a click on the canvas. */
    applyRef.current = applySelected;

    const wire = (m: any, maplibregl: any) => {
      const tip = new maplibregl.Popup({ closeButton: false, offset: 12 });
      // Click a district: filter IN PLACE (soft navigation, no full reload), fly to
      // the district, and set the amber selected ring. Three instant confirmations
      // replace the old page-jump that left the user guessing what happened.
      m.on("click", "d-hit", (e: any) => {
        const f = e.features?.[0]; if (!f) return;
        const id = f.properties.id;
        applySelected(m, id);
        try { m.flyTo({ center: (f.geometry.coordinates as [number, number]), zoom: Math.max(m.getZoom(), 12.5), duration: 650 }); } catch {}
        const sp = new URLSearchParams(baseParams); sp.set("district", id);
        router.push(`/${locale}/listings?${sp.toString()}`, { scroll: false });
      });
      const look = new maplibregl.Popup({ closeButton: true, closeOnClick: true, offset: 14, maxWidth: "220px" });
      m.on("click", "p-hit", (e: any) => {
        const f = e.features?.[0]; if (!f) return;
        const p = f.properties;
        const t = String(p.title).replace(/</g, "&lt;").replace(/>/g, "&gt;");
        const pr = p.price ? String(p.price).replace(/</g, "&lt;").replace(/>/g, "&gt;") : "";
        look.setLngLat(f.geometry.coordinates).setHTML(`<div style="font:600 12.5px var(--sans,sans-serif);color:${BRAND.ink};line-height:1.3">${t}</div>${pr ? `<div style="font:12px var(--sans,sans-serif);color:${BRAND.ink};margin-top:3px">${pr}</div>` : ""}<a href="/${locale}/listings/${p.id}" style="display:inline-block;margin-top:7px;font:600 12px var(--sans,sans-serif);color:${BRAND.harbor};text-decoration:none">${t2.viewListing}</a>`).addTo(m);
      });
      m.on("mouseenter", "d-hit", (e: any) => { m.getCanvas().style.cursor = "pointer"; const f = e.features?.[0]; if (!f) return; tip.setLngLat(e.lngLat).setHTML(`<div style="font:600 12px var(--sans,sans-serif);color:${BRAND.ink}">${f.properties.name}</div><div style="font:11px var(--sans,sans-serif);color:${BRAND.slate}">${f.properties.count} ${t2.spacesClick}</div>`).addTo(m); });
      m.on("mouseleave", "d-hit", () => { m.getCanvas().style.cursor = ""; tip.remove(); });
      m.on("mouseenter", "p-hit", (e: any) => {
        m.getCanvas().style.cursor = "pointer";
        const f = e.features?.[0]; if (!f) return;
        const id = f.properties.id;
        setRing(f.geometry.coordinates as [number, number]);
        const el = cardEl(id);
        if (el) { document.querySelectorAll(".listing.lst-hl").forEach((n) => n.classList.remove("lst-hl")); el.classList.add("lst-hl"); el.scrollIntoView({ block: "nearest" }); }
      });
      m.on("mouseleave", "p-hit", () => { m.getCanvas().style.cursor = ""; setRing(null); document.querySelectorAll(".listing.lst-hl").forEach((n) => n.classList.remove("lst-hl")); });
      document.addEventListener("mouseover", onOver);
      document.addEventListener("mouseout", onOut);
    };

    import("maplibre-gl").then((mod) => {
      if (cancelled || !ref.current) return;
      const maplibregl = (mod as any).default ?? mod;
      // The RTL text plugin must load in EVERY locale. Saudi street names on the
      // basemap are Arabic, so an English map still needs Arabic shaping or those
      // labels render as disconnected, reversed glyphs. It is lazy (third arg true):
      // it only downloads when the map actually meets RTL text, so English maps with
      // no Arabic labels pay nothing. Registered once, globally.
      try { const M:any = maplibregl; if (!M.__rtl) { M.__rtl = true; M.setRTLTextPlugin("https://unpkg.com/@mapbox/mapbox-gl-rtl-text@0.2.3/mapbox-gl-rtl-text.min.js", () => {}, true); } } catch {}
      map = new maplibregl.Map({ container: ref.current, style: PRIMARY_STYLE, center: [46.68, 24.71], zoom: 9.2, minZoom: 4.8, maxZoom: 16 });
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), ar ? "top-left" : "top-right");
      mapRef.current = map; map.on("dragend", () => setMoved(true)); map.on("zoomend", () => setMoved(true));
      ro = new ResizeObserver(() => { try { map.resize(); } catch {} });
      ro.observe(ref.current);
      if (typeof requestAnimationFrame !== "undefined") requestAnimationFrame(() => { try { map.resize(); } catch {} });
      [80, 300, 900, 2000].forEach((d) => setTimeout(() => { try { map.resize(); } catch {} }, d));

      const onReady = () => {
        if (ready || cancelled) return; ready = true;
        readyRef.current = true;
        setStatus("ready");
        [60, 400].forEach((d) => setTimeout(() => { try { map.resize(); } catch {} }, d));
        try { addData(map); wire(map, maplibregl); if (initialBbox && initialBbox.length === 4) { try { map.fitBounds([[initialBbox[0], initialBbox[1]], [initialBbox[2], initialBbox[3]]], { padding: 34, duration: 0, maxZoom: 14 }); } catch {} } } catch {}
      };
      // style.load is the only event that reliably fires here (~70 to 100ms). load and
      // idle never fire under maplibre 4.7.1, which is why the panel used to sit on
      // "Loading map" for the full 6s until the fallback timer swapped the style.
      map.on("style.load", onReady);
      map.on("load", onReady);
      map.on("idle", onReady);

      const swapToFallback = () => {
        if (triedFallback || ready || cancelled) return;
        triedFallback = true;
        try {
          map.once("style.load", () => { if (cancelled) return; ready = true; readyRef.current = true; setStatus("ready"); try { map.resize(); addData(map); wire(map, maplibregl); } catch {} });
          map.setStyle(FALLBACK_STYLE);
        } catch { if (!cancelled) setStatus("error"); }
      };

      const failTimer = setTimeout(swapToFallback, 6000);
      map.on("style.load", () => clearTimeout(failTimer));
      map.on("load", () => clearTimeout(failTimer));
      map.on("error", () => { if (ready || cancelled) return; if (!triedFallback) swapToFallback(); else setStatus("error"); });
    }).catch(() => { if (!cancelled) setStatus("error"); });

    return () => {
      cancelled = true;
      document.removeEventListener("mouseover", onOver);
      document.removeEventListener("mouseout", onOut);
      try { ro?.disconnect(); map?.remove(); } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // React to filter changes without re-initialising the map: a soft navigation
  // re-renders this component with new bubbles/pins/selected, and we push them into
  // the existing sources so the camera and map instance survive the filter.
  useEffect(() => {
    const m = mapRef.current;
    if (!m || !readyRef.current) return;
    try {
      const ds = m.getSource("d");
      const ps = m.getSource("p");
      if (ds) ds.setData({ type: "FeatureCollection", features: bubbles.map((b) => ({ type: "Feature", id: b.id, geometry: { type: "Point", coordinates: [b.lng, b.lat] }, properties: { id: b.id, name: b.name, count: b.count } })) } as any);
      if (ps) ps.setData({ type: "FeatureCollection", features: pins.map((p) => ({ type: "Feature", id: p.id, geometry: { type: "Point", coordinates: [p.lng, p.lat] }, properties: { id: p.id, title: p.title, price: p.price } })) } as any);
      // setData clears feature-state, so re-apply the selected ring from the prop.
      const prev = selectedRef.current;
      if (prev && ds) { try { m.setFeatureState({ source: "d", id: prev }, { selected: false }); } catch {} }
      selectedRef.current = selectedDistrict ?? null;
      if (selectedDistrict && ds) { try { m.setFeatureState({ source: "d", id: selectedDistrict }, { selected: true }); } catch {} }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bubbles, pins, selectedDistrict]);

  /* ELITE-4 J3-3: the keyboard path into a district bubble. Same feature state and
     same navigation as the canvas click handler, reached from a real button. */
  const selectDistrict = (b: DistrictBubble) => {
    const m = mapRef.current;
    if (m) {
      applyRef.current?.(m, b.id);
      try { m.flyTo({ center: [b.lng, b.lat] as [number, number], zoom: Math.max(m.getZoom(), 12.5), duration: 650 }); } catch {}
    }
    const sp = new URLSearchParams(baseParams); sp.set("district", b.id);
    router.push(`/${locale}/listings?${sp.toString()}`, { scroll: false });
  };
  const searchThisArea = () => {
    const m = mapRef.current; if (!m || !moved) return;
    const b = m.getBounds();
    const sp = new URLSearchParams(baseParams);
    sp.set("bbox", [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()].map((n: number) => n.toFixed(4)).join(","));
    setMoved(false);
    router.push(`/${locale}/listings?${sp.toString()}`, { scroll: false });
  };

  /* ELITE-4 J3-5: below 1080px the panel is a full-screen overlay. It behaves like
     a dialog now: focus moves in, Tab stays in, Escape closes, focus goes back. */
  useEffect(() => {
    if (!open) return;
    const toggle = toggleRef.current;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setOpen(false); return; }
      if (e.key !== "Tab") return;
      const root = panelRef.current;
      if (!root) return;
      const f = Array.from(root.querySelectorAll<HTMLElement>('button, a[href], [tabindex]:not([tabindex="-1"])'));
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      const act = document.activeElement as HTMLElement | null;
      const inside = !!act && root.contains(act);
      if (e.shiftKey && (!inside || act === first)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && (!inside || act === last)) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKey);
    closeRef.current?.focus();
    return () => { document.removeEventListener("keydown", onKey); if (toggle && document.contains(toggle)) toggle.focus(); };
  }, [open]);

  return (
    <>
      <style>{`.listing.lst-hl{outline:2px solid var(--harbor);outline-offset:1px;border-radius:14px}`}</style>
      {/* ELITE-4 J3-3 / J3-5: the panel is a named region, and a named modal dialog
          while it is the full-screen overlay. */}
      <div ref={panelRef} className={"lst-map-panel" + (open ? " open" : "")}
        role={open ? "dialog" : "region"} aria-modal={open ? true : undefined} aria-label={t3.mapRegion}>
        <div ref={ref} style={{ position: "absolute", inset: 0 }} />
        {/* ELITE-4 J3-3: district filtering and pin navigation are bound to MapLibre
            pointer events on a canvas, so neither can be reached with a keyboard.
            These are the same two actions as real, focusable controls. */}
        <div className="sronly">
          <h3>{t3.districtList}</h3>
          <ul>
            {bubbles.map((b) => (
              <li key={b.id}>
                <button type="button" onClick={() => selectDistrict(b)} aria-current={selectedDistrict === b.id ? "true" : undefined}>
                  {b.name}, {b.count} {t3.spaces}
                </button>
              </li>
            ))}
          </ul>
          {pins.length > 0 ? (
            <>
              <h3>{t3.pinList}</h3>
              <ul>
                {pins.map((p) => (
                  <li key={p.id}><a href={`/${locale}/listings/${p.id}`}>{p.title}{p.price ? `, ${p.price}` : ""}</a></li>
                ))}
              </ul>
            </>
          ) : null}
        </div>
        {status !== "ready" && (
          <div aria-live="polite" style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 6, background: "var(--cool)", color: "var(--slate)", pointerEvents: "none", padding: 20, textAlign: "center" }}>
            <span className="mono" style={{ fontSize: "0.6875rem", letterSpacing: ".1em", textTransform: "uppercase", color: "var(--slate-2)" }}>{status === "error" ? t2.mapUnavailable : t2.loadingMap}</span>
            <span style={{ fontSize: "0.78125rem", maxWidth: 240 }}>{status === "error" ? t2.browseList : t2.oneMoment}</span>
          </div>
        )}
        {/* ELITE-4 J3-4: `moved` is only ever set from drag and zoom pointer events, so
            rendering this button on `moved` alone put bounding-box search out of reach of
            a keyboard entirely. It is always present now, and inert until the viewport
            has actually changed. */}
        <button type="button" onClick={searchThisArea} aria-disabled={!moved} className="btn" style={{ position: "absolute", top: 12, left: "50%", transform: "translateX(-50%)", zIndex: 8, background: "var(--paper)", color: "var(--harbor)", border: "1px solid var(--silver)", boxShadow: "var(--sh-2)", fontWeight: 600, opacity: moved ? 1 : 0.55, cursor: moved ? "pointer" : "default" }}>{t2.searchArea}</button>
        <button type="button" ref={closeRef} className="btn primary lst-map-close" onClick={() => setOpen(false)}>{t2.closeMap}</button>
        {/* Legend: names the two mark types so a click is never a mystery. Bubbles are
            district centroids (approximate); green dots are exact building points. */}
        <div style={{ position: "absolute", insetInlineStart: 10, bottom: 10, background: "rgba(255,255,255,.94)", border: "1px solid var(--silver)", borderRadius: 8, padding: "7px 10px", fontSize: "0.71875rem", color: "var(--ink)", display: "grid", gap: 5, boxShadow: "var(--sh-1)", zIndex: 6 }}>
          <span style={{ display: "flex", gap: 7, alignItems: "center" }}><span style={{ width: 13, height: 13, borderRadius: "50%", background: "var(--harbor)", border: "2px solid var(--on-brand)", boxShadow: "0 0 0 1px var(--silver)", flex: "none" }} />{ar ? "منطقة (تقديري) · انقر للتصفية" : "District (approx.) · click to filter"}</span>
          {pins.length > 0 && (
            <span style={{ display: "flex", gap: 7, alignItems: "center" }}><span style={{ width: 11, height: 11, borderRadius: "50%", background: "var(--harbor)", border: "1.5px solid var(--on-brand)", boxShadow: "0 0 0 1px var(--silver)", flex: "none" }} />{ar ? "مبنى محدد" : "Exact building"}</span>
          )}
        </div>
      </div>
      <button type="button" ref={toggleRef} className="btn primary lst-map-toggle" onClick={() => setOpen(true)}>{t2.showMap}</button>
    </>
  );
}
