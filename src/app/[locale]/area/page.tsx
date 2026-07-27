import { isLocale } from "@/i18n/config";
import { notFound } from "next/navigation";
import { Icon, MarkPin } from "@/components/satkit";
import JsonLd, { SITE } from "@/components/JsonLd";
import { getDictionary } from "@/i18n/getDictionary";
import { localeMeta } from "@/lib/meta";

function IntelStat({ v, l, delta, dir }: { v: string; l: string; delta?: string; dir?: string }) {
 return (
  <div className="statpill grow" style={{ minWidth: 150 }}>
   <div className="row between" style={{ alignItems: "flex-start" }}>
    <div className="v tnum">{v}</div>
    {dir && <span className={"delta " + dir}>{dir === "up" ? "▲" : "▼"}</span>}
   </div>
   <div className="l">{l}</div>
   {delta && <div className={"delta " + (dir || "")} style={{ marginTop: 8, color: dir ? undefined : "var(--slate)" }}>{delta}</div>}
  </div>
 );
}

export async function generateMetadata({ params }: { params: { locale: string } }) {
 const a = getDictionary(params.locale === "ar" ? "ar" : "en").area;
 return localeMeta(params.locale, "/area", a.metaTitle, a.metaDesc);
}

export default function AreaPage({ params }: { params: { locale: string } }) {
 if (!isLocale(params.locale)) notFound();
 const ar = params.locale === "ar";
 const ap = getDictionary(params.locale === "ar" ? "ar" : "en").area;
 const hours = [4, 5, 7, 11, 18, 26, 30, 28, 24, 20, 22, 27, 31, 29, 25, 23, 28, 33, 30, 21, 14, 9, 6, 4];
 // The catchment, sector-mix, source and score lists were each written twice in
 // this file, once per language, so an Arabic edit could silently leave the
 // English list a different length. They are the same five, five, four and five
 // entries in both languages now, read from the one place the rest of the page
 // already reads.
 const origins: [string, number, string][] = [
  [ap.originHittin, 34, ""], [ap.originKafd, 27, ""], [ap.originDq, 19, "h2"],
  [ap.originWurud, 12, "h2"], [ap.originOutside, 8, "h2"],
 ];
 const ages: [string, number, string][] = [["25–34", 34, "var(--azure)"], ["35–44", 28, "var(--harbor)"], ["45–54", 16, "var(--azure-l)"], ["18–24", 12, "#B9C6E8"], ["55+", 10, "#D7DDE5"]];
 const mix: [string, number][] = [
  [ap.mixCorporate, 41], [ap.mixBanking, 22], [ap.mixFnb, 19], [ap.mixRetail, 11], [ap.mixMedical, 7],
 ];
 let acc = 0;
 const stops = ages.map((a) => { const s = `${a[2]} ${acc}% ${acc + a[1]}%`; acc += a[1]; return s; }).join(",");
 const comp: [string, string][] = [["44%", "34%"], ["62%", "40%"], ["58%", "62%"], ["40%", "60%"], ["68%", "52%"]];
 return (
  <div style={{ background: "var(--cool)" }}>
   <JsonLd data={{ "@type": "BreadcrumbList", itemListElement: [
    { "@type": "ListItem", position: 1, name: ap.crumbHome, item: `${SITE}/${params.locale}` },
    { "@type": "ListItem", position: 2, name: ap.crumbLI, item: `${SITE}/${params.locale}/area` },
   ] }} />
   <div style={{ maxWidth: 1360, margin: "0 auto" }}>
    <div className="row between wrap" style={{ padding: "24px 24px 20px", alignItems: "flex-end", borderBottom: "1px solid var(--silver)", background: "var(--paper)", gap: 16 }}>
     <div>
      <div className="eyebrow">{ap.eyebrow}</div>
      <h1 style={{ fontSize: 28, fontWeight: 700, margin: "10px 0 0" }}>{ap.h1}</h1>
      <div className="muted" style={{ fontSize: 13.5, marginTop: 6 }}>{ap.intro}</div>
     </div>
     <div className="row gap10 wrap">
      <span className="chip">{ap.driveTime10} <Icon.chevd size={14} /></span>
      <span className="chip">{ap.weekday} <Icon.chevd size={14} /></span>
      <span className="btn secondary"><Icon.download size={15} /> {ap.export}</span>
      <span className="btn primary"><Icon.spark size={15} /> {ap.askAi}</span>
     </div>
    </div>

    <div className="intel-2" style={{ padding: "24px 24px 0" }}>
     <div className="card" style={{ overflow: "hidden", boxShadow: "var(--sh-1)" }}>
      <div className="map" style={{ height: 372 }}>
       <div className="road" style={{ left: 0, right: 0, top: "46%", height: 8 }} />
       <div className="road" style={{ top: 0, bottom: 0, left: "52%", width: 7 }} />
       <div className="road" style={{ top: 0, bottom: 0, left: "24%", width: 4 }} />
       <div className="iso r3" style={{ left: "52%", top: "50%", width: 330, height: 300 }} />
       <div className="iso r2" style={{ left: "52%", top: "50%", width: 220, height: 200 }} />
       <div className="iso r1" style={{ left: "52%", top: "50%", width: 116, height: 108 }} />
       <div className="isodot" style={{ left: "52%", top: "50%" }} />
       <MarkPin featured price={ap.subject} style={{ left: "52%", top: "50%" }} />
       {comp.map((p, i) => (
        <span key={i} style={{ position: "absolute", left: p[0], top: p[1], width: 9, height: 9, borderRadius: "50%", background: "var(--harbor)", transform: "translate(-50%,-50%)", boxShadow: "0 0 0 3px rgba(58,110,165,.18)" }} />
       ))}
       <div className="card" style={{ position: "absolute", left: 16, bottom: 16, padding: "11px 14px", boxShadow: "var(--sh-2)" }}>
        <div className="row gap16">
         <span className="lgd"><span style={{ width: 10, height: 10, borderRadius: "50%", background: "rgba(58,110,165,.35)", border: "1.5px solid rgba(58,110,165,.55)", display: "inline-block" }} /> {ap.tradeArea}</span>
         <span className="lgd"><span style={{ width: 9, height: 9, borderRadius: "50%", background: "var(--harbor)", display: "inline-block" }} /> {ap.comparableOccupiers}</span>
        </div>
       </div>
       <div className="tag" style={{ position: "absolute", right: 16, top: 16 }}>{ap.driveTimeRange}</div>
      </div>
     </div>

     <div className="col gap16">
      {/* P1-05 / Fable #16: these are illustrative figures, not sourced market
          data. Label the whole cluster unmistakably so no number here reads as
          a real analytic until a licensed mobility/spend source is wired in. */}
      <div className="row between" style={{ alignItems: "center" }}>
       <span className="eyebrow">{ap.signalsLabel}</span>
       <span className="tag" style={{ color: "#92400E", background: "#FFFBEB", borderColor: "#FCD34D" }}>{ap.sampleTag}</span>
      </div>
      <div className="row gap16 wrap"><IntelStat v="412k" l={ap.daytimePop} delta={ap.vsDistrict} dir="up" /><IntelStat v="168k" l={ap.residentPop} delta={ap.within10} /></div>
      <div className="row gap16 wrap"><IntelStat v="138" l={ap.footfallIndex} delta={ap.qoq6} dir="up" /><IntelStat v={ap.dwell47} l={ap.medianDwell} delta={ap.min4yoy} dir="up" /></div>
      <div className="row gap16 wrap"><IntelStat v="3.2×" l={ap.visitFreq} delta={ap.repeat58} /><IntelStat v="124" l={ap.medianIncome} delta={ap.topQuartile} dir="up" /></div>
     </div>
    </div>

    <div className="intel-2" style={{ padding: "20px 24px 0" }}>
     <div className="card pad" style={{ boxShadow: "var(--sh-1)" }}>
      <div className="row between">
       <div><div style={{ fontSize: "var(--fs-md)", fontWeight: 700 }}>{ap.footfallRhythm}</div><div className="muted" style={{ fontSize: 12.5 }}>{ap.hourlyIndex}</div></div>
       <span className="tag" style={{ color: "var(--azure-d)", background: "var(--azure-wash)", borderColor: "var(--azure-l)" }}>{ap.olaya}</span>
      </div>
      <div className="hours" style={{ height: 150, marginTop: 20, gap: 4 }}>
       {hours.map((h, i) => <div key={i} className={"h" + (h >= 30 ? " pk" : "")} style={{ height: (h / 33 * 100) + "%" }} />)}
      </div>
      <div className="row between mono muted" style={{ fontSize: "var(--fs-3xs)", marginTop: 8 }}>
       <span>00</span><span>06</span><span>09</span><span>12</span><span>15</span><span>18</span><span>21</span><span>23</span>
      </div>
     </div>

     <div className="card pad" style={{ boxShadow: "var(--sh-1)" }}>
      <div style={{ fontSize: "var(--fs-md)", fontWeight: 700 }}>{ap.catchmentFrom}</div>
      <div className="muted" style={{ fontSize: 12.5 }}>{ap.catchmentFromSub}</div>
      <div className="col gap14" style={{ marginTop: 18 }}>
       {origins.map((o, i) => (
        <div key={i} className="hrow"><span className="nm">{o[0]}</span><span className="hbar"><i className={o[2]} style={{ width: o[1] + "%" }} /></span><span className="pc">{o[1]}%</span></div>
       ))}
      </div>
     </div>
    </div>

    <div className="intel-11" style={{ padding: "20px 24px 40px" }}>
     <div className="card pad" style={{ boxShadow: "var(--sh-1)" }}>
      <div style={{ fontSize: "var(--fs-md)", fontWeight: 700, marginBottom: 4 }}>{ap.ageMix}</div>
      <div className="muted" style={{ fontSize: 12.5 }}>{ap.ageMixSub}</div>
      <div className="row gap24 wrap" style={{ marginTop: 18, alignItems: "center" }}>
       <div className="donut" style={{ width: 132, height: 132, background: `conic-gradient(${stops})` }}>
        <div className="hole"><span className="mono" style={{ fontSize: 18, fontWeight: 500 }}>62%</span><span style={{ fontSize: "var(--fs-3xs)", color: "var(--slate)" }}>{ap.aged2544}</span></div>
       </div>
       <div className="col gap10 grow">
        {ages.map((a, i) => (
         <div key={i} className="row between" style={{ fontSize: 12.5 }}>
          <span className="row gap8"><span style={{ width: 10, height: 10, borderRadius: 3, background: a[2], display: "inline-block" }} /> {a[0]}</span>
          <span className="mono muted">{a[1]}%</span>
         </div>
        ))}
       </div>
      </div>
     </div>

     <div className="card pad" style={{ boxShadow: "var(--sh-1)" }}>
      <div className="row between">
       <div><div style={{ fontSize: "var(--fs-md)", fontWeight: 700 }}>{ap.coTenancy}</div><div className="muted" style={{ fontSize: 12.5 }}>{ap.coTenancySub}</div></div>
       <span className="muted2"><Icon.store size={18} /></span>
      </div>
      <div className="col gap14" style={{ marginTop: 18 }}>
       {mix.map((m, i) => (
        <div key={i} className="hrow"><span className="nm" style={{ width: 150 }}>{m[0]}</span><span className="hbar"><i style={{ width: m[1] + "%" }} /></span><span className="pc">{m[1]}%</span></div>
       ))}
      </div>
      <div className="row gap10" style={{ marginTop: 18, paddingTop: 14, borderTop: "1px solid var(--silver)" }}>
       <span style={{ color: "var(--harbor)" }}><Icon.check size={15} /></span>
       <span className="muted" style={{ fontSize: 12.5 }}>{ap.coTenancyNote}</span>
      </div>
     </div>
    </div>

    <div style={{ padding: "8px 24px 48px" }}>
     <div className="card pad" style={{ boxShadow: "var(--sh-1)" }}>
      <div className="eyebrow">{ap.howTitle}</div>
      <h2 style={{ fontSize: 21, fontWeight: 700, margin: "10px 0 6px" }}>{ap.howH}</h2>
      <p className="muted" style={{ fontSize: 13.5, lineHeight: 1.6, maxWidth: 720 }}>{ap.howBody}</p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: 12, marginTop: 18 }}>
       {([[ap.srcMobileT, ap.srcMobileB], [ap.srcMojT, ap.srcMojB], [ap.srcSpendT, ap.srcSpendB], [ap.srcPublicT, ap.srcPublicB]] as [string, string][]).map((d,i)=>(
        <div key={i} className="card pad" style={{ boxShadow: "none", background: "var(--cool)" }}>
         <div style={{ fontSize: 13.5, fontWeight: 700 }}>{d[0]}</div>
         <div className="muted" style={{ fontSize: "var(--fs-xs)", lineHeight: 1.5, marginTop: 4 }}>{d[1]}</div>
        </div>
       ))}
      </div>

      <div className="eyebrow" style={{ margin: "22px 0 10px" }}>{ap.scoreTitle}</div>
      <div className="row gap8 wrap">
       {[ap.scoreFoot, ap.scoreDemo, ap.scorePotential, ap.scoreCompetition, ap.scoreVisibility].map((l,i)=>(
        <span key={i} className="chip on" style={{ fontSize: "var(--fs-xs)" }}>{l}</span>
       ))}
      </div>
      <p className="muted" style={{ fontSize: 12.5, lineHeight: 1.55, margin: "12px 0 0", maxWidth: 720 }}>{ap.scoreBody}</p>

      <div className="row gap10" style={{ marginTop: 18, paddingTop: 14, borderTop: "1px solid var(--silver)", alignItems: "flex-start" }}>
       <span style={{ color: "var(--harbor)", marginTop: 1 }}><Icon.shield size={15} /></span>
       <span className="muted" style={{ fontSize: 12.5, lineHeight: 1.55 }}>{ap.pdplNote}</span>
      </div>
     </div>
    </div>
   </div>
  </div>
 );
}
