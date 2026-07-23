"use client";
import { useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/satkit";
import { getDictionary } from "@/i18n/getDictionary";

export default function PostRequirementPage({ params }: { params: { locale: string } }) {
 const locale = params.locale === "ar" ? "ar" : "en";
 const ar = locale === "ar";
 const pr = getDictionary(locale).postReq;
 const DISTRICTS: [string, string][] = ar ? [
  ["العليا", "d2222222-2222-2222-2222-222222222222"],
  ["كافد", "d1111111-1111-1111-1111-111111111111"],
  ["الملز", "d3333333-3333-3333-3333-333333333333"],
  ["السلي", "d4444444-4444-4444-4444-444444444444"],
  ["غرناطة", "d5555555-5555-5555-5555-555555555555"],
 ] : [
  ["Al Olaya", "d2222222-2222-2222-2222-222222222222"],
  ["KAFD", "d1111111-1111-1111-1111-111111111111"],
  ["Al Malaz", "d3333333-3333-3333-3333-333333333333"],
  ["Sulay", "d4444444-4444-4444-4444-444444444444"],
  ["Granada", "d5555555-5555-5555-5555-555555555555"],
 ];
 const ASSETS = ["office", "retail", "warehouse", "medical", "showroom"];
 const assetLbl = (a: string) => ar
  ? ({ office: "مكاتب", retail: "تجزئة", warehouse: "مستودعات", medical: "طبي", showroom: "معارض" } as Record<string, string>)[a] || a
  : a[0].toUpperCase() + a.slice(1);
 const MUSTS = ar
  ? ["مجهّز", "موقف سيارات", "أرضية مرتفعة", "دخول 24/7", "قرب المترو", "واجهة شارع", "أبواب تحميل"]
  : ["Fitted", "Parking", "Raised floor", "24/7 access", "Metro nearby", "Street-front", "Dock doors"];
 const TIMELINES = ar ? ["فوري", "1–3 أشهر", "3–6 أشهر", "مرن"] : ["Immediate", "1–3 months", "3–6 months", "Flexible"];

 const [title, setTitle] = useState("");
 const [asset, setAsset] = useState("office");
 const [deal, setDeal] = useState("lease");
 const [sizeMin, setSizeMin] = useState("");
 const [sizeMax, setSizeMax] = useState("");
 const [budget, setBudget] = useState("");
 const [districts, setDistricts] = useState<string[]>([DISTRICTS[0][0]]);
 const [musts, setMusts] = useState<string[]>([MUSTS[0]]);
 const [timeline, setTimeline] = useState(TIMELINES[1]);
 const [cName, setCName] = useState("");
 const [cEmail, setCEmail] = useState("");
 const [cPhone, setCPhone] = useState("");
 const [busy, setBusy] = useState(false);
 const [consent, setConsent] = useState(false);
 const [done, setDone] = useState<null | { ref: string; match: number; notified: string[]; id: string }>(null);
 const [err, setErr] = useState("");

 const toggle = (arr: string[], set: (v: string[]) => void, v: string) => set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

 async function submit() {
  setErr(""); setBusy(true);
  try {
   const district_id = districts.length ? DISTRICTS.find((d) => d[0] === districts[0])?.[1] : null;
   const r = await fetch("/api/requirements", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({
    title: title || (ar ? `طلب ${assetLbl(asset)} ${deal === "lease" ? "إيجار" : "شراء"}` : `${asset} ${deal} requirement`), asset_type: asset, deal_type: deal, district_id, city: "Riyadh",
    size_min: Number(sizeMin) || null, size_max: Number(sizeMax) || null, budget: Number(budget) || null,
    timeline, must_haves: musts, notes: districts.length > 1 ? "Districts: " + districts.join(", ") : null,
    contact_name: cName || null, contact_email: cEmail || null, contact_phone: cPhone || null,
   }) });
   const j = await r.json();
   if (j.error) { setErr(j.error); setBusy(false); return; }
   setDone({ ref: j.ref, match: j.match, notified: j.notified || [], id: j.id || "" });
  } catch { setErr(pr.submitError); }
  setBusy(false);
 }

 if (done) {
  return (
   <div style={{ background: "var(--cool)" }}>
    <div style={{ padding: "40px 24px 56px", maxWidth: 720, margin: "0 auto" }}>
     <div className="card pad" style={{ boxShadow: "var(--sh-1)", textAlign: "center" }}>
      <span style={{ width: 56, height: 56, borderRadius: "50%", background: "var(--green)", color: "var(--on-brand)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}><Icon.check size={28} /></span>
      <div className="eyebrow" style={{ marginTop: 16 }}>{ar ? `الطلب ${done.ref} مباشر` : `Requirement ${done.ref} is live`}</div>
      <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-.02em", margin: "8px 0 6px" }}>{pr.successTitle}</h1>
      <p className="muted" style={{ fontSize: 14, lineHeight: 1.6, maxWidth: 460, margin: "0 auto" }}>{pr.successBody}</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, margin: "22px 0" }}>
       <div className="card pad" style={{ boxShadow: "none", background: "var(--cool)" }}><div className="tnum" style={{ fontSize: 26, fontWeight: 600, color: "var(--azure-d)" }}>{done.match}</div><div className="muted" style={{ fontSize: 12 }}>{pr.matchToday}</div></div>
       <div className="card pad" style={{ boxShadow: "none", background: "var(--cool)" }}><div className="tnum" style={{ fontSize: 26, fontWeight: 600 }}>3</div><div className="muted" style={{ fontSize: 12 }}>{pr.audiencesNotified}</div></div>
      </div>
      <div className="col gap8" style={{ textAlign: ar ? "right" : "left", maxWidth: 420, margin: "0 auto 22px" }}>
       {done.notified.map((n, i) => (
        <div key={i} className="row gap8" style={{ fontSize: 13 }}><span style={{ color: "var(--green)" }}><Icon.check size={15} /></span>{n}</div>
       ))}
      </div>
      <div className="row gap10" style={{ justifyContent: "center" }}>
       <Link href={`/${locale}/requirements/${done.id}`} className="btn primary lg">{pr.viewReq} <Icon.arrow size={16} /></Link>
       <Link href={`/${locale}/requirements`} className="btn secondary">{pr.allReqs}</Link>
      </div>
     </div>
    </div>
   </div>
  );
 }

 return (
  <div style={{ background: "var(--cool)" }}>
   <div style={{ padding: "36px 24px 48px", maxWidth: 880, margin: "0 auto" }}>
    <div className="eyebrow">{pr.postReqTitle}</div>
    <h1 className="serif" style={{ fontSize: 34, fontWeight: 500, letterSpacing: "-.02em", margin: "12px 0 6px" }}>{pr.tellMarket}</h1>
    <p className="muted" style={{ fontSize: 15.5, maxWidth: 560, lineHeight: 1.6 }}>{pr.intro}</p>

    {/* Codex P1-02. This was a div of unassociated <label>s, <span onClick> pseudo
        radios and a submit button that lived outside any form, and it collected a
        name, an email and a phone number, personal data under the PDPL, while
        displaying a "PDPL compliant" badge and capturing no consent at all. It is now
        a real form: labels tied to inputs by id, radios that are radios, and an
        explicit consent checkbox that must be ticked before anything is sent. */}
    <form onSubmit={(e) => { e.preventDefault(); submit(); }} noValidate={false}>
    <div className="card" style={{ marginTop: 30, padding: 0, overflow: "hidden" }}>
     <div className="row gap10" style={{ padding: "16px 24px", borderBottom: "1px solid var(--silver)", background: "var(--cool)" }}>
      <span style={{ color: "var(--harbor)" }}><Icon.doc size={18} /></span>
      <div style={{ fontSize: 14, fontWeight: 600 }}>{pr.newReq}</div>
      <span style={{ flex: 1 }} /><span className="tag">{pr.draft}</span>
     </div>
     <div className="req-grid" style={{ padding: 28 }}>
      <div className="field" style={{ gridColumn: "1 / -1" }}>
       <label htmlFor="pr-title">{pr.lookingFor}</label>
       <input id="pr-title" name="title" required className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={pr.lookingForPh} style={{ ...inp, textAlign: ar ? "right" : "left" }} />
      </div>

      <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}>
       <legend style={{ padding: 0 }}>{pr.assetType}</legend>
       <div className="row gap8 wrap" role="group">{ASSETS.map((a) => (
        <button key={a} type="button" aria-pressed={asset === a} className={"chip" + (asset === a ? " on" : "")} style={chip} onClick={() => setAsset(a)}>{assetLbl(a)}</button>
       ))}</div>
      </fieldset>

      <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}>
       <legend style={{ padding: 0 }}>{pr.transaction}</legend>
       <div className="seg" style={{ alignSelf: "flex-start" }}>{["lease", "sale"].map((d) => (
        <label key={d} className={deal === d ? "on" : ""} style={{ cursor: "pointer" }}>
         <input type="radio" name="deal" value={d} checked={deal === d} onChange={() => setDeal(d)} className="sronly" />
         {d === "lease" ? (pr.lease) : (pr.buy)}
        </label>
       ))}</div>
      </fieldset>

      <div className="field">
       <label htmlFor="pr-size-min">{pr.sizeRange}</label>
       <div className="row gap10">
        <input id="pr-size-min" name="sizeMin" inputMode="numeric" className="input grow" value={sizeMin} onChange={(e) => setSizeMin(e.target.value)} style={inp} aria-label={pr.sizeRange} />
        <span className="muted">{pr.to}</span>
        <input id="pr-size-max" name="sizeMax" inputMode="numeric" className="input grow" value={sizeMax} onChange={(e) => setSizeMax(e.target.value)} style={inp} aria-label={pr.sizeRange} />
       </div>
      </div>

      <div className="field">
       <label htmlFor="pr-budget">{pr.budgetCeiling}</label>
       <input id="pr-budget" name="budget" inputMode="numeric" className="input" value={budget} onChange={(e) => setBudget(e.target.value)} style={inp} />
      </div>

      <fieldset className="field" style={{ gridColumn: "1 / -1", border: 0, padding: 0, margin: 0 }}>
       <legend style={{ padding: 0 }}>{pr.preferredDistricts}</legend>
       <div className="row gap8 wrap" role="group">{DISTRICTS.map(([d]) => (
        <button key={d} type="button" aria-pressed={districts.includes(d)} className={"chip" + (districts.includes(d) ? " on" : "")} style={chip} onClick={() => toggle(districts, setDistricts, d)}>{d}</button>
       ))}</div>
      </fieldset>

      <fieldset className="field" style={{ gridColumn: "1 / -1", border: 0, padding: 0, margin: 0 }}>
       <legend style={{ padding: 0 }}>{pr.mustHaves} <span className="hint">{pr.optional}</span></legend>
       <div className="row gap8 wrap" role="group">{MUSTS.map((m) => (
        <button key={m} type="button" aria-pressed={musts.includes(m)} className={"chip" + (musts.includes(m) ? " on" : "")} style={chip} onClick={() => toggle(musts, setMusts, m)}>{m}</button>
       ))}</div>
      </fieldset>

      <fieldset className="field" style={{ gridColumn: "1 / -1", border: 0, padding: 0, margin: 0 }}>
       <legend style={{ padding: 0 }}>{pr.moveIn}</legend>
       <div className="seg" style={{ alignSelf: "flex-start" }}>{TIMELINES.map((t) => (
        <label key={t} className={timeline === t ? "on" : ""} style={{ cursor: "pointer" }}>
         <input type="radio" name="timeline" value={t} checked={timeline === t} onChange={() => setTimeline(t)} className="sronly" />
         {t}
        </label>
       ))}</div>
      </fieldset>

      <div className="field">
       <label htmlFor="pr-name">{pr.yourName}</label>
       <input id="pr-name" name="name" required autoComplete="name" className="input" value={cName} onChange={(e) => setCName(e.target.value)} placeholder={pr.fullNamePh} style={{ ...inp, textAlign: ar ? "right" : "left" }} />
      </div>
      <div className="field">
       <label htmlFor="pr-email">{pr.email}</label>
       <input id="pr-email" name="email" type="email" required autoComplete="email" inputMode="email" className="input" value={cEmail} onChange={(e) => setCEmail(e.target.value)} placeholder="you@company.com" style={inp} />
      </div>
      <div className="field" style={{ gridColumn: "1 / -1" }}>
       <label htmlFor="pr-phone">{pr.phone} <span className="hint">{pr.optional}</span></label>
       <input id="pr-phone" name="phone" type="tel" autoComplete="tel" inputMode="tel" className="input" value={cPhone} onChange={(e) => setCPhone(e.target.value)} placeholder="+966…" style={inp} />
      </div>
     </div>

     <div style={{ padding: "18px 28px", borderTop: "1px solid var(--silver)", background: "var(--azure-wash)" }}>
      <div className="row gap10" style={{ marginBottom: 12 }}>
       <span style={{ color: "var(--azure-d)" }}><Icon.spark size={18} /></span>
       <div style={{ fontSize: 13.5 }}>{pr.postsToNote}</div>
      </div>
      {/* Real consent, not a badge asserting it. */}
      <label htmlFor="pr-consent" className="row gap10" style={{ alignItems: "flex-start", cursor: "pointer" }}>
       <input id="pr-consent" name="consent" type="checkbox" required checked={consent} onChange={(e) => setConsent(e.target.checked)} style={{ marginTop: 3, width: 16, height: 16, flex: "none" }} />
       <span style={{ fontSize: 13, lineHeight: 1.6 }}>{pr.consentLabel}</span>
      </label>
     </div>
    </div>

    {err && <div className="card pad" style={{ marginTop: 16, borderColor: "var(--red)", color: "var(--red)", fontSize: 13 }} role="alert">{err}</div>}
    <div className="row between wrap" style={{ marginTop: 26, gap: 12 }}>
     <span className="muted" style={{ fontSize: 12.5 }}>{pr.privacyNote}</span>
     <button type="submit" className="btn primary lg" disabled={busy || !consent}>{busy ? (pr.posting) : (pr.postReqBtn)} <Icon.arrow size={16} /></button>
    </div>
    </form>
   </div>
  </div>
 );
}
const inp: React.CSSProperties = { border: "1px solid var(--silver)", borderRadius: 9, padding: "10px 12px", fontSize: 14, color: "var(--ink)", background: "var(--paper)", outline: "none", width: "100%" };
const chip: React.CSSProperties = { cursor: "pointer", border: "1px solid var(--silver)", background: "var(--paper)" };
