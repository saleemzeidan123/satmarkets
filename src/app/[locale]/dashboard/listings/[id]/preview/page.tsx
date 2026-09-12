import { isLocale } from "@/i18n/config";
import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { getSupabaseServer } from "@/lib/supabase/server";
import { getDictionary } from "@/i18n/getDictionary";
import { buildListingPresentation, type DraftListingInput } from "@/lib/listingPresentation";
import { evidenceMission, currentEvidenceMarks } from "@/lib/guidedEvidence";
import { filingAccountOf } from "@/lib/listingVerification";
import { listingEvidenceByField } from "@/lib/listingEvidence";
import { getLister } from "@/lib/queries/listings";
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
// and (Codex review of 8b9f72d item 6) the five commercial-terms columns
// listingTermsRows.ts needs beyond the service_charge_sqm/sale_price_sqm
// already listed below: lease_term_months, rent_free_months,
// fitout_contribution, break_option_months, vat_treatment. A column missing
// from this list surfaces as an empty field in the live preview, not as a
// silent wrong value; it is not caught at typecheck (see the item-8 comment
// below, on the cast this list feeds), only by keeping this list and the
// fields actually read out of the row in sync by hand.
//
// ar_translation_status and ar_translated_at were dropped from this list
// under the same review, item 1: this route has no session to have observed
// a translation happen in, so it can never claim ai_suggested regardless of
// what these two columns say, and reading them here to reach for a claim
// they cannot support was exactly the defect that review found.
//
// is_operator and is_verified were REMOVED here (live-QA finding during the
// same round, not a Codex-numbered item): they were never columns on
// listings, confirmed against the live Postgres logs ("column
// listings.is_operator does not exist") the first time this route was
// actually exercised signed in, against a real row. Both live only on
// listers_public, keyed by account id; see the getLister() call below,
// which is the same lookup the public listing page already uses.
const PREVIEW_COLUMNS = [
  "id", "status", "account_id", "asset_type", "deal_type",
  "title_en", "title_ar", "description_en", "description_ar", "reference_code",
  "area_sqm", "asking_rent_sqm", "sale_price", "sale_price_sqm", "service_charge_sqm",
  "lease_term_months", "rent_free_months", "fitout_contribution", "break_option_months", "vat_treatment",
  "building_grade", "fitout_condition", "clear_height_m", "loading_docks", "power_kva",
  "parking_ratio", "civil_defense_approved",
  "attributes", "district_id",
  "contact_phone", "contact_email", "contact_channels", "video_url",
  "ad_permit_no", "ad_permit_number", "ad_permit_expires_at", "right_to_market_confirmed",
  "ownership_verified", "authorization_verified", "verified_at", "verified_by", "verification_method",
  "lister_type", "is_demo",
  "availability_confirmed_at",
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

  // Codex review of 8b9f72d item 3. The account constraint now sits inside
  // the query itself, not only in the application-level check two lines
  // below: a row belonging to a different account is not merely rejected
  // after being fetched, it is never fetched. The application-level check
  // stays as a second, independent boundary rather than being removed, so
  // one query that forgot the .eq() (or a future refactor that drops it)
  // does not, by itself, expose another account's draft.
  const { data: row, error: listingError } = await sb
    .from("listings")
    .select(`${PREVIEW_COLUMNS},districts(name_en,name_ar,city)`)
    .eq("id", params.id)
    .eq("account_id", su.accountId)
    .maybeSingle();
  if (listingError) {
    return (
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "64px 24px" }}>
        <DataState kind="error" title={unavailable.title} body={unavailable.body} action={<RetryButton label={unavailable.retry} />} />
      </div>
    );
  }
  if (!row) notFound();
  // Codex review of 8b9f72d item 8. This is an unchecked assertion, not a
  // verified one, and the previous version of this comment overstated what
  // it does: nothing here, at typecheck or at runtime, actually confirms
  // that PREVIEW_COLUMNS above and the fields read out of L below stay in
  // sync. The select() argument is assembled from PREVIEW_COLUMNS at
  // runtime, not a literal, so the client's per-column return-type inference
  // cannot parse it and falls back to an error-shaped generic type, which is
  // why this cast exists at all; correctness rests entirely on this file's
  // own author keeping the two lists matched by hand. A column present in
  // PREVIEW_COLUMNS but never read below is harmless; a column read below
  // but missing from PREVIEW_COLUMNS surfaces as `undefined` silently, not
  // as an error, at either typecheck or runtime.
  const L = row as unknown as Record<string, unknown>;
  if (L.account_id !== su.accountId) notFound(); // second boundary: see the query comment above

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
  // Codex review of 8b9f72d item 4. Driven by the raw row count
  // (photoRows), never by how many signed URLs happened to succeed
  // (photos.length): a row that exists but whose signed URL failed is still
  // a real photo, disclosed above via unloadedPhotoCount, not a reason to
  // read this draft as having none. "unknown" only when the query itself
  // failed, which is the one case this route genuinely cannot answer either
  // way.
  const photoInventory: "present" | "empty" | "unknown" =
    mediaError ? "unknown" : (photoRows ?? []).length > 0 ? "present" : "empty";

  const isSale = L.deal_type === "sale";
  const price = isSale ? L.sale_price : L.asking_rent_sqm;
  const draftInput: DraftListingInput = {
    ...(L as unknown as DraftListingInput),
    price,
    district,
  };

  // Live-QA finding, this correction round: is_operator and is_verified are
  // not columns on listings at all, they are exposed only through
  // listers_public (keyed by account id), the same way the public listing
  // page reads them via getLister(l.account_id). The previous version of
  // this line asserted them as if they were columns on L, which PostgREST
  // genuinely rejects (confirmed against the live Postgres logs: "column
  // listings.is_operator does not exist"); this route had apparently never
  // been exercised end to end, signed in, against a real row, before now.
  // lister_type and is_demo are read from L (listings) rather than from
  // this lookup because they are real columns there too, and
  // listers_public's own lister_type is deliberately rewritten for public
  // display (see filingAccountOf's own header), which is not what this
  // owner-only route wants.
  const lister = await getLister(L.account_id as string | null | undefined);
  const account = filingAccountOf({
    lister_type: (L.lister_type as string | null) ?? null,
    is_operator: lister?.is_operator ?? null,
    is_verified: lister?.is_verified ?? null,
    is_demo: (L.is_demo as boolean | null) ?? null,
  });

  // Codex review of 8b9f72d item 1. This server route has no session, so it
  // never observed a lister type into a field or a translate call's exact
  // output; the only honest arabicOrigin evidence it could ever supply is
  // none, which is exactly what omitting the opt below already produces
  // (arabicWordingOrigin's default is origin_unknown). Passing anything
  // built from listings.ar_translation_status / ar_translated_at here would
  // be inferring current-field authorship from listing-level, imprecise
  // metadata, the exact defect that review found.
  const enPresentation = buildListingPresentation(draftInput, "en", { account });
  const arPresentation = buildListingPresentation(draftInput, "ar", { account });

  // PKG-LISTING-CREATION-1B outcome A. Under PKG-LISTING-CREATION-1A this
  // route had no session to read a lister's "marked unavailable" answers
  // from at all (deferred-contracts item 2's own words: "cannot show this
  // promotion at all"). The durable listing_evidence_marks ledger closes
  // that: this owner-only route can now show the same unavailable marks the
  // Studio itself shows, reduced the same way currentEvidenceMarks() reduces
  // them for the Studio's own resume path.
  const { data: evidenceMarkRows } = await sb
    .from("listing_evidence_marks")
    .select("item_kind, item_key, action, reason, created_at, seq")
    .eq("listing_id", params.id);
  const unavailableMarks = new Map(currentEvidenceMarks(evidenceMarkRows ?? []).map((m) => [m.item_key, m.reason]));

  // The mission needs per-shot photo coverage, which this route does not have
  // (listing_media carries no shot key), so photo-kind items resolve on
  // whether any photo exists at all rather than per-category coverage.
  const items = evidenceMission({
    assetType: String(L.asset_type ?? ""),
    photoInventory,
    attributes: (L.attributes as Record<string, unknown> | null) ?? {},
    unavailable: unavailableMarks,
  });

  // Real Evidence Passports, built the same way the public listing page
  // builds them (verified safe against a draft/unpublished row: neither
  // listingEvidenceByField nor the passport builder reads `status` anywhere,
  // and a listing passport is never tier "sourced", so no public market or
  // REGA-attributed figure can be attached to a lister's own draft value).
  //
  // Codex review of 8b9f72d item 5. Built once per locale, not once at this
  // request's initial locale: a passport's wording and the geography it
  // cites (place, city) are locale text, and DraftPreview's EN/AR toggle is
  // client-side with no round trip back to this route, so a single map built
  // here would silently keep stale-language evidence text on screen after
  // the reader switched languages. listingEvidenceByField never reads which
  // UI locale is active, only the `locale` and `geography` it is told, so
  // two real, independent calls are what a genuine per-locale answer needs.
  const geographyEn = [enPresentation.place, enPresentation.city].filter(Boolean).join(", ");
  const geographyAr = [arPresentation.place, arPresentation.city].filter(Boolean).join(", ");
  const evidenceRow = L as unknown as Parameters<typeof listingEvidenceByField>[0];
  const evidence = {
    en: Object.fromEntries(listingEvidenceByField(evidenceRow, { locale: "en", account, geography: geographyEn })),
    ar: Object.fromEntries(listingEvidenceByField(evidenceRow, { locale: "ar", account, geography: geographyAr })),
  };

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
