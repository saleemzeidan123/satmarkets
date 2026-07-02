"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/satkit";

type Path = "direct_contact" | "representation";

export default function ListingEnquiry({
 listingId, price, lease, unit, type, area, district, locale, permit,
}: {
 listingId: string; price: number | null; lease: boolean; unit: string;
 type: string; area: number; district: string; locale: string; permit?: string | null;
}) {
 const L = (p: string) => `/${locale}${p}`;
 const ar = locale === "ar";
 const [open, setOpen] = useState<Path | null>(null);
 const [name, setName] = useState("");
 const [email, setEmail] = useState("");
 const [msg, setMsg] = useState("");
 const [busy, setBusy] = useState(false);
 const [done, setDone] = useState<Path | null>(null);
 const [saved, setSaved] = useState(false);

 useEffect(() => {
  try {
   const s = JSON.parse(localStorage.getItem("satm_saved") || "[]");
   setSaved(Array.isArray(s) && s.includes(listingId));
  } catch {}
 }, [listingId]);

 function toggleSave() {
  try {
   const s = JSON.parse(localStorage.getItem("satm_saved") || "[]");
   const arr: string[] = Array.isArray(s) ? s : [];
   const next = arr.includes(listingId) ? arr.filter((x) => x !== listingId) : [...arr, listingId];
   localStorage.setItem("satm_saved", JSON.stringify(next));
   setSaved(next.includes(listingId));
   window.dispatchEvent(new Event("storage"));
  } catch {}
 }

 async function submit(path: Path) {
  if (path === "direct_contact" && (!name.trim() || !email.trim())) return;
  setBusy(true);
  try {
   await fetch("/api/leads", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
     listing_id: listingId, path,
     contact_name: name || null, contact_email: email || null,
     message: msg || (path === "representation" ? "Requested SAT representation from listing." : null),
    }),
   });
   setDone(path); setOpen(null);
  } catch {
   setDone(path); setOpen(null);
  } finally { setBusy(false); }
 }

 if (done) {
  const rep = done === "representation";
  return (
   <div className="card pad" style={{ position: "sticky", top: 90 }}>
    <div className="row gap8" style={{ color: "var(--green)", marginBottom: 10 }}>
     <Icon.check size={20} /><span style={{ fontWeight: 700, fontSize: 15, color: "var(--ink)" }}>{rep ? (ar ? "طُلب التمثيل" : "Representation requested") : (ar ? "أُرسل طلبك" : "Enquiry sent")}</span>
    </div>
    <p className="muted" style={{ fontSize: 13.5, lineHeight: 1.6 }}>
     {rep
      ? (ar ? "سيتواصل معك مستشار سات لترتيب التفويض. لا يوقَّع شيء قبل موافقتك." : "A SAT advisor will reach out to set up your mandate. Nothing is signed until you approve it.")
      : (ar ? "وصل طلبك إلى المعلن الموثّق. تابع المحادثة داخل المنصة، وسات تتتبّع كل مرحلة حتى التسليم." : "The verified lister has your enquiry. You can keep the conversation on-platform, SAT tracks every milestone to handover.")}
    </p>
    <div className="col gap10" style={{ marginTop: 16 }}>
     <Link href={L("/messages")} className="btn primary" style={{ justifyContent: "center", textDecoration: "none" }}><Icon.send size={15} /> {ar ? "افتح المحادثة" : "Open the conversation"}</Link>
     <Link href={L("/deal")} className="btn secondary" style={{ justifyContent: "center", textDecoration: "none" }}>{ar ? "تتبّع الصفقة" : "Track this deal"}</Link>
    </div>
   </div>
  );
 }

 return (
  <div className="card pad" style={{ position: "sticky", top: 90 }}>
   <div className="row between" style={{ alignItems: "flex-start" }}>
    <div>
     <div className="mono" style={{ fontSize: 28, fontWeight: 500 }}>{price != null ? Number(price).toLocaleString() : (ar ? "عند الطلب" : "On request")}<small style={{ fontSize: 13, color: "var(--slate)", fontWeight: 400 }}> {price != null ? unit : ""}</small></div>
     <div className="muted" style={{ fontSize: 12.5, marginTop: 4 }}>{type} · {area} m² · {district}</div>
    </div>
    <button onClick={toggleSave} aria-label={saved ? (ar ? "محفوظ" : "Saved") : (ar ? "حفظ" : "Save")} className="chip" style={{ cursor: "pointer", borderColor: saved ? "var(--harbor)" : "var(--silver)", color: saved ? "var(--harbor)" : "var(--slate)" }}>
     <Icon.heart size={15} /> {saved ? (ar ? "محفوظ" : "Saved") : (ar ? "حفظ" : "Save")}
    </button>
   </div>

   <div className="row gap8 wrap" style={{ marginTop: 14 }}>
    <span className="verified"><span className="dot" />{ar ? "مالك موثّق" : "Verified owner"}</span>
    {permit && <span className="tag">{ar ? "تصريح " : "Permit "}{permit}</span>}
   </div>

   {open === "direct_contact" ? (
    <form onSubmit={(e) => { e.preventDefault(); submit("direct_contact"); }} className="col gap10" style={{ marginTop: 18 }}>
     <input value={name} onChange={(e) => setName(e.target.value)} placeholder={ar ? "اسمك" : "Your name"} style={fld} />
     <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder={ar ? "البريد الإلكتروني" : "Work email"} type="email" style={fld} />
     <textarea value={msg} onChange={(e) => setMsg(e.target.value)} placeholder={ar ? `أنا مهتم بهذه المساحة (${type}) في ${district}...` : `I'm interested in this ${type.toLowerCase()} in ${district}...`} rows={3} style={{ ...fld, resize: "vertical" }} />
     <button type="submit" disabled={busy || !name.trim() || !email.trim()} className="btn primary" style={{ justifyContent: "center", opacity: busy || !name.trim() || !email.trim() ? 0.6 : 1 }}>{busy ? (ar ? "جارٍ الإرسال..." : "Sending...") : (ar ? "أرسل الطلب" : "Send enquiry")}</button>
     <button type="button" onClick={() => setOpen(null)} className="btn ghost" style={{ justifyContent: "center" }}>{ar ? "إلغاء" : "Cancel"}</button>
    </form>
   ) : (
    <div className="col gap10" style={{ marginTop: 18 }}>
     <button onClick={() => setOpen("direct_contact")} className="btn primary" style={{ justifyContent: "center" }}><Icon.send size={15} /> {ar ? "تواصل مع المعلن" : "Contact the lister"}</button>
     <button onClick={() => submit("representation")} disabled={busy} className="btn secondary" style={{ justifyContent: "center" }}>{ar ? "اطلب تمثيل سات" : "Request SAT representation"}</button>
    </div>
   )}

   <div className="muted" style={{ fontSize: 11.5, marginTop: 14, lineHeight: 1.6 }}>{ar ? "التواصل مع المعلن مجاني ومباشر. التمثيل خيار صريح تختاره بنفسك، ولا عمولة مفترضة أبداً." : "Free to contact the lister directly. Representation is an explicit, opt-in choice, never an assumed commission."}</div>
  </div>
 );
}

const fld: React.CSSProperties = {
 border: "1px solid var(--silver)", borderRadius: 9, padding: "10px 12px",
 fontSize: 14, fontFamily: "var(--sans)", color: "var(--ink)", outline: "none", background: "#fff", width: "100%",
};
