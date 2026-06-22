import { isLocale } from "@/i18n/config";
import { notFound } from "next/navigation";
import { Icon } from "@/components/satkit";

export default function PostRequirementPage({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound();
  return (
    <div style={{ background: "var(--cool)" }}>
      <div style={{ padding: "36px 24px 48px", maxWidth: 880, margin: "0 auto" }}>
        <div className="eyebrow">Post a requirement</div>
        <h1 className="serif" style={{ fontSize: 34, fontWeight: 500, letterSpacing: "-.02em", margin: "12px 0 6px" }}>Tell the market what you need</h1>
        <p className="muted" style={{ fontSize: 15.5, maxWidth: 560, lineHeight: 1.6 }}>Post your requirement and verified owners and SAT bring matching space to you. The reverse of searching.</p>

        <div className="card" style={{ marginTop: 30, padding: 0, overflow: "hidden" }}>
          <div className="row gap10" style={{ padding: "16px 24px", borderBottom: "1px solid var(--silver)", background: "var(--cool)" }}>
            <span style={{ color: "var(--harbor)" }}><Icon.doc size={18} /></span>
            <div style={{ fontSize: 14, fontWeight: 600 }}>New requirement</div>
            <span style={{ flex: 1 }} />
            <span className="tag">Draft</span>
          </div>
          <div className="req-grid" style={{ padding: 28 }}>
            <div className="field" style={{ gridColumn: "1 / -1" }}>
              <label>What are you looking for?</label>
              <div className="input"><span style={{ color: "var(--ink)" }}>Regional HQ office, Grade A, Olaya or KAFD</span></div>
            </div>
            <div className="field">
              <label>Asset type</label>
              <div className="row gap8 wrap"><span className="chip on">Office</span><span className="chip">Retail</span><span className="chip">Warehouse</span></div>
            </div>
            <div className="field">
              <label>Transaction</label>
              <div className="seg" style={{ alignSelf: "flex-start" }}><span className="on">Lease</span><span>Buy</span></div>
            </div>
            <div className="field">
              <label>Size range</label>
              <div className="row gap10"><div className="input grow between"><span>300</span><span className="mono muted2">m²</span></div><span className="muted">to</span><div className="input grow between"><span>600</span><span className="mono muted2">m²</span></div></div>
            </div>
            <div className="field">
              <label>Budget ceiling</label>
              <div className="input between"><span>1,600</span><span className="mono muted2">SAR/m²·yr</span></div>
            </div>
            <div className="field" style={{ gridColumn: "1 / -1" }}>
              <label>Preferred districts</label>
              <div className="input between"><span className="row gap8 wrap"><span className="chip on" style={{ padding: "4px 9px" }}>Al Olaya ×</span><span className="chip on" style={{ padding: "4px 9px" }}>KAFD ×</span><span className="chip on" style={{ padding: "4px 9px" }}>Hittin ×</span></span><span className="muted2"><Icon.pin size={16} /></span></div>
            </div>
            <div className="field" style={{ gridColumn: "1 / -1" }}>
              <label>Must-haves <span className="hint">(optional)</span></label>
              <div className="row gap10 wrap"><span className="chip on">Fitted</span><span className="chip on">Parking</span><span className="chip">Raised floor</span><span className="chip">24/7 access</span><span className="chip">Metro nearby</span></div>
            </div>
            <div className="field" style={{ gridColumn: "1 / -1" }}>
              <label>Move-in timeline</label>
              <div className="seg" style={{ alignSelf: "flex-start" }}><span>Immediate</span><span className="on">1–3 months</span><span>3–6 months</span><span>Flexible</span></div>
            </div>
          </div>
          <div className="row between wrap" style={{ padding: "18px 28px", borderTop: "1px solid var(--silver)", background: "var(--azure-wash)", gap: 10 }}>
            <div className="row gap10"><span style={{ color: "var(--azure-d)" }}><Icon.spark size={18} /></span><div style={{ fontSize: 13.5 }}><b style={{ fontWeight: 600 }}>~24 verified spaces</b> <span className="muted">match this requirement today</span></div></div>
            <span className="mono muted" style={{ fontSize: 11.5 }}>Updated live</span>
          </div>
        </div>

        <div className="row between wrap" style={{ marginTop: 26, gap: 12 }}>
          <span className="muted" style={{ fontSize: 12.5 }}>Visible to verified owners &amp; SAT only · your identity stays private until you respond.</span>
          <div className="row gap12"><span className="btn secondary">Save draft</span><span className="btn primary lg">Post requirement <Icon.arrow size={16} /></span></div>
        </div>
      </div>
    </div>
  );
}
