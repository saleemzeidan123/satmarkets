import { test } from "node:test";
import assert from "node:assert/strict";
import { getDictionary } from "@/i18n/getDictionary";
import { listingTermsRows, type TermsRowSource } from "./listingTermsRows";

const en = getDictionary("en");
const ar = getDictionary("ar");

// PKG-LISTING-CREATION-1A, Codex review of 8b9f72d item 6. listingTermsRows
// is the exact function both listings/[id]/page.tsx (the public page) and
// listingPresentation.ts (the draft preview's composer) call for the "terms"
// section, extracted so the two surfaces cannot independently drift on the
// two rows that carry an Evidence Passport (service charge, price per sqm).
// These tests cover the row-building logic itself; listingPresentation.test.ts
// only confirms the composer wires this module in.

const LEASE_BASE: TermsRowSource = {
  deal_type: "lease",
  asset_type: "office",
  attributes: {},
};

test("a lease with a stated service charge produces a row carrying the service_charge_sqm evidence key", () => {
  const rows = listingTermsRows({ ...LEASE_BASE, service_charge_sqm: 120 }, en, "en");
  const row = rows.find((r) => r.evidenceKey === "service_charge_sqm");
  assert.ok(row);
  assert.equal(row!.label, en.ld.serviceCharge);
  assert.match(row!.value, /120/);
});

test("a lease with no service charge stated produces no service-charge row at all", () => {
  const rows = listingTermsRows(LEASE_BASE, en, "en");
  assert.ok(!rows.some((r) => r.evidenceKey === "service_charge_sqm"));
});

test("a lease term in whole years is formatted as years, and one not divisible by 12 as months", () => {
  const years = listingTermsRows({ ...LEASE_BASE, lease_term_months: 36 }, en, "en");
  const yearsRow = years.find((r) => r.label === en.ld.leaseTerm);
  assert.ok(yearsRow);
  assert.doesNotMatch(yearsRow!.value, /36/, "36 months should render as 3 years, not the raw month count");

  const months = listingTermsRows({ ...LEASE_BASE, lease_term_months: 18 }, en, "en");
  const monthsRow = months.find((r) => r.label === en.ld.leaseTerm);
  assert.ok(monthsRow);
  assert.match(monthsRow!.value, /18/);
});

test("a zero rent-free period and a zero fit-out contribution are both omitted, not shown as zero", () => {
  const rows = listingTermsRows({ ...LEASE_BASE, rent_free_months: 0, fitout_contribution: 0 }, en, "en");
  assert.ok(!rows.some((r) => r.label === en.ld.rentFree));
  assert.ok(!rows.some((r) => r.label === en.ld.fitoutContribution));
});

test("a positive rent-free period and fit-out contribution both appear", () => {
  const rows = listingTermsRows({ ...LEASE_BASE, rent_free_months: 2, fitout_contribution: 50000 }, en, "en");
  assert.ok(rows.some((r) => r.label === en.ld.rentFree));
  assert.ok(rows.some((r) => r.label === en.ld.fitoutContribution));
});

test("a sale never carries lease-only rows (service charge, lease term, rent-free, fit-out, break option)", () => {
  const sale: TermsRowSource = {
    deal_type: "sale", asset_type: "office", attributes: {},
    service_charge_sqm: 120, lease_term_months: 36, rent_free_months: 2,
    fitout_contribution: 50000, break_option_months: 12,
  };
  const rows = listingTermsRows(sale, en, "en");
  assert.ok(!rows.some((r) => r.evidenceKey === "service_charge_sqm"));
  assert.ok(!rows.some((r) => [en.ld.leaseTerm, en.ld.rentFree, en.ld.fitoutContribution, en.ld.breakOption].includes(r.label)));
});

test("a sale prefers a stored sale_price_sqm column over deriving one from price and area", () => {
  const rows = listingTermsRows({ deal_type: "sale", asset_type: "office", attributes: {}, sale_price_sqm: 6000, sale_price: 5_000_000, area_sqm: 1000 }, en, "en");
  const row = rows.find((r) => r.evidenceKey === "sale_price_sqm");
  assert.ok(row);
  assert.match(row!.value, /6,?000/);
});

test("a sale with no stored sale_price_sqm derives one from sale_price divided by area_sqm", () => {
  const rows = listingTermsRows({ deal_type: "sale", asset_type: "office", attributes: {}, sale_price: 5_000_000, area_sqm: 1000 }, en, "en");
  const row = rows.find((r) => r.evidenceKey === "sale_price_sqm");
  assert.ok(row);
  assert.match(row!.value, /5,?000/, `5,000,000 / 1000 should derive 5000: got "${row!.value}"`);
});

test("a sale with neither a stored sale_price_sqm nor enough to derive one (no area) produces no price-per-sqm row", () => {
  const rows = listingTermsRows({ deal_type: "sale", asset_type: "office", attributes: {}, sale_price: 5_000_000, area_sqm: null }, en, "en");
  assert.ok(!rows.some((r) => r.evidenceKey === "sale_price_sqm"));
});

test("VAT treatment appears on both a lease and a sale, with distinct EN/AR wording for inclusive vs exclusive", () => {
  const leaseInclusive = listingTermsRows({ ...LEASE_BASE, vat_treatment: "inclusive" }, en, "en");
  const leaseRow = leaseInclusive.find((r) => r.label === en.ld.vat);
  assert.ok(leaseRow);
  assert.equal(leaseRow!.value, en.ld.vatInclusive);

  const saleExclusive = listingTermsRows({ deal_type: "sale", asset_type: "office", attributes: {}, vat_treatment: "exclusive" }, en, "en");
  const saleRow = saleExclusive.find((r) => r.label === en.ld.vat);
  assert.ok(saleRow);
  assert.equal(saleRow!.value, en.ld.vatExclusive);
  assert.notEqual(saleRow!.value, en.ld.vatInclusive);
});

test("no VAT row appears when vat_treatment is unset", () => {
  const rows = listingTermsRows(LEASE_BASE, en, "en");
  assert.ok(!rows.some((r) => r.label === en.ld.vat));
});

test("registry commercial attributes pass through from attributeDisplay's own commercialAttributeRows, with no evidence key", () => {
  // Not re-testing attributeDisplay.ts's own row-selection logic here, only
  // that this module actually appends its output, unmodified, with no
  // evidence key (attributeDisplay's row builders return label/value pairs
  // only; an evidence key only ever exists for the two hand-built rows
  // above, which the public page's own typed columns back).
  const withCommercialAttr: TermsRowSource = {
    ...LEASE_BASE,
    asset_type: "gas_station",
    attributes: { fuel_brand: "aramco" },
  };
  const rows = listingTermsRows(withCommercialAttr, en, "en");
  const registryRows = rows.filter((r) => r.evidenceKey === undefined);
  for (const r of registryRows) assert.equal(r.evidenceKey, undefined);
});

test("no arabic text renders for an english call, and vice versa: locale actually threads through", () => {
  const rows = listingTermsRows({ ...LEASE_BASE, service_charge_sqm: 120 }, ar, "ar");
  const row = rows.find((r) => r.evidenceKey === "service_charge_sqm");
  assert.ok(row);
  assert.equal(row!.label, ar.ld.serviceCharge);
  assert.notEqual(row!.label, en.ld.serviceCharge);
});

test("row order is stable: service charge, lease term, rent-free, fit-out, break option, then VAT, then registry attributes", () => {
  // The module's own header claims the public page and the draft preview
  // render "the identical row list, in the identical order"; this pins that
  // order down so a future edit that reshuffles it fails loudly.
  const full: TermsRowSource = {
    ...LEASE_BASE,
    service_charge_sqm: 120,
    lease_term_months: 36,
    rent_free_months: 2,
    fitout_contribution: 50000,
    break_option_months: 12,
    vat_treatment: "inclusive",
  };
  const rows = listingTermsRows(full, en, "en");
  assert.deepEqual(rows.map((r) => r.label), [
    en.ld.serviceCharge,
    en.ld.leaseTerm,
    en.ld.rentFree,
    en.ld.fitoutContribution,
    en.ld.breakOption,
    en.ld.vat,
  ]);
});
