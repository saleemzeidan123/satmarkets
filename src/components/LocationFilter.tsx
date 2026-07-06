"use client";
import { useMemo, useState } from "react";
import Link from "next/link";

// Proper Saudi-wide location filter for the exchange. Locations are grouped by
// city so duplicates read clearly (Al Olaya, Riyadh vs Al Olaya, Khobar). Two
// ways in: a typeahead that searches every location across the Kingdom, and a
// browse-by-city panel split into developments, districts and areas (Law 7).

export type LocOpt = { id: string; city: string; kind: string; en: string; ar: string; count: number };

const KIND_T: Record<string, [string, string]> = {
  development: ["Developments", "المشاريع والوجهات"],
  district: ["Districts", "الأحياء"],
  area: ["Areas", "المناطق"],
};
const KIND_ORDER = ["development", "district", "area"];

export default function LocationFilter({ locale, locations, cities, selected, basePath, baseQs }: {
  locale: "en" | "ar";
  locations: LocOpt[];
  cities: { key: string; label: string }[];
  selected: string | null;
  basePath: string;
  baseQs: string;
}) {
  const ar = locale === "ar";
  const [q, setQ] = useState("");
  const selLoc = selected ? locations.find((l) => l.id === selected) ?? null : null;
  const [openCity, setOpenCity] = useState<string>(selLoc ? selLoc.city : (cities[0]?.key ?? ""));

  const nameOf = (l: LocOpt) => (ar ? l.ar || l.en : l.en);
  const cityLabelOf = (k: string) => cities.find((c) => c.key === k)?.label ?? k;
  const href = (id: string | null) => {
    const parts: string[] = [];
    if (baseQs) parts.push(baseQs);
    if (id) parts.push(`district=${id}`);
    const s = parts.join("&");
    return `${basePath}${s ? `?${s}` : ""}`;
  };

  const results = useMemo(() => {
    const t = q.trim();
    if (!t) return [];
    const tl = t.toLowerCase();
    return locations
      .filter((l) => l.en.toLowerCase().includes(tl) || (l.ar || "").includes(t) || cityLabelOf(l.city).toLowerCase().includes(tl) || l.city.toLowerCase().includes(tl))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [q, locations]);

  const cityLocs = locations.filter((l) => l.city === openCity).sort((a, b) => b.count - a.count);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {selLoc && (
        <div className="row gap8 wrap" style={{ alignItems: "center" }}>
          <span className="chip on" style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
            {nameOf(selLoc)}<span style={{ opacity: 0.7 }}>· {cityLabelOf(selLoc.city)}</span>
            <Link href={href(null)} aria-label={ar ? "إزالة الموقع" : "Clear location"} style={{ textDecoration: "none", color: "inherit" }}>✕</Link>
          </span>
        </div>
      )}
      <div style={{ position: "relative", maxWidth: 420 }}>
        <input value={q} onChange={(e) => setQ(e.target.value)}
          placeholder={ar ? "ابحث عن موقع في أي مدينة سعودية" : "Find a location in any Saudi city"}
          aria-label={ar ? "ابحث عن موقع" : "Find a location"} className="input"
          style={{ width: "100%", padding: "9px 12px", fontSize: 13.5, borderRadius: 9, border: "1px solid var(--silver-2)", background: "var(--paper)", textAlign: ar ? "right" : "left" }} />
        {results.length > 0 && (
          <div className="card" style={{ position: "absolute", zIndex: 20, left: 0, right: 0, marginTop: 4, maxHeight: 280, overflowY: "auto", padding: 6, boxShadow: "var(--z2)" }}>
            {results.map((l) => (
              <Link key={l.id} href={href(l.id)} onClick={() => setQ("")} className="row between"
                style={{ textDecoration: "none", color: "var(--ink)", padding: "8px 10px", borderRadius: 8, fontSize: 13.5, alignItems: "center", gap: 10 }}>
                <span>{nameOf(l)} <span className="muted" style={{ fontSize: 12 }}>· {cityLabelOf(l.city)}{l.kind === "development" ? (ar ? " · مشروع" : " · project") : ""}</span></span>
                <span className="muted mono" style={{ fontSize: 11.5 }}>{l.count}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
      <div className="row gap8 wrap" style={{ alignItems: "center" }}>
        {cities.map((c) => (
          <button key={c.key} type="button" onClick={() => setOpenCity(c.key)} aria-pressed={openCity === c.key}
            className={openCity === c.key ? "chip on" : "chip"} style={{ cursor: "pointer" }}>{c.label}</button>
        ))}
        <Link href={basePath.replace("/listings", "/locations")} className="chip" style={{ textDecoration: "none", opacity: 0.85 }}>{ar ? "الدليل الكامل" : "Full directory"}</Link>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {KIND_ORDER.filter((k) => cityLocs.some((l) => l.kind === k)).map((k) => (
          <div key={k} className="row gap8 wrap" style={{ alignItems: "center" }}>
            <span className="muted2" style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: ".08em", minWidth: 92, fontFamily: "var(--mono)" }}>{ar ? KIND_T[k][1] : KIND_T[k][0]}</span>
            {cityLocs.filter((l) => l.kind === k).map((l) => (
              <Link key={l.id} href={href(l.id)} className={selected === l.id ? "chip on" : "chip"} style={{ textDecoration: "none" }}>
                {nameOf(l)}{l.kind === "development" ? <span style={{ opacity: 0.6, fontSize: 10.5 }}> · {ar ? "مشروع" : "project"}</span> : null} <span style={{ opacity: 0.55, fontFamily: "var(--mono)", fontSize: 11 }}>{l.count}</span>
              </Link>
            ))}
          </div>
        ))}
        {cityLocs.length === 0 && <span className="muted" style={{ fontSize: 12.5 }}>{ar ? "لا مواقع في هذه المدينة بعد" : "No locations in this city yet"}</span>}
      </div>
    </div>
  );
}
