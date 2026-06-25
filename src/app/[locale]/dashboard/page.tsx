import Link from "next/link";
import { isLocale } from "@/i18n/config";
import { notFound } from "next/navigation";
import { Icon, Logo, Photo } from "@/components/satkit";
import { getSupabaseServer } from "@/lib/supabase/server";

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
function ago(d: string) { const s = (Date.now() - new Date(d).getTime()) / 1000; if (s < 3600) return Math.max(1, Math.round(s / 60)) + "m ago"; if (s < 86400) return Math.round(s / 3600) + "h ago"; return Math.round(s / 86400) + "d ago"; }
function pseudo(id: string, base: number, span: number) { let h = 0; for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0; return base + (h % span); }
const initials = (s: string) => s.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

export default async function DashboardPage({ params }: { params: { locale: string } }) {
 if (!isLocale(params.locale)) notFound();
 const lp = params.locale;

 const sb = getSupabaseServer();
 let pub: any[] = [], leadRows: any[] = [], briefs: any[] = [], districts: any[] = [], pubCount = 0;
 if (sb) {
  const [a, b, c, d, e] = await Promise.all([
   sb.from("listings").select("id,title_en,asset_type,asking_rent_sqm,sale_price,deal_type,district_id,area_sqm").eq("status", "published").limit(12),
   sb.from("leads").select("id,listing_id,path,contact_name,created_at").order("created_at", { ascending: false }).limit(20),
   sb.from("tenant_briefs").select("id,title,asset_type,size_min_sqm,size_max_sqm,district_id,city,ref_code").eq("status", "open").limit(6),
   sb.from("districts").select("id,name_en"),
   sb.from("listings").select("id", { count: "exact", head: true }).eq("status", "published"),
  ]);
  pub = a.data || []; leadRows = b.data || []; briefs = c.data || []; districts = d.data || []; pubCount = e.count || pub.length;
 }
 const dmap = new Map(districts.map((x: any) => [x.id, x.name_en]));
 const titleById = new Map(pub.map((x: any) => [x.id, x.title_en]));
 const enq = new Map<string, number>();
 leadRows.forEach((l: any) => { if (l.listing_id) enq.set(l.listing_id, (enq.get(l.listing_id) || 0) + 1); });
 const repCount = leadRows.filter((l: any) => l.path === "representation").length;

 const listings = pub.slice(0, 5).map((l: any) => {
  const rent = l.deal_type === "lease" ? l.asking_rent_sqm : l.sale_price;
  return {
   title: l.title_en, place: (dmap.get(l.district_id) || "Riyadh") + " · " + (l.area_sqm ? l.area_sqm + " m²" : "n/a"),
   asset: l.asset_type, rent: rent ? Number(rent).toLocaleString() + (l.deal_type === "lease" ? " SAR/m²" : " SAR") : "On request",
   views: pseudo(l.id, 900, 4200), saves: pseudo(l.id + "s", 12, 180), enq: enq.get(l.id) || 0,
  };
 });
 const leads = leadRows.slice(0, 5).map((l: any) => {
  const nm = l.contact_name || (l.path === "representation" ? "Representation request" : "Direct enquiry");
  return { ini: initials(nm), name: nm, listing: titleById.get(l.listing_id) || "A verified listing", time: ago(l.created_at), status: "new" };
 });
 const matches = briefs.map((b: any) => ({ title: b.title || (b.asset_type + " requirement"), spec: (dmap.get(b.district_id) || b.city || "Riyadh") + " · " + (b.size_min_sqm || "?") + "–" + (b.size_max_sqm || "?") + " m²" }));
 const totalViews = listings.reduce((a, l) => a + l.views, 0);
 const views = [42, 50, 47, 58, 64, 60, 72, 80, 76, 88, 95, 104];

 const nav: { label: string; icon?: (p: { size?: number }) => JSX.Element; badge?: string; warn?: boolean; sec?: boolean; href?: string }[] = [
  { label: "Overview", icon: Icon.grid, href: `/${lp}/dashboard` },
  { label: "My listings", icon: Icon.building, href: `/${lp}/listings` },
  { label: "Enquiries", icon: Icon.inbox, badge: String(leadRows.length), href: `/${lp}/messages` },
  { label: "Requirement matches", icon: Icon.target, badge: String(matches.length), href: `/${lp}/requirements` },
  { label: "Performance", icon: Icon.chart, href: `/${lp}/dashboard` },
  { label: "Account", sec: true },
  { label: "Billing & plan", icon: Icon.coins, href: `/${lp}/pricing` },
  { label: "Settings", icon: Icon.gear, href: `/${lp}/dashboard` },
 ];
 return (
  <div className="dash">
   <aside className="dside">
    <div className="brand"><Link href={`/${params.locale}`} aria-label="Home"><Logo size={26} rev /></Link></div>
    <div className="dnav">
     {nav.map((n, i) => n.sec
      ? <div key={i} className="sec">{n.label}</div>
      : <Link key={i} href={n.href || `/${params.locale}/dashboard`} className={n.label === "Overview" ? "on" : ""}>
        <span className="ic">{n.icon && n.icon({ size: 18 })}</span>
        <span>{n.label}</span>
        {n.badge && <span className={"badge" + (n.warn ? " warn" : "")}>{n.badge}</span>}
       </Link>)}
    </div>
    <div className="me">
     <span className="avatar" style={{ background: "var(--harbor)" }}>OT</span>
     <div><div className="nm">Olaya Towers Co.</div><div className="rl">Verified owner</div></div>
     <span style={{ marginLeft: "auto", color: "#6B7480" }}><Icon.logout size={17} /></span>
    </div>
   </aside>
   <div className="dmain">
    <div className="dtopbar">
     <div><h1>Welcome back, Olaya Towers</h1><div className="sub">{pubCount} active listings · {leadRows.length} enquiries</div></div>
     <span style={{ flex: 1 }} />
     <span className="dsearch"><Icon.search size={16} /> Search…</span>
     <span style={{ color: "var(--slate)", position: "relative" }}><Icon.bell size={19} /><span style={{ position: "absolute", top: -2, right: -2, width: 7, height: 7, borderRadius: "50%", background: "var(--red)" }} /></span>
     <Link href={`/${params.locale}/list`} className="btn primary"><Icon.plus size={16} /> List a space</Link>
    </div>
    <div className="dbody">
     <div className="kgrid">
      <KCard icon={Icon.building} tone="h" v={String(pubCount)} l="Active listings" />
      <KCard icon={Icon.eye} v={totalViews.toLocaleString()} l="Total views · 30d" delta="+18%" dir="up" />
      <KCard icon={Icon.inbox} v={String(leadRows.length)} l="Enquiries" delta={repCount ? "+" + repCount + " rep" : undefined} dir="up" />
      <KCard icon={Icon.target} tone="a" v={String(matches.length)} l="Open requirements" />
     </div>

     <div className="dash-2col">
      <div className="dpanel">
       <div className="ph"><span className="t">Listing performance</span><span style={{ flex: 1 }} /><span className="chip" style={{ borderColor: "var(--silver)" }}>Last 30 days <Icon.chevd size={13} /></span></div>
       <div style={{ overflowX: "auto" }}>
        <table className="dt" style={{ minWidth: 520 }}>
         <thead><tr><th>Listing</th><th style={{ textAlign: "right" }}>Views</th><th style={{ textAlign: "right" }}>Saves</th><th style={{ textAlign: "right" }}>Enquiries</th><th style={{ textAlign: "right" }}>Status</th></tr></thead>
         <tbody>
          {listings.map((l, i) => (
           <tr key={i}>
            <td>
             <div className="row gap10">
              <Photo kind={l.asset} h={40} style={{ width: 56, borderRadius: 7, flex: "none" }} />
              <div><div style={{ fontWeight: 600, fontSize: 13 }}>{l.title}</div><div className="mono muted" style={{ fontSize: 11 }}>{l.place} · {l.rent}</div></div>
             </div>
            </td>
            <td className="num mono">{l.views.toLocaleString()}</td>
            <td className="num mono">{l.saves}</td>
            <td className="num mono" style={{ fontWeight: 600, color: l.enq ? "var(--ink)" : "var(--slate-2)" }}>{l.enq || "n/a"}</td>
            <td className="num"><span className="statusdot ok">Live</span></td>
           </tr>
          ))}
         </tbody>
        </table>
       </div>
      </div>
      <div className="dpanel">
       <div className="ph"><span className="t">Recent enquiries</span><span style={{ flex: 1 }} /><Link href={`/${lp}/messages`} style={{ fontSize: 12.5, color: "var(--azure-d)", fontWeight: 600 }}>View all</Link></div>
       {leads.length === 0 ? <div className="muted" style={{ padding: "16px 20px", fontSize: 12.5 }}>No enquiries yet.</div> : leads.map((l, i) => (
        <div key={i} className="lead-item">
         <span className="avatar" style={{ background: i % 2 ? "var(--slate)" : "var(--harbor)" }}>{l.ini}</span>
         <div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 600 }}>{l.name}</div><div className="muted" style={{ fontSize: 11.5 }}>{l.listing}</div></div>
         <div style={{ textAlign: "right" }}>
          <div className="mono muted" style={{ fontSize: 10.5 }}>{l.time}</div>
          <span className="tag" style={{ color: "var(--azure-d)", background: "var(--azure-wash)", borderColor: "var(--azure-l)", marginTop: 4 }}>New</span>
         </div>
        </div>
       ))}
      </div>
     </div>

     <div className="dash-2col">
      <div className="dpanel">
       <div className="ph"><span className="t">Views &amp; enquiries</span><span style={{ flex: 1 }} /><span className="lgd"><span className="sw" /> Views</span></div>
       <div style={{ padding: "22px 20px 16px" }}>
        <div className="bars" style={{ height: 150, gap: 8 }}>
         {views.map((h, i) => <div key={i} className={"b" + (i >= 10 ? " hi" : "")} style={{ height: (h / 104 * 100) + "%" }} />)}
        </div>
        <div className="row between mono muted" style={{ fontSize: 10, marginTop: 8 }}><span>Jan</span><span>Jun</span><span>Dec</span></div>
       </div>
      </div>
      <div className="dpanel">
       <div className="ph"><span style={{ color: "var(--harbor)" }}><Icon.target size={17} /></span><span className="t">Requirement matches</span></div>
       <div style={{ padding: "6px 0" }}>
        {matches.length === 0 ? <div className="muted" style={{ padding: "16px 20px", fontSize: 12.5 }}>No open requirements right now.</div> : matches.map((r, i) => (
         <div key={i} className="lead-item">
          <span className="queue-ic"><Icon.doc size={16} /></span>
          <div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 600 }}>{r.title}</div><div className="muted" style={{ fontSize: 11.5 }}>{r.spec}</div></div>
          <Link href={`/${lp}/requirements`} className="btn secondary sm">Pitch</Link>
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
