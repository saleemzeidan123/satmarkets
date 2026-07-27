import { isLocale } from "@/i18n/config";
import { notFound } from "next/navigation";
import { Icon, Verified } from "@/components/satkit";
import { getDictionary } from "@/i18n/getDictionary";

import SampleBanner from "@/components/SampleBanner";
import { localeMeta } from "@/lib/meta";

export function generateMetadata({ params }: { params: { locale: string } }) {
 const h = getDictionary(params.locale === "ar" ? "ar" : "en").hbu;
 return localeMeta(params.locale, "/hbu", h.metaTitle, h.metaDesc);
}

export default function HbuPage({ params }: { params: { locale: string } }) {
 if (!isLocale(params.locale)) notFound();
 const ar = params.locale === "ar";
 const hb = getDictionary(params.locale === "ar" ? "ar" : "en").hbu;
 const open = [100, 106, 112, 118, 124, 130, 136];
 const capped = [100, 100, 100, 100, 100, 118, 124];
 const max = 140;
 const kpis: [string, string, string, string | null][] = [
  ["64.8M", hb.kValue, "", null],
  ["6.8%", hb.netInitYield, hb.nVsDistrict, "up"],
  ["4.40M", hb.kNoi, "", null],
  ["11.2%", hb.irr5, hb.nBaseCase, "up"],
  ["1.6×", hb.equityMult, hb.nOverHold, null],
  ["6.5%", hb.exitCapRate, hb.nAssumed, null],
 ];
 const comps: string[][] = hb.comps;
 return (
  <div style={{ background: "var(--cool)" }}>
   <div style={{ maxWidth: 1360, margin: "0 auto" }}>
    <SampleBanner ar={ar} />
    <div className="row between wrap" style={{ padding: "24px 24px 20px", alignItems: "flex-end", borderBottom: "1px solid var(--silver)", background: "var(--paper)", gap: 16 }}>
     <div>
      <div className="eyebrow">{hb.eyebrow}</div>
      <h1 style={{ fontSize: 28, fontWeight: 700, margin: "10px 0 0" }}>{hb.assetTitle}</h1>
      <div className="muted" style={{ fontSize: 13.5, marginTop: 6 }}>{hb.assetSub}</div>
     </div>
     <div className="row gap10 wrap">
      <span className="btn secondary"><Icon.download size={15} /> {hb.exportModel}</span>
      <span className="btn primary"><Icon.spark size={15} /> {hb.askAi}</span>
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
       {k[2] && <div className={"delta " + (k[3] || "")} style={{ marginTop: 8, color: k[3] ? undefined : "var(--slate)" }}>{k[2]}</div>}
      </div>
     ))}
    </div>

    <div className="invest-grid" style={{ padding: "24px 24px 40px" }}>
     <div className="card pad scn" style={{ boxShadow: "var(--sh-1)" }}>
      <div className="row gap10" style={{ marginBottom: 18 }}>
       <span style={{ color: "var(--harbor)" }}><Icon.layers size={18} /></span>
       <div style={{ fontSize: 15, fontWeight: 700 }}>{hb.scenario}</div>
       <span className="grow" /><span className="tag">{hb.scenarioBaseCase}</span>
      </div>
      <div className="col gap18">
       <div className="field">
        <label>{hb.acqPrice}</label>
        <div className="input between"><span>64,800,000</span><span className="mono muted2">{hb.sarUnit}</span></div>
       </div>
       <div className="field">
        <label>{hb.leaseTerm}</label>
        <div className="seg" style={{ alignSelf: "flex-start" }}><span>{hb.yr3}</span><span className="on">{hb.yr5}</span><span>{hb.yr10}</span></div>
       </div>
       <div className="field">
        <label>{hb.rentEscalation}</label>
        <div className="seg" style={{ alignSelf: "flex-start" }}><span className="on">{hb.openReprice}</span><span>{hb.cappedFrozen}</span></div>
        <span className="hint">{hb.freezeHint}</span>
       </div>
       <div className="field">
        <label>{hb.stabOccupancy} <span className="hint">96%</span></label>
        <div className="hbar" style={{ height: 10 }}><i style={{ width: "96%" }} /></div>
       </div>
       <div className="field">
        <label>{hb.exitCapRate} <span className="hint">6.5%</span></label>
        <div className="hbar" style={{ height: 10 }}><i style={{ width: "52%" }} /></div>
       </div>
       <div className="field">
        <label>{hb.leverage} <span className="hint">55%</span></label>
        <div className="hbar" style={{ height: 10 }}><i className="h2" style={{ width: "55%" }} /></div>
       </div>
      </div>
      <div style={{ height: 1, background: "var(--silver)", margin: "20px 0" }} />
      <div className="row between" style={{ fontSize: 13 }}><span className="muted">{hb.goingInYieldLbl}</span><b className="mono">6.8%</b></div>
      <div className="row between" style={{ fontSize: 13, marginTop: 10 }}><span className="muted">{hb.yieldOnCost}</span><b className="mono" style={{ color: "var(--harbor-d)" }}>8.1%</b></div>
      <span className="btn primary lg" style={{ justifyContent: "center", marginTop: 18, width: "100%" }}>{hb.runFull}</span>
     </div>

     <div className="col gap20">
      <div className="card pad" style={{ boxShadow: "var(--sh-1)" }}>
       <div className="row between wrap" style={{ alignItems: "flex-start", gap: 10 }}>
        <div><div style={{ fontSize: 15, fontWeight: 700 }}>{hb.noiProjection}</div><div className="muted" style={{ fontSize: 12.5 }}>{hb.noiProjectionSub}</div></div>
        <div className="col gap8">
         <span className="lgd"><span className="sw" /> {hb.openLegend}</span>
         <span className="lgd"><span className="sw amber" /> {hb.cappedLegend}</span>
        </div>
       </div>
       <div className="row" style={{ alignItems: "flex-end", gap: 18, height: 188, marginTop: 22 }}>
        {open.map((o, i) => (
         <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
          <div className="row" style={{ alignItems: "flex-end", gap: 5, height: 150, width: "100%", justifyContent: "center" }}>
           <div className="b hi" style={{ height: (o / max * 100) + "%", width: 18, borderRadius: "4px 4px 0 0" }} />
           <div className="b" style={{ height: (capped[i] / max * 100) + "%", width: 18, borderRadius: "4px 4px 0 0", background: "#FBF4E6", borderColor: "#ECDCB6" }} />
          </div>
          <span className="mono muted" style={{ fontSize: 10.5 }}>{(hb.yAxis) + (i + 1)}</span>
         </div>
        ))}
       </div>
       <div className="row gap10" style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--silver)" }}>
        <span style={{ color: "var(--amber)" }}><Icon.info size={15} /></span>
        <span className="muted" style={{ fontSize: 12.5 }}>{hb.upsideA}<b style={{ color: "var(--ink)" }}>{hb.upsideBold}</b>{hb.upsideB}</span>
       </div>
      </div>

      <div className="card" style={{ overflow: "hidden", boxShadow: "var(--sh-1)" }}>
       <div className="row between" style={{ padding: "16px 20px", borderBottom: "1px solid var(--silver)" }}>
        <div style={{ fontSize: 15, fontWeight: 700 }}>{hb.compsTitle}</div>
        <span className="chip" style={{ borderColor: "var(--silver)" }}>{hb.last6mo} <Icon.chevd size={14} /></span>
       </div>
       <div style={{ overflowX: "auto" }}>
        <table className="dt" style={{ minWidth: 620 }}>
         <thead><tr><th>{hb.thAsset}</th><th>{hb.thDate}</th><th style={{ textAlign: ar ? "left" : "right" }}>{hb.thSarM2}</th><th style={{ textAlign: ar ? "left" : "right" }}>{hb.thCapRate}</th><th style={{ textAlign: ar ? "left" : "right" }}>{hb.thPrice}</th><th style={{ textAlign: ar ? "left" : "right" }}>{hb.thSource}</th></tr></thead>
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
        <span className="muted" style={{ fontSize: 12.5 }}>{hb.compsNote}</span>
       </div>
      </div>
     </div>
    </div>
   </div>
  </div>
 );
}
