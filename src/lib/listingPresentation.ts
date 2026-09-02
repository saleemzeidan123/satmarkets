import { assetLabel, dealLabel, fitoutLabel, gradePhrase, cityLabel } from "@/lib/labels";
import { listingTitle, listingPlace, type TitledListing, type Loc } from "@/lib/listingTitle";
import { askingPrice, netArea, annualTotal, priceParts } from "@/lib/listingFigures";
import { arabicState, type ArabicState, type ArabicField } from "@/lib/listingArabic";
import {
  filingAccountOf,
  listingDimensionState,
  verifiedBadgeTexts,
  LISTING_DIMENSIONS,
  type VerifiableListing,
  type FilingAccount,
} from "@/lib/listingVerification";
import type { VerificationDimension, VerificationState } from "@/lib/evidence";
import { spaceAttributeRows, complianceRows } from "@/lib/attributeDisplay";
import { fieldsFor } from "@/lib/assetFields";
import { listingTermsRows, type TermsRow, type TermsRowSource } from "@/lib/listingTermsRows";
import { getDictionary } from "@/i18n/getDictionary";
import {
  fromProvenanceTier,
  notConfirmed,
  arabicWordingFacts,
  type DisplayProvenance,
  type ArabicOrigin,
  type ArabicReview,
  type ArabicOriginContext,
} from "@/lib/provenanceDisplay";

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
  service_charge_sqm?: number | string | null;
  lease_term_months?: number | string | null;
  rent_free_months?: number | string | null;
  fitout_contribution?: number | string | null;
  break_option_months?: number | string | null;
  sale_price_sqm?: number | string | null;
  vat_treatment?: string | null;
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
  title: { state: ArabicState; origin: ArabicOrigin | null; review: ArabicReview };
  description: { state: ArabicState; origin: ArabicOrigin | null; review: ArabicReview };
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
  termsRows: TermsRow[];
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

/**
 * English has no AI-generation path in this app, only EN-to-AR translation,
 * so the English locale's provenance question is only ever "is there English
 * text at all," never a real origin/review question the way the Arabic side
 * is. Kept as its own function (rather than an inline ternary feeding a
 * spread) so the object literal below is checked against its declared return
 * type directly, instead of losing that contextual type across a spread and
 * silently widening "unreviewed" to plain `string`.
 */
function arabicWordingForLocale(
  ar: boolean,
  field: ArabicField,
  englishPresent: boolean,
  ctx: ArabicOriginContext & { reviewedThisSession?: boolean },
): { origin: ArabicOrigin | null; review: ArabicReview } {
  if (ar) return arabicWordingFacts(field, ctx);
  return { origin: englishPresent ? "lister_supplied" : null, review: "unreviewed" };
}

export function buildListingPresentation(
  l: DraftListingInput,
  locale: Loc,
  opts?: {
    /** Session-only "I have read this and it reads correctly", per field. Never rewrites origin; see provenanceDisplay.ts. */
    arabicReviewed?: { title?: boolean; description?: boolean };
    /** Real origin evidence for the Arabic title/description; see ArabicOriginContext. */
    arabicOrigin?: { title?: ArabicOriginContext; description?: ArabicOriginContext };
    account?: FilingAccount | null;
    now?: number;
  },
): ListingPresentation {
  const ar = locale === "ar";
  const dict = getDictionary(locale);
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
      ...arabicWordingForLocale(
        ar,
        { value: l.title_ar, english: l.title_en },
        !!l.title_en,
        { ...opts?.arabicOrigin?.title, reviewedThisSession: opts?.arabicReviewed?.title ?? false },
      ),
    },
    description: {
      state: arabicState({ value: l.description_ar, english: l.description_en }),
      ...arabicWordingForLocale(
        ar,
        { value: l.description_ar, english: l.description_en },
        !!l.description_en,
        { ...opts?.arabicOrigin?.description, reviewedThisSession: opts?.arabicReviewed?.description ?? false },
      ),
    },
  };

  const assetType = l.asset_type;
  const attrs = l.attributes ?? {};

  // PKG-LISTING-CREATION-1A, Codex review of 8b9f72d item 6. `price` on
  // DraftListingInput is already the asking_rent_sqm-or-sale_price union the
  // rest of this module uses (see the field's own comment); it is a real
  // sale price only when the deal itself is a sale, which is exactly the
  // condition listingTermsRows needs to fall back to it.
  const termsSource: TermsRowSource = {
    deal_type: l.deal_type,
    service_charge_sqm: l.service_charge_sqm,
    lease_term_months: l.lease_term_months,
    rent_free_months: l.rent_free_months,
    fitout_contribution: l.fitout_contribution,
    break_option_months: l.break_option_months,
    sale_price_sqm: l.sale_price_sqm,
    sale_price: lease ? null : (l.price as number | string | null),
    area_sqm: l.area_sqm as number | string | null,
    vat_treatment: l.vat_treatment,
    asset_type: assetType,
    attributes: attrs,
  };

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
    termsRows: listingTermsRows(termsSource, dict, locale),
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
