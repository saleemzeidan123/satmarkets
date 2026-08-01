import Link from "next/link";
import { isLocale } from "@/i18n/config";
import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { getSupabaseServer } from "@/lib/supabase/server";
import { Icon } from "@/components/satkit";
import ScrollRegion from "@/components/ScrollRegion";
import { listingTitle } from "@/lib/listingTitle";

// Every enquiry on the owner's own listings. The dashboard showed the five most
// recent and then had nowhere to send you.
export const dynamic = "force-dynamic";

const initials = (s: string) => s.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

export default async function EnquiriesPage({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound();
  const lp = params.locale;
  const ar = lp === "ar";

  const su = await getSessionUser();
  if (!su) redirect(`/${lp}/login`);
  if (!su.accountId) redirect(`/${lp}`);
  const sb = getSupabaseServer();
  if (!sb) notFound();

  const t = ar ? {
    title: "الاستفسارات", sub: "من تواصلوا معك بشأن مساحاتك",
    thWho: "المستفسر", thListing: "العرض", thPath: "الحالة", thWhen: "وصل",
    direct: "تواصل مباشر", rep: "طلب تمثيل",
    emptyT: "لا استفسارات بعد",
    emptyB: "حين يتواصل أحدهم بشأن أحد عروضك، ستجده هنا برسالته وبيانات تواصله كاملة.",
    emptyC: "اعرض عروضي",
    anon: "استفسار",
  } : {
    title: "Enquiries", sub: "People who've reached out about your spaces",
    thWho: "Enquirer", thListing: "Listing", thPath: "Status", thWhen: "Received",
    direct: "Direct contact", rep: "Representation (discontinued)",
    emptyT: "No enquiries yet",
    emptyB: "When someone reaches out about a listing, you'll find them here, with their message and full contact details.",
    emptyC: "View my listings",
    anon: "Enquiry",
  };

  // RLS ("owner read own listing leads") already scopes this to the owner's listings;
  // SAT sees all. We do not filter again here, we just render what we are allowed.
  const [{ data: leads }, { data: mine }] = await Promise.all([
    sb.from("leads").select("id,listing_id,path,contact_name,created_at,status").order("created_at", { ascending: false }).limit(200),
    sb.from("listings").select("id").eq("account_id", su.accountId),
  ]);

  const mineIds = new Set((mine || []).map((x: any) => x.id));
  const rows = (leads || [])
    .filter((l: any) => su.isSat || (l.listing_id && mineIds.has(l.listing_id)))
    // New (unhandled) enquiries rise to the top; within each group, most recent first.
    .sort((a: any, b: any) => (((b.status || "new") === "new" ? 1 : 0) - ((a.status || "new") === "new" ? 1 : 0)));

  const stLabel = (s: string): { label: string; cls: string } => {
    switch (s) {
      case "contacted": return { label: ar ? "تم التواصل" : "In touch", cls: "pend" };
      case "qualified": return { label: ar ? "مؤهّل" : "Qualified", cls: "pend" };
      case "converted": return { label: ar ? "مكسوب" : "Won", cls: "ok" };
      case "closed_lost": return { label: ar ? "مُغلق" : "Closed", cls: "off" };
      default: return { label: ar ? "جديد" : "New", cls: "warn" };
    }
  };

  // Resolve titles for the listings actually referenced by the rows we can see. This
  // used to look only at the session's own listings, so a SAT operator, who is allowed
  // to see every lead, got a blank Listing column on every row.
  const ids = Array.from(new Set(rows.map((l: any) => l.listing_id).filter(Boolean)));
  const { data: refd } = ids.length
    ? await sb.from("listings").select("id,title_en,title_ar,asset_type,reference_code,districts(name_en,name_ar,city)").in("id", ids)
    : { data: [] as any[] };
  const titleOf = new Map((refd || []).map((x: any) => [x.id, listingTitle(x, ar ? "ar" : "en")]));

  const stamp = (d: string) =>
    new Date(d).toLocaleString(ar ? "ar-SA-u-nu-latn" : "en-GB", {
      day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Riyadh",
    });

  return (
    <div>
      <div style={{ marginBottom: 18 }}>
        <h1 style={{ fontSize: "1.375rem", fontWeight: 700, letterSpacing: "-.01em", margin: 0 }}>{t.title}</h1>
        <div className="muted" style={{ fontSize: "0.8125rem", marginTop: 3 }}>{t.sub}</div>
      </div>

      <div className="dpanel">
        <div className="ph">
          <span style={{ color: "var(--harbor)" }}><Icon.inbox size={17} /></span>
          <span className="t">{t.title}</span>
          <span style={{ flex: 1 }} />
          <span className="muted" style={{ fontSize: "0.71875rem" }}>{rows.length}</span>
        </div>

        {rows.length === 0 ? (
          <div style={{ padding: "24px 20px 28px" }}>
            <div style={{ fontSize: "0.84375rem", fontWeight: 600 }}>{t.emptyT}</div>
            <div className="muted" style={{ fontSize: "0.78125rem", lineHeight: 1.65, marginTop: 5, maxWidth: 400 }}>{t.emptyB}</div>
            <Link href={`/${lp}/dashboard/listings`} className="btn secondary sm" style={{ marginTop: 12 }}>{t.emptyC}</Link>
          </div>
        ) : (
          <ScrollRegion label={t.title}>
            <table className="dt" style={{ minWidth: 640 }}>
              <caption className="sronly">{t.title}</caption>
              <thead>
                <tr>
                  <th scope="col">{t.thWho}</th><th scope="col">{t.thListing}</th><th scope="col">{t.thPath}</th>
                  <th scope="col" style={{ textAlign: "right" }}>{t.thWhen}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((l: any) => {
                  const nm = l.contact_name || t.anon;
                  return (
                    <tr key={l.id}>
                      <td>
                        <Link href={`/${lp}/dashboard/enquiries/${l.id}`} className="row gap10 rowlink" style={{ color: "inherit" }}>
                          <span className="avatar" style={{ background: "var(--harbor)", flex: "none" }}>{initials(nm)}</span>
                          <span style={{ fontWeight: 600, fontSize: "0.8125rem" }}>{nm}</span>
                        </Link>
                      </td>
                      <td className="muted" style={{ fontSize: "0.78125rem" }}>{titleOf.get(l.listing_id) || ""}</td>
                      <td>{(() => { const s = stLabel(l.status || "new"); return <span className={"statusdot " + s.cls} style={{ fontSize: "0.75rem" }}>{s.label}</span>; })()}</td>
                      <td className="num mono muted" style={{ fontSize: "0.71875rem" }}>{stamp(l.created_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </ScrollRegion>
        )}
      </div>
    </div>
  );
}
