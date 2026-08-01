import Link from "next/link";
import { isLocale } from "@/i18n/config";
import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { getSupabaseServer } from "@/lib/supabase/server";
import { Icon, Photo } from "@/components/satkit";
import LeadStatusControl from "@/components/LeadStatusControl";
import { listingTitle } from "@/lib/listingTitle";

// The enquiry an owner actually came for. The dashboard listed enquirers by name and
// then had nowhere to send you: no message, no contact details, no way to reply. An
// exchange whose whole product is "an occupier got in touch" has to be able to show
// you what they said.
//
// Scoped at the database ("owner read own listing leads"), and re-checked here so a
// lead on someone else's listing is Not found rather than Forbidden.
export const dynamic = "force-dynamic";

export default async function EnquiryPage({ params }: { params: { locale: string; id: string } }) {
  if (!isLocale(params.locale)) notFound();
  const lp = params.locale;
  const ar = lp === "ar";

  const su = await getSessionUser();
  if (!su) redirect(`/${lp}/login`);
  if (!su.accountId) redirect(`/${lp}`);
  const sb = getSupabaseServer();
  if (!sb) notFound();

  const t = ar ? {
    back: "الاستفسارات", eyebrow: "استفسار",
    about: "بشأن", message: "الرسالة", noMessage: "لم يترك المستفسر رسالة.",
    contact: "بيانات التواصل", email: "البريد", phone: "الهاتف", noPhone: "لم يُقدَّم",
    path: "المسار", direct: "تواصل مباشر", rep: "طلب تمثيل من سات (خدمة موقوفة)",
    received: "وصل", consent: "الموافقة",
    consentYes: "وافق المستفسر على مشاركة بياناته معك.",
    consentNo: "لا توجد موافقة مسجّلة على هذا الاستفسار.",
    replyT: "الرد",
    replyB: "لا توجد مراسلة داخل المنصّة بعد. تواصل مع المستفسر مباشرة عبر البريد أو الهاتف أعلاه، ولا ندّعي أننا نرسل نيابةً عنك.",
    emailBtn: "راسله بالبريد",
  } : {
    back: "Enquiries", eyebrow: "Enquiry",
    about: "About", message: "Message", noMessage: "The enquirer left no message.",
    contact: "Contact", email: "Email", phone: "Phone", noPhone: "Not given",
    path: "Path", direct: "Direct contact", rep: "Asked for SAT representation (service discontinued)",
    received: "Received", consent: "Consent",
    consentYes: "The enquirer agreed to share their details with you.",
    consentNo: "No consent is recorded against this enquiry.",
    replyT: "Replying",
    replyB: "There is no on-platform messaging yet. Contact the enquirer directly by email or phone above. We are not going to pretend we send it for you.",
    emailBtn: "Email them",
  };

  const { data: lead } = await sb
    .from("leads")
    .select("id,listing_id,path,contact_name,contact_email,contact_phone,message,status,created_at,consent")
    .eq("id", params.id)
    .maybeSingle();
  if (!lead) notFound();

  const { data: listing } = (lead as any).listing_id
    ? await sb.from("listings").select("id,title_en,title_ar,asset_type,reference_code,account_id,district_id,districts(name_en,name_ar,city)").eq("id", (lead as any).listing_id).maybeSingle()
    : { data: null as any };

  // Belt and braces on top of RLS: a lead on someone else's listing is Not found.
  if (!su.isSat && (!listing || (listing as any).account_id !== su.accountId)) notFound();

  const l: any = lead;
  const stamp = new Date(l.created_at).toLocaleString(ar ? "ar-SA-u-nu-latn" : "en-GB", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Riyadh",
  });
  const title = listing ? listingTitle(listing as any, ar ? "ar" : "en") : null;

  const Row = ({ k, v }: { k: string; v: React.ReactNode }) => (
    <div className="row between" style={{ padding: "10px 0", borderTop: "1px solid var(--silver)", gap: 12, alignItems: "flex-start" }}>
      <span className="muted" style={{ fontSize: "0.78125rem", flex: "none" }}>{k}</span>
      <span style={{ fontSize: "0.8125rem", textAlign: ar ? "left" : "right" }}>{v}</span>
    </div>
  );

  return (
    <div style={{ maxWidth: 760 }}>
      <Link href={`/${lp}/dashboard`} className="muted" style={{ fontSize: "0.78125rem", display: "inline-flex", alignItems: "center", gap: 6 }}>
        <span style={{ display: "inline-flex", transform: ar ? "none" : "rotate(180deg)" }}><Icon.chevr size={14} /></span> {t.back}
      </Link>

      <div className="eyebrow" style={{ marginTop: 14 }}>{t.eyebrow}</div>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 700, letterSpacing: "-.01em", margin: "8px 0 0" }}>{l.contact_name || t.eyebrow}</h1>
      <div className="muted mono" style={{ fontSize: "0.75rem", marginTop: 4 }}>{t.received} {stamp}</div>

      {listing && (
        <Link href={`/${lp}/listings/${(listing as any).id}`} className="card pad row gap12" style={{ marginTop: 18, alignItems: "center", boxShadow: "var(--sh-1)" }}>
          <Photo kind={(listing as any).asset_type} h={44} style={{ width: 60, borderRadius: 8, flex: "none" }} />
          <div>
            <div className="muted" style={{ fontSize: "0.71875rem" }}>{t.about}</div>
            <div style={{ fontSize: "0.875rem", fontWeight: 600 }}>{title}</div>
          </div>
        </Link>
      )}

      <div className="card pad" style={{ marginTop: 16, boxShadow: "var(--sh-1)" }}>
        <div style={{ fontSize: "0.84375rem", fontWeight: 700 }}>{t.message}</div>
        <p style={{ fontSize: "0.875rem", lineHeight: 1.75, marginTop: 8, marginBottom: 0, whiteSpace: "pre-wrap", color: l.message ? "var(--ink)" : "var(--slate)" }}>
          {l.message || t.noMessage}
        </p>
      </div>

      <div className="card pad" style={{ marginTop: 16, boxShadow: "var(--sh-1)" }}>
        <div style={{ fontSize: "0.84375rem", fontWeight: 700, marginBottom: 4 }}>{t.contact}</div>
        <Row k={t.email} v={l.contact_email ? <a href={`mailto:${l.contact_email}`} style={{ color: "var(--azure-d)" }}>{l.contact_email}</a> : t.noPhone} />
        <Row k={t.phone} v={l.contact_phone ? <a href={`tel:${l.contact_phone}`} style={{ color: "var(--azure-d)" }}><bdi>{l.contact_phone}</bdi></a> : t.noPhone} />
        <Row k={t.path} v={l.path === "representation" ? t.rep : t.direct} />
        <Row k={t.consent} v={<span className="muted" style={{ fontSize: "0.78125rem" }}>{l.consent ? t.consentYes : t.consentNo}</span>} />
        {l.contact_email && (
          <a href={`mailto:${l.contact_email}`} className="btn primary sm" style={{ marginTop: 14 }}>{t.emailBtn}</a>
        )}
      </div>

      <div className="card pad" style={{ marginTop: 16, background: "var(--paper)", boxShadow: "none", border: "1px solid var(--silver)" }}>
        <LeadStatusControl id={l.id} locale={lp} initial={l.status || "new"} />
        <p className="muted" style={{ fontSize: "0.75rem", lineHeight: 1.7, marginTop: 12, marginBottom: 0, paddingTop: 10, borderTop: "1px solid var(--silver)" }}>{t.replyB}</p>
      </div>
    </div>
  );
}
