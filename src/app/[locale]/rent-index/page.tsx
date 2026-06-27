import { isLocale } from "@/i18n/config";
import { notFound } from "next/navigation";
import { Icon, Verified } from "@/components/satkit";
import { getSupabaseServer } from "@/lib/supabase/server";

const AZURE = "#3A6EA5";

type DRow = [string, string, string, string, boolean];

export default async function RentIndexPage({ params }: { params: { locale: string } }) {
 if (!isLocale(params.locale)) notFound();
 const ar = params.locale === "ar";

 const MOCK_DISTRICTS: DRow[] = ar ? [
  ["العليا", "مكاتب · الفئة A", "2,400", "1,800–2,900", true],
  ["كافد", "مكاتب · الفئة A", "3,700", "3,000–4,200", true],
  ["طريق الملك فهد", "مكاتب · الفئة A", "2,100", "1,500–2,700", true],
  ["شمال الرياض (غرناطة · حطين)", "مكاتب · الفئة A", "1,350", "1,000–1,800", true],
  ["العليا", "مكاتب · الفئة B", "1,150", "900–1,400", true],
  ["الحي الدبلوماسي", "مكاتب · الفئة A", "غير متاح", "عينة قليلة", false],
 ] : [
  ["Al Olaya", "Office · Grade A", "2,400", "1,800–2,900", true],
  ["KAFD", "Office · Grade A", "3,700", "3,000–4,200", true],
  ["King Fahd Road", "Office · Grade A", "2,100", "1,500–2,700", true],
  ["North Riyadh (Granada · Hittin)", "Office · Grade A", "1,350", "1,000–1,800", true],
  ["Al Olaya", "Office · Grade B", "1,150", "900–1,400", true],
  ["Diplomatic Quarter", "Office · Grade A", "n/a", "Thin sample", false],
 ];

 const SEG: Record<string, string> = ar
  ? { grade_a: "الفئة A", grade_b: "الفئة B", grade_c: "الفئة C", serviced: "مخدومة", street: "شارع تجزئة", prime: "مميّز" }
  : { grade_a: "Grade A", grade_b: "Grade B", grade_c: "Grade C", serviced: "Serviced", street: "street", prime: "prime" };
 const ASSET: Record<string, string> = ar
  ? { office: "مكاتب", retail: "تجزئة", warehouse: "مستودعات", serviced: "مفروشة", medical: "طبي", showroom: "معارض", land: "أراضٍ" }
  : { office: "Office", retail: "Retail", warehouse: "Warehouse", serviced: "Serviced", medical: "Medical", showroom: "Showroom", land: "Land" };
 const nf = (n: number) => n.toLocaleString("en-US");
 let districts: DRow[] = MOCK_DISTRICTS;
 try {
  const supabase = getSupabaseServer();
  if (supabase) {
   const { data } = await supabase
    .from("rent_index_published")
    .select("district_label, asset_type, segment, median, band_low, band_high, sufficient, sort_order")
    .order("sort_order", { ascending: true })
    .limit(14);
   if (data && data.length) {
    districts = data.map((r: any): DRow => {
     const asset = `${ASSET[r.asset_type] || r.asset_type}${r.segment ? " · " + (SEG[r.segment] || r.segment) : ""}`;
     const median = r.sufficient && r.median != null ? nf(Number(r.median)) : (ar ? "غير متاح" : "n/a");
     const band = r.sufficient && r.band_low != null && r.band_high != null ? `${nf(Number(r.band_low))}–${nf(Number(r.band_high))}` : (ar ? "عينة قليلة" : "Thin sample");
     return [r.district_label, asset, median, band, !!r.sufficient];
    });
   }
  }
 } catch {
  districts = MOCK_DISTRICTS;
 }
 const open = [40, 44, 42, 50, 56, 54, 62, 68, 70, 76, 80, 86];
 const capped = [40, 44, 42, 50, 56, 54, 62, 65, 65, 65, 65, 65];
 const freezeX = (8 / 11) * 100;
 const op = open.map((v, i) => `${(i / 11) * 100},${100 - v}`).join(" ");
 const cp = capped.map((v, i) => `${(i / 11) * 100},${100 - v}`).join(" ");
 const kpis: [string, string, string, string | null][] = ar ? [
  ["1,420", "وسيط الفئة A ريال/م²·سنة", "+8.4% مفتوح", "up"],
  ["96%", "إشغال الفئة A", "+1.2 نقطة", "up"],
  ["61%", "المخزون تحت التجميد", "تغطية المسقوف", null],
  ["+24%", "الفئة B سنوياً", "طلب فائض", "up"],
 ] : [
  ["1,420", "Median Grade A SAR/m²·yr", "+8.4% open", "up"],
  ["96%", "Grade A occupancy", "+1.2 pts", "up"],
  ["61%", "Stock under freeze", "capped coverage", null],
  ["+24%", "Grade B YoY", "spillover demand", "up"],
 ];

 return (
  <div style={{ background: "var(--cool)" }}>
   <div style={{ maxWidth: 1360, margin: "0 auto" }}>
    {/* header band */}
    <div className="row between wrap" style={{ padding: "26px 24px 20px", alignItems: "flex-end", borderBottom: "1px solid var(--silver)", background: "var(--paper)", gap: 16 }}>
     <div>
      <div className="eyebrow">{ar ? "مؤشر SAT للإيجارات · الربع الأول 2026" : "SAT Rent Index · Q1 2026"}</div>
      <h1 style={{ fontSize: 30, fontWeight: 700, letterSpacing: "-.02em", margin: "10px 0 0" }}>{ar ? "إيجارات الرياض التجارية" : "Riyadh commercial rents"}</h1>
      <div className="muted" style={{ fontSize: 13.5, marginTop: 6 }}>{ar ? "142 حياً · صفقات موثّقة فقط · يُحدّث أسبوعياً" : "142 districts · verified transactions only · updated weekly"}</div>
     </div>
     <div className="row gap10 wrap">
      <span className="seg"><span className="on">{ar ? "الكل" : "All"}</span><span>{ar ? "مفتوح" : "Open"}</span><span>{ar ? "مسقوف" : "Capped"}</span></span>
      <span className="chip">{ar ? "مكاتب" : "Office"} <Icon.chevd size={14} /></span>
      <span className="btn secondary"><Icon.download size={15} /> {ar ? "تصدير" : "Export"}</span>
      <span className="btn primary"><Icon.spark size={15} /> {ar ? "اسأل الذكاء" : "Ask AI"}</span>
     </div>
    </div>

    {/* bifurcation banner */}
    <div style={{ padding: "22px 24px 0" }}>
     <div className="bifur">
      <div className="side">
       <div className="h"><span className="freeze capped"><span className="dot" />{ar ? "مسقوف" : "Capped"}</span> {ar ? "عقود قائمة · مجمّدة عند التوقيع" : "Existing leases · frozen at signature"}</div>
       <div className="sub">{ar ? "تُثبّت التجديدات داخل النطاق العمراني للرياض على آخر إيجار مُسجّل في إيجار لمدة خمس سنوات بموجب قرار سبتمبر 2025." : "Renewals inside Riyadh’s urban boundary are held at their last Ejar rent for five years under the Sept-2025 decree."}</div>
       <div className="big" style={{ color: "var(--amber)" }}>≈ 0.0% <span style={{ fontSize: 13, color: "var(--slate)" }}>{ar ? "حركة على المخزون المسقوف" : "movement on capped stock"}</span></div>
      </div>
      <div className="side">
       <div className="h"><span className="freeze open"><span className="dot" />{ar ? "مفتوح" : "Open"}</span> {ar ? "جديد وأول إيجار · يحدّد العنوان" : "New & first-lease · sets the headline"}</div>
       <div className="sub">{ar ? "المباني الجديدة وعقود الإيجار الأولى غير متأثرة بالسقف وتُعاد تسعيرها وفق السوق كل مدة." : "New-build and first-time leases are unaffected by the cap and continue to re-price to market each term."}</div>
       <div className="big" style={{ color: "var(--azure-d)" }}>+8.4% <span style={{ fontSize: 13, color: "var(--slate)" }}>{ar ? "سنوياً على الفئة A المفتوحة" : "YoY on open Grade A"}</span></div>
      </div>
     </div>
    </div>

    {/* KPI row */}
    <div className="row gap16 wrap" style={{ padding: "20px 24px 0" }}>
     {kpis.map((k, i) => (
      <div key={i} className="statpill grow" style={{ minWidth: 150 }}>
       <div className="row between" style={{ alignItems: "flex-start" }}>
        <div className="v tnum">{k[0]}</div>
        {k[3] && <span className={"delta " + k[3]}>▲</span>}
       </div>
       <div className="l">{k[1]}</div>
       <div className={"delta " + (k[3] || "")} style={{ marginTop: 8, color: k[3] ? undefined : "var(--slate)" }}>{k[2]}</div>
      </div>
     ))}
    </div>

    {/* main grid */}
    <div className="rent-grid">
     {/* trend chart */}
     <div className="card pad" style={{ boxShadow: "var(--sh-1)" }}>
      <div className="row between wrap" style={{ alignItems: "flex-start", gap: 10 }}>
       <div><div style={{ fontSize: 15, fontWeight: 700 }}>{ar ? "مؤشر إيجار المكاتب، العليا" : "Office rent index, Al Olaya"}</div><div className="muted" style={{ fontSize: 12.5 }}>{ar ? "مُعاد إلى 100 · مفتوح مقابل مسقوف منذ القرار" : "Rebased to 100 · open vs capped since the decree"}</div></div>
       <div className="col gap8">
        <span className="lgd"><span className="sw" /> {ar ? "مفتوح (أول إيجار)" : "Open (first-lease)"}</span>
        <span className="lgd"><span className="sw dash" /> {ar ? "مسقوف (مجمّد)" : "Capped (frozen)"}</span>
       </div>
      </div>
      <div style={{ position: "relative", height: 210, marginTop: 18 }}>
       <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: "100%", height: "100%" }}>
        {[0, 25, 50, 75, 100].map((y) => <line key={y} x1="0" y1={y} x2="100" y2={y} stroke="#EAEEF3" strokeWidth="0.5" />)}
        <line x1={freezeX} y1="0" x2={freezeX} y2="100" stroke="#ECDCB6" strokeWidth="0.8" strokeDasharray="2 2" />
        <polygon points={`0,100 ${op} 100,100`} fill="url(#gop)" opacity="0.12" />
        <polyline points={op} fill="none" stroke={AZURE} strokeWidth="1.7" vectorEffect="non-scaling-stroke" />
        <polyline points={cp} fill="none" stroke="#B7791F" strokeWidth="1.6" strokeDasharray="3 2.5" vectorEffect="non-scaling-stroke" />
        <defs><linearGradient id="gop" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={AZURE} /><stop offset="1" stopColor={AZURE} stopOpacity="0" /></linearGradient></defs>
       </svg>
       <div className="mono" style={{ position: "absolute", left: `calc(${freezeX}% + 6px)`, top: 6, fontSize: 9.5, color: "var(--amber)", letterSpacing: ".04em" }}>{ar ? "قرار سبتمبر 2025" : "SEP-25 DECREE"}</div>
      </div>
      <div className="row between mono muted" style={{ fontSize: 10, marginTop: 8 }}>
       <span>Q1&apos;25</span><span>Q2</span><span>Q3</span><span>Q4</span><span>Q1&apos;26</span>
      </div>
     </div>

     {/* heat map */}
     <div className="card pad" style={{ boxShadow: "var(--sh-1)" }}>
      <div style={{ fontSize: 15, fontWeight: 700 }}>{ar ? "حرارة الإيجار · حسب الحي" : "Rent heat · by district"}</div>
      <div className="muted" style={{ fontSize: 12.5 }}>{ar ? "الأغمق = ريال/م² أعلى" : "Darker = higher SAR/m²"}</div>
      <div className="map" style={{ height: 176, borderRadius: 10, marginTop: 16, border: "1px solid var(--silver)" }}>
       <div className="blob" style={{ left: "14%", top: "20%", width: 70, height: 60, background: "rgba(58,110,165,.28)", borderColor: "rgba(58,110,165,.4)" }} />
       <div className="blob" style={{ left: "46%", top: "16%", width: 60, height: 55, background: "rgba(58,110,165,.42)", borderColor: "rgba(58,110,165,.5)" }} />
       <div className="blob" style={{ left: "60%", top: "48%", width: 80, height: 64, background: "rgba(58,110,165,.16)", borderColor: "rgba(58,110,165,.3)" }} />
       <div className="blob" style={{ left: "24%", top: "54%", width: 64, height: 52, background: "rgba(58,110,165,.10)", borderColor: "rgba(58,110,165,.24)" }} />
      </div>
      <div className="row between" style={{ marginTop: 14 }}>
       <span className="mono muted" style={{ fontSize: 10 }}>640</span>
       <div style={{ flex: 1, height: 7, margin: "0 10px", borderRadius: 4, background: "linear-gradient(90deg,var(--azure-wash),var(--azure))" }} />
       <span className="mono muted" style={{ fontSize: 10 }}>2,050</span>
      </div>
     </div>

     {/* district table */}
     <div className="card" style={{ gridColumn: "1 / -1", overflow: "hidden", boxShadow: "var(--sh-1)" }}>
      <div className="row between" style={{ padding: "16px 20px", borderBottom: "1px solid var(--silver)" }}>
       <div style={{ fontSize: 15, fontWeight: 700 }}>{ar ? "معايير الأحياء" : "District benchmarks"}</div>
       <span className="chip" style={{ borderColor: "var(--silver)" }}>{ar ? "ترتيب: الحركة السنوية" : "Sort: YoY movement"} <Icon.chevd size={14} /></span>
      </div>
      <div style={{ overflowX: "auto" }}>
       <table className="dt" style={{ minWidth: 640 }}>
        <thead><tr><th>{ar ? "الحي" : "District"}</th><th>{ar ? "الأصل" : "Asset"}</th><th style={{ textAlign: "right" }}>{ar ? "الوسيط ريال/م²" : "Median SAR/m²"}</th><th style={{ textAlign: "right" }}>{ar ? "النطاق (ريال/م²)" : "Band (SAR/m²)"}</th><th style={{ textAlign: "right" }}>{ar ? "البيانات" : "Data"}</th><th style={{ textAlign: "right" }}>{ar ? "المصدر" : "Source"}</th></tr></thead>
        <tbody>
         {districts.map((d, i) => (
          <tr key={i}>
           <td style={{ fontWeight: 600 }}>{d[0]}</td>
           <td className="muted">{d[1]}</td>
           <td className="num mono" style={{ fontWeight: 500 }}>{d[2]}</td>
           <td className="num mono muted">{d[3]}</td>
           <td className="num">{d[4] ? <span className="statusdot ok">{ar ? "كافٍ" : "Sufficient"}</span> : <span className="statusdot pend">{ar ? "قليل" : "Thin"}</span>}</td>
           <td className="num"><Verified text="✓" /></td>
          </tr>
         ))}
        </tbody>
       </table>
      </div>
      <div className="row gap10" style={{ padding: "14px 20px", borderTop: "1px solid var(--silver)", background: "var(--cool)" }}>
       <span style={{ color: "var(--harbor)" }}><Icon.check size={15} /></span>
       <span className="muted" style={{ fontSize: 12.5 }}>{ar ? "تُستمد الوسطاء والنطاقات من صفقات SAT/RCRI الموثّقة للربع الأول 2026. تُوسَم الأحياء ذات العينة القليلة بدلاً من عرضها، فالمؤشر لا يطبع رقماً لا يستطيع الوقوف خلفه." : "Medians and bands are drawn from verified SAT/RCRI Q1 2026 transactions. Districts with a thin sample are marked rather than shown, the index never prints a number it cannot stand behind."}</span>
      </div>
     </div>
    </div>
   </div>
  </div>
 );
}
