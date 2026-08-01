import { isLocale } from "@/i18n/config";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Icon } from "@/components/satkit";
import { getDictionary } from "@/i18n/getDictionary";

import SampleBanner from "@/components/SampleBanner";
export default function DealPage({ params }: { params: { locale: string } }) {
 if (!isLocale(params.locale)) notFound();
 const ar = params.locale === "ar";
 const d = getDictionary(params.locale).deal;
 const steps: [string, string][] = [
  [d.stepEnquiry, "done"], [d.stepViewing, "done"], [d.stepOffer, "done"], [d.stepContract, "on"], [d.stepHandover, ""],
 ];
 const terms: [string, string, string][] = [
  [d.term1Label, d.term1Val, d.term1Sub],
  [d.term2Label, d.term2Val, d.term2Sub],
  [d.term3Label, d.term3Val, d.term3Sub],
  [d.term4Label, d.term4Val, d.term4Sub],
  [d.term5Label, d.term5Val, d.term5Sub],
 ];
 const parties: [string, string, string][] = [
  [d.party1Name, d.party1Role, "you"],
  [d.party2Name, d.party2Role, "owner"],
 ];
 const next: [string, string, boolean][] = [
  [d.next1Title, d.next1Sub, true],
  [d.next2Title, d.next2Sub, false],
  [d.next3Title, d.next3Sub, false],
 ];
 return (
  <div style={{ background: "var(--paper)" }}>
   <div style={{ padding: "26px 24px 48px", maxWidth: 1080, margin: "0 auto" }}>
    <SampleBanner ar={ar} />
    <div className="row between wrap" style={{ alignItems: "flex-end", gap: 14 }}>
     <div><div className="eyebrow">{d.dealRoom}</div><h1 style={{ fontSize: "1.625rem", fontWeight: 700, letterSpacing: "-.02em", margin: "10px 0 0" }}>{d.title}</h1><div className="muted" style={{ fontSize: "0.84375rem", marginTop: 5 }}>{d.subtitle}</div></div>
     <span className="freeze open lg"><span className="dot" />{d.freezeTag}</span>
    </div>

    <div className="card pad" style={{ marginTop: 22, boxShadow: "var(--sh-1)", overflowX: "auto" }}>
     <div className="stepper" style={{ minWidth: 460 }}>
      {steps.map((s, i) => (
       <div key={i} className={"st " + s[1]}>
        <span className="dot">{s[1] === "done" ? <Icon.check size={16} /> : <span style={{ fontSize: "0.75rem", fontFamily: "var(--mono)" }}>{i + 1}</span>}</span>
        <span className="lb">{s[0]}</span>
       </div>
      ))}
     </div>
    </div>

    <div className="deal-grid" style={{ marginTop: 18 }}>
     <div className="card pad" style={{ boxShadow: "var(--sh-1)" }}>
      <div className="row between"><span className="tag" style={{ color: "var(--azure-d)", background: "var(--azure-wash)", borderColor: "var(--azure-l)" }}>{d.agreedTerms}</span><span className="mono muted" style={{ fontSize: "0.6875rem" }}>{d.fromOffer}</span></div>
      <div style={{ fontSize: "1.0625rem", fontWeight: 700, margin: "14px 0 4px" }}>{d.yourTerms}</div>
      <p className="muted" style={{ fontSize: "0.84375rem", lineHeight: 1.6, margin: 0 }}>{d.termsIntro}</p>
      <div className="col gap10" style={{ marginTop: 16 }}>
       {terms.map((r, i) => (
        <div key={i} className="row between" style={{ padding: "11px 0", borderTop: i ? "1px solid var(--silver)" : 0 }}>
         <span style={{ fontSize: "0.8125rem" }}>{r[0]}</span>
         <div style={{ textAlign: ar ? "left" : "right" }}><div className="mono" style={{ fontSize: "0.8125rem", fontWeight: 500 }}>{r[1]}</div><div className="muted" style={{ fontSize: "0.6875rem" }}>{r[2]}</div></div>
        </div>
       ))}
      </div>
      <div className="row gap10" style={{ marginTop: 16 }}>
       <Link href={`/${params.locale}/deal/termsheet`} className="btn secondary grow center" style={{ textDecoration: "none" }}><Icon.download size={14} /> {d.downloadTermSheet}</Link>
       <span className="btn primary grow center">{d.messageOwner} <Icon.arrow size={15} /></span>
      </div>
     </div>

     <div className="col gap18">
      <div className="card pad" style={{ boxShadow: "var(--sh-1)" }}>
       <div className="eyebrow" style={{ marginBottom: 12 }}>{d.parties}</div>
       {parties.map((p, i) => (
        <div key={i} className="row gap10" style={{ padding: "10px 0", borderTop: i ? "1px solid var(--silver)" : 0, alignItems: "center" }}>
         <span style={{ width: 30, height: 30, borderRadius: 8, background: p[2] === "owner" ? "var(--azure-wash)" : "var(--cool)", display: "flex", alignItems: "center", justifyContent: "center", color: p[2] === "owner" ? "var(--azure-d)" : "var(--slate)" }}>{p[2] === "owner" ? <Icon.shield size={15} /> : <Icon.user size={15} />}</span>
         <div className="grow"><div style={{ fontSize: "0.78125rem", fontWeight: 600 }}>{p[0]}</div><div className="muted" style={{ fontSize: "0.6875rem" }}>{p[1]}</div></div>
        </div>
       ))}
      </div>
      <div className="card pad" style={{ boxShadow: "var(--sh-1)" }}>
       <div className="row gap8" style={{ marginBottom: 10 }}><span style={{ color: "var(--azure-d)" }}><Icon.shield size={16} /></span><span style={{ fontSize: "0.84375rem", fontWeight: 700 }}>{d.whatNext}</span></div>
       <div className="col gap0">
        {next.map((n, i) => (
         <div key={i} className="row gap10" style={{ padding: "10px 0", borderTop: i ? "1px solid var(--silver)" : 0, alignItems: "flex-start" }}>
          <span style={{ width: 20, height: 20, borderRadius: "50%", flex: "none", marginTop: 1, background: n[2] ? "var(--harbor-d)" : "var(--cool)", color: n[2] ? "var(--on-brand)" : "var(--slate)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.6875rem", fontFamily: "var(--mono)" }}>{n[2] ? <Icon.check size={12} /> : i + 1}</span>
          <div><div style={{ fontSize: "0.78125rem", fontWeight: 600 }}>{n[0]}</div><div className="muted" style={{ fontSize: "0.6875rem", lineHeight: 1.5 }}>{n[1]}</div></div>
         </div>
        ))}
       </div>
       <p className="muted" style={{ fontSize: "0.71875rem", lineHeight: 1.55, margin: "12px 0 0", paddingTop: 10, borderTop: "1px solid var(--silver)" }}>{d.disclaimer}</p>
      </div>
     </div>
    </div>
   </div>
  </div>
 );
}
