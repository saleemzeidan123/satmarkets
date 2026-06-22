import { isLocale } from "@/i18n/config";
import { notFound } from "next/navigation";
import { Icon, Photo, Verified } from "@/components/satkit";

export default function MessagesPage({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound();
  const convs: [string, string, string, string, boolean, string][] = [
    ["OT", "Olaya Towers Co.", "Permit cleared — shall we book a viewing?", "2m", true, "var(--harbor)"],
    ["KD", "KAFD Devco", "The floor is available from March.", "1h", true, "var(--slate)"],
    ["SA", "SAT Advisor", "3 verified matches in Al Olaya.", "3h", false, "var(--azure)"],
    ["TH", "Tahlia Holdings", "I’ll send the brochure shortly.", "Tue", false, "var(--harbor)"],
  ];
  const days = ["M", "T", "W", "T", "F", "S", "S"];
  const dates = [10, 11, 12, 13, 14, 15, 16];
  const slots: [string, string][] = [["09:00", "av"], ["10:00", "on"], ["11:30", "av"], ["13:00", "off"], ["15:00", "av"], ["16:30", "av"]];
  const timeline: [string, string, string][] = [
    ["Enquiry sent", "6 days ago", "done"],
    ["Viewing — Thu 10:00", "Scheduled", "on"],
    ["Offer", "Not started", ""],
    ["Ejar contract", "", ""],
    ["Deposit · escrow", "", ""],
  ];
  return (
    <div className="dash msg-dash">
      {/* conversation list */}
      <aside className="msg-list" style={{ width: 330, flex: "none", background: "var(--paper)", borderRight: "1px solid var(--silver)", display: "flex", flexDirection: "column" }}>
        <div className="dtopbar" style={{ padding: "16px 18px" }}><div><h1 style={{ fontSize: 17 }}>Messages</h1><div className="sub">2 unread</div></div><span style={{ flex: 1 }} /><span className="muted2"><Icon.edit size={18} /></span></div>
        <div style={{ padding: "0 16px 12px" }}><div className="dsearch" style={{ minWidth: 0 }}><Icon.search size={15} /> Search…</div></div>
        <div style={{ flex: 1, overflowY: "auto" }}>
          {convs.map((c, i) => (
            <div key={i} className={"conv" + (i === 0 ? " on" : "")}>
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

      {/* thread */}
      <div className="dmain" style={{ display: "flex", flexDirection: "column", background: "var(--cool)" }}>
        <div className="dtopbar">
          <span className="avatar" style={{ background: "var(--harbor)" }}>OT</span>
          <div><h1 style={{ fontSize: 16 }}>Olaya Towers Co.</h1><div className="sub"><Verified text="Verified owner" /> · responds in ~2h</div></div>
          <span style={{ flex: 1 }} />
          <span className="btn secondary sm"><Icon.eye size={14} /> View listing</span>
          <span className="btn primary sm"><Icon.coins size={14} /> Make offer</span>
        </div>
        <div className="row gap12" style={{ padding: "12px 24px", background: "var(--paper)", borderBottom: "1px solid var(--silver)" }}>
          <Photo kind="office" h={44} style={{ width: 60, borderRadius: 8, flex: "none" }} badges={[<Verified key="v" text="V" />]} />
          <div className="grow"><div style={{ fontSize: 13, fontWeight: 600 }}>Grade A Office, Olaya Tower</div><div className="mono muted" style={{ fontSize: 11 }}>1,450 SAR/m² · 320 m² · Al Olaya</div></div>
          <span className="freeze open"><span className="dot" />Open</span>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "24px 32px" }}>
          <div style={{ maxWidth: 660 }} className="col gap14">
            <div className="chatmsg a" style={{ background: "#fff", border: "1px solid var(--silver)" }}>Hello — thanks for your interest in the Olaya Tower floor. It’s fitted and available now. Happy to answer any questions.</div>
            <div className="chatmsg u" style={{ alignSelf: "flex-end", background: "var(--ink)", color: "#fff" }}>Looks ideal for our HQ. Could we arrange a viewing this week?</div>
            <div className="chatmsg a" style={{ background: "#fff", border: "1px solid var(--silver)" }}>Of course. I’ve proposed a few slots — pick what suits you.</div>
            <div className="card" style={{ padding: 18, boxShadow: "var(--sh-1)", maxWidth: 460 }}>
              <div className="row gap8" style={{ marginBottom: 14 }}><span style={{ color: "var(--harbor)" }}><Icon.cal size={17} /></span><span style={{ fontSize: 14, fontWeight: 700 }}>Book a viewing</span></div>
              <div className="cal" style={{ marginBottom: 14 }}>
                {days.map((d, i) => <div key={"h" + i} className="day"><div className="dn">{d}</div></div>)}
                {dates.map((d, i) => <div key={"d" + i} className="day"><div className={"dd " + (d === 13 ? "sel" : i < 5 ? "av" : "off")}>{d}</div></div>)}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
                {slots.map((s, i) => <span key={i} className={"slot " + s[1]}>{s[0]}</span>)}
              </div>
              <span className="btn primary" style={{ width: "100%", justifyContent: "center", marginTop: 14 }}>Confirm · Thu 10:00</span>
            </div>
          </div>
        </div>
        <div style={{ padding: "14px 32px 18px", background: "var(--paper)", borderTop: "1px solid var(--silver)" }}>
          <div className="search focus" style={{ boxShadow: "none", border: "1px solid var(--silver-2)", padding: "11px 14px" }}>
            <span className="muted2"><Icon.plus size={18} /></span>
            <div className="q"><span className="ph">Write a message…</span></div>
            <span className="chip"><Icon.spark size={13} /> AI draft</span>
            <span className="btn primary sm"><Icon.send size={15} /></span>
          </div>
        </div>
      </div>

      {/* deal context */}
      <aside className="msg-deal" style={{ width: 280, flex: "none", background: "var(--paper)", borderLeft: "1px solid var(--silver)", overflowY: "auto", padding: 20 }}>
        <div className="eyebrow" style={{ marginBottom: 12 }}>Deal progress</div>
        <div className="tl">
          {timeline.map((e, i) => (
            <div key={i} className="ev"><div className="t" style={{ color: e[2] === "" ? "var(--slate-2)" : "var(--ink)" }}>{e[0]}</div>{e[1] && <div className="tm">{e[1]}</div>}</div>
          ))}
        </div>
        <span className="btn secondary" style={{ width: "100%", justifyContent: "center", marginTop: 16 }}>Appoint SAT to represent me</span>
        <div className="card pad" style={{ marginTop: 16, boxShadow: "none", background: "var(--cool)" }}>
          <div className="row gap8"><span style={{ color: "var(--green)" }}><Icon.shield size={15} /></span><span className="muted" style={{ fontSize: 11.5, lineHeight: 1.5 }}>Keep it on-platform — deposits via escrow are protected. Never pay an owner directly.</span></div>
        </div>
      </aside>
    </div>
  );
}
