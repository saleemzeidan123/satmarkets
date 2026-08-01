"use client";
//
// Owner ruling 3 (2026-07-28) correction.
//
// This page used to hold two figures that looked like findings and were not. A
// potential NOI of SAR 4,583,333 and a going-in cap rate of 6.8% were compiled
// constants, and the cap rate carried a code comment calling it "the verified comp
// cap rate". Nothing in any record supported either. The comparables table then
// stamped a verified tick on four named Riyadh buildings whose transactions we do
// not hold, and the CSV export carried the whole set off the platform under a
// filename naming a real tower.
//
// The fix is not softer wording. Every number the model needs is now a user input
// with a starting value, in the same class as acquisition price, occupancy, exit cap
// and leverage, which were already inputs and were never the problem. The model does
// arithmetic on the reader's assumptions and asserts nothing of its own. When SAT
// holds real comparables and the right to show them, they arrive as records through
// the evidence path, not as constants in a page.
//
import { useMemo, useState } from "react";
import { Icon } from "@/components/satkit";
import { fill, formatCounted, unitText } from "@/lib/format";
import { getDictionary } from "@/i18n/getDictionary";

const fmtM = (v: number) => (v / 1e6).toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + "M";
const fmtPct = (v: number) => (v * 100).toFixed(1) + "%";
const fmtN = (v: number) => Math.round(v).toLocaleString("en-US");

function npv(rate: number, flows: number[]) { return flows.reduce((s, f, i) => s + f / Math.pow(1 + rate, i), 0); }
function irr(flows: number[]) { let lo = -0.9, hi = 1.5; for (let i = 0; i < 90; i++) { const m = (lo + hi) / 2; if (npv(m, flows) > 0) lo = m; else hi = m; } return (lo + hi) / 2; }

import SampleBanner from "@/components/SampleBanner";
export default function InvestPage({ params }: { params: { locale: string } }) {
 const ar = params.locale === "ar";
 const iv = getDictionary(params.locale === "ar" ? "ar" : "en").invest;
 const [price, setPrice] = useState(64800000);
 const [term, setTerm] = useState<3 | 5 | 10>(5);
 const [esc, setEsc] = useState<"open" | "capped">("open");
 const [occ, setOcc] = useState(0.96);
 const [exitCap, setExitCap] = useState(0.065);
 const [ltv, setLtv] = useState(0.55);
 const [ran, setRan] = useState(false);
 // Starting values, not findings. Both are the reader's to change, which is the whole
 // reason they are state and not constants.
 const [potentialNoi, setPotentialNoi] = useState(4583333);
 const [pricingCap, setPricingCap] = useState(0.068);

 const m = useMemo(() => {
  const noi = potentialNoi * occ;
  const value = noi / pricingCap;
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
 }, [price, term, esc, occ, exitCap, ltv, potentialNoi, pricingCap]);

 const maxBar = Math.max(...m.openS, ...m.cappedS);
 const na = iv.na;
 // PKG-FIG2 closure, finding 131. Six labels on this page spelled their own unit
 // in both dictionaries. Four of them spelled it in LATIN inside the Arabic
 // string, "(SAR/yr)" and "(SAR)", which is the same Latin-on-an-Arabic-page
 // defect finding 129 closed in code, surviving in data. Their on-screen
 // siblings used Arabic, so it read as an oversight rather than a decision, and
 // no record said otherwise either way.
 //
 // The dictionaries now hold the sentence with a {unit} slot and the unit comes
 // from the table, so the two can no longer disagree. `unitText` rather than
 // `formatUnit` because four of these six end up in a CSV, where the word joiner
 // has no line to protect and would travel off the platform as an invisible
 // control character in someone else's spreadsheet.
 const sar = unitText("sar", ar ? "ar" : "en", "short");
 const yr = unitText("sar_year", ar ? "ar" : "en", "short");
 const kpis: [string, string, string, string | null][] = [
  [fmtM(m.value), iv.kValue, iv.nComps, null],
  // Compared against the reader's own pricing cap, which is what the arithmetic
  // actually does. It previously read as a comparison against a district benchmark
  // that no query produced.
  [fmtPct(m.goingInYield), iv.netInitYield, m.goingInYield >= pricingCap ? iv.nAtAbove : iv.nBelow, m.goingInYield >= pricingCap ? "up" : null],
  [fmtM(m.noi), fill(iv.kNoi, { unit: yr }), "", null],
  [ran ? fmtPct(m.irr) : na, iv.irr5, ran ? iv.nModeled : iv.nRun, ran ? "up" : null],
  [ran ? m.em.toFixed(1) + "\u00d7" : na, iv.equityMult, ran ? iv.nOverHold : iv.nRun, null],
  [fmtPct(exitCap), iv.exitCapRate, iv.nAssumption, null],
 ];
 const comps: string[][] = iv.comps;
 function exportCsv() {
  const rows: (string | number)[][] = [];
  rows.push([iv.assetTitle]);
  rows.push([iv.csvSub]);
  rows.push([]);
  rows.push([iv.csvInputs]);
  rows.push([fill(iv.csvAcqPrice, { unit: sar }), price]);
  rows.push([fill(iv.csvPotentialNoi, { unit: yr }), potentialNoi]);
  rows.push([iv.csvPricingCap, fmtPct(pricingCap)]);
  rows.push([iv.csvTerm, term]);
  rows.push([iv.csvEscalation, esc]);
  rows.push([iv.csvOccupancy, fmtPct(occ)]);
  rows.push([iv.exitCapRate, fmtPct(exitCap)]);
  rows.push([iv.csvLtv, fmtPct(ltv)]);
  rows.push([]);
  rows.push([iv.csvOutputs]);
  rows.push([fill(iv.csvIndValue, { unit: sar }), Math.round(m.value)]);
  rows.push([iv.netInitYield, fmtPct(m.goingInYield)]);
  rows.push([fill(iv.csvNoi, { unit: yr }), Math.round(m.noi)]);
  rows.push([iv.irr5, fmtPct(m.irr)]);
  rows.push([iv.equityMult, m.em.toFixed(2) + "x"]);
  rows.push([]);
  rows.push([iv.csvNoiByYear, ...m.series.map((_, i) => "Y" + (i + 1))]);
  // The magnitude row of the projection table. It was the Latin literal "SAR"
  // in both languages, one line below a header row this package rewired.
  rows.push([sar, ...m.series.map((v) => Math.round(v))]);
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  // The file leaves the platform, so the filename has to survive being read without
  // the page around it. It no longer names a real building.
  a.href = url; a.download = "sat-underwriting-sample.csv";
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
 }
 const tdir = ar ? "rtl" : "ltr";
 return (
  <div style={{ background: "var(--cool)" }}>
   <div style={{ maxWidth: 1360, margin: "0 auto" }}>
    <SampleBanner ar={ar} />
    <div className="row between wrap" style={{ padding: "24px 24px 20px", alignItems: "flex-end", borderBottom: "1px solid var(--silver)", background: "var(--paper)", gap: 16 }}>
     <div>
      <div className="eyebrow">{iv.eyebrow}</div>
      <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-.02em", margin: "10px 0 0" }}>{iv.assetTitle}</h1>
      <div className="muted" style={{ fontSize: "var(--fs-base)", marginTop: 6 }}>{iv.assetSub}</div>
     </div>
     <div className="row gap10 wrap">
      <button type="button" onClick={exportCsv} className="btn secondary" style={{ cursor: "pointer" }}><Icon.download size={15} /> {iv.exportModel}</button>
      <span className="btn primary"><Icon.spark size={15} /> {iv.askAi}</span>
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
       <div style={{ fontSize: "var(--fs-md)", fontWeight: 700 }}>{iv.scenario}</div>
       <span className="grow" /><span className="tag">{esc === "open" ? (iv.openReprice) : (iv.capped)} · {term}{iv.yrShort}</span>
      </div>
      <div className="col gap18">
       <div className="field">
        <label>{iv.acqPrice}</label>
        <div className="input between" style={{ padding: 0 }}>
         <input value={fmtN(price)} onChange={(e) => { const n = Number(e.target.value.replace(/[^0-9]/g, "")); if (!isNaN(n)) setPrice(n || 0); }} style={{ border: "none", outline: "none", background: "transparent", fontSize: "var(--fs-base)", color: "var(--ink)", padding: "10px 12px", width: "100%", textAlign: ar ? "right" : "left" }} />
         <span className="mono muted2" style={{ paddingRight: 12 }}>{iv.sarUnit}</span>
        </div>
       </div>
       <div className="field">
        <label>{fill(iv.potentialNoi, { unit: yr })}</label>
        <div className="input between" style={{ padding: 0 }}>
         <input value={fmtN(potentialNoi)} onChange={(e) => { const n = Number(e.target.value.replace(/[^0-9]/g, "")); if (!isNaN(n)) setPotentialNoi(n || 0); }} style={{ border: "none", outline: "none", background: "transparent", fontSize: "var(--fs-base)", color: "var(--ink)", padding: "10px 12px", width: "100%", textAlign: ar ? "right" : "left" }} />
         <span className="mono muted2" style={{ paddingRight: 12 }}>{iv.sarUnit}</span>
        </div>
       </div>
       <div className="field">
        <label>{iv.pricingCapRate} <span className="hint">{fmtPct(pricingCap)}</span></label>
        <input type="range" min={0.05} max={0.085} step={0.001} value={pricingCap} onChange={(e) => setPricingCap(Number(e.target.value))} style={{ width: "100%", accentColor: "var(--harbor)" }} />
       </div>
       <div className="field">
        <label>{iv.leaseTerm}</label>
        <div className="seg" style={{ alignSelf: "flex-start" }}>{([3, 5, 10] as const).map((t) => <span key={t} className={term === t ? "on" : ""} style={{ cursor: "pointer" }} onClick={() => setTerm(t)}>{t}{iv.yrShort}</span>)}</div>
       </div>
       <div className="field">
        <label>{iv.rentEscalation}</label>
        <div className="seg" style={{ alignSelf: "flex-start" }}><span className={esc === "open" ? "on" : ""} style={{ cursor: "pointer" }} onClick={() => setEsc("open")}>{iv.openReprice}</span><span className={esc === "capped" ? "on" : ""} style={{ cursor: "pointer" }} onClick={() => setEsc("capped")}>{iv.cappedFrozen}</span></div>
        <span className="hint">{iv.freezeHint}</span>
       </div>
       <div className="field">
        <label>{iv.stabOccupancy} <span className="hint">{Math.round(occ * 100)}%</span></label>
        <input type="range" min={0.8} max={1} step={0.01} value={occ} onChange={(e) => setOcc(Number(e.target.value))} style={{ width: "100%", accentColor: "var(--harbor)" }} />
       </div>
       <div className="field">
        <label>{iv.exitCapRate} <span className="hint">{fmtPct(exitCap)}</span></label>
        <input type="range" min={0.05} max={0.085} step={0.001} value={exitCap} onChange={(e) => setExitCap(Number(e.target.value))} style={{ width: "100%", accentColor: "var(--harbor)" }} />
       </div>
       <div className="field">
        <label>{iv.leverage} <span className="hint">{Math.round(ltv * 100)}%</span></label>
        <input type="range" min={0} max={0.7} step={0.05} value={ltv} onChange={(e) => setLtv(Number(e.target.value))} style={{ width: "100%", accentColor: "var(--harbor)" }} />
       </div>
      </div>
      <div style={{ height: 1, background: "var(--silver)", margin: "20px 0" }} />
      <div className="row between" style={{ fontSize: "var(--fs-sm)" }}><span className="muted">{iv.goingInYieldLbl}</span><b className="mono">{fmtPct(m.goingInYield)}</b></div>
      <div className="row between" style={{ fontSize: "var(--fs-sm)", marginTop: 10 }}><span className="muted">{iv.yieldOnCost}</span><b className="mono" style={{ color: "var(--harbor-d)" }}>{fmtPct(m.yoc5)}</b></div>
      <button className="btn primary lg" style={{ justifyContent: "center", marginTop: 18, width: "100%" }} onClick={() => setRan(true)}>{ran ? (iv.modelUpdated) + fmtPct(m.irr) : (iv.runFull)}</button>
      <p className="muted" style={{ fontSize: "var(--fs-sm)", marginTop: 14, marginBottom: 0 }}>{iv.assumptionsNote}</p>
     </div>

     <div className="col gap20">
      <div className="card pad" style={{ boxShadow: "var(--sh-1)" }}>
       <div className="row between wrap" style={{ alignItems: "flex-start", gap: 12 }}>
        <div><div style={{ fontSize: "var(--fs-md)", fontWeight: 700 }}>{iv.noiProjection}</div><div className="muted" style={{ fontSize: "var(--fs-sm)" }}>{ar ? `ريال/سنة · تصعيد مفتوح مقابل مسقوف · مدة ${formatCounted(term, "year", "ar", { oblique: true })}` : `SAR/yr · open vs capped escalation · ${term}yr term`}</div></div>
        <div className="col gap8">
         <span className="lgd"><span className="sw" /> {iv.openLegend}</span>
         <span className="lgd"><span className="sw amber" /> {iv.cappedLegend}</span>
        </div>
       </div>
       <div className="row" style={{ alignItems: "flex-end", gap: 18, height: 188, marginTop: 22 }}>
        {m.openS.map((o, i) => (
         <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
          <div className="row" style={{ alignItems: "flex-end", gap: 5, height: 150, width: "100%", justifyContent: "center" }}>
           <div className="b hi" style={{ height: (o / maxBar * 100) + "%", width: 18, borderRadius: "4px 4px 0 0", opacity: esc === "open" ? 1 : 0.45 }} />
           <div className="b" style={{ height: (m.cappedS[i] / maxBar * 100) + "%", width: 18, borderRadius: "4px 4px 0 0", background: "#FBF4E6", borderColor: "#ECDCB6", opacity: esc === "capped" ? 1 : 0.6 }} />
          </div>
          <span className="mono muted" style={{ fontSize: "var(--fs-2xs)" }}>{iv.yAxis}{i + 1}</span>
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
        <div><div style={{ fontSize: "var(--fs-md)", fontWeight: 700 }}>{iv.compsTitle}</div><div className="muted" style={{ fontSize: "var(--fs-sm)" }}>{iv.compsSubtitle}</div></div>
        {/* Was a "Last 6 months" filter chip, which described a query over transaction
            records. There is no such query and there are no such records. */}
        <span className="tag">{iv.compsIllustrative}</span>
       </div>
       <div style={{ overflowX: "auto" }}>
        <table className="dt" style={{ minWidth: 560 }}>
         <thead><tr><th>{iv.thAsset}</th><th>{iv.thDate}</th><th style={{ textAlign: "right" }}>{iv.thSarM2}</th><th style={{ textAlign: "right" }}>{iv.thCapRate}</th><th style={{ textAlign: "right" }}>{iv.thPrice}</th><th style={{ textAlign: "right" }}>{iv.thSource}</th></tr></thead>
         <tbody>
          {comps.map((c, i) => (
           <tr key={i}>
            <td style={{ fontWeight: 600 }}>{c[0]}</td>
            <td className="muted">{c[1]}</td>
            <td className="num" style={{ fontWeight: 500 }}>{c[2]}</td>
            <td className="num">{c[3]}</td>
            <td className="num mono">{c[4]}</td>
            {/* The verified tick lived here on every row. Verified green is reserved
                for evidence-backed verification, and these rows have none. */}
            <td className="num"><span className="tag">{iv.compsSourceSimulated}</span></td>
           </tr>
          ))}
         </tbody>
        </table>
       </div>
       <div className="row gap10" style={{ padding: "13px 20px", borderTop: "1px solid var(--silver)", background: "var(--cool)" }}>
        <span style={{ color: "var(--amber)" }}><Icon.info size={15} /></span>
        <span className="muted" style={{ fontSize: "var(--fs-sm)" }}>{iv.compsNote}</span>
       </div>
      </div>
     </div>
    </div>
    <div style={{ height: 44 }} />
   </div>
  </div>
 );
}
