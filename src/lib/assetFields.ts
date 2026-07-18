// The field registry: the single declarative source of truth for what each asset
// type captures and shows. It is DATA, not logic. Adding a field or a whole asset
// type is an edit here, never a schema migration or new component. Three surfaces
// read this one catalog: the intake form (renders exactly this asset's fields),
// the detail page (renders exactly the fields a listing has, in their sections,
// each with its provenance chip), and search (the small `filterable` subset kept
// as typed columns).
//
// Values live in a single `attributes jsonb` column on `listings`, keyed by
// `key`. A few fields map to an existing typed column (via `column`) because we
// filter or sort on them; the composer prefers the column when set.
//
// Every field declares its provenance tier (see ./provenance), making Law 3
// structural: the UI can never show a figure without saying where it came from.
// `available: false` fields are defined now but render "Not available yet" until
// their external source is wired (catchment, footfall), so the schema is complete
// and the UI degrades honestly. No em dashes anywhere (Law 2).
//
// This file ships the three Phase 1 families (office, warehouse, retail). The
// remaining asset types are added here as more registry entries, no new code.

import type { ProvenanceTier } from "./provenance";

export type FieldType =
  | "number" | "integer" | "boolean" | "enum" | "text" | "money" | "url" | "doc-ref" | "list";

// The seven fixed display sections, in render order. Identity, location, market,
// and suitability are composed by existing components; the registry mainly drives
// space, commercial, and compliance.
export type DisplaySection =
  | "identity" | "space" | "commercial" | "compliance" | "location" | "market" | "suitability";

export type ShowRule = "always" | "if-present" | "less-relevant" | "hidden";

export interface FieldValidation {
  min?: number;
  max?: number;
  enum?: string[];
  regex?: string;
}

export interface AssetField {
  key: string;            // stable id, also the attributes jsonb key
  label_en: string;
  label_ar: string;
  type: FieldType;
  unit?: string;          // m, kVA, m², months, %, SAR/m²
  section: DisplaySection;
  provenance: ProvenanceTier;  // the tier the field is born at; may be promoted over its life
  verifyDoc?: string;     // for entered fields, the document/authority that promotes it to Verified
  column?: string;        // existing typed column this maps to, if any (else lives in attributes)
  filterable?: boolean;   // exposed in search (kept as a typed, indexed column)
  required?: boolean;
  show_rule?: ShowRule;   // default "if-present"
  validation?: FieldValidation;
  options?: Record<string, [string, string]>; // enum value -> [label_en, label_ar] for display
  help_en?: string;
  help_ar?: string;
  available?: boolean;    // default true; false => renders "Not available yet" until source wired
}

export type AssetFieldRegistry = Record<string, AssetField[]>;

// Shared compliance field: Ejar registration applies to every leased asset.
const ejar: AssetField = {
  key: "ejar_registered", label_en: "Ejar registration", label_ar: "تسجيل إيجار",
  type: "boolean", section: "compliance", provenance: "entered", verifyDoc: "Ejar contract",
  help_en: "Whether the lease is registered on Ejar.", help_ar: "هل العقد مسجّل في إيجار.",
};

export const ASSET_FIELDS: AssetFieldRegistry = {
  // ---- Family D: Workspace ----
  office: [
    // The space
    { key: "building_grade", label_en: "Grade", label_ar: "التصنيف", type: "enum", section: "space",
      provenance: "entered", verifyDoc: "SAT building assessment", column: "building_grade", filterable: true,
      validation: { enum: ["a_plus", "a", "b", "c"] }, show_rule: "always" },
    { key: "floor_plate_sqm", label_en: "Floor plate", label_ar: "مساحة الطابق", type: "number", unit: "m²",
      section: "space", provenance: "entered", verifyDoc: "building drawing", validation: { min: 0 } },
    { key: "floor_efficiency_pct", label_en: "Floor efficiency", label_ar: "كفاءة الطابق", type: "number",
      unit: "%", section: "space", provenance: "entered", validation: { min: 0, max: 100 } },
    { key: "ceiling_height_m", label_en: "Ceiling height", label_ar: "ارتفاع السقف", type: "number", unit: "m",
      section: "space", provenance: "entered", verifyDoc: "building drawing", validation: { min: 0, max: 30 } },
    { key: "raised_floor", label_en: "Raised floor", label_ar: "أرضية مرفوعة", type: "boolean", section: "space",
      provenance: "entered" },
    { key: "fitout_condition", label_en: "Fit-out", label_ar: "التشطيب", type: "enum", section: "space",
      provenance: "entered", column: "fitout_condition", filterable: true,
      validation: { enum: ["shell_and_core", "warm_shell", "fitted", "furnished"] }, show_rule: "always" },
    { key: "parking_ratio", label_en: "Parking ratio", label_ar: "نسبة المواقف", type: "text", section: "space",
      provenance: "entered", column: "parking_ratio", help_en: "For example 1 bay per 40 m².", help_ar: "مثال: موقف لكل 40 م²." },
    { key: "floor_level", label_en: "Floor level", label_ar: "الدور", type: "integer", section: "space",
      provenance: "entered" },
    { key: "hvac_type", label_en: "HVAC", label_ar: "التكييف", type: "text", section: "space", provenance: "entered" },
    { key: "generator_redundancy", label_en: "Backup power", label_ar: "الطاقة الاحتياطية", type: "enum",
      section: "space", provenance: "entered", validation: { enum: ["none", "n", "n_plus_1"] },
      options: { none: ["None", "لا يوجد"], n: ["N", "N"], n_plus_1: ["N+1", "N+1"] } },
    { key: "fibre_redundant", label_en: "Redundant fibre", label_ar: "ألياف مكرّرة", type: "boolean",
      section: "space", provenance: "entered" },
    { key: "green_cert", label_en: "Green certification", label_ar: "شهادة الاستدامة", type: "enum",
      section: "space", provenance: "entered", verifyDoc: "certificate",
      validation: { enum: ["none", "mostadam", "leed"] },
      options: { none: ["None", "لا يوجد"], mostadam: ["Mostadam", "مستدام"], leed: ["LEED", "LEED"] } },
    // Commercial
    { key: "asking_rent_sqm", label_en: "Asking rent", label_ar: "الإيجار المطلوب", type: "money", unit: "SAR/m²·yr",
      section: "commercial", provenance: "entered", column: "asking_rent_sqm", filterable: true, show_rule: "always" },
    { key: "service_charge_sqm", label_en: "Service charge", label_ar: "رسوم الخدمات", type: "money", unit: "SAR/m²·yr",
      section: "commercial", provenance: "entered" },
    { key: "rent_free_months", label_en: "Rent-free", label_ar: "فترة إعفاء", type: "integer", unit: "months",
      section: "commercial", provenance: "entered", validation: { min: 0, max: 60 } },
    { key: "fitout_contribution", label_en: "Fit-out contribution", label_ar: "مساهمة التشطيب", type: "money",
      unit: "SAR/m²", section: "commercial", provenance: "entered" },
    { key: "lease_term_years", label_en: "Lease term", label_ar: "مدة العقد", type: "number", unit: "years",
      section: "commercial", provenance: "entered", validation: { min: 0, max: 50 } },
    { key: "break_option", label_en: "Break option", label_ar: "خيار الإنهاء", type: "text",
      section: "commercial", provenance: "entered" },
    { key: "vat_treatment", label_en: "VAT", label_ar: "ضريبة القيمة المضافة", type: "text",
      section: "commercial", provenance: "entered" },
    { key: "sale_price", label_en: "Price", label_ar: "السعر", type: "money", unit: "SAR",
      section: "commercial", provenance: "entered", column: "sale_price", filterable: true, show_rule: "if-present" },
    { key: "price_per_sqm", label_en: "Price per m²", label_ar: "السعر لكل م²", type: "money", unit: "SAR/m²",
      section: "commercial", provenance: "entered" },
    // Compliance
    { key: "zoning_balady", label_en: "Zoning", label_ar: "التصنيف البلدي", type: "text", section: "compliance",
      provenance: "sourced", available: false, help_en: "From Balady, once wired.", help_ar: "من بلدي عند الربط." },
    ejar,
    { key: "rhq_ready", label_en: "RHQ-ready", label_ar: "جاهز لمقر إقليمي", type: "boolean", section: "compliance",
      provenance: "entered",
      help_en: "Fitted, sized for 15+ FTE, defensible address. A filter, never a score.",
      help_ar: "مجهّز، يتّسع لـ 15 موظفاً أو أكثر، وعنوان معتبر. عامل تصفية وليس تقييماً." },
  ],

  // ---- Family A: Logistics and storage ----
  warehouse: [
    // The space
    { key: "clear_height_m", label_en: "Clear height", label_ar: "الارتفاع الصافي", type: "number", unit: "m",
      section: "space", provenance: "entered", verifyDoc: "building drawing", column: "clear_height_m",
      filterable: true, validation: { min: 0, max: 40 }, show_rule: "always" },
    { key: "floor_loading", label_en: "Floor loading", label_ar: "حمولة الأرضية", type: "number", unit: "t/m²",
      section: "space", provenance: "entered", verifyDoc: "structural drawing", validation: { min: 0 } },
    { key: "column_grid", label_en: "Column grid", label_ar: "شبكة الأعمدة", type: "text", section: "space",
      provenance: "entered" },
    { key: "loading_docks", label_en: "Dock doors", label_ar: "أبواب التحميل", type: "integer", section: "space",
      provenance: "entered", verifyDoc: "site check", column: "loading_docks", filterable: true,
      validation: { min: 0 }, show_rule: "always" },
    { key: "dock_levelers", label_en: "Dock levelers", label_ar: "معدّلات الرصيف", type: "boolean",
      section: "space", provenance: "entered" },
    { key: "yard_depth_m", label_en: "Yard depth", label_ar: "عمق الساحة", type: "number", unit: "m",
      section: "space", provenance: "entered", validation: { min: 0 } },
    { key: "power_kva", label_en: "Power", label_ar: "الطاقة", type: "number", unit: "kVA", section: "space",
      provenance: "entered", verifyDoc: "SEC connection", column: "power_kva", filterable: true,
      validation: { min: 0 }, show_rule: "always" },
    { key: "three_phase", label_en: "Three-phase", label_ar: "ثلاثي الأطوار", type: "boolean", section: "space",
      provenance: "entered" },
    { key: "backup_generator_kva", label_en: "Backup generator", label_ar: "مولّد احتياطي", type: "number",
      unit: "kVA", section: "space", provenance: "entered", validation: { min: 0 } },
    { key: "sprinkler_type", label_en: "Sprinkler", label_ar: "نظام الرش", type: "enum", section: "space",
      provenance: "entered", verifyDoc: "Civil Defense certificate", validation: { enum: ["wet", "dry", "esfr"] },
      options: { wet: ["Wet", "رطب"], dry: ["Dry", "جاف"], esfr: ["ESFR", "ESFR"] } },
    { key: "mezzanine_gla_sqm", label_en: "Office / mezzanine", label_ar: "مكتب / ميزانين", type: "number",
      unit: "m²", section: "space", provenance: "entered", validation: { min: 0 } },
    { key: "security_fencing", label_en: "Fencing / gatehouse", label_ar: "تسييج / بوابة أمن", type: "boolean",
      section: "space", provenance: "entered" },
    // Commercial
    { key: "asking_rent_sqm", label_en: "Asking rent", label_ar: "الإيجار المطلوب", type: "money", unit: "SAR/m²·yr",
      section: "commercial", provenance: "entered", column: "asking_rent_sqm", filterable: true, show_rule: "always" },
    { key: "service_charge_sqm", label_en: "Service charge", label_ar: "رسوم الخدمات", type: "money", unit: "SAR/m²·yr",
      section: "commercial", provenance: "entered" },
    { key: "sale_price", label_en: "Price", label_ar: "السعر", type: "money", unit: "SAR", section: "commercial",
      provenance: "entered", column: "sale_price", filterable: true, show_rule: "if-present" },
    { key: "price_per_sqm", label_en: "Price per m²", label_ar: "السعر لكل م²", type: "money", unit: "SAR/m²",
      section: "commercial", provenance: "entered" },
    { key: "modon_ground_lease", label_en: "MODON ground lease", label_ar: "أرض مدن بإيجار", type: "boolean",
      section: "commercial", provenance: "entered",
      help_en: "MODON ground-lease rather than private freehold.", help_ar: "أرض مدن مؤجّرة بدل التملّك الخاص." },
    // Compliance
    { key: "civil_defense_approved", label_en: "Civil Defense", label_ar: "الدفاع المدني", type: "boolean",
      section: "compliance", provenance: "entered", verifyDoc: "Civil Defense certificate",
      column: "civil_defense_approved", filterable: true, show_rule: "always" },
    ejar,
    { key: "zoning_industrial", label_en: "Industrial zoning", label_ar: "تصنيف صناعي", type: "text",
      section: "compliance", provenance: "sourced", available: false,
      help_en: "From Balady, once wired.", help_ar: "من بلدي عند الربط." },
    { key: "bonded_zone", label_en: "Bonded / SILZ zone", label_ar: "منطقة جمركية", type: "boolean",
      section: "compliance", provenance: "entered" },
  ],

  // ---- Family E: Consumer and catchment-driven ----
  retail: [
    // The space
    { key: "frontage_m", label_en: "Frontage width", label_ar: "عرض الواجهة", type: "number", unit: "m",
      section: "space", provenance: "entered", verifyDoc: "site check",
      validation: { min: 0 }, show_rule: "always",
      help_en: "The single biggest rent driver for retail.", help_ar: "أهم عامل في إيجار التجزئة." },
    { key: "unit_depth_m", label_en: "Unit depth", label_ar: "عمق الوحدة", type: "number", unit: "m",
      section: "space", provenance: "entered", validation: { min: 0 } },
    { key: "shopfront_condition", label_en: "Shopfront", label_ar: "الواجهة", type: "text", section: "space",
      provenance: "entered" },
    { key: "ceiling_height_m", label_en: "Ceiling height", label_ar: "ارتفاع السقف", type: "number", unit: "m",
      section: "space", provenance: "entered", validation: { min: 0, max: 30 } },
    { key: "signage_allowance", label_en: "Signage allowance", label_ar: "مساحة اللوحات", type: "text",
      section: "space", provenance: "entered" },
    { key: "anchor_adjacency", label_en: "Anchor / co-tenancy", label_ar: "الجوار التجاري", type: "text",
      section: "space", provenance: "entered",
      help_en: "Adjacent anchors and co-tenants.", help_ar: "المتاجر المجاورة والمرتكزة." },
    { key: "parking_allocation", label_en: "Parking", label_ar: "المواقف", type: "text", section: "space",
      provenance: "entered" },
    { key: "loading_access", label_en: "Loading access", label_ar: "منفذ تحميل", type: "boolean", section: "space",
      provenance: "entered" },
    // Commercial
    { key: "asking_rent_sqm", label_en: "Asking rent", label_ar: "الإيجار المطلوب", type: "money", unit: "SAR/m²·yr",
      section: "commercial", provenance: "entered", column: "asking_rent_sqm", filterable: true, show_rule: "always" },
    { key: "service_charge_sqm", label_en: "Service charge", label_ar: "رسوم الخدمات", type: "money", unit: "SAR/m²·yr",
      section: "commercial", provenance: "entered" },
    { key: "turnover_rent", label_en: "Turnover-rent clause", label_ar: "إيجار نسبة المبيعات", type: "boolean",
      section: "commercial", provenance: "entered" },
    { key: "fitout_contribution", label_en: "Fit-out contribution", label_ar: "مساهمة التشطيب", type: "money",
      unit: "SAR/m²", section: "commercial", provenance: "entered" },
    // Compliance
    ejar,
    { key: "signage_guide", label_en: "Balady signage", label_ar: "دليل لوحات بلدي", type: "text",
      section: "compliance", provenance: "entered" },
    { key: "misa_licence", label_en: "MISA licence", label_ar: "رخصة الاستثمار", type: "boolean",
      section: "compliance", provenance: "entered", verifyDoc: "MISA licence",
      help_en: "Required for foreign operators.", help_ar: "مطلوبة للمشغّلين الأجانب." },
    // Later (defined now, render Not available yet)
    { key: "catchment_population", label_en: "Catchment population", label_ar: "سكان النطاق", type: "number",
      section: "market", provenance: "sourced", available: false,
      help_en: "GASTAT population in a drive-time isochrone, once wired. Labeled coarse.",
      help_ar: "سكان النطاق حسب هيئة الإحصاء عند الربط. مبدئي." },
    { key: "footfall", label_en: "Footfall", label_ar: "حركة الزوار", type: "number", section: "market",
      provenance: "sourced", available: false,
      help_en: "Vendor-only; off until a vendor is signed. Never asserted.",
      help_ar: "من مزوّد فقط؛ معطّلة حتى التعاقد. لا تُقدّر." },
  ],
};

// The asset types the registry currently covers (Phase 1). Others are added by
// extending ASSET_FIELDS; callers should treat a missing type as "no per-asset
// fields yet" and fall back to the generic layout.
export function hasRegistry(assetType: string): boolean {
  return Array.isArray(ASSET_FIELDS[assetType]) && ASSET_FIELDS[assetType].length > 0;
}

export function fieldsFor(assetType: string): AssetField[] {
  return ASSET_FIELDS[assetType] ?? [];
}

export function sectionFieldsFor(assetType: string, section: DisplaySection): AssetField[] {
  return fieldsFor(assetType).filter((f) => f.section === section);
}

// The filterable subset (kept as typed, indexed columns), for search wiring.
export function filterableFields(assetType: string): AssetField[] {
  return fieldsFor(assetType).filter((f) => f.filterable);
}

// The fields a lister actually types at intake: the Entered tier. Verified fields
// begin as Entered (the lister states them, SAT confirms later); Computed and
// Sourced fields are never hand-entered, so they are excluded from the form.
export function intakeFields(assetType: string): AssetField[] {
  return fieldsFor(assetType).filter((f) => f.provenance === "entered");
}
