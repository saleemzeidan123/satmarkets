"use client";
import { useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/satkit";

export default function PostRequirementPage({ params }: { params: { locale: string } }) {
 const locale = params.locale === "ar" ? "ar" : "en";
 const ar = locale === "ar";
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
 const [sizeMin, setSizeMin] = useState("300");
 const [sizeMax, setSizeMax] = useState("600");
 const [budget, setBudget] = useState("1600");
 const [districts, setDistricts] = useState<string[]>([DISTRICTS[0][0]]);
 const [musts, setMusts] = useState<string[]>([MUSTS[0]]);
 const [timeline, setTimeline] = useState(TIMELINES[1]);
 const [cName, setCName] = useState("");
 const [cEmail, setCEmail] = useState("");
 const [cPhone, setCPhone] = useState("");
 const [busy, setBusy] = useState(false);
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
  } catch { setErr(ar ? "حدث ما قاطع الإرسال. حاول مرة أخرى." : "Something interrupted the submission. Please try again."); }
  setBusy(false);
 }

 if (done) {
  return (
   <div style={{ background: "var(--cool)" }}>
    <div style={{ padding: "40px 24px 56px", maxWidth: 720, margin: "0 auto" }}>
     <div className="card pad" style={{ boxShadow: "var(--sh-1)", textAlign: "center" }}>
      <span style={{ width: 56, height: 56, borderRadius: "50%", background: "var(--green)", color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center" }}><Icon.check size={28} /></span>
      <div className="eyebrow" style={{ marginTop: 16 }}>{ar ? `الطلب ${done.ref} مباشر` : `Requirement ${done.ref} is live`}</div>
      <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-.02em", margin: "8px 0 6px" }}>{ar ? "السوق يعمل لصالحك الآن" : "The market is now working for you"}</h1>
      <p className="muted" style={{ fontSize: 14, lineHeight: 1.6, maxWidth: 460, margin: "0 auto" }}>{ar ? "تم إدراج طلبك في منصّة SAT. أبلغنا من يمكنهم تلبيته، وسترى هنا متى أبدى أحد اهتماماً، وتبقى بيانات تواصلك خاصة حتى تردّ." : "Your requirement is posted to the SAT exchange. We’ve notified the people who can fill it, and you’ll see here whenever someone shows interest, your contact details stay private until you reply."}</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, margin: "22px 0" }}>
       <div className="card pad" style={{ boxShadow: "none", background: "var(--cool)" }}><div className="tnum" style={{ fontSize: 26, fontWeight: 600, color: "var(--azure-d)" }}>{done.match}</div><div className="muted" style={{ fontSize: 12 }}>{ar ? "مساحات موثّقة تطابق اليوم" : "verified spaces match today"}</div></div>
       <div className="card pad" style={{ boxShadow: "none", background: "var(--cool)" }}><div className="tnum" style={{ fontSize: 26, fontWeight: 600 }}>3</div><div className="muted" style={{ fontSize: 12 }}>{ar ? "جهات أُبلغت" : "audiences notified"}</div></div>
      </div>
      <div className="col gap8" style={{ textAlign: ar ? "right" : "left", maxWidth: 420, margin: "0 auto 22px" }}>
       {done.notified.map((n, i) => (
        <div key={i} className="row gap8" style={{ fontSize: 13 }}><span style={{ color: "var(--green)" }}><Icon.check size={15} /></span>{n}</div>
       ))}
      </div>
      <div className="row gap10" style={{ justifyContent: "center" }}>
       <Link href={`/${locale}/requirements/${done.id}`} className="btn primary lg">{ar ? "اعرض طلبك" : "View your requirement"} <Icon.arrow size={16} /></Link>
       <Link href={`/${locale}/requirements`} className="btn secondary">{ar ? "كل الطلبات" : "All requirements"}</Link>
      </div>
     </div>
    </div>
   </div>
  );
 }

 return (
  <div style={{ background: "var(--cool)" }}>
   <div style={{ padding: "36px 24px 48px", maxWidth: 880, margin: "0 auto" }}>
    <div className="eyebrow">{ar ? "أدرج طلباً" : "Post a requirement"}</div>
    <h1 className="serif" style={{ fontSize: 34, fontWeight: 500, letterSpacing: "-.02em", margin: "12px 0 6px" }}>{ar ? "أخبر السوق بما تحتاجه" : "Tell the market what you need"}</h1>
    <p className="muted" style={{ fontSize: 15.5, maxWidth: 560, lineHeight: 1.6 }}>{ar ? "أدرج طلبك فيأتيك المُلّاك والوسطاء وSAT الموثّقون بالمساحة المطابقة. عكس البحث." : "Post your requirement and verified owners, brokers and SAT bring matching space to you. The reverse of searching."}</p>

    <div className="card" style={{ marginTop: 30, padding: 0, overflow: "hidden" }}>
     <div className="row gap10" style={{ padding: "16px 24px", borderBottom: "1px solid var(--silver)", background: "var(--cool)" }}>
      <span style={{ color: "var(--harbor)" }}><Icon.doc size={18} /></span>
      <div style={{ fontSize: 14, fontWeight: 600 }}>{ar ? "طلب جديد" : "New requirement"}</div>
      <span style={{ flex: 1 }} /><span className="tag">{ar ? "مسودة" : "Draft"}</span>
     </div>
     <div className="req-grid" style={{ padding: 28 }}>
      <div className="field" style={{ gridColumn: "1 / -1" }}>
       <label>{ar ? "عمّا تبحث؟" : "What are you looking for?"}</label>
       <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={ar ? "مثال: مقر إقليمي، مكاتب فئة A، العليا أو كافد" : "e.g. Regional HQ office, Grade A, Olaya or KAFD"} style={{ ...inp, textAlign: ar ? "right" : "left" }} />
      </div>
      <div className="field">
       <label>{ar ? "نوع الأصل" : "Asset type"}</label>
       <div className="row gap8 wrap">{ASSETS.map((a) => <button key={a} className={"chip" + (asset === a ? " on" : "")} style={chip} onClick={() => setAsset(a)}>{assetLbl(a)}</button>)}</div>
      </div>
      <div className="field">
       <label>{ar ? "نوع الصفقة" : "Transaction"}</label>
       <div className="seg" style={{ alignSelf: "flex-start" }}>{["lease", "sale"].map((d) => <span key={d} className={deal === d ? "on" : ""} style={{ cursor: "pointer" }} onClick={() => setDeal(d)}>{d === "lease" ? (ar ? "إيجار" : "Lease") : (ar ? "شراء" : "Buy")}</span>)}</div>
      </div>
      <div className="field">
       <label>{ar ? "نطاق المساحة (م²)" : "Size range (m²)"}</label>
       <div className="row gap10"><input className="input grow" value={sizeMin} onChange={(e) => setSizeMin(e.target.value)} style={inp} /><span className="muted">{ar ? "إلى" : "to"}</span><input className="input grow" value={sizeMax} onChange={(e) => setSizeMax(e.target.value)} style={inp} /></div>
      </div>
      <div className="field">
       <label>{ar ? "سقف الميزانية (ريال/م²·سنة)" : "Budget ceiling (SAR/m²·yr)"}</label>
       <input className="input" value={budget} onChange={(e) => setBudget(e.target.value)} style={inp} />
      </div>
      <div className="field" style={{ gridColumn: "1 / -1" }}>
       <label>{ar ? "الأحياء المفضّلة" : "Preferred districts"}</label>
       <div className="row gap8 wrap">{DISTRICTS.map(([d]) => <button key={d} className={"chip" + (districts.includes(d) ? " on" : "")} style={chip} onClick={() => toggle(districts, setDistricts, d)}>{d}</button>)}</div>
      </div>
      <div className="field" style={{ gridColumn: "1 / -1" }}>
       <label>{ar ? "متطلبات أساسية" : "Must-haves"} <span className="hint">{ar ? "(اختياري)" : "(optional)"}</span></label>
       <div className="row gap8 wrap">{MUSTS.map((m) => <button key={m} className={"chip" + (musts.includes(m) ? " on" : "")} style={chip} onClick={() => toggle(musts, setMusts, m)}>{m}</button>)}</div>
      </div>
      <div className="field" style={{ gridColumn: "1 / -1" }}>
       <label>{ar ? "موعد الانتقال" : "Move-in timeline"}</label>
       <div className="seg" style={{ alignSelf: "flex-start" }}>{TIMELINES.map((t) => <span key={t} className={timeline === t ? "on" : ""} style={{ cursor: "pointer" }} onClick={() => setTimeline(t)}>{t}</span>)}</div>
      </div>
      <div className="field"><label>{ar ? "اسمك" : "Your name"}</label><input className="input" value={cName} onChange={(e) => setCName(e.target.value)} placeholder={ar ? "الاسم الكامل" : "Full name"} style={{ ...inp, textAlign: ar ? "right" : "left" }} /></div>
      <div className="field"><label>{ar ? "البريد الإلكتروني" : "Email"}</label><input className="input" value={cEmail} onChange={(e) => setCEmail(e.target.value)} placeholder="you@company.com" style={inp} /></div>
      <div className="field" style={{ gridColumn: "1 / -1" }}><label>{ar ? "الهاتف" : "Phone"} <span className="hint">{ar ? "(اختياري)" : "(optional)"}</span></label><input className="input" value={cPhone} onChange={(e) => setCPhone(e.target.value)} placeholder="+966…" style={inp} /></div>
     </div>
     <div className="row between wrap" style={{ padding: "18px 28px", borderTop: "1px solid var(--silver)", background: "var(--azure-wash)", gap: 10 }}>
      <div className="row gap10"><span style={{ color: "var(--azure-d)" }}><Icon.spark size={18} /></span><div style={{ fontSize: 13.5 }}>{ar ? "يُرسَل إلى المُلّاك والوسطاء الموثّقين ومكتب SAT." : "Posts to verified owners, brokers and the SAT desk."}</div></div>
      <span className="mono muted" style={{ fontSize: 11.5 }}>{ar ? "متوافق مع نظام حماية البيانات" : "PDPL-compliant"}</span>
     </div>
    </div>

    {err && <div className="card pad" style={{ marginTop: 16, borderColor: "var(--red)", color: "var(--red)", fontSize: 13 }}>{err}</div>}
    <div className="row between wrap" style={{ marginTop: 26, gap: 12 }}>
     <span className="muted" style={{ fontSize: 12.5 }}>{ar ? "ظاهر للمُلّاك والوسطاء وSAT الموثّقين · تبقى هويتك خاصة حتى تردّ." : "Visible to verified owners, brokers & SAT · your identity stays private until you respond."}</span>
     <button className="btn primary lg" onClick={submit} disabled={busy}>{busy ? (ar ? "جارٍ الإدراج…" : "Posting…") : (ar ? "أدرج الطلب" : "Post requirement")} <Icon.arrow size={16} /></button>
    </div>
   </div>
  </div>
 );
}
const inp: React.CSSProperties = { border: "1px solid var(--silver)", borderRadius: 9, padding: "10px 12px", fontSize: 14, color: "var(--ink)", background: "#fff", outline: "none", width: "100%" };
const chip: React.CSSProperties = { cursor: "pointer", border: "1px solid var(--silver)", background: "#fff" };
