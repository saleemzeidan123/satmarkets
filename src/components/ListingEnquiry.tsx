"use client";
import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/satkit";
import { ContactChannels } from "@/components/ContactBar";
import { getDictionary } from "@/i18n/getDictionary";
import { netArea, priceParts } from "@/lib/listingFigures";
import { apiErrorMessage } from "@/lib/apiErrors";
import type { Loc } from "@/lib/format";

// SAT Markets does not act for anyone. There is one path off a listing and it goes to
// the lister, not to us.
//
// There used to be a second button here: "Request SAT representation". On a platform
// whose whole proposition is neutrality, that button sat on a broker's own listing and
// offered the visitor a different agent -- the platform's. A broker reading it sees the
// referee holding out a shirt. You cannot run the market and compete in it.
//
// The `representation` value stays in the leads.path enum so the existing rows and any
// history survive. Nothing new can be created with it: the API refuses it and the RLS
// policy will not accept it.
type Path = "direct_contact";

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
 listingId, price, lease, type, area, district, locale, permit, assetType, satListed, contact, badges = [],
}: {
 // PKG-SUP2. The `unit` prop is gone. A unit threaded in as a separate string
 // can arrive not matching the figure it qualifies, and this panel is the one
 // place on the site where a occupier decides whether to enquire on a price.
 // The unit is derived from the deal type here, beside the figure.
 listingId: string; price: number | null; lease: boolean;
 type: string; area: number | null; district: string; locale: string; permit?: string | null; assetType?: string; satListed?: boolean;
 // Resolved on the server by src/lib/listingVerification.ts. Each string names the
 // gate it rests on; an empty list means the record has earned no badge (ADV-1).
 badges?: string[];
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
 const [err, setErr] = useState("");
 const [slot, setSlot] = useState<string | null>(null);
 const [slots, setSlots] = useState<{ iso: string; label: string }[]>([]);
 const [vBusy, setVBusy] = useState(false);
 const [vDone, setVDone] = useState(false);
 const [vErr, setVErr] = useState("");
 const [qual, setQual] = useState<Record<string, string>>({});
 // RC9a, finding 198. These radios are not inside a `<form>`, so their group is
 // the whole document and a fixed `name` would merge two enquiry panels, or this
 // panel and any other, into one group. The id is per-instance.
 const uid = useId();
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
   // Finding 203. This panel is the opposite half of the same finding. It never
   // put the route's English on an Arabic page, so nothing here read wrong; it
   // showed one sentence for every refusal instead, the same one it shows for a
   // dropped connection. An enquirer whose chosen time had passed while the page
   // sat open, and an enquirer who mistyped their email, were told the identical
   // thing, and neither could act on it. The route names each reason now.
   //
   // The condition tests the status rather than the payload, which is also a
   // correction. The only response this endpoint sends without a status is the
   // one it sends when there is no database, and that one reports success.
   if (!res.ok) { setVErr(apiErrorMessage(j.code, ar, t.errSend)); } else { setVDone(true); }
  } catch {
   setVErr(t.errSend);
  } finally { setVBusy(false); }
 }

 async function submit(path: Path) {
  if (!name.trim() || !email.trim()) { setErr(t.errContactRequired); return; }
  setBusy(true); setErr("");
  try {
   const res = await fetch("/api/leads", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
     listing_id: listingId, path,
     contact_name: name, contact_email: email,
     message: msg || null,
     consent: false,
    }),
   });
   const j = await res.json().catch(() => ({}));
   // Same correction on the enquiry itself. Every refusal here is a status, and
   // the route's only success carries no reason, so testing the payload for one
   // was testing for a shape this endpoint does not produce.
   if (!res.ok) { setErr(apiErrorMessage(j.code, ar, t.errSend)); }
   else { setDone(path); setOpen(null); }
  } catch {
   setErr(t.errSend);
  } finally { setBusy(false); }
 }

 if (done) {
  return (
   <div className="card pad ld-enquiry">
    <div className="row gap8" style={{ color: "var(--harbor-d)", marginBottom: 10 }}>
     <Icon.check size={20} /><span style={{ fontWeight: 700, fontSize: "0.9375rem", color: "var(--ink)" }}>{t.enquirySent}</span>
    </div>
    <p className="muted" style={{ fontSize: "0.84375rem", lineHeight: 1.6 }}>
     {t.enquiryBody}
    </p>
    <div className="col gap10" style={{ marginTop: 16 }}>
     <Link href={L("/messages")} className="btn primary" style={{ justifyContent: "center", textDecoration: "none" }}><Icon.send size={15} /> {t.openConversation}</Link>
     <Link href={L("/deal")} className="btn secondary" style={{ justifyContent: "center", textDecoration: "none" }}>{t.trackDeal}</Link>
    </div>
   </div>
  );
 }

 return (
  <div className="card pad ld-enquiry">
   <div className="row between" style={{ alignItems: "flex-start" }}>
    <div>
     <div className="mono" style={{ fontSize: "1.75rem", fontWeight: 500 }}>{(() => { const pp = priceParts(price, lease ? "lease" : "sale", locale as Loc); return (<><bdi>{pp ? pp.value : t.onRequest}</bdi>{pp && <small style={{ fontSize: "0.8125rem", color: "var(--slate)", fontWeight: 400 }}> <bdi>{pp.unit}</bdi></small>}</>); })()}</div>
     <div className="muted" style={{ fontSize: "0.78125rem", marginTop: 4 }}>{[type, netArea(area, locale as Loc), district].filter(Boolean).join(" · ")}</div>
    </div>
    <button onClick={toggleSave} aria-label={saved ? t.saved : t.save} className="chip" style={{ cursor: "pointer", borderColor: saved ? "var(--harbor)" : "var(--silver)", color: saved ? "var(--harbor)" : "var(--slate)" }}>
     <Icon.heart size={15} /> {saved ? t.saved : t.save}
    </button>
   </div>

   <div className="row gap8 wrap" style={{ marginTop: 14 }}>
    {/* ADV-1, finding 3, decision O3. This chip was unconditional: every listing
        on the platform carried a green "Verified owner" right above the enquiry
        form, on rows whose own record says no check has been run. It now shows
        only what the record has earned, and today that is nothing. */}
    {badges.map((b, i) => (
     <span key={`v${i}`} className="verified"><span className="dot" />{b}</span>
    ))}
    {permit && <span className="tag">{t.permit}{permit}</span>}
   </div>

   {contact ? <div className="hidden md:block" style={{ marginTop: 14 }}><ContactChannels {...contact} listingId={listingId} ar={ar} /></div> : null}

   {open ? (
    <form onSubmit={(e) => { e.preventDefault(); submit(open); }} className="col gap10" style={{ marginTop: 18 }}>
     {/* ELITE-4 J3-11: a placeholder is not a label. It is not exposed as the
         accessible name and it disappears the moment anything is typed. */}
     <label htmlFor="enq-name" className="sronly">{t.yourName}</label>
     <input id="enq-name" value={name} onChange={(e) => setName(e.target.value)} placeholder={t.yourName} style={fld} />
     <label htmlFor="enq-email" className="sronly">{t.workEmail}</label>
     <input id="enq-email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t.workEmail} type="email" style={fld} />
     <label htmlFor="enq-msg" className="sronly">{ar ? "رسالتك" : "Your message"}</label>
     <textarea id="enq-msg" value={msg} onChange={(e) => setMsg(e.target.value)} placeholder={ar ? `أنا مهتم بهذه المساحة (${type}) في ${district}...` : `I'm interested in this ${type.toLowerCase()} in ${district}...`} rows={3} style={{ ...fld, resize: "vertical" }} />
     <button type="submit" disabled={busy || !name.trim() || !email.trim()} className="btn primary" style={{ justifyContent: "center", minHeight: 44, opacity: busy || !name.trim() || !email.trim() ? 0.6 : 1 }}>{busy ? t.sending : t.sendEnquiry}</button>
     <button type="button" onClick={() => { setOpen(null); setErr(""); }} className="btn ghost" style={{ justifyContent: "center", minHeight: 44 }}>{t.cancel}</button>
    </form>
   ) : (
    <div className="col gap10" style={{ marginTop: 18 }}>
     <button onClick={() => setOpen("direct_contact")} className="btn primary" style={{ justifyContent: "center", minHeight: 44 }}><Icon.send size={15} /> {t.contactLister}</button>
    </div>
   )}

   {err && <p role="alert" style={{ color: "#B3261E", fontSize: "0.78125rem", marginTop: 10 }}>{err}</p>}
   {!open && (
    <div style={{ marginTop: 18, borderTop: "1px solid var(--silver)", paddingTop: 14 }}>
     <div className="row between" style={{ marginBottom: 9, alignItems: "baseline" }}>
      <span style={{ fontSize: "0.78125rem", fontWeight: 700 }}>{t.bookViewing}</span>
      {/* Who confirms the viewing is a PARTY distinction, not a status: SAT-hosted is the
          branded path (Harbor Deep), lister-confirmed is neutral (slate). The neutral side
          was an off-palette teal, ruled out by D24, which also read as a positive outcome. */}
      <span className="mono" style={{ fontSize: "0.65625rem", color: satListed ? "var(--harbor-d)" : "var(--slate)" }}>{satListed ? t.satHosts : t.listerConfirms}</span>
     </div>
     {vDone ? (
      <div className="row gap8" style={{ fontSize: "0.8125rem", alignItems: "flex-start" }}>
       <span style={{ color: "var(--harbor-d)", flex: "none", marginTop: 1 }}><Icon.check size={16} /></span>
       <span style={{ lineHeight: 1.55 }}>{satListed ? t.vDoneSat : t.vDoneLister}</span>
      </div>
     ) : (
      <>
       {/* ELITE-4 J3-12: one slot at a time, so these are radios. Selection used to
           be carried by a class name alone, which no assistive technology can read.
           RC9a, finding 198: that repair declared the role and then broke it twice.
           There were no arrow keys and no roving tabindex, so every slot was its own
           tab stop; and the handler read `slot === sl.iso ? null : sl.iso`, which
           unchecks a radio by pressing it again, something a radio cannot do. An
           enquirer using a screen reader was therefore told the group behaved one way
           while it behaved another. Native radios now. The deselect is deliberately
           gone rather than reproduced: it was the half of the behaviour the declared
           role forbade, it was barely reachable from the keyboard, and changing a
           choice, which is what an optional question actually needs, still works. The
           duplicate `aria-label` went with the role; the legend already names the
           group, and carrying both made the browser say it twice. */}
       <fieldset style={{ border: "none", padding: 0, margin: 0, minWidth: 0 }}>
        <legend className="sronly">{t.bookViewing}</legend>
        <div className="chip-rail row gap6" style={{ maxWidth: "100%" }}>
         {slots.map((sl) => (
          <label key={sl.iso} className={slot === sl.iso ? "chip on" : "chip"} style={{ cursor: "pointer" }}>
           <input type="radio" name={`${uid}-slot`} value={sl.iso} checked={slot === sl.iso} onChange={() => setSlot(sl.iso)} className="sronly" />
           {sl.label}
          </label>
         ))}
        </div>
       </fieldset>
       {slot && (
        <div className="col gap8" style={{ marginTop: 10 }}>
         <div className="muted" style={{ fontSize: "0.71875rem", lineHeight: 1.5 }}>{t.twoQuick}</div>
         {/* ELITE-4 J3-12: one answer per question, so radios again, inside a
             fieldset whose legend is the question being answered. RC9a, finding 198:
             the same two defects as the slot rail above, in the same shape, and the
             same repair. The legend is the question, so the group needs no
             `aria-label` saying the question a second time. */}
         {questions.map((q) => (
          <fieldset key={q.k} style={{ border: "none", padding: 0, margin: 0, minWidth: 0 }}>
           <legend style={{ fontSize: "0.71875rem", fontWeight: 600, color: "var(--slate)", padding: 0, margin: "4px 0 5px" }}>{ar ? q.ar : q.en}</legend>
           <div className="row gap6 wrap">
            {q.opts.map((o) => (
             <label key={o.v} className={qual[q.k] === o.v ? "chip on" : "chip"} style={{ cursor: "pointer" }}>
              <input type="radio" name={`${uid}-${q.k}`} value={o.v} checked={qual[q.k] === o.v} onChange={() => setQual((p) => ({ ...p, [q.k]: o.v }))} className="sronly" />
              {ar ? o.ar : o.en}
             </label>
            ))}
           </div>
          </fieldset>
         ))}
         {/* ELITE-4 J3-11: same two unlabelled fields, second copy. */}
         <label htmlFor="vw-name" className="sronly">{t.yourName}</label>
         <input id="vw-name" value={name} onChange={(e) => setName(e.target.value)} placeholder={t.yourName} style={fld} />
         <label htmlFor="vw-email" className="sronly">{t.workEmail}</label>
         <input id="vw-email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t.workEmail} type="email" style={fld} />
         {/* ELITE-4 J3-10: the enquiry error announces, this one did not. */}
         {vErr ? <div role="alert" style={{ fontSize: "0.78125rem", color: "var(--red)" }}>{vErr}</div> : null}
         <button type="button" disabled={vBusy || !name.trim() || !email.trim()} onClick={submitViewing} className="btn primary" style={{ justifyContent: "center", opacity: vBusy || !name.trim() || !email.trim() ? 0.6 : 1 }}>{vBusy ? t.sending : t.requestSlot}</button>
        </div>
       )}
      </>
     )}
    </div>
   )}

   <div className="muted" style={{ fontSize: "0.71875rem", marginTop: 14, lineHeight: 1.6 }}>{t.footer}</div>
  </div>
 );
}

const fld: React.CSSProperties = {
 border: "1px solid var(--silver)", borderRadius: 9, padding: "10px 12px",
 fontSize: "0.875rem", fontFamily: "var(--sans)", color: "var(--ink)", outline: "none", background: "var(--paper)", width: "100%",
};
