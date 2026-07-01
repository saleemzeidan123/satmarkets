"use client";
import { useState, useRef, useEffect } from "react";
import { Icon, Photo, Verified } from "@/components/satkit";

interface Msg { role: "u" | "a"; text: string; }

export default function MessagesPage({ params }: { params: { locale: string } }) {
 const ar = params.locale === "ar";
 const convs: [string, string, string, string, boolean, string][] = [
  ["OT", ar ? "شركة أبراج العليا" : "Olaya Towers Co.", ar ? "تم اعتماد الترخيص، هل نحجز معاينة؟" : "Permit cleared, shall we book a viewing?", ar ? "منذ دقيقتين" : "2m", true, "var(--harbor)"],
  ["KD", ar ? "شركة تطوير مركز الملك عبدالله المالي" : "KAFD Devco", ar ? "الدور متاح ابتداءً من مارس." : "The floor is available from March.", ar ? "منذ ساعة" : "1h", true, "var(--slate)"],
  ["SA", ar ? "مستشار سات" : "SAT Advisor", ar ? "3 تطابقات موثّقة في العليا." : "3 verified matches in Al Olaya.", ar ? "منذ 3 ساعات" : "3h", false, "var(--azure)"],
  ["TH", ar ? "تحلية القابضة" : "Tahlia Holdings", ar ? "سأرسل الكتيّب قريباً." : "I'll send the brochure shortly.", ar ? "الثلاثاء" : "Tue", false, "var(--harbor)"],
 ];
 const days = ar ? ["ن", "ث", "ر", "خ", "ج", "س", "ح"] : ["M", "T", "W", "T", "F", "S", "S"];
 const dates = [10, 11, 12, 13, 14, 15, 16];
 const slots: [string, string][] = [["09:00", "av"], ["10:00", "on"], ["11:30", "av"], ["13:00", "off"], ["15:00", "av"], ["16:30", "av"]];
 const timeline: [string, string, string][] = [
  [ar ? "تم إرسال الاستفسار" : "Enquiry sent", ar ? "قبل 6 أيام" : "6 days ago", "done"],
  [ar ? "معاينة، الخميس 10:00" : "Viewing, Thu 10:00", ar ? "مجدولة" : "Scheduled", "on"],
  [ar ? "العرض" : "Offer", ar ? "لم يبدأ" : "Not started", ""],
  [ar ? "العقد، إيجار (خارج المنصة)" : "Contract, Ejar (off-platform)", "", ""],
  [ar ? "التسليم" : "Handover", "", ""],
 ];
 const [msgs, setMsgs] = useState<Msg[]>([
  { role: "a", text: ar ? "مرحباً، شكراً لاهتمامك بدور برج العليا. الدور مجهّز ومتاح الآن. يسعدني الإجابة عن أي أسئلة." : "Hello, thanks for your interest in the Olaya Tower floor. It's fitted and available now. Happy to answer any questions." },
  { role: "u", text: ar ? "يبدو مثالياً لمقرّنا الرئيسي. هل يمكننا ترتيب معاينة هذا الأسبوع؟" : "Looks ideal for our HQ. Could we arrange a viewing this week?" },
  { role: "a", text: ar ? "بكل تأكيد. اقترحت بعض المواعيد، اختر ما يناسبك." : "Of course. I've proposed a few slots, pick what suits you." },
 ]);
 const [input, setInput] = useState("");
 // On phones only one pane fits, start in the inbox, open a thread on tap.
 const [pane, setPane] = useState<"list" | "thread">("list");
 const ref = useRef<HTMLDivElement>(null);
 useEffect(() => { ref.current?.scrollTo({ top: 9e9, behavior: "smooth" }); }, [msgs]);

 function send() {
  const t = input.trim(); if (!t) return;
  setInput("");
  setMsgs((m) => [...m, { role: "u", text: t }]);
  setTimeout(() => setMsgs((m) => [...m, { role: "a", text: ar ? "شكراً، تم التسجيل. سأؤكد وأعود إليك قريباً." : "Thanks, noted. I'll confirm and get back to you shortly." }]), 900);
 }

 return (
  <div className={"dash msg-dash pane-" + pane}>
   <aside className="msg-list" style={{ width: 330, flex: "none", background: "var(--paper)", borderRight: "1px solid var(--silver)", display: "flex", flexDirection: "column" }}>
    <div className="dtopbar" style={{ padding: "16px 18px" }}><div><h1 style={{ fontSize: 17 }}>{ar ? "الرسائل" : "Messages"}</h1><div className="sub">{ar ? "2 غير مقروءة" : "2 unread"}</div></div><span style={{ flex: 1 }} /><span className="muted2"><Icon.edit size={18} /></span></div>
    <div style={{ padding: "0 16px 12px" }}><div className="dsearch" style={{ minWidth: 0 }}><Icon.search size={15} /> {ar ? "بحث…" : "Search…"}</div></div>
    <div style={{ flex: 1, overflowY: "auto" }}>
     {convs.map((c, i) => (
      <div key={i} className={"conv" + (i === 0 ? " on" : "")} style={{ cursor: "pointer" }} onClick={() => setPane("thread")}>
       <span className="avatar" style={{ background: c[5] }}>{c[0]}</span>
       <div className="grow" style={{ minWidth: 0 }}>
        <div className="row between"><span style={{ fontSize: 13.5, fontWeight: 600 }}>{c[1]}</span><span className="mono muted" style={{ fontSize: 10 }}>{c[3]}</span></div>
        <div className="muted" style={{ fontSize: 11.5, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c[2]}</div>
       </div>
       {c[4] && <span className="un" />}
      </div>
     ))}
    </div>
   </aside>

   <div className="dmain" style={{ display: "flex", flexDirection: "column", background: "var(--cool)" }}>
    <div className="dtopbar">
     <button className="msg-back" aria-label={ar ? "العودة للصندوق" : "Back to inbox"} onClick={() => setPane("list")} style={{ border: "none", background: "transparent", cursor: "pointer", color: "var(--slate)", padding: 4, marginInlineStart: -4 }}><span style={{ display: "inline-flex", transform: ar ? "none" : "rotate(180deg)" }}><Icon.chevr size={20} /></span></button>
     <span className="avatar" style={{ background: "var(--harbor)" }}>OT</span>
     <div><h1 style={{ fontSize: 16 }}>{ar ? "شركة أبراج العليا" : "Olaya Towers Co."}</h1><div className="sub"><Verified text={ar ? "مالك موثّق" : "Verified owner"} /> · {ar ? "يرد خلال ~ساعتين" : "responds in ~2h"}</div></div>
     <span style={{ flex: 1 }} />
     <span className="btn secondary sm"><Icon.eye size={14} /> {ar ? "عرض الإعلان" : "View listing"}</span>
     <span className="btn primary sm"><Icon.coins size={14} /> {ar ? "تقديم عرض" : "Make offer"}</span>
    </div>
    <div className="row gap12" style={{ padding: "12px 24px", background: "var(--paper)", borderBottom: "1px solid var(--silver)" }}>
     <Photo kind="office" h={44} style={{ width: 60, borderRadius: 8, flex: "none" }} badges={[<Verified key="v" text="V" />]} />
     <div className="grow"><div style={{ fontSize: 13, fontWeight: 600 }}>{ar ? "مكتب فئة A، برج العليا" : "Grade A Office, Olaya Tower"}</div><div className="mono muted" style={{ fontSize: 11 }}>{ar ? "1,450 ريال/م² · 320 م² · العليا" : "1,450 SAR/m² · 320 m² · Al Olaya"}</div></div>
     <span className="freeze open"><span className="dot" />{ar ? "مفتوح" : "Open"}</span>
    </div>
    <div ref={ref} style={{ flex: 1, overflowY: "auto", padding: "24px 32px" }}>
     <div style={{ maxWidth: 660 }} className="col gap14">
      {msgs.map((m, i) => m.role === "a"
       ? <div key={i} className="chatmsg a" style={{ background: "#fff", border: "1px solid var(--silver)" }}>{m.text}</div>
       : <div key={i} className="chatmsg u" style={{ alignSelf: "flex-end", background: "var(--ink)", color: "#fff" }}>{m.text}</div>)}
      <div className="card" style={{ padding: 18, boxShadow: "var(--sh-1)", maxWidth: 460 }}>
       <div className="row gap8" style={{ marginBottom: 14 }}><span style={{ color: "var(--harbor)" }}><Icon.cal size={17} /></span><span style={{ fontSize: 14, fontWeight: 700 }}>{ar ? "حجز معاينة" : "Book a viewing"}</span></div>
       <div className="cal" style={{ marginBottom: 14 }}>
        {days.map((d, i) => <div key={"h" + i} className="day"><div className="dn">{d}</div></div>)}
        {dates.map((d, i) => <div key={"d" + i} className="day"><div className={"dd " + (d === 13 ? "sel" : i < 5 ? "av" : "off")}>{d}</div></div>)}
       </div>
       <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
        {slots.map((s, i) => <span key={i} className={"slot " + s[1]}>{s[0]}</span>)}
       </div>
       <span className="btn primary" style={{ width: "100%", justifyContent: "center", marginTop: 14 }}>{ar ? "تأكيد · الخميس 10:00" : "Confirm · Thu 10:00"}</span>
      </div>
     </div>
    </div>
    <div style={{ padding: "14px 32px 18px", background: "var(--paper)", borderTop: "1px solid var(--silver)" }}>
     <form onSubmit={(e) => { e.preventDefault(); send(); }} className="search focus" style={{ boxShadow: "none", border: "1px solid var(--silver-2)", padding: "8px 10px 8px 14px", display: "flex", alignItems: "center", gap: 8 }}>
      <span className="muted2"><Icon.plus size={18} /></span>
      <input value={input} onChange={(e) => setInput(e.target.value)} placeholder={ar ? "اكتب رسالة…" : "Write a message…"} style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontSize: 14, color: "var(--ink)" }} />
      <button type="button" className="chip" onClick={() => setInput(ar ? "مرحباً، هل الدور ما زال متاحاً للانتقال في مارس؟" : "Hi, is the floor still available for a March move-in?")}><Icon.spark size={13} /> {ar ? "مسودة ذكية" : "AI draft"}</button>
      <button type="submit" className="btn primary sm" aria-label={ar ? "إرسال" : "Send"}><Icon.send size={15} /></button>
     </form>
    </div>
   </div>

   <aside className="msg-deal" style={{ width: 280, flex: "none", background: "var(--paper)", borderLeft: "1px solid var(--silver)", overflowY: "auto", padding: 20 }}>
    <div className="eyebrow" style={{ marginBottom: 12 }}>{ar ? "تقدّم الصفقة" : "Deal progress"}</div>
    <div className="tl">
     {timeline.map((e, i) => (
      <div key={i} className="ev"><div className="t" style={{ color: e[2] === "" ? "var(--slate-2)" : "var(--ink)" }}>{e[0]}</div>{e[1] && <div className="tm">{e[1]}</div>}</div>
     ))}
    </div>
    <span className="btn secondary" style={{ width: "100%", justifyContent: "center", marginTop: 16 }}>{ar ? "تعيين سات لتمثيلي" : "Appoint SAT to represent me"}</span>
    <div className="card pad" style={{ marginTop: 16, boxShadow: "none", background: "var(--cool)" }}>
     <div className="row gap8"><span style={{ color: "var(--green)" }}><Icon.shield size={15} /></span><span className="muted" style={{ fontSize: 11.5, lineHeight: 1.5 }}>{ar ? "أبقِ التعامل داخل المنصة، تتحقق سات من الطرفين وتتابع كل مرحلة. يُوقّع عقد إيجار مباشرةً مع المالك أو وسيطه المرخّص." : "Keep it on-platform, SAT verifies both parties and tracks every milestone. The Ejar contract is signed directly with the owner or their licensed broker."}</span></div>
    </div>
   </aside>
  </div>
 );
}
