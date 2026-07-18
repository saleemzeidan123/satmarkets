"use client";
import { useEffect, useRef, useState } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import { getDictionary } from "@/i18n/getDictionary";
import type { FactKey } from "@/lib/locationFacts";

// Honest, computed location section for a listing detail page. Every value here is
// either a verified coordinate or a computation over verified coordinates (CLAUDE.md
// Law 3). No location score, no footfall, no market narrative. The data passed in is
// computed server-side from the RCRC metro dataset, public airport points, and (when
// available) the Mapbox routing engine.

const PRIMARY_STYLE = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";
const FALLBACK_STYLE = "https://tiles.openfreemap.org/styles/positron";

const LINE_AR: Record<string, string> = {
  "Blue line": "الخط الأزرق", "Red line": "الخط الأحمر", "Orange line": "الخط البرتقالي",
  "Yellow line": "الخط الأصفر", "Green line": "الخط الأخضر", "Purple line": "الخط البنفسجي",
};

export interface MetroFact { name_en: string; name_ar: string; line: string | null; lat: number; lng: number; km: number; walkMin: number | null }
export interface AirportFact { name_en: string; name_ar: string; km: number; driveMin: number | null }

export default function LocationFacts({ locale, lat, lng, exact, metro, airport, primary, less, computedDate }: {
  locale: "en" | "ar";
  lat: number; lng: number; exact: boolean;
  metro: MetroFact | null;
  airport: AirportFact | null;
  primary: FactKey[]; less: FactKey[];
  computedDate: string;
}) {
  const ar = locale === "ar";
  const d = getDictionary(ar ? "ar" : "en");
  const t = (d as any).locFacts;
  const ref = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let map: any; let ro: ResizeObserver | undefined; let cancelled = false; let triedFallback = false; let ready = false;
    const draw = (m: any) => {
      if (m.getSource("origin")) return;
      // Listing location: an exact pin when we have a building coordinate, otherwise a
      // soft area circle so a district centroid is never mistaken for a precise address.
      if (exact) {
        m.addSource("origin", { type: "geojson", data: { type: "Feature", geometry: { type: "Point", coordinates: [lng, lat] }, properties: {} } });
        m.addLayer({ id: "origin-c", type: "circle", source: "origin", paint: { "circle-color": "#1F8A5B", "circle-radius": 7, "circle-stroke-width": 2, "circle-stroke-color": "#ffffff" } });
      } else {
        m.addSource("origin", { type: "geojson", data: { type: "Feature", geometry: { type: "Point", coordinates: [lng, lat] }, properties: {} } });
        m.addLayer({ id: "origin-area", type: "circle", source: "origin", paint: { "circle-color": "rgba(31,138,91,0.14)", "circle-radius": 46, "circle-stroke-width": 2, "circle-stroke-color": "#1F8A5B", "circle-stroke-opacity": 0.55 } });
      }
      if (metro) {
        m.addSource("metro", { type: "geojson", data: { type: "Feature", geometry: { type: "Point", coordinates: [metro.lng, metro.lat] }, properties: {} } });
        m.addLayer({ id: "metro-c", type: "circle", source: "metro", paint: { "circle-color": "#3A6EA5", "circle-radius": 5.5, "circle-stroke-width": 1.5, "circle-stroke-color": "#ffffff" } });
      }
    };
    const fit = (m: any) => {
      if (metro) {
        const w = Math.min(lng, metro.lng), e = Math.max(lng, metro.lng), s = Math.min(lat, metro.lat), n = Math.max(lat, metro.lat);
        try { m.fitBounds([[w, s], [e, n]], { padding: 60, maxZoom: 14.5, duration: 0 }); } catch {}
      } else {
        try { m.setCenter([lng, lat]); m.setZoom(exact ? 13.5 : 12); } catch {}
      }
    };
    import("maplibre-gl").then((mod) => {
      if (cancelled || !ref.current) return;
      const maplibregl = (mod as any).default ?? mod;
      if (ar) { try { const M: any = maplibregl; if (!M.__rtl) { M.__rtl = true; M.setRTLTextPlugin("https://unpkg.com/@mapbox/mapbox-gl-rtl-text@0.2.3/mapbox-gl-rtl-text.min.js", () => {}, true); } } catch {} }
      map = new maplibregl.Map({ container: ref.current, style: PRIMARY_STYLE, center: [lng, lat], zoom: 13, minZoom: 8, maxZoom: 16, attributionControl: false });
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), ar ? "top-left" : "top-right");
      map.addControl(new maplibregl.AttributionControl({ compact: true }));
      ro = new ResizeObserver(() => { try { map.resize(); } catch {} });
      ro.observe(ref.current);
      [80, 300, 900].forEach((ms) => setTimeout(() => { try { map.resize(); } catch {} }, ms));
      const onReady = () => { if (ready || cancelled) return; ready = true; setStatus("ready"); try { draw(map); fit(map); map.resize(); } catch {} };
      map.on("style.load", onReady); map.on("load", onReady); map.on("idle", onReady);
      const swap = () => { if (triedFallback || ready || cancelled) return; triedFallback = true; try { map.once("style.load", () => { if (cancelled) return; ready = true; setStatus("ready"); try { draw(map); fit(map); map.resize(); } catch {} }); map.setStyle(FALLBACK_STYLE); } catch { if (!cancelled) setStatus("error"); } };
      const timer = setTimeout(swap, 6000);
      map.on("style.load", () => clearTimeout(timer));
      map.on("error", () => { if (ready || cancelled) return; if (!triedFallback) swap(); else setStatus("error"); });
    }).catch(() => { if (!cancelled) setStatus("error"); });
    return () => { cancelled = true; try { ro?.disconnect(); map?.remove(); } catch {} };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const num = (n: number) => Number(n.toFixed(n < 10 ? 1 : 0)).toLocaleString(ar ? "ar-SA-u-nu-latn" : "en-US");
  const lineLabel = (line: string | null) => (line ? (ar ? (LINE_AR[line] || line) : line) : "");

  const metroRow = (key: string) => metro ? (
    <div key={key} className="row between" style={{ gap: 12, padding: "11px 0", borderTop: "1px solid var(--silver)" }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 11.5, color: "var(--slate)" }}>{t.metro}</div>
        <div style={{ fontSize: 14.5, fontWeight: 500, marginTop: 2 }}>{ar ? metro.name_ar : metro.name_en}{metro.line ? <span className="muted" style={{ fontWeight: 400 }}> · {lineLabel(metro.line)}</span> : null}</div>
      </div>
      <div style={{ textAlign: ar ? "left" : "right", whiteSpace: "nowrap" }}>
        <div className="mono" style={{ fontSize: 14, fontWeight: 600 }}>{num(metro.km)} {t.km}</div>
        {metro.walkMin != null ? <div className="muted" style={{ fontSize: 11.5, marginTop: 2 }}>~{metro.walkMin} {t.walk}</div> : null}
      </div>
    </div>
  ) : null;

  const airportRow = (key: string) => airport ? (
    <div key={key} className="row between" style={{ gap: 12, padding: "11px 0", borderTop: "1px solid var(--silver)" }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 11.5, color: "var(--slate)" }}>{t.airport}</div>
        <div style={{ fontSize: 14.5, fontWeight: 500, marginTop: 2 }}>{ar ? airport.name_ar : airport.name_en}</div>
      </div>
      <div style={{ textAlign: ar ? "left" : "right", whiteSpace: "nowrap" }}>
        {airport.driveMin != null ? <div className="mono" style={{ fontSize: 14, fontWeight: 600 }}>{airport.driveMin} {t.driveMin}</div> : <div className="mono" style={{ fontSize: 14, fontWeight: 600 }}>{num(airport.km)} {t.km}</div>}
        <div className="muted" style={{ fontSize: 11.5, marginTop: 2 }}>{airport.driveMin != null ? t.driving : t.straightLine}</div>
      </div>
    </div>
  ) : null;

  const renderKey = (k: FactKey, i: number) => (k === "metro" ? metroRow("p" + i) : airportRow("p" + i));
  const lessReason = (k: FactKey) => (k === "metro" ? t.lessMetro : t.lessAirport);
  const lessLabel = (k: FactKey) => (k === "metro" ? t.metro : t.airport);

  // Only show a fact if we actually have it (metro is Riyadh-only).
  const hasFact = (k: FactKey) => (k === "metro" ? !!metro : !!airport);
  const primaryShown = primary.filter(hasFact);
  const lessShown = less.filter(hasFact);

  return (
    <div className="card pad" style={{ marginTop: 22, boxShadow: "none" }}>
      <div className="row between" style={{ gap: 10, flexWrap: "wrap" }}>
        <div style={{ fontWeight: 600, fontSize: 15 }}>{t.title}</div>
        <span className="mono muted" style={{ fontSize: 11 }}>{t.computed} {computedDate}</span>
      </div>
      <div style={{ position: "relative", height: 260, marginTop: 12, borderRadius: 12, overflow: "hidden", border: "1px solid var(--silver)" }}>
        <div ref={ref} style={{ position: "absolute", inset: 0 }} aria-label={t.mapAria} role="img" />
        {status !== "ready" && (
          <div aria-live="polite" style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--cool)", color: "var(--slate)", pointerEvents: "none", fontSize: 12.5 }}>
            {status === "error" ? t.mapUnavailable : t.loadingMap}
          </div>
        )}
      </div>
      <div style={{ fontSize: 12.5, color: "var(--slate)", marginTop: 10 }}>
        {exact ? t.exact : t.district}
      </div>
      {primaryShown.length > 0 && (
        <div style={{ marginTop: 6 }}>
          {primaryShown.map((k, i) => renderKey(k, i))}
        </div>
      )}
      {lessShown.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <div className="mono muted" style={{ fontSize: 10.5, letterSpacing: ".08em", textTransform: "uppercase" }}>{t.less}</div>
          {lessShown.map((k) => (
            <div key={"l" + k} style={{ fontSize: 12.5, color: "var(--slate)", marginTop: 6 }}>
              <span style={{ fontWeight: 500, color: "var(--ink)" }}>{lessLabel(k)}.</span> {lessReason(k)}
            </div>
          ))}
        </div>
      )}
      <div className="muted" style={{ fontSize: 12.5, lineHeight: 1.6, marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--silver)" }}>{d.ld.locNote}</div>
      <div className="mono muted" style={{ fontSize: 10.5, marginTop: 8 }}>{t.sourceLine}</div>
    </div>
  );
}
