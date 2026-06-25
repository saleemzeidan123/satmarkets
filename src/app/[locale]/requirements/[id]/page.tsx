"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/satkit";

interface Req { id: string; ref: string; title: string; asset: string; deal: string; district: string; city: string; sizeMin: number; sizeMax: number; budget: number; timeline: string; mustHaves: string[]; createdAt: string; }
interface Interest { id: string; type: string; name: string; org: string; message: string; createdAt: string; }

export default function RequirementDetail({ params }: { params: { locale: string; id: string } }) {
 const locale = params.locale === "ar" ? "ar" : "en";
 const [req, setReq] = useState<Req | null>(null);
 const [ints, setInts] = useState<Interest[]>([]);
 const [loading, setLoading] = useState(true);
 const [show, setShow] = useState(false);
 const [ptype, setPtype] = useState("landlord");
 const [org, setOrg] = useState("");
 const [msg, setMsg] = useState("");
 const [busy, setBusy] = useState(false);

 const load = () => fetch(`/api/requirements/${params.id}`).then((r) => r.json()).then((j) => { setReq(j.requirement); setInts(j.interests || []); setLoading(false); }).catch(() => setLoading(false));
 useEffect(() => { load(); }, []);

 async function register() {
  setBusy(true);
  await fetch(`/api/requirements/${params.id}/interest`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ party_type: ptype, org, party_name: org || undefined, message: msg }) });
  setOrg(""); setMsg(""); setShow(false); setBusy(false);
  load();
 }

 if (loading) return <div style={{ padding: 48, textAlign: "center" }} className="muted">Loading requirement…</div>;
 if (!req) return <div style={{ padding: 48, textAlign: "center" }} className="muted">Requirement not found. <Link href={`/${locale}/requirements`} style={{ color: "var(--azure-d)" }}>Back to all requirements →</Link></div>;

 return (
  <div style={{ background: "var(--cool)" }}>
   <div style={{ padding: "26px 24px 48px", maxWidth: 880, margin: "0 auto" }}>
    <Link href={`/${locale}/requirements`} className="row gap6" style={{ fontSize: 13, color: "var(--slate)", textDecoration: "none" }}><span style={{ display: "inline-flex", transform: "rotate(180deg)" }}><Icon.chevr size={15} /></span> All requirements</Link>
    <div className="card pad" style={{ marginTop: 14, boxShadow: "var(--sh-1)" }}>
     <div className="row between" style={{ alignItems: "center" }}>
      <span className="tag" style={{ color: "var(--azure-d)", background: "var(--azure-wash)", borderColor: "var(--azure-l)" }}>{req.asset[0].toUpperCase() + req.asset.slice(1)} · {req.deal === "lease" ? "Lease" : "Buy"}</span>
      <span className="mono muted" style={{ fontSize: 11 }}>{req.ref}</span>
     </div>
     <h1 style={{ fontSize: 23, fontWeight: 700, letterSpacing: "-.02em", margin: "12px 0 4px" }}>{req.title}</h1>
     <div className="muted" style={{ fontSize: 13.5 }}>{req.district}{req.city && req.district !== req.city ? ", " + req.city : ""}</div>
     <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: 12, marginTop: 18 }}>
      {[["Size", `${req.sizeMin}–${req.sizeMax} m²`], ["Budget", `${Number(req.budget).toLocaleString()} ${req.deal === "lease" ? "SAR/m²·yr" : "SAR"}`], ["Timeline", req.timeline || "n/a"]].map((s, i) => (
       <div key={i} className="card pad" style={{ boxShadow: "none", background: "var(--cool)" }}><div className="muted" style={{ fontSize: 11 }}>{s[0]}</div><div style={{ fontSize: 14, fontWeight: 600, marginTop: 3 }}>{s[1]}</div></div>
      ))}
     </div>
     {req.mustHaves?.length ? <div className="row gap6 wrap" style={{ marginTop: 14 }}>{req.mustHaves.map((m, i) => <span key={i} className="chip on" style={{ fontSize: 11.5 }}>{m}</span>)}</div> : null}
    </div>

    <div className="card pad" style={{ marginTop: 18, boxShadow: "var(--sh-1)" }}>
     <div className="row between" style={{ alignItems: "center", marginBottom: 4 }}>
      <div style={{ fontSize: 16, fontWeight: 700 }}>Who&apos;s interested {ints.length ? `· ${ints.length}` : ""}</div>
      <button className="btn primary sm" onClick={() => setShow(!show)}><Icon.plus size={14} /> I have space for this</button>
     </div>
     <p className="muted" style={{ fontSize: 12.5, margin: "0 0 14px" }}>Owners and brokers who can fill this requirement appear here. The occupier chooses who to talk to.</p>

     {show && (
      <div className="card pad" style={{ boxShadow: "none", background: "var(--cool)", marginBottom: 14 }}>
       <div className="row gap10 wrap" style={{ marginBottom: 10 }}>
        <div className="seg">{["landlord", "broker"].map((t) => <span key={t} className={ptype === t ? "on" : ""} style={{ cursor: "pointer" }} onClick={() => setPtype(t)}>{t === "landlord" ? "Owner" : "Broker"}</span>)}</div>
        <input className="input grow" value={org} onChange={(e) => setOrg(e.target.value)} placeholder="Your company" style={inp} />
       </div>
       <textarea className="input" value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="What you have that matches (size, district, fit-out)…" style={{ ...inp, minHeight: 64, resize: "vertical" }} />
       <div className="row gap10" style={{ marginTop: 10, justifyContent: "flex-end" }}>
        <button className="btn secondary sm" onClick={() => setShow(false)}>Cancel</button>
        <button className="btn primary sm" onClick={register} disabled={busy}>{busy ? "Registering…" : "Register interest"}</button>
       </div>
      </div>
     )}

     {ints.length === 0 ? (
      <div className="card pad" style={{ boxShadow: "none", border: "1px dashed var(--silver)", textAlign: "center", color: "var(--slate)", fontSize: 13 }}>No interest yet, verified owners and brokers were notified. Responses will appear here.</div>
     ) : (
      <div className="col gap10">
       {ints.map((it) => (
        <div key={it.id} className="row gap12" style={{ background: "#fff", border: "1px solid var(--silver)", borderRadius: 11, padding: 12, alignItems: "flex-start" }}>
         <span style={{ width: 34, height: 34, borderRadius: 8, flex: "none", background: "var(--azure-wash)", color: "var(--azure-d)", display: "flex", alignItems: "center", justifyContent: "center" }}>{it.type === "broker" ? <Icon.user size={16} /> : <Icon.shield size={16} />}</span>
         <div className="grow">
          <div className="row gap8" style={{ alignItems: "center" }}><span style={{ fontSize: 13.5, fontWeight: 600 }}>{it.name || (it.type === "broker" ? "A SAT broker" : "A verified owner")}</span><span className="tag" style={{ fontSize: 10 }}>{it.type === "broker" ? "Broker" : "Owner"}</span></div>
          {it.message && <div className="muted" style={{ fontSize: 12.5, marginTop: 4, lineHeight: 1.5 }}>{it.message}</div>}
         </div>
         <span className="btn secondary sm">Reply</span>
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
