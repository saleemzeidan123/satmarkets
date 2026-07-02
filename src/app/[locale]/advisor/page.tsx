"use client";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Icon, Logo } from "@/components/satkit";
import { assetLabel } from "@/lib/labels";

interface R { id: string; reference_code: string; asset_type: string; title_en: string|null; title_ar: string|null; area_sqm: number; asking_rent_sqm: number|null; sale_price: number|null; districts?: { name_en: string|null; name_ar: string|null; city: string|null } | null; }
interface Msg { role: "u"|"a"; text: string; results?: R[]; note?: string; }

export default function AdvisorPage({ params }: { params: { locale: string } }) {
 const locale = (params.locale === "ar" ? "ar" : "en") as "en"|"ar";
 const ar = locale === "ar";
 const [msgs, setMsgs] = useState<Msg[]>([]);
 const [input, setInput] = useState("");
 const [busy, setBusy] = useState(false);
 const scrollRef = useRef<HTMLDivElement>(null);

 const JOBS = ar ? [
  { icon: <Icon.search size={18} />, label: "ابحث عن مساحة", sub: "صِفها بالكلمات وأبحث في العروض الموثّقة", prompt: "مكتب فئة A مجهّز في العليا، نحو 300 م²، بأقل من 1,600 ريال/م²" },
  { icon: <Icon.spark size={18} />, label: "اكتب إعلاناً", sub: "من تفاصيلك، أكتب الإعلان كاملاً", prompt: "اكتب إعلاناً لطابق فئة A في برج العليا، 320 م²، مجهّز" },
  { icon: <Icon.chart size={18} />, label: "قيّم إيجاراً أو صفقة", sub: "بلغة واضحة، مبني على مؤشر الإيجارات", prompt: "كيف يقارن سعر 1,450 ريال/م² لمكتب فئة A في العليا؟" },
  { icon: <Icon.target size={18} />, label: "راقب السوق", sub: "تنبيه دائم عند تحرّك المؤشر", prompt: "نبّهني عندما تتحرك إيجارات مكاتب فئة A في العليا أكثر من 3%" },
 ] : [
  { icon: <Icon.search size={18} />, label: "Find a space", sub: "Describe it in words, I search verified stock", prompt: "Fitted Grade A office in Al Olaya, ~300 m², under 1,600 SAR/m²" },
  { icon: <Icon.spark size={18} />, label: "Draft a listing", sub: "From your details, write the whole listing", prompt: "Draft a listing for my Grade A floor in Olaya Tower, 320 m², fitted" },
  { icon: <Icon.chart size={18} />, label: "Value a lease or deal", sub: "Plain-language, grounded in the Rent Index", prompt: "How does 1,450 SAR/m² compare for Grade A office in Al Olaya?" },
  { icon: <Icon.target size={18} />, label: "Watch the market", sub: "A standing alert when the index moves", prompt: "Alert me when Al Olaya Grade A office rents move more than 3%" },
 ];

 const CHIPS = ar
  ? ["قارن العليا مقابل كافد", "مستودع قرب الصناعية الثانية", "تجزئة بحركة عالية في التحلية", "مكاتب بأقل من 1,200 ريال/م²"]
  : ["Compare Olaya vs KAFD", "Warehouse near 2nd Industrial", "Retail with high footfall on Tahlia", "Offices under 1,200 SAR/m²"];

 useEffect(() => { scrollRef.current?.scrollTo({ top: 9e9, behavior: "smooth" }); }, [msgs, busy]);

 async function send(text: string) {
  const q = text.trim();
  if (!q || busy) return;
  setInput("");
  setMsgs((m) => [...m, { role: "u", text: q }]);
  setBusy(true);
  try {
   const r = await fetch("/api/search", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query: q }) });
   const j = await r.json();
   const results: R[] = j.results || [];
   let note = "";
   if (ar) {
    if (j.clarify) note = "أخبرني بالمزيد، نوع المساحة أو المدينة أو الميزانية، وسأضيّق النطاق.";
    else if (j.relaxed && results.length) note = `لا توجد مطابقات تامة، فإليك أقرب ${results.length}، بعضها ${j.relaxedReason || "خارج عوامل التصفية"}. عدّل الميزانية أو المساحة أو الحي للتضييق.`;
    else if (results.length) note = `${results.length} مطابقة موثّقة من مؤشر SAT، موثّقة من المالك، خالية من التكرار، مدعومة بالتراخيص.`;
    else note = "لا توجد مطابقات موثّقة لذلك بعد. جرّب حياً أو مساحة أو ميزانية مختلفة وسأبحث مجدداً.";
   } else {
    if (j.clarify) note = "Tell me a bit more, a space type, a city, or a budget, and I'll narrow it down.";
    else if (j.relaxed && results.length) note = `No exact matches, so here are the closest ${results.length}, some are ${j.relaxedReason || "outside your filters"}. Adjust the budget, size, or district to tighten it.`;
    else if (results.length) note = `${results.length} verified ${results.length === 1 ? "match" : "matches"} from the SAT index, owner-verified, deduplicated, permit-backed.`;
    else note = "No verified matches yet for that. Try a different district, size, or budget and I'll search again.";
   }
   setMsgs((m) => [...m, { role: "a", text: note, results, note: ar ? "مؤشر SAT للإيجارات للربع الأول 2026 · صفقات موثّقة فقط" : "SAT Rent Index Q1 2026 · verified transactions only" }]);
  } catch {
   setMsgs((m) => [...m, { role: "a", text: ar ? "حدث ما قاطع البحث. حاول مرة أخرى." : "Something interrupted the search. Please try again." }]);
  }
  setBusy(false);
 }

 const started = msgs.length > 0;

 return (
  <div className="dash">
   <aside className="dside advisor-rail-l" style={{ background: "var(--paper)", color: "var(--ink)", borderRight: "1px solid var(--silver)" }}>
    <div className="brand" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
     <Link href={`/${locale}`} aria-label="Home"><Logo size={26} /></Link>
     <button className="btn primary sm" onClick={() => setMsgs([])}><Icon.plus size={14} /> {ar ? "جديد" : "New"}</button>
    </div>
    <div className="dnav" style={{ gap: 4, marginTop: 10 }}>
     <div className="eyebrow" style={{ padding: "4px 12px" }}>{ar ? "ما يمكنني فعله" : "What I can do"}</div>
     {JOBS.map((j, i) => (
      <button key={i} onClick={() => send(j.prompt)} style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 2, color: "var(--ink)", background: "transparent", border: "none", textAlign: ar ? "right" : "left", padding: "9px 12px", borderRadius: 9, cursor: "pointer", width: "100%" }}>
       <span style={{ fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 7 }}><span style={{ color: "var(--harbor)" }}>{j.icon}</span>{j.label}</span>
       <span className="mono" style={{ fontSize: 10, color: "var(--slate-2)" }}>{j.sub}</span>
      </button>
     ))}
    </div>
    <div className="me" style={{ borderTopColor: "var(--silver)" }}>
     <span className="avatar" style={{ background: "var(--harbor)" }}>AK</span>
     <div><div className="nm" style={{ color: "var(--ink)" }}>{ar ? "أحمد ك." : "Ahmed K."}</div><div className="rl">{ar ? "مستأجر · شركة آكمي" : "Occupier · Acme Co."}</div></div>
    </div>
   </aside>

   <div className="dmain" style={{ display: "flex", flexDirection: "column" }}>
    <div className="dtopbar">
     <span style={{ color: "var(--harbor)" }}><Icon.spark size={20} /></span>
     <div><h1>{ar ? "مستشار SAT" : "SAT Advisor"}</h1><div className="sub">{ar ? "ابحث، اكتب، قيّم، وراقب السوق، مبنيٌّ على المؤشر الموثّق، دون اختلاق" : "Search, draft, value and watch the market, grounded in the verified index, never invented"}</div></div>
     <span style={{ flex: 1 }} />
     <span className="tag">{ar ? "تجريبي" : "Beta"}</span>
    </div>

    <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: "26px 24px", background: "var(--cool)" }}>
     <div style={{ maxWidth: 760, margin: "0 auto" }} className="col gap18">
      {!started && (
       <div>
        <div className="eyebrow">{ar ? "بماذا أخدمك؟" : "What should I do for you?"}</div>
        <h2 style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-.02em", margin: "8px 0 4px" }}>{ar ? "مساعد ينجز العمل." : "An assistant that does the work."}</h2>
        <p className="muted" style={{ fontSize: 14, margin: "0 0 18px" }}>{ar ? "ليس مجرد مربع بحث، اختر مهمة أو اكتب أدناه، وأنفّذها على بيانات موثّقة." : "Not just a search box, pick a job or type below, and I run it on verified data."}</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
         {JOBS.map((j, i) => (
          <button key={i} onClick={() => send(j.prompt)} className="card pad lift" style={{ textAlign: ar ? "right" : "left", cursor: "pointer", border: "1px solid var(--silver)", background: "#fff" }}>
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

      {busy && (
       <div className="chatmsg a"><div className="row gap8"><span style={{ color: "var(--harbor)" }}><Icon.spark size={16} /></span><span className="muted">{ar ? "أبحث في المؤشر الموثّق…" : "Searching the verified index…"}</span></div></div>
      )}
     </div>
    </div>

    <div style={{ padding: "14px 24px 20px", background: "var(--paper)", borderTop: "1px solid var(--silver)" }}>
     <div style={{ maxWidth: 760, margin: "0 auto" }}>
      {!started && (
       <div className="row gap8 wrap" style={{ marginBottom: 10 }}>
        {CHIPS.map((p, i) => <button key={i} className="chip" style={{ cursor: "pointer", border: "1px solid var(--silver)", background: "#fff" }} onClick={() => send(p)}>{p}</button>)}
       </div>
      )}
      <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="search focus" style={{ boxShadow: "none", border: "1px solid var(--azure)", padding: "8px 10px 8px 14px", display: "flex", alignItems: "center", gap: 8 }}>
       <span style={{ color: "var(--harbor)" }}><Icon.spark size={18} /></span>
       <input value={input} onChange={(e) => setInput(e.target.value)} placeholder={ar ? "اسأل عن الإيجارات، ابحث عن مساحة، قيّم عقداً…" : "Ask about rents, find a space, value a lease…"} style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontSize: 14, color: "var(--ink)", textAlign: ar ? "right" : "left" }} />
       <button type="submit" className="btn primary sm" disabled={busy} aria-label="Send"><Icon.send size={15} /></button>
      </form>
      <p className="muted" style={{ fontSize: 11, margin: "8px 2px 0" }}>{ar ? "مبنيٌّ على مؤشر SAT للإيجارات والعروض الموثّقة. مستشار SAT يشرح البيانات ولا يختلقها." : "Grounded in the SAT Rent Index and verified listings. SAT Advisor explains the data, it doesn’t invent it."}</p>
     </div>
    </div>
   </div>

   <aside className="advisor-rail-r" style={{ background: "var(--paper)", borderLeft: "1px solid var(--silver)", overflowY: "auto" }}>
    <div style={{ padding: "18px 20px", borderBottom: "1px solid var(--silver)" }}><div className="eyebrow">{ar ? "السياق المباشر · العليا" : "Live context · Al Olaya"}</div></div>
    <div style={{ padding: 20 }} className="col gap16">
     <div className="row gap16"><div className="kpi"><span className="v tnum" style={{ fontSize: 20 }}>2,370</span><span className="l">{ar ? "وسيط الفئة A (منشور)" : "Median Grade A (published)"}</span></div><div className="kpi"><span className="v tnum" style={{ fontSize: 20, color: "var(--green)" }}>+2.1%</span><span className="l">{ar ? "سنوياً · الفئة A" : "YoY · Grade A"}</span></div></div>
     <div className="row gap16"><div className="kpi"><span className="v tnum" style={{ fontSize: 20 }}>97.7%</span><span className="l">{ar ? "إشغال الفئة A" : "Grade A occupancy"}</span></div><div className="kpi"><span className="v tnum" style={{ fontSize: 20 }}>412k</span><span className="l">{ar ? "النطاق النهاري" : "Daytime catchment"}</span></div></div>
     <div className="card pad" style={{ boxShadow: "none", background: "var(--cool)" }}>
      <div className="eyebrow">{ar ? "المصادر المستخدمة" : "Sources used"}</div>
      <div className="col gap8" style={{ marginTop: 10 }}>
       {[[<Icon.chart key="a" size={14} />, ar ? "مؤشر SAT للإيجارات للربع الأول 2026" : "SAT Rent Index Q1 2026"], [<Icon.shield key="b" size={14} />, ar ? "سجل تراخيص الهيئة العامة للعقار" : "REGA permit registry"], [<Icon.target key="c" size={14} />, ar ? "لوحة الحركة · حركة المشاة" : "Mobility panel · footfall"]].map((s, i) => (
        <div key={i} className="row gap8" style={{ fontSize: 12 }}><span style={{ color: "var(--harbor)" }}>{s[0]}</span>{s[1]}</div>
       ))}
      </div>
     </div>
    </div>
   </aside>
  </div>
 );
}
