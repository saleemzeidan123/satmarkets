"use client";
import { useEffect, useRef, useState } from "react";
import "maplibre-gl/dist/maplibre-gl.css";

export interface MapBuilding {
  id: string; name: string; place: string; asset: string; assetLabel: string;
  grade: string; size: number | null; lat: number; lng: number;
  band: number | null; unit: string | null; listings: number;
}
const COLORS: Record<string, string> = {
  office: "#8A7342", retail: "#B5482E", medical: "#2F6E6E", warehouse: "#5A6473",
  showroom: "#7A5CA8", serviced: "#C08A3E", education: "#4A7A4A", land: "#8C7B52",
};

export default function MapExplorer({ buildings, locale, t, assetOrder, assetLabels }: {
  buildings: MapBuilding[]; locale: "en" | "ar";
  t: { all: string; legend: string; available: string; viewListings: string; rentBand: string; size: string; grade: string; sqm: string; perYr: string; noData: string };
  assetOrder: string[]; assetLabels: Record<string, string>;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const [active, setActive] = useState<string>("all");

  useEffect(() => {
    let map: any; let cancelled = false;
    (async () => {
      const maplibregl = (await import("maplibre-gl")).default;
      if (cancelled || !ref.current) return;
      map = new maplibregl.Map({
        container: ref.current,
        style: "https://tiles.openfreemap.org/styles/liberty",
        center: [46.68, 24.71], zoom: 10.2,
      });
      mapRef.current = map;
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), locale === "ar" ? "top-left" : "top-right");
      const fc = {
        type: "FeatureCollection",
        features: buildings.map((b) => ({
          type: "Feature",
          geometry: { type: "Point", coordinates: [b.lng, b.lat] },
          properties: { ...b },
        })),
      };
      map.on("load", () => {
        map.addSource("buildings", { type: "geojson", data: fc });
        const colorMatch: any[] = ["match", ["get", "asset"]];
        Object.entries(COLORS).forEach(([k, v]) => colorMatch.push(k, v));
        colorMatch.push("#8A7342");
        map.addLayer({
          id: "b-circles", type: "circle", source: "buildings",
          paint: {
            "circle-radius": ["interpolate", ["linear"], ["zoom"], 9, 4, 13, 7, 16, 11],
            "circle-color": colorMatch,
            "circle-opacity": 0.85,
            "circle-stroke-width": 1.5, "circle-stroke-color": "#FAF8F3",
          },
        });
        const popup = new maplibregl.Popup({ closeButton: true, closeOnClick: true, maxWidth: "260px" });
        map.on("click", "b-circles", (e: any) => {
          const p = e.features[0].properties;
          const band = p.band && p.band !== "null" ? Number(p.band) : null;
          const sz = p.size && p.size !== "null" ? Number(p.size).toLocaleString() + " " + t.sqm : "";
          const dir = locale === "ar" ? "rtl" : "ltr";
          const html =
            `<div dir="${dir}" style="font-family:Inter,system-ui,sans-serif">
              <div style="font-weight:600;color:#1C1A15;font-size:14px">${esc(p.name)}</div>
              <div style="color:#8A7342;font-size:11px;margin-top:2px">${esc(p.assetLabel)} · ${esc(p.place)}</div>
              <div style="color:#5b574c;font-size:12px;margin-top:6px">${sz}${sz && p.grade && p.grade!=="n_a" ? " · " : ""}${p.grade && p.grade!=="n_a" ? t.grade+" "+gradeFmt(p.grade) : ""}</div>
              ${band ? `<div style="margin-top:6px;font-size:12px;color:#5b574c">${t.rentBand}: <b style="color:#8A7342">${band.toLocaleString()}</b> ${unitFmt(p.unit, locale)}</div>` : `<div style="margin-top:6px;font-size:11px;color:#9a948a">${t.noData}</div>`}
              <div style="margin-top:6px;font-size:12px;color:#1C1A15">${Number(p.listings)||0} ${t.available}</div>
              <a href="/${locale}/listings?asset=${p.asset}&city=Riyadh" style="display:inline-block;margin-top:8px;font-size:12px;color:#8A7342;font-weight:600">${t.viewListings} →</a>
            </div>`;
          popup.setLngLat(e.lngLat).setHTML(html).addTo(map);
        });
        map.on("mouseenter", "b-circles", () => map.getCanvas().style.cursor = "pointer");
        map.on("mouseleave", "b-circles", () => map.getCanvas().style.cursor = "");
      });
    })();
    return () => { cancelled = true; if (map) map.remove(); };
  }, [buildings, locale]);

  useEffect(() => {
    const map = mapRef.current; if (!map || !map.getLayer || !map.getLayer("b-circles")) return;
    map.setFilter("b-circles", active === "all" ? null : ["==", ["get", "asset"], active]);
  }, [active]);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-line shadow-card">
      <div ref={ref} className="h-[64vh] min-h-[420px] w-full bg-ivory-2" />
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex flex-wrap gap-1.5 p-3">
        <button onClick={() => setActive("all")} className={`pointer-events-auto rounded-full border px-3 py-1 text-[12px] backdrop-blur transition ${active==="all"?"border-gold bg-gold text-white":"border-line bg-white/85 text-charcoal/70 hover:border-gold/50"}`}>{t.all}</button>
        {assetOrder.map((a) => (
          <button key={a} onClick={() => setActive(a)} className={`pointer-events-auto flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12px] backdrop-blur transition ${active===a?"border-gold bg-gold text-white":"border-line bg-white/85 text-charcoal/70 hover:border-gold/50"}`}>
            <span className="inline-block h-2 w-2 rounded-full" style={{ background: COLORS[a] || "#8A7342" }} />{assetLabels[a] || a}
          </button>
        ))}
      </div>
    </div>
  );
}
function esc(s: string) { return String(s).replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
function gradeFmt(g: string) { return ({ a_plus: "A+", a: "A", b: "B", c: "C" } as any)[g] || g; }
function unitFmt(u: string, l: string) {
  if (u === "sar_desk_month") return l === "ar" ? "ريال/مكتب/شهر" : "SAR/desk/mo";
  return l === "ar" ? "ريال/م²/سنة" : "SAR/sqm/yr";
}
