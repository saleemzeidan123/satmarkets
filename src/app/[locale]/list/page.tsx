import { isLocale } from "@/i18n/config";
import { notFound } from "next/navigation";
import { Icon, Mark, Ph, Verified, HARBOR } from "@/components/satkit";

export default function ListPage({ params }: { params: { locale: string } }) {
 if (!isLocale(params.locale)) notFound();
 const ar = params.locale === "ar";
 const sells: [(p: { size?: number }) => JSX.Element, string][] = [
  [Icon.check, ar ? "موثّق، بموضع بارز" : "Verified, prominent placement"],
  [Icon.chart, ar ? "مُسعّر وفق مؤشر الإيجار" : "Priced against the Rent Index"],
  [Icon.user, ar ? "استفسارات مباشرة، بلا وسيط" : "Direct enquiries, no middleman"],
 ];
 return (
  <div className="list-split">
   <div className="list-rail">
    <div style={{ position: "absolute", right: -30, bottom: -30, opacity: .3 }}><Mark size={240} base="#222A31" lit={HARBOR} /></div>
    <div style={{ position: "relative" }}>
     <div className="eyebrow" style={{ color: "var(--azure-l)" }}>{ar ? "للملاك" : "For owners"}</div>
     <h1 className="serif" style={{ fontSize: 30, fontWeight: 500, letterSpacing: "-.01em", margin: "14px 0 0", color: "#fff" }}>{ar ? "أدرج مساحتك في المنصة الموثّقة" : "List your space on the verified exchange"}</h1>
     <p style={{ fontSize: 14.5, lineHeight: 1.65, color: "#AEB6C0", margin: "16px 0 28px" }}>{ar ? "يتم توثيق الملاك قبل الإدراج. لا عمولة مفترضة، وأنت تختار تعيين سات لاحقاً." : "Owners are verified before listing. No assumed commission, you choose whether to appoint SAT later."}</p>
     <div className="col gap16">
      {sells.map((x, i) => { const I = x[0]; return <div key={i} className="row gap12"><span style={{ color: "var(--green)" }}><I size={18} /></span><span style={{ fontSize: 13.5, color: "#D6DCE3" }}>{x[1]}</span></div>; })}
     </div>
     <div style={{ marginTop: 36, padding: "16px 18px", background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.12)", borderRadius: 11 }}>
      <div className="mono" style={{ fontSize: 11, color: "#8A93A0", letterSpacing: ".06em" }}>{ar ? "متوسط زمن التوثيق" : "AVG. TIME TO VERIFIED"}</div>
      <div className="mono tnum" style={{ fontSize: 22, fontWeight: 500, color: "#fff", marginTop: 6 }}>{ar ? "~36 ساعة" : "~36 hours"}</div>
     </div>
    </div>
   </div>

   <div className="list-form">
    <div className="steps" style={{ marginBottom: 30 }}>
     <span className="s done"><span className="n"><Icon.check size={13} /></span> {ar ? "الأصل" : "Asset"}</span>
     <span className="bar" />
     <span className="s on"><span className="n">2</span> {ar ? "التفاصيل والوسائط" : "Details & media"}</span>
     <span className="bar" />
     <span className="s"><span className="n">3</span> {ar ? "التسعير" : "Pricing"}</span>
     <span className="bar" />
     <span className="s"><span className="n">4</span> {ar ? "التوثيق والنشر" : "Verify & publish"}</span>
    </div>

    <h2 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-.02em", margin: "0 0 4px" }}>{ar ? "تفاصيل المساحة والوسائط" : "Space details & media"}</h2>
    <p className="muted" style={{ fontSize: 14, margin: 0 }}>{ar ? "كلما اكتملت البيانات، أسرع التوثيق وأفضل الترتيب." : "The more complete, the faster verification, and the better it ranks."}</p>

    <div className="lform-grid">
     <div className="field" style={{ gridColumn: "1 / -1" }}>
      <label>{ar ? "عنوان الإعلان" : "Listing title"}</label>
      <div className="input"><span style={{ color: "var(--ink)" }}>{ar ? "دور مكتبي فئة A، برج العليا" : "Grade A Office Floor, Olaya Tower"}</span></div>
     </div>
     <div className="field">
      <label>{ar ? "نوع الأصل" : "Asset type"}</label>
      <div className="input between"><span>{ar ? "مكتب" : "Office"}</span><span className="muted2"><Icon.chevd size={16} /></span></div>
     </div>
     <div className="field">
      <label>{ar ? "نوع المعاملة" : "Transaction"}</label>
      <div className="seg" style={{ alignSelf: "flex-start" }}><span className="on">{ar ? "إيجار" : "Lease"}</span><span>{ar ? "بيع" : "Sale"}</span></div>
     </div>
     <div className="field">
      <label>{ar ? "المساحة الصافية القابلة للتأجير" : "Net leasable area"}</label>
      <div className="input between"><span>320</span><span className="mono muted2">m²</span></div>
     </div>
     <div className="field">
      <label>{ar ? "الدور / المستوى" : "Floor / level"}</label>
      <div className="input"><span>{ar ? "18 · النطاق العلوي" : "18 · High zone"}</span></div>
     </div>
     <div className="field" style={{ gridColumn: "1 / -1" }}>
      <label>{ar ? "الحي" : "District"}</label>
      <div className="input between"><span className="row gap8"><span style={{ color: "var(--harbor)" }}><Icon.pin size={16} /></span> {ar ? "العليا، الرياض" : "Al Olaya, Riyadh"}</span><span className="muted2"><Icon.chevd size={16} /></span></div>
     </div>
     <div className="field" style={{ gridColumn: "1 / -1" }}>
      <label>{ar ? "حالة التجهيز" : "Fit-out condition"}</label>
      <div className="row gap10 wrap">
       <span className="chip on">{ar ? "مجهّز" : "Fitted"}</span><span className="chip">{ar ? "عظم" : "Shell & core"}</span><span className="chip">{ar ? "مفروش" : "Furnished"}</span><span className="chip">{ar ? "مرن" : "Flexible"}</span>
      </div>
     </div>
     <div className="field" style={{ gridColumn: "1 / -1" }}>
      <label>{ar ? "الصور والمخطط" : "Photos & floor plan"}</label>
      <div className="row gap12 wrap">
       <Ph label={ar ? "الغلاف" : "Cover"} h={92} style={{ width: 120, borderRadius: 9 }} />
       <Ph label="" h={92} style={{ width: 120, borderRadius: 9 }} />
       <div className="upload" style={{ flex: "1 1 200px", padding: 16, flexDirection: "row", gap: 12 }}>
        <span style={{ color: "var(--azure-d)" }}><Icon.cam size={20} /></span>
        <div style={{ textAlign: ar ? "right" : "left" }}><div style={{ fontSize: 13, fontWeight: 600 }}>{ar ? "اسحب الصور هنا" : "Drag photos here"}</div><div className="muted" style={{ fontSize: 11.5 }}>{ar ? "JPG/PNG حتى 10 ميجابايت · 4 صور كحد أدنى" : "JPG/PNG up to 10MB · min 4 photos"}</div></div>
       </div>
      </div>
     </div>
    </div>

    <div className="card pad" style={{ marginTop: 28, maxWidth: 720, background: "var(--cool)", boxShadow: "none" }}>
     <div className="eyebrow">{ar ? "معاينة مباشرة" : "Live preview"}</div>
     <div className="row gap14 wrap" style={{ marginTop: 14 }}>
      <Ph label={ar ? "مكتب فئة A" : "Grade A office"} h={84} style={{ width: 130, borderRadius: 9 }} badges={[<Verified key="v" text="V" />]} />
      <div style={{ flex: 1, minWidth: 200 }}>
       <div className="price" style={{ fontSize: 16 }}>1,450 <small>{ar ? "ريال/م²·سنة" : "SAR/m²·yr"}</small></div>
       <div className="ttl">{ar ? "دور مكتبي فئة A، برج العليا" : "Grade A Office Floor, Olaya Tower"}</div>
       <div className="meta"><span>{ar ? "العليا" : "Al Olaya"}</span><i /><span>320 m²</span><i /><span>{ar ? "مجهّز" : "Fitted"}</span></div>
      </div>
     </div>
    </div>

    <div className="row gap12 between wrap" style={{ marginTop: 30, maxWidth: 720 }}>
     <span className="btn secondary"><span style={{ display: "inline-flex", transform: ar ? "none" : "rotate(180deg)" }}><Icon.chevr size={15} /></span> {ar ? "رجوع" : "Back"}</span>
     <span className="btn primary lg">{ar ? "المتابعة إلى التسعير" : "Continue to pricing"} <Icon.arrow size={16} /></span>
    </div>
   </div>
  </div>
 );
}
