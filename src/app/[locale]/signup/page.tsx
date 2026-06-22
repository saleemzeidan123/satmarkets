import { isLocale } from "@/i18n/config";
import { notFound } from "next/navigation";
import { Icon, Logo, Mark, HARBOR } from "@/components/satkit";

export default function SignupPage({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound();
  return (
    <div className="auth-split">
      <div className="auth-brand">
        <div style={{ position: "absolute", right: -60, bottom: -70, opacity: .14 }}><Mark size={360} base="#2a3742" lit={HARBOR} /></div>
        <Logo size={30} rev />
        <div style={{ marginTop: "auto", position: "relative" }}>
          <div className="serif" style={{ fontSize: 34, fontWeight: 500, lineHeight: 1.12, letterSpacing: "-.02em" }}>The verified commercial exchange for Saudi Arabia.</div>
          <div className="col gap12" style={{ marginTop: 26 }}>
            {["Every owner verified, every listing permit-checked", "Decision-grade Rent Index & Location Intelligence", "Deals end-to-end — Ejar contract & escrow"].map((b, i) => (
              <div key={i} className="row gap10" style={{ fontSize: 14, color: "#C7CFD7" }}><span style={{ color: "var(--azure-l)" }}><Icon.check size={16} /></span>{b}</div>
            ))}
          </div>
          <div className="row gap8" style={{ marginTop: 30 }}>
            {["REGA-licensed", "PDPL", "Ejar", "Nafath"].map((t, i) => <span key={i} className="tag" style={{ color: "rgba(255,255,255,.7)", borderColor: "rgba(255,255,255,.2)" }}>{t}</span>)}
          </div>
        </div>
      </div>
      <div className="auth-form">
        <div style={{ width: 460, maxWidth: "100%" }}>
          <div className="mono muted" style={{ fontSize: 11, letterSpacing: ".06em" }}>by SAT Real Estate</div>
          <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-.02em", margin: "10px 0 4px" }}>Create your account</h1>
          <p className="muted" style={{ fontSize: 14, margin: 0 }}>Join the exchange in two minutes.</p>
          <div className="seg" style={{ margin: "20px 0 6px", width: "100%" }}><span className="on" style={{ flex: 1, textAlign: "center" }}>Occupier</span><span style={{ flex: 1, textAlign: "center" }}>Owner</span><span style={{ flex: 1, textAlign: "center" }}>Broker</span></div>
          <div className="col gap14" style={{ marginTop: 14 }}>
            <div className="row gap12">
              <div className="field grow"><label>First name</label><div className="input"><span className="muted">Ahmed</span></div></div>
              <div className="field grow"><label>Last name</label><div className="input"><span className="muted">Khalid</span></div></div>
            </div>
            <div className="field"><label>Work email</label><div className="input"><span className="muted">you@company.sa</span></div></div>
            <div className="field"><label>Mobile</label><div className="input"><span className="muted">+966 5X XXX XXXX</span></div></div>
            <div className="field"><label>Password</label><div className="input between"><span className="muted">Create a password</span><Icon.eye size={16} /></div></div>
            <span className="btn primary lg" style={{ justifyContent: "center" }}>Create account</span>
            <div className="row gap10" style={{ alignItems: "center" }}><div style={{ flex: 1, height: 1, background: "var(--silver)" }} /><span className="muted" style={{ fontSize: 11.5 }}>or</span><div style={{ flex: 1, height: 1, background: "var(--silver)" }} /></div>
            <span className="btn secondary" style={{ justifyContent: "center" }}><span style={{ width: 16, height: 16, borderRadius: 4, background: "var(--ink)", display: "inline-block" }} /> Continue with Nafath</span>
          </div>
          <p className="muted" style={{ fontSize: 11.5, textAlign: "center", marginTop: 18, lineHeight: 1.5 }}>By continuing you agree to our <b style={{ color: "var(--azure-d)" }}>Terms</b> &amp; <b style={{ color: "var(--azure-d)" }}>PDPL Privacy Policy</b>.</p>
        </div>
      </div>
    </div>
  );
}
