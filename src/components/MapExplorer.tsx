"use client";
import { useEffect, useRef, useState } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import { photoFor } from "@/lib/photos";

export interface MapBuilding {
  id: string; name: string; place: string; asset: string; assetLabel: string;
  grade: string; size: number | null; lat: number; lng: number;
  band: number | null; bandLow: number | null; bandHigh: number | null; unit: string | null; listings: number;
}
const COLORS: Record<string, string> = {
  office: "#2E5FE0", retail: "#0E9488", medical: "#DB2777", warehouse: "#64748B",
  showroom: "#7C3AED", serviced: "#0EA5E9", education: "#16A34A", land: "#CA8A04",
};
const gradeFmt = (g: string) => (({ a_plus: "A+", a: "A", b: "B", c: "C" } as any)[g] || "");
const unitFmt = (u: string | null, l: string) =>
  u === "sar_desk_month" ? (l === "ar" ? "ريال/مكتب/شهر" : "SAR/desk/mo") : (l === "ar" ? "ريال/م²/سنة" : "SAR/sqm/yr");

export default function MapExplorer({ buildings, locale, t, assetOrder, assetLabels }: {
  buildings: MapBuilding[]; locale: "en" | "ar";
  t: { all: string; available: string; viewListings: string; rentBand: string; size: string; grade: string; sqm: string; noData: string; results: string; close: string; clusterUnit: string };
  assetOrder: string[]; assetLabels: Record<string, string>;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const fcRef = useRef<any>(null);
  const [active, setActive] = useState<string>("all");
  const [sel, setSel] = useState<MapBuilding | null>(null);
  const [ready, setReady] = useState(false);

  function buildFC(list: MapBuilding[]) {
    return { type: "FeatureCollection", features: list.map((b) => ({ type: "Feature", geometry: { type: "Point", coordinates: [b.lng, b.lat] }, properties: { ...b } })) };
  }

  useEffect(() => {
    let map: any; let ro: any; let cancelled = false; let hoverId: any = null;
    (async () => {
      const maplibregl = (await import("maplibre-gl")).default;
      if (cancelled || !ref.current) return;
      map = new maplibregl.Map({
        container: ref.current,
        style: "https://tiles.openfreemap.org/styles/positron",
        center: [46.69, 24.71], zoom: 10.4, minZoom: 8, maxZoom: 17,
      });
      mapRef.current = map;
      ro = new ResizeObserver(() => { try { map.resize(); } catch {} }); if (ref.current) ro.observe(ref.current);
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), locale === "ar" ? "top-left" : "top-right");

      fcRef.current = buildFC(buildings);
      map.on("load", () => {
        map.addSource("b", { type: "geojson", data: fcRef.current, cluster: true, clusterRadius: 46, clusterMaxZoom: 13, generateId: true });

        // cluster halo
        map.addLayer({ id: "cl-halo", type: "circle", source: "b", filter: ["has", "point_count"], paint: {
          "circle-color": "#64748B", "circle-opacity": 0.16,
          "circle-radius": ["step", ["get", "point_count"], 28, 5, 36, 15, 46],
        }});
        // cluster core (warm gold, white ring)
        map.addLayer({ id: "cl", type: "circle", source: "b", filter: ["has", "point_count"], paint: {
          "circle-color": ["step", ["get", "point_count"], "#9A803F", 5, "#64748B", 15, "#6F5B2E"],
          "circle-radius": ["step", ["get", "point_count"], 17, 5, 22, 15, 28],
          "circle-stroke-width": 3, "circle-stroke-color": "#FFFFFF",
        }});
        map.addLayer({ id: "cl-count", type: "symbol", source: "b", filter: ["has", "point_count"], layout: {
          "text-field": ["get", "point_count_abbreviated"], "text-font": ["Noto Sans Regular"], "text-size": 13,
        }, paint: { "text-color": "#FFFFFF" }});

        // unclustered: soft glow, solid core, transparent hit target
        const colorMatch: any[] = ["match", ["get", "asset"]];
        Object.entries(COLORS).forEach(([k, v]) => colorMatch.push(k, v));
        colorMatch.push("#64748B");
        map.addLayer({ id: "pt-glow", type: "circle", source: "b", filter: ["!", ["has", "point_count"]], paint: {
          "circle-color": colorMatch, "circle-opacity": 0.16,
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 9, 12, 13, 18, 16, 26],
        }});
        map.addLayer({ id: "pt", type: "circle", source: "b", filter: ["!", ["has", "point_count"]], paint: {
          "circle-color": colorMatch,
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 9, 6.5, 13, 9, 16, 13],
          "circle-stroke-width": 2.5, "circle-stroke-color": "#FFFFFF",
        }});
        map.addLayer({ id: "pt-hit", type: "circle", source: "b", filter: ["!", ["has", "point_count"]], paint: {
          "circle-color": "#000000", "circle-opacity": 0,
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 9, 15, 13, 21, 16, 30],
        }});

        const tip = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 14, className: "satm-tip" });
        const onMove = (e: any) => {
          map.getCanvas().style.cursor = "pointer";
          const f = e.features[0];
          if (hoverId !== null) map.setFeatureState({ source: "b", id: hoverId }, { hover: false });
          hoverId = f.id; map.setFeatureState({ source: "b", id: hoverId }, { hover: true });
          const p = f.properties;
          tip.setLngLat(f.geometry.coordinates).setHTML(`<div style="font:600 12px Inter,sans-serif;color:#1C1A15">${esc(p.name)}</div><div style="font:11px Inter,sans-serif;color:#64748B">${esc(p.assetLabel)}</div>`).addTo(map);
        };
        const onLeave = () => {
          map.getCanvas().style.cursor = "";
          if (hoverId !== null) map.setFeatureState({ source: "b", id: hoverId }, { hover: false });
          hoverId = null; tip.remove();
        };
        const onClick = (e: any) => {
          const p = e.features[0].properties;
          setSel({ ...p, size: p.size === "null" || p.size == null ? null : Number(p.size), band: p.band === "null" || p.band == null ? null : Number(p.band), bandLow: p.bandLow === "null" || p.bandLow == null ? null : Number(p.bandLow), bandHigh: p.bandHigh === "null" || p.bandHigh == null ? null : Number(p.bandHigh), listings: Number(p.listings) || 0 });
        };
        map.on("mousemove", "pt-hit", onMove);
        map.on("mouseleave", "pt-hit", onLeave);
        map.on("click", "pt-hit", onClick);

        map.on("click", "cl", (e: any) => {
          const f = map.queryRenderedFeatures(e.point, { layers: ["cl"] })[0];
          map.getSource("b").getClusterExpansionZoom(f.properties.cluster_id).then((z: number) => {
            map.easeTo({ center: f.geometry.coordinates, zoom: Math.max(z + 0.4, map.getZoom() + 1.5), duration: 600 });
          });
        });
        map.on("mouseenter", "cl", () => map.getCanvas().style.cursor = "pointer");
        map.on("mouseleave", "cl", () => map.getCanvas().style.cursor = "");

        // fit to data
        try {
          const lons = buildings.map((b) => b.lng), lats = buildings.map((b) => b.lat);
          map.fitBounds([[Math.min(...lons), Math.min(...lats)], [Math.max(...lons), Math.max(...lats)]], { padding: 70, maxZoom: 12.5, duration: 0 });
        } catch {}
        setReady(true); setTimeout(() => { try { map.resize(); } catch {} }, 60);
      });
    })();
    return () => { cancelled = true; if (ro) ro.disconnect(); if (map) map.remove(); };
  }, [buildings, locale]);

  useEffect(() => {
    const map = mapRef.current; if (!map || !map.getSource || !map.getSource("b")) return;
    const list = active === "all" ? buildings : buildings.filter((b) => b.asset === active);
    map.getSource("b").setData(buildFC(list));
  }, [active]);

  const shown = active === "all" ? buildings.length : buildings.filter((b) => b.asset === active).length;
  const side = locale === "ar" ? "left" : "right";

  return (
    <div className="relative overflow-hidden rounded-2xl border border-line shadow-card">
      <div ref={ref} className="h-[68vh] min-h-[440px] w-full bg-ivory-2" />

      {/* filter chips */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex flex-wrap items-center gap-1.5 p-3">
        <button onClick={() => setActive("all")} className={`pointer-events-auto rounded-full border px-3 py-1 text-[12px] shadow-sm backdrop-blur transition ${active==="all"?"border-signal bg-signal text-white":"border-line bg-white/90 text-charcoal/70 hover:border-signal/50"}`}>{t.all}</button>
        {assetOrder.map((a) => (
          <button key={a} onClick={() => setActive(a)} className={`pointer-events-auto flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12px] shadow-sm backdrop-blur transition ${active===a?"border-signal bg-signal text-white":"border-line bg-white/90 text-charcoal/70 hover:border-signal/50"}`}>
            <span className="inline-block h-2 w-2 rounded-full" style={{ background: COLORS[a] || "#64748B" }} />{assetLabels[a] || a}
          </button>
        ))}
      </div>

      {/* result count */}
      {ready && (
        <div className="pointer-events-none absolute bottom-3 start-3 z-10 rounded-full bg-charcoal/85 px-3 py-1 text-[11px] text-ivory backdrop-blur">
          {shown} {t.results}
        </div>
      )}

      {/* detail panel */}
      {sel && (
        <div className={`absolute bottom-0 z-20 w-full sm:bottom-3 sm:w-[330px] ${side==="right"?"sm:right-3":"sm:left-3"}`}>
          <div className="overflow-hidden rounded-t-2xl border border-line bg-white shadow-lift sm:rounded-2xl">
            <div className="relative h-32">
              <img src={photoFor(sel.asset, sel.id)} alt="" className="h-full w-full object-cover" />
              <button onClick={() => setSel(null)} aria-label={t.close} className="absolute end-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur">×</button>
              <span className="absolute start-2 top-2 rounded-md px-2 py-0.5 text-[10px] text-white" style={{ background: COLORS[sel.asset] || "#64748B" }}>{sel.assetLabel}</span>
            </div>
            <div className="p-4">
              <h3 className="font-display text-[17px] leading-snug text-charcoal">{sel.name}</h3>
              <div className="mt-1 text-[12.5px] text-charcoal/55">
                {sel.place}{sel.size ? " · " + sel.size.toLocaleString() + " " + t.sqm : ""}{gradeFmt(sel.grade) ? " · " + t.grade + " " + gradeFmt(sel.grade) : ""}
              </div>
              {sel.band != null ? (
                <div className="mt-3 rounded-xl border border-line bg-ivory-2/50 p-3">
                  <div className="text-[10px] uppercase tracking-wide text-charcoal/45">{t.rentBand}</div>
                  <div className="mt-0.5 flex items-baseline gap-2">
                    <span className="font-display text-2xl text-charcoal">{Math.round(sel.band).toLocaleString()}</span>
                    <span className="text-[11px] text-charcoal/55">{sel.bandLow ? sel.bandLow.toLocaleString() + "–" + (sel.bandHigh ?? 0).toLocaleString() + " · " : ""}{unitFmt(sel.unit, locale)}</span>
                  </div>
                </div>
              ) : (
                <div className="mt-3 rounded-xl border border-dashed border-line p-3 text-[12px] text-charcoal/45">{t.noData}</div>
              )}
              <div className="mt-3 flex items-center justify-between">
                <span className="text-[12.5px] text-charcoal/60">{sel.listings} {t.available}</span>
                <a href={`/${locale}/building/${sel.id}`} className="text-[12.5px] font-medium text-signal hover:underline">{t.viewListings} →</a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
function esc(s: string) { return String(s).replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
