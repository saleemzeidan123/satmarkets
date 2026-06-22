import { isLocale } from "@/i18n/config";
import { notFound } from "next/navigation";
import { Icon } from "@/components/satkit";

export default function DealPage({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound();
  const steps: [string, string][] = [["Enquiry", "done"], ["Viewing", "done"], ["Offer", "done"], ["Contract", "on"], ["E-sign", ""], ["Deposit", ""], ["Keys", ""]];
  const terms: [string, string, string][] = [
    ["Annual rent", "464,000 SAR", "1,450/m² · 320 m²"],
    ["Term", "5 years", "2 months rent-free"],
    ["Escalation", "Open · re-price at renewal", "Not under the freeze"],
    ["Deposit", "5% · 23,200 SAR", "Held in escrow"],
    ["Ejar registration", "Included", "Filed on signature"],
  ];
  const sigs: [string, string, string][] = [
    ["You · Acme Co.", "Ready to sign", "pend"],
    ["Olaya Towers Co.", "Awaiting your signature", "off"],
  ];
  return (
    <div style={{ background: "var(--paper)" }}>
      <div style={{ padding: "26px 24px 48px", maxWidth: 1080, margin: "0 auto" }}>
        <div className="row between wrap" style={{ alignItems: "flex-end", gap: 14 }}>
          <div><div className="eyebrow">Deal room · SR-20418</div><h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-.02em", margin: "10px 0 0" }}>Grade A Office, Olaya Tower</h1><div className="muted" style={{ fontSize: 13.5, marginTop: 5 }}>Olaya Towers Co. · 320 m² · Al Olaya</div></div>
          <span className="freeze open lg"><span className="dot" />Open · first-lease</span>
        </div>

        <div className="card pad" style={{ marginTop: 22, boxShadow: "var(--sh-1)", overflowX: "auto" }}>
          <div className="stepper" style={{ minWidth: 560 }}>
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
            <div className="row between"><span className="tag" style={{ color: "var(--azure-d)", background: "var(--azure-wash)", borderColor: "var(--azure-l)" }}>Current step · Ejar contract</span><span className="mono muted" style={{ fontSize: 11 }}>Auto-generated</span></div>
            <div style={{ fontSize: 17, fontWeight: 700, margin: "14px 0 4px" }}>Review your Ejar-ready contract</div>
            <p className="muted" style={{ fontSize: 13.5, lineHeight: 1.6, margin: 0 }}>We’ve drafted a standard Ejar lease from your accepted offer. Review the terms; both parties e-sign, then the deposit is held in escrow until handover.</p>
            <div className="col gap10" style={{ marginTop: 16 }}>
              {terms.map((r, i) => (
                <div key={i} className="row between" style={{ padding: "11px 0", borderTop: i ? "1px solid var(--silver)" : 0 }}>
                  <span style={{ fontSize: 13 }}>{r[0]}</span>
                  <div style={{ textAlign: "right" }}><div className="mono" style={{ fontSize: 13, fontWeight: 500 }}>{r[1]}</div><div className="muted" style={{ fontSize: 11 }}>{r[2]}</div></div>
                </div>
              ))}
            </div>
            <div className="row gap10" style={{ marginTop: 16 }}>
              <span className="btn secondary grow center"><Icon.download size={14} /> Download draft</span>
              <span className="btn primary grow center">Approve &amp; e-sign <Icon.arrow size={15} /></span>
            </div>
          </div>

          <div className="col gap18">
            <div className="card pad" style={{ boxShadow: "var(--sh-1)" }}>
              <div className="eyebrow" style={{ marginBottom: 12 }}>Signatures</div>
              {sigs.map((p, i) => (
                <div key={i} className="row gap10" style={{ padding: "10px 0", borderTop: i ? "1px solid var(--silver)" : 0, alignItems: "center" }}>
                  <span style={{ width: 30, height: 30, borderRadius: 8, background: "var(--cool)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--slate)" }}><Icon.edit size={15} /></span>
                  <div className="grow"><div style={{ fontSize: 12.5, fontWeight: 600 }}>{p[0]}</div><div className="muted" style={{ fontSize: 11 }}>{p[1]}</div></div>
                  <span className={"statusdot " + p[2]} style={{ fontSize: 11 }}>{p[2] === "pend" ? "You" : "Next"}</span>
                </div>
              ))}
            </div>
            <div className="card pad" style={{ boxShadow: "var(--sh-1)" }}>
              <div className="row gap8" style={{ marginBottom: 10 }}><span style={{ color: "var(--green)" }}><Icon.shield size={16} /></span><span style={{ fontSize: 13.5, fontWeight: 700 }}>Escrow protection</span></div>
              <p className="muted" style={{ fontSize: 12.5, lineHeight: 1.6, margin: 0 }}>Your 5% deposit (23,200 SAR) is held by a licensed provider and released only on verified handover. ZATCA tax invoice issued automatically.</p>
              <div className="row gap10" style={{ marginTop: 12 }}><span style={{ width: 38, height: 26, borderRadius: 6, background: "var(--ink)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 8, fontFamily: "var(--mono)" }}>mada</span><span className="mono muted" style={{ fontSize: 11 }}>•••• 4291 · escrow</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
