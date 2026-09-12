import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { redirect } from "next/navigation";
import { getSupabaseServer } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth/session";
import { intakeFields } from "@/lib/assetFields";
import { PLATFORM_OWNED_FIELD_KEYS } from "@/lib/listingQuality";
import { currentEvidenceMarks } from "@/lib/guidedEvidence";
import type { LocationPoint } from "@/lib/nearestLocation";
import ListingStudio, { type StudioInitial } from "@/components/ListingStudio";

// Creating a listing and resuming one are the same surface.
//
// A listing that takes twenty minutes to describe properly will not be described
// in one sitting, so the Studio saves a draft early and the lister comes back to
// it. Coming back is a URL: /dashboard/new?draft=<id>. The row is read here, on
// the server, under the lister's own session, and handed to the Studio as its
// starting state; the Studio then lands on the step that is still waiting rather
// than on step one.
//
// Two rules this page holds:
//
// 1. A draft is resumable here. A published listing is not. Once a listing is
//    public the advertising licence, the pin and the deal type stop being the
//    lister's alone (src/lib/listingEdit.ts), and the surface that reflects that
//    is the dashboard editor, so a published id is redirected there rather than
//    quietly opened in an intake flow that would ask to change facts it cannot.
// 2. A draft id that is not this account's is not confirmed to exist. It falls
//    through to a blank new listing, the same as no parameter at all.
export default async function NewListingPage(
  props: {
    params: Promise<{ locale: string }>;
    searchParams?: Promise<{ draft?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  if (!isLocale(params.locale)) notFound();
  const locale = params.locale;
  const sb = await getSupabaseServer();
  /* RC10, finding 22. The one hardcoded English sentence left on this route:
     the misconfiguration branch, which an Arabic lister reaches with no warning
     and cannot act on. It is a rare branch, which is exactly why it survived
     every earlier sweep of the visible form. */
  if (!sb)
    return (
      <p className="text-charcoal/65">
        {locale === "ar"
          ? "خدمة حفظ العروض غير متاحة الآن. أعد المحاولة بعد قليل."
          : "The listing store is not available right now. Try again in a moment."}
      </p>
    );
  // This used to fall back to a hardcoded PREVIEW_ACCOUNT, which was SAT's own
  // account id, so an unauthenticated visitor was silently pointed at SAT's
  // inventory. Listing requires a real, verified account. No fallback.
  const su = await getSessionUser();
  if (!su) redirect(`/${locale}/login`);
  if (!su.accountId) redirect(`/${locale}/signup`);
  // The Studio never carries the account id. The write path derives it from the
  // session, so a value in the browser could only ever be decoration or a lie.
  // Location centroids power the map location picker: the lister pins the building
  // and the closest location is offered when none is on file.
  // PKG-ELITE-E1 slice C. `districts_geo` is read for the point and the kind only,
  // and the city comes from `districts`, which is the pairing the public listings
  // map already uses (PKG-NM1). The previous select asked `districts_geo` for a
  // city column and ordered by it, and if that view does not carry one PostgREST
  // returns an error and the picker silently receives an empty list. `kind`
  // travels with each row so the picker can keep Law 7 and never label a
  // development a district.
  const [{ data: geoRows }, { data: cityRows }] = await Promise.all([
    sb.from("districts_geo").select("id,name_en,name_ar,lat,lng,kind"),
    sb.from("districts").select("id,city"),
  ]);
  const cityById = new Map<string, string | null>((cityRows ?? []).map((d: any) => [d.id, d.city ?? null]));
  const districts: LocationPoint[] = (geoRows ?? [])
    .map((g: any) => ({
      id: String(g.id), name_en: g.name_en, name_ar: g.name_ar,
      city: cityById.get(String(g.id)) ?? null, kind: g.kind ?? null,
      lat: Number(g.lat), lng: Number(g.lng),
    }))
    .sort((a, b) => (a.city ?? "").localeCompare(b.city ?? ""));

  const draftId = String(searchParams?.draft ?? "").trim();
  let initial: StudioInitial | null = null;
  if (draftId) {
    const { data: row } = await sb.from("listings").select("*").eq("id", draftId).single();
    const L = row as Record<string, any> | null;
    if (L && L.account_id === su.accountId) {
      if (L.status !== "draft") redirect(`/${locale}/dashboard/listings/${draftId}`);

      // Registry values, seeded the way the dashboard editor seeds them: a
      // column-backed field reads its column, everything else reads the
      // attributes blob. Booleans stay boolean because the checkbox reads
      // `=== true`; every other type becomes a string because the inputs are
      // controlled by strings and undefined would make them uncontrolled.
      const existing: Record<string, unknown> = L.attributes && typeof L.attributes === "object" ? L.attributes : {};
      const attributes: Record<string, unknown> = {};
      for (const field of intakeFields(String(L.asset_type))) {
        if (PLATFORM_OWNED_FIELD_KEYS.has(field.key)) continue;
        const raw = field.column ? L[field.column] : existing[field.key];
        if (raw === null || raw === undefined) { attributes[field.key] = field.type === "boolean" ? false : ""; continue; }
        attributes[field.key] = field.type === "boolean" ? raw === true : String(raw);
      }

      // The counts the completeness model needs and the listing row does not
      // carry. Files already uploaded are facts about this listing, so a
      // returning lister is not told to supply photographs they supplied on
      // Tuesday. Counted, never listed: the Studio is an intake surface, and
      // managing existing media is the dashboard editor's job.
      const [photos, floorplans, brochures, documents, evidenceMarkRows] = await Promise.all([
        sb.from("listing_media").select("id", { count: "exact", head: true }).eq("listing_id", draftId).eq("kind", "photo"),
        // Plans are read as rows rather than counted, because the media standard asks
        // whether an attached plan is of a kind this asset is shown by, and the recorded
        // type is the only thing that answers it. A row with no recorded type stays null.
        sb.from("listing_media").select("plan_type").eq("listing_id", draftId).eq("kind", "floorplan"),
        sb.from("listing_media").select("id", { count: "exact", head: true }).eq("listing_id", draftId).eq("kind", "brochure"),
        sb.from("listing_documents").select("id", { count: "exact", head: true }).eq("listing_id", draftId).is("deleted_at", null),
        // PKG-LISTING-CREATION-1B outcome A. The whole ledger for this
        // listing, any order (currentEvidenceMarks reduces it), so a mark
        // made last visit is not asked for again this visit.
        sb.from("listing_evidence_marks")
          .select("item_kind, item_key, action, reason, created_at, seq")
          .eq("listing_id", draftId),
      ]);
      const evidenceMarks = currentEvidenceMarks(evidenceMarkRows.data ?? []);

      const isSale = L.deal_type === "sale";
      const price = isSale ? L.sale_price : L.asking_rent_sqm;
      initial = {
        id: String(L.id),
        title_en: String(L.title_en ?? ""),
        title_ar: String(L.title_ar ?? ""),
        asset_type: String(L.asset_type ?? "office"),
        deal_type: String(L.deal_type ?? "lease"),
        area_sqm: L.area_sqm == null ? "" : String(L.area_sqm),
        price: price == null ? "" : String(price),
        description_en: String(L.description_en ?? ""),
        description_ar: String(L.description_ar ?? ""),
        contact_phone: String(L.contact_phone ?? ""),
        contact_email: String(L.contact_email ?? ""),
        contact_channels: Array.isArray(L.contact_channels) ? L.contact_channels.map(String) : null,
        lister_type: String(L.lister_type ?? "owner_direct"),
        video_url: String(L.video_url ?? ""),
        floorplan_url: String(L.floorplan_url ?? ""),
        ad_permit_no: String(L.ad_permit_no ?? ""),
        // The date input reads YYYY-MM-DD, and the column may be a timestamp.
        ad_permit_expires_at: String(L.ad_permit_expires_at ?? "").slice(0, 10),
        right_to_market_confirmed: L.right_to_market_confirmed === true,
        availability_confirmed_at: String(L.availability_confirmed_at ?? ""),
        lat: typeof L.lat === "number" ? L.lat : null,
        lng: typeof L.lng === "number" ? L.lng : null,
        district_id: L.district_id ? String(L.district_id) : null,
        attributes,
        photo_count: photos.count ?? 0,
        floorplan_count: floorplans.data?.length ?? 0,
        floorplan_types: (floorplans.data ?? []).map((r: any) => (r?.plan_type == null ? null : String(r.plan_type))),
        document_count: (brochures.count ?? 0) + (documents.count ?? 0),
        evidence_marks: evidenceMarks,
      };
    }
  }

  return (
    <section className="py-6">
      <h1 className="font-display text-2xl text-charcoal">
        {initial
          ? locale === "ar" ? "متابعة المسودة" : "Continue this draft"
          : locale === "ar" ? "عرض جديد" : "New listing"}
      </h1>
      <div className="mt-6">
        <ListingStudio locale={locale} districts={districts} initial={initial} />
      </div>
    </section>
  );
}
