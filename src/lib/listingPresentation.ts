import { assetLabel, dealLabel, fitoutLabel, gradePhrase, cityLabel } from "@/lib/labels";
import { listingTitle, listingPlace, type TitledListing, type Loc } from "@/lib/listingTitle";
import { askingPrice, netArea, annualTotal, priceParts } from "@/lib/listingFigures";
import { arabicState, type ArabicState } from "@/lib/listingArabic";
import {
  filingAccountOf,
  listingDimensionState,
  verifiedBadgeTexts,
  LISTING_DIMENSIONS,
  type VerifiableListing,
  type FilingAccount,
} from "@/lib/listingVerification";
import type { VerificationDimension, VerificationState } from "@/lib/evidence";
import { spaceAttributeRows, commercialAttributeRows, complianceRows } from "@/lib/attributeDisplay";
import { fieldsFor } from "@/lib/assetFields";
import { fromProvenanceTier, arabicWordingProvenance, notConfirmed, type DisplayProvenance } from "@/lib/provenanceDisplay";

// PKG-LISTING-CREATION-1A, requirement A. The one composer both the Studio's
// review step and the standalone draft preview call.
//
// WHAT THIS FILE IS AND IS NOT. It is not a new data model competing with the
// ones this repository already has (provenance.ts, evidence.ts,
// listingVerification.ts, listingFigures.ts, attributeDisplay.ts). Every
// value below is produced by calling one of those, the same way
// listings/[id]/page.tsx already does. This file exists because that page
// calls them inline, once, for a published row, and nothing else in the
// codebase called them a second time for an unpublished one in the same
// order with the same rules. Two independent call sites computing "the price
// line" is how the Studio's old preview and the public page could ever have
// disagreed about what a lease rate means (see listingFigures.ts's own
// header for the defect that shape produced once already). This file is the
// single call site; DraftPreview.tsx and the Studio's review step both
// render its output and neither derives a figure, a label or a verification
// state on its own.
//
// WHAT IT DELIBERATELY DOES NOT COVER. Location facts (nearest metro,
// walk time), similar listings, and the flyer/PDF are page-level features of
// the public listing detail page, not properties of the listing itself, and
// none of them is in this package's stated preview coverage. Reaching for
// them here would pull a Supabase-backed travel-time computation into a pure
// composer, which is also why they stay out.

export interface DraftListingInput extends TitledListing, VerifiableListing {
  asset_type: string;
  deal_type: string;
  area_sqm: unknown;
  price: unknown; // asking_rent_sqm or sale_price, whichever the deal type uses
  description_en?: string | null;
  description_ar?: string | null;
  building_grade?: string | null;
  fitout_condition?: string | null;
  attributes?: Record<string, unknown> | null;
  contact_phone?: string | null;
  contact_email?: string | null;
  contact_channels?: string[] | null;
  video_url?: string | null;
  district?: { name_en?: string | null; name_ar?: string | null; city?: string | null } | null;
  is_operator?: boolean | null;
  is_verified?: boolean | null;
}

export interface PresentedFigures {
  areaText: string | null;
  priceText: string | null;
  priceUnit: string | null;
  annualTotalText: string | null;
  lease: boolean;
}

export interface PresentedVerificationDimension {
  dimension: VerificationDimension;
  state: VerificationState;
}

export interface AttributeRow {
  label: string;
  value: string;
  provenance: DisplayProvenance;
}

export interface ArabicWordingState {
  title: { state: ArabicState; provenance: DisplayProvenance };
  description: { state: ArabicState; provenance: DisplayProvenance };
}

export const PRESENTATION_MODEL_VERSION = 1;

/**
 * Everything a rendering surface needs to show a draft (or a published row,
 * the function does not care which), already normalized, already locale
 * bound, already provenance tagged. Nothing on this type is a raw database
 * column; every field is the output of the same function the public page
 * calls for the equivalent value.
 */
export interface ListingPresentation {
  modelVersion: number;
  locale: Loc;
  ar: boolean;

  title: string;
  place: string;
  city: string | null;
  assetTypeLabel: string;
  dealLabel: string;
  gradePhrase: string | null;
  fitoutLabel: string | null;

  figures: PresentedFigures;

  descriptionText: string | null;
  arabicWording: ArabicWordingState;

  verification: PresentedVerificationDimension[];
  verifiedBadgeTexts: string[];

  spaceRows: AttributeRow[];
  commercialRows: AttributeRow[];
  complianceRows: AttributeRow[];

  contact: {
    phone: string | null;
    email: string | null;
    channels: string[];
  };
  videoUrl: string | null;

  adPermit: {
    number: string | null;
    expiresAt: string | null;
    rightToMarketConfirmed: boolean;
  };
}

function attrProvenance(assetType: string, key: string, section: "space" | "commercial" | "compliance"): DisplayProvenance {
  const field = fieldsFor(assetType).find((f) => f.key === key && f.section === section);
  if (!field) return notConfirmed();
  return fromProvenanceTier(field.provenance);
}

/** Attaches provenance to attributeDisplay's [label, value] pairs, by re-walking the same registry it walked. */
function withProvenance(
  rows: [string, string][],
  assetType: string,
  section: "space" | "commercial" | "compliance",
): AttributeRow[] {
  // attributeDisplay's row builders already filter to fields with a value; we
  // recover which field each row came from by label, which is safe because
  // labels are unique within one asset type's section (assetFields.ts has no
  // duplicate label within a section, asserted in listingPresentation.test.ts).
  const fields = fieldsFor(assetType).filter((f) => f.section === section);
  return rows.map(([label, value]) => {
    const field = fields.find((f) => f.label_en === label || f.label_ar === label);
    return { label, value, provenance: field ? fromProvenanceTier(field.provenance) : notConfirmed() };
  });
}

export function buildListingPresentation(
  l: DraftListingInput,
  locale: Loc,
  opts?: { arabicConfirmedThisSession?: boolean; account?: FilingAccount | null; now?: number },
): ListingPresentation {
  const ar = locale === "ar";
  const now = opts?.now ?? Date.now();
  const account = opts?.account ?? filingAccountOf(l);

  const lease = String(l.deal_type ?? "").toLowerCase() !== "sale";
  const titled: TitledListing = {
    title_en: l.title_en, title_ar: l.title_ar, asset_type: l.asset_type, reference_code: l.reference_code,
    districts: l.district,
  };

  const figures: PresentedFigures = {
    areaText: netArea(l.area_sqm, locale),
    priceText: askingPrice(l.price, l.deal_type, locale),
    priceUnit: priceParts(l.price, l.deal_type, locale)?.unit ?? null,
    annualTotalText: lease ? annualTotal(l.price, l.area_sqm, l.deal_type, locale) : null,
    lease,
  };

  const verification: PresentedVerificationDimension[] = LISTING_DIMENSIONS.map((dimension) => ({
    dimension,
    state: listingDimensionState(l, dimension, account, now),
  }));

  const descField = ar ? l.description_ar : l.description_en;

  const arabicWording: ArabicWordingState = {
    title: {
      state: arabicState({ value: l.title_ar, english: l.title_en }),
      provenance: ar
        ? arabicWordingProvenance({ value: l.title_ar, english: l.title_en }, opts?.arabicConfirmedThisSession ?? false)
        : (l.title_en ? fromProvenanceTier("entered") : notConfirmed()),
    },
    description: {
      state: arabicState({ value: l.description_ar, english: l.description_en }),
      provenance: ar
        ? arabicWordingProvenance({ value: l.description_ar, english: l.description_en }, opts?.arabicConfirmedThisSession ?? false)
        : (l.description_en ? fromProvenanceTier("entered") : notConfirmed()),
    },
  };

  const assetType = l.asset_type;
  const attrs = l.attributes ?? {};

  return {
    modelVersion: PRESENTATION_MODEL_VERSION,
    locale,
    ar,
    title: listingTitle(titled, locale),
    place: listingPlace(titled, locale),
    city: l.district?.city ? cityLabel(l.district.city, locale) : null,
    assetTypeLabel: assetLabel(assetType, locale),
    dealLabel: dealLabel(l.deal_type, locale),
    gradePhrase: l.building_grade ? gradePhrase(l.building_grade, locale) : null,
    fitoutLabel: l.fitout_condition && l.fitout_condition !== "n_a" ? fitoutLabel(l.fitout_condition, locale) : null,
    figures,
    descriptionText: descField || null,
    arabicWording,
    verification,
    verifiedBadgeTexts: verifiedBadgeTexts(l, account, ar, now),
    spaceRows: withProvenance(spaceAttributeRows(assetType, attrs, ar), assetType, "space"),
    commercialRows: withProvenance(commercialAttributeRows(assetType, attrs, ar), assetType, "commercial"),
    complianceRows: withProvenance(complianceRows(assetType, l as unknown as Record<string, unknown>, ar), assetType, "compliance"),
    contact: {
      phone: l.contact_phone || null,
      email: l.contact_email || null,
      channels: Array.isArray(l.contact_channels) ? l.contact_channels : [],
    },
    videoUrl: l.video_url || null,
    adPermit: {
      number: l.ad_permit_number || l.ad_permit_no || null,
      expiresAt: l.ad_permit_expires_at || null,
      rightToMarketConfirmed: !!l.right_to_market_confirmed,
    },
  };
}

// Re-exported so a caller needs one import for the field-level provenance
// helper too, rather than reaching into provenanceDisplay.ts directly for the
// one function this module does not already wrap.
export { attrProvenance };
