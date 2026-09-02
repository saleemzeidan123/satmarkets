import { formatArea, formatMoney, formatNumber, formatWithUnit, fill, type Loc } from "@/lib/format";
import { gradeLabel, fitoutLabel } from "@/lib/labels";
import type { Dictionary } from "@/i18n/getDictionary";

// PKG-LISTING-CREATION-1A. The at-a-glance facts grid tile list, extracted
// unchanged from listings/[id]/page.tsx's own inline builder.
//
// This is not a generic sweep of every registry field marked "always show".
// The public page names a small, specific set of headline typed columns
// (area, grade, fit-out, clear height, dock count, power, parking ratio,
// civil defense, price), and a generic sweep would drift from that set the
// first time a new asset type added an unrelated "always" field to its own
// registry entry (32 fields carry show_rule: "always" across the whole
// registry today, most of them type-specific and none of the rest promoted
// to this grid). The tile list stays exactly this page's own named choice;
// this file only stops it from being typed out a second time.

export interface FactsGridSource {
  area_sqm: unknown;
  building_grade?: string | null;
  fitout_condition?: string | null;
  clear_height_m?: unknown;
  loading_docks?: unknown;
  power_kva?: unknown;
  parking_ratio?: unknown;
  civil_defense_approved?: unknown;
  deal_type?: string | null;
  price: unknown;
}

export type FactsGridTile = { label: string; value: string; evidenceKey?: string };

export function factsGridTiles(l: FactsGridSource, dict: Dictionary, lp: Loc): FactsGridTile[] {
  const T = dict.ld;
  const lease = String(l.deal_type ?? "").toLowerCase() !== "sale";
  const raw: (FactsGridTile | null)[] = [
    // formatArea's signature is number, not number | null, matching the original
    // inline call site's own behaviour (l was untyped there too): the cast
    // preserves that permissiveness rather than silently widening formatArea's
    // own contract, which is a shared, tested module out of this package's scope.
    { label: T.area, value: formatArea(l.area_sqm as number, lp), evidenceKey: "area_sqm" },
    l.building_grade && l.building_grade !== "n_a" ? { label: T.grade, value: gradeLabel(l.building_grade, lp) } : null,
    l.fitout_condition && l.fitout_condition !== "n_a" ? { label: T.fitout, value: fitoutLabel(l.fitout_condition, lp) } : null,
    l.clear_height_m != null ? { label: T.clearHeight, value: formatWithUnit(Number(l.clear_height_m), "metre", lp, "long", 2) } : null,
    l.loading_docks != null ? { label: T.loadingDocks, value: formatNumber(Number(l.loading_docks), lp) } : null,
    l.power_kva != null ? { label: T.power, value: formatWithUnit(Number(l.power_kva), "kva", lp, "long", 0) } : null,
    l.parking_ratio != null ? { label: T.parking, value: fill(T.parkingRatio, { area: formatArea(Number(l.parking_ratio), lp) }) } : null,
    l.civil_defense_approved ? { label: T.civilDefense, value: T.approved } : null,
    {
      label: lease ? T.asking : T.price,
      value: l.price != null
        ? (lease ? formatWithUnit(Number(l.price), "sar_sqm_year", lp, "short", 0) : formatMoney(Number(l.price), lp))
        : T.onRequest,
      evidenceKey: lease ? "asking_rent_sqm" : "sale_price",
    },
  ];
  return raw.filter((t): t is FactsGridTile => t !== null);
}
