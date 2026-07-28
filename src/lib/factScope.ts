// Fact scope: whose fact is this.
//
// The field registry (./assetFields) already says what a fact IS and where it
// renders (its `section`). This module answers a different question that the
// Listing Studio and every unit or building surface needs: what the fact is
// ABOUT. A grade belongs to the building and stays true whichever floor is
// offered. A fit-out state belongs to the one space on offer. A rent-free
// period belongs to neither: it belongs to this offer and is gone when the
// offer is.
//
// Three structural properties, in the same spirit as ./listingQuality:
//
// 1. Scope is resolved per (assetType, key), never per key alone. `frontage_m`
//    is a fact of the offered shop for retail and a fact of the plot for land,
//    and a flat key map would have to be wrong about one of them.
// 2. Nothing resolves by fallback. `factScope` returns null for a pair it has
//    no entry for, and the test asserts every registry entry resolves, so
//    adding a field to the registry forces a scope decision rather than
//    inheriting a default that happens to be the common case.
// 3. Scope decides attribution, and attribution is asymmetric (ADV-1). A
//    property fact may appear on a unit page as context. A space fact or a
//    deal fact may never be restated as a fact of the building. That asymmetry
//    is the difference between "this building is grade A" and "this building
//    rents at 1,400", and collapsing it is how a marketplace starts publishing
//    figures nobody wrote.
//
// Note the axis is not ./listingQuality's `QualityScope`. That one groups
// checks for the reader of a completeness report (identity, media, contact).
// This one names the subject the fact is true of. A photograph is media there
// and a fact of the offered space here.

import { fieldsFor, type AssetField, type DisplaySection } from "./assetFields";

export type FactScope = "property" | "space" | "deal" | "compliance" | "area";

// Render and step order. Facts about the thing come before facts about the
// offer, because a reader decides what the asset is before deciding whether
// the terms suit them.
export const SCOPE_ORDER: FactScope[] = ["property", "space", "deal", "compliance", "area"];

// The classification rules, written down so a later field can be decided the
// same way rather than by taste:
//
// property   True of the building, compound or plot as a whole, whichever part
//            of it is offered, and true for the next offer over the same asset.
//            For an asset offered whole (land, a wedding hall, a compound, a
//            mixed-use building) every physical fact is a property fact,
//            because there is no separate offered space to hold one.
// space      True of the specific space on offer and of nothing larger.
// deal       Part of this offer: price, term, inclusion, allowance, restriction
//            or scope of sale. It can change without the building or the space
//            changing at all.
// compliance A permission, licence, registration or certificate whose truth is
//            decided by an authority outside this platform and which expires.
// area       True of the surroundings, not of the asset or the space.

const DEFAULT_SCOPE: Record<string, FactScope> = {
  // ---- physical facts of the asset ----
  access_247: "property",
  accessibility: "property",
  ac_type: "space",
  anchor_adjacency: "property",
  av_lighting: "property",
  backup_generator_kva: "property",
  backup_power: "property",
  basement_floors: "property",
  bed_capacity: "property",
  beds_per_room: "property",
  brand_affiliation: "property",
  bridal_suite: "property",
  building_coefficient: "property",
  building_grade: "property",
  buildings_count: "property",
  bus_parking: "property",
  canopy_area_sqm: "property",
  capacity_students: "property",
  car_wash: "property",
  catering_kitchen: "property",
  cctv_security: "property",
  ceiling_height_m: "space",
  central_kitchen: "property",
  classrooms: "property",
  clear_height_m: "space",
  clear_span: "space",
  climate_controlled: "space",
  clinic: "property",
  clinic_room: "property",
  clinic_rooms: "space",
  column_grid: "space",
  convenience_store: "property",
  corner_plot: "property",
  deed_type: "property",
  dispensers: "property",
  display_forecourt: "space",
  dock_levelers: "space",
  drive_up_access: "space",
  drop_off_zone: "property",
  event_space: "property",
  facade_signage: "space",
  fibre_redundant: "property",
  fit_out_state: "space",
  fitout_condition: "space",
  floor_efficiency_pct: "property",
  floor_level: "space",
  floor_loading: "space",
  floor_loading_kn: "space",
  floor_number: "space",
  floor_plate_sqm: "property",
  floors: "property",
  fnb_outlets: "property",
  forecourt_frontage_m: "property",
  frontage_m: "space",
  frontage_type: "space",
  fueling_positions: "property",
  furnished: "space",
  gender_config: "property",
  generator_redundancy: "property",
  goods_lift: "property",
  green_cert: "property",
  guest_capacity: "property",
  gym_spa: "property",
  halls_count: "property",
  handover_condition: "space",
  has_gym_hall: "property",
  has_hospitality: "property",
  has_labs: "property",
  has_office: "property",
  has_residential: "property",
  has_retail: "property",
  hospitality_subtype: "property",
  hvac_type: "property",
  individual_alarm: "space",
  keys: "property",
  kitchen_pantry: "property",
  kitchen_type: "property",
  kitchenettes: "property",
  land_area_sqm: "property",
  land_use: "property",
  largest_unit_sqm: "property",
  laundry: "property",
  lead_shielding: "space",
  loading_access: "space",
  loading_bay: "property",
  loading_docks: "space",
  location_context: "property",
  max_floors: "property",
  medical_gas: "space",
  meeting_banquet: "property",
  meeting_rooms: "property",
  mess_hall: "property",
  mezzanine: "space",
  mezzanine_area_sqm: "space",
  mezzanine_gla_sqm: "space",
  mosque: "property",
  occupancy_status: "property",
  office_area_sqm: "property",
  outdoor_area: "property",
  outdoor_area_sqm: "space",
  outdoor_play_area_sqm: "property",
  parking_ratio: "property",
  parking_spaces: "property",
  perimeter_security: "property",
  phone_booths: "property",
  plot_shape: "property",
  pool: "property",
  power_capacity_kva: "space",
  power_in_unit: "space",
  power_kva: "space",
  prayer_area: "property",
  premises_type: "property",
  prev_use_medical: "space",
  private_entrance: "space",
  private_offices: "property",
  qsr_units: "property",
  raised_floor: "space",
  reception_service: "property",
  recreation: "property",
  residential_units: "property",
  restrooms: "property",
  retail_frontage_m: "property",
  retail_gla_sqm: "property",
  retail_shops: "property",
  roads_fronting: "property",
  roads_paved: "property",
  roll_up_door: "space",
  room_type: "property",
  rooms_count: "property",
  screens_count: "space",
  security_fencing: "property",
  separate_cores: "property",
  separate_gates: "property",
  shopfront_condition: "space",
  smallest_unit_sqm: "property",
  sprinkler_type: "space",
  stage_kosha: "property",
  star_rating: "property",
  street_width_m: "property",
  streets_count: "property",
  subdividable: "property",
  suite_type: "space",
  tank_capacity_l: "property",
  three_phase: "space",
  topography: "property",
  total_floors: "property",
  underground_tanks: "property",
  unit_count: "property",
  unit_depth_m: "space",
  unit_floor_level: "space",
  utilities_available: "property",
  valet_area: "property",
  venue_subtype: "property",
  water_drainage: "space",
  wet_rooms_plumbed: "space",
  white_land_tax: "property",
  workstations: "space",
  yard_depth_m: "space",
  year_built: "property",

  // ---- facts of the offer ----
  // These sit in the registry's space section because that is where a viewer
  // reads them, and they are deal facts because a landlord can withdraw the
  // allocation or the signage right without touching the space.
  internet_included: "deal",
  listing_scope: "deal",
  parking_allocation: "deal",
  parking_included: "deal",
  signage_allowance: "deal",

  all_inclusive: "deal",
  asking_rent_sqm: "deal",
  break_option: "deal",
  capacity_persons: "space",
  catering_exclusive: "deal",
  catering_included: "deal",
  deposit_months: "deal",
  fit_out_contribution: "deal",
  fitout_contribution: "deal",
  fully_managed: "deal",
  ground_lease_available: "deal",
  ground_lease_term_years: "deal",
  lease_min_term_years: "deal",
  lease_term_years: "deal",
  min_commitment_months: "deal",
  min_take: "deal",
  min_term_months: "deal",
  price_basis: "deal",
  price_per_sqm: "deal",
  rate_basis: "deal",
  rent_free_months: "deal",
  sale_price: "deal",
  sale_scope: "deal",
  service_charge_applies: "deal",
  service_charge_regime: "deal",
  service_charge_sqm: "deal",
  signage_fee: "deal",
  specialty_exclusivity: "deal",
  strata_available: "deal",
  supply_agreement: "deal",
  tenanted: "deal",
  turnover_rent: "deal",
  turnover_rent_pct: "deal",
  utilities_included: "deal",
  vacant_possession: "deal",
  vat_treatment: "deal",

  // Tenure, standing income and the operating agreement sit in the registry's
  // commercial section because they price the asset. They are property facts:
  // they survive this offer, and the next offer over the same asset inherits
  // them rather than setting them.
  ground_lease: "property",
  ground_lease_years_remaining: "property",
  income_units: "property",
  management_agreement: "property",
  masterplan_ready: "property",
  modon_ground_lease: "property",
  operator_brand: "property",
  wault_years: "property",

  // ---- permissions ----
  balady_license: "compliance",
  bonded_zone: "compliance",
  building_permit_eligible: "compliance",
  civil_defense_approved: "compliance",
  civil_defense_cert: "compliance",
  code_compliant: "compliance",
  cr_address_hosting: "compliance",
  deed_registered: "compliance",
  ejar_registered: "compliance",
  environmental_permit: "compliance",
  food_license: "compliance",
  food_permit: "compliance",
  fuel_station_license: "compliance",
  gcam_license: "compliance",
  gea_license: "compliance",
  mhrsd_compliant: "compliance",
  misa_licence: "compliance",
  mixed_use_permitted: "compliance",
  modon_zoned: "compliance",
  moe_licensable: "compliance",
  moe_license_active: "compliance",
  moh_licensable: "compliance",
  moh_license_active: "compliance",
  nursery_license: "compliance",
  occupancy_certificate: "compliance",
  rhq_ready: "compliance",
  sfda_approval: "compliance",
  showroom_activity_permitted: "compliance",
  signage_guide: "compliance",
  signage_permit: "compliance",
  sports_license: "compliance",
  storage_activity_permitted: "compliance",
  strata_deeds_issued: "compliance",
  tourism_classified: "compliance",
  tourism_license: "compliance",
  zoning_balady: "compliance",
  zoning_certified: "compliance",
  zoning_industrial: "compliance",

  // ---- the surroundings ----
  catchment_population: "area",
  footfall: "area",
};

// The six pairs where the same key is a fact about different subjects
// depending on the asset. Every one of them exists because the asset is
// offered whole, so the fact that would describe a unit elsewhere describes
// the property here.
const OVERRIDE_SCOPE: Record<string, FactScope> = {
  "land:frontage_m": "property",
  "wedding_hall:ceiling_height_m": "property",
  "wedding_hall:furnished": "property",
  "hospitality:furnished": "property",
  "mixed_use:power_capacity_kva": "property",
  "worker_housing:ac_type": "property",
};

/**
 * The subject a registry fact is true of, for one asset type. Returns null for
 * a key this module has never been told about, which is the signal the caller
 * must not paper over: an unclassified fact has no attribution rules and so
 * has no safe place to render.
 */
export function factScope(assetType: string, key: string): FactScope | null {
  const override = OVERRIDE_SCOPE[`${assetType}:${key}`];
  if (override) return override;
  return DEFAULT_SCOPE[key] ?? null;
}

/**
 * What this module has been told about, as declared keys and as declared
 * `assetType:key` overrides. It exists so the coverage test can run in both
 * directions: no registry field without a scope, and no scope entry without a
 * registry field. A stale entry left behind by a renamed field is the failure
 * mode this catches, and it is the one a coverage sweep over the registry
 * alone cannot see.
 */
export function declaredScopeEntries(): { keys: string[]; overrides: string[] } {
  return { keys: Object.keys(DEFAULT_SCOPE), overrides: Object.keys(OVERRIDE_SCOPE) };
}

// The platform level facts every listing carries, whatever its asset type.
// These are the check keys of ./listingQuality's platform pass, and the test
// holds the two lists together so neither can grow alone.
export const PLATFORM_FACT_SCOPE: Record<string, FactScope> = {
  title_en: "space",
  title_ar: "space",
  description_en: "space",
  description_ar: "space",
  area_sqm: "space",
  price: "deal",
  photos: "space",
  photo_set: "space",
  floorplan: "space",
  video: "space",
  coordinates: "property",
  district: "property",
  building: "property",
  ad_permit: "compliance",
  permit_expiry: "compliance",
  right_to_market: "compliance",
  documents: "compliance",
  availability_confirmed: "deal",
  contact: "deal",
};

export type Attribution = "own" | "context" | "denied";

/**
 * Where a fact of this scope may be shown, and where it may never be.
 *
 * A property fact is the building's own and is context on a unit inside it. A
 * space fact and a deal fact are the unit's own and are denied on the building,
 * because one space's fit-out is not the building's fit-out and one offer's
 * rent is not the building's rent. A compliance record is filed with a listing
 * by a party, so it is denied on the building too: the platform knows the
 * licence was filed here, not that the building holds it. An area fact is
 * context everywhere and never anyone's own.
 */
export function attributionOf(scope: FactScope, page: "building" | "unit"): Attribution {
  switch (scope) {
    case "property":
      return page === "building" ? "own" : "context";
    case "space":
    case "deal":
    case "compliance":
      return page === "unit" ? "own" : "denied";
    case "area":
      return "context";
  }
}

export function factScopeLabel(scope: FactScope, ar: boolean): string {
  switch (scope) {
    case "property": return ar ? "العقار" : "The property";
    case "space": return ar ? "المساحة المعروضة" : "The offered space";
    case "deal": return ar ? "العرض" : "The offer";
    case "compliance": return ar ? "التراخيص" : "Permissions";
    case "area": return ar ? "المحيط" : "The surroundings";
  }
}

export function factScopeHint(scope: FactScope, ar: boolean): string {
  switch (scope) {
    case "property":
      return ar
        ? "صحيح عن المبنى أو الأرض ككل، أياً كانت المساحة المعروضة."
        : "True of the building or plot as a whole, whichever space is offered.";
    case "space":
      return ar
        ? "صحيح عن هذه المساحة وحدها، ولا يُنسب إلى المبنى."
        : "True of this space only, and never restated as a fact of the building.";
    case "deal":
      return ar
        ? "جزء من هذا العرض، ويتغيّر بتغيّره دون أن يتغيّر العقار."
        : "Part of this offer, and it changes when the offer changes while the property does not.";
    case "compliance":
      return ar
        ? "تقرّرها جهة خارج المنصة، ولها تاريخ انتهاء."
        : "Decided by an authority outside this platform, and it expires.";
    case "area":
      return ar
        ? "صحيح عن المنطقة المحيطة، لا عن العقار ولا عن المساحة."
        : "True of the area around the property, not of the property or the space.";
  }
}

export interface ScopeGroup {
  scope: FactScope;
  fields: AssetField[];
}

/**
 * The asset type's registry fields grouped by subject, in SCOPE_ORDER, with
 * registry order preserved inside each group and empty groups dropped. This is
 * the shape a Studio step list and a detail page section list are both built
 * from, so the two cannot disagree about which facts belong together.
 *
 * A field this module cannot classify is omitted rather than swept into a
 * catch-all group, and `unscopedFields` names those so a caller can fail
 * loudly. The coverage test keeps that list empty.
 */
export function scopeGroupsFor(assetType: string): ScopeGroup[] {
  const groups = new Map<FactScope, AssetField[]>();
  for (const field of fieldsFor(assetType)) {
    const scope = factScope(assetType, field.key);
    if (!scope) continue;
    const bucket = groups.get(scope);
    if (bucket) bucket.push(field);
    else groups.set(scope, [field]);
  }
  return SCOPE_ORDER.filter((s) => groups.has(s)).map((s) => ({ scope: s, fields: groups.get(s) as AssetField[] }));
}

/** The registry fields of an asset type this module has no scope for. */
export function unscopedFields(assetType: string): string[] {
  return fieldsFor(assetType)
    .filter((f) => factScope(assetType, f.key) === null)
    .map((f) => f.key);
}

/**
 * The display sections whose membership is fixed by scope rather than decided
 * field by field. A compliance section field is always a permission and a
 * market section field is always a fact of the surroundings, in both
 * directions, and the test holds both directions.
 */
export const SECTION_SCOPE_LOCK: Partial<Record<DisplaySection, FactScope>> = {
  compliance: "compliance",
  market: "area",
};
