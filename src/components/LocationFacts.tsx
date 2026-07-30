"use client";
import { useEffect, useRef, useState } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import { getDictionary } from "@/i18n/getDictionary";
import type { FactKey } from "@/lib/locationFacts";
import type { TravelTime } from "@/lib/location/results";

// Honest, computed location section for a listing detail page. Every value here is
// either a verified coordinate or a computation over verified coordinates (CLAUDE.md
// Law 3). No location score, no footfall, no market narrative. Distances are computed
// server-side from the RCRC metro dataset and public airport points.
//
// Travel time is different in kind and is typed differently on purpose. It is a
// PROVIDER value, so it arrives as a TravelTime union rather than a bare number. A
// route is only present when the source register permitted the call for public
// redisplay; a missing token is not the only way it can be absent, and this component
// must not imply otherwise. When it is absent the row falls back to the straight-line
// distance it already had, which is our own computation and needs no licence.
//
// The label is read from `travel.labelKey`, never hardcoded, so a figure computed
// under different conditions cannot inherit wording describing conditions it was not
// computed under. `travel.reason` is internal and is never rendered.

const PRIMARY_STYLE = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";
const FALLBACK_STYLE = "https://tiles.openfreemap.org/styles/positron";

const LINE_AR: Record<string, string> = {
  "Blue line": "الخط الأزرق", "Red line": "الخط الأحمر", "Orange line": "الخط البرتقالي",
  "Yellow line": "الخط الأصفر", "Green line": "الخط الأخضر", "Purple line": "الخط البنفسجي",
  "Haramain High Speed Railway": "قطار الحرمين السريع",
};

export interface MetroFact { name_en: string; name_ar: string; line: string | null; lat: number; lng: number; km: number; walkMin: number | null }
export interface AirportFact { name_en: string; name_ar: string; km: number; travel: TravelTime | null }
export interface RailFact { name_en: string; name_ar: string; line: string | null; km: number; travel: TravelTime | null }

export default function LocationFacts({ locale, lat, lng, exact, metro, airport, rail, primary, less, computedDate }: {
  locale: "en" | "ar";
  lat: number; lng: number; exact: boolean;
  metro: MetroFact | null;
  airport: AirportFact | null;
  rail: RailFact | null;
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
        m.addLayer({ id: "origin-c", type: "circle", source: "origin", paint: { "circle-color": "#3A6EA5", "circle-radius": 7, "circle-stroke-width": 2, "circle-stroke-color": "#ffffff" } });
      } else {
        m.addSource("origin", { type: "geojson", data: { type: "Feature", geometry: { type: "Point", coordinates: [lng, lat] }, properties: {} } });
        m.addLayer({ id: "origin-area", type: "circle", source: "origin", paint: { "circle-color": "rgba(58,110,165,0.14)", "circle-radius": 46, "circle-stroke-width": 2, "circle-stroke-color": "#3A6EA5", "circle-stroke-opacity": 0.55 } });
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
      // Arabic labels appear on the Saudi basemap in EVERY locale (street names are
      // Arabic), so the RTL shaping plugin must load regardless of the UI language.
      // Gated to ar only, English maps rendered Arabic street names as disconnected,
      // right-to-left-broken glyphs. This is a global, registered once.
      try { const M: any = maplibregl; if (!M.__rtl) { M.__rtl = true; M.setRTLTextPlugin("https://unpkg.com/@mapbox/mapbox-gl-rtl-text@0.2.3/mapbox-gl-rtl-text.min.js", () => {}, true); } } catch {}
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

  // One cell, two states, and the fallback is not an error state. A computed route
  // prints minutes with the label the computation itself carries. Anything else prints
  // the straight-line distance, which is ours. The denial reason is deliberately not
  // rendered: it quotes internal licence reasoning, the same rule the source-rights
  // denialReason follows.
  const travelCell = (km: number, travel: TravelTime | null) => {
    const computed = travel && travel.state === "computed" ? travel : null;
    return (
      <div style={{ textAlign: ar ? "left" : "right", whiteSpace: "nowrap" }}>
        <div className="mono" style={{ fontSize: 14, fontWeight: 600 }}>
          {computed ? `${computed.minutes} ${t.driveMin}` : `${num(km)} ${t.km}`}
        </div>
        <div className="muted" style={{ fontSize: 11.5, marginTop: 2 }}>
          {computed ? (t[computed.labelKey] || t.driving) : t.straightLine}
        </div>
      </div>
    );
  };

  const airportRow = (key: string) => airport ? (
    <div key={key} className="row between" style={{ gap: 12, padding: "11px 0", borderTop: "1px solid var(--silver)" }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 11.5, color: "var(--slate)" }}>{t.airport}</div>
        <div style={{ fontSize: 14.5, fontWeight: 500, marginTop: 2 }}>{ar ? airport.name_ar : airport.name_en}</div>
      </div>
      {travelCell(airport.km, airport.travel)}
    </div>
  ) : null;

  const railRow = (key: string) => rail ? (
    <div key={key} className="row between" style={{ gap: 12, padding: "11px 0", borderTop: "1px solid var(--silver)" }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 11.5, color: "var(--slate)" }}>{t.rail}</div>
        <div style={{ fontSize: 14.5, fontWeight: 500, marginTop: 2 }}>{ar ? rail.name_ar : rail.name_en}{rail.line ? <span className="muted" style={{ fontWeight: 400 }}> · {lineLabel(rail.line)}</span> : null}</div>
      </div>
      {travelCell(rail.km, rail.travel)}
    </div>
  ) : null;
  const renderKey = (k: FactKey, i: number) => (k === "metro" ? metroRow("p" + i) : k === "rail" ? railRow("p" + i) : airportRow("p" + i));
  const lessReason = (k: FactKey) => (k === "metro" ? t.lessMetro : k === "rail" ? t.lessRail : t.lessAirport);
  const lessLabel = (k: FactKey) => (k === "metro" ? t.metro : k === "rail" ? t.rail : t.airport);

  // Only show a fact if we actually have it (metro is Riyadh-only).
  const hasFact = (k: FactKey) => (k === "metro" ? !!metro : k === "rail" ? !!rail : !!airport);
  const primaryShown = primary.filter(hasFact);
  const lessShown = less.filter(hasFact);

  // Attribution follows the value, not the integration. It appears only when a route
  // was actually computed AND that row is actually rendered, because attributing a
  // provider whose figure is not on the page would be as wrong as omitting it when it
  // is. The "less relevant" section prints a sentence, not a figure, so it is excluded.
  const travelAttribution = Array.from(
    new Set(
      primaryShown
        .map((k) => (k === "metro" ? null : k === "rail" ? rail?.travel : airport?.travel))
        .map((tt) => (tt && tt.state === "computed" ? tt.attribution : null))
        .filter((a): a is string => !!a)
    )
  ).map((a) => `${t.srcTravel} ${a}.`);

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
      <div className="row" style={{ gap: 16, marginTop: 10, flexWrap: "wrap" }}>
        <span className="row gap6" style={{ fontSize: 11.5, color: "var(--slate)" }}><span style={{ width: 9, height: 9, borderRadius: 9, background: "#3A6EA5", display: "inline-block" }} />{t.thisSpace}</span>
        {metro ? <span className="row gap6" style={{ fontSize: 11.5, color: "var(--slate)" }}><span style={{ width: 9, height: 9, borderRadius: 9, background: "#3A6EA5", display: "inline-block" }} />{t.metroDot}</span> : null}
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
      <div className="mono muted" style={{ fontSize: 10.5, marginTop: 8 }}>{[metro ? t.srcMetro : null, rail ? t.srcRail : null, t.srcComputed, ...travelAttribution].filter(Boolean).join(" ")}</div>
    </div>
  );
}
