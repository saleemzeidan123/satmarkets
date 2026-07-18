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
  | "number" | "integer" | "boolean" | "tristate" | "enum" | "text" | "money" | "url" | "doc-ref" | "list";

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

// Shared compliance fields, reused across asset types (like a mixin). Ejar applies
// to every leased asset; Balady and Civil Defense gate most operating premises. All
// are tri-state (yes/no/unknown): an unanswered field must never silently assert
// "no". "unknown" is a legitimate answer and is simply not stored or shown.
const ejar: AssetField = {
  key: "ejar_registered", label_en: "Ejar registration", label_ar: "تسجيل إيجار",
  type: "tristate", section: "compliance", provenance: "entered", verifyDoc: "Ejar contract",
  help_en: "Whether the lease is registered on Ejar.", help_ar: "هل العقد مسجّل في إيجار.",
};
const baladyLicense: AssetField = {
  key: "balady_license", label_en: "Municipal licence", label_ar: "رخصة بلدية",
  type: "tristate", section: "compliance", provenance: "entered", verifyDoc: "Balady licence",
  help_en: "Municipal (Balady) licence for the activity.", help_ar: "الرخصة البلدية للنشاط.",
};
const civilDefenseCert: AssetField = {
  key: "civil_defense_cert", label_en: "Civil Defense certificate", label_ar: "شهادة الدفاع المدني",
  type: "tristate", section: "compliance", provenance: "entered", verifyDoc: "Civil Defense certificate",
  help_en: "Civil Defense safety certificate.", help_ar: "شهادة السلامة من الدفاع المدني.",
};

export const ASSET_FIELDS: AssetFieldRegistry = {
  // ---- Family D: Workspace ----
  office: [
    // The space
    { key: "building_grade", label_en: "Grade", label_ar: "التصنيف", type: "enum", section: "space",
      provenance: "entered", verifyDoc: "SAT building assessment", column: "building_grade", filterable: true,
      validation: { enum: ["a_plus", "a", "b", "c"] }, show_rule: "always", required: true },
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
      validation: { enum: ["shell_and_core", "warm_shell", "fitted", "furnished"] }, show_rule: "always", required: true },
    { key: "parking_ratio", label_en: "Parking ratio", label_ar: "نسبة المواقف", type: "text", section: "space",
      provenance: "entered", column: "parking_ratio", help_en: "For example 1 bay per 40 m².", help_ar: "مثال: موقف لكل 40 م²." },
    { key: "floor_level", label_en: "Floor level", label_ar: "الدور", type: "integer", section: "space",
      provenance: "entered", required: true },
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
      section: "commercial", provenance: "entered", show_rule: "always" },
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
      section: "commercial", provenance: "computed" },
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
      filterable: true, validation: { min: 0, max: 40 }, show_rule: "always", required: true },
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
      section: "commercial", provenance: "entered", show_rule: "always" },
    { key: "sale_price", label_en: "Price", label_ar: "السعر", type: "money", unit: "SAR", section: "commercial",
      provenance: "entered", column: "sale_price", filterable: true, show_rule: "if-present" },
    { key: "price_per_sqm", label_en: "Price per m²", label_ar: "السعر لكل م²", type: "money", unit: "SAR/m²",
      section: "commercial", provenance: "computed" },
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
      validation: { min: 0 }, show_rule: "always", required: true,
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
      section: "commercial", provenance: "entered", show_rule: "always" },
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

  // ---- Family: Medical ----
  medical: [
    { key: "clinic_rooms", label_en: "Clinical rooms", label_ar: "عدد الغرف العيادية", type: "integer", section: "space", provenance: "entered", validation: { min: 0 }, show_rule: "always", required: true },
    { key: "fit_out_state", label_en: "Fit-out condition", label_ar: "حالة التجهيز", type: "enum", section: "space", provenance: "entered", show_rule: "always", required: true, validation: { enum: ["shell", "core_shell", "fitted_generic", "fitted_medical", "turnkey_clinic"] }, options: { shell: ["Shell", "عظم"], core_shell: ["Core and plaster", "على المحارة"], fitted_generic: ["Fitted, generic", "مجهزة عامة"], fitted_medical: ["Medically fitted", "مجهزة طبية"], turnkey_clinic: ["Turnkey clinic", "عيادة جاهزة"] } },
    { key: "prev_use_medical", label_en: "Previously used as medical", label_ar: "استُخدم سابقاً كمنشأة طبية", type: "tristate", section: "space", provenance: "entered" },
    { key: "floor_number", label_en: "Floor number", label_ar: "رقم الدور", type: "integer", section: "space", provenance: "entered" },
    { key: "private_entrance", label_en: "Separate entrance", label_ar: "مدخل مستقل", type: "tristate", section: "space", provenance: "entered" },
    { key: "wet_rooms_plumbed", label_en: "Rooms plumbed for water and drainage", label_ar: "غرف مزودة بسباكة وصرف", type: "integer", section: "space", provenance: "entered", validation: { min: 0 } },
    { key: "ceiling_height_m", label_en: "Clear ceiling height", label_ar: "ارتفاع السقف الصافي", type: "number", unit: "m", section: "space", provenance: "entered", validation: { min: 0, max: 30 } },
    { key: "hvac_type", label_en: "HVAC system", label_ar: "نظام التكييف", type: "enum", section: "space", provenance: "entered", validation: { enum: ["central", "split", "package", "none"] }, options: { central: ["Central", "مركزي"], split: ["Split", "سبليت"], package: ["Package", "باكدج"], none: ["None", "لا يوجد"] } },
    { key: "medical_gas", label_en: "Medical gas piping", label_ar: "شبكة الغازات الطبية", type: "tristate", section: "space", provenance: "entered" },
    { key: "lead_shielding", label_en: "Lead-shielded X-ray room", label_ar: "غرفة مبطنة بالرصاص للأشعة", type: "tristate", section: "space", provenance: "entered" },
    { key: "parking_spaces", label_en: "Dedicated parking spaces", label_ar: "مواقف مخصصة", type: "integer", section: "space", provenance: "entered", validation: { min: 0 } },
    { key: "backup_power", label_en: "Backup generator", label_ar: "مولد احتياطي", type: "tristate", section: "space", provenance: "entered" },
    { key: "accessibility", label_en: "Accessible for disabled", label_ar: "مهيأ لذوي الإعاقة", type: "tristate", section: "space", provenance: "entered" },
    { key: "fit_out_contribution", label_en: "Landlord fit-out contribution", label_ar: "مساهمة المالك في التجهيز", type: "tristate", section: "commercial", provenance: "entered" },
    { key: "rent_free_months", label_en: "Grace period", label_ar: "فترة سماح", type: "integer", unit: "months", section: "commercial", provenance: "entered", validation: { min: 0, max: 60 } },
    { key: "service_charge_applies", label_en: "Service charge applies", label_ar: "تطبق رسوم خدمات", type: "tristate", section: "commercial", provenance: "entered" },
    { key: "lease_min_term_years", label_en: "Minimum lease term", label_ar: "الحد الأدنى لمدة العقد", type: "number", unit: "years", section: "commercial", provenance: "entered", validation: { min: 0, max: 50 } },
    { key: "specialty_exclusivity", label_en: "Specialty exclusivity", label_ar: "حصرية التخصص", type: "tristate", section: "commercial", provenance: "entered" },
    { key: "moh_licensable", label_en: "Suitable for MoH facility licence", label_ar: "قابلية ترخيص وزارة الصحة", type: "tristate", section: "compliance", provenance: "entered", verifyDoc: "MoH assessment" },
    { key: "moh_license_active", label_en: "Existing MoH facility licence", label_ar: "رخصة منشأة صحية سارية", type: "tristate", section: "compliance", provenance: "entered", verifyDoc: "MoH licence" },
    { key: "sfda_approval", label_en: "SFDA approval (pharmacy or lab)", label_ar: "موافقة هيئة الغذاء والدواء", type: "tristate", section: "compliance", provenance: "entered", verifyDoc: "SFDA approval" },
    civilDefenseCert,
    baladyLicense,
    ejar,
  ],

  // ---- Family: Showroom ----
  showroom: [
    { key: "frontage_m", label_en: "Road frontage width", label_ar: "عرض الواجهة على الطريق", type: "number", unit: "m", section: "space", provenance: "entered", validation: { min: 0 }, show_rule: "always" },
    { key: "ceiling_height_m", label_en: "Clear ceiling height", label_ar: "ارتفاع السقف الصافي", type: "number", unit: "m", section: "space", provenance: "entered", validation: { min: 0, max: 30 }, show_rule: "always" },
    { key: "mezzanine", label_en: "Mezzanine present", label_ar: "يوجد ميزانين", type: "tristate", section: "space", provenance: "entered" },
    { key: "mezzanine_area_sqm", label_en: "Mezzanine area", label_ar: "مساحة الميزانين", type: "number", unit: "m²", section: "space", provenance: "entered", validation: { min: 0 } },
    { key: "frontage_type", label_en: "Frontage type", label_ar: "نوع الواجهة", type: "enum", section: "space", provenance: "entered", validation: { enum: ["full_glass", "partial_glass", "solid"] }, options: { full_glass: ["Full glass", "زجاج كامل"], partial_glass: ["Partial glass", "زجاج جزئي"], solid: ["Solid", "مصمتة"] } },
    { key: "roads_fronting", label_en: "Fronting roads", label_ar: "عدد الطرق المطلة", type: "integer", section: "space", provenance: "entered", validation: { min: 0 } },
    { key: "display_forecourt", label_en: "Outdoor display forecourt", label_ar: "ساحة عرض خارجية", type: "tristate", section: "space", provenance: "entered" },
    { key: "roll_up_door", label_en: "Vehicle roll-up door", label_ar: "باب متحرك لدخول المركبات", type: "tristate", section: "space", provenance: "entered" },
    { key: "clear_span", label_en: "Column-free open span", label_ar: "مساحة مفتوحة بدون أعمدة", type: "tristate", section: "space", provenance: "entered" },
    { key: "floors", label_en: "Showroom floors", label_ar: "عدد الأدوار", type: "integer", section: "space", provenance: "entered", validation: { min: 0 } },
    { key: "power_capacity_kva", label_en: "Electrical capacity", label_ar: "السعة الكهربائية", type: "number", unit: "kVA", section: "space", provenance: "entered", validation: { min: 0 } },
    { key: "parking_spaces", label_en: "Parking spaces", label_ar: "عدد المواقف", type: "integer", section: "space", provenance: "entered", validation: { min: 0 } },
    { key: "facade_signage", label_en: "Facade signage rights", label_ar: "حق اللوحات على الواجهة", type: "tristate", section: "space", provenance: "entered" },
    { key: "ac_type", label_en: "Cooling system", label_ar: "نظام التكييف", type: "enum", section: "space", provenance: "entered", validation: { enum: ["central", "split", "none"] }, options: { central: ["Central", "مركزي"], split: ["Split", "سبليت"], none: ["None", "لا يوجد"] } },
    { key: "rent_free_months", label_en: "Grace period", label_ar: "فترة سماح", type: "integer", unit: "months", section: "commercial", provenance: "entered", validation: { min: 0, max: 60 } },
    { key: "service_charge_applies", label_en: "Service charge applies", label_ar: "تطبق رسوم خدمات", type: "tristate", section: "commercial", provenance: "entered" },
    { key: "lease_min_term_years", label_en: "Minimum lease term", label_ar: "الحد الأدنى للمدة", type: "number", unit: "years", section: "commercial", provenance: "entered", validation: { min: 0, max: 50 } },
    { key: "signage_fee", label_en: "Separate signage fee", label_ar: "رسوم لوحات منفصلة", type: "tristate", section: "commercial", provenance: "entered" },
    { key: "showroom_activity_permitted", label_en: "Zoned for showroom activity", label_ar: "النشاط مصرح للمعارض", type: "tristate", section: "compliance", provenance: "entered" },
    { key: "signage_permit", label_en: "Municipal signage permit", label_ar: "تصريح اللوحات الإعلانية", type: "tristate", section: "compliance", provenance: "entered", verifyDoc: "Balady signage permit" },
    baladyLicense,
    civilDefenseCert,
    ejar,
  ],

  // ---- Family: Serviced and flexible offices ----
  serviced: [
    { key: "suite_type", label_en: "Space type", label_ar: "نوع المساحة", type: "enum", section: "space", provenance: "entered", show_rule: "always", required: true, validation: { enum: ["hot_desk", "dedicated_desk", "private_office", "whole_floor"] }, options: { hot_desk: ["Hot desk", "مكتب مرن"], dedicated_desk: ["Dedicated desk", "مكتب مخصص"], private_office: ["Private office", "مكتب خاص"], whole_floor: ["Whole floor", "دور كامل"] } },
    { key: "workstations", label_en: "Workstations", label_ar: "عدد المكاتب", type: "integer", section: "space", provenance: "entered", validation: { min: 0 } },
    { key: "private_offices", label_en: "Private offices", label_ar: "عدد المكاتب الخاصة", type: "integer", section: "space", provenance: "entered", validation: { min: 0 } },
    { key: "meeting_rooms", label_en: "Meeting rooms", label_ar: "عدد قاعات الاجتماعات", type: "integer", section: "space", provenance: "entered", validation: { min: 0 } },
    { key: "phone_booths", label_en: "Private call booths", label_ar: "غرف مكالمات", type: "integer", section: "space", provenance: "entered", validation: { min: 0 } },
    { key: "furnished", label_en: "Furnished", label_ar: "مفروش", type: "tristate", section: "space", provenance: "entered" },
    { key: "internet_included", label_en: "High-speed internet included", label_ar: "إنترنت عالي السرعة مشمول", type: "tristate", section: "space", provenance: "entered" },
    { key: "reception_service", label_en: "Staffed reception", label_ar: "استقبال بموظفين", type: "tristate", section: "space", provenance: "entered" },
    { key: "access_247", label_en: "24/7 access", label_ar: "دخول على مدار الساعة", type: "tristate", section: "space", provenance: "entered" },
    { key: "kitchen_pantry", label_en: "Shared pantry or kitchen", label_ar: "مطبخ مشترك", type: "tristate", section: "space", provenance: "entered" },
    { key: "event_space", label_en: "Event or community space", label_ar: "مساحة فعاليات", type: "tristate", section: "space", provenance: "entered" },
    { key: "floor_number", label_en: "Floor number", label_ar: "رقم الدور", type: "integer", section: "space", provenance: "entered" },
    { key: "parking_included", label_en: "Parking included", label_ar: "مواقف مشمولة", type: "tristate", section: "space", provenance: "entered" },
    { key: "price_basis", label_en: "Price basis", label_ar: "أساس التسعير", type: "enum", section: "commercial", provenance: "entered", show_rule: "always", required: true, validation: { enum: ["per_desk_month", "per_office_month", "per_sqm_year", "whole_month"] }, options: { per_desk_month: ["Per desk / month", "لكل مكتب شهرياً"], per_office_month: ["Per office / month", "لكل مكتب خاص شهرياً"], per_sqm_year: ["Per m² / year", "لكل متر سنوياً"], whole_month: ["Whole space / month", "إجمالي شهري"] } },
    { key: "min_commitment_months", label_en: "Minimum commitment", label_ar: "الحد الأدنى للالتزام", type: "integer", unit: "months", section: "commercial", provenance: "entered", validation: { min: 0 } },
    { key: "deposit_months", label_en: "Deposit", label_ar: "مبلغ التأمين", type: "number", unit: "months", section: "commercial", provenance: "entered", validation: { min: 0 } },
    { key: "capacity_persons", label_en: "Total seating capacity", label_ar: "السعة الإجمالية", type: "integer", section: "commercial", provenance: "entered", validation: { min: 0 } },
    { key: "all_inclusive", label_en: "All-inclusive (utilities and cleaning)", label_ar: "تسعير شامل", type: "tristate", section: "commercial", provenance: "entered" },
    { key: "cr_address_hosting", label_en: "CR and national-address hosting allowed", label_ar: "إمكانية توثيق العنوان الوطني", type: "tristate", section: "compliance", provenance: "entered" },
    baladyLicense,
    civilDefenseCert,
    ejar,
  ],

  // ---- Family: Education ----
  education: [
    { key: "premises_type", label_en: "Premises type", label_ar: "نوع المبنى", type: "enum", section: "space", provenance: "entered", show_rule: "always", required: true, validation: { enum: ["purpose_built_school", "converted_villa", "building", "nursery_unit"] }, options: { purpose_built_school: ["Purpose-built school", "مبنى مدرسي مخصص"], converted_villa: ["Converted villa", "فيلا محولة"], building: ["Commercial building", "مبنى تجاري"], nursery_unit: ["Nursery unit", "وحدة حضانة"] } },
    { key: "classrooms", label_en: "Classrooms", label_ar: "عدد الفصول الدراسية", type: "integer", section: "space", provenance: "entered", validation: { min: 0 } },
    { key: "outdoor_play_area_sqm", label_en: "Outdoor play area", label_ar: "مساحة الفناء", type: "number", unit: "m²", section: "space", provenance: "entered", validation: { min: 0 } },
    { key: "land_area_sqm", label_en: "Plot area", label_ar: "مساحة الأرض", type: "number", unit: "m²", section: "space", provenance: "entered", validation: { min: 0 } },
    { key: "floors", label_en: "Floors", label_ar: "عدد الأدوار", type: "integer", section: "space", provenance: "entered", validation: { min: 0 } },
    { key: "has_gym_hall", label_en: "Sports or multi-purpose hall", label_ar: "صالة رياضية", type: "tristate", section: "space", provenance: "entered" },
    { key: "has_labs", label_en: "Science or computer labs", label_ar: "مختبرات", type: "tristate", section: "space", provenance: "entered" },
    { key: "prayer_area", label_en: "Prayer area", label_ar: "مصلى", type: "tristate", section: "space", provenance: "entered" },
    { key: "clinic_room", label_en: "Clinic or first-aid room", label_ar: "غرفة إسعافات", type: "tristate", section: "space", provenance: "entered" },
    { key: "drop_off_zone", label_en: "Vehicle drop-off zone", label_ar: "منطقة إنزال الطلاب", type: "tristate", section: "space", provenance: "entered" },
    { key: "separate_gates", label_en: "Separate entrances", label_ar: "مداخل منفصلة", type: "tristate", section: "space", provenance: "entered" },
    { key: "parking_spaces", label_en: "Parking spaces", label_ar: "عدد المواقف", type: "integer", section: "space", provenance: "entered", validation: { min: 0 } },
    { key: "capacity_students", label_en: "Design student capacity", label_ar: "السعة الطلابية", type: "integer", section: "space", provenance: "entered", validation: { min: 0 } },
    { key: "rent_free_months", label_en: "Grace period", label_ar: "فترة سماح", type: "integer", unit: "months", section: "commercial", provenance: "entered", validation: { min: 0, max: 60 } },
    { key: "lease_min_term_years", label_en: "Minimum lease term", label_ar: "الحد الأدنى للمدة", type: "number", unit: "years", section: "commercial", provenance: "entered", validation: { min: 0, max: 50 } },
    { key: "fit_out_contribution", label_en: "Landlord fit-out contribution", label_ar: "مساهمة المالك في التجهيز", type: "tristate", section: "commercial", provenance: "entered" },
    { key: "moe_licensable", label_en: "Meets MoE premises requirements", label_ar: "مطابق لاشتراطات وزارة التعليم", type: "tristate", section: "compliance", provenance: "entered", verifyDoc: "MoE assessment" },
    { key: "moe_license_active", label_en: "Existing MoE school licence", label_ar: "ترخيص مدرسي ساري", type: "tristate", section: "compliance", provenance: "entered", verifyDoc: "MoE licence" },
    { key: "nursery_license", label_en: "Nursery licence", label_ar: "ترخيص حضانة", type: "tristate", section: "compliance", provenance: "entered", verifyDoc: "Qurrah licence" },
    baladyLicense,
    civilDefenseCert,
    ejar,
  ],

  // ---- Family: Land ----
  land: [
    { key: "land_use", label_en: "Permitted use", label_ar: "الاستخدام المصرح", type: "enum", section: "space", provenance: "entered", show_rule: "always", required: true, validation: { enum: ["commercial", "residential", "mixed", "industrial", "agricultural", "hospitality"] }, options: { commercial: ["Commercial", "تجاري"], residential: ["Residential", "سكني"], mixed: ["Mixed use", "تجاري سكني"], industrial: ["Industrial", "صناعي"], agricultural: ["Agricultural", "زراعي"], hospitality: ["Hospitality", "سياحي"] } },
    { key: "deed_type", label_en: "Deed (Sakk) type", label_ar: "نوع الصك", type: "enum", section: "space", provenance: "entered", show_rule: "always", required: true, validation: { enum: ["sakk_organized", "sakk_unorganized", "hujja", "agricultural_deed"] }, options: { sakk_organized: ["Organized deed", "صك منظم"], sakk_unorganized: ["Unorganized deed", "صك غير منظم"], hujja: ["Hujja", "حجة استحكام"], agricultural_deed: ["Agricultural deed", "صك زراعي"] } },
    { key: "frontage_m", label_en: "Street frontage", label_ar: "طول الواجهة", type: "number", unit: "m", section: "space", provenance: "entered", validation: { min: 0 } },
    { key: "streets_count", label_en: "Fronting streets", label_ar: "عدد الشوارع", type: "integer", section: "space", provenance: "entered", validation: { min: 0 } },
    { key: "corner_plot", label_en: "Corner plot", label_ar: "زاوية", type: "tristate", section: "space", provenance: "entered" },
    { key: "street_width_m", label_en: "Fronting street width", label_ar: "عرض الشارع", type: "number", unit: "m", section: "space", provenance: "entered", validation: { min: 0 } },
    { key: "plot_shape", label_en: "Plot shape", label_ar: "شكل القطعة", type: "enum", section: "space", provenance: "entered", validation: { enum: ["regular", "irregular"] }, options: { regular: ["Regular", "منتظم"], irregular: ["Irregular", "غير منتظم"] } },
    { key: "topography", label_en: "Topography", label_ar: "طبيعة الأرض", type: "enum", section: "space", provenance: "entered", validation: { enum: ["flat", "sloped", "rocky"] }, options: { flat: ["Flat", "مستوية"], sloped: ["Sloped", "منحدرة"], rocky: ["Rocky", "صخرية"] } },
    { key: "building_coefficient", label_en: "Building coefficient (FAR)", label_ar: "معامل البناء", type: "number", section: "space", provenance: "entered", validation: { min: 0 } },
    { key: "max_floors", label_en: "Permitted floors", label_ar: "عدد الأدوار المسموح", type: "integer", section: "space", provenance: "entered", validation: { min: 0 } },
    { key: "utilities_available", label_en: "Utilities at plot", label_ar: "الخدمات متوفرة", type: "tristate", section: "space", provenance: "entered" },
    { key: "roads_paved", label_en: "Paved access road", label_ar: "الطريق مسفلت", type: "tristate", section: "space", provenance: "entered" },
    { key: "subdividable", label_en: "Subdivision possible", label_ar: "قابلة للتجزئة", type: "tristate", section: "space", provenance: "entered" },
    { key: "white_land_tax", label_en: "Subject to White Land tax", label_ar: "خاضعة لرسوم الأراضي البيضاء", type: "tristate", section: "space", provenance: "entered" },
    { key: "ground_lease_available", label_en: "Available as ground lease (usufruct)", label_ar: "متاحة بعقد انتفاع", type: "tristate", section: "commercial", provenance: "entered" },
    { key: "ground_lease_term_years", label_en: "Ground-lease term", label_ar: "مدة عقد الانتفاع", type: "number", unit: "years", section: "commercial", provenance: "entered", validation: { min: 0 } },
    { key: "masterplan_ready", label_en: "Approved subdivision plan", label_ar: "مخطط معتمد", type: "tristate", section: "commercial", provenance: "entered" },
    { key: "deed_registered", label_en: "Registered electronic deed", label_ar: "صك إلكتروني موثق", type: "tristate", section: "compliance", provenance: "entered", verifyDoc: "Najiz deed" },
    { key: "zoning_certified", label_en: "Municipal permitted-use confirmed", label_ar: "تصنيف الاستخدام معتمد", type: "tristate", section: "compliance", provenance: "entered" },
    { key: "building_permit_eligible", label_en: "Eligible for building permit", label_ar: "قابلية إصدار رخصة بناء", type: "tristate", section: "compliance", provenance: "entered" },
  ],

  // ---- Family: Fuel station ----
  gas_station: [
    { key: "dispensers", label_en: "Fuel dispensers", label_ar: "عدد ماكينات الوقود", type: "integer", section: "space", provenance: "entered", validation: { min: 0 } },
    { key: "fueling_positions", label_en: "Fueling positions", label_ar: "عدد نقاط التعبئة", type: "integer", section: "space", provenance: "entered", validation: { min: 0 } },
    { key: "underground_tanks", label_en: "Storage tanks", label_ar: "عدد الخزانات", type: "integer", section: "space", provenance: "entered", validation: { min: 0 } },
    { key: "tank_capacity_l", label_en: "Total storage capacity", label_ar: "السعة التخزينية", type: "number", unit: "L", section: "space", provenance: "entered", validation: { min: 0 } },
    { key: "canopy_area_sqm", label_en: "Canopy area", label_ar: "مساحة المظلة", type: "number", unit: "m²", section: "space", provenance: "entered", validation: { min: 0 } },
    { key: "forecourt_frontage_m", label_en: "Forecourt road frontage", label_ar: "واجهة الساحة على الطريق", type: "number", unit: "m", section: "space", provenance: "entered", validation: { min: 0 } },
    { key: "land_area_sqm", label_en: "Plot area", label_ar: "مساحة الأرض", type: "number", unit: "m²", section: "space", provenance: "entered", validation: { min: 0 } },
    { key: "convenience_store", label_en: "Convenience store", label_ar: "بقالة", type: "tristate", section: "space", provenance: "entered" },
    { key: "qsr_units", label_en: "Fast-food or retail units", label_ar: "وحدات مطاعم", type: "integer", section: "space", provenance: "entered", validation: { min: 0 } },
    { key: "car_wash", label_en: "Car wash", label_ar: "مغسلة سيارات", type: "tristate", section: "space", provenance: "entered" },
    { key: "mosque", label_en: "Mosque or prayer area", label_ar: "مسجد", type: "tristate", section: "space", provenance: "entered" },
    { key: "restrooms", label_en: "Restrooms", label_ar: "دورات مياه", type: "tristate", section: "space", provenance: "entered" },
    { key: "brand_affiliation", label_en: "Brand affiliation", label_ar: "العلامة التجارية", type: "enum", section: "space", provenance: "entered", validation: { enum: ["branded", "unbranded"] }, options: { branded: ["Branded", "مبرندة"], unbranded: ["Unbranded", "غير مبرندة"] } },
    { key: "sale_scope", label_en: "Sale scope", label_ar: "نطاق البيع", type: "enum", section: "commercial", provenance: "entered", show_rule: "always", required: true, validation: { enum: ["land_only", "business_only", "land_and_business"] }, options: { land_only: ["Land only", "أرض فقط"], business_only: ["Business only", "نشاط فقط"], land_and_business: ["Land and business", "أرض ونشاط"] } },
    { key: "supply_agreement", label_en: "Fuel supply agreement in place", label_ar: "اتفاقية توريد وقود", type: "tristate", section: "commercial", provenance: "entered" },
    { key: "ground_lease", label_en: "On leased (ground-lease) land", label_ar: "على أرض مستأجرة", type: "tristate", section: "commercial", provenance: "entered" },
    { key: "ground_lease_years_remaining", label_en: "Ground-lease years remaining", label_ar: "سنوات متبقية بعقد الأرض", type: "number", unit: "years", section: "commercial", provenance: "entered", validation: { min: 0 } },
    { key: "income_units", label_en: "Income-producing sub-tenancies", label_ar: "عدد الوحدات المؤجرة", type: "integer", section: "commercial", provenance: "entered", validation: { min: 0 } },
    { key: "fuel_station_license", label_en: "Fuel-station operating licence", label_ar: "رخصة محطة وقود", type: "tristate", section: "compliance", provenance: "entered", verifyDoc: "Ministry of Energy licence" },
    { key: "environmental_permit", label_en: "Environmental permit", label_ar: "تصريح بيئي", type: "tristate", section: "compliance", provenance: "entered", verifyDoc: "NCEC permit" },
    { key: "code_compliant", label_en: "Meets updated fuel-station code", label_ar: "مطابقة للكود الجديد", type: "tristate", section: "compliance", provenance: "entered" },
    baladyLicense,
    civilDefenseCert,
  ],

  // ---- Family: Entertainment and leisure ----
  entertainment: [
    { key: "venue_subtype", label_en: "Venue subtype", label_ar: "نوع المنشأة", type: "enum", section: "space", provenance: "entered", show_rule: "always", required: true, validation: { enum: ["fec", "cinema", "gym", "arcade", "trampoline", "soft_play"] }, options: { fec: ["Family entertainment centre", "مركز ترفيه عائلي"], cinema: ["Cinema", "سينما"], gym: ["Fitness club", "نادي رياضي"], arcade: ["Arcade", "صالة ألعاب"], trampoline: ["Trampoline park", "ترامبولين"], soft_play: ["Soft play", "ألعاب أطفال"] } },
    { key: "ceiling_height_m", label_en: "Clear ceiling height", label_ar: "ارتفاع السقف الصافي", type: "number", unit: "m", section: "space", provenance: "entered", validation: { min: 0, max: 40 } },
    { key: "clear_span", label_en: "Column-free span", label_ar: "مساحة مفتوحة بدون أعمدة", type: "tristate", section: "space", provenance: "entered" },
    { key: "floor_loading_kn", label_en: "Floor loading capacity", label_ar: "قدرة تحمل الأرضية", type: "number", unit: "kN/m²", section: "space", provenance: "entered", validation: { min: 0 } },
    { key: "floors", label_en: "Floors", label_ar: "عدد الأدوار", type: "integer", section: "space", provenance: "entered", validation: { min: 0 } },
    { key: "power_capacity_kva", label_en: "Electrical capacity", label_ar: "السعة الكهربائية", type: "number", unit: "kVA", section: "space", provenance: "entered", validation: { min: 0 } },
    { key: "hvac_type", label_en: "HVAC system", label_ar: "نظام التكييف", type: "enum", section: "space", provenance: "entered", validation: { enum: ["central", "package", "split", "none"] }, options: { central: ["Central", "مركزي"], package: ["Package", "باكدج"], split: ["Split", "سبليت"], none: ["None", "لا يوجد"] } },
    { key: "handover_condition", label_en: "Handover condition", label_ar: "حالة التسليم", type: "enum", section: "space", provenance: "entered", validation: { enum: ["shell", "warm_shell", "fitted"] }, options: { shell: ["Shell", "عظم"], warm_shell: ["Warm shell", "شل مجهز"], fitted: ["Fitted", "مجهزة"] } },
    { key: "location_context", label_en: "Location context", label_ar: "الموقع", type: "enum", section: "space", provenance: "entered", validation: { enum: ["standalone", "mall_anchor", "mall_inline", "rooftop"] }, options: { standalone: ["Standalone", "مستقل"], mall_anchor: ["Mall anchor", "محل رئيسي بمول"], mall_inline: ["Mall inline", "داخل مول"], rooftop: ["Rooftop", "سطح"] } },
    { key: "water_drainage", label_en: "Water and drainage provision", label_ar: "تمديدات مياه وصرف", type: "tristate", section: "space", provenance: "entered" },
    { key: "screens_count", label_en: "Screens or halls", label_ar: "عدد الصالات", type: "integer", section: "space", provenance: "entered", validation: { min: 0 } },
    { key: "outdoor_area_sqm", label_en: "Outdoor or terrace area", label_ar: "مساحة خارجية", type: "number", unit: "m²", section: "space", provenance: "entered", validation: { min: 0 } },
    { key: "parking_spaces", label_en: "Parking spaces", label_ar: "عدد المواقف", type: "integer", section: "space", provenance: "entered", validation: { min: 0 } },
    { key: "rent_free_months", label_en: "Grace period", label_ar: "فترة سماح", type: "integer", unit: "months", section: "commercial", provenance: "entered", validation: { min: 0, max: 60 } },
    { key: "turnover_rent", label_en: "Turnover rent component", label_ar: "إيجار نسبة من المبيعات", type: "tristate", section: "commercial", provenance: "entered" },
    { key: "turnover_rent_pct", label_en: "Turnover rent percentage", label_ar: "نسبة الإيجار من المبيعات", type: "number", unit: "%", section: "commercial", provenance: "entered", validation: { min: 0, max: 100 } },
    { key: "service_charge_applies", label_en: "Service charge applies", label_ar: "تطبق رسوم خدمات", type: "tristate", section: "commercial", provenance: "entered" },
    { key: "lease_min_term_years", label_en: "Minimum lease term", label_ar: "الحد الأدنى للمدة", type: "number", unit: "years", section: "commercial", provenance: "entered", validation: { min: 0, max: 50 } },
    { key: "fit_out_contribution", label_en: "Landlord fit-out contribution", label_ar: "مساهمة المالك في التجهيز", type: "tristate", section: "commercial", provenance: "entered" },
    { key: "gea_license", label_en: "General Entertainment Authority permit", label_ar: "ترخيص هيئة الترفيه", type: "tristate", section: "compliance", provenance: "entered", verifyDoc: "GEA permit" },
    { key: "gcam_license", label_en: "Audiovisual or cinema licence", label_ar: "ترخيص الإعلام المرئي والمسموع", type: "tristate", section: "compliance", provenance: "entered", verifyDoc: "GCAM licence" },
    { key: "sports_license", label_en: "Sports or fitness facility licence", label_ar: "ترخيص منشأة رياضية", type: "tristate", section: "compliance", provenance: "entered", verifyDoc: "Ministry of Sports licence" },
    baladyLicense,
    civilDefenseCert,
    ejar,
  ],

  // ---- Family: Wedding hall and events venue ----
  wedding_hall: [
    { key: "guest_capacity", label_en: "Seated guest capacity", label_ar: "السعة (عدد الضيوف)", type: "integer", section: "space", provenance: "entered", validation: { min: 0 }, show_rule: "always", required: true },
    { key: "halls_count", label_en: "Number of halls", label_ar: "عدد القاعات", type: "integer", section: "space", provenance: "entered", validation: { min: 0 } },
    { key: "gender_config", label_en: "Section configuration", label_ar: "تقسيم القاعات", type: "enum", section: "space", provenance: "entered", show_rule: "always", required: true, validation: { enum: ["women_only", "men_only", "both_separate", "convertible"] }, options: { women_only: ["Women", "نسائية"], men_only: ["Men", "رجالية"], both_separate: ["Both, separate", "رجالية ونسائية منفصلة"], convertible: ["Convertible", "قابلة للتحويل"] } },
    { key: "stage_kosha", label_en: "Stage or kosha", label_ar: "مسرح أو كوشة", type: "tristate", section: "space", provenance: "entered" },
    { key: "catering_kitchen", label_en: "Catering kitchen", label_ar: "مطبخ تجهيز", type: "tristate", section: "space", provenance: "entered" },
    { key: "kitchen_type", label_en: "Kitchen type", label_ar: "نوع المطبخ", type: "enum", section: "space", provenance: "entered", validation: { enum: ["full_prep", "warming", "none"] }, options: { full_prep: ["Full prep", "مطبخ كامل"], warming: ["Warming", "تسخين"], none: ["None", "لا يوجد"] } },
    { key: "ceiling_height_m", label_en: "Ceiling height", label_ar: "ارتفاع السقف", type: "number", unit: "m", section: "space", provenance: "entered", validation: { min: 0, max: 40 } },
    { key: "bridal_suite", label_en: "Bridal or VIP suite", label_ar: "جناح العروس", type: "tristate", section: "space", provenance: "entered" },
    { key: "valet_area", label_en: "Valet or drop-off", label_ar: "منطقة إنزال", type: "tristate", section: "space", provenance: "entered" },
    { key: "outdoor_area", label_en: "Outdoor courtyard", label_ar: "ساحة خارجية", type: "tristate", section: "space", provenance: "entered" },
    { key: "av_lighting", label_en: "Built-in AV and lighting", label_ar: "صوتيات وإضاءة مجهزة", type: "tristate", section: "space", provenance: "entered" },
    { key: "furnished", label_en: "Furnished (tables and chairs)", label_ar: "مؤثثة", type: "tristate", section: "space", provenance: "entered" },
    { key: "parking_spaces", label_en: "Parking spaces", label_ar: "عدد المواقف", type: "integer", section: "space", provenance: "entered", validation: { min: 0 } },
    { key: "backup_power", label_en: "Backup generator", label_ar: "مولد احتياطي", type: "tristate", section: "space", provenance: "entered" },
    { key: "sale_scope", label_en: "Sale scope", label_ar: "نطاق البيع", type: "enum", section: "commercial", provenance: "entered", validation: { enum: ["property_only", "business_only", "property_and_business"] }, options: { property_only: ["Property only", "عقار فقط"], business_only: ["Business only", "نشاط فقط"], property_and_business: ["Property and business", "عقار ونشاط"] } },
    { key: "rate_basis", label_en: "Rate basis", label_ar: "أساس السعر", type: "enum", section: "commercial", provenance: "entered", validation: { enum: ["per_night", "per_event", "annual_lease"] }, options: { per_night: ["Per night", "لليلة"], per_event: ["Per event", "للحفل"], annual_lease: ["Annual lease", "إيجار سنوي"] } },
    { key: "catering_exclusive", label_en: "Exclusive in-house catering", label_ar: "حصرية التموين الداخلي", type: "tristate", section: "commercial", provenance: "entered" },
    { key: "lease_min_term_years", label_en: "Minimum lease term", label_ar: "الحد الأدنى للمدة", type: "number", unit: "years", section: "commercial", provenance: "entered", validation: { min: 0, max: 50 } },
    { key: "tourism_license", label_en: "Events or tourism licence", label_ar: "ترخيص سياحي للفعاليات", type: "tristate", section: "compliance", provenance: "entered", verifyDoc: "Ministry of Tourism licence" },
    { key: "food_permit", label_en: "Kitchen or food-handling permit", label_ar: "تصريح المطبخ", type: "tristate", section: "compliance", provenance: "entered", verifyDoc: "SFDA permit" },
    baladyLicense,
    civilDefenseCert,
  ],

  // ---- Family: Worker housing ----
  worker_housing: [
    { key: "bed_capacity", label_en: "Total bed capacity", label_ar: "إجمالي عدد الأسرة", type: "integer", section: "space", provenance: "entered", validation: { min: 0 }, show_rule: "always", required: true },
    { key: "rooms_count", label_en: "Rooms", label_ar: "عدد الغرف", type: "integer", section: "space", provenance: "entered", validation: { min: 0 } },
    { key: "beds_per_room", label_en: "Beds per room", label_ar: "عدد الأسرة بالغرفة", type: "integer", section: "space", provenance: "entered", validation: { min: 0 } },
    { key: "buildings_count", label_en: "Buildings or blocks", label_ar: "عدد المباني", type: "integer", section: "space", provenance: "entered", validation: { min: 0 } },
    { key: "room_type", label_en: "Room configuration", label_ar: "نوع الغرف", type: "enum", section: "space", provenance: "entered", validation: { enum: ["shared", "single", "mixed"] }, options: { shared: ["Shared", "مشتركة"], single: ["Single", "فردية"], mixed: ["Mixed", "متنوعة"] } },
    { key: "ac_type", label_en: "Cooling", label_ar: "التكييف", type: "enum", section: "space", provenance: "entered", validation: { enum: ["central", "split", "window", "none"] }, options: { central: ["Central", "مركزي"], split: ["Split", "سبليت"], window: ["Window", "شباك"], none: ["None", "لا يوجد"] } },
    { key: "mess_hall", label_en: "Dining or mess hall", label_ar: "صالة طعام", type: "tristate", section: "space", provenance: "entered" },
    { key: "central_kitchen", label_en: "Central kitchen", label_ar: "مطبخ مركزي", type: "tristate", section: "space", provenance: "entered" },
    { key: "laundry", label_en: "Laundry facilities", label_ar: "مغسلة", type: "tristate", section: "space", provenance: "entered" },
    { key: "prayer_area", label_en: "Mosque or prayer area", label_ar: "مسجد", type: "tristate", section: "space", provenance: "entered" },
    { key: "clinic", label_en: "On-site clinic", label_ar: "عيادة", type: "tristate", section: "space", provenance: "entered" },
    { key: "recreation", label_en: "Recreation area", label_ar: "منطقة ترفيه", type: "tristate", section: "space", provenance: "entered" },
    { key: "retail_shops", label_en: "On-site shops or supermarket", label_ar: "محلات أو بقالة", type: "tristate", section: "space", provenance: "entered" },
    { key: "perimeter_security", label_en: "Gated or perimeter security", label_ar: "سور وأمن", type: "tristate", section: "space", provenance: "entered" },
    { key: "bus_parking", label_en: "Bus or transport bay", label_ar: "مواقف حافلات", type: "tristate", section: "space", provenance: "entered" },
    { key: "backup_power", label_en: "Backup generator", label_ar: "مولد احتياطي", type: "tristate", section: "space", provenance: "entered" },
    { key: "price_basis", label_en: "Price basis", label_ar: "أساس التسعير", type: "enum", section: "commercial", provenance: "entered", show_rule: "always", required: true, validation: { enum: ["per_bed_month", "per_room_month", "whole_compound", "per_sqm_year"] }, options: { per_bed_month: ["Per bed / month", "لكل سرير شهرياً"], per_room_month: ["Per room / month", "لكل غرفة شهرياً"], whole_compound: ["Whole compound", "إجمالي المجمع"], per_sqm_year: ["Per m² / year", "لكل متر سنوياً"] } },
    { key: "min_take", label_en: "Minimum take (beds or rooms)", label_ar: "الحد الأدنى للتأجير", type: "number", section: "commercial", provenance: "entered", validation: { min: 0 } },
    { key: "catering_included", label_en: "Catering included", label_ar: "إعاشة مشمولة", type: "tristate", section: "commercial", provenance: "entered" },
    { key: "utilities_included", label_en: "Utilities included", label_ar: "خدمات مشمولة", type: "tristate", section: "commercial", provenance: "entered" },
    { key: "fully_managed", label_en: "Fully managed or operator-run", label_ar: "مدار بالكامل", type: "tristate", section: "commercial", provenance: "entered" },
    { key: "lease_min_term_years", label_en: "Minimum lease term", label_ar: "الحد الأدنى للمدة", type: "number", unit: "years", section: "commercial", provenance: "entered", validation: { min: 0, max: 50 } },
    { key: "mhrsd_compliant", label_en: "Meets MHRSD worker-accommodation standards", label_ar: "مطابق لاشتراطات سكن العمال", type: "tristate", section: "compliance", provenance: "entered", verifyDoc: "MHRSD assessment" },
    { key: "modon_zoned", label_en: "In MODON or industrial zone", label_ar: "ضمن مدينة صناعية", type: "tristate", section: "compliance", provenance: "entered" },
    baladyLicense,
    civilDefenseCert,
    ejar,
  ],

  // ---- Family: Self-storage ----
  self_storage: [
    { key: "listing_scope", label_en: "Listing scope", label_ar: "نطاق العرض", type: "enum", section: "space", provenance: "entered", show_rule: "always", required: true, validation: { enum: ["whole_facility", "single_unit", "multiple_units"] }, options: { whole_facility: ["Whole facility", "منشأة كاملة"], single_unit: ["Single unit", "وحدة واحدة"], multiple_units: ["Multiple units", "عدة وحدات"] } },
    { key: "unit_count", label_en: "Units (facility)", label_ar: "عدد الوحدات", type: "integer", section: "space", provenance: "entered", validation: { min: 0 } },
    { key: "smallest_unit_sqm", label_en: "Smallest unit size", label_ar: "أصغر وحدة", type: "number", unit: "m²", section: "space", provenance: "entered", validation: { min: 0 } },
    { key: "largest_unit_sqm", label_en: "Largest unit size", label_ar: "أكبر وحدة", type: "number", unit: "m²", section: "space", provenance: "entered", validation: { min: 0 } },
    { key: "climate_controlled", label_en: "Climate-controlled units", label_ar: "وحدات مكيفة", type: "tristate", section: "space", provenance: "entered" },
    { key: "drive_up_access", label_en: "Drive-up or vehicle access", label_ar: "دخول بالمركبة للوحدة", type: "tristate", section: "space", provenance: "entered" },
    { key: "ceiling_height_m", label_en: "Unit clear height", label_ar: "ارتفاع الوحدة", type: "number", unit: "m", section: "space", provenance: "entered", validation: { min: 0, max: 40 } },
    { key: "unit_floor_level", label_en: "Unit floor level", label_ar: "دور الوحدة", type: "enum", section: "space", provenance: "entered", validation: { enum: ["ground", "upper_with_lift", "upper_no_lift"] }, options: { ground: ["Ground", "أرضي"], upper_with_lift: ["Upper, with lift", "علوي مع مصعد"], upper_no_lift: ["Upper, no lift", "علوي بدون مصعد"] } },
    { key: "loading_bay", label_en: "Loading bay or dock", label_ar: "رصيف تحميل", type: "tristate", section: "space", provenance: "entered" },
    { key: "goods_lift", label_en: "Goods lift", label_ar: "مصعد بضائع", type: "tristate", section: "space", provenance: "entered" },
    { key: "access_247", label_en: "24/7 access", label_ar: "دخول على مدار الساعة", type: "tristate", section: "space", provenance: "entered" },
    { key: "cctv_security", label_en: "CCTV or access control", label_ar: "مراقبة وتحكم بالدخول", type: "tristate", section: "space", provenance: "entered" },
    { key: "individual_alarm", label_en: "Per-unit alarm", label_ar: "إنذار للوحدة", type: "tristate", section: "space", provenance: "entered" },
    { key: "power_in_unit", label_en: "Power outlet in unit", label_ar: "كهرباء داخل الوحدة", type: "tristate", section: "space", provenance: "entered" },
    { key: "price_basis", label_en: "Price basis", label_ar: "أساس التسعير", type: "enum", section: "commercial", provenance: "entered", validation: { enum: ["per_unit_month", "per_sqm_month", "whole_facility"] }, options: { per_unit_month: ["Per unit / month", "لكل وحدة شهرياً"], per_sqm_month: ["Per m² / month", "لكل متر شهرياً"], whole_facility: ["Whole facility", "إجمالي المنشأة"] } },
    { key: "min_term_months", label_en: "Minimum term", label_ar: "الحد الأدنى للمدة", type: "integer", unit: "months", section: "commercial", provenance: "entered", validation: { min: 0 } },
    { key: "deposit_months", label_en: "Deposit", label_ar: "التأمين", type: "number", unit: "months", section: "commercial", provenance: "entered", validation: { min: 0 } },
    { key: "storage_activity_permitted", label_en: "Zoned for storage activity", label_ar: "النشاط التخزيني مصرح", type: "tristate", section: "compliance", provenance: "entered" },
    baladyLicense,
    civilDefenseCert,
    ejar,
  ],

  // ---- Family: Hospitality ----
  hospitality: [
    { key: "hospitality_subtype", label_en: "Subtype", label_ar: "نوع المنشأة", type: "enum", section: "space", provenance: "entered", show_rule: "always", required: true, validation: { enum: ["hotel", "serviced_apartments", "furnished_units", "resort"] }, options: { hotel: ["Hotel", "فندق"], serviced_apartments: ["Serviced apartments", "شقق فندقية"], furnished_units: ["Furnished units", "وحدات مفروشة"], resort: ["Resort", "منتجع"] } },
    { key: "keys", label_en: "Keys or units", label_ar: "عدد الغرف أو الوحدات", type: "integer", section: "space", provenance: "entered", validation: { min: 0 } },
    { key: "star_rating", label_en: "Tourism classification (stars)", label_ar: "التصنيف السياحي", type: "enum", section: "space", provenance: "entered", validation: { enum: ["one", "two", "three", "four", "five", "unrated"] }, options: { one: ["1 star", "نجمة"], two: ["2 stars", "نجمتان"], three: ["3 stars", "ثلاث نجوم"], four: ["4 stars", "أربع نجوم"], five: ["5 stars", "خمس نجوم"], unrated: ["Unrated", "غير مصنف"] } },
    { key: "floors", label_en: "Floors", label_ar: "عدد الأدوار", type: "integer", section: "space", provenance: "entered", validation: { min: 0 } },
    { key: "furnished", label_en: "Furnished and FF&E in place", label_ar: "مفروشة ومجهزة", type: "tristate", section: "space", provenance: "entered" },
    { key: "kitchenettes", label_en: "In-unit kitchenettes", label_ar: "مطابخ داخل الوحدات", type: "tristate", section: "space", provenance: "entered" },
    { key: "fnb_outlets", label_en: "Food and beverage outlets", label_ar: "منافذ الأطعمة والمشروبات", type: "integer", section: "space", provenance: "entered", validation: { min: 0 } },
    { key: "meeting_banquet", label_en: "Meeting or banquet facilities", label_ar: "قاعات اجتماعات أو مناسبات", type: "tristate", section: "space", provenance: "entered" },
    { key: "pool", label_en: "Swimming pool", label_ar: "مسبح", type: "tristate", section: "space", provenance: "entered" },
    { key: "gym_spa", label_en: "Gym or spa", label_ar: "نادي أو سبا", type: "tristate", section: "space", provenance: "entered" },
    { key: "parking_spaces", label_en: "Parking spaces", label_ar: "عدد المواقف", type: "integer", section: "space", provenance: "entered", validation: { min: 0 } },
    { key: "backup_power", label_en: "Backup generator", label_ar: "مولد احتياطي", type: "tristate", section: "space", provenance: "entered" },
    { key: "land_area_sqm", label_en: "Plot area", label_ar: "مساحة الأرض", type: "number", unit: "m²", section: "space", provenance: "entered", validation: { min: 0 } },
    { key: "sale_scope", label_en: "Deal scope", label_ar: "نطاق الصفقة", type: "enum", section: "commercial", provenance: "entered", show_rule: "always", required: true, validation: { enum: ["property_vacant", "property_with_operator", "business_lease", "single_unit_lease"] }, options: { property_vacant: ["Property, vacant", "عقار شاغر"], property_with_operator: ["Property and operator", "عقار مع مشغل"], business_lease: ["Business lease", "تأجير نشاط"], single_unit_lease: ["Single unit lease", "تأجير وحدة"] } },
    { key: "management_agreement", label_en: "Existing management agreement", label_ar: "اتفاقية إدارة قائمة", type: "tristate", section: "commercial", provenance: "entered" },
    { key: "operator_brand", label_en: "Operated or branded", label_ar: "مشغل أو علامة تجارية", type: "tristate", section: "commercial", provenance: "entered" },
    { key: "rate_basis", label_en: "Rate basis (units)", label_ar: "أساس السعر", type: "enum", section: "commercial", provenance: "entered", validation: { enum: ["nightly", "monthly", "annual"] }, options: { nightly: ["Nightly", "يومي"], monthly: ["Monthly", "شهري"], annual: ["Annual", "سنوي"] } },
    { key: "vacant_possession", label_en: "Vacant possession offered", label_ar: "تسليم خالٍ", type: "tristate", section: "commercial", provenance: "entered" },
    { key: "tourism_license", label_en: "Tourism operating licence", label_ar: "رخصة سياحية", type: "tristate", section: "compliance", provenance: "entered", verifyDoc: "Ministry of Tourism licence" },
    { key: "tourism_classified", label_en: "Officially classified", label_ar: "مصنّف سياحياً", type: "tristate", section: "compliance", provenance: "entered", verifyDoc: "Ministry of Tourism classification" },
    { key: "food_license", label_en: "Food and beverage licence", label_ar: "ترخيص الأغذية", type: "tristate", section: "compliance", provenance: "entered", verifyDoc: "SFDA licence" },
    baladyLicense,
    civilDefenseCert,
    ejar,
  ],

  // ---- Family: Mixed-use ----
  mixed_use: [
    { key: "has_retail", label_en: "Retail component", label_ar: "مكون تجزئة", type: "tristate", section: "space", provenance: "entered" },
    { key: "has_office", label_en: "Office component", label_ar: "مكون مكاتب", type: "tristate", section: "space", provenance: "entered" },
    { key: "has_residential", label_en: "Residential component", label_ar: "مكون سكني", type: "tristate", section: "space", provenance: "entered" },
    { key: "has_hospitality", label_en: "Hotel or serviced component", label_ar: "مكون فندقي", type: "tristate", section: "space", provenance: "entered" },
    { key: "total_floors", label_en: "Total floors", label_ar: "إجمالي الأدوار", type: "integer", section: "space", provenance: "entered", validation: { min: 0 } },
    { key: "basement_floors", label_en: "Basement or parking floors", label_ar: "أدوار قبو أو مواقف", type: "integer", section: "space", provenance: "entered", validation: { min: 0 } },
    { key: "retail_gla_sqm", label_en: "Retail GLA", label_ar: "مساحة التجزئة المؤجرة", type: "number", unit: "m²", section: "space", provenance: "entered", validation: { min: 0 } },
    { key: "office_area_sqm", label_en: "Office area", label_ar: "مساحة المكاتب", type: "number", unit: "m²", section: "space", provenance: "entered", validation: { min: 0 } },
    { key: "residential_units", label_en: "Residential units", label_ar: "عدد الوحدات السكنية", type: "integer", section: "space", provenance: "entered", validation: { min: 0 } },
    { key: "parking_spaces", label_en: "Parking spaces", label_ar: "عدد المواقف", type: "integer", section: "space", provenance: "entered", validation: { min: 0 } },
    { key: "separate_cores", label_en: "Separate access cores per use", label_ar: "مداخل ومصاعد منفصلة للاستخدامات", type: "tristate", section: "space", provenance: "entered" },
    { key: "retail_frontage_m", label_en: "Retail podium frontage", label_ar: "واجهة التجزئة", type: "number", unit: "m", section: "space", provenance: "entered", validation: { min: 0 } },
    { key: "year_built", label_en: "Year built", label_ar: "سنة البناء", type: "integer", section: "space", provenance: "entered", validation: { min: 1900, max: 2035 } },
    { key: "occupancy_status", label_en: "Occupancy status", label_ar: "حالة الإشغال", type: "enum", section: "space", provenance: "entered", validation: { enum: ["vacant", "part_leased", "fully_leased"] }, options: { vacant: ["Vacant", "شاغر"], part_leased: ["Part-leased", "مؤجر جزئياً"], fully_leased: ["Fully leased", "مؤجر بالكامل"] } },
    { key: "power_capacity_kva", label_en: "Electrical capacity", label_ar: "السعة الكهربائية", type: "number", unit: "kVA", section: "space", provenance: "entered", validation: { min: 0 } },
    { key: "sale_scope", label_en: "Deal scope", label_ar: "نطاق الصفقة", type: "enum", section: "commercial", provenance: "entered", show_rule: "always", required: true, validation: { enum: ["whole_building", "floor", "unit", "income_producing"] }, options: { whole_building: ["Whole building", "كامل المبنى"], floor: ["Floor", "دور"], unit: ["Unit", "وحدة"], income_producing: ["Income-producing asset", "عقار مدر للدخل"] } },
    { key: "tenanted", label_en: "Sold with tenants in place", label_ar: "مؤجر عند البيع", type: "tristate", section: "commercial", provenance: "entered" },
    { key: "wault_years", label_en: "Weighted lease term remaining", label_ar: "متوسط مدة العقود المتبقية", type: "number", unit: "years", section: "commercial", provenance: "entered", validation: { min: 0 } },
    { key: "strata_available", label_en: "Strata (individually titled) units", label_ar: "وحدات بصكوك مستقلة", type: "tristate", section: "commercial", provenance: "entered" },
    { key: "service_charge_regime", label_en: "Service charge regime", label_ar: "نظام رسوم الخدمات", type: "tristate", section: "commercial", provenance: "entered" },
    { key: "mixed_use_permitted", label_en: "Zoned for mixed use", label_ar: "مصرح بالاستخدام المختلط", type: "tristate", section: "compliance", provenance: "entered" },
    { key: "strata_deeds_issued", label_en: "Individual (Sakk) deeds issued", label_ar: "صكوك مفرزة صادرة", type: "tristate", section: "compliance", provenance: "entered", verifyDoc: "Najiz deeds" },
    { key: "occupancy_certificate", label_en: "Completion or occupancy certificate", label_ar: "شهادة إتمام أو إشغال", type: "tristate", section: "compliance", provenance: "entered", verifyDoc: "Balady occupancy certificate" },
    baladyLicense,
    civilDefenseCert,
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
