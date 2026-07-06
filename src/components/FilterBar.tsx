"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

// Dropdown-based filter bar for the exchange. Pills open in-flow panels.
// Location searches our verified areas first and the full Saudi geography via
// /api/places (Mapbox) below. Property type, grade and fit-out are multi-select.
// Size and rent take either a preset band or an exact figure (nearest first).

export type LocOpt = { id: string; city: string; kind: string; en: string; ar: string; count: number };
type Opt = { value: string; label: string };
type Params = Record<string, string>;

const KIND_T: Record<string, [string, string]> = {
  development: ["Developments", "المشاريع والوجهات"],
  district: ["Districts", "الأحياء"],
  area: ["Areas", "المناطق"],
};
const KIND_ORDER = ["development", "district", "area"];

export default function FilterBar({ locale, params, cities, locations, assets, grades, fits, sorts, basePath }: {
  locale: "en" | "ar";
  params: Params;
  cities: { key: string; label: string }[];
  locations: LocOpt[];
  assets: Opt[];
  grades: Opt[];
  fits: Opt[];
  sorts: Opt[];
  basePath: string;
}) {
  const ar = locale === "ar";
  const router = useRouter();
  const [open, setOpen] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [places, setPlaces] = useState<{ label: string; sub: string }[]>([]);
  const wrapRef = useRef<HTMLDivElement>(null);
  const t = (en: string, arr: string) => (ar ? arr : en);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(null); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);
  useEffect(() => {
    const s = q.trim();
    if (s.length < 2) { setPlaces([]); return; }
    const ctl = new AbortController();
    const h = setTimeout(async () => {
      try {
        const r = await fetch(`/api/places?q=${encodeURIComponent(s)}`, { signal: ctl.signal });
        const j = await r.json();
        setPlaces(Array.isArray(j.items) ? j.items.slice(0, 6) : []);
      } catch {}
    }, 220);
    return () => { clearTimeout(h); ctl.abort(); };
  }, [q]);

  const nav = (patch: Params) => {
    const next: Params = { ...params, ...patch };
    const p = new URLSearchParams();
    Object.entries(next).forEach(([k, v]) => { if (v) p.set(k, String(v)); });
    setOpen(null);
    router.push(`${basePath}${p.toString() ? `?${p.toString()}` : ""}`);
  };
  const csv = (key: string) => (params[key] ? params[key].split(",").filter(Boolean) : []);
  const toggleCsv = (key: string, val: string) => {
    const set = new Set(csv(key));
    set.has(val) ? set.delete(val) : set.add(val);
    const next: Params = { ...params, [key]: Array.from(set).join(",") };
    const p = new URLSearchParams();
    Object.entries(next).forEach(([k, v]) => { if (v) p.set(k, String(v)); });
    router.push(`${basePath}${p.toString() ? `?${p.toString()}` : ""}`);
  };
  const nameOf = (l: LocOpt) => (ar ? l.ar || l.en : l.en);
  const cityLabel = (k: string) => cities.find((c) => c.key === k)?.label ?? k;
  const selLoc = params.district ? locations.find((l) => l.id === params.district) ?? null : null;

  const SIZES: [string, string, string][] = [
    [t("Under 200 m²", "أقل من 200 م²"), "", "200"], [t("200 to 500", "200 إلى 500"), "200", "500"],
    [t("500 to 1,000", "500 إلى 1,000"), "500", "1000"], [t("1,000 to 2,500", "1,000 إلى 2,500"), "1000", "2500"],
    [t("Over 2,500 m²", "أكثر من 2,500"), "2500", ""],
  ];
  const RENTS: [string, string, string][] = [
    [t("Under 1,000", "أقل من 1,000"), "", "1000"], [t("1,000 to 2,000", "1,000 إلى 2,000"), "1000", "2000"],
    [t("2,000 to 3,000", "2,000 إلى 3,000"), "2000", "3000"], [t("Over 3,000", "أكثر من 3,000"), "3000", ""],
  ];

  const pill = (key: string, label: string, active: boolean) => (
    <button type="button" onClick={() => setOpen(open === key ? null : key)} aria-expanded={open === key}
      className="chip" style={{ height: 38, padding: "0 13px", borderRadius: 999, gap: 7, cursor: "pointer",
        borderColor: active || open === key ? "var(--azure)" : "var(--silver-2)",
        background: active ? "var(--azure-wash)" : "var(--paper)", color: active ? "var(--azure-d)" : "var(--ink)", fontSize: 13.5 }}>
      {label}<span style={{ fontSize: 13, color: "var(--slate-2)" }}>▾</span>
    </button>
  );
  const row = (label: string, active: boolean, on: () => void, right?: string) => (
    <button type="button" onClick={on} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: ar ? "right" : "left",
      padding: "9px 10px", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 14,
      background: active ? "var(--azure-wash)" : "transparent", color: "var(--ink)" }}>
      <span style={{ flex: 1 }}>{label}</span>
      {right ? <span className="mono" style={{ fontSize: 12, color: "var(--slate-2)" }}>{right}</span> : null}
      {active ? <span style={{ color: "var(--azure-d)" }}>✓</span> : null}
    </button>
  );
  const check = (label: string, on: boolean, toggle: () => void) => (
    <button key={label} type="button" onClick={toggle} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: ar ? "right" : "left",
      padding: "8px 10px", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 14, background: "transparent", color: "var(--ink)" }}>
      <span style={{ width: 18, height: 18, borderRadius: 5, border: `1.5px solid ${on ? "var(--azure)" : "var(--silver-2)"}`, background: on ? "var(--azure)" : "transparent",
        display: "inline-flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 11 }}>{on ? "✓" : ""}</span>
      {label}
    </button>
  );

  const panelBox = (children: React.ReactNode, w = 340) => (
    <div className="card" style={{ position: "absolute", top: "calc(100% + 8px)", insetInlineStart: 0, zIndex: 40, width: w, maxWidth: "88vw", maxHeight: 380, overflowY: "auto", padding: 10, boxShadow: "var(--z2)" }}>
      {children}
    </div>
  );

  const assetSel = csv("asset"), gradeSel = csv("grade"), fitSel = csv("fit");
  const activeSize = params.sz ? `${Number(params.sz).toLocaleString("en-US")} m²` : (params.smin || params.smax ? SIZES.find((s) => s[1] === (params.smin || "") && s[2] === (params.smax || ""))?.[0] : "");
  const activeRent = params.rt ? `${Number(params.rt).toLocaleString("en-US")}` : (params.pmin || params.pmax ? RENTS.find((s) => s[1] === (params.pmin || "") && s[2] === (params.pmax || ""))?.[0] : "");

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <div className="row gap8 wrap" style={{ alignItems: "center" }}>
        <div style={{ position: "relative" }}>
          {pill("loc", selLoc ? `${nameOf(selLoc)}` : params.place ? params.place : t("Location", "الموقع"), !!(selLoc || params.place))}
          {open === "loc" ? panelBox(
            <div>
              <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("Search any city or district in Saudi Arabia", "ابحث عن أي مدينة أو حي في السعودية")}
                className="input" style={{ width: "100%", height: 38, padding: "0 12px", borderRadius: 8, border: "1px solid var(--silver-2)", fontSize: 14, boxSizing: "border-box", textAlign: ar ? "right" : "left" }} />
              <div className="muted" style={{ fontSize: 11.5, margin: "6px 2px 8px" }}>{t("Full Saudi coverage. Verified areas first.", "تغطية كاملة للسعودية. المناطق الموثّقة أولاً.")}</div>
              {cities.map((c) => {
                const inCity = locations.filter((l) => l.city === c.key && (!q.trim() || l.en.toLowerCase().includes(q.trim().toLowerCase()) || (l.ar || "").includes(q.trim())));
                if (!inCity.length) return null;
                return (
                  <div key={c.key} style={{ marginBottom: 4 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, margin: "6px 2px 2px" }}>{c.label}</div>
                    {KIND_ORDER.filter((k) => inCity.some((l) => l.kind === k)).map((k) => (
                      <div key={k}>
                        <div className="muted2" style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: ".07em", margin: "6px 2px 2px", fontFamily: "var(--mono)" }}>{ar ? KIND_T[k][1] : KIND_T[k][0]}</div>
                        {inCity.filter((l) => l.kind === k).map((l) => row(nameOf(l) + (k === "development" ? t(" · project", " · مشروع") : ""), params.district === l.id, () => nav({ district: l.id, city: c.key, place: "" }), String(l.count)))}
                      </div>
                    ))}
                  </div>
                );
              })}
              {places.length ? (
                <div style={{ marginTop: 6, borderTop: "1px solid var(--silver)", paddingTop: 6 }}>
                  <div className="muted2" style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: ".07em", margin: "0 2px 2px", fontFamily: "var(--mono)" }}>{t("Across Saudi Arabia", "في أنحاء السعودية")}</div>
                  {places.map((p, i) => row(`${p.label}${p.sub ? ` · ${p.sub}` : ""}`, false, () => nav({ place: p.label, district: "", city: "" })))}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <div style={{ position: "relative" }}>
          {pill("deal", params.deal ? (params.deal === "sale" ? t("For sale", "للبيع") : t("For lease", "للإيجار")) : t("Deal", "الصفقة"), !!params.deal)}
          {open === "deal" ? panelBox(
            <div>
              {row(t("Any", "الكل"), !params.deal, () => nav({ deal: "" }))}
              {row(t("For lease", "للإيجار"), params.deal === "lease", () => nav({ deal: "lease" }))}
              {row(t("For sale", "للبيع"), params.deal === "sale", () => nav({ deal: "sale" }))}
            </div>, 220) : null}
        </div>

        <div style={{ position: "relative" }}>
          {pill("asset", assetSel.length ? `${t("Type", "النوع")} (${assetSel.length})` : t("Property type", "نوع العقار"), assetSel.length > 0)}
          {open === "asset" ? panelBox(
            <div>
              <div className="muted" style={{ fontSize: 11.5, margin: "0 2px 6px" }}>{t("Pick one or more.", "اختر واحداً أو أكثر.")}</div>
              {assets.map((a) => check(a.label, assetSel.includes(a.value), () => toggleCsv("asset", a.value)))}
            </div>) : null}
        </div>

        <div style={{ position: "relative" }}>
          {pill("size", activeSize || t("Size", "المساحة"), !!activeSize)}
          {open === "size" ? panelBox(
            <div>
              {SIZES.map((s) => row(s[0], (params.smin || "") === s[1] && (params.smax || "") === s[2] && !params.sz, () => nav({ smin: s[1], smax: s[2], sz: "" })))}
              <div style={{ borderTop: "1px solid var(--silver)", margin: "8px 0", paddingTop: 8 }}>
                <div className="muted" style={{ fontSize: 11.5, margin: "0 2px 6px" }}>{t("Or enter an exact size, we show the nearest", "أو أدخل مساحة محددة، ونعرض الأقرب")}</div>
                <form onSubmit={(e) => { e.preventDefault(); const v = (new FormData(e.currentTarget).get("sz") as string || "").replace(/[^0-9]/g, ""); if (v) nav({ sz: v, smin: "", smax: "" }); }} className="row gap8">
                  <input name="sz" defaultValue={params.sz || ""} inputMode="numeric" placeholder={t("e.g. 350", "مثال 350")} className="input" style={{ flex: 1, height: 36, padding: "0 10px", borderRadius: 8, border: "1px solid var(--silver-2)", fontSize: 14, boxSizing: "border-box" }} />
                  <button type="submit" className="btn primary" style={{ height: 36 }}>{t("m²", "م²")}</button>
                </form>
              </div>
            </div>, 300) : null}
        </div>

        <div style={{ position: "relative" }}>
          {pill("rent", activeRent ? `${activeRent}` : t("Rent", "الإيجار"), !!activeRent)}
          {open === "rent" ? panelBox(
            <div>
              <div className="muted" style={{ fontSize: 11.5, margin: "0 2px 6px" }}>{t("SAR / m² / yr. Lease listings.", "ريال / م² / سنة. عروض الإيجار.")}</div>
              {RENTS.map((s) => row(s[0], (params.pmin || "") === s[1] && (params.pmax || "") === s[2] && !params.rt, () => nav({ pmin: s[1], pmax: s[2], rt: "" })))}
              <div style={{ borderTop: "1px solid var(--silver)", margin: "8px 0", paddingTop: 8 }}>
                <div className="muted" style={{ fontSize: 11.5, margin: "0 2px 6px" }}>{t("Or enter an exact rent, we show the nearest", "أو أدخل إيجاراً محدداً، ونعرض الأقرب")}</div>
                <form onSubmit={(e) => { e.preventDefault(); const v = (new FormData(e.currentTarget).get("rt") as string || "").replace(/[^0-9]/g, ""); if (v) nav({ rt: v, pmin: "", pmax: "" }); }} className="row gap8">
                  <input name="rt" defaultValue={params.rt || ""} inputMode="numeric" placeholder={t("e.g. 1,800", "مثال 1,800")} className="input" style={{ flex: 1, height: 36, padding: "0 10px", borderRadius: 8, border: "1px solid var(--silver-2)", fontSize: 14, boxSizing: "border-box" }} />
                  <button type="submit" className="btn primary" style={{ height: 36 }}>{t("SAR", "ريال")}</button>
                </form>
              </div>
            </div>, 300) : null}
        </div>

        <div style={{ position: "relative" }}>
          {pill("grade", gradeSel.length ? `${t("Grade", "الفئة")} (${gradeSel.length})` : t("Grade", "الفئة"), gradeSel.length > 0)}
          {open === "grade" ? panelBox(<div>{grades.map((g) => check(g.label, gradeSel.includes(g.value), () => toggleCsv("grade", g.value)))}</div>, 220) : null}
        </div>

        <div style={{ position: "relative" }}>
          {pill("fit", fitSel.length ? `${t("Fit-out", "التجهيز")} (${fitSel.length})` : t("Fit-out", "التجهيز"), fitSel.length > 0)}
          {open === "fit" ? panelBox(<div>{fits.map((f) => check(f.label, fitSel.includes(f.value), () => toggleCsv("fit", f.value)))}</div>, 240) : null}
        </div>

        <button type="button" onClick={() => nav({ verified: params.verified ? "" : "1" })} className="chip"
          style={{ height: 38, padding: "0 13px", borderRadius: 999, cursor: "pointer", gap: 7,
            borderColor: params.verified ? "var(--green)" : "var(--silver-2)", background: params.verified ? "#EAF6EF" : "var(--paper)", color: params.verified ? "#1F8A5B" : "var(--ink)", fontSize: 13.5 }}>
          {params.verified ? "✓ " : ""}{t("Verified owners", "ملاك موثّقون")}
        </button>

        <div style={{ position: "relative", marginInlineStart: "auto" }}>
          {pill("sort", `${t("Sort", "ترتيب")}: ${sorts.find((s) => s.value === (params.sort || sorts[0].value))?.label}`, false)}
          {open === "sort" ? panelBox(<div>{sorts.map((s) => row(s.label, (params.sort || sorts[0].value) === s.value, () => nav({ sort: s.value })))}</div>, 240) : null}
        </div>
      </div>
    </div>
  );
}
