import Link from "next/link";
import { isLocale } from "@/i18n/config";
import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import SignOutButton from "@/components/SignOutButton";
import { Icon, Logo, Photo } from "@/components/satkit";
import { getSupabaseServer } from "@/lib/supabase/server";
import { getDictionary } from "@/i18n/getDictionary";

function KCard({ icon: I, tone, v, l, delta, dir }: { icon: (p: { size?: number }) => JSX.Element; tone?: string; v: string; l: string; delta?: string; dir?: string }) {
 return (
  <div className="kcard">
   <div className="top">
    <span className={"ic" + (tone ? " " + tone : "")}><I size={18} /></span>
    {delta && <span className={"delta " + (dir || "")}>{dir === "up" ? "▲ " : dir === "down" ? "▼ " : ""}{delta}</span>}
   </div>
   <div className="v tnum">{v}</div>
   <div className="l">{l}</div>
  </div>
 );
}
function ago(d: string, ar: boolean) { const s = (Date.now() - new Date(d).getTime()) / 1000; if (s < 3600) { const n = Math.max(1, Math.round(s / 60)); return ar ? `منذ ${n} د` : n + "m ago"; } if (s < 86400) { const n = Math.round(s / 3600); return ar ? `منذ ${n} س` : n + "h ago"; } const n = Math.round(s / 86400); return ar ? `منذ ${n} ي` : n + "d ago"; }
const initials = (s: string) => s.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

export default async function DashboardPage({ params }: { params: { locale: string } }) {
 if (!isLocale(params.locale)) notFound();
 const lp = params.locale;
 const ar = lp === "ar";
 const db = getDictionary(lp === "ar" ? "ar" : "en").dashboard;
 const su = await getSessionUser();
 if (!su) redirect(`/${lp}/login`);
 if (!su.accountId) redirect(`/${lp}`);
 const accountId = su.accountId;
 let acctName = su.email || (db.acctNameFallback);
 let acctRole = db.acctRoleFallback;
 const rcity = db.riyadh;
 const na = db.na;

 const sb = getSupabaseServer();
 let pub: any[] = [], leadRows: any[] = [], briefs: any[] = [], districts: any[] = [], pubCount = 0;
 if (sb) {
  const [a, b, c, d, e, f] = await Promise.all([
   sb.from("listings").select("id,title_en,title_ar,asset_type,asking_rent_sqm,sale_price,deal_type,district_id,area_sqm").eq("status", "published").eq("account_id", accountId).limit(50),
   sb.from("leads").select("id,listing_id,path,contact_name,created_at").order("created_at", { ascending: false }).limit(20),
   sb.from("tenant_briefs").select("id,title,asset_type,size_min_sqm,size_max_sqm,district_id,city,ref_code").eq("status", "open").limit(6),
   sb.from("districts").select("id,name_en,name_ar"),
   sb.from("listings").select("id", { count: "exact", head: true }).eq("status", "published").eq("account_id", accountId),
   sb.from("accounts").select("name_en,name_ar,type,verification_status").eq("id", accountId).maybeSingle(),
  ]);
  pub = a.data || []; leadRows = b.data || []; briefs = c.data || []; districts = d.data || []; pubCount = e.count || pub.length;
  leadRows = leadRows.filter((l: any) => pub.some((x: any) => x.id === l.listing_id));
  const acct: any = f.data;
  if (acct) {
   acctName = (ar ? acct.name_ar : acct.name_en) || acct.name_en || acctName;
   acctRole = acct.type === "sat" ? (ar ? "فريق سات" : "SAT team") : (acct.verification_status === "verified" ? (ar ? "مالك موثّق" : "Verified owner") : (ar ? "مالك" : "Owner"));
  }
 }
 const dmap = new Map(districts.map((x: any) => [x.id, (ar ? x.name_ar : x.name_en) || x.name_en]));
 const titleById = new Map(pub.map((x: any) => [x.id, (ar ? x.title_ar : x.title_en) || x.title_en]));
 const enq = new Map<string, number>();
 leadRows.forEach((l: any) => { if (l.listing_id) enq.set(l.listing_id, (enq.get(l.listing_id) || 0) + 1); });
 const repCount = leadRows.filter((l: any) => l.path === "representation").length;

 const listings = pub.slice(0, 5).map((l: any) => {
  const rent = l.deal_type === "lease" ? l.asking_rent_sqm : l.sale_price;
  return {
   title: (ar ? l.title_ar : l.title_en) || l.title_en, place: (dmap.get(l.district_id) || rcity) + " · " + (l.area_sqm ? l.area_sqm + (db.m2) : na),
   asset: l.asset_type, rent: rent ? Number(rent).toLocaleString("en-US") + (l.deal_type === "lease" ? (db.sarSqm) : (db.sar)) : (db.onRequest),
   views: null as number | null, saves: null as number | null, enq: enq.get(l.id) || 0,
  };
 });
 const leads = leadRows.slice(0, 5).map((l: any) => {
  const nm = l.contact_name || (l.path === "representation" ? (db.repRequest) : (db.directEnquiry));
  return { ini: initials(nm), name: nm, listing: titleById.get(l.listing_id) || (db.verifiedListing), time: ago(l.created_at, ar), status: "new" };
 });
 const matches = briefs.map((b: any) => ({ title: b.title || (ar ? "طلب" : b.asset_type + " requirement"), spec: (dmap.get(b.district_id) || b.city || rcity) + " · " + (b.size_min_sqm || "?") + "–" + (b.size_max_sqm || "?") + (db.m2) }));

 const nav: { label: string; icon?: (p: { size?: number }) => JSX.Element; badge?: string; warn?: boolean; sec?: boolean; href?: string }[] = [
  { label: db.navOverview, icon: Icon.grid, href: `/${lp}/dashboard` },
  { label: db.navMyListings, icon: Icon.building, href: `/${lp}/listings` },
  { label: db.navEnquiries, icon: Icon.inbox, badge: String(leadRows.length), href: `/${lp}/messages` },
  { label: db.navReqMatches, icon: Icon.target, badge: String(matches.length), href: `/${lp}/requirements` },
  { label: db.navPerformance, icon: Icon.chart, href: `/${lp}/dashboard` },
  { label: db.navAccount, sec: true },
  { label: db.navBilling, icon: Icon.coins, href: `/${lp}/pricing` },
  { label: db.navSettings, icon: Icon.gear, href: `/${lp}/dashboard` },
 ];
 return (
  <div className="dash">
   <aside className="dside">
    <div className="brand"><Link href={`/${params.locale}`} aria-label="Home"><Logo size={26} rev /></Link></div>
    <div className="dnav">
     {nav.map((n, i) => n.sec
      ? <div key={i} className="sec">{n.label}</div>
      : <Link key={i} href={n.href || `/${params.locale}/dashboard`} className={i === 0 ? "on" : ""}>
        <span className="ic">{n.icon && n.icon({ size: 18 })}</span>
        <span>{n.label}</span>
        {n.badge && <span className={"badge" + (n.warn ? " warn" : "")}>{n.badge}</span>}
       </Link>)}
    </div>
    <div className="me">
     <span className="avatar" style={{ background: "var(--harbor)" }}>{acctName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}</span>
     <div><div className="nm">{acctName}</div><div className="rl">{acctRole}</div></div>
     <SignOutButton locale={lp} label={getDictionary(lp === "ar" ? "ar" : "en").login.signOut} />
    </div>
   </aside>
   <div className="dmain">
    <div className="dtopbar">
     <div><h1>{ar ? `مرحباً بعودتك، ${acctName}` : `Welcome back, ${acctName}`}</h1><div className="sub">{ar ? `${pubCount} عرض نشط · ${leadRows.length} استفسار` : `${pubCount} active listings · ${leadRows.length} enquiries`}</div></div>
     <span style={{ flex: 1 }} />
     <span className="dsearch"><Icon.search size={16} /> {db.searchPh}</span>
     <span style={{ color: "var(--slate)", position: "relative" }}><Icon.bell size={19} /><span style={{ position: "absolute", top: -2, right: -2, width: 7, height: 7, borderRadius: "50%", background: "var(--red)" }} /></span>
     <Link href={`/${params.locale}/list`} className="btn primary"><Icon.plus size={16} /> {db.listSpace}</Link>
    </div>
    <div className="dbody">
     <div className="kgrid">
      <KCard icon={Icon.building} tone="h" v={String(pubCount)} l={db.kActiveListings} />
      <KCard icon={Icon.eye} v={na} l={db.kTotalViews} />
      <KCard icon={Icon.inbox} v={String(leadRows.length)} l={db.kEnquiries} delta={repCount ? "+" + repCount + (db.repSuffix) : undefined} dir="up" />
      <KCard icon={Icon.target} tone="a" v={String(matches.length)} l={db.kOpenReq} />
     </div>

     <div className="dash-2col">
      <div className="dpanel">
       <div className="ph"><span className="t">{db.perfTitle}</span><span style={{ flex: 1 }} /><span className="chip" style={{ borderColor: "var(--silver)" }}>{db.last30} <Icon.chevd size={13} /></span></div>
       <div style={{ overflowX: "auto" }}>
        <table className="dt" style={{ minWidth: 520 }}>
         <thead><tr><th>{db.thListing}</th><th style={{ textAlign: "right" }}>{db.thViews}</th><th style={{ textAlign: "right" }}>{db.thSaves}</th><th style={{ textAlign: "right" }}>{db.navEnquiries}</th><th style={{ textAlign: "right" }}>{db.thStatus}</th></tr></thead>
         <tbody>
          {listings.map((l, i) => (
           <tr key={i}>
            <td>
             <div className="row gap10">
              <Photo kind={l.asset} h={40} style={{ width: 56, borderRadius: 7, flex: "none" }} />
              <div><div style={{ fontWeight: 600, fontSize: 13 }}>{l.title}</div><div className="mono muted" style={{ fontSize: 11 }}>{l.place} · {l.rent}</div></div>
             </div>
            </td>
            <td className="num mono">{l.views != null ? l.views.toLocaleString("en-US") : na}</td>
            <td className="num mono">{l.saves != null ? l.saves : na}</td>
            <td className="num mono" style={{ fontWeight: 600, color: l.enq ? "var(--ink)" : "var(--slate-2)" }}>{l.enq || na}</td>
            <td className="num"><span className="statusdot ok">{db.statusLive}</span></td>
           </tr>
          ))}
         </tbody>
        </table>
       </div>
      </div>
      <div className="dpanel">
       <div className="ph"><span className="t">{db.recentEnq}</span><span style={{ flex: 1 }} /><Link href={`/${lp}/messages`} style={{ fontSize: 12.5, color: "var(--azure-d)", fontWeight: 600 }}>{db.viewAll}</Link></div>
       {leads.length === 0 ? <div className="muted" style={{ padding: "16px 20px", fontSize: 12.5 }}>{db.noEnq}</div> : leads.map((l, i) => (
        <div key={i} className="lead-item">
         <span className="avatar" style={{ background: i % 2 ? "var(--slate)" : "var(--harbor)" }}>{l.ini}</span>
         <div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 600 }}>{l.name}</div><div className="muted" style={{ fontSize: 11.5 }}>{l.listing}</div></div>
         <div style={{ textAlign: ar ? "left" : "right" }}>
          <div className="mono muted" style={{ fontSize: 10.5 }}>{l.time}</div>
          <span className="tag" style={{ color: "var(--azure-d)", background: "var(--azure-wash)", borderColor: "var(--azure-l)", marginTop: 4 }}>{db.statusNew}</span>
         </div>
        </div>
       ))}
      </div>
     </div>

     <div className="dash-2col">
      <div className="dpanel">
       <div className="ph"><span className="t">{db.viewsEnq}</span><span style={{ flex: 1 }} /><span className="lgd"><span className="sw" /> {db.thViews}</span></div>
       <div className="muted" style={{ padding: "24px 20px", fontSize: 12.5 }}>{ar ? "تتوفر تحليلات الأداء بعد الإطلاق" : "Performance analytics available after launch"}</div>
      </div>
      <div className="dpanel">
       <div className="ph"><span style={{ color: "var(--harbor)" }}><Icon.target size={17} /></span><span className="t">{db.navReqMatches}</span></div>
       <div style={{ padding: "6px 0" }}>
        {matches.length === 0 ? <div className="muted" style={{ padding: "16px 20px", fontSize: 12.5 }}>{db.noOpenReq}</div> : matches.map((r, i) => (
         <div key={i} className="lead-item">
          <span className="queue-ic"><Icon.doc size={16} /></span>
          <div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 600 }}>{r.title}</div><div className="muted" style={{ fontSize: 11.5 }}>{r.spec}</div></div>
          <Link href={`/${lp}/requirements`} className="btn secondary sm">{db.pitch}</Link>
         </div>
        ))}
       </div>
      </div>
     </div>
    </div>
   </div>
  </div>
 );
}
