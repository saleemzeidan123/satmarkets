import Link from "next/link";
import { isLocale } from "@/i18n/config";
import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { Icon, Photo } from "@/components/satkit";
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
function EmptyState({ title, body, cta, href }: { title: string; body: string; cta?: string; href?: string }) {
 return (
  <div style={{ padding: "22px 20px 24px" }}>
   <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink)" }}>{title}</div>
   <div className="muted" style={{ fontSize: 12.5, lineHeight: 1.65, marginTop: 5, maxWidth: 380 }}>{body}</div>
   {cta && href && <Link href={href} className="btn secondary sm" style={{ marginTop: 12 }}>{cta}</Link>}
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
   sb.from("tenant_briefs").select("id,title,title_ar,asset_type,size_min_sqm,size_max_sqm,district_id,city,ref_code").eq("status", "open").limit(6),
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
 // Honest states, written as content rather than as an apology.
 const es = ar ? {
  enqT: "لا استفسارات بعد",
  enqB: "عندما يتواصل مستأجر بشأن أحد عروضك، سيظهر هنا مع بيانات التواصل وسجل المحادثة.",
  enqC: "اعرض عروضك",
  reqT: "لا طلبات مطابقة الآن",
  reqB: "عندما يُدرج مستأجر طلباً يطابق نوع أصولك وموقعك، سيظهر هنا لتتقدّم إليه.",
  reqC: "تصفّح كل الطلبات",
  lstT: "لا عروض منشورة",
  lstB: "أدرج مساحتك الأولى ليبدأ ظهورها للمستأجرين الباحثين في الرياض.",
  lstC: "أدرج مساحة",
  perf: "الأداء",
  perfNote: "لم نبدأ بعد بقياس المشاهدات والحفظ. سيظهر ذلك بعد الإطلاق.",
 } : {
  enqT: "No enquiries yet",
  enqB: "When an occupier gets in touch about one of your listings, it appears here with their contact details and the conversation so far.",
  enqC: "View your listings",
  reqT: "No matching requirements right now",
  reqB: "When an occupier posts a requirement that matches your asset type and location, it appears here for you to pitch.",
  reqC: "Browse all requirements",
  lstT: "No published listings",
  lstB: "List your first space and it starts reaching occupiers searching in Riyadh.",
  lstC: "List a space",
  perf: "Performance",
  perfNote: "We are not measuring views or saves yet. That starts at launch.",
 };
 const dmap = new Map(districts.map((x: any) => [x.id, (ar ? x.name_ar : x.name_en) || x.name_en]));
 const titleById = new Map(pub.map((x: any) => [x.id, (ar ? x.title_ar : x.title_en) || x.title_en]));
 const enq = new Map<string, number>();
 leadRows.forEach((l: any) => { if (l.listing_id) enq.set(l.listing_id, (enq.get(l.listing_id) || 0) + 1); });
 const repCount = leadRows.filter((l: any) => l.path === "representation").length;

 const listings = pub.map((l: any) => {
  const rent = l.deal_type === "lease" ? l.asking_rent_sqm : l.sale_price;
  return {
   title: (ar ? l.title_ar : l.title_en) || l.title_en, place: (dmap.get(l.district_id) || rcity) + " · " + (l.area_sqm ? l.area_sqm + (db.m2) : na),
   asset: l.asset_type, rent: rent ? Number(rent).toLocaleString("en-US") + (l.deal_type === "lease" ? (db.sarSqm) : (db.sar)) : (db.onRequest),
   views: null as number | null, saves: null as number | null, enq: enq.get(l.id) || 0,
  };
 });
 const leads = leadRows.slice(0, 5).map((l: any) => {
  const nm = l.contact_name || (l.path === "representation" ? (db.repRequest) : (db.directEnquiry));
  return { id: l.id, ini: initials(nm), name: nm, listing: titleById.get(l.listing_id) || (db.verifiedListing), time: ago(l.created_at, ar), status: "new" };
 });
 // Arabic parity: prefer the Arabic title on /ar, and keep the number+unit run
 // LTR so "320 m2" does not render as "m2 320" inside an RTL paragraph.
 const matches = briefs.map((b: any) => ({ title: (ar ? (b.title_ar || b.title) : b.title) || (ar ? "طلب" : b.asset_type + " requirement"), spec: (dmap.get(b.district_id) || b.city || rcity) + " · " + (b.size_min_sqm || "?") + (ar ? " إلى " : " to ") + (b.size_max_sqm || "?") + (db.m2) }));

 return (
  <>
     <div className="kgrid">
      <KCard icon={Icon.inbox} v={String(leadRows.length)} l={db.kEnquiries} delta={repCount ? "+" + repCount + (db.repSuffix) : undefined} dir="up" />
      <KCard icon={Icon.target} tone="a" v={String(matches.length)} l={db.kOpenReq} />
      <KCard icon={Icon.building} tone="h" v={String(pubCount)} l={db.kActiveListings} />
     </div>

     {/* Activity leads. An owner signs in to ask "did anything happen?", so the two
         panels that can answer that (enquiries, requirement matches) come first.
         Inventory is reference, and sits below. */}
     <div className="dash-2col">
      <div className="dpanel">
       <div className="ph"><span style={{ color: "var(--harbor)" }}><Icon.inbox size={17} /></span><span className="t">{db.recentEnq}</span><span style={{ flex: 1 }} />{leads.length > 0 && <Link href={`/${lp}/dashboard/enquiries`} style={{ fontSize: 12.5, color: "var(--azure-d)", fontWeight: 600 }}>{db.viewAll}</Link>}</div>
       {leads.length === 0
        ? <EmptyState title={es.enqT} body={es.enqB} cta={es.enqC} href={`/${lp}/listings`} />
        : leads.map((l, i) => (
         <Link key={l.id} href={`/${lp}/dashboard/enquiries/${l.id}`} className="lead-item" style={{ color: "inherit" }}>
          <span className="avatar" style={{ background: i % 2 ? "var(--slate)" : "var(--harbor)" }}>{l.ini}</span>
          <div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 600 }}>{l.name}</div><div className="muted" style={{ fontSize: 11.5 }}>{l.listing}</div></div>
          <div style={{ textAlign: ar ? "left" : "right" }}>
           <div className="mono muted" style={{ fontSize: 10.5 }}>{l.time}</div>
           <span className="tag" style={{ color: "var(--azure-d)", background: "var(--azure-wash)", borderColor: "var(--azure-l)", marginTop: 4 }}>{db.statusNew}</span>
          </div>
         </Link>
        ))}
      </div>

      <div className="dpanel">
       <div className="ph"><span style={{ color: "var(--harbor)" }}><Icon.target size={17} /></span><span className="t">{db.navReqMatches}</span></div>
       <div style={{ padding: matches.length ? "6px 0" : 0 }}>
        {matches.length === 0
         ? <EmptyState title={es.reqT} body={es.reqB} cta={es.reqC} href={`/${lp}/requirements`} />
         : matches.map((r, i) => (
          <div key={i} className="lead-item">
           <span className="queue-ic"><Icon.doc size={16} /></span>
           <div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 600 }}>{r.title}</div><div className="muted" style={{ fontSize: 11.5 }}><bdi>{r.spec}</bdi></div></div>
           <Link href={`/${lp}/requirements`} className="btn secondary sm">{db.pitch}</Link>
          </div>
         ))}
       </div>
      </div>
     </div>

     {/* Inventory. Views and saves columns are gone: nothing measures them yet, and a
         column of "n/a" set in display mono reads as a metric. It is not one. */}
     <div className="dpanel" style={{ marginTop: 18 }}>
      <div className="ph"><span style={{ color: "var(--harbor)" }}><Icon.building size={17} /></span><span className="t">{db.navMyListings}</span><span style={{ flex: 1 }} /><Link href={`/${lp}/dashboard/listings`} style={{ fontSize: 12.5, color: "var(--azure-d)", fontWeight: 600 }}>{db.viewAll}</Link></div>
      {listings.length === 0 ? <EmptyState title={es.lstT} body={es.lstB} cta={es.lstC} href={`/${lp}/list`} /> : (
       <div style={{ overflowX: "auto" }}>
        <table className="dt" style={{ minWidth: 460 }}>
         <thead><tr><th>{db.thListing}</th><th style={{ textAlign: "right" }}>{db.navEnquiries}</th><th style={{ textAlign: "right" }}>{db.thStatus}</th></tr></thead>
         <tbody>
          {listings.map((l, i) => (
           <tr key={i}>
            <td>
             <div className="row gap10">
              <Photo kind={l.asset} h={40} style={{ width: 56, borderRadius: 7, flex: "none" }} />
              <div><div style={{ fontWeight: 600, fontSize: 13 }}>{l.title}</div><div className="mono muted" style={{ fontSize: 11 }}><bdi>{l.place} · {l.rent}</bdi></div></div>
             </div>
            </td>
            <td className="num mono" style={{ fontWeight: 600, color: l.enq ? "var(--ink)" : "var(--slate-2)" }}>{l.enq}</td>
            <td className="num"><span className="statusdot ok">{db.statusLive}</span></td>
           </tr>
          ))}
         </tbody>
        </table>
       </div>
      )}
     </div>
  </>
 );
}
