"use client";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Icon, Logo } from "@/components/satkit";
import { assetLabel } from "@/lib/labels";
import { useAdvisorChat } from "@/lib/useAdvisorChat";

type SegRow = { district_label: string; district_label_ar: string | null; asset_type: string; segment: string; band_low: string; band_high: string; median: string; unit: string; period: string; source: string };

const SEG_LABEL: Record<string, [string, string]> = {
 "office|grade_a": ["Office · Grade A", "مكاتب · الفئة A"],
 "office|grade_b": ["Office · Grade B", "مكاتب · الفئة B"],
 "retail|street_front": ["Retail · street front", "تجزئة · واجهة شارع"],
 "retail|mall_inline": ["Retail · mall inline", "تجزئة · داخل مول"],
 "warehouse|modern": ["Warehouse · modern", "مستودعات · حديثة"],
 "warehouse|older": ["Warehouse · older", "مستودعات · قديمة"],
 "medical|clinic": ["Clinic", "عيادات"],
 "serviced|serviced": ["Serviced office", "مكاتب مخدومة"],
 "land|ground_lease": ["Land · ground lease", "أراضٍ · إيجار أرض"],
 "showroom|listing": ["Showroom", "معارض"],
 "education|school": ["Education · school", "تعليم · مدارس"],
 "hospitality|hotel": ["Hospitality · hotel", "ضيافة · فنادق"],
 "mixed_use|blended": ["Mixed use · blended", "متعدد الاستخدامات · مدمج"],
};
const UNIT_LABEL: Record<string, [string, string]> = {
 sar_sqm_year: ["SAR/m²·yr", "ريال/م²·سنة"],
 sar_desk_month: ["SAR/desk·month", "ريال/مكتب·شهر"],
};
const XIcon = ({ size = 16 }: { size?: number }) => (
 <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
);

export default function AdvisorPage({ params }: { params: { locale: string } }) {
 const locale = (params.locale === "ar" ? "ar" : "en") as "en"|"ar";
 const ar = locale === "ar";
 const { msgs, setMsgs, busy, send, reset } = useAdvisorChat(locale, "sat_advisor_page");
 const [input, setInput] = useState("");
 const [tool, setTool] = useState<null | "value">(null);
 const [segs, setSegs] = useState<SegRow[] | null>(null);
 const [segKey, setSegKey] = useState("office|grade_a");
 const [segLoc, setSegLoc] = useState("");
 const [rent, setRent] = useState("");
 const [size, setSize] = useState("");
 const scrollRef = useRef<HTMLDivElement>(null);
 const inputRef = useRef<HTMLInputElement>(null);

 useEffect(() => {
  if (tool !== "value" || segs) return;
  fetch("/api/index/segments").then((r) => r.json()).then((d) => setSegs(d.segments || [])).catch(() => setSegs([]));
 }, [tool, segs]);

 const JOBS = ar ? [
  { icon: <Icon.search size={18} />, label: "ابحث عن مساحة", sub: "صِف ما تحتاجه بكلماتك وسأبحث في العروض الموثّقة", prefill: "مكتب فئة A مجهّز في غرناطة، نحو 300 م²، بأقل من 1,600 ريال/م²", tool: null },
  { icon: <Icon.spark size={18} />, label: "اكتب إعلاناً", sub: "أعطني تفاصيل مساحتك وأكتب الإعلان كاملاً", prefill: "اكتب إعلاناً لمساحتي: [النوع]، [الموقع]، [المساحة] م²، [مجهّزة أو هيكل]", tool: null },
  { icon: <Icon.chart size={18} />, label: "حلّل صفقة أو عقد إيجار", sub: "أدخل أرقام صفقتك وأقيسها على النطاقات المنشورة", prefill: "", tool: "value" as const },
  { icon: <Icon.target size={18} />, label: "راقب السوق", sub: "تنبيه دائم عند تحرّك المؤشر", prefill: "نبّهني عندما تتحرك إيجارات المكاتب في [الموقع] أكثر من 3%", tool: null },
 ] : [
  { icon: <Icon.search size={18} />, label: "Find a space", sub: "Describe what you need in your own words, I search verified stock", prefill: "Fitted Grade A office in Granada, around 300 m², under 1,600 SAR/m²", tool: null },
  { icon: <Icon.spark size={18} />, label: "Draft a listing", sub: "Give me your space's details and I write the whole listing", prefill: "Draft a listing for my space: [type], [location], [size] m², [fitted or shell]", tool: null },
  { icon: <Icon.chart size={18} />, label: "Analyse a deal or lease", sub: "Enter your deal's numbers, I grade them against the published bands", prefill: "", tool: "value" as const },
  { icon: <Icon.target size={18} />, label: "Watch the market", sub: "A standing alert when the index moves", prefill: "Alert me when office rents in [location] move more than 3%", tool: null },
 ];

 const CHIPS = ar
  ? ["سعّر مكتب فئة A في العليا", "ما النطاق المنشور في كافد؟", "هل 1,600 ريال/م² عادل لمكاتب غرناطة؟", "راقب مكاتب كافد فئة A"]
  : ["Price a Grade A office in Al Olaya", "What's within band in KAFD?", "Is 1,600 SAR/m² fair for Granada offices?", "Watch KAFD Grade A offices"];

 useEffect(() => { scrollRef.current?.scrollTo({ top: 9e9, behavior: "smooth" }); }, [msgs, busy, tool]);

 function pickJob(j: (typeof JOBS)[number]) {
  if (j.tool === "value") { setTool("value"); return; }
  setTool(null);
  setInput(j.prefill);
  inputRef.current?.focus();
 }

 const segOptions = segs ? Array.from(new Set(segs.map((s) => `${s.asset_type}|${s.segment}`))) : [];
 const locOptions = segs ? segs.filter((s) => `${s.asset_type}|${s.segment}` === segKey) : [];
 const activeRow = locOptions.find((s) => s.district_label === segLoc) || locOptions[0] || null;

 function analyse() {
  if (!activeRow) return;
  const r = parseFloat(rent.replace(/[,\s]/g, ""));
  if (!isFinite(r) || r <= 0) return;
  const lo = Number(activeRow.band_low), hi = Number(activeRow.band_high), med = Number(activeRow.median);
  const segL = SEG_LABEL[segKey] ? SEG_LABEL[segKey][ar ? 1 : 0] : segKey;
  const unitL = UNIT_LABEL[activeRow.unit] ? UNIT_LABEL[activeRow.unit][ar ? 1 : 0] : activeRow.unit;
  const locL = ar ? (activeRow.district_label_ar || activeRow.district_label) : activeRow.district_label;
  const dm = Math.round(Math.abs(((r - med) / med) * 100));
  const v = r < lo ? "below" : r > hi ? "above" : "within";
  const sz = parseFloat(size.replace(/[,\s]/g, ""));
  const annual = isFinite(sz) && sz > 0 && activeRow.unit === "sar_sqm_year" ? Math.round(r * sz) : null;
  const fmt = (n: number) => n.toLocaleString("en-US");
  let text: string;
  if (ar) {
   const vAr = v === "within" ? "يقع ضمن النطاق المنشور" : v === "below" ? "يقع تحت النطاق المنشور" : "يقع فوق النطاق المنشور";
   const dAr = r === med ? "عند الوسيط تماماً" : r < med ? `أقل من الوسيط بنحو ${dm}%` : `أعلى من الوسيط بنحو ${dm}%`;
   text = `فحص الصفقة: ${segL}، ${locL}، عند ${fmt(r)} ${unitL}. ${vAr} (${fmt(lo)} إلى ${fmt(hi)}، الوسيط ${fmt(med)})، ${dAr}.` +
    (annual ? ` عند ${fmt(sz)} م² يعادل نحو ${fmt(annual)} ريال سنوياً.` : "") +
    ` ${activeRow.period === "Q1 2026" ? "الربع الأول 2026" : activeRow.period}، معايير سوق منشورة منسوبة إلى مصادرها (JLL وCBRE ونايت فرانك ونظراؤها). استرشادي وليس نصيحة.`;
  } else {
   const vEn = v === "within" ? "sits within the published band" : v === "below" ? "sits below the published band" : "sits above the published band";
   const dEn = r === med ? "exactly at the median" : r < med ? `about ${dm}% below the median` : `about ${dm}% above the median`;
   text = `Deal check: ${segL}, ${locL}, at ${fmt(r)} ${unitL}. That ${vEn} (${fmt(lo)} to ${fmt(hi)}, median ${fmt(med)}), ${dEn}.` +
    (annual ? ` At ${fmt(sz)} m² that is about ${fmt(annual)} SAR a year.` : "") +
    ` ${activeRow.period}, published market benchmarks attributed to source (JLL, CBRE, Knight Frank and peers). Indicative, not advice.`;
  }
  setMsgs((m) => [...m, { role: "a", text }]);
 }

 const started = msgs.length > 0;

 return (
  <div className="dash">
   <aside className="dside advisor-rail-l" style={{ background: "var(--paper)", color: "var(--ink)", borderRight: "1px solid var(--silver)" }}>
    <div className="brand" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
     <Link href={`/${locale}`} aria-label="Home"><Logo size={26} /></Link>
     <button className="btn primary sm" onClick={() => { reset(); setTool(null); }}><Icon.plus size={14} /> {ar ? "جديد" : "New"}</button>
    </div>
    <div className="dnav" style={{ gap: 4, marginTop: 10 }}>
     <div className="eyebrow" style={{ padding: "4px 12px" }}>{ar ? "ما يمكنني فعله" : "What I can do"}</div>
     {JOBS.map((j, i) => (
      <button key={i} onClick={() => pickJob(j)} style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 2, color: "var(--ink)", background: "transparent", border: "none", textAlign: ar ? "right" : "left", padding: "9px 12px", borderRadius: 9, cursor: "pointer", width: "100%" }}>
       <span style={{ fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 7 }}><span style={{ color: "var(--harbor)" }}>{j.icon}</span>{j.label}</span>
       <span className="mono" style={{ fontSize: 10, color: "var(--slate-2)" }}>{j.sub}</span>
      </button>
     ))}
    </div>
   </aside>

   <div className="dmain" style={{ display: "flex", flexDirection: "column" }}>
    <div className="dtopbar" style={{ gap: 10 }}>
     <Link href={`/${locale}`} aria-label={ar ? "العودة إلى الرئيسية" : "Back to home"} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 34, height: 34, borderRadius: 9, border: "1px solid var(--silver)", color: "var(--ink)", background: "#fff", flex: "none", textDecoration: "none" }}><span style={{ display: "inline-flex", transform: ar ? undefined : "scaleX(-1)" }}><Icon.arrow size={16} /></span></Link>
     <span style={{ color: "var(--harbor)" }}><Icon.spark size={20} /></span>
     <div style={{ minWidth: 0 }}><h1>{ar ? "مستشار SAT" : "SAT Advisor"}</h1><div className="sub adv-desk">{ar ? "دليلك للمساحات التجارية في الرياض. اسأل بكلماتك، وأجيب من بيانات موثّقة." : "Your guide to Riyadh commercial space. Ask in your own words, I answer from verified data."}</div></div>
     <span style={{ flex: 1 }} />
     <button className="btn ghost sm adv-mob" onClick={() => { reset(); setTool(null); }} style={{ flex: "none" }}><Icon.plus size={14} /> {ar ? "جديد" : "New"}</button>
     <span className="tag adv-desk">{ar ? "تجريبي" : "Beta"}</span>
    </div>

    <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: "26px 24px", background: "var(--cool)" }}>
     <div style={{ maxWidth: 760, margin: "0 auto" }} className="col gap18">
      {!started && tool !== "value" && (
       <div>
        <div className="eyebrow">{ar ? "أهلاً بك" : "Welcome"}</div>
        <h2 style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-.02em", margin: "8px 0 4px" }}>{ar ? "كيف أساعدك اليوم؟" : "How can I help you today?"}</h2>
        <p className="muted" style={{ fontSize: 14, margin: "0 0 18px" }}>{ar ? "اختر مهمة أو اكتب سؤالك ببساطة أدناه. لا حاجة لصيغة معيّنة." : "Pick a job below, or simply type your question. No special format needed."}</p>
        <div className="adv-jobs-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
         {JOBS.map((j, i) => (
          <button key={i} onClick={() => pickJob(j)} className="card pad lift" style={{ textAlign: ar ? "right" : "left", cursor: "pointer", border: "1px solid var(--silver)", background: "#fff" }}>
           <span style={{ color: "var(--harbor)", display: "inline-flex", width: 34, height: 34, borderRadius: 9, background: "var(--azure-wash)", alignItems: "center", justifyContent: "center" }}>{j.icon}</span>
           <div style={{ fontSize: 15, fontWeight: 700, margin: "12px 0 3px" }}>{j.label}</div>
           <div className="muted" style={{ fontSize: 12.5, lineHeight: 1.5 }}>{j.sub}</div>
          </button>
         ))}
        </div>
       </div>
      )}

      {msgs.map((m, i) => m.role === "u" ? (
       <div key={i} className="chatmsg u" style={{ alignSelf: "flex-end" }}>{m.text}</div>
      ) : (
       <div key={i} className="chatmsg a">
        <div className="row gap8" style={{ marginBottom: m.results?.length ? 10 : 0 }}><span style={{ color: "var(--harbor)" }}><Icon.spark size={16} /></span><span style={{ fontWeight: 500 }}>{m.text}</span></div>
        {m.results && m.results.length > 0 && (
         <div className="col gap10">
          {m.results.slice(0, 4).map((l) => {
           const title = (locale === "ar" ? l.title_ar : l.title_en) || l.reference_code;
           const dn = l.districts ? (locale === "ar" ? l.districts.name_ar : l.districts.name_en) : "";
           const price = l.asking_rent_sqm ?? l.sale_price ?? 0;
           return (
            <Link key={l.id} href={`/${locale}/listings/${l.id}`} className="row gap12" style={{ background: "#fff", border: "1px solid var(--silver)", borderRadius: 11, padding: 10, textDecoration: "none", color: "inherit" }}>
             <span style={{ width: 42, height: 42, borderRadius: 8, flex: "none", background: "var(--azure-wash)", color: "var(--azure-d)", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon.pin size={17} /></span>
             <div style={{ flex: 1 }}><div style={{ fontSize: 13.5, fontWeight: 600 }}>{title}</div><div className="mono muted" style={{ fontSize: 11, marginTop: 3 }}>{assetLabel(l.asset_type, locale)} · {l.area_sqm} m²{dn ? " · " + dn : ""}</div></div>
             <div style={{ textAlign: ar ? "left" : "right" }}><div className="mono" style={{ fontSize: 15, fontWeight: 500 }}>{price ? price.toLocaleString("en-US") : (ar ? "غير متاح" : "n/a")}</div><div className="muted" style={{ fontSize: 10.5 }}>{l.asking_rent_sqm ? (ar ? "ريال/م²·سنة" : "SAR/m²·yr") : (ar ? "ريال" : "SAR")}</div></div>
            </Link>
           );
          })}
          {m.note && <div className="src">{m.note}</div>}
         </div>
        )}
       </div>
      ))}

      {tool === "value" && (
       <div className="chatmsg a" style={{ maxWidth: 640 }}>
        <div className="row gap8" style={{ marginBottom: 12 }}><span style={{ color: "var(--harbor)" }}><Icon.chart size={16} /></span><span style={{ fontWeight: 600 }}>{ar ? "محلّل الصفقات والإيجارات" : "Deal and lease analyser"}</span>
         <span style={{ flex: 1 }} />
         <button onClick={() => setTool(null)} aria-label={ar ? "إغلاق المحلّل" : "Close analyser"} style={{ border: "none", background: "transparent", cursor: "pointer", color: "var(--slate)", display: "inline-flex", padding: 2 }}><XIcon size={15} /></button>
        </div>
        {!segs && <div className="muted" style={{ fontSize: 13 }}>{ar ? "أحمّل النطاقات المنشورة…" : "Loading the published bands…"}</div>}
        {segs && segs.length === 0 && <div className="muted" style={{ fontSize: 13 }}>{ar ? "لا تتوفر نطاقات منشورة الآن." : "No published bands available right now."}</div>}
        {segs && segs.length > 0 && (
         <div className="col gap10">
          <label className="col gap4" style={{ fontSize: 12.5, fontWeight: 600 }}>{ar ? "نوع المساحة" : "Space type"}
           <select className="input" value={segKey} onChange={(e) => { setSegKey(e.target.value); setSegLoc(""); }} style={{ fontFamily: "var(--sans)" }}>
            {segOptions.map((k) => <option key={k} value={k}>{SEG_LABEL[k] ? SEG_LABEL[k][ar ? 1 : 0] : k}</option>)}
           </select>
          </label>
          <label className="col gap4" style={{ fontSize: 12.5, fontWeight: 600 }}>{ar ? "الموقع (بنطاق منشور)" : "Location (with a published band)"}
           <select className="input" value={activeRow ? activeRow.district_label : ""} onChange={(e) => setSegLoc(e.target.value)} style={{ fontFamily: "var(--sans)" }}>
            {locOptions.map((s) => <option key={s.district_label} value={s.district_label}>{ar ? (s.district_label_ar || s.district_label) : s.district_label}</option>)}
           </select>
          </label>
          <div className="row gap10 wrap">
           <label className="col gap4 grow" style={{ fontSize: 12.5, fontWeight: 600, minWidth: 150 }}>{(ar ? "السعر المعروض " : "Quoted rate ") + (activeRow && UNIT_LABEL[activeRow.unit] ? UNIT_LABEL[activeRow.unit][ar ? 1 : 0] : "")}
            <input className="input" inputMode="decimal" value={rent} onChange={(e) => setRent(e.target.value)} placeholder={activeRow ? Number(activeRow.median).toLocaleString("en-US") : ""} />
           </label>
           <label className="col gap4 grow" style={{ fontSize: 12.5, fontWeight: 600, minWidth: 130 }}>{ar ? "المساحة م² (اختياري)" : "Size m² (optional)"}
            <input className="input" inputMode="decimal" value={size} onChange={(e) => setSize(e.target.value)} placeholder="300" />
           </label>
          </div>
          {activeRow && <div className="mono muted" style={{ fontSize: 11 }}>{ar ? `النطاق المنشور: ${Number(activeRow.band_low).toLocaleString("en-US")} إلى ${Number(activeRow.band_high).toLocaleString("en-US")} · الوسيط ${Number(activeRow.median).toLocaleString("en-US")} · ${activeRow.period === "Q1 2026" ? "الربع الأول 2026" : activeRow.period}` : `Published band: ${Number(activeRow.band_low).toLocaleString("en-US")} to ${Number(activeRow.band_high).toLocaleString("en-US")} · median ${Number(activeRow.median).toLocaleString("en-US")} · ${activeRow.period}`}</div>}
          <div className="row gap8">
           <button className="btn primary sm" onClick={analyse} disabled={!activeRow || !rent.trim()}>{ar ? "حلّل" : "Analyse"}</button>
          </div>
          <div className="muted" style={{ fontSize: 11 }}>{ar ? "أقيس أرقامك على النطاقات المنشورة المنسوبة إلى مصادرها فقط. المؤشر يقيّم الأسعار لا الأشخاص. استرشادي وليس نصيحة." : "I grade your numbers against published, attributed bands only. The index grades prices, never people. Indicative, not advice."}</div>
         </div>
        )}
       </div>
      )}

      {busy && (
       <div className="chatmsg a"><div className="row gap8"><span style={{ color: "var(--harbor)" }}><Icon.spark size={16} /></span><span className="muted">{ar ? "أبحث في المؤشر الموثّق…" : "Searching the verified index…"}</span></div></div>
      )}
     </div>
    </div>

    <div style={{ padding: "14px 24px 20px", background: "var(--paper)", borderTop: "1px solid var(--silver)" }}>
     <div style={{ maxWidth: 760, margin: "0 auto" }}>
      {!busy && (
       <div style={{ marginBottom: 10 }}>
        <div className="muted" style={{ fontSize: 11, margin: "0 2px 7px" }}>{started ? (ar ? "تابع الاستكشاف" : "Keep exploring") : (ar ? "جرّب أن تسأل" : "Try asking")}</div>
        <div className="row gap8 wrap">
         {CHIPS.map((p, i) => <button key={i} className="chip" style={{ cursor: "pointer", border: "1px solid var(--silver)", background: "#fff" }} onClick={() => { setTool(null); send(p); }}>{p}</button>)}
        </div>
       </div>
      )}
      <form onSubmit={(e) => { e.preventDefault(); const t = input; setInput(""); send(t); }} className="search focus" style={{ boxShadow: "0 4px 16px rgba(20,24,27,.06)", border: "1px solid var(--azure)", borderRadius: 999, padding: "8px 10px 8px 18px", display: "flex", alignItems: "center", gap: 8 }}>
       <span style={{ color: "var(--harbor)" }}><Icon.spark size={18} /></span>
       <input ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} placeholder={ar ? "اسأل عن الإيجارات، ابحث عن مساحة، حلّل عقداً…" : "Ask about rents, find a space, analyse a lease…"} style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontSize: 14, color: "var(--ink)", textAlign: ar ? "right" : "left" }} />
       <button type="submit" className="btn primary sm" disabled={busy} aria-label={ar ? "إرسال" : "Send"}><Icon.send size={15} /></button>
      </form>
      <p className="muted" style={{ fontSize: 11, margin: "8px 2px 0" }}>{ar ? "مبنيٌّ على مؤشر الإيجارات والعروض الموثّقة. مستشار SAT يشرح البيانات ولا يختلقها." : "Grounded in the Rent Index and verified listings. SAT Advisor explains the data, it doesn't invent it."}</p>
     </div>
    </div>
   </div>

   <aside className="advisor-rail-r" style={{ background: "var(--paper)", borderLeft: "1px solid var(--silver)", overflowY: "auto" }}>
    <div style={{ padding: "18px 20px", borderBottom: "1px solid var(--silver)" }}><div className="eyebrow">{ar ? "لمحة السوق · بيانات عيّنة" : "Market snapshot · sample data"}</div></div>
    <div style={{ padding: 20 }} className="col gap16">
     <div className="row gap16"><div className="kpi"><span className="v tnum" style={{ fontSize: 20 }}>2,370</span><span className="l">{ar ? "وسيط الفئة A (منشور)" : "Median Grade A (published)"}</span></div><div className="kpi"><span className="v tnum" style={{ fontSize: 20, color: "var(--green)" }}>+2.1%</span><span className="l">{ar ? "سنوياً · الفئة A" : "YoY · Grade A"}</span></div></div>
     <div className="row gap16"><div className="kpi"><span className="v tnum" style={{ fontSize: 20 }}>97.7%</span><span className="l">{ar ? "إشغال الفئة A" : "Grade A occupancy"}</span></div><div className="kpi"><span className="v tnum" style={{ fontSize: 20 }}>412k</span><span className="l">{ar ? "النطاق النهاري" : "Daytime catchment"}</span></div></div>
     <div className="card pad" style={{ boxShadow: "none", background: "var(--cool)" }}>
      <div className="eyebrow">{ar ? "المصادر المستخدمة" : "Sources used"}</div>
      <div className="col gap8" style={{ marginTop: 10 }}>
       {[[<Icon.chart key="a" size={14} />, ar ? "مؤشر الإيجارات للربع الأول 2026" : "Rent Index Q1 2026"], [<Icon.shield key="b" size={14} />, ar ? "سجل تراخيص الهيئة العامة للعقار" : "REGA permit registry"], [<Icon.target key="c" size={14} />, ar ? "عروض المنصّة الموثّقة" : "Verified platform listings"]].map((s, i) => (
        <div key={i} className="row gap8" style={{ fontSize: 12 }}><span style={{ color: "var(--harbor)" }}>{s[0]}</span>{s[1]}</div>
       ))}
      </div>
     </div>
    </div>
   </aside>
  </div>
 );
}
