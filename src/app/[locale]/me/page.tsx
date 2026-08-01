import Link from "next/link";
import { isLocale } from "@/i18n/config";
import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { getSupabaseServer } from "@/lib/supabase/server";
import { releaseVisibleInventory } from "@/lib/inventory";
import { assetLabel } from "@/lib/labels";
import { listingTitle, listingPlace } from "@/lib/listingTitle";
import { Photo, Icon } from "@/components/satkit";
import { getDictionary } from "@/i18n/getDictionary";
import { listedSince, listedLabel } from "@/lib/listedSince";
import { netArea, priceParts } from "@/lib/listingFigures";
import SavedSearchRows, { type SavedSearchRow } from "@/components/SavedSearchRows";

// The occupier's home. Demand-side users (a signed-in person with no supply account)
// land here after sign-in, not in the owner dashboard. It gathers what an occupier
// signed up FOR: the listings they saved, and a door to their message threads. Their
// saved list is account-backed now, so it follows them across devices.
export const dynamic = "force-dynamic";

export default async function OccupierHome({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound();
  const lp = params.locale;
  const ar = lp === "ar";
  const dict = getDictionary(ar ? "ar" : "en");

  const su = await getSessionUser();
  if (!su) redirect(`/${lp}/login`);
  // Supply-side accounts have their own dashboard; this home is for occupiers.
  if (su.accountId) redirect(`/${lp}/dashboard`);
  const sb = getSupabaseServer();

  let rows: any[] = [];
  let threadCount = 0;
  let enquiries: any[] = [];
  let viewings: any[] = [];
  const savedSearches: SavedSearchRow[] = [];
  if (sb) {
    const { data: saved } = await sb.from("saved_listings").select("listing_id,shortlist").order("created_at", { ascending: false });
    const ids = (saved ?? []).map((r: any) => r.listing_id);
    // The shortlist name a space is filed under, if any. It travels with the row now
    // rather than living in this browser, so it is the same list on the next device.
    const filed = new Map<string, string | null>((saved ?? []).map((r: any) => [r.listing_id, r.shortlist ?? null]));
    if (ids.length) {
      // simulated-visible. A shortlist returns the rows this user saved themselves,
      // so a simulated row they saved in the preview stays on their own list.
      const { data: ls } = await sb
        .from("listings")
        .select("id,title_en,title_ar,asset_type,area_sqm,deal_type,asking_rent_sqm,sale_price,reference_code,districts(name_en,name_ar,city)")
        .in("id", ids)
        .eq("status", "published");
      // Preserve saved order (newest first).
      const byId = new Map((ls ?? []).map((l: any) => [l.id, l]));
      rows = ids.map((id: string) => byId.get(id)).filter(Boolean).map((l: any) => ({ ...l, shortlist: filed.get(l.id) ?? null }));
    }
    const { count } = await sb.from("conversations").select("id", { count: "exact", head: true });
    threadCount = count ?? 0;

    // Enquiry history: the spaces this occupier has contacted, newest activity first.
    // Two sources, deduped by listing:
    //   1. Message threads (conversations), a live in-app back-and-forth with the lister.
    //   2. Direct-contact leads (the enquiry form), sent straight to the lister, no
    //      thread. Attributed to the occupier via leads.created_by_user_id.
    // RLS scopes BOTH queries to the current user (conversations.enquirer_user_id and
    // the "enquirer reads own leads" policy on leads). A listing the occupier both
    // messaged AND enquired on directly shows once, as the thread: the live channel wins.
    const { data: convos } = await sb
      .from("conversations")
      .select("id,listing_id,created_at,last_message_at,listings(id,title_en,title_ar,asset_type,deal_type,area_sqm,districts(name_en,name_ar,city))")
      .order("last_message_at", { ascending: false })
      .limit(20);
    const threadItems = (convos ?? [])
      .filter((c: any) => c.listings)
      .map((c: any) => ({ key: `t-${c.id}`, listing: c.listings, when: c.last_message_at || c.created_at, kind: "thread" as const }));

    // Direct-contact leads with no thread. Dedup against threads AND against each other
    // (a listing enquired on twice shows once, newest first, since the list is ordered desc).
    const { data: directLeads } = await sb
      .from("leads")
      .select("id,listing_id,created_at,path,listings(id,title_en,title_ar,asset_type,deal_type,area_sqm,districts(name_en,name_ar,city))")
      .eq("path", "direct_contact")
      .order("created_at", { ascending: false })
      .limit(20);
    const seenListings = new Set(threadItems.map((i: any) => i.listing.id));
    const directItems: any[] = [];
    for (const l of (directLeads ?? []) as any[]) {
      if (!l.listings || seenListings.has(l.listings.id)) continue;
      seenListings.add(l.listings.id);
      directItems.push({ key: `d-${l.id}`, listing: l.listings, when: l.created_at, kind: "direct" as const });
    }

    enquiries = [...threadItems, ...directItems]
      .sort((a, b) => (a.when < b.when ? 1 : a.when > b.when ? -1 : 0))
      .slice(0, 20);

    // Viewings this occupier booked.
    //
    // This is the half of the viewing workflow that did not exist. A request landed, the
    // lister confirmed it or cancelled it, and the one person waiting on that decision had
    // nowhere to read it. The row carries requested_by now, and RLS returns only the rows
    // where that is this user (policy "requester reads own viewings"), so the absence of a
    // filter below is the point: the policy is the filter, and a mistake in this query
    // cannot widen what comes back.
    //
    // A booking made anonymously stays anonymous and does not appear here, even for the
    // person who made it. Nothing is claimed retrospectively on the strength of a matching
    // email address, because a matching email address is not proof of anything.
    const { data: vs } = await sb
      .from("viewings")
      .select("id,scheduled_at,status,created_at,listings(id,title_en,title_ar,asset_type,area_sqm,districts(name_en,name_ar,city))")
      .order("scheduled_at", { ascending: true })
      .limit(50);
    // Soonest first among the ones still ahead, then the most recent of the ones behind.
    // A viewing that has already happened still matters: it is where the outcome is read.
    const nowMs = Date.now();
    const ahead = ((vs ?? []) as any[]).filter((v) => v.listings && Date.parse(v.scheduled_at) >= nowMs);
    const behind = ((vs ?? []) as any[]).filter((v) => v.listings && Date.parse(v.scheduled_at) < nowMs).reverse();
    viewings = [...ahead, ...behind].slice(0, 8);

    // Saved searches + their alert counts. For each search: how many published spaces
    // match now (the re-run value), and how many are NEW since the search was saved
    // (the alert). asset_type / district_id were lifted into columns at save time.
    const { data: searches } = await sb
      .from("saved_searches")
      .select("id,asset_type,district_id,query,created_at")
      .order("created_at", { ascending: false })
      .limit(12);
    for (const s of (searches ?? []) as any[]) {
      const base = () => {
        let q = releaseVisibleInventory(sb.from("listings").select("id", { count: "exact", head: true }).eq("status", "published"));
        if (s.asset_type) q = q.eq("asset_type", s.asset_type);
        if (s.district_id) q = q.eq("district_id", s.district_id);
        return q;
      };
      const { count: total } = await base();
      const { count: fresh } = await base().gt("created_at", s.created_at);
      const qs = String(s.query?.qs ?? "");
      const label = String(s.query?.label ?? "").trim() || (ar ? "بحث محفوظ" : "Saved search");
      savedSearches.push({
        id: s.id,
        label,
        href: `/${lp}/listings${qs ? `?${qs}` : ""}`,
        total: total ?? 0,
        fresh: fresh ?? 0,
      });
    }
  }

  const t = ar
    ? { hi: "أهلاً بك", sub: "مساحتك على سات ماركتس: محفوظاتك ومراسلاتك في مكان واحد.", saved: "المحفوظات", none: "لم تحفظ أي مساحة بعد.", browse: "تصفّح المساحات", messages: "الرسائل", msgSub: "محادثاتك مع المُعلنين", onReq: "عند الطلب", openMsgs: "فتح الرسائل", explore: "استكشف السوق",
        enquiries: "استفساراتك", enquiriesSub: "المساحات التي تواصلت بشأنها", noEnq: "لم ترسل أي استفسار بعد.", enquiredOn: "استفسار", sentDirect: "أُرسل للمُعلن",
        viewings: "معايناتك", viewingsSub: "المواعيد التي طلبتها وما استقر عليه الأمر", vPast: "موعد مضى",
        vRequested: "بانتظار رد المُعلن", vConfirmed: "مؤكد", vCancelled: "ملغاة", vCompleted: "تمت", vNoShow: "مسجّلة كعدم حضور",
        unfiled: "غير مدرجة في قائمة",
        searches: "عمليات البحث المحفوظة", searchesSub: "احفظ بحثاً وتابع المساحات الجديدة المطابقة له.", noSearch: "لم تحفظ أي بحث بعد. احفظ بحثاً من صفحة المساحات لتتابعه هنا.", matches: "مساحة مطابقة", newSince: "جديدة", view: "عرض", remove: "حذف" }
    : { hi: "Welcome", sub: "Your space on SAT Markets: your saved listings and messages in one place.", saved: "Saved", none: "You have not saved any spaces yet.", browse: "Browse spaces", messages: "Messages", msgSub: "Your conversations with listers", onReq: "On request", openMsgs: "Open messages", explore: "Explore the market",
        enquiries: "Your enquiries", enquiriesSub: "The spaces you have contacted", noEnq: "You have not made an enquiry yet.", enquiredOn: "enquired", sentDirect: "sent to lister",
        viewings: "Your viewings", viewingsSub: "The slots you asked for, and what was decided", vPast: "slot has passed",
        vRequested: "Awaiting the lister", vConfirmed: "Confirmed", vCancelled: "Cancelled", vCompleted: "Completed", vNoShow: "Recorded as not attended",
        unfiled: "Not on a shortlist",
        searches: "Saved searches", searchesSub: "Save a search and track new spaces that match it.", noSearch: "No saved searches yet. Save a search from the listings page to track it here.", matches: "spaces match", newSince: "new", view: "View", remove: "Remove" };

  // Saved spaces, grouped by the shortlist they are filed under. Named shortlists first
  // in a stable order, then everything still unfiled. A person with no shortlists sees
  // exactly what they saw before: one group, no header, no new vocabulary to learn.
  const shortlistNames = Array.from(new Set(rows.map((l: any) => l.shortlist).filter(Boolean) as string[])).sort();
  const savedGroups: { name: string | null; items: any[] }[] = [
    ...shortlistNames.map((name) => ({ name, items: rows.filter((l: any) => l.shortlist === name) })),
    { name: null, items: rows.filter((l: any) => !l.shortlist) },
  ].filter((g) => g.items.length > 0);

  // A confirmed viewing is harbor, not green. Green states that evidence was checked, and
  // a lister agreeing to a time is an agreement, not a verification.
  const vTone = (s: string) => (s === "confirmed" ? "var(--harbor)" : s === "requested" ? "var(--amber-d)" : "var(--slate)");
  const vLabel = (s: string) =>
    ({ requested: t.vRequested, confirmed: t.vConfirmed, cancelled: t.vCancelled, completed: t.vCompleted, no_show: t.vNoShow } as Record<string, string>)[s] ?? s;
  const vWhen = (iso: string) =>
    new Date(iso).toLocaleString(ar ? "ar-SA-u-nu-latn" : "en-GB", {
      weekday: "short", day: "2-digit", month: "short",
      hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Riyadh",
    });

  return (
    <div style={{ maxWidth: 1120, margin: "0 auto", padding: "28px 24px 64px", fontFamily: "var(--sans)", color: "var(--ink)" }}>
      <div className="row between wrap" style={{ alignItems: "flex-end", gap: 12 }}>
        <div>
          <h1 className="serif" style={{ fontSize: 26, fontWeight: 500, margin: 0 }}>{t.hi}</h1>
          <p className="muted" style={{ fontSize: 14, marginTop: 6, maxWidth: 560 }}>{t.sub}</p>
        </div>
        <Link href={`/${lp}/listings`} className="btn secondary sm" style={{ textDecoration: "none" }}><Icon.building size={15} /> {t.explore}</Link>
      </div>

      {/* Messages door */}
      <Link href={`/${lp}/messages`} className="card pad row between" style={{ marginTop: 22, alignItems: "center", boxShadow: "var(--sh-1)", textDecoration: "none", color: "inherit" }}>
        <div className="row gap12" style={{ alignItems: "center" }}>
          <span style={{ color: "var(--harbor)", display: "inline-flex" }}><Icon.inbox size={20} /></span>
          <div>
            <div style={{ fontSize: 14.5, fontWeight: 700 }}>{t.messages}{threadCount ? <span className="muted" style={{ fontWeight: 400 }}> · {threadCount}</span> : null}</div>
            <div className="muted" style={{ fontSize: 12.5 }}>{t.msgSub}</div>
          </div>
        </div>
        <span className="btn secondary sm">{t.openMsgs}</span>
      </Link>

      {/* Viewings this occupier booked, and what the lister decided. */}
      {viewings.length > 0 && (
        <div style={{ marginTop: 26 }}>
          <div className="modhead"><Icon.clock size={18} /><span className="ttl" style={{ fontWeight: 700 }}>{t.viewings}</span><span className="muted" style={{ marginInlineStart: 8, fontSize: 13 }}>{viewings.length}</span></div>
          <p className="muted" style={{ fontSize: 12.5, margin: "4px 0 0" }}>{t.viewingsSub}</p>
          <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
            {viewings.map((v: any) => {
              const l = v.listings;
              const dn = listingPlace(l, ar ? "ar" : "en") || dict.ld.riyadh;
              const passed = Date.parse(v.scheduled_at) < Date.now();
              return (
                <div key={v.id} className="card pad row between wrap" style={{ alignItems: "center", gap: 12, boxShadow: "none", border: "1px solid var(--silver)" }}>
                  <div style={{ minWidth: 0 }}>
                    <Link href={`/${lp}/listings/${l.id}`} style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)", textDecoration: "none" }}>{listingTitle(l, ar ? "ar" : "en")}</Link>
                    <div className="muted" style={{ fontSize: 12, marginTop: 3 }}>{dn}{netArea(l.area_sqm, lp) ? <> · <bdi dir="ltr">{netArea(l.area_sqm, lp)}</bdi></> : null}</div>
                    <div className="mono" style={{ fontSize: 12.5, marginTop: 4 }}><bdi dir="ltr">{vWhen(v.scheduled_at)}</bdi>{passed && v.status === "requested" ? <span className="muted" style={{ marginInlineStart: 8 }}>{t.vPast}</span> : null}</div>
                  </div>
                  <div className="row gap12" style={{ alignItems: "center", flex: "none" }}>
                    <span style={{ color: vTone(v.status), fontWeight: 600, fontSize: 12.5 }}>{vLabel(v.status)}</span>
                    <Link href={`/${lp}/listings/${l.id}`} className="btn secondary sm" style={{ textDecoration: "none" }}>{t.view}</Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Enquiry history: the spaces this occupier has contacted. */}
      {enquiries.length > 0 && (
        <div style={{ marginTop: 26 }}>
          <div className="modhead"><Icon.doc size={18} /><span className="ttl" style={{ fontWeight: 700 }}>{t.enquiries}</span><span className="muted" style={{ marginInlineStart: 8, fontSize: 13 }}>{enquiries.length}</span></div>
          <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
            {enquiries.map((it: any) => {
              const l = it.listing;
              const direct = it.kind === "direct";
              const dn = listingPlace(l, ar ? "ar" : "en") || dict.ld.riyadh;
              const when = listedSince(it.when);
              return (
                <div key={it.key} className="card pad row between" style={{ alignItems: "center", gap: 12, boxShadow: "none", border: "1px solid var(--silver)" }}>
                  <div style={{ minWidth: 0 }}>
                    <Link href={`/${lp}/listings/${l.id}`} style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)", textDecoration: "none" }}>{listingTitle(l, ar ? "ar" : "en")}</Link>
                    <div className="muted" style={{ fontSize: 12, marginTop: 3 }}>{dn}{netArea(l.area_sqm, lp) ? <> · <bdi dir="ltr">{netArea(l.area_sqm, lp)}</bdi></> : null}{when ? <> · {listedLabel(when.days, ar)} {direct ? t.sentDirect : t.enquiredOn}</> : null}</div>
                  </div>
                  {direct
                    ? <Link href={`/${lp}/listings/${l.id}`} className="btn secondary sm" style={{ textDecoration: "none", flex: "none" }}>{t.view}</Link>
                    : <Link href={`/${lp}/messages`} className="btn secondary sm" style={{ textDecoration: "none", flex: "none" }}>{t.openMsgs}</Link>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Saved searches + new-match alerts. */}
      <div style={{ marginTop: 26 }}>
        <div className="modhead"><Icon.search size={18} /><span className="ttl" style={{ fontWeight: 700 }}>{t.searches}</span><span className="muted" style={{ marginInlineStart: 8, fontSize: 13 }}>{savedSearches.length}</span></div>
        <p className="muted" style={{ fontSize: 12.5, margin: "4px 0 0" }}>{t.searchesSub}</p>
        <SavedSearchRows rows={savedSearches} locale={lp as "en" | "ar"} labels={{ matches: t.matches, newSince: t.newSince, view: t.view, remove: t.remove, empty: t.noSearch }} />
      </div>

      {/* Saved listings */}
      <div style={{ marginTop: 26 }}>
        <div className="modhead"><Icon.heart size={18} /><span className="ttl" style={{ fontWeight: 700 }}>{t.saved}</span><span className="muted" style={{ marginInlineStart: 8, fontSize: 13 }}>{rows.length}</span></div>
        {rows.length === 0 ? (
          <div style={{ padding: "22px 0" }}>
            <p className="muted" style={{ fontSize: 13.5, margin: 0 }}>{t.none}</p>
            <Link href={`/${lp}/listings`} className="btn secondary sm" style={{ marginTop: 12, textDecoration: "none" }}>{t.browse}</Link>
          </div>
        ) : (
          savedGroups.map((g) => (
            <div key={g.name ?? "__unfiled"} style={{ marginTop: 14 }}>
              {savedGroups.length > 1 && (
                <div className="row gap12" style={{ alignItems: "baseline", marginBottom: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: g.name ? "var(--harbor)" : "var(--slate)" }}>{g.name ?? t.unfiled}</span>
                  <span className="muted" style={{ fontSize: 12 }}>{g.items.length}</span>
                </div>
              )}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(210px,1fr))", gap: 16 }}>
                {g.items.map((l: any) => {
                  const dn = listingPlace(l, ar ? "ar" : "en") || dict.ld.riyadh;
                  // PKG-SUP2, finding 123. The unit was spelled here by hand in
                  // both languages, a fifth spelling of the same thing. The deal
                  // type decides it once now, in `listingFigures.ts`, and the
                  // amount stays separable so the card can keep the unit quiet.
                  const pp = priceParts(l.deal_type === "sale" ? l.sale_price : l.asking_rent_sqm, l.deal_type, lp);
                  return (
                    <Link key={l.id} href={`/${lp}/listings/${l.id}`} className="listing" style={{ textDecoration: "none", color: "inherit" }}>
                      <Photo kind={l.asset_type} alt={`${assetLabel(l.asset_type, lp)}, ${dn}`} h={130} />
                      <div className="body" style={{ padding: "10px 12px 12px" }}>
                        <div className="mono" style={{ fontSize: 13, fontWeight: 600 }}><bdi>{pp ? pp.value : t.onReq}{pp && <small style={{ fontWeight: 400, color: "var(--slate)" }}>{" " + pp.unit}</small>}</bdi></div>
                        <div style={{ fontSize: 12.5, marginTop: 4, lineHeight: 1.35 }}>{listingTitle(l, ar ? "ar" : "en")}</div>
                        <div className="muted" style={{ fontSize: 11.5, marginTop: 3 }}>{dn}{netArea(l.area_sqm, lp) ? <> · <bdi dir="ltr">{netArea(l.area_sqm, lp)}</bdi></> : null}</div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
