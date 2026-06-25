import { isLocale } from "@/i18n/config";
import { notFound } from "next/navigation";
import { Icon } from "@/components/satkit";

export default function DealPage({ params }: { params: { locale: string } }) {
 if (!isLocale(params.locale)) notFound();
 const steps: [string, string][] = [["Enquiry", "done"], ["Viewing", "done"], ["Offer", "done"], ["Contract", "on"], ["Handover", ""]];
 const terms: [string, string, string][] = [
  ["Annual rent", "464,000 SAR", "1,450/m² · 320 m²"],
  ["Term", "5 years", "2 months rent-free"],
  ["Escalation", "Open · re-price at renewal", "Not under the freeze"],
  ["Deposit", "5% · 23,200 SAR", "Paid direct to landlord"],
  ["Ejar registration", "By landlord / broker", "Standard Ejar lease"],
 ];
 const parties: [string, string, string][] = [
  ["You · Acme Co.", "Occupier", "you"],
  ["Olaya Towers Co.", "Verified owner · responds in 2h", "owner"],
 ];
 const next: [string, string, boolean][] = [
  ["Owner shares the Ejar lease draft", "Sent to your email and here", true],
  ["Both parties sign in Ejar", "Directly between you and the owner/broker", false],
  ["Deposit paid & keys handed over", "We mark the deal complete", false],
 ];
 return (
  <div style={{ background: "var(--paper)" }}>
   <div style={{ padding: "26px 24px 48px", maxWidth: 1080, margin: "0 auto" }}>
    <div className="row between wrap" style={{ alignItems: "flex-end", gap: 14 }}>
     <div><div className="eyebrow">Deal room · SR-20418</div><h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-.02em", margin: "10px 0 0" }}>Grade A Office, Olaya Tower</h1><div className="muted" style={{ fontSize: 13.5, marginTop: 5 }}>Olaya Towers Co. · 320 m² · Al Olaya</div></div>
     <span className="freeze open lg"><span className="dot" />Open · first-lease</span>
    </div>

    <div className="card pad" style={{ marginTop: 22, boxShadow: "var(--sh-1)", overflowX: "auto" }}>
     <div className="stepper" style={{ minWidth: 460 }}>
      {steps.map((s, i) => (
       <div key={i} className={"st " + s[1]}>
        <span className="dot">{s[1] === "done" ? <Icon.check size={16} /> : <span style={{ fontSize: 12, fontFamily: "var(--mono)" }}>{i + 1}</span>}</span>
        <span className="lb">{s[0]}</span>
       </div>
      ))}
     </div>
    </div>

    <div className="deal-grid" style={{ marginTop: 18 }}>
     <div className="card pad" style={{ boxShadow: "var(--sh-1)" }}>
      <div className="row between"><span className="tag" style={{ color: "var(--azure-d)", background: "var(--azure-wash)", borderColor: "var(--azure-l)" }}>Agreed terms</span><span className="mono muted" style={{ fontSize: 11 }}>From your accepted offer</span></div>
      <div style={{ fontSize: 17, fontWeight: 700, margin: "14px 0 4px" }}>Your deal terms</div>
      <p className="muted" style={{ fontSize: 13.5, lineHeight: 1.6, margin: 0 }}>These are the terms you and the owner agreed. The Ejar lease itself is signed directly between you and the owner/broker, SAT keeps both sides on the same page and tracks the milestones.</p>
      <div className="col gap10" style={{ marginTop: 16 }}>
       {terms.map((r, i) => (
        <div key={i} className="row between" style={{ padding: "11px 0", borderTop: i ? "1px solid var(--silver)" : 0 }}>
         <span style={{ fontSize: 13 }}>{r[0]}</span>
         <div style={{ textAlign: "right" }}><div className="mono" style={{ fontSize: 13, fontWeight: 500 }}>{r[1]}</div><div className="muted" style={{ fontSize: 11 }}>{r[2]}</div></div>
        </div>
       ))}
      </div>
      <div className="row gap10" style={{ marginTop: 16 }}>
       <span className="btn secondary grow center"><Icon.download size={14} /> Download term sheet</span>
       <span className="btn primary grow center">Message the owner <Icon.arrow size={15} /></span>
      </div>
     </div>

     <div className="col gap18">
      <div className="card pad" style={{ boxShadow: "var(--sh-1)" }}>
       <div className="eyebrow" style={{ marginBottom: 12 }}>Parties</div>
       {parties.map((p, i) => (
        <div key={i} className="row gap10" style={{ padding: "10px 0", borderTop: i ? "1px solid var(--silver)" : 0, alignItems: "center" }}>
         <span style={{ width: 30, height: 30, borderRadius: 8, background: p[2] === "owner" ? "var(--azure-wash)" : "var(--cool)", display: "flex", alignItems: "center", justifyContent: "center", color: p[2] === "owner" ? "var(--azure-d)" : "var(--slate)" }}>{p[2] === "owner" ? <Icon.shield size={15} /> : <Icon.user size={15} />}</span>
         <div className="grow"><div style={{ fontSize: 12.5, fontWeight: 600 }}>{p[0]}</div><div className="muted" style={{ fontSize: 11 }}>{p[1]}</div></div>
        </div>
       ))}
      </div>
      <div className="card pad" style={{ boxShadow: "var(--sh-1)" }}>
       <div className="row gap8" style={{ marginBottom: 10 }}><span style={{ color: "var(--azure-d)" }}><Icon.shield size={16} /></span><span style={{ fontSize: 13.5, fontWeight: 700 }}>What happens next</span></div>
       <div className="col gap0">
        {next.map((n, i) => (
         <div key={i} className="row gap10" style={{ padding: "10px 0", borderTop: i ? "1px solid var(--silver)" : 0, alignItems: "flex-start" }}>
          <span style={{ width: 20, height: 20, borderRadius: "50%", flex: "none", marginTop: 1, background: n[2] ? "var(--green)" : "var(--cool)", color: n[2] ? "#fff" : "var(--slate)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontFamily: "var(--mono)" }}>{n[2] ? <Icon.check size={12} /> : i + 1}</span>
          <div><div style={{ fontSize: 12.5, fontWeight: 600 }}>{n[0]}</div><div className="muted" style={{ fontSize: 11, lineHeight: 1.5 }}>{n[1]}</div></div>
         </div>
        ))}
       </div>
       <p className="muted" style={{ fontSize: 11.5, lineHeight: 1.55, margin: "12px 0 0", paddingTop: 10, borderTop: "1px solid var(--silver)" }}>The Ejar contract, deposit and registration are handled directly between you and the owner or their licensed broker. SAT does not sign or hold funds, we verify the parties and track the deal.</p>
      </div>
     </div>
    </div>
   </div>
  </div>
 );
}
