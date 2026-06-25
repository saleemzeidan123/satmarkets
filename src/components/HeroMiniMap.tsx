"use client";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import "maplibre-gl/dist/maplibre-gl.css";

// Real Riyadh prime-district landmarks with published SAT Rent Index medians.
// Build-phase: a curated handful so the hero map shows true locations and bands.
const PINS: { name: string; place: string; lat: number; lng: number; price: number; featured?: boolean }[] = [
  { name: "PIF Tower", place: "KAFD", lat: 24.7665, lng: 46.6420, price: 3700, featured: true },
  { name: "Granada Tower", place: "Granada", lat: 24.7775, lng: 46.7413, price: 1350 },
  { name: "VIA Riyadh", place: "Hittin", lat: 24.7530, lng: 46.6090, price: 2400 },
  { name: "Centria Mall", place: "Al Olaya", lat: 24.6960, lng: 46.6855, price: 2845 },
];

export default function HeroMiniMap({ locale = "en" }: { locale?: "en" | "ar" }) {
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const ar = locale === "ar";

  useEffect(() => {
    let map: any; let cancelled = false;
    (async () => {
      if (!ref.current) return;
      const maplibregl = (await import("maplibre-gl")).default;
      if (cancelled || !ref.current) return;
      map = new maplibregl.Map({
        container: ref.current,
        style: "https://tiles.openfreemap.org/styles/positron",
        center: [46.675, 24.737], zoom: 9.6, attributionControl: false,
        scrollZoom: false, dragRotate: false, pitchWithRotate: false,
      });
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), ar ? "top-left" : "top-right");
      // Markers are projected from center/zoom (set at construction) and do NOT
      // depend on tiles, so add them immediately rather than gating on "load"
      // (which can lag or stall if the tile server is slow).
      const addPins = () => {
        if ((map as any).__pins) return; (map as any).__pins = true;
        PINS.forEach((p) => {
          const el = document.createElement("button");
          el.className = "hmpin" + (p.featured ? " feat" : "");
          el.type = "button";
          el.innerHTML = `<span class="d"></span>${p.price.toLocaleString()}`;
          el.title = `${p.name} · ${p.place}`;
          el.addEventListener("click", () => router.push(`/${locale}/listings?q=${encodeURIComponent(p.place)}`));
          new maplibregl.Marker({ element: el, anchor: "bottom" }).setLngLat([p.lng, p.lat]).addTo(map);
        });
      };
      addPins();
      map.on("style.load", addPins);
      // Frame all pins with breathing room instead of a fixed tight zoom.
      const b = new maplibregl.LngLatBounds();
      PINS.forEach((p) => b.extend([p.lng, p.lat]));
      map.fitBounds(b, { padding: { top: 64, bottom: 56, left: 70, right: 56 }, maxZoom: 11.2, duration: 0 });
    })();
    return () => { cancelled = true; if (map) map.remove(); };
  }, [locale, ar, router]);

  return (
    <div style={{ position: "relative", width: "100%", display: "flex", flexDirection: "column", minHeight: 420 }}>
      <style>{`
        .hmpin{display:inline-flex;align-items:center;gap:6px;font-family:var(--mono);font-size:12px;font-weight:600;color:var(--ink);background:#fff;border:1px solid var(--silver);border-radius:20px;padding:5px 11px;box-shadow:0 4px 14px rgba(16,26,38,.16);cursor:pointer;white-space:nowrap;transition:transform .12s ease,box-shadow .12s ease;}
        .hmpin:hover{transform:translateY(-2px);box-shadow:0 8px 22px rgba(16,26,38,.24);}
        .hmpin .d{width:7px;height:7px;border-radius:50%;background:var(--harbor);}
        .hmpin.feat{background:var(--ink);color:#fff;border-color:var(--ink);}
        .hmpin.feat .d{background:#3ECF8E;}
        .hm-wrap .maplibregl-ctrl-group{border-radius:9px;overflow:hidden;box-shadow:0 2px 10px rgba(16,26,38,.18);}
      `}</style>
      <div className="hm-wrap" ref={ref} style={{ flex: 1, minHeight: 420, borderRadius: 18, border: "1px solid var(--silver)", boxShadow: "var(--sh-2)", overflow: "hidden", background: "#eef2f6" }} />
      <div className="card" style={{ position: "absolute", left: -18, top: 26, padding: "11px 14px", boxShadow: "var(--sh-2)", zIndex: 2, background: "#fff" }}>
        <div className="mono" style={{ fontSize: 19, fontWeight: 500, color: "var(--green)" }}>+8.4%</div>
        <div className="muted" style={{ fontSize: 10.5, marginTop: 1 }}>{ar ? "العليا فئة أ، سنوياً" : "Olaya Grade A, YoY"}</div>
      </div>
      <span className="tag" style={{ position: "absolute", left: 14, bottom: 14, background: "rgba(255,255,255,.94)", display: "flex", gap: 7, alignItems: "center", boxShadow: "var(--sh-1)", zIndex: 2 }}>
        <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--green)" }} />{ar ? "مؤشر الإيجارات · الرياض" : "Live · SAT Rent Index, Riyadh"}
      </span>
    </div>
  );
}
