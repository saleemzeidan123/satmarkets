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

test("space, commercial and compliance rows are drawn from the real per-asset registry, each carrying a provenance tag", () => {
  const p = buildListingPresentation(BASE, "en");
  assert.ok(p.spaceRows.length > 0, "office attributes with real values must produce space rows");
  for (const row of [...p.spaceRows, ...p.commercialRows, ...p.complianceRows]) {
    assert.ok(row.label.length > 0);
    assert.ok(row.value.length > 0);
    assert.ok(
      ["lister_supplied", "platform_retrieved", "sat_verified", "ai_suggested", "not_confirmed"].includes(row.provenance),
      `row "${row.label}" carries an unrecognised provenance category: ${row.provenance}`,
    );
  }
});

test("every space row's field is genuinely entered provenance, not verified or computed, on a freshly drafted listing", () => {
  const p = buildListingPresentation(BASE, "en");
  const floorLevel = p.spaceRows.find((r) => r.label === fieldsFor("office").find((f) => f.key === "floor_level")!.label_en);
  assert.ok(floorLevel, "floor_level should appear as a space row given it is answered in BASE.attributes");
  assert.equal(floorLevel!.provenance, "lister_supplied");
});

test("Arabic wording with no session confirmation reads ai_suggested when present, and not_confirmed when absent", () => {
  const p = buildListingPresentation(BASE, "ar");
  assert.equal(p.arabicWording.title.provenance, "ai_suggested");
  assert.equal(p.arabicWording.description.provenance, "not_confirmed", "description_ar is null in the fixture");
});

test("an explicit session confirmation promotes Arabic wording provenance to lister_supplied", () => {
  const p = buildListingPresentation(BASE, "ar", { arabicConfirmedThisSession: true });
  assert.equal(p.arabicWording.title.provenance, "lister_supplied");
});

test("the English side of Arabic wording provenance is judged on the English field itself, not the Arabic confirmation flag", () => {
  const p = buildListingPresentation(BASE, "en", { arabicConfirmedThisSession: true });
  assert.equal(p.arabicWording.title.provenance, "lister_supplied", "English title is lister-typed English, not AI output");
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
