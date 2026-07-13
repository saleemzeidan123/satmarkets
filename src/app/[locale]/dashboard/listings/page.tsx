import Link from "next/link";
import { isLocale } from "@/i18n/config";
import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { getSupabaseServer } from "@/lib/supabase/server";
import { getDictionary } from "@/i18n/getDictionary";
import { Icon, Photo } from "@/components/satkit";
import ListingStatusToggle from "@/components/ListingStatusToggle";
import { gateFailures, gateReasonsText } from "@/lib/gate";

// The owner's own inventory, with controls. "My listings" in the dashboard nav used
// to send owners to the PUBLIC explore page, where their listings appeared as
// anonymous cards among everyone else's and could not be edited, paused or even
// identified as theirs.
export const dynamic = "force-dynamic";

export default async function OwnerListingsPage({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound();
  const lp = params.locale;
  const ar = lp === "ar";
  const db = getDictionary(ar ? "ar" : "en").dashboard;

  const su = await getSessionUser();
  if (!su) redirect(`/${lp}/login`);
  if (!su.accountId) redirect(`/${lp}`);
  const sb = getSupabaseServer();
  if (!sb) notFound();

  const t = ar ? {
    title: "عروضي", sub: "أنت تتحكّم بما هو معروض في السوق",
    thListing: "العرض", thEnq: "استفسارات", thStatus: "الحالة", thAction: "",
    emptyT: "لا عروض بعد", emptyB: "أدرج مساحتك الأولى ليبدأ ظهورها للمستأجرين الباحثين في الرياض.", emptyC: "أدرج مساحة",
    pause: "إيقاف مؤقّت", resume: "إعادة النشر", working: "جارٍ",
    st: { published: "منشور", archived: "موقوف", draft: "مسودة", pending_review: "قيد المراجعة", approved: "معتمد", rejected: "مرفوض" } as Record<string,string>,
    view: "اعرض", note: "الإيقاف المؤقّت يزيل العرض من السوق فوراً. وإعادة النشر تخضع لبوابة النشر نفسها: لا يعود العرض إلى السوق بلا تصريح إعلان ساري.",
    cannot: "تعذّرت إعادة النشر:",
  } : {
    title: "My listings", sub: "You control what is on the market",
    thListing: "Listing", thEnq: "Enquiries", thStatus: "Status", thAction: "",
    emptyT: "No listings yet", emptyB: "List your first space and it starts reaching occupiers searching in Riyadh.", emptyC: "List a space",
    pause: "Pause", resume: "Republish", working: "Working",
    st: { published: "Published", archived: "Paused", draft: "Draft", pending_review: "In review", approved: "Approved", rejected: "Rejected" } as Record<string,string>,
    view: "View", note: "Pausing takes the listing off the market immediately. Republishing goes through the same publish gate as any other listing: nothing returns to the market without a valid advertising permit.",
    cannot: "Cannot republish:",
  };

  const [{ data: listings }, { data: leads }, { data: districts }] = await Promise.all([
    sb.from("listings").select("id,title_en,title_ar,asset_type,status,area_sqm,asking_rent_sqm,sale_price,deal_type,district_id,ownership_verified,authorization_verified,right_to_market_confirmed,ad_permit_no,ad_permit_number,ad_permit_expires_at")
      .eq("account_id", su.accountId).order("created_at", { ascending: false }).order("id", { ascending: true }),
    sb.from("leads").select("id,listing_id"),
    sb.from("districts").select("id,name_en,name_ar"),
  ]);

  const rows = listings || [];
  const dmap = new Map((districts || []).map((x: any) => [x.id, (ar ? x.name_ar : x.name_en) || x.name_en]));
  const enq = new Map<string, number>();
  (leads || []).forEach((l: any) => { if (l.listing_id) enq.set(l.listing_id, (enq.get(l.listing_id) || 0) + 1); });

  return (
    <div>
      <div className="row between wrap" style={{ alignItems: "flex-end", gap: 12, marginBottom: 18 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-.01em", margin: 0 }}>{t.title}</h1>
          <div className="muted" style={{ fontSize: 13, marginTop: 3 }}>{t.sub}</div>
        </div>
        <Link href={`/${lp}/list`} className="btn primary"><Icon.plus size={16} /> {db.listSpace}</Link>
      </div>

      <div className="dpanel">
        {rows.length === 0 ? (
          <div style={{ padding: "24px 20px 28px" }}>
            <div style={{ fontSize: 13.5, fontWeight: 600 }}>{t.emptyT}</div>
            <div className="muted" style={{ fontSize: 12.5, lineHeight: 1.65, marginTop: 5, maxWidth: 380 }}>{t.emptyB}</div>
            <Link href={`/${lp}/list`} className="btn secondary sm" style={{ marginTop: 12 }}>{t.emptyC}</Link>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="dt" style={{ minWidth: 640 }}>
              <thead>
                <tr>
                  <th>{t.thListing}</th>
                  <th style={{ textAlign: "right" }}>{t.thEnq}</th>
                  <th>{t.thStatus}</th>
                  <th style={{ textAlign: "right" }}>{t.thAction}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((l: any) => {
                  const title = (ar ? l.title_ar : l.title_en) || l.title_en;
                  const rent = l.deal_type === "lease" ? l.asking_rent_sqm : l.sale_price;
                  const live = l.status === "published";
                  const n = enq.get(l.id) || 0;
                  // Why this listing cannot go back on the market, in the owner's language.
                  const fails = l.status === "archived" ? gateFailures(l) : [];
                  const blocked = fails.length ? gateReasonsText(fails, ar) : null;
                  return (
                    <tr key={l.id}>
                      <td>
                        <div className="row gap10">
                          <Photo kind={l.asset_type} h={40} style={{ width: 56, borderRadius: 7, flex: "none" }} />
                          <div>
                            <Link href={`/${lp}/listings/${l.id}`} style={{ fontWeight: 600, fontSize: 13, color: "var(--ink)" }}>{title}</Link>
                            <div className="mono muted" style={{ fontSize: 11 }}>
                              <bdi>{(dmap.get(l.district_id) || "") + (l.area_sqm ? " · " + l.area_sqm + db.m2 : "") + (rent ? " · " + Number(rent).toLocaleString("en-US") + (l.deal_type === "lease" ? db.sarSqm : db.sar) : "")}</bdi>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="num mono" style={{ fontWeight: 600, color: n ? "var(--ink)" : "var(--slate-2)" }}>{n}</td>
                      <td><span className={"statusdot " + (live ? "ok" : "pend")} style={{ fontSize: 12 }}>{t.st[l.status] || l.status}</span></td>
                      <td className="num">
                        <ListingStatusToggle id={l.id} status={l.status} blocked={blocked} t={{ pause: t.pause, resume: t.resume, working: t.working, cannot: t.cannot }} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <div className="muted" style={{ padding: "12px 20px 16px", fontSize: 11.5, lineHeight: 1.6, borderTop: "1px solid var(--silver)" }}>{t.note}</div>
      </div>
    </div>
  );
}
