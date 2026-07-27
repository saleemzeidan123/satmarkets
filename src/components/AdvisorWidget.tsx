"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/satkit";
import { assetLabel } from "@/lib/labels";
import { useAdvisorChat } from "@/lib/useAdvisorChat";
import { getDictionary } from "@/i18n/getDictionary";

/** Floating SAT Advisor: a Harbor quadrant-mark button on every page,
 *  bottom sheet on mobile, corner panel on desktop. Same /api/advisor
 *  brain as the advisor page, session-persisted history. */
export default function AdvisorWidget({ locale }: { locale: string }) {
 const loc = (locale === "ar" ? "ar" : "en") as "en" | "ar";
 const ar = loc === "ar";
 const av = getDictionary(loc).advisorWidget;
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
  if (window.matchMedia("(min-width:1024px)").matches) {
   const inputEl = el.querySelector("input");
   (inputEl as HTMLInputElement | null)?.focus();
  }
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

 const CHIP_POOL = [av.chip1, av.chip2, av.chip3, av.chip4];
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
    <button ref={fabRef} type="button" className="advfab" aria-label={av.openAdvisor} aria-haspopup="dialog" onClick={() => setOpen(true)}>
     {mark}
    </button>
   )}
   {open && (
    <>
     <div className="advpanel-back" onClick={() => setOpen(false)} aria-hidden="true" />
     <div ref={panelRef} className="advpanel" role="dialog" aria-modal="true" aria-label={av.advisorTitle} style={dy > 0 ? { transform: `translateY(${dy}px)`, transition: "none" } : undefined}>
      <div
       onTouchStart={(e) => { y0.current = e.touches[0].clientY; }}
       onTouchMove={(e) => { if (y0.current == null) return; const d = e.touches[0].clientY - y0.current; if (d > 0) setDy(d); }}
       onTouchEnd={() => { if (dy > 110) setOpen(false); setDy(0); y0.current = null; }}
      >
       <div className="grab" />
       <div className="row gap10" style={{ alignItems: "center", padding: "12px 16px", borderBottom: "1px solid var(--silver)" }}>
        <span style={{ color: "var(--harbor)" }}><Icon.spark size={18} /></span>
        <span style={{ fontSize: 14.5, fontWeight: 700, letterSpacing: "-.01em" }}>{av.advisorTitle}</span>
        <span className="tag" style={{ fontSize: 10 }}>{av.beta}</span>
        <span style={{ flex: 1 }} />
        {msgs.length > 0 && (
         <button type="button" onClick={reset} className="chip" style={{ cursor: "pointer", fontSize: 11.5, border: "1px solid var(--silver)", background: "var(--paper)" }}>{av.newChat}</button>
        )}
        <Link href={`/${loc}/advisor`} className="chip" style={{ fontSize: 11.5, border: "1px solid var(--silver)", background: "var(--paper)", textDecoration: "none", color: "inherit" }} onClick={() => setOpen(false)}>{av.fullPage}</Link>
        <button type="button" onClick={() => setOpen(false)} aria-label={av.close} style={{ border: "none", background: "transparent", cursor: "pointer", color: "var(--slate)", display: "inline-flex", padding: 6 }}>{xIcon}</button>
       </div>
      </div>

      <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: "16px 14px", background: "var(--cool)" }}>
       <div className="col gap12">
        {msgs.length === 0 && (
         <div className="chatmsg a">
          <div className="row gap8"><span style={{ color: "var(--harbor)" }}><Icon.spark size={16} /></span><span style={{ fontWeight: 500 }}>{av.welcome}</span></div>
         </div>
        )}
        {msgs.map((m, i) => m.role === "u" ? (
         <div key={i} className="chatmsg u" style={{ alignSelf: "flex-end" }}>{m.text}</div>
        ) : (
         <div key={i} className="chatmsg a">
          <div className="row gap8" style={{ marginBottom: m.results?.length ? 10 : 0 }}><span style={{ color: "var(--harbor)" }}><Icon.spark size={16} /></span><span style={{ fontWeight: 500 }}>{m.text}</span></div>
          {m.retry && (
           <button className="btn secondary sm" style={{ marginTop: 8 }} disabled={busy} onClick={() => send(m.retry as string)}>
            {ar ? "أعد المحاولة" : "Try again"}
           </button>
          )}
          {m.results && m.results.length > 0 && (
           <div className="col gap8">
            {m.results.slice(0, 3).map((l) => {
             const title = (ar ? l.title_ar : l.title_en) || l.reference_code;
             const dn = l.districts ? (ar ? l.districts.name_ar : l.districts.name_en) : "";
             const price = l.asking_rent_sqm ?? l.sale_price ?? 0;
             return (
              <Link key={l.id} href={`/${loc}/listings/${l.id}`} onClick={() => setOpen(false)} className="row gap10" style={{ background: "var(--paper)", border: "1px solid var(--silver)", borderRadius: 10, padding: 9, textDecoration: "none", color: "inherit" }}>
               <span style={{ width: 36, height: 36, borderRadius: 8, flex: "none", background: "var(--azure-wash)", color: "var(--azure-d)", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon.pin size={15} /></span>
               <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 12.5, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{title}</div><div className="mono muted" style={{ fontSize: 10.5, marginTop: 2 }}>{assetLabel(l.asset_type, loc)} · <bdi dir="ltr">{l.area_sqm} m²</bdi>{dn ? " · " + dn : ""}</div></div>
               <div style={{ textAlign: ar ? "left" : "right", flex: "none" }}><div className="mono" style={{ fontSize: 13.5, fontWeight: 500 }}>{price ? price.toLocaleString("en-US") : av.na}</div></div>
              </Link>
             );
            })}
            {m.note && <div className="src">{m.note}</div>}
           </div>
          )}
         </div>
        ))}
        {busy && (
         <div className="chatmsg a"><div className="row gap8"><span style={{ color: "var(--harbor)" }}><Icon.spark size={16} /></span><span className="muted">{av.searching}</span></div></div>
        )}
       </div>
      </div>

      <div style={{ padding: "10px 14px calc(12px + env(safe-area-inset-bottom))", background: "var(--paper)", borderTop: "1px solid var(--silver)" }}>
       {msgs.length === 0 && (
        <div className="row gap8 wrap" style={{ marginBottom: 8 }}>
         {chips.map((p, i) => <button key={i} type="button" className="chip" style={{ cursor: "pointer", fontSize: 11.5, border: "1px solid var(--silver)", background: "var(--paper)" }} onClick={() => doSend(p)}>{p}</button>)}
        </div>
       )}
       <form onSubmit={(e) => { e.preventDefault(); doSend(input); }} style={{ display: "flex", alignItems: "center", gap: 8, border: "1px solid var(--azure)", borderRadius: 999, padding: "6px 8px 6px 14px", background: "var(--paper)" }}>
        <input value={input} onChange={(e) => setInput(e.target.value)} placeholder={av.placeholder} style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontSize: 13.5, color: "var(--ink)", fontFamily: "var(--sans)", textAlign: ar ? "right" : "left", minWidth: 0 }} />
        <button type="submit" className="btn primary sm" disabled={busy} aria-label={av.send}><Icon.send size={14} /></button>
       </form>
       <p className="muted" style={{ fontSize: 10.5, margin: "6px 2px 0" }}>{av.footer}</p>
      </div>
     </div>
    </>
   )}
  </>
 );
}
