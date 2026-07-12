import { isLocale } from "@/i18n/config";
import { notFound } from "next/navigation";
import { Icon, Mark, Ph, Verified, HARBOR } from "@/components/satkit";
import { getDictionary } from "@/i18n/getDictionary";

export default function ListPage({ params }: { params: { locale: string } }) {
 if (!isLocale(params.locale)) notFound();
 const ar = params.locale === "ar";
 const lp = getDictionary(params.locale === "ar" ? "ar" : "en").list;
 const sells: [(p: { size?: number }) => JSX.Element, string][] = [
  [Icon.check, lp.sellVerified],
  [Icon.chart, lp.sellPriced],
  [Icon.user, lp.sellDirect],
 ];
 return (
  <div className="list-split">
   <div className="list-rail">
    <div style={{ position: "absolute", right: -30, bottom: -30, opacity: .3 }}><Mark size={240} base="#222A31" lit={HARBOR} /></div>
    <div style={{ position: "relative" }}>
     <div className="eyebrow" style={{ color: "var(--azure-l)" }}>{lp.eyebrow}</div>
     <h1 className="serif" style={{ fontSize: 30, fontWeight: 500, letterSpacing: "-.01em", margin: "14px 0 0", color: "#fff" }}>{lp.h1}</h1>
     <p style={{ fontSize: 14.5, lineHeight: 1.65, color: "#AEB6C0", margin: "16px 0 28px" }}>{lp.intro}</p>
     <div className="col gap16">
      {sells.map((x, i) => { const I = x[0]; return <div key={i} className="row gap12"><span style={{ color: "var(--green)" }}><I size={18} /></span><span style={{ fontSize: 13.5, color: "#D6DCE3" }}>{x[1]}</span></div>; })}
     </div>
     <div style={{ marginTop: 36, padding: "16px 18px", background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.12)", borderRadius: 11 }}>
      <div className="mono" style={{ fontSize: 11, color: "#8A93A0", letterSpacing: ".06em" }}>{lp.avgTimeLabel}</div>
      <div className="mono tnum" style={{ fontSize: 22, fontWeight: 500, color: "#fff", marginTop: 6 }}>{lp.avgTimeValue}</div>
     </div>
    </div>
   </div>

   <div className="list-form">
    <div className="steps" style={{ marginBottom: 30 }}>
     <span className="s done"><span className="n"><Icon.check size={13} /></span> {lp.stepAsset}</span>
     <span className="bar" />
     <span className="s on"><span className="n">2</span> {lp.stepDetails}</span>
     <span className="bar" />
     <span className="s"><span className="n">3</span> {lp.stepPricing}</span>
     <span className="bar" />
     <span className="s"><span className="n">4</span> {lp.stepPublish}</span>
    </div>

    <h2 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-.02em", margin: "0 0 4px" }}>{lp.detailsTitle}</h2>
    <p className="muted" style={{ fontSize: 14, margin: 0 }}>{lp.detailsSub}</p>

    <div className="lform-grid">
     <div className="field" style={{ gridColumn: "1 / -1" }}>
      <label>{lp.fTitle}</label>
      <div className="input"><span style={{ color: "var(--ink)" }}>{lp.fTitlePh}</span></div>
     </div>
     <div className="field">
      <label>{lp.fAssetType}</label>
      <div className="input between"><span>{lp.office}</span><span className="muted2"><Icon.chevd size={16} /></span></div>
     </div>
     <div className="field">
      <label>{lp.fTxn}</label>
      <div className="seg" style={{ alignSelf: "flex-start" }}><span className="on">{lp.lease}</span><span>{lp.sale}</span></div>
     </div>
     <div className="field">
      <label>{lp.fNla}</label>
      <div className="input between"><span>320</span><span className="mono muted2">m²</span></div>
     </div>
     <div className="field">
      <label>{lp.fFloor}</label>
      <div className="input"><span>{lp.fFloorPh}</span></div>
     </div>
     <div className="field" style={{ gridColumn: "1 / -1" }}>
      <label>{lp.fLocation}</label>
      <div className="input between"><span className="row gap8"><span style={{ color: "var(--harbor)" }}><Icon.pin size={16} /></span> {lp.fLocationPh}</span><span className="muted2"><Icon.chevd size={16} /></span></div>
     </div>
     <div className="field" style={{ gridColumn: "1 / -1" }}>
      <label>{lp.fFitout}</label>
      <div className="row gap10 wrap">
       <span className="chip on">{lp.fitted}</span><span className="chip">{lp.shellCore}</span><span className="chip">{lp.furnished}</span><span className="chip">{lp.flexible}</span>
      </div>
     </div>
     <div className="field" style={{ gridColumn: "1 / -1" }}>
      <label>{lp.fPhotos}</label>
      <div className="row gap12 wrap">
       <Ph label={lp.cover} h={92} style={{ width: 120, borderRadius: 9 }} />
       <Ph label="" h={92} style={{ width: 120, borderRadius: 9 }} />
       <div className="upload" style={{ flex: "1 1 200px", padding: 16, flexDirection: "row", gap: 12 }}>
        <span style={{ color: "var(--azure-d)" }}><Icon.cam size={20} /></span>
        <div style={{ textAlign: ar ? "right" : "left" }}><div style={{ fontSize: 13, fontWeight: 600 }}>{lp.dragPhotos}</div><div className="muted" style={{ fontSize: 11.5 }}>{lp.photoHint}</div></div>
       </div>
      </div>
     </div>
    </div>

    <div className="card pad" style={{ marginTop: 28, maxWidth: 720, background: "var(--cool)", boxShadow: "none" }}>
     <div className="eyebrow">{lp.livePreview}</div>
     <div className="row gap14 wrap" style={{ marginTop: 14 }}>
      <Ph label={lp.gradeAOffice} h={84} style={{ width: 130, borderRadius: 9 }} badges={[<Verified key="v" text="V" />]} />
      <div style={{ flex: 1, minWidth: 200 }}>
       <div className="price muted" style={{ fontSize: 16 }}>{lp.pricePlaceholder} <small>{lp.unitSar}</small></div>
       <div className="ttl">{lp.fTitlePh}</div>
       <div className="meta"><span>{lp.alOlaya}</span><i /><span>320 m²</span><i /><span>{lp.fitted}</span></div>
      </div>
     </div>
    </div>

    <div className="row gap12 between wrap" style={{ marginTop: 30, maxWidth: 720 }}>
     <span className="btn secondary"><span style={{ display: "inline-flex", transform: ar ? "none" : "rotate(180deg)" }}><Icon.chevr size={15} /></span> {lp.back}</span>
     <span className="btn primary lg">{lp.continuePricing} <Icon.arrow size={16} /></span>
    </div>
   </div>
  </div>
 );
}
