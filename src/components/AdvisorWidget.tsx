"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/satkit";
import { assetLabel } from "@/lib/labels";
import { useAdvisorChat } from "@/lib/useAdvisorChat";

/** Floating SAT Advisor: a Harbor quadrant-mark button on every page,
 *  bottom sheet on mobile, corner panel on desktop. Same /api/advisor
 *  brain as the advisor page, session-persisted history. */
export default function AdvisorWidget({ locale }: { locale: string }) {
 const loc = (locale === "ar" ? "ar" : "en") as "en" | "ar";
 const ar = loc === "ar";
 const path = usePathname() || "";
 const [open, setOpen] = useState(false);
 const [input, setInput] = useState("");
 const [dy, setDy] = useState(0);
 const y0 = useRef<number | null>(null);
 const panelRef = useRef<HTMLDivElement>(null);
 const fabRef = useRef<HTMLButtonElement>(null);
 const scrollRef = useRef<HTMLDivElement>(null);
 const { msgs, busy, send, reset } = useAdvisorChat(loc, "satm_adv_chat");

 const hidden = /\/(advisor|flyer|termsheet|verify|admin|dashboard|signup)(\/|$)/.test(path);

 useEffect(() => { scrollRef.current?.scrollTo({ top: 9e9, behavior: "smooth" }); }, [msgs, busy, open]);

 useEffect(() => {
  if (!open) return;
  const el = panelRef.current;
  if (!el) return;
  const inputEl = el.querySelector("input");
  (inputEl as HTMLInputElement | null)?.focus();
  const onKey = (e: KeyboardEvent) => {
   if (e.key === "Escape") { setOpen(false); return; }
   if (e.key !== "Tab") return;
   const f = el.querySelectorAll<HTMLElement>('button,a[href],input,[tabindex]:not([tabindex="-1"])');
   if (!f.length) return;
   const first = f[0], last = f[f.length - 1];
   if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
   else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };
  document.addEventListener("keydown", onKey);
  document.body.style.overflow = "hidden";
  return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; fabRef.current?.focus(); };
 }, [open]);

 if (hidden) return null;

 const CHIP_POOL = ar ? [
  "كيف يقارن سعر 3,500 ريال/م² لمكتب فئة A في كافد؟",
  "مكتب فئة A مجهّز في غرناطة، نحو 300 م²",
  "تجزئة بحركة عالية في التحلية",
  "قارن مكاتب العليا مقابل غرناطة",
 ] : [
  "How does 3,500 SAR/m² compare for a Grade A office in KAFD?",
  "Fitted Grade A office in Granada, around 300 m²",
  "Retail with high footfall on Tahlia",
  "Compare Al Olaya vs Granada offices",
 ];
 const rot = new Date().getDate() % CHIP_POOL.length;
 const chips = [0, 1, 2].map((i) => CHIP_POOL[(rot + i) % CHIP_POOL.length]);

 const doSend = (t: string) => { setInput(""); send(t); };

 const xIcon = (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
 );
 const mark = (
  <svg width="22" height="22" viewBox="0 0 100 100" aria-hidden="true">
   <rect x="7" y="7" width="32" height="48" rx="4" fill="rgba(255,255,255,.42)" />
   <rect x="44" y="7" width="49" height="48" rx="4" fill="#fff" />
   <rect x="7" y="59" width="32" height="34" rx="4" fill="rgba(255,255,255,.42)" />
   <rect x="44" y="59" width="49" height="34" rx="4" fill="rgba(255,255,255,.42)" />
  </svg>
 );

 return (
  <>
   {!open && (
    <button ref={fabRef} type="button" className="advfab" aria-label={ar ? "افتح مستشار SAT" : "Open SAT Advisor"} aria-haspopup="dialog" onClick={() => setOpen(true)}>
     {mark}
    </button>
   )}
   {open && (
    <>
     <div className="advpanel-back" onClick={() => setOpen(false)} aria-hidden="true" />
     <div ref={panelRef} className="advpanel" role="dialog" aria-modal="true" aria-label={ar ? "مستشار SAT" : "SAT Advisor"} style={dy > 0 ? { transform: `translateY(${dy}px)`, transition: "none" } : undefined}>
      <div
       onTouchStart={(e) => { y0.current = e.touches[0].clientY; }}
       onTouchMove={(e) => { if (y0.current == null) return; const d = e.touches[0].clientY - y0.current; if (d > 0) setDy(d); }}
       onTouchEnd={() => { if (dy > 110) setOpen(false); setDy(0); y0.current = null; }}
      >
       <div className="grab" />
       <div className="row gap10" style={{ alignItems: "center", padding: "12px 16px", borderBottom: "1px solid var(--silver)" }}>
        <span style={{ color: "var(--harbor)" }}><Icon.spark size={18} /></span>
        <span style={{ fontSize: 14.5, fontWeight: 700, letterSpacing: "-.01em" }}>{ar ? "مستشار SAT" : "SAT Advisor"}</span>
        <span className="tag" style={{ fontSize: 10 }}>{ar ? "تجريبي" : "Beta"}</span>
        <span style={{ flex: 1 }} />
        {msgs.length > 0 && (
         <button type="button" onClick={reset} className="chip" style={{ cursor: "pointer", fontSize: 11.5, border: "1px solid var(--silver)", background: "#fff" }}>{ar ? "جديد" : "New"}</button>
        )}
        <Link href={`/${loc}/advisor`} className="chip" style={{ fontSize: 11.5, border: "1px solid var(--silver)", background: "#fff", textDecoration: "none", color: "inherit" }} onClick={() => setOpen(false)}>{ar ? "الصفحة الكاملة" : "Full page"}</Link>
        <button type="button" onClick={() => setOpen(false)} aria-label={ar ? "إغلاق" : "Close"} style={{ border: "none", background: "transparent", cursor: "pointer", color: "var(--slate)", display: "inline-flex", padding: 6 }}>{xIcon}</button>
       </div>
      </div>

      <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: "16px 14px", background: "var(--cool)" }}>
       <div className="col gap12">
        {msgs.length === 0 && (
         <div className="chatmsg a">
          <div className="row gap8"><span style={{ color: "var(--harbor)" }}><Icon.spark size={16} /></span><span style={{ fontWeight: 500 }}>{ar ? "مرحباً. اسأل عن الإيجارات، ابحث عن مساحة، أو قيّم عقداً. أجيب من المؤشر الموثّق فقط." : "Welcome. Ask about rents, find a space, or value a lease. I answer from the verified index only."}</span></div>
         </div>
        )}
        {msgs.map((m, i) => m.role === "u" ? (
         <div key={i} className="chatmsg u" style={{ alignSelf: "flex-end" }}>{m.text}</div>
        ) : (
         <div key={i} className="chatmsg a">
          <div className="row gap8" style={{ marginBottom: m.results?.length ? 10 : 0 }}><span style={{ color: "var(--harbor)" }}><Icon.spark size={16} /></span><span style={{ fontWeight: 500 }}>{m.text}</span></div>
          {m.results && m.results.length > 0 && (
           <div className="col gap8">
            {m.results.slice(0, 3).map((l) => {
             const title = (ar ? l.title_ar : l.title_en) || l.reference_code;
             const dn = l.districts ? (ar ? l.districts.name_ar : l.districts.name_en) : "";
             const price = l.asking_rent_sqm ?? l.sale_price ?? 0;
             return (
              <Link key={l.id} href={`/${loc}/listings/${l.id}`} onClick={() => setOpen(false)} className="row gap10" style={{ background: "#fff", border: "1px solid var(--silver)", borderRadius: 10, padding: 9, textDecoration: "none", color: "inherit" }}>
               <span style={{ width: 36, height: 36, borderRadius: 8, flex: "none", background: "var(--azure-wash)", color: "var(--azure-d)", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon.pin size={15} /></span>
               <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 12.5, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{title}</div><div className="mono muted" style={{ fontSize: 10.5, marginTop: 2 }}>{assetLabel(l.asset_type, loc)} · {l.area_sqm} m²{dn ? " · " + dn : ""}</div></div>
               <div style={{ textAlign: ar ? "left" : "right", flex: "none" }}><div className="mono" style={{ fontSize: 13.5, fontWeight: 500 }}>{price ? price.toLocaleString("en-US") : (ar ? "غير متاح" : "n/a")}</div></div>
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

      <div style={{ padding: "10px 14px calc(12px + env(safe-area-inset-bottom))", background: "var(--paper)", borderTop: "1px solid var(--silver)" }}>
       {msgs.length === 0 && (
        <div className="row gap8 wrap" style={{ marginBottom: 8 }}>
         {chips.map((p, i) => <button key={i} type="button" className="chip" style={{ cursor: "pointer", fontSize: 11.5, border: "1px solid var(--silver)", background: "#fff" }} onClick={() => doSend(p)}>{p}</button>)}
        </div>
       )}
       <form onSubmit={(e) => { e.preventDefault(); doSend(input); }} style={{ display: "flex", alignItems: "center", gap: 8, border: "1px solid var(--azure)", borderRadius: 999, padding: "6px 8px 6px 14px", background: "#fff" }}>
        <input value={input} onChange={(e) => setInput(e.target.value)} placeholder={ar ? "اسأل عن الإيجارات، ابحث عن مساحة…" : "Ask about rents, find a space…"} style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontSize: 13.5, color: "var(--ink)", fontFamily: "var(--sans)", textAlign: ar ? "right" : "left", minWidth: 0 }} />
        <button type="submit" className="btn primary sm" disabled={busy} aria-label={ar ? "إرسال" : "Send"}><Icon.send size={14} /></button>
       </form>
       <p className="muted" style={{ fontSize: 10.5, margin: "6px 2px 0" }}>{ar ? "مبنيٌّ على مؤشر الإيجارات والعروض الموثّقة. يشرح البيانات ولا يختلقها." : "Grounded in the Rent Index and verified listings. It explains the data, it doesn't invent it."}</p>
      </div>
     </div>
    </>
   )}
  </>
 );
}
