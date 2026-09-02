import { isLocale } from "@/i18n/config";
import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { getSupabaseServer } from "@/lib/supabase/server";
import { getDictionary } from "@/i18n/getDictionary";
import { buildListingPresentation, type DraftListingInput } from "@/lib/listingPresentation";
import { evidenceMission } from "@/lib/guidedEvidence";
import { filingAccountOf } from "@/lib/listingVerification";
import DataState from "@/components/DataState";
import RetryButton from "@/components/RetryButton";
import DraftPreview from "@/components/listing/DraftPreview";

// PKG-LISTING-CREATION-1A, requirement G. The owner-scoped draft preview
// route.
//
// Owner scoping follows the exact pattern dashboard/listings/[id]/page.tsx
// already uses: session required, row read under the caller's own account,
// account_id checked against the session before anything about the row is
// confirmed to exist. This route reads a wider set of columns than that page
// (everything the presentation composer and the guided evidence mission need
// for every asset type) but the authorization check is identical, and it runs
// first.
//
// There is still no draft-to-published transition anywhere in this codebase
// (see docs/pkg-listing-creation-1a-deferred-contracts.md). This route does
// not add one, imply one, or gate on one: it renders whatever the row
// currently is, draft or published, labelled honestly either way.
export const dynamic = "force-dynamic";

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
    .select("*,districts(name_en,name_ar,city)")
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
  const L = row as Record<string, unknown>;
  if (L.account_id !== su.accountId) notFound(); // not the caller's own listing: do not confirm it exists

  const districtsRaw = L.districts as { name_en?: string | null; name_ar?: string | null; city?: string | null } | { name_en?: string | null; name_ar?: string | null; city?: string | null }[] | null;
  const district = Array.isArray(districtsRaw) ? (districtsRaw[0] ?? null) : districtsRaw;

  const { data: photoRows } = await sb
    .from("listing_media")
    .select("path,source")
    .eq("listing_id", params.id)
    .eq("kind", "photo")
    .order("sort_order");
  const photos: string[] = [];
  for (const m of (photoRows ?? []) as { path: string; source: string }[]) {
    if (!m.path) continue;
    if (m.source === "upload") {
      const { data: signed } = await sb.storage.from("listing-media").createSignedUrl(m.path, 3600);
      if (signed?.signedUrl) photos.push(signed.signedUrl);
    } else {
      photos.push(m.path);
    }
  }

  const isSale = L.deal_type === "sale";
  const price = isSale ? L.sale_price : L.asking_rent_sqm;
  const draftInput: DraftListingInput = {
    ...(L as unknown as DraftListingInput),
    price,
    district,
  };

  const account = filingAccountOf(L as { lister_type?: string | null; is_operator?: boolean | null; is_verified?: boolean | null; is_demo?: boolean | null });

  const enPresentation = buildListingPresentation(draftInput, "en", { account });
  const arPresentation = buildListingPresentation(draftInput, "ar", { account });

  // The mission needs per-shot photo coverage, which this route does not have
  // (listing_media carries no shot key), so it degrades honestly to "any photo
  // present" rather than claiming per-category coverage it cannot see. See
  // the deferred-contracts doc: a shot_key column on listing_media is what
  // would close this gap. (A photos.length >= standard.shots.length ?
  // "mark every shot supplied" : undefined heuristic used to sit here; it
  // produced the exact same result as hasAnyPhoto alone in every case,
  // including the one it looked like it was distinguishing, so it was
  // removed rather than left implying a per-count precision this route does
  // not have.)
  const items = evidenceMission({
    assetType: String(L.asset_type ?? ""),
    hasAnyPhoto: photos.length > 0,
    attributes: (L.attributes as Record<string, unknown> | null) ?? {},
  });

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
        rawListing={L}
        account={account}
        photos={photos}
        evidenceItems={items}
        initialLocale={lp}
        dict={{ en: getDictionary("en"), ar: getDictionary("ar") }}
      />
    </section>
  );
}
