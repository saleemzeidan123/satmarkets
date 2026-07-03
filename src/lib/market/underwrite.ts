// src/lib/market/underwrite.ts
//
// Buy-side underwrite: implied yield from the Rent Index market rent against
// the asking sale price. Transparent math on verified inputs (index rent +
// listing price). Indicative, not advice. No invented benchmark yields.

import type { IndexRow } from "./verdict";

export interface Underwrite {
  status: "ok" | "na";
  salePriceSqm: number | null;
  marketRentSqm: number | null;
  grossYieldPct: number | null;
  netYieldPct: number | null;
  paybackYears: number | null;
  period: string | null;
  line_en: string;
  line_ar: string;
}

function num(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

export function underwrite(
  listing: {
    sale_price?: number | null;
    sale_price_sqm?: number | null;
    area_sqm?: number | null;
    service_charge_sqm?: number | null;
  },
  row: IndexRow | null,
  districtEn?: string | null,
  districtAr?: string | null,
): Underwrite {
  const area = listing.area_sqm != null ? Number(listing.area_sqm) : null;
  let salePriceSqm: number | null =
    listing.sale_price_sqm != null ? Number(listing.sale_price_sqm) : null;
  if (salePriceSqm == null && listing.sale_price != null && area) {
    salePriceSqm = Number(listing.sale_price) / area;
  }
  const marketRentSqm = row?.median != null ? Number(row.median) : null;

  if (!salePriceSqm || !marketRentSqm) {
    return {
      status: "na",
      salePriceSqm,
      marketRentSqm,
      grossYieldPct: null,
      netYieldPct: null,
      paybackYears: null,
      period: row?.period ?? null,
      line_en: "No buy-side yield estimate yet (needs a sale price and a market rent baseline).",
      line_ar: "لا يوجد تقدير للعائد الاستثماري بعد (يتطلب سعر بيع وأساس إيجار سوقي).",
    };
  }

  const gross = (marketRentSqm / salePriceSqm) * 100;
  const payback = salePriceSqm / marketRentSqm;
  const sc = listing.service_charge_sqm != null ? Number(listing.service_charge_sqm) : null;
  const netRent = sc != null ? marketRentSqm - sc : null;
  const netYield = netRent != null && netRent > 0 ? (netRent / salePriceSqm) * 100 : null;

  const g = gross.toFixed(1);
  const pb = payback.toFixed(payback < 10 ? 1 : 0);
  const dist = districtEn || row?.district_label || "";
  const distAr = districtAr || row?.district_label_ar || dist;
  const per = row?.period || "";
  const netEn = netYield != null ? ` (~${netYield.toFixed(1)}% net of service charge)` : "";
  const netAr = netYield != null ? ` (~${netYield.toFixed(1)}% صافٍ بعد رسوم الخدمات)` : "";

  return {
    status: "ok",
    salePriceSqm: Math.round(salePriceSqm),
    marketRentSqm,
    grossYieldPct: Number(g),
    netYieldPct: netYield != null ? Number(netYield.toFixed(1)) : null,
    paybackYears: Number(pb),
    period: per,
    line_en: `${num(salePriceSqm)} SAR/m² asking. At the ${per} market rent of ${num(marketRentSqm)} SAR/m² for ${dist}, implied gross yield ~${g}%${netEn}, about a ${pb}-year payback. Indicative, not advice.`,
    line_ar: `${num(salePriceSqm)} ريال/م² سعر الطلب. عند إيجار السوق لـ${per} البالغ ${num(marketRentSqm)} ريال/م² في ${distAr}، عائد إجمالي ضمني ~${g}%${netAr}، استرداد خلال ${pb} سنة تقريباً. مؤشر استرشادي وليس نصيحة.`,
  };
}
