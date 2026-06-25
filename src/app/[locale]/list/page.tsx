import { isLocale } from "@/i18n/config";
import { notFound } from "next/navigation";
import { Icon, Mark, Ph, Verified, HARBOR } from "@/components/satkit";

export default function ListPage({ params }: { params: { locale: string } }) {
 if (!isLocale(params.locale)) notFound();
 const sells: [(p: { size?: number }) => JSX.Element, string][] = [
  [Icon.check, "Verified, prominent placement"],
  [Icon.chart, "Priced against the Rent Index"],
  [Icon.user, "Direct enquiries, no middleman"],
 ];
 return (
  <div className="list-split">
   <div className="list-rail">
    <div style={{ position: "absolute", right: -30, bottom: -30, opacity: .3 }}><Mark size={240} base="#222A31" lit={HARBOR} /></div>
    <div style={{ position: "relative" }}>
     <div className="eyebrow" style={{ color: "var(--azure-l)" }}>For owners</div>
     <h1 className="serif" style={{ fontSize: 30, fontWeight: 500, letterSpacing: "-.01em", margin: "14px 0 0", color: "#fff" }}>List your space on the verified exchange</h1>
     <p style={{ fontSize: 14.5, lineHeight: 1.65, color: "#AEB6C0", margin: "16px 0 28px" }}>Owners are verified before listing. No assumed commission, you choose whether to appoint SAT later.</p>
     <div className="col gap16">
      {sells.map((x, i) => { const I = x[0]; return <div key={i} className="row gap12"><span style={{ color: "var(--green)" }}><I size={18} /></span><span style={{ fontSize: 13.5, color: "#D6DCE3" }}>{x[1]}</span></div>; })}
     </div>
     <div style={{ marginTop: 36, padding: "16px 18px", background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.12)", borderRadius: 11 }}>
      <div className="mono" style={{ fontSize: 11, color: "#8A93A0", letterSpacing: ".06em" }}>AVG. TIME TO VERIFIED</div>
      <div className="mono tnum" style={{ fontSize: 22, fontWeight: 500, color: "#fff", marginTop: 6 }}>~36 hours</div>
     </div>
    </div>
   </div>

   <div className="list-form">
    <div className="steps" style={{ marginBottom: 30 }}>
     <span className="s done"><span className="n"><Icon.check size={13} /></span> Asset</span>
     <span className="bar" />
     <span className="s on"><span className="n">2</span> Details &amp; media</span>
     <span className="bar" />
     <span className="s"><span className="n">3</span> Pricing</span>
     <span className="bar" />
     <span className="s"><span className="n">4</span> Verify &amp; publish</span>
    </div>

    <h2 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-.02em", margin: "0 0 4px" }}>Space details &amp; media</h2>
    <p className="muted" style={{ fontSize: 14, margin: 0 }}>The more complete, the faster verification, and the better it ranks.</p>

    <div className="lform-grid">
     <div className="field" style={{ gridColumn: "1 / -1" }}>
      <label>Listing title</label>
      <div className="input"><span style={{ color: "var(--ink)" }}>Grade A Office Floor, Olaya Tower</span></div>
     </div>
     <div className="field">
      <label>Asset type</label>
      <div className="input between"><span>Office</span><span className="muted2"><Icon.chevd size={16} /></span></div>
     </div>
     <div className="field">
      <label>Transaction</label>
      <div className="seg" style={{ alignSelf: "flex-start" }}><span className="on">Lease</span><span>Sale</span></div>
     </div>
     <div className="field">
      <label>Net leasable area</label>
      <div className="input between"><span>320</span><span className="mono muted2">m²</span></div>
     </div>
     <div className="field">
      <label>Floor / level</label>
      <div className="input"><span>18 · High zone</span></div>
     </div>
     <div className="field" style={{ gridColumn: "1 / -1" }}>
      <label>District</label>
      <div className="input between"><span className="row gap8"><span style={{ color: "var(--harbor)" }}><Icon.pin size={16} /></span> Al Olaya, Riyadh</span><span className="muted2"><Icon.chevd size={16} /></span></div>
     </div>
     <div className="field" style={{ gridColumn: "1 / -1" }}>
      <label>Fit-out condition</label>
      <div className="row gap10 wrap">
       <span className="chip on">Fitted</span><span className="chip">Shell &amp; core</span><span className="chip">Furnished</span><span className="chip">Flexible</span>
      </div>
     </div>
     <div className="field" style={{ gridColumn: "1 / -1" }}>
      <label>Photos &amp; floor plan</label>
      <div className="row gap12 wrap">
       <Ph label="Cover" h={92} style={{ width: 120, borderRadius: 9 }} />
       <Ph label="" h={92} style={{ width: 120, borderRadius: 9 }} />
       <div className="upload" style={{ flex: "1 1 200px", padding: 16, flexDirection: "row", gap: 12 }}>
        <span style={{ color: "var(--azure-d)" }}><Icon.cam size={20} /></span>
        <div style={{ textAlign: "left" }}><div style={{ fontSize: 13, fontWeight: 600 }}>Drag photos here</div><div className="muted" style={{ fontSize: 11.5 }}>JPG/PNG up to 10MB · min 4 photos</div></div>
       </div>
      </div>
     </div>
    </div>

    <div className="card pad" style={{ marginTop: 28, maxWidth: 720, background: "var(--cool)", boxShadow: "none" }}>
     <div className="eyebrow">Live preview</div>
     <div className="row gap14 wrap" style={{ marginTop: 14 }}>
      <Ph label="Grade A office" h={84} style={{ width: 130, borderRadius: 9 }} badges={[<Verified key="v" text="V" />]} />
      <div style={{ flex: 1, minWidth: 200 }}>
       <div className="price" style={{ fontSize: 16 }}>1,450 <small>SAR/m²·yr</small></div>
       <div className="ttl">Grade A Office Floor, Olaya Tower</div>
       <div className="meta"><span>Al Olaya</span><i /><span>320 m²</span><i /><span>Fitted</span></div>
      </div>
     </div>
    </div>

    <div className="row gap12 between wrap" style={{ marginTop: 30, maxWidth: 720 }}>
     <span className="btn secondary"><span style={{ display: "inline-flex", transform: "rotate(180deg)" }}><Icon.chevr size={15} /></span> Back</span>
     <span className="btn primary lg">Continue to pricing <Icon.arrow size={16} /></span>
    </div>
   </div>
  </div>
 );
}
