import { isLocale } from "@/i18n/config";
import { notFound } from "next/navigation";
import { Icon, MarkPin } from "@/components/satkit";
import JsonLd, { SITE } from "@/components/JsonLd";

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
 const ar = params.locale === "ar";
 const title = ar ? "ذكاء الموقع، نطاق العليا التجاري | سات ماركتس" : "Location Intelligence, Al Olaya trade area | SAT Markets";
 const description = ar ? "حركة المشاة والنطاق التجاري والجوار في العليا بالرياض، مبنية للمملكة ومقيّمة بشفافية عبر خمس عدسات." : "Footfall, trade-area catchment and co-tenancy for Al Olaya, Riyadh. Built for Saudi Arabia and scored transparently across five lenses for reliable site selection.";
 const url = `${SITE}/${params.locale}/area`;
 return { title, description, alternates: { canonical: url }, openGraph: { title, description, url, type: "website" } };
}

export default function AreaPage({ params }: { params: { locale: string } }) {
 if (!isLocale(params.locale)) notFound();
 const ar = params.locale === "ar";
 const hours = [4, 5, 7, 11, 18, 26, 30, 28, 24, 20, 22, 27, 31, 29, 25, 23, 28, 33, 30, 21, 14, 9, 6, 4];
 const origins: [string, number, string][] = ar ? [
  ["حطين · الملقا", 34, ""], ["ممر كافد", 27, ""], ["الحي الدبلوماسي", 19, "h2"],
  ["الورود · السليمانية", 12, "h2"], ["خارج الرياض", 8, "h2"],
 ] : [
  ["Hittin · Al Malqa", 34, ""], ["KAFD corridor", 27, ""], ["Diplomatic Quarter", 19, "h2"],
  ["Al Wurud · Sulimaniyah", 12, "h2"], ["Outside Riyadh", 8, "h2"],
 ];
 const ages: [string, number, string][] = [["25–34", 34, "var(--azure)"], ["35–44", 28, "var(--harbor)"], ["45–54", 16, "var(--azure-l)"], ["18–24", 12, "#B9C6E8"], ["55+", 10, "#D7DDE5"]];
 const mix: [string, number][] = ar
  ? [["مكاتب شركات", 41], ["بنوك وتمويل", 22], ["أغذية ومشروبات", 19], ["تجزئة", 11], ["طبي", 7]]
  : [["Corporate office", 41], ["Banking & finance", 22], ["F&B", 19], ["Retail", 11], ["Medical", 7]];
 let acc = 0;
 const stops = ages.map((a) => { const s = `${a[2]} ${acc}% ${acc + a[1]}%`; acc += a[1]; return s; }).join(",");
 const comp: [string, string][] = [["44%", "34%"], ["62%", "40%"], ["58%", "62%"], ["40%", "60%"], ["68%", "52%"]];
 return (
  <div style={{ background: "var(--cool)" }}>
   <JsonLd data={{ "@type": "BreadcrumbList", itemListElement: [
    { "@type": "ListItem", position: 1, name: ar ? "الرئيسية" : "Home", item: `${SITE}/${params.locale}` },
    { "@type": "ListItem", position: 2, name: ar ? "ذكاء الموقع" : "Location Intelligence", item: `${SITE}/${params.locale}/area` },
   ] }} />
   <div style={{ maxWidth: 1360, margin: "0 auto" }}>
    <div className="row between wrap" style={{ padding: "24px 24px 20px", alignItems: "flex-end", borderBottom: "1px solid var(--silver)", background: "var(--paper)", gap: 16 }}>
     <div>
      <div className="eyebrow">{ar ? "ذكاء الموقع · الربع الأول 2026" : "Location Intelligence · Q1 2026"}</div>
      <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-.02em", margin: "10px 0 0" }}>{ar ? "نطاق العليا التجاري" : "Al Olaya trade area"}</h1>
      <div className="muted" style={{ fontSize: 13.5, marginTop: 6 }}>{ar ? "الحركة والنطاق والجوار التجاري. أرقام تمثيلية، ويجري ربط مصادر الحركة والإنفاق والديموغرافيا السعودية المباشرة." : "Footfall, catchment & co-tenancy. Representative figures, live Saudi mobility, spend and demographic sources are being onboarded."}</div>
     </div>
     <div className="row gap10 wrap">
      <span className="chip">{ar ? "زمن القيادة 10 دقائق" : "Drive-time 10 min"} <Icon.chevd size={14} /></span>
      <span className="chip">{ar ? "أيام الأسبوع" : "Weekday"} <Icon.chevd size={14} /></span>
      <span className="btn secondary"><Icon.download size={15} /> {ar ? "تصدير" : "Export"}</span>
      <span className="btn primary"><Icon.spark size={15} /> {ar ? "اسأل الذكاء" : "Ask AI"}</span>
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
       <MarkPin featured price={ar ? "الموقع" : "Subject"} style={{ left: "52%", top: "50%" }} />
       {comp.map((p, i) => (
        <span key={i} style={{ position: "absolute", left: p[0], top: p[1], width: 9, height: 9, borderRadius: "50%", background: "var(--harbor)", transform: "translate(-50%,-50%)", boxShadow: "0 0 0 3px rgba(58,110,165,.18)" }} />
       ))}
       <div className="card" style={{ position: "absolute", left: 16, bottom: 16, padding: "11px 14px", boxShadow: "var(--sh-2)" }}>
        <div className="row gap16">
         <span className="lgd"><span style={{ width: 10, height: 10, borderRadius: "50%", background: "rgba(58,110,165,.35)", border: "1.5px solid rgba(58,110,165,.55)", display: "inline-block" }} /> {ar ? "النطاق التجاري" : "Trade area"}</span>
         <span className="lgd"><span style={{ width: 9, height: 9, borderRadius: "50%", background: "var(--harbor)", display: "inline-block" }} /> {ar ? "مستأجرون مماثلون" : "Comparable occupiers"}</span>
        </div>
       </div>
       <div className="tag" style={{ position: "absolute", right: 16, top: 16 }}>{ar ? "زمن القيادة 5 / 10 / 15 دقيقة" : "5 / 10 / 15 min drive-time"}</div>
      </div>
     </div>

     <div className="col gap16">
      <div className="row gap16 wrap"><IntelStat v="412k" l={ar ? "السكان النهاريون" : "Daytime population"} delta={ar ? "+18% مقابل متوسط الحي" : "+18% vs district avg"} dir="up" /><IntelStat v="168k" l={ar ? "السكان المقيمون" : "Resident population"} delta={ar ? "ضمن 10 دقائق" : "within 10-min"} /></div>
      <div className="row gap16 wrap"><IntelStat v="138" l={ar ? "مؤشر الحركة (المدينة = 100)" : "Footfall index (city = 100)"} delta={ar ? "+6 ربعياً" : "+6 QoQ"} dir="up" /><IntelStat v={ar ? "47 دقيقة" : "47 min"} l={ar ? "وسيط مدة المكوث" : "Median dwell time"} delta={ar ? "+4 دقائق سنوياً" : "+4 min YoY"} dir="up" /></div>
      <div className="row gap16 wrap"><IntelStat v="3.2×" l={ar ? "تكرار الزيارة / شهر" : "Visit frequency / month"} delta={ar ? "الزوار المتكررون 58%" : "repeat visitors 58%"} /><IntelStat v="124" l={ar ? "مؤشر وسيط الدخل" : "Median income index"} delta={ar ? "نطاق الربع الأعلى" : "top-quartile catchment"} dir="up" /></div>
     </div>
    </div>

    <div className="intel-2" style={{ padding: "20px 24px 0" }}>
     <div className="card pad" style={{ boxShadow: "var(--sh-1)" }}>
      <div className="row between">
       <div><div style={{ fontSize: 15, fontWeight: 700 }}>{ar ? "إيقاع الحركة، أيام الأسبوع" : "Footfall rhythm, weekday"}</div><div className="muted" style={{ fontSize: 12.5 }}>{ar ? "مؤشر بالساعة · الذروة 12–14 و18–19" : "Hourly index · peaks 12–14h & 18–19h"}</div></div>
       <span className="tag" style={{ color: "var(--azure-d)", background: "var(--azure-wash)", borderColor: "var(--azure-l)" }}>{ar ? "العليا" : "Olaya"}</span>
      </div>
      <div className="hours" style={{ height: 150, marginTop: 20, gap: 4 }}>
       {hours.map((h, i) => <div key={i} className={"h" + (h >= 30 ? " pk" : "")} style={{ height: (h / 33 * 100) + "%" }} />)}
      </div>
      <div className="row between mono muted" style={{ fontSize: 10, marginTop: 8 }}>
       <span>00</span><span>06</span><span>09</span><span>12</span><span>15</span><span>18</span><span>21</span><span>23</span>
      </div>
     </div>

     <div className="card pad" style={{ boxShadow: "var(--sh-1)" }}>
      <div style={{ fontSize: 15, fontWeight: 700 }}>{ar ? "من أين يأتي النطاق" : "Where the catchment comes from"}</div>
      <div className="muted" style={{ fontSize: 12.5 }}>{ar ? "موطن أصل الزوار النهاريين" : "Home-origin of daytime visitors"}</div>
      <div className="col gap14" style={{ marginTop: 18 }}>
       {origins.map((o, i) => (
        <div key={i} className="hrow"><span className="nm">{o[0]}</span><span className="hbar"><i className={o[2]} style={{ width: o[1] + "%" }} /></span><span className="pc">{o[1]}%</span></div>
       ))}
      </div>
     </div>
    </div>

    <div className="intel-11" style={{ padding: "20px 24px 40px" }}>
     <div className="card pad" style={{ boxShadow: "var(--sh-1)" }}>
      <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{ar ? "التوزيع العمري للنطاق" : "Catchment age mix"}</div>
      <div className="muted" style={{ fontSize: 12.5 }}>{ar ? "الزوار النهاريون · يميل لسن العمل المهني" : "Daytime visitors · skews working-age professional"}</div>
      <div className="row gap24 wrap" style={{ marginTop: 18, alignItems: "center" }}>
       <div className="donut" style={{ width: 132, height: 132, background: `conic-gradient(${stops})` }}>
        <div className="hole"><span className="mono" style={{ fontSize: 18, fontWeight: 500 }}>62%</span><span style={{ fontSize: 10, color: "var(--slate)" }}>{ar ? "بعمر 25–44" : "aged 25–44"}</span></div>
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
       <div><div style={{ fontSize: 15, fontWeight: 700 }}>{ar ? "مزيج الجوار التجاري في النطاق" : "Co-tenancy mix in trade area"}</div><div className="muted" style={{ fontSize: 12.5 }}>{ar ? "مستأجرون موثّقون ضمن 10 دقائق قيادة" : "Verified occupiers within 10-min drive"}</div></div>
       <span className="muted2"><Icon.store size={18} /></span>
      </div>
      <div className="col gap14" style={{ marginTop: 18 }}>
       {mix.map((m, i) => (
        <div key={i} className="hrow"><span className="nm" style={{ width: 150 }}>{m[0]}</span><span className="hbar"><i style={{ width: m[1] + "%" }} /></span><span className="pc">{m[1]}%</span></div>
       ))}
      </div>
      <div className="row gap10" style={{ marginTop: 18, paddingTop: 14, borderTop: "1px solid var(--silver)" }}>
       <span style={{ color: "var(--harbor)" }}><Icon.check size={15} /></span>
       <span className="muted" style={{ fontSize: 12.5 }}>{ar ? "مزيج المستأجرين مستمد من عروض SAT الموثّقة (مباشرة). أرقام الحركة والمكوث والإنفاق هنا عينات تمثيلية، وشراكات البيانات السعودية المباشرة خلفها موضّحة أدناه." : "Occupier mix is drawn from verified SAT listings (live). Mobility, dwell and spend figures shown here are representative samples, the live Saudi data partnerships behind them are described below."}</span>
      </div>
     </div>
    </div>

    <div style={{ padding: "8px 24px 48px" }}>
     <div className="card pad" style={{ boxShadow: "var(--sh-1)" }}>
      <div className="eyebrow">{ar ? "كيف تبني SAT ذكاء الموقع" : "How SAT builds location intelligence"}</div>
      <h2 style={{ fontSize: 21, fontWeight: 700, letterSpacing: "-.02em", margin: "10px 0 6px" }}>{ar ? "مبني للمملكة العربية السعودية، لأن لا لوحة عالمية تغطيها" : "Built for Saudi Arabia, because no global panel covers it"}</h2>
      <p className="muted" style={{ fontSize: 13.5, lineHeight: 1.6, maxWidth: 720 }}>{ar ? "تتوقّف Placer.ai وPassBy وGini عند الولايات المتحدة وأوروبا. لاختيار مواقع موثوق على مستوى السوق في المملكة، تجمع SAT محلياً وتقيّم بشفافية، لتدافع عن كل قرار." : "Placer.ai, PassBy and Gini stop at the US and Europe. For reliable, market-wide site selection in the Kingdom, SAT sources locally and scores transparently, so you can defend every decision."}</p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: 12, marginTop: 18 }}>
       {(ar ? [["إشارات الجوال","بيانات GPS / واي فاي مجهّلة من شركاء الاتصالات السعوديين، زيارات ومكوث ونطاقات تجارية."],["سجلات وزارة العدل","سجلات الصفقات العقارية المنشورة تعاير معايير الأسعار مقابل صفقات حقيقية."],["بيانات الإنفاق","أنماط معاملات مجهّلة من بوابات الدفع تغذّي إمكانات الإيرادات."],["السجلات الحكومية","الهيئة العامة للإحصاء والهيئة العامة للعقار وإيجار للسكان والدخل ونشاط الإيجار والطلب."]] : [["Mobile signals","Anonymised GPS / Wi-Fi from Saudi telecom partners, visits, dwell, trade areas."],["Ministry of Justice records","Published real estate transaction records calibrate price benchmarks against real deals."],["Spend data","Anonymised transaction patterns from payment gateways feed revenue potential."],["Public records","GASTAT, REGA and Ejar for population, income, lease activity and demand."]]).map((d,i)=>(
        <div key={i} className="card pad" style={{ boxShadow: "none", background: "var(--cool)" }}>
         <div style={{ fontSize: 13.5, fontWeight: 700 }}>{d[0]}</div>
         <div className="muted" style={{ fontSize: 12, lineHeight: 1.5, marginTop: 4 }}>{d[1]}</div>
        </div>
       ))}
      </div>

      <div className="eyebrow" style={{ margin: "22px 0 10px" }}>{ar ? "تقييم شفّاف · خمس عدسات" : "Transparent score · five lenses"}</div>
      <div className="row gap8 wrap">
       {(ar ? ["حركة المشاة","ملاءمة الديموغرافيا","إمكانات السوق","المنافسة","الوضوح"] : ["Foot traffic","Demographics fit","Market potential","Competition","Visibility"]).map((l,i)=>(
        <span key={i} className="chip on" style={{ fontSize: 12 }}>{l}</span>
       ))}
      </div>
      <p className="muted" style={{ fontSize: 12.5, lineHeight: 1.55, margin: "12px 0 0", maxWidth: 720 }}>{ar ? "يُقيَّم كل موقع عبر هذه العدسات الخمس مع إظهار المنطق، لا رقم صندوق أسود أبداً. يعمل للمكاتب والتجزئة والاستخدام المختلط والمستودعات، لا التجزئة فقط." : "Each site is scored across these five lenses with the reasoning shown, never a black-box number. Works across offices, retail, mixed-use and warehouses, not just retail."}</p>

      <div className="row gap10" style={{ marginTop: 18, paddingTop: 14, borderTop: "1px solid var(--silver)", alignItems: "flex-start" }}>
       <span style={{ color: "var(--harbor)", marginTop: 1 }}><Icon.shield size={15} /></span>
       <span className="muted" style={{ fontSize: 12.5, lineHeight: 1.55 }}>{ar ? "متوافق مع نظام حماية البيانات: تُعامَل بيانات الموقع كبيانات حسّاسة، مجهّلة ومجمّعة، مستضافة داخل المملكة، ومسجّلة لدى سدايا. لا مستشعرات ميدانية ولا صور شخصية، أبداً." : "PDPL-native: location data is treated as sensitive, anonymised and aggregated, hosted in the Kingdom, registered with SDAIA. No on-site sensors and no personal images, ever."}</span>
      </div>
     </div>
    </div>
   </div>
  </div>
 );
}
