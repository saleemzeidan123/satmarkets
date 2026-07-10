import { isLocale } from "@/i18n/config";
import { notFound } from "next/navigation";
import { Icon, Verified } from "@/components/satkit";

import SampleBanner from "@/components/SampleBanner";
export default function HbuPage({ params }: { params: { locale: string } }) {
 if (!isLocale(params.locale)) notFound();
 const ar = params.locale === "ar";
 const open = [100, 106, 112, 118, 124, 130, 136];
 const capped = [100, 100, 100, 100, 100, 118, 124];
 const max = 140;
 const kpis: [string, string, string, string | null][] = [
  ["64.8M", ar ? "القيمة الاسترشادية، ريال" : "Indicative value, SAR", "", null],
  ["6.8%", ar ? "صافي العائد المبدئي" : "Net initial yield", ar ? "+0.2 مقابل الحي" : "+0.2 vs district", "up"],
  ["4.40M", ar ? "صافي الدخل التشغيلي المستقر، ريال/سنة" : "Stabilised NOI, SAR/yr", "", null],
  ["11.2%", ar ? "العائد الداخلي بالرافعة 5 سنوات" : "5-yr levered IRR", ar ? "الحالة الأساسية" : "base case", "up"],
  ["1.6×", ar ? "مضاعف حقوق الملكية" : "Equity multiple", ar ? "خلال فترة التملّك" : "over hold", null],
  ["6.5%", ar ? "معدل رسملة الخروج" : "Exit cap rate", ar ? "مفترض" : "assumed", null],
 ];
 const comps: [string, string, string, string, string][] = [
  [ar ? "برج العليا · دور كامل" : "Olaya Tower · whole floor", ar ? "أبريل 2026" : "Apr 2026", "1,440", "6.6%", "202M"],
  [ar ? "العقارية بلازا · دوران" : "Al Akaria Plaza · 2 floors", ar ? "فبراير 2026" : "Feb 2026", "1,210", "7.1%", "318M"],
  [ar ? "بوابة التحلية · مكتب" : "Tahlia Gate · office", ar ? "يناير 2026" : "Jan 2026", "1,520", "6.4%", "141M"],
  [ar ? "واحة غرناطة · برج" : "Granada Oasis · tower", ar ? "ديسمبر 2025" : "Dec 2025", "1,060", "7.6%", "486M"],
 ];
 return (
  <div style={{ background: "var(--cool)" }}>
   <div style={{ maxWidth: 1360, margin: "0 auto" }}>
    <SampleBanner ar={ar} />
    <div className="row between wrap" style={{ padding: "24px 24px 20px", alignItems: "flex-end", borderBottom: "1px solid var(--silver)", background: "var(--paper)", gap: 16 }}>
     <div>
      <div className="eyebrow">{ar ? "الاكتتاب الاستثماري · الربع الأول 2026" : "Investment underwriting · Q1 2026"}</div>
      <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-.02em", margin: "10px 0 0" }}>{ar ? "دور مكتبي فئة A، برج العليا" : "Grade A Office Floor, Olaya Tower"}</h1>
      <div className="muted" style={{ fontSize: 13.5, marginTop: 6 }}>{ar ? "320 م² · العليا · مُقيّم على صفقات مقارنة موثّقة" : "320 m² · Al Olaya · underwritten on verified comparable transactions"}</div>
     </div>
     <div className="row gap10 wrap">
      <span className="btn secondary"><Icon.download size={15} /> {ar ? "تصدير النموذج" : "Export model"}</span>
      <span className="btn primary"><Icon.spark size={15} /> {ar ? "اطلب تقييم الذكاء الاصطناعي" : "Ask AI to underwrite"}</span>
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
       <div style={{ fontSize: 15, fontWeight: 700 }}>{ar ? "السيناريو" : "Scenario"}</div>
       <span className="grow" /><span className="tag">{ar ? "الحالة الأساسية" : "Base case"}</span>
      </div>
      <div className="col gap18">
       <div className="field">
        <label>{ar ? "سعر الاستحواذ (ريال)" : "Acquisition price (SAR)"}</label>
        <div className="input between"><span>64,800,000</span><span className="mono muted2">{ar ? "ريال" : "SAR"}</span></div>
       </div>
       <div className="field">
        <label>{ar ? "مدة الإيجار" : "Lease term"}</label>
        <div className="seg" style={{ alignSelf: "flex-start" }}><span>{ar ? "3 سنوات" : "3 yr"}</span><span className="on">{ar ? "5 سنوات" : "5 yr"}</span><span>{ar ? "10 سنوات" : "10 yr"}</span></div>
       </div>
       <div className="field">
        <label>{ar ? "تصعيد الإيجار" : "Rent escalation"}</label>
        <div className="seg" style={{ alignSelf: "flex-start" }}><span className="on">{ar ? "مفتوح · إعادة تسعير" : "Open · re-price"}</span><span>{ar ? "مقيّد · مجمّد" : "Capped · frozen"}</span></div>
        <span className="hint">{ar ? "المقيّد يعكس تجميد الرياض لخمس سنوات على العقود القائمة (سبتمبر 2025)." : "Capped reflects the Sept-2025 Riyadh 5-yr freeze on existing leases."}</span>
       </div>
       <div className="field">
        <label>{ar ? "الإشغال المستقر" : "Stabilised occupancy"} <span className="hint">96%</span></label>
        <div className="hbar" style={{ height: 10 }}><i style={{ width: "96%" }} /></div>
       </div>
       <div className="field">
        <label>{ar ? "معدل رسملة الخروج" : "Exit cap rate"} <span className="hint">6.5%</span></label>
        <div className="hbar" style={{ height: 10 }}><i style={{ width: "52%" }} /></div>
       </div>
       <div className="field">
        <label>{ar ? "الرافعة المالية (نسبة التمويل)" : "Leverage (LTV)"} <span className="hint">55%</span></label>
        <div className="hbar" style={{ height: 10 }}><i className="h2" style={{ width: "55%" }} /></div>
       </div>
      </div>
      <div style={{ height: 1, background: "var(--silver)", margin: "20px 0" }} />
      <div className="row between" style={{ fontSize: 13 }}><span className="muted">{ar ? "العائد عند الدخول" : "Going-in yield"}</span><b className="mono">6.8%</b></div>
      <div className="row between" style={{ fontSize: 13, marginTop: 10 }}><span className="muted">{ar ? "العائد على التكلفة (سنة 5)" : "Yield-on-cost (yr 5)"}</span><b className="mono" style={{ color: "var(--green)" }}>8.1%</b></div>
      <span className="btn primary lg" style={{ justifyContent: "center", marginTop: 18, width: "100%" }}>{ar ? "تشغيل النموذج الكامل" : "Run full model"}</span>
     </div>

     <div className="col gap20">
      <div className="card pad" style={{ boxShadow: "var(--sh-1)" }}>
       <div className="row between wrap" style={{ alignItems: "flex-start", gap: 10 }}>
        <div><div style={{ fontSize: 15, fontWeight: 700 }}>{ar ? "توقّع صافي الدخل التشغيلي · تملّك 7 سنوات" : "NOI projection · 7-year hold"}</div><div className="muted" style={{ fontSize: 12.5 }}>{ar ? "مفهرس إلى 100 عند الاستحواذ · تصعيد مفتوح مقابل مقيّد" : "Indexed to 100 at acquisition · open vs capped escalation"}</div></div>
        <div className="col gap8">
         <span className="lgd"><span className="sw" /> {ar ? "مفتوح · يُعاد تسعيره وفق السوق" : "Open · re-prices to market"}</span>
         <span className="lgd"><span className="sw amber" /> {ar ? "مقيّد · مجمّد السنوات 1 إلى 5" : "Capped · frozen yrs 1–5"}</span>
        </div>
       </div>
       <div className="row" style={{ alignItems: "flex-end", gap: 18, height: 188, marginTop: 22 }}>
        {open.map((o, i) => (
         <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
          <div className="row" style={{ alignItems: "flex-end", gap: 5, height: 150, width: "100%", justifyContent: "center" }}>
           <div className="b hi" style={{ height: (o / max * 100) + "%", width: 18, borderRadius: "4px 4px 0 0" }} />
           <div className="b" style={{ height: (capped[i] / max * 100) + "%", width: 18, borderRadius: "4px 4px 0 0", background: "#FBF4E6", borderColor: "#ECDCB6" }} />
          </div>
          <span className="mono muted" style={{ fontSize: 10.5 }}>{(ar ? "س" : "Y") + (i + 1)}</span>
         </div>
        ))}
       </div>
       <div className="row gap10" style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--silver)" }}>
        <span style={{ color: "var(--amber)" }}><Icon.info size={15} /></span>
        <span className="muted" style={{ fontSize: 12.5 }}>{ar ? "إذا كان هذا الأصل عقداً أولياً جديداً فهو " : "If this asset is a new first-lease it is "}<b style={{ color: "var(--ink)" }}>{ar ? "غير خاضع للتجميد" : "unaffected by the freeze"}</b>{ar ? " ويُعاد تسعيره كل مدة، وهذه الفجوة هي الأثر الإيجابي في الاكتتاب." : " and re-prices every term, that gap is the underwriting upside."}</span>
       </div>
      </div>

      <div className="card" style={{ overflow: "hidden", boxShadow: "var(--sh-1)" }}>
       <div className="row between" style={{ padding: "16px 20px", borderBottom: "1px solid var(--silver)" }}>
        <div style={{ fontSize: 15, fontWeight: 700 }}>{ar ? "صفقات مقارنة" : "Comparable transactions"}</div>
        <span className="chip" style={{ borderColor: "var(--silver)" }}>{ar ? "آخر 6 أشهر" : "Last 6 months"} <Icon.chevd size={14} /></span>
       </div>
       <div style={{ overflowX: "auto" }}>
        <table className="dt" style={{ minWidth: 620 }}>
         <thead><tr><th>{ar ? "الأصل" : "Asset"}</th><th>{ar ? "التاريخ" : "Date"}</th><th style={{ textAlign: ar ? "left" : "right" }}>{ar ? "ريال/م²" : "SAR/m²"}</th><th style={{ textAlign: ar ? "left" : "right" }}>{ar ? "معدل الرسملة" : "Cap rate"}</th><th style={{ textAlign: ar ? "left" : "right" }}>{ar ? "السعر" : "Price"}</th><th style={{ textAlign: ar ? "left" : "right" }}>{ar ? "المصدر" : "Source"}</th></tr></thead>
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
        <span className="muted" style={{ fontSize: 12.5 }}>{ar ? "الصفقات المقارنة مأخوذة فقط من معاملات موثّقة أشرفت عليها سات، بلا أسعار طلب، وبلا أرقام مستخرجة آلياً." : "Comps drawn only from verified SAT-advised transactions, no asking prices, no scraped figures."}</span>
       </div>
      </div>
     </div>
    </div>
   </div>
  </div>
 );
}
