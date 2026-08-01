import Link from "next/link";
import { isLocale } from "@/i18n/config";
import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { Icon, Photo } from "@/components/satkit";
import ScrollRegion from "@/components/ScrollRegion";
import { getSupabaseServer } from "@/lib/supabase/server";
import { getDictionary } from "@/i18n/getDictionary";
import { gateFailures, gateReasonText, type GateReason } from "@/lib/gate";
import { listingTitle } from "@/lib/listingTitle";
import { placeName } from "@/lib/displayName";
import { netArea, askingPrice } from "@/lib/listingFigures";
import { sizeRange } from "@/lib/requirementFigures";
import type { Loc } from "@/lib/format";

// The owner Overview answers ONE question they sign in with: "did anything happen,
// and what needs me?" So it leads with a needs-attention queue (Fable 5 consult):
// one row per job, most-blocking first, each collapsed to a single line and a single
// action. Vanity counts (enquiries/requirements/listings totals) are gone: they told
// the owner how big their account is, which nobody asks. Below the queue sits the
// activity and the inventory. Never a metric we do not truly measure: no views, no
// saves, and "new" means the last 7 days, not a fabricated "since your last visit".
export const dynamic = "force-dynamic";

function EmptyState({ title, body, cta, href }: { title: string; body: string; cta?: string; href?: string }) {
 return (
  <div style={{ padding: "22px 20px 24px" }}>
   <div style={{ fontSize: "0.84375rem", fontWeight: 600, color: "var(--ink)" }}>{title}</div>
   <div className="muted" style={{ fontSize: "0.78125rem", lineHeight: 1.65, marginTop: 5, maxWidth: 380 }}>{body}</div>
   {cta && href && <Link href={href} className="btn secondary sm" style={{ marginTop: 12 }}>{cta}</Link>}
  </div>
 );
}
function ago(d: string, ar: boolean) { const s = (Date.now() - new Date(d).getTime()) / 1000; if (s < 3600) { const n = Math.max(1, Math.round(s / 60)); return ar ? `منذ ${n} د` : n + "m ago"; } if (s < 86400) { const n = Math.round(s / 3600); return ar ? `منذ ${n} س` : n + "h ago"; } const n = Math.round(s / 86400); return ar ? `منذ ${n} ي` : n + "d ago"; }
const initials = (s: string) => s.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

type QueueItem = { key: string; tone: "warn" | "neutral"; icon: (p: { size?: number }) => JSX.Element; text: string; cta: string; href: string };

export default async function DashboardPage({ params }: { params: { locale: string } }) {
 if (!isLocale(params.locale)) notFound();
 const lp = params.locale;
 const ar = lp === "ar";
 const loc: Loc = ar ? "ar" : "en";
 const db = getDictionary(lp === "ar" ? "ar" : "en").dashboard;
 const su = await getSessionUser();
 if (!su) redirect(`/${lp}/login`);
 if (!su.accountId) redirect(`/${lp}`);
 const accountId = su.accountId;
 const rcity = db.riyadh;
 const na = db.na;

 const sb = getSupabaseServer();
 let mine: any[] = [], districts: any[] = [], acct: any = null;
 if (sb) {
  const [a, d, f] = await Promise.all([
   sb.from("listings").select("id,title_en,title_ar,asset_type,asking_rent_sqm,sale_price,deal_type,district_id,area_sqm,status,ownership_verified,authorization_verified,right_to_market_confirmed,ad_permit_no,ad_permit_number,ad_permit_expires_at").eq("account_id", accountId).limit(100),
   sb.from("districts").select("id,name_en,name_ar,city"),
   sb.from("accounts").select("name_en,name_ar,type,verification_status").eq("id", accountId).maybeSingle(),
  ]);
  mine = a.data || []; districts = d.data || []; acct = f.data;
 }
 const myIds = mine.map((l: any) => l.id);
 const myAssets = Array.from(new Set(mine.map((l: any) => l.asset_type)));

 let leadRows: any[] = [], viewingRows: any[] = [], briefs: any[] = [];
 if (sb && myIds.length) {
  const [b, v] = await Promise.all([
   sb.from("leads").select("id,listing_id,contact_name,created_at,status").in("listing_id", myIds).order("created_at", { ascending: false }).limit(20),
   sb.from("viewings").select("id,listing_id,contact_name,scheduled_at,created_at").in("listing_id", myIds).eq("status", "requested").order("created_at", { ascending: false }).limit(20),
  ]);
  leadRows = b.data || []; viewingRows = v.data || [];
 }
 if (sb && myAssets.length) {
  const c = await sb.from("tenant_briefs").select("id,title,title_ar,asset_type,size_min_sqm,size_max_sqm,district_id,city").eq("status", "open").in("asset_type", myAssets).limit(12);
  briefs = c.data || [];
 }

 const isSat = acct?.type === "sat";
 const verified = acct?.verification_status === "verified" || isSat;
 // PKG-NM1. Both of these used to borrow the other language when this one was
 // blank, so an Arabic owner read their own inventory in English. The district
 // falls back to its city and the listing to a description of itself, and both
 // fallbacks are in the reader's language.
 const drow = new Map(districts.map((x: any) => [x.id, x]));
 const dmap = new Map(districts.map((x: any) => [x.id, placeName(x, ar ? "ar" : "en")]));
 // The trailing floor is kept for one caller below that may pass `{}` when a
 // viewing references a listing outside `mine`. A row with nothing on it is the
 // only case that reaches it.
 const titleOf = (l: any) => listingTitle({ ...l, districts: drow.get(l.district_id) ?? null }, ar ? "ar" : "en") || (ar ? "عرض" : "listing");

 // Per-listing derivation: paused vs blocked vs live.
 const withGate = mine.map((l: any) => ({ l, fails: gateFailures(l) }));
 const blocked = withGate.filter(({ l, fails }) => fails.length > 0 && (l.status === "archived" || (l.status === "published" && fails.includes("permit_expired" as GateReason))));
 const paused = withGate.filter(({ l, fails }) => l.status === "archived" && fails.length === 0);
 // "New" is now the enquiry's real status, set by the owner, not a guess from its
 // age. This is what lets the queue and the badge go DOWN when the owner acts.
 const newLeads = leadRows.filter((x: any) => (x.status || "new") === "new");

 // Build the needs-attention queue, most-blocking first.
 const q: QueueItem[] = [];
 if (!verified) {
  q.push({ key: "verify", tone: "warn", icon: Icon.check,
   // ADV-1 and owner ruling 3. "Verified owners get more replies" is a performance
   // claim about a platform that has taken no replies yet, used to push the owner
   // toward verification. The reason to verify is the publish gate, which is a fact.
   text: ar ? "حسابك غير موثّق بعد. تبقى عروضك مسودة حتى تُوثَّق الملكية." : "Your account is not verified yet. Listings stay in draft until ownership is verified.",
   cta: ar ? "الملف والتوثيق" : "View profile", href: `/${lp}/dashboard/profile` });
 }
 if (viewingRows.length) {
  const one = viewingRows[0];
  const nm = one.contact_name || (ar ? "زائر" : "someone");
  q.push({ key: "viewings", tone: "warn", icon: Icon.check,
   text: viewingRows.length === 1
    ? (ar ? `طلب ${nm} معاينة لـ ` : `${nm} requested a viewing for `) + (titleOf(mine.find((l:any)=>l.id===one.listing_id) || {}))
    : (ar ? `${viewingRows.length} طلبات معاينة بانتظار ردّك.` : `${viewingRows.length} viewing requests waiting for your reply.`),
   cta: viewingRows.length === 1 ? (ar ? "مراجعة" : "Review") : (ar ? "مراجعة الطلبات" : "Review requests"), href: `/${lp}/dashboard/viewings` });
 }
 for (const { l, fails } of blocked.slice(0, 3)) {
  q.push({ key: "blocked-" + l.id, tone: "warn", icon: Icon.info,
   text: (ar ? "غير منشور: " : "Offline: ") + titleOf(l) + " · " + gateReasonText(fails[0], ar),
   cta: ar ? "إصلاح العرض" : "Fix listing", href: `/${lp}/dashboard/listings/${l.id}` });
 }
 if (paused.length) {
  q.push({ key: "paused", tone: "neutral", icon: Icon.building,
   text: paused.length === 1
    ? titleOf(paused[0].l) + (ar ? " موقوف ولا يظهر للمستأجرين." : " is paused and not visible to tenants.")
    : (ar ? `${paused.length} عروض موقوفة لا تظهر للمستأجرين.` : `${paused.length} listings are paused and not visible.`),
   cta: paused.length === 1 ? (ar ? "إعادة النشر" : "Republish") : (ar ? "عرض العروض" : "View listings"),
   href: paused.length === 1 ? `/${lp}/dashboard/listings/${paused[0].l.id}` : `/${lp}/dashboard/listings` });
 }
 if (newLeads.length) {
  const one = newLeads[0];
  const nm = one.contact_name || (ar ? "زائر" : "someone");
  q.push({ key: "enq", tone: "neutral", icon: Icon.inbox,
   text: newLeads.length === 1
    ? (ar ? `استفسار جديد من ${nm} بانتظار ردّك.` : `New enquiry from ${nm} waiting for a reply.`)
    : (ar ? `${newLeads.length} استفسارات جديدة بانتظار ردّك.` : `${newLeads.length} new enquiries waiting for a reply.`),
   cta: ar ? "عرض الاستفسارات" : "View enquiries", href: `/${lp}/dashboard/enquiries` });
 }
 if (briefs.length) {
  q.push({ key: "matches", tone: "neutral", icon: Icon.target,
   text: briefs.length === 1
    ? (ar ? "مستأجر يبحث عن مساحة تطابق نوع أصولك." : "A tenant is looking for space that fits your listings.")
    : (ar ? `${briefs.length} طلبات مستأجرين تطابق عروضك.` : `${briefs.length} tenant requirements match your listings.`),
   cta: ar ? "التقديم" : "Pitch", href: `/${lp}/dashboard/requirements` });
 }

 // Body data.
 const titleById = new Map(mine.map((l: any) => [l.id, titleOf(l)]));
 const leads = leadRows.slice(0, 5).map((l: any) => {
  const nm = l.contact_name || db.directEnquiry;
  const isNew = (l.status || "new") === "new";
  return { id: l.id, ini: initials(nm), name: nm, listing: titleById.get(l.listing_id) || db.verifiedListing, time: ago(l.created_at, ar), isNew };
 });
 // PKG-SUP2, finding 121. This line advertised every brief to every lister as
 // "<district> · ? to ? m²" when the occupier had left the size open, which they
 // are allowed to do and which both size columns are nullable for. It also built
 // the range itself, so it grouped nothing: a 12000 sqm brief read "12000". The
 // public requirement board already renders this same pair through `sizeRange`,
 // one click away, and now so does the surface a lister prospects from. An
 // unstated size draws no size clause at all.
 const matches = briefs.slice(0, 6).map((b: any) => {
  const place = dmap.get(b.district_id) || b.city || rcity;
  const size = sizeRange(b.size_min_sqm, b.size_max_sqm, loc);
  return {
   title: (ar ? (b.title_ar || b.title) : b.title) || (ar ? "طلب" : b.asset_type + " requirement"),
   spec: size ? `${place} · ${size}` : place,
  };
 });

 const statusPill = (l: any, fails: GateReason[]): { label: string; cls: string } => {
  const isBlocked = fails.length > 0 && (l.status === "archived" || (l.status === "published" && fails.includes("permit_expired" as GateReason)));
  if (isBlocked) return { label: ar ? "غير منشور" : "Offline", cls: "warn" };
  switch (l.status) {
   case "published": return { label: db.statusLive, cls: "ok" };
   case "archived": return { label: ar ? "موقوف" : "Paused", cls: "pend" };
   case "pending_review": return { label: ar ? "قيد المراجعة" : "In review", cls: "pend" };
   case "approved": return { label: ar ? "معتمد" : "Approved", cls: "pend" };
   case "rejected": return { label: ar ? "مرفوض" : "Rejected", cls: "warn" };
   default: return { label: ar ? "مسودة" : "Draft", cls: "pend" };
  }
 };
 const listRows = withGate.map(({ l, fails }) => {
  // PKG-SUP2, finding 120. `asking_rent_sqm` is collected by a form whose own
  // label reads "Asking rent (SAR per sqm per year)", and this line read it back
  // as "SAR/m²" with the year taken off, so the lister who set an annual rate was
  // the one reader shown it as something else. The area was printed ungrouped
  // beside it. Both now come from the same functions the public surfaces use.
  const area = netArea(l.area_sqm, loc);
  const rent = askingPrice(l.deal_type === "lease" ? l.asking_rent_sqm : l.sale_price, l.deal_type, loc);
  return {
   id: l.id, title: titleOf(l), asset: l.asset_type,
   // A listing with no stated area still says so here, because this is the
   // lister's own management surface and the gap is the thing they came to fix.
   place: (dmap.get(l.district_id) || rcity) + " · " + (area ?? na),
   rent: rent ?? db.onRequest,
   pill: statusPill(l, fails),
  };
 });

 const caughtUp = ar
  ? { t: "كل شيء على ما يرام.", b: "لا طلبات معاينة، ولا استفسارات جديدة، وكل عروضك تعمل." }
  : { t: "You're all caught up.", b: "No viewing requests, no new enquiries, and all your listings are live." };

 return (
  <>
   {/* Finding 155. This page had no heading of its own at all. The only `h1` on it came
       from the dashboard shell and read the account name, which is the same on every
       route, so a reader navigating by heading learned nothing about where they were.
       The shell's heading is gone and the page states its own title, in the pattern the
       listings and enquiries surfaces already use. */}
   <div style={{ marginBottom: 16 }}>
    <h1 style={{ fontSize: "1.375rem", fontWeight: 700, letterSpacing: "-.01em", margin: 0 }}>{db.navOverview}</h1>
    <div className="muted" style={{ fontSize: "0.8125rem", marginTop: 3 }}>{ar ? "قائمتك ونشاطك وعروضك." : "Your queue, your activity and your inventory."}</div>
   </div>

   {/* NEEDS ATTENTION. The whole top of the page, derived from real signals. */}
   <div className="dpanel" style={{ overflow: "hidden" }}>
    <div className="ph"><span style={{ color: "var(--harbor)" }}><Icon.inbox size={17} /></span><span className="t">{ar ? "يحتاج انتباهك" : "Needs your attention"}</span></div>
    {q.length === 0 ? (
     <div style={{ padding: "20px" }}>
      <div style={{ fontSize: "0.875rem", fontWeight: 700 }}>{caughtUp.t}</div>
      <div className="muted" style={{ fontSize: "0.78125rem", lineHeight: 1.65, marginTop: 5, maxWidth: 420 }}>{caughtUp.b}</div>
      <Link href={`/${lp}/list`} className="btn secondary sm" style={{ marginTop: 12 }}><Icon.plus size={14} /> {ar ? "أدرج مساحة" : "Add a listing"}</Link>
     </div>
    ) : (
     <div>
      {q.map((it) => {
       const I = it.icon;
       return (
        <div key={it.key} className="row between" style={{ gap: 12, padding: "13px 16px", borderTop: "1px solid var(--silver)", borderInlineStart: `3px solid ${it.tone === "warn" ? "var(--status-stale)" : "var(--harbor)"}`, alignItems: "center" }}>
         <div className="row gap10" style={{ alignItems: "center", minWidth: 0 }}>
          <span style={{ color: it.tone === "warn" ? "var(--status-stale)" : "var(--harbor)", display: "inline-flex", flex: "none" }}><I size={16} /></span>
          <span style={{ fontSize: "0.8125rem", lineHeight: 1.45, minWidth: 0 }}><bdi>{it.text}</bdi></span>
         </div>
         <Link href={it.href} className="btn secondary sm" style={{ flex: "none", whiteSpace: "nowrap" }}>{it.cta}</Link>
        </div>
       );
      })}
     </div>
    )}
   </div>

   {/* Recent enquiries: the owner's core inbox feeling. */}
   <div className="dpanel" style={{ marginTop: 18 }}>
    <div className="ph"><span style={{ color: "var(--harbor)" }}><Icon.inbox size={17} /></span><span className="t">{db.recentEnq}</span><span style={{ flex: 1 }} />{leads.length > 0 && <Link href={`/${lp}/dashboard/enquiries`} style={{ fontSize: "0.78125rem", color: "var(--azure-d)", fontWeight: 600 }}>{db.viewAll}</Link>}</div>
    {leads.length === 0
     ? <EmptyState title={ar ? "لا استفسارات بعد" : "No enquiries yet"} body={ar ? "حين يتواصل أحدهم بشأن أحد عروضك، ستجده هنا ببياناته وسجلّ محادثتك." : "When someone reaches out about a listing, you'll find them here with their details and your full conversation."} cta={db.navMyListings} href={`/${lp}/dashboard/listings`} />
     : leads.map((l, i) => (
      <Link key={l.id} href={`/${lp}/dashboard/enquiries/${l.id}`} className="lead-item" style={{ color: "inherit" }}>
       <span className="avatar" style={{ background: i % 2 ? "var(--slate)" : "var(--harbor)" }}>{l.ini}</span>
       <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: "0.8125rem", fontWeight: 600 }}><bdi>{l.name}</bdi></div><div className="muted" style={{ fontSize: "0.71875rem" }}><bdi>{l.listing}</bdi></div></div>
       <div style={{ textAlign: ar ? "left" : "right", flex: "none" }}>
        <div className="mono muted" style={{ fontSize: "0.65625rem" }}>{l.time}</div>
        {l.isNew && <span className="tag" style={{ color: "var(--azure-d)", background: "var(--azure-wash)", borderColor: "var(--azure-l)", marginTop: 4 }}>{db.statusNew}</span>}
       </div>
      </Link>
     ))}
   </div>

   {/* Inventory, promoted. Status is now load-bearing (it feeds the queue), so it is a real pill. */}
   <div className="dpanel" style={{ marginTop: 18 }}>
    <div className="ph"><span style={{ color: "var(--harbor)" }}><Icon.building size={17} /></span><span className="t">{db.navMyListings}</span><span style={{ flex: 1 }} />{listRows.length > 0 && <Link href={`/${lp}/dashboard/listings`} style={{ fontSize: "0.78125rem", color: "var(--azure-d)", fontWeight: 600 }}>{db.viewAll}</Link>}</div>
    {listRows.length === 0 ? <EmptyState title={ar ? "لا عروض بعد" : "No listings yet"} body={ar ? "أدرج مساحتك الأولى ليبدأ ظهورها للمستأجرين الباحثين في الرياض." : "List your first space and it starts reaching occupiers searching in Riyadh."} cta={ar ? "أدرج مساحة" : "List a space"} href={`/${lp}/list`} /> : (
     <ScrollRegion label={db.navMyListings}>
      <table className="dt" style={{ minWidth: 460 }}>
       <caption className="sronly">{db.navMyListings}</caption>
       <thead><tr><th scope="col">{db.thListing}</th><th scope="col" style={{ textAlign: ar ? "left" : "right" }}>{db.thStatus}</th></tr></thead>
       <tbody>
        {listRows.map((l) => (
         <tr key={l.id} style={{ position: "relative" }}>
          <td>
           <div className="row gap10">
            <Photo kind={l.asset} h={40} style={{ width: 56, borderRadius: 7, flex: "none" }} />
            <div style={{ minWidth: 0 }}><Link href={`/${lp}/dashboard/listings/${l.id}`} className="rowlink" style={{ fontWeight: 600, fontSize: "0.8125rem", textDecoration: "none", color: "inherit" }}>{l.title}</Link><div className="mono muted" style={{ fontSize: "0.6875rem" }}><bdi>{l.place} · {l.rent}</bdi></div></div>
           </div>
          </td>
          <td className="num"><span className={"statusdot " + l.pill.cls}>{l.pill.label}</span></td>
         </tr>
        ))}
       </tbody>
      </table>
     </ScrollRegion>
    )}
   </div>

   {/* Requirement matches: prospecting, so it sits last. */}
   {matches.length > 0 && (
    <div className="dpanel" style={{ marginTop: 18 }}>
     <div className="ph"><span style={{ color: "var(--harbor)" }}><Icon.target size={17} /></span><span className="t">{db.navReqMatches}</span></div>
     <div style={{ padding: "6px 0" }}>
      {matches.map((r, i) => (
       <div key={i} className="lead-item">
        <span className="queue-ic"><Icon.doc size={16} /></span>
        <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: "0.8125rem", fontWeight: 600 }}><bdi>{r.title}</bdi></div><div className="muted" style={{ fontSize: "0.71875rem" }}><bdi>{r.spec}</bdi></div></div>
        <Link href={`/${lp}/dashboard/requirements`} className="btn secondary sm">{db.pitch}</Link>
       </div>
      ))}
     </div>
    </div>
   )}
  </>
 );
}
