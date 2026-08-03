import Link from "next/link";
import { isLocale } from "@/i18n/config";
import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { getSupabaseServer } from "@/lib/supabase/server";
import { assetLabel, dealLabel } from "@/lib/labels";
import { Icon } from "@/components/satkit";
import ListingStatusToggle from "@/components/ListingStatusToggle";
import EditListingForm from "@/components/EditListingForm";
import ListingMediaManager from "@/components/ListingMediaManager";
import ListingDocsManager from "@/components/ListingDocsManager";
import ListingCompleteness from "@/components/ListingCompleteness";
import { assessListing, type ListingFacts } from "@/lib/listingQuality";
import { stageOf, mayFillAbsent } from "@/lib/listingEdit";
import { gateFailures, gateReasonsText, permitOf } from "@/lib/gate";
import { listingDimensionState, verifiedBadgeText } from "@/lib/listingVerification";
import { intakeFields } from "@/lib/assetFields";
import { listingTitle, titleMissingIn } from "@/lib/listingTitle";
import { arabicIsBehind } from "@/lib/listingArabic";
import { hashSource } from "@/lib/translate/hash";
import type { LocationPoint } from "@/lib/nearestLocation";
import { assessLocationConsistency, type LocationConsistency } from "@/lib/locationConsistency";

const BASE_OWNED = new Set(["asking_rent_sqm", "sale_price"]);

// The owner's manage page for one listing: status and actions at the top, a
// self-serve editor for the fields they control, and the licence and verification
// shown read-only (those change through SAT, not here). Reaching this page from the
// My listings row is what finally lets an owner edit their own listing.
export const dynamic = "force-dynamic";

export default async function ManageListingPage(props: { params: Promise<{ locale: string; id: string }> }) {
  const params = await props.params;
  if (!isLocale(params.locale)) notFound();
  const lp = params.locale;
  const ar = lp === "ar";

  const su = await getSessionUser();
  if (!su) redirect(`/${lp}/login`);
  if (!su.accountId) redirect(`/${lp}`);
  const sb = getSupabaseServer();
  if (!sb) notFound();

  // The owner's own row: select everything so the per-asset registry can read its
  // column-backed values (grade, fit-out, clear height, and so on) alongside the
  // jsonb attributes, without enumerating 15 asset types' worth of columns here.
  const { data: l } = await sb
    .from("listings")
    .select("*,districts(name_en,name_ar,city)")
    .eq("id", params.id)
    .single();
  if (!l) notFound();
  if ((l as any).account_id !== su.accountId) notFound(); // not yours: do not confirm it exists

  const L: any = l;

  // Seed the editor's per-asset fields from the listing's current state: a
  // column-backed field reads its column, everything else reads the attributes blob.
  // Booleans stay boolean; every other type becomes a string for the inputs.
  const existingAttrs: Record<string, unknown> = (L.attributes && typeof L.attributes === "object") ? L.attributes : {};
  const initAttrs: Record<string, unknown> = {};
  for (const field of intakeFields(L.asset_type)) {
    if (BASE_OWNED.has(field.key)) continue;
    const raw = field.column ? L[field.column] : existingAttrs[field.key];
    if (raw === null || raw === undefined) { initAttrs[field.key] = field.type === "boolean" ? false : ""; continue; }
    initAttrs[field.key] = field.type === "boolean" ? raw === true : String(raw);
  }

  // The listing's photos, in display order, each signed for the owner (RLS lets an
  // owner read their own media on any status; the URLs are short-lived).
  const { data: mediaRows } = await sb
    .from("listing_media")
    .select("id,path,source,sort_order")
    .eq("listing_id", params.id)
    .eq("kind", "photo")
    .order("sort_order");
  const photos: { id: string; url: string | null }[] = [];
  for (const m of (mediaRows ?? []) as { id: string; path: string; source: string }[]) {
    if (!m.path) { photos.push({ id: m.id, url: null }); continue; }
    // Same rule as the public page: an uploaded photo is a private object that must
    // be signed; a source=url photo already IS an external URL, so use it directly.
    if (m.source === "upload") {
      const { data: signed } = await sb.storage.from("listing-media").createSignedUrl(String(m.path), 3600);
      photos.push({ id: m.id, url: signed?.signedUrl ?? null });
    } else {
      photos.push({ id: m.id, url: String(m.path) });
    }
  }

  // Floor plans and brochure, signed the same way. A floor plan may be an image or a
  // PDF; the brochure is a PDF. The manager shows a thumbnail for images and a file
  // chip for PDFs, and removes either through the shared media DELETE.
  const { data: docRows } = await sb
    .from("listing_media")
    .select("id,path,source,kind,mime,alt_en,alt_ar,sort_order")
    .eq("listing_id", params.id)
    .in("kind", ["floorplan", "brochure"])
    .order("sort_order");
  const floorplans: { id: string; url: string | null; isPdf: boolean; label: string | null }[] = [];
  const brochures: { id: string; url: string | null; isPdf: boolean; label: string | null }[] = [];
  for (const m of (docRows ?? []) as { id: string; path: string; source: string; kind: string; mime: string | null; alt_en: string | null; alt_ar: string | null }[]) {
    if (!m.path) continue;
    let url: string | null = String(m.path);
    if (m.source === "upload") {
      const { data: signed } = await sb.storage.from("listing-media").createSignedUrl(String(m.path), 3600);
      url = signed?.signedUrl ?? null;
    }
    const isPdf = m.mime === "application/pdf" || String(m.path).toLowerCase().split("?")[0].endsWith(".pdf");
    const item = { id: m.id, url, isPdf, label: (ar ? (m.alt_ar || m.alt_en) : (m.alt_en || m.alt_ar)) || null };
    if (m.kind === "brochure") brochures.push(item); else floorplans.push(item);
  }

  // What is absent from this listing, read by the same model the Studio uses at
  // creation. The row itself carries every column and the attributes blob, so the
  // only facts it cannot supply are the counts, which are taken the way
  // dashboard/new already takes them. listing_documents is the legal-document
  // table and is counted alongside the brochure, because the "supporting
  // documents" check asks whether there is anything for a later check to read.
  const { count: legalDocCount } = await sb
    .from("listing_documents")
    .select("id", { count: "exact", head: true })
    .eq("listing_id", params.id)
    .is("deleted_at", null);
  // Finding 137. Whether the pin and the location on file can describe the same
  // building is read here, on the one row the lister is looking at, and one row
  // of the location table is all it costs: the recorded id resolved directly. It
  // is deliberately NOT inside the `mayPin` branch below. Whether a lister is
  // allowed to move the pin and whether the pin already contradicts the record
  // are different questions, and a listing that cannot be repinned from here is
  // exactly the one whose contradiction has to reach a human some other way. SAT
  // holds no boundaries, so this can only ever say the two are too far apart to
  // both be true, never that they match.
  let locationConsistency: LocationConsistency | null = null;
  if (L.lat != null && L.lng != null && L.district_id) {
    const { data: recordedRow } = await sb
      .from("districts_geo")
      .select("id,name_en,name_ar,lat,lng,kind")
      .eq("id", L.district_id)
      .maybeSingle();
    const r = recordedRow as Record<string, unknown> | null;
    locationConsistency = assessLocationConsistency({
      lat: Number(L.lat),
      lng: Number(L.lng),
      recorded: r
        ? {
            id: String(r.id), name_en: String(r.name_en ?? ""),
            name_ar: (r.name_ar as string | null) ?? null,
            kind: (r.kind as string | null) ?? null,
            lat: Number(r.lat), lng: Number(r.lng),
          }
        : null,
    });
  }
  const facts: ListingFacts = {
    ...(L as Record<string, unknown>),
    photo_count: photos.length,
    floorplan_count: floorplans.length,
    document_count: brochures.length + (legalDocCount ?? 0),
    location_consistency: locationConsistency,
  };
  const quality = assessListing(facts);

  // The one gap on a published listing that had no self-serve route at all. A
  // listing that has never been pinned may receive its first pin; one that is
  // already pinned is still SAT's to move, and the district is never moved by a
  // lister on a live listing. The form is shown exactly where the API would
  // accept the write, so the screen and the permission cannot drift apart.
  const stage = stageOf(L.status);
  const pinned = L.lat != null && L.lng != null;
  const mayPin = mayFillAbsent("lat", stage, pinned);
  // PKG-ELITE-E1 slice C. `districts_geo` is read for the point and the kind only,
  // and the city comes from `districts`, which is the pairing the public listings
  // map already uses (PKG-NM1). The previous select asked `districts_geo` for a
  // city column and ordered by it, and if that view does not carry one PostgREST
  // returns an error and the picker silently receives an empty list. `kind`
  // travels with each row so the picker can keep Law 7 and never label a
  // development a district.
  let districts: LocationPoint[] = [];
  if (mayPin) {
    const [{ data: geoRows }, { data: cityRows }] = await Promise.all([
      sb.from("districts_geo").select("id,name_en,name_ar,lat,lng,kind"),
      sb.from("districts").select("id,city"),
    ]);
    const cityById = new Map<string, string | null>((cityRows ?? []).map((d: any) => [d.id, d.city ?? null]));
    districts = (geoRows ?? [])
      .map((g: any) => ({
        id: String(g.id), name_en: g.name_en, name_ar: g.name_ar,
        city: cityById.get(String(g.id)) ?? null, kind: g.kind ?? null,
        lat: Number(g.lat), lng: Number(g.lng),
      }))
      .sort((a, b) => (a.city ?? "").localeCompare(b.city ?? ""));
  }

  const t = ar ? {
    back: "عروضي", edit: "تعديل التفاصيل", viewPublic: "عرض الصفحة العامة", locked: "الترخيص والتحقّق",
    lockedNote: "رقم رخصة الإعلان والتحقّق من الملكية لا تُعدَّل من هنا؛ تغييرها يتطلّب مراجعة سات ويحمي شارة التوثيق.",
    permit: "رخصة الإعلان", expires: "تنتهي", pendingV: "قيد التحقّق",
    pause: "إيقاف مؤقّت", resume: "إعادة النشر", working: "جارٍ", cannot: "تعذّرت إعادة النشر:",
    st: { published: "منشور", archived: "موقوف", draft: "مسودة", pending_review: "قيد المراجعة", approved: "معتمد", rejected: "مرفوض" } as Record<string, string>,
    noOther: "لا يوجد عنوان إنجليزي لهذا العرض.",
    otherSees: "يرى القارئ بالإنجليزية:",
    otherNote: "اكتب العنوان الإنجليزي في تعديل التفاصيل أدناه. لا تكتب سات العنوان نيابة عنك.",
  } : {
    back: "My listings", edit: "Edit details", viewPublic: "View public listing", locked: "Licence and verification",
    lockedNote: "The advertising licence number and ownership verification are not edited here; changing them goes through SAT review and protects the Verified badge.",
    permit: "Advertising licence", expires: "Expires", pendingV: "Pending verification",
    pause: "Pause", resume: "Republish", working: "Working", cannot: "Cannot republish:",
    st: { published: "Published", archived: "Paused", draft: "Draft", pending_review: "In review", approved: "Approved", rejected: "Rejected" } as Record<string, string>,
    noOther: "This listing has no Arabic title.",
    otherSees: "An Arabic reader sees:",
    otherNote: "Write the Arabic title in Edit details below. SAT does not write it for you.",
  };

  const live = L.status === "published";
  const fails = L.status === "archived" ? gateFailures(L) : [];
  const blocked = fails.length ? gateReasonsText(fails, ar) : null;
  const price = L.deal_type === "lease" ? L.asking_rent_sqm : L.sale_price;
  const title = listingTitle(L, ar ? "ar" : "en");
  // PKG-NM1. What the other half of the market is shown. The owner writes one
  // title, sees their listing named correctly on their own screen, and never
  // learns that readers in the other language are handed a generic description
  // of it. SAT does not translate the title for them: a machine translation of
  // a name is a name SAT invented.
  const otherLoc: "en" | "ar" = ar ? "en" : "ar";
  const otherMissing = titleMissingIn(L, otherLoc);
  const otherShown = otherMissing ? listingTitle(L, otherLoc) : "";
  // PKG-LS1. Whether the Arabic on the row still answers the English on it. The
  // comparison is the one `/api/listings/[id]/translate` makes when it decides
  // what to rewrite, so the lister is not told a field is current on a row the
  // translator is about to overwrite. Hashed here rather than in the form
  // because the form is a client component and this is a node crypto call. Both
  // read false when the record cannot answer: see `arabicState`.
  const titleArBehind = arabicIsBehind({
    value: L.title_ar, srcHash: L.title_ar_src_hash,
    english: L.title_en, englishHash: L.title_en ? hashSource(L.title_en) : null,
  });
  const descArBehind = arabicIsBehind({
    value: L.description_ar, srcHash: L.description_ar_src_hash,
    english: L.description_en, englishHash: L.description_en ? hashSource(L.description_en) : null,
  });
  // C4, then ADV-1. The owner was told their listing was verified when it was our
  // own stock, or when a broker had declared an authorisation. The dashboard is
  // where an owner learns what still has to happen, so it now reports the ownership
  // dimension itself: a real method, a date and a reviewer, or it is still pending.
  const verified = listingDimensionState(L as any, "ownership") === "verified";
  const expiry = L.ad_permit_expires_at ? new Date(L.ad_permit_expires_at).toLocaleDateString(ar ? "ar-SA-u-nu-latn" : "en-GB", { day: "2-digit", month: "short", year: "numeric" }) : null;

  return (
    <div>
      <Link href={`/${lp}/dashboard/listings`} className="mono muted" style={{ fontSize: "0.75rem", textDecoration: "none" }}>{ar ? "→" : "←"} {t.back}</Link>

      <div className="row between wrap" style={{ alignItems: "flex-start", gap: 12, margin: "10px 0 18px" }}>
        <div style={{ minWidth: 0 }}>
          <h1 style={{ fontSize: "1.375rem", fontWeight: 700, letterSpacing: "-.01em", margin: 0 }}>{title}</h1>
          <div className="row gap10" style={{ marginTop: 6, alignItems: "center" }}>
            <span className={"statusdot " + (live ? "ok" : "pend")} style={{ fontSize: "0.78125rem" }}>{t.st[L.status] || L.status}</span>
            <span className="muted" style={{ fontSize: "0.78125rem" }}>· {assetLabel(L.asset_type, lp)} · {dealLabel(L.deal_type, lp)}</span>
          </div>
          {otherMissing && (
            <div className="muted" style={{ fontSize: "0.75rem", lineHeight: 1.6, marginTop: 8, maxWidth: 420 }}>
              <div>{t.noOther} {t.otherSees} <bdi dir={otherLoc === "ar" ? "rtl" : "ltr"} style={{ color: "var(--ink)" }}>{otherShown}</bdi></div>
              <div style={{ marginTop: 3 }}>{t.otherNote}</div>
            </div>
          )}
        </div>
        <div className="row gap10" style={{ alignItems: "center" }}>
          <Link href={`/${lp}/listings/${L.id}`} className="chip" style={{ textDecoration: "none" }}><Icon.arrow size={15} /> {t.viewPublic}</Link>
          <ListingStatusToggle id={L.id} status={L.status} blocked={blocked} ar={ar} t={{ pause: t.pause, resume: t.resume, working: t.working, cannot: t.cannot }} />
        </div>
      </div>

      <div className="dpanel" style={{ padding: 20 }}>
        <ListingCompleteness quality={quality} ar={ar} />
      </div>

      <div className="dpanel" style={{ padding: 20, marginTop: 18 }}>
        <div style={{ fontSize: "0.90625rem", fontWeight: 700, marginBottom: 14 }}>{t.edit}</div>
        <EditListingForm
          id={L.id}
          locale={lp}
          assetType={L.asset_type}
          initAttrs={initAttrs}
          titleArBehind={titleArBehind}
          descArBehind={descArBehind}
          mayPin={mayPin}
          pinned={pinned}
          draft={stage === "draft"}
          districts={districts}
          init={{
            title_en: L.title_en || "",
            title_ar: L.title_ar || "",
            description_en: L.description_en || "",
            description_ar: L.description_ar || "",
            area_sqm: L.area_sqm != null ? String(L.area_sqm) : "",
            price: price != null ? String(price) : "",
            deal_type: L.deal_type,
            video_url: L.video_url || "",
            contact_phone: L.contact_phone || "",
            contact_email: L.contact_email || "",
            contact_channels: Array.isArray(L.contact_channels) ? L.contact_channels : [],
          }}
        />
      </div>

      <div className="dpanel" style={{ padding: 20, marginTop: 18 }}>
        <ListingMediaManager id={L.id} locale={lp} photos={photos} />
      </div>

      <div className="dpanel" style={{ padding: 20, marginTop: 18 }}>
        <ListingDocsManager id={L.id} locale={lp} floorplans={floorplans} brochures={brochures} />
      </div>

      <div className="dpanel" style={{ padding: 20, marginTop: 18 }}>
        <div className="row gap8" style={{ alignItems: "center", marginBottom: 6 }}>
          <span className="muted" style={{ display: "inline-flex" }}><Icon.info size={15} /></span>
          <span style={{ fontSize: "0.90625rem", fontWeight: 700 }}>{t.locked}</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%, 160px), 1fr))", gap: 14, marginTop: 10 }}>
          <div>
            <div className="muted" style={{ fontSize: "0.71875rem" }}>{t.permit}</div>
            <div className="mono" style={{ fontSize: "0.875rem", fontWeight: 500, marginTop: 5 }}>{permitOf(L) || (ar ? "غير مسجّل" : "Not on file")}</div>
          </div>
          {expiry && (
            <div>
              <div className="muted" style={{ fontSize: "0.71875rem" }}>{t.expires}</div>
              <div className="mono" style={{ fontSize: "0.875rem", fontWeight: 500, marginTop: 5 }}>{expiry}</div>
            </div>
          )}
          <div>
            <div className="muted" style={{ fontSize: "0.71875rem" }}>{ar ? "التحقّق" : "Verification"}</div>
            <div style={{ marginTop: 5 }}>
              <span className={"statusdot " + (verified ? "ok" : "pend")} style={{ fontSize: "0.8125rem" }}>{verified ? verifiedBadgeText("ownership", ar) : t.pendingV}</span>
            </div>
          </div>
        </div>
        <div className="muted" style={{ fontSize: "0.71875rem", lineHeight: 1.6, marginTop: 14, borderTop: "1px solid var(--silver)", paddingTop: 12 }}>{t.lockedNote}</div>
      </div>
    </div>
  );
}
