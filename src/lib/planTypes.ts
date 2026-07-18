// CRE floor-plan taxonomy. A kind='floorplan' media row carries a plan_type so a
// land plot's cadastral survey never renders as a "Floor plan". Five types cover
// the vast majority of Saudi listings; rarer variants (mezzanine, typical floor,
// unit mix, kitchen) ride the free-text caption (alt_en/alt_ar), not a bloated
// enum. Data, not logic: this mirrors the field-registry house style. No DB enum.
//
// Terminology note: `survey` is كروكي (the surveyor's plat), NOT صك. صك is the
// title DEED, a legal document for the private verification-documents flow, never
// a plan label.

export type PlanType = "unit" | "floor" | "site" | "survey" | "masterplan";

export const PLAN_TYPES: PlanType[] = ["unit", "floor", "site", "survey", "masterplan"];

const LABELS: Record<PlanType, [string, string]> = {
  unit: ["Unit / suite plan", "مخطط الوحدة"],
  floor: ["Floor plan", "مخطط الطابق"],
  site: ["Site plan", "مخطط الموقع"],
  survey: ["Cadastral survey (Kroki)", "كروكي مساحي"],
  masterplan: ["Masterplan", "المخطط العام"],
};

export function isPlanType(v: unknown): v is PlanType {
  return typeof v === "string" && (PLAN_TYPES as string[]).includes(v);
}

// A null/unknown plan_type reads as a generic Floor plan, so legacy rows are safe.
export function planLabel(type: string | null | undefined, ar: boolean): string {
  const t = isPlanType(type) ? type : "floor";
  const l = LABELS[t];
  return ar ? l[1] : l[0];
}

// asset -> { def (auto-selected at intake), allowed[] (the dropdown options) }.
const MATRIX: Record<string, { def: PlanType; allowed: PlanType[] }> = {
  office: { def: "unit", allowed: ["unit", "floor"] },
  serviced: { def: "unit", allowed: ["unit", "floor"] },
  retail: { def: "unit", allowed: ["unit", "floor", "site"] },
  showroom: { def: "unit", allowed: ["unit", "floor", "site"] },
  medical: { def: "unit", allowed: ["unit", "floor"] },
  warehouse: { def: "site", allowed: ["site", "floor"] },
  self_storage: { def: "site", allowed: ["site", "floor"] },
  education: { def: "site", allowed: ["site", "floor", "masterplan"] },
  hospitality: { def: "site", allowed: ["site", "floor", "masterplan"] },
  land: { def: "survey", allowed: ["survey", "site", "masterplan"] },
  mixed_use: { def: "masterplan", allowed: ["masterplan", "site", "floor", "unit"] },
  gas_station: { def: "site", allowed: ["site", "survey"] },
  wedding_hall: { def: "floor", allowed: ["floor", "site"] },
  worker_housing: { def: "site", allowed: ["site", "floor", "masterplan"] },
  entertainment: { def: "site", allowed: ["site", "floor", "masterplan"] },
};

const FALLBACK = { def: "floor" as PlanType, allowed: PLAN_TYPES };

export function planTypesFor(assetType: string): { def: PlanType; allowed: PlanType[] } {
  return MATRIX[assetType] ?? FALLBACK;
}

export function defaultPlanType(assetType: string): PlanType {
  return planTypesFor(assetType).def;
}
