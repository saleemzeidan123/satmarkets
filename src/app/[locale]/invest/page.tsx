"use client";
import { useMemo, useState } from "react";
import { Icon, Verified } from "@/components/satkit";

const fmtM = (v: number) => (v / 1e6).toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + "M";
const fmtPct = (v: number) => (v * 100).toFixed(1) + "%";
const fmtN = (v: number) => Math.round(v).toLocaleString("en-US");

function npv(rate: number, flows: number[]) { return flows.reduce((s, f, i) => s + f / Math.pow(1 + rate, i), 0); }
function irr(flows: number[]) { let lo = -0.9, hi = 1.5; for (let i = 0; i < 90; i++) { const m = (lo + hi) / 2; if (npv(m, flows) > 0) lo = m; else hi = m; } return (lo + hi) / 2; }

export default function InvestPage({ params }: { params: { locale: string } }) {
 const ar = params.locale === "ar";
 const [price, setPrice] = useState(64800000);
 const [term, setTerm] = useState<3 | 5 | 10>(5);
 const [esc, setEsc] = useState<"open" | "capped">("open");
 const [occ, setOcc] = useState(0.96);
 const [exitCap, setExitCap] = useState(0.065);
 const [ltv, setLtv] = useState(0.55);
 const [ran, setRan] = useState(false);

 const m = useMemo(() => {
  const potentialNOI = 4583333; // SAR/yr at 100% occupancy
  const noi = potentialNOI * occ;
  const value = noi / 0.068; // priced off the verified comp cap rate
  const goingInYield = noi / price;
  const gOpen = term === 3 ? 0.07 : term === 5 ? 0.06 : 0.052;
  const years = 7, freeze = 5;
  const openS: number[] = [], cappedS: number[] = [];
  for (let y = 0; y < years; y++) {
   openS.push(noi * Math.pow(1 + gOpen, y));
   let cv;
   if (term >= 10) cv = noi; // locked the whole hold under the freeze
   else cv = y < freeze ? noi : noi * Math.pow(1.06, y - (freeze - 1));
   cappedS.push(cv);
  }
  const series = esc === "open" ? openS : cappedS;
  const yoc5 = series[4] / price;
  const debt = price * ltv, equity = price * (1 - ltv), interest = debt * 0.06;
  const cf: number[] = [];
  for (let y = 0; y < 5; y++) cf.push(series[y] - interest);
  const exit5 = series[4] / exitCap - debt;
  cf[4] += exit5;
  const flows = [-equity, ...cf];
  return { noi, value, goingInYield, yoc5, openS, cappedS, series, irr: irr(flows), em: cf.reduce((a, b) => a + b, 0) / equity };
 }, [price, term, esc, occ, exitCap, ltv]);

 const maxBar = Math.max(...m.openS, ...m.cappedS);
 const na = ar ? "غير متاح" : "n/a";
 const kpis: [string, string, string, string | null][] = ar ? [
  [fmtM(m.value), "قيمة إرشادية، ريال", "بناءً على مقارنات موثّقة", null],
  [fmtPct(m.goingInYield), "صافي العائد الأولي", m.goingInYield >= 0.068 ? "عند/فوق متوسط الحي" : "دون متوسط الحي", m.goingInYield >= 0.068 ? "up" : null],
  [fmtM(m.noi), "صافي الدخل التشغيلي المستقر، ريال/سنة", "", null],
  [ran ? fmtPct(m.irr) : na, "العائد الداخلي المرفوع 5 سنوات", ran ? "محسوب" : "شغّل النموذج", ran ? "up" : null],
  [ran ? m.em.toFixed(1) + "×" : na, "مضاعف حقوق الملكية", ran ? "خلال الحيازة" : "شغّل النموذج", null],
  [fmtPct(exitCap), "معدل الخروج الرأسمالي", "افتراضك", null],
 ] : [
  [fmtM(m.value), "Indicative value, SAR", "off verified comps", null],
  [fmtPct(m.goingInYield), "Net initial yield", m.goingInYield >= 0.068 ? "at/above district" : "below district", m.goingInYield >= 0.068 ? "up" : null],
  [fmtM(m.noi), "Stabilised NOI, SAR/yr", "", null],
  [ran ? fmtPct(m.irr) : na, "5-yr levered IRR", ran ? "modeled" : "run the model", ran ? "up" : null],
  [ran ? m.em.toFixed(1) + "×" : na, "Equity multiple", ran ? "over hold" : "run the model", null],
  [fmtPct(exitCap), "Exit cap rate", "your assumption", null],
 ];
 const comps: string[][] = ar ? [
  ["برج العليا · طابق كامل", "أبريل 2026", "1,440", "6.6%", "202M"],
  ["العقارية بلازا · طابقان", "فبراير 2026", "1,210", "7.1%", "318M"],
  ["بوابة التحلية · مكتب", "يناير 2026", "1,520", "6.4%", "141M"],
  ["واحة غرناطة · برج", "ديسمبر 2025", "1,060", "7.6%", "486M"],
 ] : [
  ["Olaya Tower · whole floor", "Apr 2026", "1,440", "6.6%", "202M"],
  ["Al Akaria Plaza · 2 floors", "Feb 2026", "1,210", "7.1%", "318M"],
  ["Tahlia Gate · office", "Jan 2026", "1,520", "6.4%", "141M"],
  ["Granada Oasis · tower", "Dec 2025", "1,060", "7.6%", "486M"],
 ];
 function exportCsv() {
  const rows: (string | number)[][] = [];
  rows.push([ar ? "طابق مكاتب فئة A، برج العليا" : "Grade A Office Floor, Olaya Tower"]);
  rows.push([ar ? "تحليل استثماري إرشادي · الربع الأول 2026 · استرشادي وليس نصيحة" : "Indicative underwriting, Q1 2026, off verified comps, indicative not advice"]);
  rows.push([]);
  rows.push([ar ? "المدخلات" : "Inputs"]);
  rows.push([ar ? "سعر الاستحواذ (SAR)" : "Acquisition price (SAR)", price]);
  rows.push([ar ? "المدة (سنة)" : "Term (yr)", term]);
  rows.push([ar ? "التصعيد" : "Escalation", esc]);
  rows.push([ar ? "الإشغال" : "Occupancy", fmtPct(occ)]);
  rows.push([ar ? "معدل الخروج الرأسمالي" : "Exit cap rate", fmtPct(exitCap)]);
  rows.push([ar ? "نسبة الدين" : "LTV", fmtPct(ltv)]);
  rows.push([]);
  rows.push([ar ? "النتائج" : "Outputs"]);
  rows.push([ar ? "قيمة إرشادية (SAR)" : "Indicative value (SAR)", Math.round(m.value)]);
  rows.push([ar ? "صافي العائد الأولي" : "Net initial yield", fmtPct(m.goingInYield)]);
  rows.push([ar ? "صافي الدخل المستقر (SAR/yr)" : "Stabilised NOI (SAR/yr)", Math.round(m.noi)]);
  rows.push([ar ? "العائد الداخلي المرفوع 5 سنوات" : "5-yr levered IRR", fmtPct(m.irr)]);
  rows.push([ar ? "مضاعف حقوق الملكية" : "Equity multiple", m.em.toFixed(2) + "x"]);
  rows.push([]);
  rows.push([ar ? "صافي الدخل حسب السنة" : "NOI by year", ...m.series.map((_, i) => "Y" + (i + 1))]);
  rows.push(["SAR", ...m.series.map((v) => Math.round(v))]);
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "sat-underwriting-olaya-tower.csv";
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
 }
 const tdir = ar ? "rtl" : "ltr";
 return (
  <div style={{ background: "var(--cool)" }}>
   <div style={{ maxWidth: 1360, margin: "0 auto" }}>
    <div className="row between wrap" style={{ padding: "24px 24px 20px", alignItems: "flex-end", borderBottom: "1px solid var(--silver)", background: "var(--paper)", gap: 16 }}>
     <div>
      <div className="eyebrow">{ar ? "تحليل الاستثمار · الربع الأول 2026" : "Investment underwriting · Q1 2026"}</div>
      <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-.02em", margin: "10px 0 0" }}>{ar ? "طابق مكاتب فئة A، برج العليا" : "Grade A Office Floor, Olaya Tower"}</h1>
      <div className="muted" style={{ fontSize: "var(--fs-base)", marginTop: 6 }}>{ar ? "320 م² · العليا · مُحلَّل على صفقات مقارنة موثّقة" : "320 m² · Al Olaya · underwritten on verified comparable transactions"}</div>
     </div>
     <div className="row gap10 wrap">
      <button type="button" onClick={exportCsv} className="btn secondary" style={{ cursor: "pointer" }}><Icon.download size={15} /> {ar ? "تصدير النموذج" : "Export model"}</button>
      <span className="btn primary"><Icon.spark size={15} /> {ar ? "اطلب تحليل الذكاء" : "Ask AI to underwrite"}</span>
     </div>
    </div>

    <div className="row gap16 wrap" style={{ padding: "24px 24px 0" }}>
     {kpis.map((k, i) => (
      <div key={i} className="statpill grow" style={{ minWidth: 150 }}>
       <div className="row between" style={{ alignItems: "flex-start" }}>
        <div className="v tnum" style={{ fontSize: 22 }}>{k[0]}</div>
        {k[3] && <span className={"delta " + k[3]}>▲</span>}
       </div>
       <div className="l">{k[1]}</div>
       {k[2] && <div className={"delta " + (k[3] || "")} style={{ marginTop: 8, color: k[3] ? "" : "var(--slate)" }}>{k[2]}</div>}
      </div>
     ))}
    </div>

    <div className="invest-grid" style={{ padding: "24px 24px 0" }}>
     <div className="card pad scn" style={{ boxShadow: "var(--sh-1)" }}>
      <div className="row gap10" style={{ marginBottom: 18 }}>
       <span style={{ color: "var(--harbor)" }}><Icon.layers size={18} /></span>
       <div style={{ fontSize: "var(--fs-md)", fontWeight: 700 }}>{ar ? "السيناريو" : "Scenario"}</div>
       <span className="grow" /><span className="tag">{esc === "open" ? (ar ? "مفتوح · إعادة تسعير" : "Open · re-price") : (ar ? "مسقوف" : "Capped")} · {term}{ar ? " سنة" : "yr"}</span>
      </div>
      <div className="col gap18">
       <div className="field">
        <label>{ar ? "سعر الاستحواذ (ريال)" : "Acquisition price (SAR)"}</label>
        <div className="input between" style={{ padding: 0 }}>
         <input value={fmtN(price)} onChange={(e) => { const n = Number(e.target.value.replace(/[^0-9]/g, "")); if (!isNaN(n)) setPrice(n || 0); }} style={{ border: "none", outline: "none", background: "transparent", fontSize: "var(--fs-base)", color: "var(--ink)", padding: "10px 12px", width: "100%", textAlign: ar ? "right" : "left" }} />
         <span className="mono muted2" style={{ paddingRight: 12 }}>{ar ? "ريال" : "SAR"}</span>
        </div>
       </div>
       <div className="field">
        <label>{ar ? "مدة الإيجار" : "Lease term"}</label>
        <div className="seg" style={{ alignSelf: "flex-start" }}>{([3, 5, 10] as const).map((t) => <span key={t} className={term === t ? "on" : ""} style={{ cursor: "pointer" }} onClick={() => setTerm(t)}>{t}{ar ? " سنة" : " yr"}</span>)}</div>
       </div>
       <div className="field">
        <label>{ar ? "تصعيد الإيجار" : "Rent escalation"}</label>
        <div className="seg" style={{ alignSelf: "flex-start" }}><span className={esc === "open" ? "on" : ""} style={{ cursor: "pointer" }} onClick={() => setEsc("open")}>{ar ? "مفتوح · إعادة تسعير" : "Open · re-price"}</span><span className={esc === "capped" ? "on" : ""} style={{ cursor: "pointer" }} onClick={() => setEsc("capped")}>{ar ? "مسقوف · مجمّد" : "Capped · frozen"}</span></div>
        <span className="hint">{ar ? "المسقوف يعكس تجميد الرياض لخمس سنوات في سبتمبر 2025 على العقود القائمة." : "Capped reflects the Sept-2025 Riyadh 5-yr freeze on existing leases."}</span>
       </div>
       <div className="field">
        <label>{ar ? "الإشغال المستقر" : "Stabilised occupancy"} <span className="hint">{Math.round(occ * 100)}%</span></label>
        <input type="range" min={0.8} max={1} step={0.01} value={occ} onChange={(e) => setOcc(Number(e.target.value))} style={{ width: "100%", accentColor: "var(--harbor)" }} />
       </div>
       <div className="field">
        <label>{ar ? "معدل الخروج الرأسمالي" : "Exit cap rate"} <span className="hint">{fmtPct(exitCap)}</span></label>
        <input type="range" min={0.05} max={0.085} step={0.001} value={exitCap} onChange={(e) => setExitCap(Number(e.target.value))} style={{ width: "100%", accentColor: "var(--harbor)" }} />
       </div>
       <div className="field">
        <label>{ar ? "الرافعة (نسبة القرض للقيمة)" : "Leverage (LTV)"} <span className="hint">{Math.round(ltv * 100)}%</span></label>
        <input type="range" min={0} max={0.7} step={0.05} value={ltv} onChange={(e) => setLtv(Number(e.target.value))} style={{ width: "100%", accentColor: "var(--harbor)" }} />
       </div>
      </div>
      <div style={{ height: 1, background: "var(--silver)", margin: "20px 0" }} />
      <div className="row between" style={{ fontSize: "var(--fs-sm)" }}><span className="muted">{ar ? "العائد عند الدخول" : "Going-in yield"}</span><b className="mono">{fmtPct(m.goingInYield)}</b></div>
      <div className="row between" style={{ fontSize: "var(--fs-sm)", marginTop: 10 }}><span className="muted">{ar ? "العائد على التكلفة (السنة 5)" : "Yield-on-cost (yr 5)"}</span><b className="mono" style={{ color: "var(--green)" }}>{fmtPct(m.yoc5)}</b></div>
      <button className="btn primary lg" style={{ justifyContent: "center", marginTop: 18, width: "100%" }} onClick={() => setRan(true)}>{ran ? (ar ? "حُدّث النموذج ✓، العائد الداخلي " : "Model updated ✓, IRR ") + fmtPct(m.irr) : (ar ? "شغّل النموذج الكامل" : "Run full model")}</button>
     </div>

     <div className="col gap20">
      <div className="card pad" style={{ boxShadow: "var(--sh-1)" }}>
       <div className="row between wrap" style={{ alignItems: "flex-start", gap: 12 }}>
        <div><div style={{ fontSize: "var(--fs-md)", fontWeight: 700 }}>{ar ? "توقّع صافي الدخل التشغيلي · حيازة 7 سنوات" : "NOI projection · 7-year hold"}</div><div className="muted" style={{ fontSize: "var(--fs-sm)" }}>{ar ? `ريال/سنة · تصعيد مفتوح مقابل مسقوف · مدة ${term} سنة` : `SAR/yr · open vs capped escalation · ${term}yr term`}</div></div>
        <div className="col gap8">
         <span className="lgd"><span className="sw" /> {ar ? "مفتوح · يُعاد تسعيره وفق السوق" : "Open · re-prices to market"}</span>
         <span className="lgd"><span className="sw amber" /> {ar ? "مسقوف · مجمّد السنوات 1–5" : "Capped · frozen yrs 1–5"}</span>
        </div>
       </div>
       <div className="row" style={{ alignItems: "flex-end", gap: 18, height: 188, marginTop: 22 }}>
        {m.openS.map((o, i) => (
         <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
          <div className="row" style={{ alignItems: "flex-end", gap: 5, height: 150, width: "100%", justifyContent: "center" }}>
           <div className="b hi" style={{ height: (o / maxBar * 100) + "%", width: 18, borderRadius: "4px 4px 0 0", opacity: esc === "open" ? 1 : 0.45 }} />
           <div className="b" style={{ height: (m.cappedS[i] / maxBar * 100) + "%", width: 18, borderRadius: "4px 4px 0 0", background: "#FBF4E6", borderColor: "#ECDCB6", opacity: esc === "capped" ? 1 : 0.6 }} />
          </div>
          <span className="mono muted" style={{ fontSize: "var(--fs-2xs)" }}>{ar ? "س" : "Y"}{i + 1}</span>
         </div>
        ))}
       </div>
       <div className="row gap10" style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--silver)" }}>
        <span style={{ color: "var(--amber)" }}><Icon.info size={15} /></span>
        <span className="muted" style={{ fontSize: "var(--fs-sm)" }}>{ar ? <>إذا كان هذا الأصل عقد إيجار أول جديد فهو <b style={{ color: "var(--ink)" }}>غير متأثر بالتجميد</b> ويُعاد تسعيره كل مدة، وهذا الفارق (مفتوح مقابل مسقوف) هو القيمة المضافة في التحليل.</> : <>If this asset is a new first-lease it is <b style={{ color: "var(--ink)" }}>unaffected by the freeze</b> and re-prices every term, that gap (open vs capped) is the underwriting upside.</>}</span>
       </div>
      </div>

      <div className="card" style={{ overflow: "hidden", boxShadow: "var(--sh-1)" }}>
       <div className="row between" style={{ padding: "16px 20px", borderBottom: "1px solid var(--silver)" }}>
        <div style={{ fontSize: "var(--fs-md)", fontWeight: 700 }}>{ar ? "صفقات مقارنة" : "Comparable transactions"}</div>
        <span className="chip" style={{ borderColor: "var(--silver)" }}>{ar ? "آخر 6 أشهر" : "Last 6 months"} <Icon.chevd size={14} /></span>
       </div>
       <div style={{ overflowX: "auto" }}>
        <table className="dt" style={{ minWidth: 560 }}>
         <thead><tr><th>{ar ? "الأصل" : "Asset"}</th><th>{ar ? "التاريخ" : "Date"}</th><th style={{ textAlign: "right" }}>{ar ? "ريال/م²" : "SAR/m²"}</th><th style={{ textAlign: "right" }}>{ar ? "المعدل الرأسمالي" : "Cap rate"}</th><th style={{ textAlign: "right" }}>{ar ? "السعر" : "Price"}</th><th style={{ textAlign: "right" }}>{ar ? "المصدر" : "Source"}</th></tr></thead>
         <tbody>
          {comps.map((c, i) => (
           <tr key={i}>
            <td style={{ fontWeight: 600 }}>{c[0]}</td>
            <td className="muted">{c[1]}</td>
            <td className="num" style={{ fontWeight: 500 }}>{c[2]}</td>
            <td className="num">{c[3]}</td>
            <td className="num mono">{c[4]}</td>
            <td className="num"><Verified text="✓" /></td>
           </tr>
          ))}
         </tbody>
        </table>
       </div>
       <div className="row gap10" style={{ padding: "13px 20px", borderTop: "1px solid var(--silver)", background: "var(--cool)" }}>
        <span style={{ color: "var(--harbor)" }}><Icon.check size={15} /></span>
        <span className="muted" style={{ fontSize: "var(--fs-sm)" }}>{ar ? "المقارنات مستمدة فقط من صفقات موثّقة بمشورة SAT، لا أسعار طلب، ولا أرقام مستخرجة." : "Comps drawn only from verified SAT-advised transactions, no asking prices, no scraped figures."}</span>
       </div>
      </div>
     </div>
    </div>
    <div style={{ height: 44 }} />
   </div>
  </div>
 );
}
