import { formatCounted, formatMoney, formatWithUnit, type Loc } from "./format";
import { commercialAttributeRows } from "./attributeDisplay";
import type { Dictionary } from "@/i18n/getDictionary";

// PKG-LISTING-CREATION-1A, Codex review of 8b9f72d item 6. Extracted,
// unchanged, from listings/[id]/page.tsx's own inline "terms" row builder,
// the same reason listingFactsGrid.ts exists for the facts grid: the public
// page and the draft preview must render the identical row list, in the
// identical order, with the identical two rows (service charge on a lease,
// price per square metre on a sale) carrying an Evidence Passport, or the
// two surfaces can silently drift on exactly the figures a reader is most
// likely to check. Before this extraction, the draft preview's "terms"
// section only ever showed the registry-driven commercial attributes
// (commercialAttributeRows below), never these hand-built, evidence-bearing
// rows, which is why it could not honestly call itself an exact match for
// the public page while these were missing.

export interface TermsRowSource {
  deal_type?: string | null;
  service_charge_sqm?: number | string | null;
  lease_term_months?: number | string | null;
  rent_free_months?: number | string | null;
  fitout_contribution?: number | string | null;
  break_option_months?: number | string | null;
  sale_price_sqm?: number | string | null;
  sale_price?: number | string | null;
  area_sqm?: number | string | null;
  vat_treatment?: string | null;
  asset_type: string;
  attributes?: Record<string, unknown> | null;
}

export interface TermsRow {
  label: string;
  value: string;
  /** Present only for the two rows the public page also gives an Evidence Passport. */
  evidenceKey?: string;
}

export function listingTermsRows(l: TermsRowSource, dict: Dictionary, lp: Loc): TermsRow[] {
  const T = dict.ld;
  const lease = String(l.deal_type ?? "").toLowerCase() !== "sale";
  const termFmt = (m: number) => (m % 12 === 0 ? formatCounted(m / 12, "year", lp) : formatCounted(m, "month", lp));
  const vatFmt = (v: string) => (v === "inclusive" ? T.vatInclusive : T.vatExclusive);
  const rows: TermsRow[] = [];
  if (lease) {
    if (l.service_charge_sqm != null) {
      rows.push({ label: T.serviceCharge, value: formatWithUnit(Number(l.service_charge_sqm), "sar_sqm_year", lp, "short", 0), evidenceKey: "service_charge_sqm" });
    }
    if (l.lease_term_months != null) rows.push({ label: T.leaseTerm, value: termFmt(Number(l.lease_term_months)) });
    if (l.rent_free_months != null && Number(l.rent_free_months) > 0) {
      rows.push({ label: T.rentFree, value: formatCounted(Number(l.rent_free_months), "month", lp) });
    }
    if (l.fitout_contribution != null && Number(l.fitout_contribution) > 0) {
      rows.push({ label: T.fitoutContribution, value: formatMoney(Number(l.fitout_contribution), lp) });
    }
    if (l.break_option_months != null) rows.push({ label: T.breakOption, value: formatCounted(Number(l.break_option_months), "month", lp) });
  } else {
    // Price per m2 is COMPUTED (price / area), never entered, so a lister
    // can never post one that contradicts their own price. Prefer a stored
    // column if present, else derive it.
    const pps = l.sale_price_sqm != null
      ? Number(l.sale_price_sqm)
      : (l.sale_price != null && l.area_sqm ? Number(l.sale_price) / Number(l.area_sqm) : null);
    if (pps != null && Number.isFinite(pps)) {
      rows.push({ label: T.pricePerSqm, value: formatWithUnit(Math.round(pps), "sar_sqm", lp, "short", 0), evidenceKey: "sale_price_sqm" });
    }
  }
  if (l.vat_treatment) rows.push({ label: T.vat, value: vatFmt(l.vat_treatment) });
  // Registry commercial attributes with no typed column (price basis, deal
  // scope, turnover rent, and so on for the newer asset types). Never carry
  // an evidence key: attributeDisplay's row builders return [label, value]
  // pairs only.
  rows.push(...commercialAttributeRows(l.asset_type, l.attributes ?? null, lp === "ar").map(([label, value]) => ({ label, value })));
  return rows;
}
