import Link from "next/link";
import { isLocale } from "@/i18n/config";
import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { getSupabaseServer } from "@/lib/supabase/server";
import { getDictionary } from "@/i18n/getDictionary";
import { Icon, Photo } from "@/components/satkit";
import ListingStatusToggle from "@/components/ListingStatusToggle";
import AvailabilityReaffirm from "@/components/AvailabilityReaffirm";
import { listerAvailability } from "@/lib/availability";
import { listingTitle, titleMissingIn } from "@/lib/listingTitle";
import { placeName } from "@/lib/displayName";
import { gateFailures, gateReasonsText } from "@/lib/gate";
import { netArea, askingPrice } from "@/lib/listingFigures";
import { assessListing, type ListingFacts } from "@/lib/listingQuality";
import type { Loc } from "@/lib/format";

// The owner's own inventory, with controls. "My listings" in the dashboard nav used
// to send owners to the PUBLIC explore page, where their listings appeared as
// anonymous cards among everyone else's and could not be edited, paused or even
// identified as theirs.
export const dynamic = "force-dynamic";

export default async function OwnerListingsPage({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound();
  const lp = params.locale;
  const ar = lp === "ar";
  const loc: Loc = ar ? "ar" : "en";
  const db = getDictionary(ar ? "ar" : "en").dashboard;

  const su = await getSessionUser();
  if (!su) redirect(`/${lp}/login`);
  if (!su.accountId) redirect(`/${lp}`);
  const sb = getSupabaseServer();
  if (!sb) notFound();

  const t = ar ? {
    title: "عروضي", sub: "عروضك وحالة كلٍّ منها الآن",
    thListing: "العرض", thEnq: "استفسارات", thStatus: "الحالة", thAction: "",
    emptyT: "لا عروض بعد", emptyB: "أدرج مساحتك الأولى ليبدأ ظهورها للمستأجرين الباحثين في الرياض.", emptyC: "أدرج مساحة",
    pause: "إيقاف مؤقّت", resume: "إعادة النشر", working: "جارٍ",
    st: { published: "منشور", archived: "موقوف", draft: "مسودة", pending_review: "قيد المراجعة", approved: "معتمد", rejected: "مرفوض" } as Record<string,string>,
    view: "اعرض", note: "الإيقاف المؤقّت يزيل العرض من السوق فوراً. وإعادة النشر تخضع لبوابة النشر نفسها: لا يعود العرض إلى السوق بلا تصريح إعلان ساري.",
    cannot: "تعذّرت إعادة النشر:",
    occupiersSee: "يرى الباحثون:",
    reaffirm: "ما زالت متاحة اليوم", reaffirmWorking: "جارٍ الحفظ", reaffirmDone: "تم التأكيد اليوم",
    reaffirmFailed: "تعذّر تسجيل التأكيد. حاول مرة أخرى.",
    availNote: "تأكيد التوفر يسجّل تاريخ اليوم على العرض ولا يغيّر أي حقل آخر. وهو قول تقرأه الباحثات والباحثون، فلا تؤكّد إلا مساحة تعرف أنها ما زالت متاحة.",
    otherSees: "يرى القارئ بالإنجليزية:",
    titleNote: "إن لم يُكتب عنوان العرض بإحدى اللغتين فلن يظهر عنوان مترجم، بل وصف عام للمساحة: النوع والحيّ. اكتب العنوان بنفسك من صفحة العرض، فلا تكتبه سات نيابة عنك.",
    onFile: "حقيقة مسجّلة",
    onFileNote: "عدد الحقائق المسجّلة هو عدّ لما هو موجود على العرض، لا تقييم من سات ولا شيء يراه الزائر. افتح العرض لترى ما ينقصه ولماذا يهمّ.",
  } : {
    title: "My listings", sub: "Your listings, and where each one stands right now",
    thListing: "Listing", thEnq: "Enquiries", thStatus: "Status", thAction: "",
    emptyT: "No listings yet", emptyB: "List your first space and it starts reaching occupiers searching in Riyadh.", emptyC: "List a space",
    pause: "Pause", resume: "Republish", working: "Working",
    st: { published: "Published", archived: "Paused", draft: "Draft", pending_review: "In review", approved: "Approved", rejected: "Rejected" } as Record<string,string>,
    view: "View", note: "Pausing takes the listing off the market immediately. Republishing goes through the same publish gate as any other listing: nothing returns to the market without a valid advertising permit.",
    cannot: "Cannot republish:",
    occupiersSee: "Occupiers see:",
    reaffirm: "Still available today", reaffirmWorking: "Saving", reaffirmDone: "Confirmed today",
    reaffirmFailed: "That could not be recorded. Try again.",
    availNote: "Confirming availability stamps today's date on that listing and changes nothing else. It is a statement occupiers read, so only confirm a space you know is still on the market.",
    otherSees: "An Arabic reader sees:",
    titleNote: "Where a listing has no title in one of the two languages, no translated title appears: readers in that language are shown a plain description of the space, its type and its district. Write that title yourself from the listing page. SAT does not write it for you.",
    onFile: "facts on file",
    onFileNote: "The facts on file line counts what is present on a listing. It is not an assessment by SAT and no visitor sees it. Open a listing to read what is missing and why each one matters.",
  };

  // The row select is `*` rather than a column list because the completeness line
  // below is computed from the same model the manage page uses, and a model fed a
  // narrowed row would report every unselected column as a fact the lister failed
  // to supply. A wrong count on this screen is worse than no count.
  const [{ data: listings }, { data: leads }, { data: districts }] = await Promise.all([
    sb.from("listings").select("*")
      .eq("account_id", su.accountId).order("created_at", { ascending: false }).order("id", { ascending: true }),
    sb.from("leads").select("id,listing_id"),
    sb.from("districts").select("id,name_en,name_ar,city"),
  ]);

  const rows = listings || [];

  // Media and document counts for every row in two queries rather than two per
  // row. Same composition as the manage page, so the number on this screen and the
  // list on that one cannot disagree.
  const ids = rows.map((l: any) => l.id);
  const [{ data: mediaAll }, { data: docsAll }] = ids.length
    ? await Promise.all([
        sb.from("listing_media").select("listing_id,kind").in("listing_id", ids),
        sb.from("listing_documents").select("listing_id").in("listing_id", ids).is("deleted_at", null),
      ])
    : [{ data: [] as any[] }, { data: [] as any[] }];
  const counts = new Map<string, { photos: number; plans: number; docs: number }>();
  const bump = (id: string, k: "photos" | "plans" | "docs") => {
    const c = counts.get(id) ?? { photos: 0, plans: 0, docs: 0 };
    c[k] += 1;
    counts.set(id, c);
  };
  (mediaAll || []).forEach((m: any) => {
    if (!m.listing_id) return;
    if (m.kind === "photo") bump(m.listing_id, "photos");
    else if (m.kind === "floorplan") bump(m.listing_id, "plans");
    else if (m.kind === "brochure") bump(m.listing_id, "docs");
  });
  (docsAll || []).forEach((d: any) => { if (d.listing_id) bump(d.listing_id, "docs"); });
  // PKG-NM1. The district falls back to its own city, never to the other
  // language's name, so an Arabic owner is not shown "Al Olaya".
  const drow = new Map((districts || []).map((x: any) => [x.id, x]));
  const dmap = new Map((districts || []).map((x: any) => [x.id, placeName(x, ar ? "ar" : "en")]));
  const otherLoc: "en" | "ar" = ar ? "en" : "ar";
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
                  const row = { ...l, districts: drow.get(l.district_id) ?? null };
                  const title = listingTitle(row, ar ? "ar" : "en");
                  // What the other half of the market is shown. The owner writes
                  // one title, sees their listing named correctly on their own
                  // screen, and never learns the other language reads a generic
                  // description of it.
                  const otherMissing = titleMissingIn(l, otherLoc);
                  const otherShown = otherMissing ? listingTitle(row, otherLoc) : "";
                  // PKG-SUP2, finding 120. This row read `asking_rent_sqm` back
                  // as "SAR/m2" with the year taken off, on the one screen whose
                  // whole purpose is letting the lister check that the price they
                  // entered is the price the market is being shown. The form that
                  // collected the number labels it "Asking rent (SAR per sqm per
                  // year)". The unit is decided once now, by the deal type, in
                  // `listingFigures.ts`.
                  const rentFig = askingPrice(l.deal_type === "lease" ? l.asking_rent_sqm : l.sale_price, l.deal_type, loc);
                  const areaFig = netArea(l.area_sqm, loc);
                  const specLine = [dmap.get(l.district_id) || "", areaFig, rentFig].filter(Boolean).join(" · ");
                  const live = l.status === "published";
                  const n = enq.get(l.id) || 0;
                  // Why this listing cannot go back on the market, in the owner's language.
                  const fails = l.status === "archived" ? gateFailures(l) : [];
                  const blocked = fails.length ? gateReasonsText(fails, ar) : null;
                  // The availability line is a public claim, so it is shown to the
                  // lister only where it is actually being made: on a listing that
                  // is on the market. A paused or draft listing makes no claim to
                  // anybody, and asking its owner to affirm one would be collecting
                  // an affirmation nobody reads.
                  const av = live ? listerAvailability(l.availability_confirmed_at, ar) : null;
                  // How much of this listing is on file, in the same terms the
                  // manage page states it. It is a count of absent facts, never a
                  // score, a band or a colour: quality is not verification.
                  const c = counts.get(l.id) ?? { photos: 0, plans: 0, docs: 0 };
                  const q = assessListing({
                    ...(l as Record<string, unknown>),
                    photo_count: c.photos,
                    floorplan_count: c.plans,
                    document_count: c.docs,
                  } as ListingFacts);
                  const applicable = q.checks.filter((x) => x.state !== "not_applicable");
                  const onFile = applicable.filter((x) => x.state === "present").length;
                  return (
                    <tr key={l.id}>
                      <td>
                        <div className="row gap10">
                          <Photo kind={l.asset_type} h={40} style={{ width: 56, borderRadius: 7, flex: "none" }} />
                          <div>
                            <Link href={`/${lp}/dashboard/listings/${l.id}`} className="rowlink" style={{ fontWeight: 600, fontSize: 13, color: "var(--ink)" }}>{title}</Link>
                            <div className="mono muted" style={{ fontSize: 11 }}>
                              <bdi>{specLine}</bdi>
                            </div>
                            <div className="mono muted" style={{ fontSize: 11, marginTop: 2 }}>
                              <bdi>{onFile} {ar ? "من" : "of"} {applicable.length} {t.onFile}</bdi>
                            </div>
                            {otherMissing && (
                              <div className="muted" style={{ fontSize: 11, lineHeight: 1.55, marginTop: 5, maxWidth: 330 }}>
                                {t.otherSees} <bdi dir={otherLoc === "ar" ? "rtl" : "ltr"}>{otherShown}</bdi>
                              </div>
                            )}
                            {av && (
                              <div className="col" style={{ alignItems: "flex-start", gap: 4, marginTop: 7, maxWidth: 330 }}>
                                {av.publicLine && (
                                  <div className="mono" style={{ fontSize: 11, color: av.tone, lineHeight: 1.45 }}>
                                    <bdi>{t.occupiersSee} {av.publicLine}</bdi>
                                  </div>
                                )}
                                <div className="muted" style={{ fontSize: 11, lineHeight: 1.6 }}>{av.note}</div>
                                {av.worthReaffirming && (
                                  <AvailabilityReaffirm
                                    id={l.id}
                                    t={{ action: t.reaffirm, working: t.reaffirmWorking, done: t.reaffirmDone, failed: t.reaffirmFailed }}
                                  />
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="num mono" style={{ fontWeight: 600, color: n ? "var(--ink)" : "var(--slate-2)" }}>{n}</td>
                      <td><span className={"statusdot " + (live ? "ok" : "pend")} style={{ fontSize: 12 }}>{t.st[l.status] || l.status}</span></td>
                      <td className="num">
                        <span className="rowact" style={{ display: "inline-flex" }}>
                          <ListingStatusToggle id={l.id} status={l.status} blocked={blocked} t={{ pause: t.pause, resume: t.resume, working: t.working, cannot: t.cannot }} />
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <div className="muted" style={{ padding: "12px 20px 16px", fontSize: 11.5, lineHeight: 1.6, borderTop: "1px solid var(--silver)" }}>
          <div>{t.note}</div>
          <div style={{ marginTop: 7 }}>{t.availNote}</div>
          <div style={{ marginTop: 7 }}>{t.titleNote}</div>
          <div style={{ marginTop: 7 }}>{t.onFileNote}</div>
        </div>
      </div>
    </div>
  );
}
