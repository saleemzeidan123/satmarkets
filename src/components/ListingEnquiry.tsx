"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/satkit";
import { ContactChannels } from "@/components/ContactBar";
import { getDictionary } from "@/i18n/getDictionary";

type Path = "direct_contact" | "representation";

type QOpt = { v: string; en: string; ar: string };
type Q = { k: string; en: string; ar: string; opts: QOpt[] };

const Q_ROLE: Q = { k: "role", en: "You are", ar: "أنت", opts: [
 { v: "tenant", en: "The occupier", ar: "المستأجر نفسه" },
 { v: "broker", en: "Broker for a client", ar: "وسيط عن عميل" },
 { v: "investor", en: "An investor", ar: "مستثمر" },
] };
const Q_TIME: Q = { k: "timeline", en: "Timeline", ar: "الإطار الزمني", opts: [
 { v: "now", en: "Ready now", ar: "جاهز الآن" },
 { v: "3m", en: "Within 3 months", ar: "خلال 3 أشهر" },
 { v: "exploring", en: "Exploring", ar: "أستكشف" },
] };
const QUAL: Record<string, Q[]> = {
 office: [Q_ROLE, { k: "company", en: "Team size", ar: "حجم الفريق", opts: [
  { v: "1_10", en: "1-10", ar: "1-10" }, { v: "11_50", en: "11-50", ar: "11-50" }, { v: "51_200", en: "51-200", ar: "51-200" }, { v: "200p", en: "200+", ar: "+200" },
 ] }, Q_TIME],
 retail: [{ k: "concept", en: "Concept", ar: "النشاط", opts: [
  { v: "cafe", en: "Cafe", ar: "مقهى" }, { v: "qsr", en: "Quick-service F&B", ar: "مطعم خدمة سريعة" }, { v: "fashion", en: "Fashion", ar: "أزياء" }, { v: "services", en: "Services", ar: "خدمات" }, { v: "other", en: "Other", ar: "أخرى" },
 ] }, { k: "branches", en: "Branches today", ar: "عدد الفروع الحالية", opts: [
  { v: "first", en: "First location", ar: "أول فرع" }, { v: "2_5", en: "2-5", ar: "2-5" }, { v: "6p", en: "6+", ar: "+6" },
 ] }, { k: "fitout", en: "Fit-out budget", ar: "ميزانية التجهيز", opts: [
  { v: "ready", en: "Ready", ar: "جاهزة" }, { v: "estimate", en: "Needs estimate", ar: "أحتاج تقديراً" },
 ] }],
 warehouse: [{ k: "use", en: "Use", ar: "الاستخدام", opts: [
  { v: "storage", en: "Storage", ar: "تخزين" }, { v: "distribution", en: "Distribution", ar: "توزيع" }, { v: "light_industrial", en: "Light industrial", ar: "صناعي خفيف" }, { v: "cold", en: "Cold chain", ar: "تبريد" },
 ] }, { k: "height", en: "Clear height", ar: "الارتفاع الصافي", opts: [
  { v: "any", en: "Any", ar: "أي ارتفاع" }, { v: "6m", en: "6m+", ar: "+6م" }, { v: "9m", en: "9m+", ar: "+9م" },
 ] }, Q_TIME],
 land: [{ k: "intent", en: "Intent", ar: "الهدف", opts: [
  { v: "develop", en: "Develop", ar: "تطوير" }, { v: "hold", en: "Hold", ar: "احتفاظ" }, { v: "bts", en: "Build to suit", ar: "بناء حسب الطلب" },
 ] }, { k: "capital", en: "Capital", ar: "التمويل", opts: [
  { v: "own", en: "Own funds", ar: "تمويل ذاتي" }, { v: "financing", en: "Financing arranged", ar: "تمويل مرتب" }, { v: "exploring", en: "Exploring", ar: "قيد الدراسة" },
 ] }, { k: "track", en: "Projects delivered", ar: "مشاريع منفذة", opts: [
  { v: "first", en: "First project", ar: "أول مشروع" }, { v: "2_5", en: "2-5", ar: "2-5" }, { v: "6p", en: "6+", ar: "+6" },
 ] }],
 medical: [{ k: "specialty", en: "Specialty", ar: "التخصص", opts: [
  { v: "clinic", en: "General clinic", ar: "عيادة عامة" }, { v: "dental", en: "Dental", ar: "أسنان" }, { v: "poly", en: "Polyclinic", ar: "مجمع عيادات" }, { v: "lab", en: "Lab / imaging", ar: "مختبر / أشعة" },
 ] }, { k: "licence", en: "Health licence", ar: "الترخيص الصحي", opts: [
  { v: "licensed", en: "Licensed", ar: "مرخّص" }, { v: "in_progress", en: "In progress", ar: "قيد الإصدار" }, { v: "exploring", en: "Exploring", ar: "أستكشف" },
 ] }, Q_TIME],
 showroom: [{ k: "category", en: "Category", ar: "الفئة", opts: [
  { v: "auto", en: "Automotive", ar: "سيارات" }, { v: "furniture", en: "Furniture", ar: "أثاث" }, { v: "electronics", en: "Electronics", ar: "إلكترونيات" }, { v: "other", en: "Other", ar: "أخرى" },
 ] }, Q_ROLE, Q_TIME],
 gas_station: [{ k: "operator", en: "Operator status", ar: "وضع المشغّل", opts: [
  { v: "existing", en: "Existing operator", ar: "مشغّل قائم" }, { v: "new", en: "New entrant", ar: "داخل جديد" },
 ] }, Q_TIME],
 serviced: [{ k: "team", en: "Team size", ar: "حجم الفريق", opts: [
  { v: "1_5", en: "1-5", ar: "1-5" }, { v: "6_20", en: "6-20", ar: "6-20" }, { v: "21p", en: "21+", ar: "+21" },
 ] }, { k: "term", en: "Term", ar: "المدة", opts: [
  { v: "short", en: "Short term", ar: "قصيرة" }, { v: "long", en: "12 months+", ar: "+12 شهراً" },
 ] }],
};
const QUAL_SALE: Q[] = [{ k: "ticket", en: "Ticket", ar: "قيمة الصفقة", opts: [
 { v: "within", en: "Within asking range", ar: "ضمن النطاق المطلوب" }, { v: "below", en: "Below asking", ar: "أقل من المطلوب" }, { v: "exploring", en: "Exploring", ar: "أستكشف" },
] }, { k: "funding", en: "Funding", ar: "التمويل", opts: [
 { v: "cash", en: "Cash", ar: "نقدي" }, { v: "financing", en: "Financing arranged", ar: "تمويل مرتب" }, { v: "subject", en: "Subject to financing", ar: "مشروط بالتمويل" },
] }, Q_TIME];
const QUAL_DEFAULT: Q[] = [Q_ROLE, Q_TIME];

export default function ListingEnquiry({
 listingId, price, lease, unit, type, area, district, locale, permit, assetType, satListed, contact,
}: {
 listingId: string; price: number | null; lease: boolean; unit: string;
 type: string; area: number; district: string; locale: string; permit?: string | null; assetType?: string; satListed?: boolean;
 contact?: { phone?: string | null; email?: string | null; channels: string[]; refCode: string; title: string; url: string; messageHref: string };
}) {
 const L = (p: string) => `/${locale}${p}`;
 const ar = locale === "ar";
 const t = getDictionary(ar ? "ar" : "en").enquiry;
 const [open, setOpen] = useState<Path | null>(null);
 const [name, setName] = useState("");
 const [email, setEmail] = useState("");
 const [msg, setMsg] = useState("");
 const [busy, setBusy] = useState(false);
 const [done, setDone] = useState<Path | null>(null);
 const [saved, setSaved] = useState(false);
 const [slot, setSlot] = useState<string | null>(null);
 const [slots, setSlots] = useState<{ iso: string; label: string }[]>([]);
 const [vBusy, setVBusy] = useState(false);
 const [vDone, setVDone] = useState(false);
 const [vErr, setVErr] = useState("");
 const [qual, setQual] = useState<Record<string, string>>({});
 const questions: Q[] = (!lease ? QUAL_SALE : (QUAL[assetType || ""] || QUAL_DEFAULT)).slice(0, 2);

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

 useEffect(() => {
  const dayAr = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
  const dayEn = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const isAr = locale === "ar";
  const out: { iso: string; label: string }[] = [];
  let added = 0, i = 1;
  while (added < 3 && i < 10) {
   const day = new Date(Date.now() + i * 86400000); i++;
   const dow = day.getDay();
   if (dow === 5 || dow === 6) continue;
   for (const h of [10, 13, 16]) {
    const dt = new Date(Date.UTC(day.getFullYear(), day.getMonth(), day.getDate(), h - 3, 0, 0));
    out.push({ iso: dt.toISOString(), label: `${isAr ? dayAr[dow] : dayEn[dow]} ${day.getDate()}/${day.getMonth() + 1} · ${h}:00` });
   }
   added++;
  }
  setSlots(out);
 }, [locale]);

 async function submitViewing() {
  if (!slot || !name.trim() || !email.trim()) return;
  setVBusy(true); setVErr("");
  try {
   const res = await fetch("/api/viewings", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
     listing_id: listingId, scheduled_at: slot, contact_name: name, contact_email: email,
     qualification: {
      answers: qual,
      summary_en: questions.map((q) => q.opts.find((o) => o.v === qual[q.k])?.en).filter(Boolean).join(" · "),
      summary_ar: questions.map((q) => q.opts.find((o) => o.v === qual[q.k])?.ar).filter(Boolean).join(" · "),
     },
    }),
   });
   const j = await res.json().catch(() => ({}));
   if (res.ok && !j.error) { setVDone(true); } else { setVErr(t.errSend); }
  } catch {
   setVErr(t.errSend);
  } finally { setVBusy(false); }
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
     <Icon.check size={20} /><span style={{ fontWeight: 700, fontSize: 15, color: "var(--ink)" }}>{rep ? t.repRequested : t.enquirySent}</span>
    </div>
    <p className="muted" style={{ fontSize: 13.5, lineHeight: 1.6 }}>
     {rep
      ? t.repBody
      : t.enquiryBody}
    </p>
    <div className="col gap10" style={{ marginTop: 16 }}>
     <Link href={L("/messages")} className="btn primary" style={{ justifyContent: "center", textDecoration: "none" }}><Icon.send size={15} /> {t.openConversation}</Link>
     <Link href={L("/deal")} className="btn secondary" style={{ justifyContent: "center", textDecoration: "none" }}>{t.trackDeal}</Link>
    </div>
   </div>
  );
 }

 return (
  <div className="card pad" style={{ position: "sticky", top: 90 }}>
   <div className="row between" style={{ alignItems: "flex-start" }}>
    <div>
     <div className="mono" style={{ fontSize: 28, fontWeight: 500 }}>{price != null ? Number(price).toLocaleString() : t.onRequest}<small style={{ fontSize: 13, color: "var(--slate)", fontWeight: 400 }}> {price != null ? unit : ""}</small></div>
     <div className="muted" style={{ fontSize: 12.5, marginTop: 4 }}>{type} · <bdi dir="ltr">{area} m²</bdi> · {district}</div>
    </div>
    <button onClick={toggleSave} aria-label={saved ? t.saved : t.save} className="chip" style={{ cursor: "pointer", borderColor: saved ? "var(--harbor)" : "var(--silver)", color: saved ? "var(--harbor)" : "var(--slate)" }}>
     <Icon.heart size={15} /> {saved ? t.saved : t.save}
    </button>
   </div>

   <div className="row gap8 wrap" style={{ marginTop: 14 }}>
    <span className="verified"><span className="dot" />{t.verifiedOwner}</span>
    {permit && <span className="tag">{t.permit}{permit}</span>}
   </div>

   {contact ? <div className="hidden md:block" style={{ marginTop: 14 }}><ContactChannels {...contact} ar={ar} /></div> : null}

   {open === "direct_contact" ? (
    <form onSubmit={(e) => { e.preventDefault(); submit("direct_contact"); }} className="col gap10" style={{ marginTop: 18 }}>
     <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t.yourName} style={fld} />
     <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t.workEmail} type="email" style={fld} />
     <textarea value={msg} onChange={(e) => setMsg(e.target.value)} placeholder={ar ? `أنا مهتم بهذه المساحة (${type}) في ${district}...` : `I'm interested in this ${type.toLowerCase()} in ${district}...`} rows={3} style={{ ...fld, resize: "vertical" }} />
     <button type="submit" disabled={busy || !name.trim() || !email.trim()} className="btn primary" style={{ justifyContent: "center", opacity: busy || !name.trim() || !email.trim() ? 0.6 : 1 }}>{busy ? t.sending : t.sendEnquiry}</button>
     <button type="button" onClick={() => setOpen(null)} className="btn ghost" style={{ justifyContent: "center" }}>{t.cancel}</button>
    </form>
   ) : (
    <div className="col gap10" style={{ marginTop: 18 }}>
     <button onClick={() => setOpen("direct_contact")} className="btn primary" style={{ justifyContent: "center" }}><Icon.send size={15} /> {t.contactLister}</button>
     <button onClick={() => submit("representation")} disabled={busy} className="btn secondary" style={{ justifyContent: "center" }}>{t.requestRep}</button>
    </div>
   )}

   {open !== "direct_contact" && (
    <div style={{ marginTop: 18, borderTop: "1px solid var(--silver)", paddingTop: 14 }}>
     <div className="row between" style={{ marginBottom: 9, alignItems: "baseline" }}>
      <span style={{ fontSize: 12.5, fontWeight: 700 }}>{t.bookViewing}</span>
      <span className="mono" style={{ fontSize: 10.5, color: satListed ? "#2C557F" : "#1F8A5B" }}>{satListed ? t.satHosts : t.listerConfirms}</span>
     </div>
     {vDone ? (
      <div className="row gap8" style={{ fontSize: 13, alignItems: "flex-start" }}>
       <span style={{ color: "var(--green)", flex: "none", marginTop: 1 }}><Icon.check size={16} /></span>
       <span style={{ lineHeight: 1.55 }}>{satListed ? t.vDoneSat : t.vDoneLister}</span>
      </div>
     ) : (
      <>
       <div className="chip-rail row gap6" style={{ maxWidth: "100%" }}>
        {slots.map((sl) => (
         <button key={sl.iso} type="button" onClick={() => setSlot(slot === sl.iso ? null : sl.iso)} className={slot === sl.iso ? "chip on" : "chip"} style={{ cursor: "pointer" }}>{sl.label}</button>
        ))}
       </div>
       {slot && (
        <div className="col gap8" style={{ marginTop: 10 }}>
         <div className="muted" style={{ fontSize: 11.5, lineHeight: 1.5 }}>{t.twoQuick}</div>
         {questions.map((q) => (
          <div key={q.k}>
           <div style={{ fontSize: 11.5, fontWeight: 600, color: "var(--slate)", margin: "4px 0 5px" }}>{ar ? q.ar : q.en}</div>
           <div className="row gap6 wrap">
            {q.opts.map((o) => (
             <button key={o.v} type="button" onClick={() => setQual((p) => ({ ...p, [q.k]: p[q.k] === o.v ? "" : o.v }))} className={qual[q.k] === o.v ? "chip on" : "chip"} style={{ cursor: "pointer" }}>{ar ? o.ar : o.en}</button>
            ))}
           </div>
          </div>
         ))}
         <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t.yourName} style={fld} />
         <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t.workEmail} type="email" style={fld} />
         {vErr ? <div style={{ fontSize: 12.5, color: "var(--red)" }}>{vErr}</div> : null}
         <button type="button" disabled={vBusy || !name.trim() || !email.trim()} onClick={submitViewing} className="btn primary" style={{ justifyContent: "center", opacity: vBusy || !name.trim() || !email.trim() ? 0.6 : 1 }}>{vBusy ? t.sending : t.requestSlot}</button>
        </div>
       )}
      </>
     )}
    </div>
   )}

   <div className="muted" style={{ fontSize: 11.5, marginTop: 14, lineHeight: 1.6 }}>{t.footer}</div>
  </div>
 );
}

const fld: React.CSSProperties = {
 border: "1px solid var(--silver)", borderRadius: 9, padding: "10px 12px",
 fontSize: 14, fontFamily: "var(--sans)", color: "var(--ink)", outline: "none", background: "#fff", width: "100%",
};
