import Link from "next/link";
import { isLocale } from "@/i18n/config";
import { notFound } from "next/navigation";
import { getSupabaseServer } from "@/lib/supabase/server";
import AdminShell, { requireSat, stamp } from "@/components/AdminShell";
import { Icon } from "@/components/satkit";
import ScrollRegion from "@/components/ScrollRegion";
import { listingTitle } from "@/lib/listingTitle";

// Every figure here is a live count from the database, or it is not shown.
export const dynamic = "force-dynamic";

function KCard({ icon: I, tone, v, l, note }: { icon: (p: { size?: number }) => JSX.Element; tone?: string; v: string; l: string; note?: string }) {
  return (
    <div className="kcard">
      <div className="top"><span className={"ic" + (tone ? " " + tone : "")}><I size={18} /></span></div>
      <div className="v tnum">{v}</div>
      <div className="l">{l}</div>
      {note && <div className="muted" style={{ fontSize: "0.71875rem", marginTop: 4 }}>{note}</div>}
    </div>
  );
}

export default async function AdminPage(props: { params: Promise<{ locale: string }> }) {
  const params = await props.params;
  if (!isLocale(params.locale)) notFound();
  const lp = params.locale;
  const ar = lp === "ar";
  const session = await requireSat(lp);
  const sb = getSupabaseServer()!;

  const t = ar ? {
    title: "لوحة تشغيل المنصّة", sub: "أرقام مباشرة من قاعدة البيانات",
    kListings: "عروض منشورة", kEnq: "استفسارات (الإجمالي)", kReqs: "طلبات مفتوحة", kAcc: "حسابات",
    accNote: (v: number, p: number) => `${v} موثّق · ${p} بانتظار التوثيق`,
    recent: "أحدث الاستفسارات", recentEmpty: "لا توجد استفسارات بعد.", viewAll: "كل الحسابات",
    thWho: "المستفسر", thListing: "العرض", thWhen: "الوقت",
    nbT: "غير مبني بعد",
    nbB: "تتبّع تصاريح الإعلان ورخص فال، ووسم العروض، وسجلّ نشاط المنصّة: لا شيء من ذلك مبني بعد، ولا توجد له بيانات. ولن يظهر هنا أي رقم تنظيمي قبل أن يأتي من مصدر رسمي.",
  } : {
    title: "Platform operations", sub: "Live counts from the database",
    kListings: "Published listings", kEnq: "Enquiries (all time)", kReqs: "Open requirements", kAcc: "Accounts",
    accNote: (v: number, p: number) => `${v} verified · ${p} awaiting verification`,
    recent: "Recent enquiries", recentEmpty: "No enquiries yet.", viewAll: "All accounts",
    thWho: "Enquirer", thListing: "Listing", thWhen: "Received",
    nbT: "Not built yet",
    nbB: "Advertising-permit and FAL licence tracking, listing flagging, and platform activity history are not built, and no data for them exists. No regulatory figure will appear here until it comes from an authoritative source.",
  };

  const [lc, ec, rc, ac, avc, sq, recent] = await Promise.all([
    // simulated-visible. The operator console exists to show what is actually in the
    // database, simulated rows included. Admin gated, and it publishes no claim.
    sb.from("listings").select("id", { count: "exact", head: true }).eq("status", "published"),
    sb.from("leads").select("id", { count: "exact", head: true }),
    sb.from("tenant_briefs").select("id", { count: "exact", head: true }).eq("status", "open"),
    sb.from("accounts").select("id", { count: "exact", head: true }),
    sb.from("accounts").select("id", { count: "exact", head: true }).eq("verification_status", "verified"),
    sb.from("signup_requests").select("id", { count: "exact", head: true }).eq("status", "new"),
    sb.from("leads").select("id,contact_name,listing_id,created_at").order("created_at", { ascending: false }).limit(8),
  ]);

  const accounts = ac.count ?? 0, verified = avc.count ?? 0;
  const leads = recent.data || [];
  const ids = Array.from(new Set(leads.map((l: any) => l.listing_id).filter(Boolean)));
  const { data: ls } = ids.length
    ? await sb.from("listings").select("id,title_en,title_ar,asset_type,reference_code,districts(name_en,name_ar,city)").in("id", ids)
    : { data: [] as any[] };
  const titleOf = new Map((ls || []).map((x: any) => [x.id, listingTitle(x, ar ? "ar" : "en")]));

  return (
    <AdminShell locale={lp} active="overview" title={t.title} sub={t.sub} session={session} counts={{ signups: sq.count ?? 0 }}>
      <div className="kgrid">
        <KCard icon={Icon.building} tone="h" v={(lc.count ?? 0).toLocaleString("en-US")} l={t.kListings} />
        <KCard icon={Icon.inbox} v={(ec.count ?? 0).toLocaleString("en-US")} l={t.kEnq} />
        <KCard icon={Icon.doc} v={(rc.count ?? 0).toLocaleString("en-US")} l={t.kReqs} />
        <KCard icon={Icon.grid} tone="a" v={accounts.toLocaleString("en-US")} l={t.kAcc} note={t.accNote(verified, Math.max(0, accounts - verified))} />
      </div>

      <div className="dpanel" style={{ marginTop: 18 }}>
        <div className="ph">
          <span style={{ color: "var(--harbor)" }}><Icon.inbox size={17} /></span>
          <span className="t">{t.recent}</span>
          <span style={{ flex: 1 }} />
          <Link href={`/${lp}/admin/accounts`} style={{ fontSize: "0.78125rem", color: "var(--azure-d)", fontWeight: 600 }}>{t.viewAll}</Link>
        </div>
        {leads.length === 0 ? (
          <div className="muted" style={{ padding: "22px 20px", fontSize: "0.78125rem" }}>{t.recentEmpty}</div>
        ) : (
          <ScrollRegion label={t.recent}>
            <table className="dt" style={{ minWidth: 520 }}>
              <caption className="sronly">{t.recent}</caption>
              <thead><tr><th scope="col">{t.thWho}</th><th scope="col">{t.thListing}</th><th scope="col" style={{ textAlign: "right" }}>{t.thWhen}</th></tr></thead>
              <tbody>
                {leads.map((l: any) => (
                  <tr key={l.id}>
                    <td style={{ fontWeight: 600, fontSize: "0.8125rem" }}>{l.contact_name || (ar ? "استفسار" : "Enquiry")}</td>
                    <td className="muted" style={{ fontSize: "0.78125rem" }}>
                      {l.listing_id
                        ? <Link href={`/${lp}/listings/${l.listing_id}`} style={{ color: "var(--azure-d)" }}>{titleOf.get(l.listing_id) || l.listing_id}</Link>
                        : ""}
                    </td>
                    <td className="num mono muted" style={{ fontSize: "0.71875rem" }}>{stamp(l.created_at, ar)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollRegion>
        )}
      </div>

      <div className="dpanel" style={{ marginTop: 18 }}>
        <div className="ph"><span style={{ color: "var(--slate)" }}><Icon.flag size={16} /></span><span className="t">{t.nbT}</span></div>
        <div className="muted" style={{ padding: "14px 20px 18px", fontSize: "0.78125rem", lineHeight: 1.7, maxWidth: 620 }}>{t.nbB}</div>
      </div>
    </AdminShell>
  );
}
