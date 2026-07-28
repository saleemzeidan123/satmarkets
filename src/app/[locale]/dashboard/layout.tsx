import Link from "next/link";
import { isLocale } from "@/i18n/config";
import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { getSupabaseServer } from "@/lib/supabase/server";
import { getDictionary } from "@/i18n/getDictionary";
import SignOutButton from "@/components/SignOutButton";
import DashNav from "@/components/DashNav";
import { Icon, Logo } from "@/components/satkit";

// One shell for every owner page. The dashboard used to render its own sidebar
// inline, so any sub-page (listings, enquiries) would have landed the owner in a
// bare document with no navigation and no way back. The rail lives here now, and
// every nav item goes somewhere real.
export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children, params,
}: { children: React.ReactNode; params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound();
  const lp = params.locale;
  const ar = lp === "ar";
  const dict = getDictionary(ar ? "ar" : "en");
  const db = dict.dashboard;

  const su = await getSessionUser();
  if (!su) redirect(`/${lp}/login`);
  if (!su.accountId) redirect(`/${lp}`);
  const sb = getSupabaseServer();

  let acctName = su.email || db.acctNameFallback;
  let acctRole = db.acctRoleFallback;
  let leadCount = 0;
  let viewingCount = 0;
  let reqCount = 0;

  if (sb) {
    const [{ data: acct }, mine, briefs] = await Promise.all([
      sb.from("accounts").select("name_en,name_ar,type,verification_status").eq("id", su.accountId).maybeSingle(),
      sb.from("listings").select("id").eq("account_id", su.accountId),
      sb.from("tenant_briefs").select("id", { count: "exact", head: true }).eq("status", "open"),
    ]);
    if (acct) {
      const a: any = acct;
      acctName = (ar ? a.name_ar : a.name_en) || a.name_en || acctName;
      // ADV-1. This read accounts.verification_status, a workflow status with zero
      // rows behind it in account_verifications, and printed "Verified owner" beside
      // the user's own name in their sidebar. The label states the ROLE, which is a
      // fact about the account; whether anything about it has been checked is the
      // identity dimension, and it is answered where a badge is actually earned.
      acctRole = a.type === "sat" ? (ar ? "فريق سات" : "SAT team") : (ar ? "مالك" : "Owner");
    }
    // SAT sees every lead, an owner only their own. In BOTH cases the badge counts
    // only enquiries still marked "new": one the owner has already handled must stop
    // adding to the badge, or the badge never goes down and people stop reading it.
    if (su.isSat) {
      const { count } = await sb.from("leads").select("id", { count: "exact", head: true }).eq("status", "new");
      leadCount = count || 0;
    } else {
      const ids = (mine.data || []).map((x: any) => x.id);
      if (ids.length) {
        const { count } = await sb.from("leads").select("id", { count: "exact", head: true }).in("listing_id", ids).eq("status", "new");
        leadCount = count || 0;
        // Only the ones still awaiting a decision. A badge that counts viewings the
        // lister has already answered is a badge that never goes away, and a badge that
        // never goes away is one people stop reading.
        const { count: vc } = await sb
          .from("viewings")
          .select("id", { count: "exact", head: true })
          .in("listing_id", ids)
          .eq("status", "requested");
        viewingCount = vc || 0;
      }
    }
    reqCount = briefs.count || 0;
  }

  const initials = acctName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="dash">
      <aside className="dside">
        <div className="brand"><Link href={`/${lp}`} aria-label="SAT Markets"><Logo size={26} rev /></Link></div>
        <DashNav
          locale={lp}
          items={[
            { key: "overview", label: db.navOverview, href: `/${lp}/dashboard` },
            { key: "listings", label: db.navMyListings, href: `/${lp}/dashboard/listings` },
            { key: "enquiries", label: db.navEnquiries, href: `/${lp}/dashboard/enquiries`, badge: leadCount || undefined },
            { key: "viewings", label: db.navViewings, href: `/${lp}/dashboard/viewings`, badge: viewingCount || undefined },
            { key: "requirements", label: db.navReqMatches, href: `/${lp}/dashboard/requirements`, badge: reqCount || undefined },
            { key: "account", label: db.navAccount, section: true },
            { key: "profile", label: ar ? "الملف العام" : "Profile", href: `/${lp}/dashboard/profile` },
            { key: "billing", label: db.navBilling, href: `/${lp}/pricing` },
          ]}
        />
        <div className="me">
          <Link href={`/${lp}/pricing`} className="melink" aria-label={ar ? "الحساب والفوترة" : "Account and billing"}>
            <span className="avatar" style={{ background: "var(--harbor)" }}>{initials}</span>
            <span className="txt"><span className="nm">{acctName}</span><span className="rl">{acctRole}</span></span>
            <span className="chev" aria-hidden>›</span>
          </Link>
          <SignOutButton locale={lp} label={dict.login.signOut} />
        </div>
      </aside>
      <div className="dmain">
        <div className="dtopbar">
          <div>
            <h1>{acctName}</h1>
            <div className="sub">{acctRole}</div>
          </div>
          <span style={{ flex: 1 }} />
          <Link href={`/${lp}/list`} className="btn primary"><Icon.plus size={16} /> {db.listSpace}</Link>
        </div>
        <div className="dbody">{children}</div>
      </div>
    </div>
  );
}
