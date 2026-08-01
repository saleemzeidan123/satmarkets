"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { formatUnit } from "@/lib/format";

// Dropdown filter bar for the exchange. Pills toggle a single in-flow panel
// rendered below the row, so it never overflows on mobile or in the app shell.
// Location searches verified areas first and the full Saudi geography via
// /api/places (Mapbox). Property type, grade and fit-out are multi-select.
// Size and rent take a preset band or an exact figure (nearest first).

export type LocOpt = { id: string; city: string; kind: string; en: string; ar: string; count: number };
type Opt = { value: string; label: string };
type Params = Record<string, string>;

const KIND_T: Record<string, [string, string]> = {
  development: ["Developments", "المشاريع والوجهات"],
  district: ["Districts", "الأحياء"],
  area: ["Areas", "المناطق"],
};
const KIND_ORDER = ["development", "district", "area"];

export default function FilterBar({ locale, params, cities, locations, assets, grades, fits, sorts, basePath, assetCounts, gradeCounts, fitCounts }: {
  locale: "en" | "ar"; params: Params; cities: { key: string; label: string }[];
  locations: LocOpt[]; assets: Opt[]; grades: Opt[]; fits: Opt[]; sorts: Opt[]; basePath: string;
  assetCounts?: Record<string, number>; gradeCounts?: Record<string, number>; fitCounts?: Record<string, number>;
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
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(null); };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDoc); document.removeEventListener("keydown", onKey); };
  }, []);
  useEffect(() => {
    const s = q.trim();
    if (s.length < 2) { setPlaces([]); return; }
    const ctl = new AbortController();
    const h = setTimeout(async () => {
      try { const r = await fetch(`/api/places?q=${encodeURIComponent(s)}`, { signal: ctl.signal }); const j = await r.json(); setPlaces(Array.isArray(j.items) ? j.items.slice(0, 6) : []); } catch {}
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
  const SALE_PRICES: [string, string, string][] = [
    [t("Under 5M SAR", "أقل من 5 مليون ريال"), "", "5000000"], [t("5M to 15M", "5 إلى 15 مليون"), "5000000", "15000000"],
    [t("15M to 50M", "15 إلى 50 مليون"), "15000000", "50000000"], [t("Over 50M", "أكثر من 50 مليون"), "50000000", ""],
  ];
  const isSale = params.deal === "sale";
  const assetSel = csv("asset"), gradeSel = csv("grade"), fitSel = csv("fit");
  const activeSize = params.sz ? `${Number(params.sz).toLocaleString("en-US")} m²` : (params.smin || params.smax ? SIZES.find((s) => s[1] === (params.smin || "") && s[2] === (params.smax || ""))?.[0] : "");
  const activeRent = params.rt ? `${Number(params.rt).toLocaleString("en-US")}` : (params.pmin || params.pmax ? RENTS.find((s) => s[1] === (params.pmin || "") && s[2] === (params.pmax || ""))?.[0] : "");
  const activePrice = params.sp ? `${Number(params.sp).toLocaleString("en-US")}` : (params.spmin || params.spmax ? SALE_PRICES.find((s) => s[1] === (params.spmin || "") && s[2] === (params.spmax || ""))?.[0] : "");

  const pill = (key: string, label: string, active: boolean, right?: boolean) => (
    <button type="button" key={key} onClick={() => setOpen(open === key ? null : key)} aria-expanded={open === key}
      className="chip" style={{ height: 38, padding: "0 13px", borderRadius: 999, gap: 7, cursor: "pointer", marginInlineStart: right ? "auto" : undefined,
        borderColor: active || open === key ? "var(--azure)" : "var(--silver-2)", background: active ? "var(--azure-wash)" : "var(--paper)", color: active ? "var(--azure-d)" : "var(--ink)", fontSize: "var(--fs-base)", whiteSpace: "nowrap" }}>
      {label}<span style={{ fontSize: "var(--fs-sm)", color: "var(--slate-2)", transform: open === key ? "rotate(180deg)" : undefined }}>▾</span>
    </button>
  );
  const row = (label: React.ReactNode, active: boolean, on: () => void, rightTxt?: string) => (
    <button type="button" onClick={on} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: ar ? "right" : "left", padding: "10px 10px", border: "none", borderRadius: 8, cursor: "pointer", fontSize: "var(--fs-md)", background: active ? "var(--azure-wash)" : "transparent", color: "var(--ink)" }}>
      <span style={{ flex: 1 }}>{label}</span>
      {rightTxt ? <span className="mono" style={{ fontSize: "var(--fs-xs)", color: "var(--slate-2)" }}>{rightTxt}</span> : null}
      {active ? <span style={{ color: "var(--azure-d)" }}>✓</span> : null}
    </button>
  );
  const check = (label: string, on: boolean, toggle: () => void, count?: number) => (
    <button key={label} type="button" onClick={toggle} style={{ display: "flex", alignItems: "center", gap: 11, width: "100%", textAlign: ar ? "right" : "left", padding: "10px 10px", border: "none", borderRadius: 8, cursor: "pointer", fontSize: "var(--fs-md)", background: "transparent", color: "var(--ink)" }}>
      <span style={{ width: 20, height: 20, flex: "0 0 auto", borderRadius: 5, border: `1.5px solid ${on ? "var(--azure)" : "var(--silver-2)"}`, background: on ? "var(--azure)" : "transparent", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "var(--on-brand)", fontSize: "var(--fs-xs)" }}>{on ? "✓" : ""}</span>
      <span style={{ flex: 1 }}>{label}</span>
      {count != null ? <span className="mono" style={{ fontSize: "var(--fs-2xs)", color: "var(--slate-2)" }}>{count}</span> : null}
    </button>
  );

  const renderPanel = () => {
    if (open === "loc") return (
      <div>
        <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("Search any city or district in Saudi Arabia", "ابحث عن أي مدينة أو حي في السعودية")}
          className="input" style={{ width: "100%", height: 42, padding: "0 12px", borderRadius: 8, border: "1px solid var(--silver-2)", fontSize: "var(--fs-input)", boxSizing: "border-box", textAlign: ar ? "right" : "left" }} />
        <div className="muted" style={{ fontSize: "var(--fs-xs)", margin: "8px 2px 6px" }}>{q.trim() ? t("Indexed areas first, then all of Saudi Arabia.", "المناطق المفهرسة أولاً، ثم كل السعودية.") : t("Areas with listed spaces. Type to search all of Saudi Arabia.", "مناطق بها مساحات معروضة. اكتب للبحث في كل السعودية.")}</div>
        {cities.map((c) => {
          const ql = q.trim().toLowerCase();
          const inCity = locations.filter((l) => l.city === c.key && (ql ? (l.en.toLowerCase().includes(ql) || (l.ar || "").includes(q.trim())) : (Number(l.count) || 0) > 0));
          if (!inCity.length) return null;
          return (
            <div key={c.key} style={{ marginBottom: 4 }}>
              <div style={{ fontSize: "var(--fs-base)", fontWeight: 500, margin: "6px 2px 2px" }}>{c.label}</div>
              {KIND_ORDER.filter((k) => inCity.some((l) => l.kind === k)).map((k) => (
                <div key={k}>
                  <div className="muted2" style={{ fontSize: "var(--fs-2xs)", textTransform: "uppercase", letterSpacing: ".07em", margin: "6px 2px 2px", fontFamily: "var(--mono)" }}>{ar ? KIND_T[k][1] : KIND_T[k][0]}</div>
                  {inCity.filter((l) => l.kind === k).map((l) => row(nameOf(l) + (k === "development" ? t(" · project", " · مشروع") : ""), params.district === l.id, () => nav({ district: l.id, city: c.key, place: "" }), String(l.count)))}
                </div>
              ))}
            </div>
          );
        })}
        {places.length ? (
          <div style={{ marginTop: 6, borderTop: "1px solid var(--silver)", paddingTop: 6 }}>
            <div className="muted2" style={{ fontSize: "var(--fs-2xs)", textTransform: "uppercase", letterSpacing: ".07em", margin: "0 2px 2px", fontFamily: "var(--mono)" }}>{t("Across Saudi Arabia", "في أنحاء السعودية")}</div>
            {places.map((p, i) => row(`${p.label}${p.sub ? ` · ${p.sub}` : ""}`, false, () => nav({ place: p.label, district: "", city: "" })))}
          </div>
        ) : null}
      </div>
    );
    if (open === "deal") return (<div>{row(t("Any", "الكل"), !params.deal, () => nav({ deal: "" }))}{row(t("For lease", "للإيجار"), params.deal === "lease", () => nav({ deal: "lease" }))}{row(t("For sale", "للبيع"), params.deal === "sale", () => nav({ deal: "sale" }))}</div>);
    if (open === "asset") return (<div><div className="muted" style={{ fontSize: "var(--fs-xs)", margin: "0 2px 6px" }}>{t("Pick one or more.", "اختر واحداً أو أكثر.")}</div>{assets.map((a) => check(a.label, assetSel.includes(a.value), () => toggleCsv("asset", a.value), assetCounts?.[a.value]))}</div>);
    if (open === "grade") return (<div>{grades.map((g) => check(g.label, gradeSel.includes(g.value), () => toggleCsv("grade", g.value), gradeCounts?.[g.value]))}</div>);
    if (open === "fit") return (<div>{fits.map((f) => check(f.label, fitSel.includes(f.value), () => toggleCsv("fit", f.value), fitCounts?.[f.value]))}</div>);
    if (open === "sort") return (<div>{sorts.map((s) => row(s.label, (params.sort || sorts[0].value) === s.value, () => nav({ sort: s.value })))}</div>);
    if (open === "size") return (
      <div>
        {SIZES.map((s) => row(s[0], (params.smin || "") === s[1] && (params.smax || "") === s[2] && !params.sz, () => nav({ smin: s[1], smax: s[2], sz: "" })))}
        <div style={{ borderTop: "1px solid var(--silver)", margin: "8px 0", paddingTop: 8 }}>
          <div className="muted" style={{ fontSize: "var(--fs-xs)", margin: "0 2px 6px" }}>{t("Or enter an exact size, we show the nearest", "أو أدخل مساحة محددة، ونعرض الأقرب")}</div>
          <form onSubmit={(e) => { e.preventDefault(); const v = (new FormData(e.currentTarget).get("sz") as string || "").replace(/[^0-9]/g, ""); if (v) nav({ sz: v, smin: "", smax: "" }); }} className="row gap8">
            <input name="sz" defaultValue={params.sz || ""} inputMode="numeric" placeholder={t("e.g. 350", "مثال 350")} className="input" style={{ flex: 1, height: 42, padding: "0 10px", borderRadius: 8, border: "1px solid var(--silver-2)", fontSize: "var(--fs-input)", boxSizing: "border-box" }} />
            <button type="submit" className="btn primary" style={{ height: 42 }}>{t("m²", "م²")}</button>
          </form>
        </div>
      </div>
    );
    if (open === "rent") return isSale ? (
      <div>
        <div className="muted" style={{ fontSize: "var(--fs-xs)", margin: "0 2px 6px" }}>{t("SAR total. Sale listings.", "ريال إجمالي. عروض البيع.")}</div>
        {SALE_PRICES.map((s) => row(s[0], (params.spmin || "") === s[1] && (params.spmax || "") === s[2] && !params.sp, () => nav({ spmin: s[1], spmax: s[2], sp: "" })))}
        <div style={{ borderTop: "1px solid var(--silver)", margin: "8px 0", paddingTop: 8 }}>
          <div className="muted" style={{ fontSize: "var(--fs-xs)", margin: "0 2px 6px" }}>{t("Or enter an exact price, we show the nearest", "أو أدخل سعراً محدداً، ونعرض الأقرب")}</div>
          <form onSubmit={(e) => { e.preventDefault(); const v = (new FormData(e.currentTarget).get("sp") as string || "").replace(/[^0-9]/g, ""); if (v) nav({ sp: v, spmin: "", spmax: "" }); }} className="row gap8">
            <input name="sp" defaultValue={params.sp || ""} inputMode="numeric" placeholder={t("e.g. 12,000,000", "مثال 12,000,000")} className="input" style={{ flex: 1, height: 42, padding: "0 10px", borderRadius: 8, border: "1px solid var(--silver-2)", fontSize: "var(--fs-input)", boxSizing: "border-box" }} />
            <button type="submit" className="btn primary" style={{ height: 42 }}>{t("SAR", "ريال")}</button>
          </form>
        </div>
      </div>
    ) : (
      <div>
        <div className="muted" style={{ fontSize: "var(--fs-xs)", margin: "0 2px 6px" }}>{/* PKG-FIG2, finding 129. Both halves of this caption spelled the lease
                unit with spaces around the separators, which is a spelling no figure
                on the site is rendered in, so the heading over the rent bands did not
                match the rents underneath it. */}
          {t(`${formatUnit("sar_sqm_year", "en", "short")}. Lease listings.`, `${formatUnit("sar_sqm_year", "ar", "short")}. عروض الإيجار.`)}</div>
        {RENTS.map((s) => row(s[0], (params.pmin || "") === s[1] && (params.pmax || "") === s[2] && !params.rt, () => nav({ pmin: s[1], pmax: s[2], rt: "" })))}
        <div style={{ borderTop: "1px solid var(--silver)", margin: "8px 0", paddingTop: 8 }}>
          <div className="muted" style={{ fontSize: "var(--fs-xs)", margin: "0 2px 6px" }}>{t("Or enter an exact rent, we show the nearest", "أو أدخل إيجاراً محدداً، ونعرض الأقرب")}</div>
          <form onSubmit={(e) => { e.preventDefault(); const v = (new FormData(e.currentTarget).get("rt") as string || "").replace(/[^0-9]/g, ""); if (v) nav({ rt: v, pmin: "", pmax: "" }); }} className="row gap8">
            <input name="rt" defaultValue={params.rt || ""} inputMode="numeric" placeholder={t("e.g. 1,800", "مثال 1,800")} className="input" style={{ flex: 1, height: 42, padding: "0 10px", borderRadius: 8, border: "1px solid var(--silver-2)", fontSize: "var(--fs-input)", boxSizing: "border-box" }} />
            <button type="submit" className="btn primary" style={{ height: 42 }}>{t("SAR", "ريال")}</button>
          </form>
        </div>
      </div>
    );
    return null;
  };

  const clearAll = () => {
    const p = new URLSearchParams();
    if (params.sort) p.set("sort", params.sort);
    setOpen(null);
    router.push(`${basePath}${p.toString() ? `?${p.toString()}` : ""}`);
  };
  const activeChips: { label: string; clear: Params }[] = [];
  if (selLoc) activeChips.push({ label: nameOf(selLoc), clear: { district: "", city: "", place: "" } });
  else if (params.place) activeChips.push({ label: params.place, clear: { place: "" } });
  if (params.deal) activeChips.push({ label: params.deal === "sale" ? t("For sale", "للبيع") : t("For lease", "للإيجار"), clear: { deal: "" } });
  if (assetSel.length) activeChips.push({ label: `${t("Type", "النوع")} (${assetSel.length})`, clear: { asset: "" } });
  if (activeSize) activeChips.push({ label: activeSize as string, clear: { smin: "", smax: "", sz: "" } });
  if (isSale ? activePrice : activeRent) activeChips.push({ label: (isSale ? activePrice : activeRent) as string, clear: isSale ? { spmin: "", spmax: "", sp: "" } : { pmin: "", pmax: "", rt: "" } });
  if (gradeSel.length) activeChips.push({ label: `${t("Grade", "الفئة")} (${gradeSel.length})`, clear: { grade: "" } });
  if (fitSel.length) activeChips.push({ label: `${t("Fit-out", "التجهيز")} (${fitSel.length})`, clear: { fit: "" } });
  if (params.verified) activeChips.push({ label: t("Ownership verified", "الملكية موثّقة"), clear: { verified: "" } });

  return (
    <div ref={wrapRef}>
      <div className="row gap8 wrap lst-filterpills" style={{ alignItems: "center" }}>
        {pill("loc", selLoc ? nameOf(selLoc) : params.place ? params.place : t("Location", "الموقع"), !!(selLoc || params.place))}
        {pill("deal", params.deal ? (params.deal === "sale" ? t("For sale", "للبيع") : t("For lease", "للإيجار")) : t("Deal", "الصفقة"), !!params.deal)}
        {pill("asset", assetSel.length ? `${t("Type", "النوع")} (${assetSel.length})` : t("Property type", "نوع العقار"), assetSel.length > 0)}
        {pill("size", activeSize || t("Size", "المساحة"), !!activeSize)}
        {pill("rent", isSale ? (activePrice || t("Price", "السعر")) : (activeRent || t("Rent", "الإيجار")), isSale ? !!activePrice : !!activeRent)}
        {pill("grade", gradeSel.length ? `${t("Grade", "الفئة")} (${gradeSel.length})` : t("Grade", "الفئة"), gradeSel.length > 0)}
        {pill("fit", fitSel.length ? `${t("Fit-out", "التجهيز")} (${fitSel.length})` : t("Fit-out", "التجهيز"), fitSel.length > 0)}
        <button type="button" onClick={() => nav({ verified: params.verified ? "" : "1" })} className="chip"
          style={{ height: 38, padding: "0 13px", borderRadius: 999, cursor: "pointer", gap: 7, whiteSpace: "nowrap", borderColor: params.verified ? "var(--green)" : "var(--silver-2)", background: params.verified ? "#EAF6EF" : "var(--paper)", color: params.verified ? "var(--verified)" : "var(--ink)", fontSize: "var(--fs-base)" }}>
          {params.verified ? "✓ " : ""}{t("Ownership verified", "الملكية موثّقة")}
        </button>
        {pill("sort", `${t("Sort", "ترتيب")}: ${sorts.find((s) => s.value === (params.sort || sorts[0].value))?.label}`, false, true)}
      </div>
      {activeChips.length > 0 ? (
        <div className="row gap8 wrap" style={{ alignItems: "center", marginTop: 9 }}>
          {activeChips.map((c, i) => (
            <button key={i} type="button" onClick={() => nav(c.clear)} aria-label={`${t("Remove", "إزالة")} ${c.label}`}
              style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 30, padding: "0 10px", borderRadius: 999, border: "1px solid var(--silver-2)", background: "var(--azure-wash)", color: "var(--azure-d)", fontSize: "var(--fs-sm)", cursor: "pointer", whiteSpace: "nowrap" }}>
              {c.label}<span aria-hidden style={{ fontSize: "var(--fs-md)", lineHeight: 1, color: "var(--slate-2)" }}>×</span>
            </button>
          ))}
          <button type="button" onClick={clearAll}
            style={{ height: 30, padding: "0 8px", border: "none", background: "transparent", color: "var(--slate-2)", fontSize: "var(--fs-sm)", cursor: "pointer", textDecoration: "underline", whiteSpace: "nowrap" }}>
            {t("Clear all", "مسح الكل")}
          </button>
        </div>
      ) : null}
      {open ? (
        <div className="card" style={{ marginTop: 10, padding: 12, width: "100%", maxWidth: 460, maxHeight: "min(60vh, 440px)", overflowY: "auto", boxShadow: "var(--sh-1)", boxSizing: "border-box" }}>
          {renderPanel()}
        </div>
      ) : null}
    </div>
  );
}
