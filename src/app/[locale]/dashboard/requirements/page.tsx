import Link from "next/link";
import { isLocale } from "@/i18n/config";
import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { getSupabaseServer } from "@/lib/supabase/server";
import { Icon } from "@/components/satkit";
import { listingTitle } from "@/lib/listingTitle";
import { placeName } from "@/lib/displayName";
import { sizeRange } from "@/lib/requirementFigures";
import {
  matchListing,
  compareMatches,
  verdictLabel,
  stateLabel,
  type MatchListing,
  type MatchRequirement,
  type MatchResult,
  type MatchReason,
} from "@/lib/matching";

// Requirement matches, scoped to the owner, stated rather than scored.
//
// This page used to answer the question with one line of arithmetic: same asset
// type, and the same district when the brief named one. That was honest about
// being coarse, but it could not say WHY anything appeared, and a list with no
// reasons is a recommendation. src/lib/matching.ts now answers the question as a
// set of named dimensions with a state each, so every row here prints the
// verdict and the dimensions it was derived from, in the reader's language.
//
// Three things this surface holds that the model alone cannot.
//
// 1. Permission. Only the caller's own listings are ever read, under the
//    caller's session, so one account cannot use this page to discover another
//    account's inventory or learn which briefs it is answering.
// 2. Derivation, not invention. A listing has no city column; its city is the
//    city its district record states. Looking that up is reading a stated fact.
//    A listing with no district therefore has no city here, and the model turns
//    that into an unknown dimension rather than a guess.
// 3. A remedy is a link. Every unknown dimension names the fact that would
//    resolve it, and the fact belongs to a listing this account can edit, so
//    the row carries the way to go and supply it.
//
// Notification is deliberately absent. O12 keeps external channels off until
// consent is designed and recorded, so a match is something a lister finds
// here, not something SAT sends them.
export const dynamic = "force-dynamic";

const NOTE = { met: "✓", tolerance: "~", unknown: "?", failed: "×" } as const;

export default async function DashboardRequirementsPage({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound();
  const lp = params.locale;
  const ar = lp === "ar";

  const su = await getSessionUser();
  if (!su) redirect(`/${lp}/login`);
  if (!su.accountId) redirect(`/${lp}`);
  const sb = getSupabaseServer();
  if (!sb) notFound();

  const t = ar ? {
    title: "طلبات المطابقة",
    sub: "متطلبات مفتوحة قابلها ما لديك من عروض منشورة، مع سبب كل مطابقة",
    matchOn: "قوبل بـ",
    pitch: "تقدّم",
    browseAll: "تصفّح كل المتطلبات",
    why: "لماذا هذه النتيجة",
    remedy: "ما الذي يحسمها",
    open: "افتح العرض",
    emptyT: "لا مطابقات بعد",
    emptyB: "حين يُدرج مستأجر متطلباً يقابله عرض منشور من عروضك، سيظهر هنا مع الأسباب التي بُنيت عليها النتيجة. لا نعرض مطابقة بلا سبب.",
    noneT: "لا عروض منشورة بعد",
    noneB: "المطابقة تقارن المتطلبات المفتوحة بعروضك المنشورة. انشر عرضاً أولاً ثم عد إلى هذه الصفحة.",
    newListing: "عرض جديد",
    counts: (a: number, b: number) => `${a} من ${b} متطلباً مفتوحاً`,
    unstated: "غير مذكورة",
  } : {
    title: "Requirement matches",
    sub: "Open occupier requirements answered by your published listings, with the reason for each result",
    matchOn: "Matched against",
    pitch: "Pitch",
    browseAll: "Browse all requirements",
    why: "Why this result",
    remedy: "What would settle it",
    open: "Open listing",
    emptyT: "No matches yet",
    emptyB: "When an occupier posts a requirement that one of your published listings answers, it appears here with the reasons the result was built from. We never show a match without its reasons.",
    noneT: "No published listings yet",
    noneB: "Matching compares open requirements to your published listings. Publish a listing first, then come back to this page.",
    newListing: "New listing",
    counts: (a: number, b: number) => `${a} of ${b} open requirements`,
    unstated: "not stated",
  };

  const [{ data: briefs }, { data: mine }, { data: districts }] = await Promise.all([
    sb
      .from("tenant_briefs")
      .select("id,title,title_ar,asset_type,deal_type,city,district_id,size_min_sqm,size_max_sqm,budget_sqm_max,timeline,must_haves,ref_code,is_demo")
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .limit(60),
    sb
      .from("listings")
      .select("id,title_en,title_ar,status,asset_type,deal_type,district_id,area_sqm,asking_rent_sqm,sale_price,availability_confirmed_at,ad_permit_expires_at,is_demo")
      .eq("account_id", su.accountId),
    sb.from("districts").select("id,name_en,name_ar,city"),
  ]);

  const drows = (districts || []) as any[];
  // PKG-NM1. A district with no name in the reader's language falls back to its
  // own city, never to the other language's name: an Arabic reader is not shown
  // "Al Olaya" because nobody typed "العليا" yet.
  const drow = new Map(drows.map((x) => [x.id, x]));
  const dname = new Map(drows.map((x) => [x.id, placeName(x, ar ? "ar" : "en")]));
  const dnameEn = new Map(drows.map((x) => [x.id, placeName(x, "en") || null]));
  const dnameAr = new Map(drows.map((x) => [x.id, placeName(x, "ar") || null]));
  // The listing's city is the city its own district record states. This is a
  // lookup of a stated fact, not a guess about where a listing probably is.
  const dcity = new Map(drows.map((x) => [x.id, x.city]));

  const myListings: MatchListing[] = ((mine || []) as any[]).map((l) => ({
    id: String(l.id),
    status: String(l.status ?? ""),
    asset_type: String(l.asset_type ?? ""),
    deal_type: String(l.deal_type ?? ""),
    city: l.district_id ? (dcity.get(l.district_id) ?? null) : null,
    district_id: l.district_id ? String(l.district_id) : null,
    area_sqm: l.area_sqm,
    asking_rent_sqm: l.asking_rent_sqm,
    sale_price: l.sale_price,
    availability_confirmed_at: l.availability_confirmed_at,
    ad_permit_expires_at: l.ad_permit_expires_at,
    is_demo: l.is_demo === true,
  }));
  const titleOf = new Map(((mine || []) as any[]).map((l) => [String(l.id), listingTitle({ ...l, districts: drow.get(l.district_id) ?? null }, ar ? "ar" : "en")]));
  const publishedCount = myListings.filter((l) => l.status === "published").length;

  const now = Date.now();
  const rows = ((briefs || []) as any[])
    .map((b) => {
      const req: MatchRequirement = {
        asset_type: String(b.asset_type ?? ""),
        deal_type: String(b.deal_type ?? ""),
        city: b.city ?? (b.district_id ? dcity.get(b.district_id) ?? null : null),
        district_id: b.district_id ? String(b.district_id) : null,
        district_label_en: b.district_id ? dnameEn.get(b.district_id) ?? null : null,
        district_label_ar: b.district_id ? dnameAr.get(b.district_id) ?? null : null,
        size_min_sqm: b.size_min_sqm,
        size_max_sqm: b.size_max_sqm,
        budget_sqm_max: b.budget_sqm_max,
        timeline: b.timeline,
        must_haves: Array.isArray(b.must_haves) ? b.must_haves.map(String) : null,
        is_demo: b.is_demo === true,
      };
      // Every one of this account's listings is put to the requirement, and the
      // best answer is the one shown. Sorting is the model's own ordering, so
      // the page cannot disagree with the verdict it prints.
      let best: { result: MatchResult; listingId: string } | null = null;
      for (const l of myListings) {
        const result = matchListing(req, l, now);
        if (!result.eligible) continue;
        if (!best || compareMatches(result, best.result) < 0) best = { result, listingId: l.id };
      }
      return { b, best };
    })
    // A refusal is a real answer, and it is the answer this page does not owe a
    // lister: they came to see what they can pitch, not what they cannot.
    .filter((r): r is { b: any; best: { result: MatchResult; listingId: string } } => !!r.best && r.best.result.verdict !== "no")
    .sort((x, y) => compareMatches(x.best.result, y.best.result));

  const openCount = (briefs || []).length;

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
          {rows.length > 0 && (
            <span className="mono muted" style={{ fontSize: 11.5 }}><bdi>{t.counts(rows.length, openCount)}</bdi></span>
          )}
          <span style={{ flex: 1 }} />
          <Link href={`/${lp}/requirements`} style={{ fontSize: 12.5, color: "var(--azure-d)", fontWeight: 600, textDecoration: "none" }}>{t.browseAll}</Link>
        </div>

        {publishedCount === 0 ? (
          <div style={{ padding: "24px 20px 28px" }}>
            <div style={{ fontSize: 13.5, fontWeight: 600 }}>{t.noneT}</div>
            <div className="muted" style={{ fontSize: 12.5, lineHeight: 1.65, marginTop: 5, maxWidth: 460 }}>{t.noneB}</div>
            <Link href={`/${lp}/dashboard/new`} className="btn secondary sm" style={{ marginTop: 12 }}>{t.newListing}</Link>
          </div>
        ) : rows.length === 0 ? (
          <div style={{ padding: "24px 20px 28px" }}>
            <div style={{ fontSize: 13.5, fontWeight: 600 }}>{t.emptyT}</div>
            <div className="muted" style={{ fontSize: 12.5, lineHeight: 1.65, marginTop: 5, maxWidth: 460 }}>{t.emptyB}</div>
            <Link href={`/${lp}/requirements`} className="btn secondary sm" style={{ marginTop: 12 }}>{t.browseAll}</Link>
          </div>
        ) : (
          rows.map(({ b, best }) => {
            const result = best.result;
            const rtitle = (ar ? (b.title_ar || b.title) : b.title) || String(b.ref_code ?? b.id);
            const loc = dname.get(b.district_id) || b.city || "";
            // PKG-DEM2, finding 115. This page read the nulls honestly and then
            // spelled the figure itself: `200 to ? m²` for a half-open range,
            // and a unit written `sqm` here and `m²` on the two public
            // surfaces, so one stored fact had four renderings and only this
            // one told the truth about an absent bound. The figure is read
            // through the shared module now. `t.unstated` stays, because what
            // to say in place of a figure belongs to the surface.
            const size = sizeRange(b.size_min_sqm, b.size_max_sqm, ar ? "ar" : "en") ?? t.unstated;
            const mtitle = titleOf.get(best.listingId) || "";
            // Harbor for a result that met everything, amber for one that did
            // not. Confirmed green stays reserved for evidence-backed
            // verification, and a match is not a verification of anything.
            const tone = result.verdict === "exact"
              ? { fg: "var(--status-info)", bg: "var(--status-info-wash)" }
              : { fg: "var(--status-attention)", bg: "var(--status-attention-wash)" };
            return (
              <div key={b.id} style={{ padding: "14px 18px", borderTop: "1px solid var(--silver)" }}>
                <div className="row gap12" style={{ alignItems: "flex-start" }}>
                  <span className="queue-ic"><Icon.doc size={16} /></span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="row gap8 wrap" style={{ alignItems: "center" }}>
                      <span style={{ fontSize: 13.5, fontWeight: 600 }}>{rtitle}</span>
                      <span
                        className="tag"
                        style={{ fontSize: 10.5, color: tone.fg, background: tone.bg, borderColor: "transparent" }}
                      >
                        {verdictLabel(result.verdict, ar)}
                      </span>
                    </div>
                    <div className="muted" style={{ fontSize: 11.5, marginTop: 3 }}>
                      <bdi>{loc ? `${loc} · ` : ""}{size}</bdi>
                    </div>
                    <div style={{ fontSize: 11.5, color: "var(--harbor)", marginTop: 3 }}>
                      {t.matchOn} <Link href={`/${lp}/dashboard/listings/${best.listingId}`} style={{ color: "var(--azure-d)", fontWeight: 600, textDecoration: "none" }}>{mtitle}</Link>
                    </div>
                  </div>
                  <Link href={`/${lp}/requirements/${b.id}`} className="btn secondary sm rowact">{t.pitch}</Link>
                </div>

                {/* Progressive disclosure with no JavaScript: the reasons are in
                    the document, keyboard reachable, and readable by a screen
                    reader whether or not the summary has been opened. */}
                <details style={{ marginTop: 10 }}>
                  <summary style={{ fontSize: 12, color: "var(--slate)", cursor: "pointer" }}>
                    {t.why} <bdi>({result.reasons.length})</bdi>
                  </summary>
                  <ul style={{ listStyle: "none", margin: "8px 0 0", padding: 0, display: "grid", gap: 7 }}>
                    {result.reasons.map((r: MatchReason) => (
                      <li key={r.key} style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 12.3, lineHeight: 1.6 }}>
                        {/* The mark is decoration. The state reaches a reader
                            through the visually hidden word below, not through
                            this glyph and not through the colour. */}
                        <span
                          aria-hidden="true"
                          className="mono"
                          style={{
                            flex: "none", width: 16, textAlign: "center",
                            color: r.state === "failed" ? "var(--status-error)" : r.state === "met" ? "var(--slate)" : "var(--status-attention)",
                          }}
                        >
                          {NOTE[r.state]}
                        </span>
                        <span style={{ minWidth: 0 }}>
                          {/* ELITE-4 J4-6: the state as a word. The glyph above
                              is aria-hidden and the colour is not exposed, so
                              the state used to reach nobody using a reader. */}
                          <span className="sronly">{stateLabel(r.state, ar)}. </span>
                          <span style={{ fontWeight: 600 }}>{ar ? r.label_ar : r.label_en}</span>
                          <span className="muted"> {ar ? r.reason_ar : r.reason_en}</span>
                          {(ar ? r.remedy_ar : r.remedy_en) ? (
                            <span style={{ display: "block", marginTop: 2, color: "var(--slate)" }}>
                              {t.remedy}: {ar ? r.remedy_ar : r.remedy_en}{" "}
                              <Link href={`/${lp}/dashboard/listings/${best.listingId}`} style={{ color: "var(--azure-d)", fontWeight: 600, textDecoration: "none" }}>{t.open}</Link>
                            </span>
                          ) : null}
                        </span>
                      </li>
                    ))}
                  </ul>
                </details>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
