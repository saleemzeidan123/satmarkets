import { test } from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { buildListingPresentation, type DraftListingInput } from "@/lib/listingPresentation";
import { evidenceMission } from "@/lib/guidedEvidence";
import { getDictionary } from "@/i18n/getDictionary";
import { listingEvidenceByField } from "@/lib/listingEvidence";
import { arabicOriginLabel, arabicReviewLabel } from "@/lib/provenanceDisplay";
import DraftPreview, { type DraftPreviewListingData } from "./DraftPreview";

// Codex review of 922780d, item 11: source-text guards (listingPreviewWiring.
// test.ts) prove the wiring exists; they cannot prove what actually reaches
// the screen. This file renders the real component, the way
// EvidencePassport.render.test.tsx renders EvidencePassport, for the
// specific behaviors this correction round added: the media-unavailable
// warning, the unloaded-photo warning, and the placeholder-image disclosure.

const INPUT: DraftListingInput = {
  asset_type: "office",
  deal_type: "lease",
  area_sqm: 300,
  price: 1600,
  title_en: "Grade A floor, Al Olaya",
  title_ar: "طابق فئة أ، العليا",
  description_en: "A fitted floor with river views.",
  description_ar: null,
  attributes: {},
  contact_channels: [],
  reference_code: "SATM-TEST0001",
};

const LISTING: DraftPreviewListingData = {
  id: "l1",
  asset_type: "office",
  deal_type: "lease",
  price: 1600,
  area_sqm: 300,
  building_grade: null,
  fitout_condition: null,
  clear_height_m: null,
  loading_docks: null,
  power_kva: null,
  parking_ratio: null,
  civil_defense_approved: null,
  ad_permit_no: null,
  ad_permit_number: null,
  ad_permit_expires_at: null,
  right_to_market_confirmed: false,
  ownership_verified: null,
  authorization_verified: null,
  verified_at: null,
  verified_by: null,
  verification_method: null,
  lister_type: "owner_direct",
  is_demo: null,
};

function baseProps(overrides: Partial<Parameters<typeof DraftPreview>[0]> = {}) {
  const en = buildListingPresentation(INPUT, "en");
  const ar = buildListingPresentation(INPUT, "ar");
  const items = evidenceMission({ assetType: "office", photoInventory: "empty", attributes: {} });
  return {
    status: "draft",
    en,
    ar,
    listing: LISTING,
    account: null,
    photos: [] as string[],
    mediaState: "ok" as const,
    unloadedPhotoCount: 0,
    evidenceItems: items,
    evidence: { en: {}, ar: {} },
    initialLocale: "en" as const,
    dict: { en: getDictionary("en"), ar: getDictionary("ar") },
    ...overrides,
  };
}

function render(overrides: Partial<Parameters<typeof DraftPreview>[0]> = {}): string {
  return renderToStaticMarkup(<DraftPreview {...baseProps(overrides)} />);
}

test("render: a media query failure shows the temporary-fault warning, in both languages", () => {
  const en = render({ mediaState: "query_failed" });
  assert.match(en, /could not be read just now/);
  assert.equal(en.split("could not be read just now").length - 1, 1, "warning duplicated");
  const ar = render({ mediaState: "query_failed", initialLocale: "ar" });
  assert.match(ar, /تعذّرت قراءة الوسائط/);
});

test("render: a query failure is not shown when the media state is ok", () => {
  const html = render({ mediaState: "ok" });
  assert.doesNotMatch(html, /could not be read just now/);
  assert.doesNotMatch(html, /تعذّرت قراءة الوسائط/);
});

test("render: unloaded photos are disclosed by count, in both languages", () => {
  const en = render({ unloadedPhotoCount: 2 });
  assert.match(en, /2 uploaded photo\(s\) could not be loaded/);
  const ar = render({ unloadedPhotoCount: 2, initialLocale: "ar" });
  assert.match(ar, /2 صورة مرفوعة تعذّر تحميلها/);
});

test("render: zero unloaded photos shows no warning", () => {
  const html = render({ unloadedPhotoCount: 0 });
  assert.doesNotMatch(html, /could not be loaded/);
});

test("render: with no uploaded photos, the hero falls back to a visibly labelled placeholder", () => {
  const html = render({ photos: [] });
  assert.match(html, /Placeholder image, not an uploaded photo/);
});

test("render: with an uploaded photo, no placeholder label appears", () => {
  const html = render({ photos: ["https://example.test/photo.jpg"] });
  assert.doesNotMatch(html, /Placeholder image, not an uploaded photo/);
});

test("render: a real Evidence Passport, built the same way the public page builds one, actually renders in the facts grid", () => {
  // Real machinery, not a hand-rolled fixture: listingEvidenceByField is the
  // exact function preview/page.tsx calls (see listingPreviewWiring.test.ts),
  // so this proves the wiring produces visible output, not just that the
  // prop was threaded through.
  const enMap = Object.fromEntries(listingEvidenceByField(LISTING, { locale: "en", account: null, geography: "Al Olaya, Riyadh" }));
  assert.ok(enMap.area_sqm, "test fixture assumption: the office listing fixture produces an area_sqm passport");
  const withEvidence = render({ evidence: { en: enMap, ar: {} } });
  assert.match(withEvidence, /<details/, "an Evidence Passport disclosure should render when evidence is supplied");
  const withoutEvidence = render({ evidence: { en: {}, ar: {} } });
  assert.doesNotMatch(withoutEvidence, /<details/, "no passport should render when no evidence is supplied");
});

test("regression (e): evidence and its geography follow the active locale, both directions", () => {
  // Codex review of 8b9f72d item 5. Two real, distinct passport maps (built
  // the same way preview/page.tsx now builds one per locale), each carrying
  // a geography string only that locale's map could produce. Rendering with
  // each as the initial locale proves the selection is genuinely keyed by
  // the active locale, not a single map built once and reused regardless.
  const enGeography = "Al Olaya, Riyadh";
  const arGeography = "حي العليا، الرياض";
  const evidence = {
    en: Object.fromEntries(listingEvidenceByField(LISTING, { locale: "en", account: null, geography: enGeography })),
    ar: Object.fromEntries(listingEvidenceByField(LISTING, { locale: "ar", account: null, geography: arGeography })),
  };
  const enRender = render({ evidence, initialLocale: "en" });
  assert.match(enRender, new RegExp(enGeography));
  assert.doesNotMatch(enRender, new RegExp(arGeography));

  const arRender = render({ evidence, initialLocale: "ar" });
  assert.match(arRender, new RegExp(arGeography));
  assert.doesNotMatch(arRender, new RegExp(enGeography));
});

test("regression (g) / item 6: a real Evidence Passport renders on the terms section's service-charge row when the evidence map carries one", () => {
  // Resolves the "exact preview" contradiction by actually completing
  // parity rather than disclaiming it: the terms section now attaches
  // evidence exactly like the public page's own terms section does.
  const leaseWithServiceCharge: DraftListingInput = { ...INPUT, service_charge_sqm: 120 };
  const enPresentation = buildListingPresentation(leaseWithServiceCharge, "en");
  assert.ok(
    enPresentation.termsRows.some((r) => r.evidenceKey === "service_charge_sqm"),
    "test fixture assumption: a lease with a stated service charge produces a terms row carrying the evidenceKey",
  );
  const enMap = Object.fromEntries(
    listingEvidenceByField({ ...LISTING, service_charge_sqm: 120 }, { locale: "en", account: null, geography: null }),
  );
  assert.ok(enMap.service_charge_sqm, "test fixture assumption: a lease with a stated service charge produces a service_charge_sqm passport");
  const withEvidence = render({
    en: enPresentation,
    ar: buildListingPresentation(leaseWithServiceCharge, "ar"),
    evidence: { en: enMap, ar: {} },
  });
  // At least two passports now: the facts-grid one (area_sqm, asserted by
  // the earlier test) and this one on the terms section.
  const passportCount = (withEvidence.match(/<details/g) ?? []).length;
  assert.ok(passportCount >= 2, `expected at least 2 Evidence Passports (facts grid + terms), got ${passportCount}`);
});

test("regression (b) / item 2: Arabic origin and review render as two independent facts, together, never one hiding the other", () => {
  const html = render({ initialLocale: "ar" });
  // With no arabicOrigin opt (a fresh, session-less build, exactly what
  // preview/page.tsx now always passes), origin reads origin_unknown and
  // review reads unreviewed. Both labels must appear together.
  assert.match(html, new RegExp(arabicOriginLabel("origin_unknown", true)));
  assert.match(html, new RegExp(arabicReviewLabel("unreviewed", true)));
});

test("item 2: no origin or review badge renders at all when there is no Arabic wording to have one", () => {
  const noArabic: DraftListingInput = { ...INPUT, title_ar: null, description_ar: null };
  const html = render({ en: buildListingPresentation(noArabic, "en"), ar: buildListingPresentation(noArabic, "ar"), initialLocale: "ar" });
  for (const origin of ["lister_supplied", "ai_suggested", "origin_unknown"] as const) {
    assert.doesNotMatch(html, new RegExp(arabicOriginLabel(origin, true)));
  }
});
