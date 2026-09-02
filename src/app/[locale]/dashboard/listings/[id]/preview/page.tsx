import { isLocale } from "@/i18n/config";
import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { getSupabaseServer } from "@/lib/supabase/server";
import { getDictionary } from "@/i18n/getDictionary";
import { buildListingPresentation, type DraftListingInput } from "@/lib/listingPresentation";
import { evidenceMission } from "@/lib/guidedEvidence";
import { filingAccountOf } from "@/lib/listingVerification";
import { listingEvidenceByField } from "@/lib/listingEvidence";
import DataState from "@/components/DataState";
import RetryButton from "@/components/RetryButton";
import DraftPreview, { type DraftPreviewListingData } from "@/components/listing/DraftPreview";

// PKG-LISTING-CREATION-1A, requirement G. The owner-scoped draft preview
// route.
//
// Owner scoping follows the exact pattern dashboard/listings/[id]/page.tsx
// already uses: session required, row read under the caller's own account,
// account_id checked against the session before anything about the row is
// confirmed to exist.
//
// There is still no draft-to-published transition anywhere in this codebase
// (see docs/pkg-listing-creation-1a-deferred-contracts.md). This route does
// not add one, imply one, or gate on one: it renders whatever the row
// currently is, draft or published, labelled honestly either way.
export const dynamic = "force-dynamic";

// Codex review of 922780d. The columns this route actually reads, named
// explicitly rather than `select("*")`. Assembled from: DraftListingInput
// (listingPresentation.ts), EvidenceListing (listingEvidence.ts),
// VerifiableListing/GateFields (listingVerification.ts, gate.ts), the nine
// column-backed asset fields (verified by grep against assetFields.ts:
// asking_rent_sqm, building_grade, civil_defense_approved, clear_height_m,
// fitout_condition, loading_docks, parking_ratio, power_kva, sale_price),
// and the two Arabic-origin columns ar_translation_status/ar_translated_at.
// A column missing from this list surfaces as an empty field, verifiably, at
// typecheck and in the live preview, not as a silent wrong value.
const PREVIEW_COLUMNS = [
  "id", "status", "account_id", "asset_type", "deal_type",
  "title_en", "title_ar", "description_en", "description_ar", "reference_code",
  "area_sqm", "asking_rent_sqm", "sale_price", "sale_price_sqm", "service_charge_sqm",
  "building_grade", "fitout_condition", "clear_height_m", "loading_docks", "power_kva",
  "parking_ratio", "civil_defense_approved",
  "attributes", "district_id",
  "contact_phone", "contact_email", "contact_channels", "video_url",
  "ad_permit_no", "ad_permit_number", "ad_permit_expires_at", "right_to_market_confirmed",
  "ownership_verified", "authorization_verified", "verified_at", "verified_by", "verification_method",
  "lister_type", "is_demo", "is_operator", "is_verified",
  "availability_confirmed_at",
  "ar_translation_status", "ar_translated_at",
].join(",");

export default async function DraftPreviewPage(props: { params: Promise<{ locale: string; id: string }> }) {
  const params = await props.params;
  if (!isLocale(params.locale)) notFound();
  const lp = params.locale as "en" | "ar";

  const su = await getSessionUser();
  if (!su) redirect(`/${lp}/login`);
  if (!su.accountId) redirect(`/${lp}`);

  const unavailable = lp === "ar"
    ? { title: "تعذّر تحميل المعاينة", body: "هذه مشكلة في الاتصال، وليست عرضاً مفقوداً. أعد المحاولة بعد قليل.", retry: "أعد المحاولة" }
    : { title: "This preview could not be loaded", body: "This is a connection problem, not a missing listing. Try again in a moment.", retry: "Try again" };

  const sb = await getSupabaseServer();
  if (!sb) {
    return (
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "64px 24px" }}>
        <DataState kind="error" title={unavailable.title} body={unavailable.body} action={<RetryButton label={unavailable.retry} />} />
      </div>
    );
  }

  const { data: row, error: listingError } = await sb
    .from("listings")
    .select(`${PREVIEW_COLUMNS},districts(name_en,name_ar,city)`)
    .eq("id", params.id)
    .maybeSingle();
  if (listingError) {
    return (
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "64px 24px" }}>
        <DataState kind="error" title={unavailable.title} body={unavailable.body} action={<RetryButton label={unavailable.retry} />} />
      </div>
    );
  }
  if (!row) notFound();
  // The select() argument is assembled from PREVIEW_COLUMNS at runtime, not a
  // literal, so the client's clever per-column return-type inference cannot
  // parse it and falls back to an error-shaped generic; the row's real shape
  // is exactly the explicit PREVIEW_COLUMNS list above, checked by the
  // fields actually read out of it below, not by this cast.
  const L = row as unknown as Record<string, unknown>;
  if (L.account_id !== su.accountId) notFound(); // not the caller's own listing: do not confirm it exists

  const districtsRaw = L.districts as { name_en?: string | null; name_ar?: string | null; city?: string | null } | { name_en?: string | null; name_ar?: string | null; city?: string | null }[] | null;
  const district = Array.isArray(districtsRaw) ? (districtsRaw[0] ?? null) : districtsRaw;

  // Codex review of 922780d. A failed media query used to be indistinguishable
  // from a genuinely empty draft: `photoRows` fell back to `[]` either way,
  // and the evidence mission would then honestly, but wrongly, report every
  // shot as definitely missing. The three real states are now kept apart:
  // no rows (a real empty draft), a query failure (unknown, not empty), and
  // a signed-URL failure on an individual file (that one file unavailable,
  // not evidence the lister never uploaded it).
  const { data: photoRows, error: mediaError } = await sb
    .from("listing_media")
    .select("path,source")
    .eq("listing_id", params.id)
    .eq("kind", "photo")
    .order("sort_order");
  const photos: string[] = [];
  let unloadedPhotoCount = 0;
  if (!mediaError) {
    for (const m of (photoRows ?? []) as { path: string; source: string }[]) {
      if (!m.path) continue;
      if (m.source === "upload") {
        const { data: signed } = await sb.storage.from("listing-media").createSignedUrl(m.path, 3600);
        if (signed?.signedUrl) photos.push(signed.signedUrl);
        else unloadedPhotoCount++;
      } else {
        photos.push(m.path);
      }
    }
  }
  const mediaState: "ok" | "query_failed" = mediaError ? "query_failed" : "ok";

  const isSale = L.deal_type === "sale";
  const price = isSale ? L.sale_price : L.asking_rent_sqm;
  const draftInput: DraftListingInput = {
    ...(L as unknown as DraftListingInput),
    price,
    district,
  };

  const account = filingAccountOf(L as { lister_type?: string | null; is_operator?: boolean | null; is_verified?: boolean | null; is_demo?: boolean | null });

  // Real, row-level evidence of Arabic origin. Listing-level (not per-field;
  // see provenanceDisplay.ts's own header), and this server route has no
  // session to observe a direct edit in, so `editedThisSession` is never set
  // here: a fresh load can only ever read what the row itself records.
  const arabicOriginCtx = {
    translationStatus: (L.ar_translation_status as string | null) ?? null,
    translatedAt: (L.ar_translated_at as string | null) ?? null,
  };

  const enPresentation = buildListingPresentation(draftInput, "en", {
    account,
    arabicOrigin: { title: arabicOriginCtx, description: arabicOriginCtx },
  });
  const arPresentation = buildListingPresentation(draftInput, "ar", {
    account,
    arabicOrigin: { title: arabicOriginCtx, description: arabicOriginCtx },
  });

  // The mission needs per-shot photo coverage, which this route does not have
  // (listing_media carries no shot key). A query failure and a genuinely
  // empty draft must not read the same: `hasAnyPhoto: true` on a failed query
  // is not a claim that a photo exists, it is what forces evidenceMission's
  // existing, honest "unknown coverage" branch (see guidedEvidence.ts) rather
  // than the "zero photos, definitely missing" branch a real empty draft
  // correctly reaches.
  const items = evidenceMission({
    assetType: String(L.asset_type ?? ""),
    hasAnyPhoto: mediaState === "query_failed" ? true : photos.length > 0,
    attributes: (L.attributes as Record<string, unknown> | null) ?? {},
  });

  // Real Evidence Passports, built the same way the public listing page
  // builds them (verified safe against a draft/unpublished row: neither
  // listingEvidenceByField nor the passport builder reads `status` anywhere,
  // and a listing passport is never tier "sourced", so no public market or
  // REGA-attributed figure can be attached to a lister's own draft value).
  const geography = [enPresentation.place, enPresentation.city].filter(Boolean).join(", ");
  const evidenceMap = listingEvidenceByField(L as unknown as Parameters<typeof listingEvidenceByField>[0], {
    locale: lp,
    account,
    geography,
  });
  const evidence = Object.fromEntries(evidenceMap);

  const listingData: DraftPreviewListingData = {
    id: String(L.id),
    asset_type: String(L.asset_type ?? ""),
    deal_type: String(L.deal_type ?? ""),
    price: (price as number | string | null) ?? null,
    area_sqm: (L.area_sqm as number | string | null) ?? null,
    building_grade: (L.building_grade as string | null) ?? null,
    fitout_condition: (L.fitout_condition as string | null) ?? null,
    clear_height_m: (L.clear_height_m as number | string | null) ?? null,
    loading_docks: (L.loading_docks as number | string | null) ?? null,
    power_kva: (L.power_kva as number | string | null) ?? null,
    parking_ratio: (L.parking_ratio as number | string | null) ?? null,
    civil_defense_approved: (L.civil_defense_approved as boolean | null) ?? null,
    ad_permit_no: (L.ad_permit_no as string | null) ?? null,
    ad_permit_number: (L.ad_permit_number as string | null) ?? null,
    ad_permit_expires_at: (L.ad_permit_expires_at as string | null) ?? null,
    right_to_market_confirmed: L.right_to_market_confirmed === true,
    ownership_verified: (L.ownership_verified as boolean | null) ?? null,
    authorization_verified: (L.authorization_verified as boolean | null) ?? null,
    verified_at: (L.verified_at as string | null) ?? null,
    verified_by: (L.verified_by as string | null) ?? null,
    verification_method: (L.verification_method as string | null) ?? null,
    lister_type: (L.lister_type as string | null) ?? null,
    is_demo: (L.is_demo as boolean | null) ?? null,
  };

  // The <h1> lives here, in the route file's own source, matching the
  // convention every other dashboard route follows (dashboardHeadings.test.ts
  // requires exactly one, stated once, per route). DraftPreview's own internal
  // listing-title heading is an <h2>, so the rendered page carries exactly one
  // first-level heading, the page title, not two.
  return (
    <section>
      <h1 className="font-display text-2xl text-charcoal">
        {lp === "ar" ? "معاينة العرض" : "Listing preview"}
      </h1>
      <DraftPreview
        status={String(L.status ?? "draft")}
        en={enPresentation}
        ar={arPresentation}
        listing={listingData}
        account={account}
        photos={photos}
        mediaState={mediaState}
        unloadedPhotoCount={unloadedPhotoCount}
        evidenceItems={items}
        evidence={evidence}
        initialLocale={lp}
        dict={{ en: getDictionary("en"), ar: getDictionary("ar") }}
      />
    </section>
  );
}
