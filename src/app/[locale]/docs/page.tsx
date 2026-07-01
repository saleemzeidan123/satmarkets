import { isLocale } from "@/i18n/config";
import { notFound } from "next/navigation";
import { Icon } from "@/components/satkit";

export default function DocsPage({ params }: { params: { locale: string } }) {
 if (!isLocale(params.locale)) notFound();
 const ar = params.locale === "ar";
 const sheets: [string, boolean][] = [
  [ar ? "مخطط الدور · L18" : "Floor plate · L18", true], [ar ? "توزيع الأثاث" : "Furniture layout", false], [ar ? "قطاع A-A" : "Section A-A", false], [ar ? "الخدمات الكهروميكانيكية" : "MEP services", false],
 ];
 const rooms: [string, string, string, string, string][] = [
  [ar ? "مساحة عمل مفتوحة" : "Open workspace", "14%", "16%", "44%", "50%"],
  [ar ? "اجتماعات" : "Meeting", "60%", "16%", "26%", "24%"],
  [ar ? "مكتب تنفيذي" : "Exec office", "60%", "44%", "26%", "22%"],
  [ar ? "الاستقبال" : "Reception", "14%", "70%", "26%", "16%"],
  [ar ? "مطبخ" : "Pantry", "42%", "70%", "18%", "16%"],
  [ar ? "الخوادم" : "Server", "60%", "70%", "12%", "16%"],
 ];
 const details: [string, string][] = [
  [ar ? "العنوان" : "Title", ar ? "مخطط الدور · L18" : "Floor plate · L18"], [ar ? "المقياس" : "Scale", "1:100"], [ar ? "المساحة" : "Area", ar ? "320 م² صافية" : "320 m² NLA"],
  [ar ? "الصيغة" : "Format", "DWG + PDF"], [ar ? "آخر تحديث" : "Updated", ar ? "يناير 2026" : "Jan 2026"], [ar ? "موثّق بواسطة" : "Verified by", ar ? "مسح سات" : "SAT survey"],
 ];
 return (
  <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "var(--cool)" }}>
   {/* top bar */}
   <div className="row between wrap" style={{ padding: "13px 24px", borderBottom: "1px solid var(--silver)", background: "var(--paper)", gap: 12, flex: "none" }}>
    <div className="row gap12" style={{ alignItems: "center" }}>
     <span style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--cool)", display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ display: "inline-flex", transform: ar ? "none" : "rotate(180deg)" }}><Icon.chevr size={17} /></span></span>
     <div><div style={{ fontSize: 15, fontWeight: 700 }}>{ar ? "مكتب فئة A، برج العليا" : "Grade A Office, Olaya Tower"}</div><div className="mono muted" style={{ fontSize: 11 }}>{ar ? "المخططات والمستندات · 6 لوحات" : "Plans & documents · 6 sheets"}</div></div>
    </div>
    <div className="row gap8 wrap">
     <span className="ftype"><span className="ext">DWG</span> floor-plate-L18.dwg</span>
     <span className="btn secondary sm"><Icon.download size={14} /> {ar ? "تنزيل الكل" : "Download all"}</span>
     <span className="btn secondary sm"><Icon.arrow size={14} /> {ar ? "مشاركة" : "Share"}</span>
    </div>
   </div>

   <div className="row" style={{ flex: 1, alignItems: "stretch", minHeight: 0 }}>
    {/* sheet rail */}
    <div className="docs-rail-l" style={{ width: 188, flex: "none", borderRight: "1px solid var(--silver)", background: "var(--paper)", padding: 14, overflowY: "auto" }}>
     <div className="eyebrow" style={{ marginBottom: 12 }}>{ar ? "اللوحات" : "Sheets"}</div>
     <div className="col gap10">
      {sheets.map((s, i) => (
       <div key={i} className={"sheetthumb" + (s[1] ? " on" : "")}>
        <div className="mini">
         <div style={{ position: "absolute", inset: 8, border: "1.5px solid var(--slate-2)" }} />
         <div style={{ position: "absolute", left: 8, top: 8, width: "46%", height: "54%", border: "1px solid var(--silver-2)" }} />
         <div style={{ position: "absolute", right: 8, top: 8, width: "34%", height: "34%", border: "1px solid var(--silver-2)" }} />
        </div>
        <div className="row between" style={{ marginTop: 7 }}><span style={{ fontSize: 11, fontWeight: 600 }}>{s[0]}</span><span className="mono muted" style={{ fontSize: 9 }}>{i + 1}</span></div>
       </div>
      ))}
     </div>
    </div>

    {/* canvas */}
    <div className="viewer" style={{ flex: 1, position: "relative", minWidth: 0 }}>
     <div className="planpaper plan" style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)", width: 560, height: 420, maxWidth: "90%" }}>
      <div style={{ position: "absolute", inset: 18, border: "2.5px solid #1F262E" }} />
      {rooms.map((r, i) => (
       <div key={i} className="room" style={{ left: r[1], top: r[2], width: r[3], height: r[4] }}><span className="rl">{r[0]}</span></div>
      ))}
      <div className="dim" style={{ left: "50%", top: 4, transform: "translateX(-50%)" }}>{ar ? "24.0 م" : "24.0 m"}</div>
      <div className="dim" style={{ left: 4, top: "50%", transform: "translateY(-50%) rotate(-90deg)" }}>{ar ? "18.0 م" : "18.0 m"}</div>
      <div style={{ position: "absolute", right: 14, top: 14, display: "flex", flexDirection: "column", alignItems: "center", color: "var(--slate)" }}><span style={{ display: "inline-flex", transform: "rotate(-90deg)" }}><Icon.arrow size={16} /></span><span className="mono" style={{ fontSize: 9 }}>{ar ? "ش" : "N"}</span></div>
     </div>
     <div className="vtool" style={{ position: "absolute", right: 18, bottom: 18 }}>
      <span><Icon.search size={16} /></span><span>−</span><span className="on"><Icon.target size={15} /></span><span>+</span>
     </div>
     <div className="vtool" style={{ position: "absolute", left: 18, top: 18 }}>
      <span className="on" title={ar ? "تحريك" : "Pan"}><Icon.layers size={15} /></span><span title={ar ? "قياس" : "Measure"}><Icon.ruler size={15} /></span><span title={ar ? "ملء الشاشة" : "Fullscreen"}><Icon.grid size={15} /></span>
     </div>
     <div style={{ position: "absolute", left: 18, bottom: 18, display: "flex", alignItems: "flex-end", gap: 14 }}>
      <div className="scalebar"><span>{ar ? "0 إلى 5 م" : "0 to 5 m"}</span><span className="b" /></div>
      <span className="tag" style={{ background: "rgba(255,255,255,.9)" }}>100% · 1:100</span>
     </div>
    </div>

    {/* info rail */}
    <div className="docs-rail-r" style={{ width: 248, flex: "none", borderLeft: "1px solid var(--silver)", background: "var(--paper)", padding: 18, overflowY: "auto" }}>
     <div className="eyebrow" style={{ marginBottom: 12 }}>{ar ? "تفاصيل اللوحة" : "Sheet details"}</div>
     <div className="col gap10" style={{ fontSize: 12.5 }}>
      {details.map((r, i) => (
       <div key={i} className="row between" style={{ paddingBottom: 9, borderBottom: "1px solid var(--silver)" }}><span className="muted">{r[0]}</span><b style={{ fontWeight: 600 }}>{r[1]}</b></div>
      ))}
     </div>
     <div className="card pad" style={{ marginTop: 16, boxShadow: "none", background: "var(--cool)" }}>
      <div className="row gap8"><span style={{ color: "var(--azure-d)" }}><Icon.spark size={15} /></span><div><div style={{ fontSize: 12.5, fontWeight: 600 }}>{ar ? "قراءة الذكاء الاصطناعي للمخطط" : "AI read this plan"}</div><div className="muted" style={{ fontSize: 11.5, lineHeight: 1.5, marginTop: 4 }}>{ar ? "32 محطة عمل، غرفتا اجتماعات، مكتب تنفيذي واحد. كفاءة ~68%، ممتازة لتجهيز مقر رئيسي." : "32 workstations, 2 meeting rooms, 1 exec office. ~68% efficiency, strong for an HQ fit-out."}</div></div></div>
     </div>
     <div className="col gap8" style={{ marginTop: 16 }}>
      <span className="btn secondary sm" style={{ justifyContent: "center" }}><Icon.download size={14} /> {ar ? "تنزيل DWG" : "Download DWG"}</span>
      <span className="btn secondary sm" style={{ justifyContent: "center" }}><Icon.download size={14} /> {ar ? "تنزيل PDF" : "Download PDF"}</span>
     </div>
    </div>
   </div>
  </div>
 );
}
