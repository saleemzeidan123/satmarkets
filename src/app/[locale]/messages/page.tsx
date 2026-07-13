"use client";
import { useState, useRef, useEffect } from "react";
import { Icon, Photo, Verified } from "@/components/satkit";
import { getDictionary } from "@/i18n/getDictionary";

interface Msg { role: "u" | "a"; text: string; }

import SampleBanner from "@/components/SampleBanner";
export default function MessagesPage({ params }: { params: { locale: string } }) {
 const ar = params.locale === "ar";
 const mg = getDictionary(params.locale === "ar" ? "ar" : "en").messages;
 const convs: [string, string, string, string, boolean, string][] = [
  ["OT", mg.c1Name, mg.c1Prev, mg.c1Time, true, "var(--harbor)"],
  ["KD", mg.c2Name, mg.c2Prev, mg.c2Time, true, "var(--slate)"],
  ["SA", mg.c3Name, mg.c3Prev, mg.c3Time, false, "var(--azure)"],
  ["TH", mg.c4Name, mg.c4Prev, mg.c4Time, false, "var(--harbor)"],
 ];
 const unread = convs.filter((c) => c[4]).length;
 const days = ar ? ["ن", "ث", "ر", "خ", "ج", "س", "ح"] : ["M", "T", "W", "T", "F", "S", "S"];
 const dates = [10, 11, 12, 13, 14, 15, 16];
 const slots: [string, string][] = [["09:00", "av"], ["10:00", "on"], ["11:30", "av"], ["13:00", "off"], ["15:00", "av"], ["16:30", "av"]];
 const timeline: [string, string, string][] = [
  [mg.tlEnquiry, mg.tl6days, "done"],
  [mg.tlViewing, mg.tlScheduled, "on"],
  [mg.tlOffer, mg.tlNotStarted, ""],
  [mg.tlContract, "", ""],
  [mg.tlHandover, "", ""],
 ];
 // Each conversation now has its own thread. Selecting a row actually selects it.
 const threads: Msg[][] = [
  [{ role: "a", text: mg.msg1 }, { role: "u", text: mg.msg2 }, { role: "a", text: mg.msg3 }],
  [{ role: "a", text: mg.c2m1 }, { role: "u", text: mg.c2m2 }],
  [{ role: "a", text: mg.c3m1 }],
  [{ role: "a", text: mg.c4m1 }, { role: "u", text: mg.c4m2 }],
 ];
 // Each thread is about its own listing. This was hardwired to conversation 1, so
 // every thread claimed to be about the Olaya Tower floor.
 const subjects: [string, string][] = [
  [mg.listingTitle, mg.listingSpec],
  [mg.s2Title, mg.s2Spec],
  [mg.s3Title, mg.s3Spec],
  [mg.s4Title, mg.s4Spec],
 ];
 const [active, setActive] = useState(0);
 const [msgs, setMsgs] = useState<Msg[]>(threads[0]);
 const [input, setInput] = useState("");

 function openConv(i: number) {
  setActive(i);
  setMsgs(threads[i]);
  setInput("");
  setPane("thread");
 }
 // On phones only one pane fits, start in the inbox, open a thread on tap.
 const [pane, setPane] = useState<"list" | "thread">("list");
 const ref = useRef<HTMLDivElement>(null);
 useEffect(() => { ref.current?.scrollTo({ top: 9e9, behavior: "smooth" }); }, [msgs]);

 function send() {
  const t = input.trim(); if (!t) return;
  setInput("");
  setMsgs((m) => [...m, { role: "u", text: t }]);
  setTimeout(() => setMsgs((m) => [...m, { role: "a", text: mg.msg4 }]), 900);
 }

 return (
  <div className={"dash msg-dash pane-" + pane}>
   <aside className="msg-list" style={{ width: 330, flex: "none", background: "var(--paper)", borderRight: "1px solid var(--silver)", display: "flex", flexDirection: "column" }}>
    <SampleBanner ar={ar} />
    <div className="dtopbar" style={{ padding: "16px 18px" }}><div><h1 style={{ fontSize: 17 }}>{mg.title}</h1><div className="sub">{ar ? `${unread} غير مقروءة` : `${unread} unread`}</div></div><span style={{ flex: 1 }} /><span className="muted2"><Icon.edit size={18} /></span></div>
    <div style={{ padding: "0 16px 12px" }}><div className="dsearch" style={{ minWidth: 0 }}><Icon.search size={15} /> {mg.searchPh}</div></div>
    <div style={{ flex: 1, overflowY: "auto" }}>
     {convs.map((c, i) => (
      <div
       key={i}
       role="button"
       tabIndex={0}
       aria-current={i === active ? "true" : undefined}
       className={"conv" + (i === active ? " on" : "")}
       style={{ cursor: "pointer" }}
       onClick={() => openConv(i)}
       onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openConv(i); } }}
      >
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
     <button className="msg-back" aria-label={mg.backInbox} onClick={() => setPane("list")} style={{ border: "none", background: "transparent", cursor: "pointer", color: "var(--slate)", padding: 4, marginInlineStart: -4 }}><span style={{ display: "inline-flex", transform: ar ? "none" : "rotate(180deg)" }}><Icon.chevr size={20} /></span></button>
     <span className="avatar" style={{ background: convs[active][5] }}>{convs[active][0]}</span>
     <div><h2 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>{convs[active][1]}</h2><div className="sub"><Verified text={mg.verifiedOwner} /></div></div>
     <span style={{ flex: 1 }} />
     <span className="btn secondary sm"><Icon.eye size={14} /> {mg.viewListing}</span>
     <span className="btn primary sm"><Icon.coins size={14} /> {mg.makeOffer}</span>
    </div>
    <div className="row gap12" style={{ padding: "12px 24px", background: "var(--paper)", borderBottom: "1px solid var(--silver)" }}>
     <Photo kind="office" h={44} style={{ width: 60, borderRadius: 8, flex: "none" }} badges={[<Verified key="v" text="V" />]} />
     <div className="grow"><div style={{ fontSize: 13, fontWeight: 600 }}>{subjects[active][0]}</div><div className="mono muted" style={{ fontSize: 11 }}>{subjects[active][1]}</div></div>
     <span className="freeze open"><span className="dot" />{mg.open}</span>
    </div>
    <div ref={ref} style={{ flex: 1, overflowY: "auto", padding: "24px 32px" }}>
     <div style={{ maxWidth: 660 }} className="col gap14">
      {msgs.map((m, i) => m.role === "a"
       ? <div key={i} className="chatmsg a" style={{ background: "#fff", border: "1px solid var(--silver)" }}>{m.text}</div>
       : <div key={i} className="chatmsg u" style={{ alignSelf: "flex-end", background: "var(--ink)", color: "#fff" }}>{m.text}</div>)}
      <div className="card" style={{ padding: 18, boxShadow: "var(--sh-1)", maxWidth: 460 }}>
       <div className="row gap8" style={{ marginBottom: 14 }}><span style={{ color: "var(--harbor)" }}><Icon.cal size={17} /></span><span style={{ fontSize: 14, fontWeight: 700 }}>{mg.bookViewing}</span></div>
       <div className="cal" style={{ marginBottom: 14 }}>
        {days.map((d, i) => <div key={"h" + i} className="day"><div className="dn">{d}</div></div>)}
        {dates.map((d, i) => <div key={"d" + i} className="day"><div className={"dd " + (d === 13 ? "sel" : i < 5 ? "av" : "off")}>{d}</div></div>)}
       </div>
       <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
        {slots.map((s, i) => <span key={i} className={"slot " + s[1]}>{s[0]}</span>)}
       </div>
       <span className="btn primary" style={{ width: "100%", justifyContent: "center", marginTop: 14 }}>{mg.confirmThu}</span>
      </div>
     </div>
    </div>
    <div style={{ padding: "14px 32px 18px", background: "var(--paper)", borderTop: "1px solid var(--silver)" }}>
     <form onSubmit={(e) => { e.preventDefault(); send(); }} className="search focus" style={{ boxShadow: "none", border: "1px solid var(--silver-2)", padding: "8px 10px 8px 14px", display: "flex", alignItems: "center", gap: 8 }}>
      <span className="muted2"><Icon.plus size={18} /></span>
      <input value={input} onChange={(e) => setInput(e.target.value)} placeholder={mg.writePh} style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontSize: 14, color: "var(--ink)" }} />
      <button type="button" className="chip" onClick={() => setInput(mg.draftMsg)}><Icon.spark size={13} /> {mg.aiDraft}</button>
      <button type="submit" className="btn primary sm" aria-label={mg.send}><Icon.send size={15} /></button>
     </form>
    </div>
   </div>

   <aside className="msg-deal" style={{ width: 280, flex: "none", background: "var(--paper)", borderLeft: "1px solid var(--silver)", overflowY: "auto", padding: 20 }}>
    <div className="eyebrow" style={{ marginBottom: 12 }}>{mg.dealProgress}</div>
    <div className="tl">
     {timeline.map((e, i) => (
      <div key={i} className="ev"><div className="t" style={{ color: e[2] === "" ? "var(--slate-2)" : "var(--ink)" }}>{e[0]}</div>{e[1] && <div className="tm">{e[1]}</div>}</div>
     ))}
    </div>
    <span className="btn secondary" style={{ width: "100%", justifyContent: "center", marginTop: 16 }}>{mg.appointSat}</span>
    <div className="card pad" style={{ marginTop: 16, boxShadow: "none", background: "var(--cool)" }}>
     <div className="row gap8"><span style={{ color: "var(--green)" }}><Icon.shield size={15} /></span><span className="muted" style={{ fontSize: 11.5, lineHeight: 1.5 }}>{mg.appointNote}</span></div>
    </div>
   </aside>
  </div>
 );
}
