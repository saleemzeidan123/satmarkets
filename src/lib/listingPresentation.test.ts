import { test } from "node:test";
import assert from "node:assert/strict";
import { fieldsFor } from "./assetFields";
import { buildListingPresentation, PRESENTATION_MODEL_VERSION, type DraftListingInput } from "./listingPresentation";

const BASE: DraftListingInput = {
  asset_type: "office",
  deal_type: "lease",
  area_sqm: 300,
  price: 1600,
  title_en: "Grade A floor, Al Olaya",
  title_ar: "طابق فئة أ، العليا",
  description_en: "A fitted floor with river views.",
  description_ar: null,
  building_grade: "a",
  fitout_condition: "fitted",
  attributes: { building_grade: "a", floor_level: 4, fitout_condition: "fitted" },
  contact_phone: "0500000000",
  contact_email: null,
  contact_channels: ["whatsapp"],
  video_url: null,
  district: { name_en: "Al Olaya", name_ar: "العليا", city: "riyadh" },
  reference_code: "SATM-TEST0001",
  is_demo: true,
};

test("the model carries a version, so a future change to its shape is traceable", () => {
  const p = buildListingPresentation(BASE, "en");
  assert.equal(p.modelVersion, PRESENTATION_MODEL_VERSION);
  assert.equal(typeof p.modelVersion, "number");
});

test("title and place use the real listingTitle/listingPlace ladder, never a bespoke re-derivation", () => {
  const en = buildListingPresentation(BASE, "en");
  assert.equal(en.title, "Grade A floor, Al Olaya");
  assert.equal(en.place, "Al Olaya");
  const ar = buildListingPresentation(BASE, "ar");
  assert.equal(ar.title, "طابق فئة أ، العليا");
  assert.equal(ar.place, "العليا");
});

test("a listing with no title in one language falls back through the same ladder listingTitle uses, not a blank", () => {
  const noArTitle: DraftListingInput = { ...BASE, title_ar: null };
  const ar = buildListingPresentation(noArTitle, "ar");
  assert.ok(ar.title.length > 0, "an untitled Arabic side must still fall back to a description, never render empty");
  assert.notEqual(ar.title, BASE.title_en, "the English title must never leak onto the Arabic side");
});

test("figures come from listingFigures.ts: a lease price carries the per-sqm-per-year unit", () => {
  const p = buildListingPresentation(BASE, "en");
  assert.ok(p.figures.priceText?.includes("1,600") || p.figures.priceText?.includes("1600"));
  assert.equal(p.figures.lease, true);
  assert.ok(p.figures.annualTotalText, "a lease with both rate and area must produce an annual total");
});

test("a sale listing never carries an annual total, since one price is not a rate", () => {
  const sale: DraftListingInput = { ...BASE, deal_type: "sale", price: 5_000_000 };
  const p = buildListingPresentation(sale, "en");
  assert.equal(p.figures.annualTotalText, null);
  assert.equal(p.figures.lease, false);
});

test("an unstated price draws no figure at all, never a zero or a placeholder", () => {
  const noPrice: DraftListingInput = { ...BASE, price: null };
  const p = buildListingPresentation(noPrice, "en");
  assert.equal(p.figures.priceText, null);
});

test("a demo record, unverified in every column, resolves every verification dimension to not_verified, never verified", () => {
  const p = buildListingPresentation(BASE, "en");
  assert.ok(p.verification.length > 0);
  for (const d of p.verification) {
    assert.notEqual(d.state, "verified", `${d.dimension} read verified on an is_demo=true draft with no check recorded`);
  }
  assert.equal(p.verifiedBadgeTexts.length, 0, "a demo draft must show zero verified badges");
});

test("a draft with a genuine, dated, actor-attributed check resolves that one dimension to verified", () => {
  const checked: DraftListingInput = {
    ...BASE,
    is_demo: false,
    ownership_verified: true,
    verification_method: "manual_review",
    verified_at: "2026-08-01",
    verified_by: "reviewer-1",
    lister_type: "owner_direct",
  };
  const p = buildListingPresentation(checked, "en");
  const ownership = p.verification.find((d) => d.dimension === "ownership");
  assert.equal(ownership?.state, "verified");
});

test("space and compliance rows are drawn from the real per-asset registry, each carrying a provenance tag", () => {
  const p = buildListingPresentation(BASE, "en");
  assert.ok(p.spaceRows.length > 0, "office attributes with real values must produce space rows");
  for (const row of [...p.spaceRows, ...p.complianceRows]) {
    assert.ok(row.label.length > 0);
    assert.ok(row.value.length > 0);
    assert.ok(
      ["lister_supplied", "platform_derived", "sat_verified", "not_confirmed"].includes(row.provenance),
      `row "${row.label}" carries an unrecognised provenance category: ${row.provenance}`,
    );
  }
});

test("termsRows is listingTermsRows.ts's own output, wired through unmodified, evidence keys included", () => {
  // Codex review of 8b9f72d item 6: this composer no longer computes its own
  // registry-only commercialRows; it calls the exact function the public
  // page also calls (listingTermsRows.ts), so the two surfaces cannot drift.
  // The row-building logic itself (lease vs sale branching, price-per-sqm
  // derivation, VAT wording) is listingTermsRows.test.ts's concern; this
  // test only confirms the composer actually wires it in.
  const withServiceCharge: DraftListingInput = { ...BASE, service_charge_sqm: 120 };
  const p = buildListingPresentation(withServiceCharge, "en");
  const row = p.termsRows.find((r) => r.evidenceKey === "service_charge_sqm");
  assert.ok(row, "a lease listing with a stated service charge should produce a service_charge_sqm terms row");
  assert.ok(row!.label.length > 0 && row!.value.length > 0);

  const sale: DraftListingInput = { ...BASE, deal_type: "sale", price: 5_000_000, area_sqm: 1000, sale_price_sqm: null };
  const salePresentation = buildListingPresentation(sale, "en");
  const priceRow = salePresentation.termsRows.find((r) => r.evidenceKey === "sale_price_sqm");
  assert.ok(priceRow, "a sale listing with a price and an area should derive a price-per-sqm terms row even with no stored sale_price_sqm column");
});

test("every space row's field is genuinely entered provenance, not verified or computed, on a freshly drafted listing", () => {
  const p = buildListingPresentation(BASE, "en");
  const floorLevel = p.spaceRows.find((r) => r.label === fieldsFor("office").find((f) => f.key === "floor_level")!.label_en);
  assert.ok(floorLevel, "floor_level should appear as a space row given it is answered in BASE.attributes");
  assert.equal(floorLevel!.provenance, "lister_supplied");
});

test("Arabic wording has no origin evidence by default: origin_unknown when present, null when absent", () => {
  // Corrected across two Codex review rounds: neither an unproven
  // ai_suggested default (round one, 922780d) nor an inference from
  // listing-level ar_translation_status/ar_translated_at (round two,
  // 8b9f72d item 1) is a real claim this composer can make with nothing
  // session-observed to back it.
  const p = buildListingPresentation(BASE, "ar");
  assert.equal(p.arabicWording.title.origin, "origin_unknown");
  assert.equal(p.arabicWording.title.review, "unreviewed");
  assert.equal(p.arabicWording.description.origin, null, "description_ar is null in the fixture: a category error, not an unknown origin");
});

test("a session-observed, unedited translate output reads ai_suggested", () => {
  const p = buildListingPresentation(BASE, "ar", {
    arabicOrigin: { title: { translatedThisSessionUnedited: true } },
  });
  assert.equal(p.arabicWording.title.origin, "ai_suggested");
});

test("regression (b): review sets reviewed_this_session and never rewrites origin, whatever the origin already was", () => {
  const unknownOrigin = buildListingPresentation(BASE, "ar", { arabicReviewed: { title: true } });
  assert.equal(unknownOrigin.arabicWording.title.origin, "origin_unknown");
  assert.equal(unknownOrigin.arabicWording.title.review, "reviewed_this_session");

  const editedOrigin = buildListingPresentation(BASE, "ar", {
    arabicOrigin: { title: { editedThisSession: true } },
    arabicReviewed: { title: true },
  });
  assert.equal(editedOrigin.arabicWording.title.origin, "lister_supplied", "review must not disturb a real lister_supplied origin");
  assert.equal(editedOrigin.arabicWording.title.review, "reviewed_this_session");
});

test("a session-observed direct edit is the only path to a real lister_supplied origin", () => {
  const p = buildListingPresentation(BASE, "ar", {
    arabicOrigin: { title: { editedThisSession: true } },
  });
  assert.equal(p.arabicWording.title.origin, "lister_supplied");
});

test("regression (a): an omitted arabicOrigin opt (the fresh-session/reload case) reads origin_unknown, never ai_suggested", () => {
  // DraftListingInput carries no ar_translation_status / ar_translated_at
  // field at all any more, so there is nothing left for this composer to
  // misread on a fresh load; omitting the opt is exactly what every
  // standalone preview page load does (see preview/page.tsx), and it must
  // never default toward ai_suggested.
  const p = buildListingPresentation(BASE, "ar");
  assert.equal(p.arabicWording.title.origin, "origin_unknown");
});

test("the English side of Arabic wording is judged on the English field itself: lister_supplied when present, null when absent, review never applies", () => {
  const p = buildListingPresentation(BASE, "en", { arabicReviewed: { title: true } });
  assert.equal(p.arabicWording.title.origin, "lister_supplied", "present English text is lister_supplied regardless of the Arabic review flag, since nothing writes title_en except the save endpoints, from the request body");
  assert.equal(p.arabicWording.title.review, "unreviewed", "review is an Arabic-side concept; the English branch never reads the Arabic review flag");
  const noEnTitle: DraftListingInput = { ...BASE, title_en: null };
  const p2 = buildListingPresentation(noEnTitle, "en");
  assert.equal(p2.arabicWording.title.origin, null);
});

test("contact, video and ad permit fields pass through unmodified, since they are not subject to any figure logic", () => {
  const p = buildListingPresentation(BASE, "en");
  assert.equal(p.contact.phone, "0500000000");
  assert.deepEqual(p.contact.channels, ["whatsapp"]);
  assert.equal(p.adPermit.rightToMarketConfirmed, false);
});

test("ad_permit_number is preferred over ad_permit_no when both are present, matching gate.ts's own coalescing rule", () => {
  const both: DraftListingInput = { ...BASE, ad_permit_number: "1234567890", ad_permit_no: "0000000000" };
  const p = buildListingPresentation(both, "en");
  assert.equal(p.adPermit.number, "1234567890");
});

test("city renders through cityLabel, localized, not as a raw database code", () => {
  const p = buildListingPresentation(BASE, "ar");
  assert.notEqual(p.city, "riyadh", "the raw column code must not leak into Arabic display");
});

test("descriptionText is empty-safe: an unset description reads null, never an empty string masquerading as content", () => {
  const noDesc: DraftListingInput = { ...BASE, description_en: "", description_ar: null };
  const p = buildListingPresentation(noDesc, "en");
  assert.equal(p.descriptionText, null);
});
