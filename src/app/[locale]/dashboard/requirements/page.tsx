import Link from "next/link";
import { isLocale } from "@/i18n/config";
import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { getSupabaseServer } from "@/lib/supabase/server";
import { getDictionary } from "@/i18n/getDictionary";
import { Icon } from "@/components/satkit";

// Requirement matches, scoped to the owner. The dashboard nav used to send owners to
// the PUBLIC requirements page (the whole market); this answers the narrower, more
// useful question: which open occupier requirements line up with MY listings, and
// how do I pitch them. Matching is honest and coarse (same asset type, and same
// district when the requirement names one); we never assert a fake match score.
export const dynamic = "force-dynamic";

export default async function DashboardRequirementsPage({ params }: { params: { locale: string } }) {
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
    title: "طلبات المطابقة",
    sub: "مستأجرون موثّقون يبحثون عن مساحات مثل مساحاتك",
    matchOn: "يطابق",
    pitch: "قدّم عرضك",
    browseAll: "تصفّح كل الطلبات",
    emptyT: "لا طلبات مطابقة بعد",
    emptyB: "حين يُدرج مستأجر طلباً يوافق نوع أصولك وموقعها، سيظهر هنا فوراً لتتقدّم إليه. لا نعرض مطابقات غير حقيقية.",
    to: " إلى ",
  } : {
    title: "Requirement matches",
    sub: "Verified occupiers looking for spaces like yours",
    matchOn: "Matches your",
    pitch: "Pitch",
    browseAll: "Browse all requirements",
    emptyT: "No matching requirements yet",
    emptyB: "When an occupier posts a requirement that fits your asset type and location, it shows up here for you to pitch. We never show matches that are not real.",
    to: " to ",
  };

  const [{ data: briefs }, { data: mine }, { data: districts }] = await Promise.all([
    sb.from("tenant_briefs").select("id,title,title_ar,asset_type,size_min_sqm,size_max_sqm,district_id,city,ref_code").eq("status", "open").order("created_at", { ascending: false }).limit(60),
    sb.from("listings").select("id,title_en,title_ar,asset_type,district_id").eq("account_id", su.accountId),
    sb.from("districts").select("id,name_en,name_ar"),
  ]);

  const dmap = new Map((districts || []).map((x: any) => [x.id, (ar ? x.name_ar : x.name_en) || x.name_en]));
  const myListings = mine || [];

  // A brief matches one of the owner's listings when the asset type agrees, and,
  // when the brief names a district, the listing sits in it. Coarse but honest.
  const matchFor = (b: any) => {
    const cands = myListings.filter((l: any) => l.asset_type === b.asset_type && (!b.district_id || l.district_id === b.district_id));
    return cands[0] || null;
  };
  const rows = (briefs || [])
    .map((b: any) => ({ b, match: matchFor(b) }))
    .filter((r) => r.match); // only requirements that actually match one of my listings

  return (
    <div>
      <div style={{ marginBottom: 18 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-.01em", margin: 0 }}>{t.title}</h1>
        <div className="muted" style={{ fontSize: 13, marginTop: 3 }}>{t.sub}</div>
      </div>

      <div className="dpanel">
        <div className="ph">
          <span style={{ color: "var(--harbor)" }}><Icon.target size={17} /></span>
          <span className="t">{t.title}</span>
          <span style={{ flex: 1 }} />
          <Link href={`/${lp}/requirements`} style={{ fontSize: 12.5, color: "var(--azure-d)", fontWeight: 600, textDecoration: "none" }}>{t.browseAll}</Link>
        </div>

        {rows.length === 0 ? (
          <div style={{ padding: "24px 20px 28px" }}>
            <div style={{ fontSize: 13.5, fontWeight: 600 }}>{t.emptyT}</div>
            <div className="muted" style={{ fontSize: 12.5, lineHeight: 1.65, marginTop: 5, maxWidth: 440 }}>{t.emptyB}</div>
            <Link href={`/${lp}/requirements`} className="btn secondary sm" style={{ marginTop: 12 }}>{t.browseAll}</Link>
          </div>
        ) : (
          rows.map(({ b, match }: any) => {
            const rtitle = (ar ? (b.title_ar || b.title) : b.title) || (b.asset_type + (ar ? " مطلوب" : " requirement"));
            const loc = dmap.get(b.district_id) || b.city || db.riyadh;
            const size = (b.size_min_sqm || "?") + t.to + (b.size_max_sqm || "?") + db.m2;
            const mtitle = (ar ? match.title_ar : match.title_en) || match.title_en;
            return (
              <div key={b.id} className="lead-item">
                <span className="queue-ic"><Icon.doc size={16} /></span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{rtitle}</div>
                  <div className="muted" style={{ fontSize: 11.5 }}><bdi>{loc} · {size}</bdi></div>
                  <div className="mono" style={{ fontSize: 11, color: "var(--harbor)", marginTop: 3 }}>{t.matchOn} {mtitle}</div>
                </div>
                <Link href={`/${lp}/requirements/${b.id}`} className="btn secondary sm rowact">{t.pitch}</Link>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
