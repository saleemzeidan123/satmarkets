"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/satkit";
import { getDictionary } from "@/i18n/getDictionary";
import { assetLabel, cityLabel } from "@/lib/labels";

interface Req { id: string; ref: string; title: string; titleAr?: string | null; asset: string; deal: string; district: string; districtAr?: string | null; city: string; sizeMin: number; sizeMax: number; budget: number; timeline: string; mustHaves: string[]; createdAt: string; }
interface Interest { id: string; type: string; name: string; org: string; message: string; createdAt: string; }

export default function RequirementDetail({ params }: { params: { locale: string; id: string } }) {
 const locale = params.locale === "ar" ? "ar" : "en";
 const ar = locale === "ar";
 const t = getDictionary(locale).reqDetail;
 const [req, setReq] = useState<Req | null>(null);
 const [ints, setInts] = useState<Interest[]>([]);
 const [loading, setLoading] = useState(true);
 const [show, setShow] = useState(false);
 const [msg, setMsg] = useState("");
 const [busy, setBusy] = useState(false);
 const [err, setErr] = useState<string | null>(null);
 const [needAuth, setNeedAuth] = useState(false);

 const load = () => fetch(`/api/requirements/${params.id}`).then((r) => r.json()).then((j) => { setReq(j.requirement); setInts(j.interests || []); setLoading(false); }).catch(() => setLoading(false));
 useEffect(() => { load(); }, []);

 async function register() {
  setBusy(true); setErr(null); setNeedAuth(false);
  try {
   // Identity (owner vs broker, name, org) is derived server-side from the
   // verified account. We only send what the user actually wrote.
   const res = await fetch(`/api/requirements/${params.id}/interest`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ message: msg }) });
   const j = await res.json().catch(() => ({}));
   if (res.status === 401) { setNeedAuth(true); setErr(j.error || t.errSignIn); setBusy(false); return; }
   if (!res.ok || j.error) { setErr(j.error || t.errRegister); setBusy(false); return; }
   setMsg(""); setShow(false); setBusy(false);
   load();
  } catch {
   setErr(t.errRegister); setBusy(false);
  }
 }

 if (loading) return <div style={{ padding: 48, textAlign: "center" }} className="muted">{t.loading}…</div>;
 if (!req) return <div style={{ padding: 48, textAlign: "center" }} className="muted">{t.notFound} <Link href={`/${locale}/requirements`} style={{ color: "var(--azure-d)" }}>{t.backLink} {ar ? "←" : "→"}</Link></div>;

 return (
  <div style={{ background: "var(--cool)" }}>
   <div style={{ padding: "26px 24px 48px", maxWidth: 880, margin: "0 auto" }}>
    <Link href={`/${locale}/requirements`} className="row gap6" style={{ fontSize: 13, color: "var(--slate)", textDecoration: "none" }}><span style={{ display: "inline-flex", transform: "rotate(180deg)" }}><Icon.chevr size={15} /></span> {t.back}</Link>
    <div className="card pad" style={{ marginTop: 14, boxShadow: "var(--sh-1)" }}>
     <div className="row between" style={{ alignItems: "center" }}>
      <span className="tag" style={{ color: "var(--azure-d)", background: "var(--azure-wash)", borderColor: "var(--azure-l)" }}>{assetLabel(req.asset, locale)} · {req.deal === "lease" ? t.lease : t.buy}</span>
      <span className="mono muted" style={{ fontSize: 11 }}>{req.ref}</span>
     </div>
     <h1 style={{ fontSize: 23, fontWeight: 700, letterSpacing: "-.02em", margin: "12px 0 4px" }}>{(ar && req.titleAr) || req.title}</h1>
     <div className="muted" style={{ fontSize: 13.5 }}>{(ar && req.districtAr) || req.district}{req.city && req.district !== req.city ? (ar ? "، " : ", ") + cityLabel(req.city, locale) : ""}</div>
     <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: 12, marginTop: 18 }}>
      {([
        [t.size, `${req.sizeMin} ${t.rangeTo} ${req.sizeMax} ${t.sqm}`],
        [t.budget, `${Number(req.budget).toLocaleString("en-US")} ${req.deal === "lease" ? t.sarSqmYr : t.sar}`],
        [t.timeline, req.timeline || t.na],
      ] as [string, string][]).map((s, i) => (
       <div key={i} className="card pad" style={{ boxShadow: "none", background: "var(--cool)" }}>
        <div className="muted" style={{ fontSize: 11 }}>{s[0]}</div>
        {/* bdi keeps "320 m2" from rendering as "m2 320" once the paragraph
            direction is RTL: the number and its unit are one LTR run. */}
        <div style={{ fontSize: 14, fontWeight: 600, marginTop: 3 }}><bdi>{s[1]}</bdi></div>
       </div>
      ))}
     </div>
     {req.mustHaves?.length ? <div className="row gap6 wrap" style={{ marginTop: 14 }}>{req.mustHaves.map((m, i) => <span key={i} className="chip on" style={{ fontSize: 11.5 }}>{m}</span>)}</div> : null}
    </div>

    <div className="card pad" style={{ marginTop: 18, boxShadow: "var(--sh-1)" }}>
     <div className="row between" style={{ alignItems: "center", marginBottom: 4 }}>
      <div style={{ fontSize: 16, fontWeight: 700 }}>{t.interestedH} {ints.length ? `· ${ints.length}` : ""}</div>
      <button className="btn primary sm" onClick={() => setShow(!show)}><Icon.plus size={14} /> {t.haveSpace}</button>
     </div>
     <p className="muted" style={{ fontSize: 12.5, margin: "0 0 14px" }}>{t.interestedP}</p>

     {show && (
      <div className="card pad" style={{ boxShadow: "none", background: "var(--cool)", marginBottom: 14 }}>
       <p className="muted" style={{ fontSize: 12.5, margin: "0 0 10px" }}>{t.appearAs}</p>
       <textarea className="input" value={msg} onChange={(e) => setMsg(e.target.value)} placeholder={`${t.placeholder}…`} style={{ ...inp, minHeight: 64, resize: "vertical" }} />
       {err && (
        <p role="alert" style={{ color: "#B3261E", fontSize: 12.5, marginTop: 8 }}>
         {err}{needAuth ? <> <Link href={`/${locale}/login`} style={{ color: "var(--azure-d)", fontWeight: 600 }}>{t.signIn}</Link></> : null}
        </p>
       )}
       <div className="row gap10" style={{ marginTop: 10, justifyContent: "flex-end" }}>
        <button className="btn secondary sm" onClick={() => setShow(false)}>{t.cancel}</button>
        <button className="btn primary sm" onClick={register} disabled={busy}>{busy ? `${t.registering}…` : t.register}</button>
       </div>
      </div>
     )}

     {ints.length === 0 ? (
      <div className="card pad" style={{ boxShadow: "none", border: "1px dashed var(--silver)", textAlign: "center", color: "var(--slate)", fontSize: 13 }}>{t.none}</div>
     ) : (
      <div className="col gap10">
       {ints.map((it) => (
        <div key={it.id} className="row gap12" style={{ background: "#fff", border: "1px solid var(--silver)", borderRadius: 11, padding: 12, alignItems: "flex-start" }}>
         <span style={{ width: 34, height: 34, borderRadius: 8, flex: "none", background: "var(--azure-wash)", color: "var(--azure-d)", display: "flex", alignItems: "center", justifyContent: "center" }}>{it.type === "broker" ? <Icon.user size={16} /> : <Icon.shield size={16} />}</span>
         <div className="grow">
          <div className="row gap8" style={{ alignItems: "center" }}><span style={{ fontSize: 13.5, fontWeight: 600 }}>{it.name || (it.type === "broker" ? t.aBroker : t.anOwner)}</span><span className="tag" style={{ fontSize: 10 }}>{it.type === "broker" ? t.broker : t.owner}</span></div>
          {it.message && <div className="muted" style={{ fontSize: 12.5, marginTop: 4, lineHeight: 1.5 }}>{it.message}</div>}
         </div>
         <span className="btn secondary sm">{t.reply}</span>
        </div>
       ))}
      </div>
     )}
    </div>
   </div>
  </div>
 );
}
const inp: React.CSSProperties = { border: "1px solid var(--silver)", borderRadius: 9, padding: "9px 12px", fontSize: 13.5, color: "var(--ink)", background: "#fff", outline: "none", width: "100%" };
