// The deterministic listing completeness, quality and contradiction model.
//
// ADV-2 opens here because the published corpus is not wrong, it is empty. Of the
// 88 published listings, none carries a description in either language, one has
// any media at all, none has coordinates, 85 have no floor plan and 51 have no
// registry attributes, while every arithmetic contradiction check returns zero.
// A Listing Studio that guesses at what is missing would be inventing; a Listing
// Studio that states exactly what is missing, per listing, with a reason, is the
// thing the rest of the package is built on.
//
// Three properties are structural rather than conventional.
//
// 1. No score ships without its reasons. `assessListing` is the only producer of
//    a score, it returns the score inside the same object as the checks that
//    produced it, and `scoreFromChecks` is a pure function of that check list. No
//    exported function turns a listing into a bare number.
// 2. Nothing is inferred. An absent value is `missing`, never "probably fine".
//    `not_applicable` is returned only when the registry says the field does not
//    exist for this asset type or that its source is not wired yet. A `tristate`
//    answered "unknown" is not stored (see intakeValidation) and so reads as
//    missing here, which is the honest reading: an unanswered question is not a
//    "no".
// 3. Quality is not verification (D24). Nothing in this module produces a colour,
//    and no label, reason or statement here may read as a check of a fact against
//    an outside authority. Completeness says what a lister has supplied.
//    src/lib/listingVerification.ts says what SAT confirmed. The two must never
//    be read as the same claim, and listingQuality.test.ts asserts the vocabulary
//    separation.
//
// Contradiction detection is arithmetic and deterministic. It compares two values
// the lister supplied and reports only when they cannot both be true. It never
// decides which of the two is right, because that is a correction (ADV-6), not a
// reading. No em dashes (Law 2). Western numerals in both locales (Law 7).

import { formatCounted } from "./format";
import { fieldsFor, hasRegistry, type AssetField, type DisplaySection } from "./assetFields";

export type QualityScope =
  | "identity" | "space" | "commercial" | "media" | "location" | "compliance" | "contact";

export type CheckState = "present" | "missing" | "not_applicable";

// essential: the listing cannot be read without it. expected: a professional
// listing carries it. enriching: it makes the listing better, its absence is not
// a defect.
export type CheckWeight = "essential" | "expected" | "enriching";

export interface QualityCheck {
  key: string;
  scope: QualityScope;
  weight: CheckWeight;
  state: CheckState;
  label_en: string;
  label_ar: string;
  // Why the check exists, in the reader's terms. Present on every check in both
  // locales so a surface can always explain a deduction rather than assert it.
  why_en: string;
  why_ar: string;
}

export type ContradictionKind =
  | "rent_total_vs_rate"
  | "sale_price_vs_rate"
  | "lease_with_sale_price"
  | "sale_with_rent"
  | "break_after_lease_term"
  | "rent_free_over_lease_term"
  | "expiry_before_publication"
  | "permit_expired_while_published"
  | "mezzanine_over_area"
  | "value_outside_declared_range";

export interface Contradiction {
  kind: ContradictionKind;
  fields: string[];          // the keys that disagree, in the order stated
  statement_en: string;
  statement_ar: string;
}

export type QualityBand = "contradicted" | "incomplete" | "basic" | "good" | "strong";

export interface ListingQuality {
  checks: QualityCheck[];
  contradictions: Contradiction[];
  score: number;             // 0 to 100, derived from `checks` alone
  band: QualityBand;
  missingEssential: string[];  // check keys, in check order
}

// The listing row plus the two counts that do not live on it. There is no photos
// column: media rows live in listing_media and documents in listing_documents, so
// the caller passes the counts it already queried.
export interface ListingFacts {
  asset_type?: string | null;
  deal_type?: string | null;
  title_en?: string | null;
  title_ar?: string | null;
  description_en?: string | null;
  description_ar?: string | null;
  area_sqm?: number | null;
  asking_rent_sqm?: number | null;
  asking_rent_total?: number | null;
  sale_price?: number | null;
  sale_price_sqm?: number | null;
  lease_term_months?: number | null;
  break_option_months?: number | null;
  rent_free_months?: number | null;
  lat?: number | null;
  lng?: number | null;
  district_id?: string | null;
  building_id?: string | null;
  contact_phone?: string | null;
  contact_email?: string | null;
  ad_permit_number?: string | null;
  ad_permit_no?: string | null;
  ad_permit_expires_at?: string | null;
  right_to_market_confirmed?: boolean | null;
  availability_confirmed_at?: string | null;
  published_at?: string | null;
  expires_at?: string | null;
  floorplan_url?: string | null;
  video_url?: string | null;
  attributes?: Record<string, unknown> | null;
  photo_count?: number | null;
  document_count?: number | null;
  [key: string]: unknown;    // registry fields that map to a typed column
}

// The two registry keys the platform-level price check already owns, so they are
// not counted twice. Same set as the intake form's BASE_OWNED, deliberately.
// Exported because a surface that asks for these fields must not also claim a
// `field:` check for them: the check does not exist, and a step that counted one
// would report a denominator it can never fill.
export const PLATFORM_OWNED_FIELD_KEYS: ReadonlySet<string> = new Set([
  "asking_rent_sqm",
  "sale_price",
]);
const BASE_OWNED = PLATFORM_OWNED_FIELD_KEYS;

// A professional set, not a gallery. Six is the point past which a viewer can see
// the space rather than a photograph of it.
export const PHOTO_SET_MIN = 6;

const POINTS: Record<CheckWeight, number> = { essential: 3, expected: 2, enriching: 1 };

const STRONG_MIN = 85;
const GOOD_MIN = 65;

function isFilled(v: unknown): boolean {
  if (v === null || v === undefined) return false;
  if (typeof v === "string") return v.trim() !== "";
  if (typeof v === "number") return Number.isFinite(v);
  if (Array.isArray(v)) return v.length > 0;
  return true;   // booleans, including a stored false, are an answer
}

function num(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function time(v: unknown): number | null {
  if (typeof v !== "string" || v.trim() === "") return null;
  const t = Date.parse(v);
  return Number.isFinite(t) ? t : null;
}

function attrOf(facts: ListingFacts, key: string): unknown {
  const a = facts.attributes;
  return a && typeof a === "object" ? (a as Record<string, unknown>)[key] : undefined;
}

// A registry field reads from its typed column when it declares one, else from
// the attributes jsonb, matching the composer and intakeValidation exactly.
function fieldValue(facts: ListingFacts, field: AssetField): unknown {
  if (field.column) return facts[field.column];
  return attrOf(facts, field.key);
}

function check(
  key: string,
  scope: QualityScope,
  weight: CheckWeight,
  state: CheckState,
  label_en: string,
  label_ar: string,
  why_en: string,
  why_ar: string,
): QualityCheck {
  return { key, scope, weight, state, label_en, label_ar, why_en, why_ar };
}

function stateOf(filled: boolean): CheckState {
  return filled ? "present" : "missing";
}

// The platform-level checks, true of every asset type. Deal type decides which of
// the two price shapes applies; the other is not_applicable rather than missing,
// because a lease listing is not incomplete for having no sale price.
// An expired licence stays `present` here and is reported as a contradiction. A
// completeness check answers whether the fact was supplied; whether the fact is
// still true on today's date is a different reading, and collapsing the two would
// hide one of them.
function platformChecks(facts: ListingFacts): QualityCheck[] {
  const deal = typeof facts.deal_type === "string" ? facts.deal_type.toLowerCase() : "";
  const isSale = deal === "sale";
  const isLease = deal === "lease";

  const priceState: CheckState = isSale
    ? stateOf(isFilled(facts.sale_price))
    : isLease
      ? stateOf(isFilled(facts.asking_rent_sqm) || isFilled(facts.asking_rent_total))
      : stateOf(
          isFilled(facts.sale_price) ||
          isFilled(facts.asking_rent_sqm) ||
          isFilled(facts.asking_rent_total),
        );

  const photos = num(facts.photo_count) ?? 0;
  const docs = num(facts.document_count) ?? 0;
  const permit = isFilled(facts.ad_permit_number) || isFilled(facts.ad_permit_no);
  const permitExpiry = time(facts.ad_permit_expires_at);

  return [
    check("title_en", "identity", "essential", stateOf(isFilled(facts.title_en)),
      "English title", "العنوان بالإنجليزية",
      "The English title is the first thing a reader sees in search results.",
      "العنوان بالإنجليزية أول ما يظهر للقارئ في نتائج البحث."),
    check("title_ar", "identity", "essential", stateOf(isFilled(facts.title_ar)),
      "Arabic title", "العنوان بالعربية",
      "Arabic readers see the Arabic title, not a translated English one.",
      "قارئ العربية يرى العنوان العربي، لا ترجمة للعنوان الإنجليزي."),
    check("description_en", "identity", "expected", stateOf(isFilled(facts.description_en)),
      "English description", "الوصف بالإنجليزية",
      "A description states what the field list cannot: access, condition and terms.",
      "الوصف يوضّح ما لا تقوله قائمة الحقول: الوصول والحالة والشروط."),
    check("description_ar", "identity", "expected", stateOf(isFilled(facts.description_ar)),
      "Arabic description", "الوصف بالعربية",
      "Bilingual parity: the Arabic reader gets the same detail, not less.",
      "التكافؤ بين اللغتين: يحصل القارئ العربي على التفاصيل نفسها دون نقص."),

    check("area_sqm", "space", "essential", stateOf(num(facts.area_sqm) !== null),
      "Area", "المساحة",
      "Area sets the unit rate and every comparison the listing appears in.",
      "المساحة تحدد سعر المتر وكل مقارنة تظهر فيها هذه القائمة."),

    check("price", "commercial", "essential", priceState,
      isSale ? "Asking price" : "Asking rent", isSale ? "السعر المطلوب" : "الإيجار المطلوب",
      "A listing without a figure cannot be compared or shortlisted.",
      "القائمة بلا رقم لا يمكن مقارنتها أو ضمّها إلى قائمة مختصرة."),

    check("photos", "media", "essential", stateOf(photos > 0),
      "Photographs", "الصور",
      "A space with no photograph is not marketed, it is only listed.",
      "المساحة بلا صورة ليست معروضة للتسويق، بل مسجّلة فقط."),
    check("photo_set", "media", "expected", stateOf(photos >= PHOTO_SET_MIN),
      `Photograph set of ${PHOTO_SET_MIN} or more`, `مجموعة صور من ${PHOTO_SET_MIN} أو أكثر`,
      "One photograph shows a wall. A set shows the space a viewer would walk.",
      "الصورة الواحدة تُظهر جداراً. المجموعة تُظهر المساحة كما يراها الزائر."),
    check("floorplan", "media", "expected", stateOf(isFilled(facts.floorplan_url)),
      "Floor plan", "المخطط",
      "A floor plan is how an occupier tests the space against a requirement.",
      "المخطط هو ما يقيس به المستأجر المساحة أمام متطلباته."),
    check("video", "media", "enriching", stateOf(isFilled(facts.video_url)),
      "Video", "الفيديو",
      "Video shortens the path to a viewing for a reader in another city.",
      "الفيديو يختصر الطريق إلى المعاينة لقارئ في مدينة أخرى."),

    check("coordinates", "location", "essential",
      stateOf(num(facts.lat) !== null && num(facts.lng) !== null),
      "Map position", "الموقع على الخريطة",
      "Without coordinates the listing cannot appear on the map or in a radius search.",
      "بدون إحداثيات لا تظهر القائمة على الخريطة ولا في بحث بنطاق."),
    check("district", "location", "expected", stateOf(isFilled(facts.district_id)),
      "District", "الحي",
      "The district is how most readers narrow a search before they open a map.",
      "الحي هو ما يضيّق به معظم القراء البحث قبل فتح الخريطة."),
    check("building", "location", "enriching", stateOf(isFilled(facts.building_id)),
      "Building record", "سجل المبنى",
      "Linking the building lets building facts be shown as context, not as unit facts.",
      "ربط المبنى يتيح عرض حقائق المبنى كسياق، لا كحقائق عن الوحدة."),

    check("ad_permit", "compliance", "essential", stateOf(permit),
      "Advertising licence number", "رقم رخصة الإعلان",
      "Publishing a commercial advertisement requires the licence number on the listing.",
      "نشر الإعلان التجاري يستلزم وجود رقم الرخصة على القائمة."),
    check("permit_expiry", "compliance", "essential", stateOf(permitExpiry !== null),
      "Licence expiry date", "تاريخ انتهاء الرخصة",
      "A licence with no expiry date cannot be tested against today.",
      "الرخصة بلا تاريخ انتهاء لا يمكن قياسها على تاريخ اليوم."),
    check("right_to_market", "compliance", "essential",
      stateOf(facts.right_to_market_confirmed === true),
      "Right to market confirmed", "إقرار حق التسويق",
      "The lister states the right to market this space before it is published.",
      "يقرّ المُدرِج بحقه في تسويق هذه المساحة قبل نشرها."),
    check("documents", "compliance", "expected", stateOf(docs > 0),
      "Supporting documents", "المستندات الداعمة",
      "Documents are what a later check would read. Without them there is nothing to read.",
      "المستندات هي ما يُقرأ لاحقاً. بدونها لا يوجد ما يُقرأ."),
    check("availability_confirmed", "compliance", "expected",
      stateOf(time(facts.availability_confirmed_at) !== null),
      "Availability affirmed", "تأكيد التوفر",
      "A dated affirmation lets availability decay visibly instead of silently.",
      "التأكيد المؤرّخ يجعل التوفر يتقادم أمام القارئ بدل أن يتقادم بصمت."),

    check("contact", "contact", "essential",
      stateOf(isFilled(facts.contact_phone) || isFilled(facts.contact_email)),
      "Contact route", "وسيلة التواصل",
      "An interested reader needs one route to the person who can answer.",
      "القارئ المهتم يحتاج وسيلة واحدة تصل به إلى من يجيب."),
  ];
}

// One check per registry field for this asset type. Weight comes from what the
// registry already declares: a required field is essential, a filterable field
// drives search and is expected, everything else enriches. A field whose external
// source is not wired yet is not_applicable, so an unbuilt integration never reads
// as a lister's omission.
// The registry's seven display sections map onto the quality scopes without
// inventing an eighth: a market field is read commercially and a suitability field
// is read as a property of the space.
function scopeOfSection(section: DisplaySection): QualityScope {
  switch (section) {
    case "identity": return "identity";
    case "commercial": case "market": return "commercial";
    case "compliance": return "compliance";
    case "location": return "location";
    case "space": case "suitability": default: return "space";
  }
}

function registryChecks(facts: ListingFacts): QualityCheck[] {
  const assetType = typeof facts.asset_type === "string" ? facts.asset_type : "";
  if (!assetType || !hasRegistry(assetType)) return [];

  const out: QualityCheck[] = [];
  for (const field of fieldsFor(assetType)) {
    if (BASE_OWNED.has(field.key)) continue;
    if (field.show_rule === "hidden") continue;

    const weight: CheckWeight = field.required
      ? "essential"
      : field.filterable
        ? "expected"
        : "enriching";

    const state: CheckState = field.available === false
      ? "not_applicable"
      : stateOf(isFilled(fieldValue(facts, field)));

    const why_en = field.available === false
      ? "Defined for this asset type, waiting on its external source."
      : `Part of what a reader expects to see on a ${assetType.replace(/_/g, " ")} listing.`;
    const why_ar = field.available === false
      ? "معرّف لهذا النوع من الأصول وبانتظار مصدره الخارجي."
      : "من ضمن ما يتوقع القارئ رؤيته في قائمة من هذا النوع.";

    out.push(check(`field:${field.key}`, scopeOfSection(field.section),
      weight, state, field.label_en, field.label_ar, why_en, why_ar));
  }
  return out;
}

function fmt(n: number): string {
  // Western numerals in both locales, at most two decimals, no thousands
  // separator inside a statement so the two figures read as a pair.
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100);
}

const TOLERANCE = 0.02;

export function contradictionsOf(facts: ListingFacts, now: number = Date.now()): Contradiction[] {
  const out: Contradiction[] = [];
  const deal = typeof facts.deal_type === "string" ? facts.deal_type.toLowerCase() : "";
  const area = num(facts.area_sqm);
  const rentSqm = num(facts.asking_rent_sqm);
  const rentTotal = num(facts.asking_rent_total);
  const salePrice = num(facts.sale_price);
  const saleSqm = num(facts.sale_price_sqm);

  if (area !== null && area > 0 && rentSqm !== null && rentTotal !== null && rentTotal > 0) {
    const implied = rentSqm * area;
    if (Math.abs(implied - rentTotal) / rentTotal > TOLERANCE) {
      out.push({
        kind: "rent_total_vs_rate",
        fields: ["asking_rent_total", "asking_rent_sqm", "area_sqm"],
        statement_en: `The total rent ${fmt(rentTotal)} and the rate ${fmt(rentSqm)} over ${fmt(area)} m2, which implies ${fmt(implied)}, cannot both be right.`,
        statement_ar: `إجمالي الإيجار ${fmt(rentTotal)} وسعر المتر ${fmt(rentSqm)} على ${fmt(area)} م2، أي ${fmt(implied)}، لا يمكن أن يكونا صحيحين معاً.`,
      });
    }
  }

  if (area !== null && area > 0 && saleSqm !== null && salePrice !== null && salePrice > 0) {
    const implied = saleSqm * area;
    if (Math.abs(implied - salePrice) / salePrice > TOLERANCE) {
      out.push({
        kind: "sale_price_vs_rate",
        fields: ["sale_price", "sale_price_sqm", "area_sqm"],
        statement_en: `The sale price ${fmt(salePrice)} and the price per metre ${fmt(saleSqm)} over ${fmt(area)} m2, which implies ${fmt(implied)}, cannot both be right.`,
        statement_ar: `سعر البيع ${fmt(salePrice)} وسعر المتر ${fmt(saleSqm)} على ${fmt(area)} م2، أي ${fmt(implied)}، لا يمكن أن يكونا صحيحين معاً.`,
      });
    }
  }

  if (deal === "lease" && salePrice !== null) {
    out.push({
      kind: "lease_with_sale_price",
      fields: ["deal_type", "sale_price"],
      statement_en: "The listing is offered for lease and carries a sale price.",
      statement_ar: "القائمة معروضة للإيجار وتحمل سعر بيع.",
    });
  }

  if (deal === "sale" && (rentSqm !== null || rentTotal !== null)) {
    out.push({
      kind: "sale_with_rent",
      fields: ["deal_type", rentSqm !== null ? "asking_rent_sqm" : "asking_rent_total"],
      statement_en: "The listing is offered for sale and carries an asking rent.",
      statement_ar: "القائمة معروضة للبيع وتحمل إيجاراً مطلوباً.",
    });
  }

  const term = num(facts.lease_term_months);
  const brk = num(facts.break_option_months);
  const free = num(facts.rent_free_months);
  if (term !== null && brk !== null && brk > term) {
    out.push({
      kind: "break_after_lease_term",
      fields: ["break_option_months", "lease_term_months"],
      statement_en: `The break option at ${formatCounted(brk, "month", "en")} falls after the lease term of ${formatCounted(term, "month", "en")}.`,
      statement_ar: `خيار الإنهاء عند ${formatCounted(brk, "month", "ar", { oblique: true })} يقع بعد مدة العقد البالغة ${formatCounted(term, "month", "ar", { oblique: true })}.`,
    });
  }
  if (term !== null && free !== null && free > term) {
    out.push({
      kind: "rent_free_over_lease_term",
      fields: ["rent_free_months", "lease_term_months"],
      statement_en: `The rent free period of ${formatCounted(free, "month", "en")} is longer than the lease term of ${formatCounted(term, "month", "en")}.`,
      statement_ar: `فترة الإعفاء من الإيجار البالغة ${formatCounted(free, "month", "ar", { oblique: true })} أطول من مدة العقد البالغة ${formatCounted(term, "month", "ar", { oblique: true })}.`,
    });
  }

  const published = time(facts.published_at);
  const expires = time(facts.expires_at);
  if (published !== null && expires !== null && expires <= published) {
    out.push({
      kind: "expiry_before_publication",
      fields: ["expires_at", "published_at"],
      statement_en: "The listing expiry date is not after its publication date.",
      statement_ar: "تاريخ انتهاء القائمة ليس بعد تاريخ نشرها.",
    });
  }

  const permitExpiry = time(facts.ad_permit_expires_at);
  if (published !== null && permitExpiry !== null && permitExpiry < now) {
    out.push({
      kind: "permit_expired_while_published",
      fields: ["ad_permit_expires_at"],
      statement_en: "The advertising licence expiry date has passed while the listing is published.",
      statement_ar: "تاريخ انتهاء رخصة الإعلان مضى بينما القائمة منشورة.",
    });
  }

  const mezz = num(attrOf(facts, "mezzanine_gla_sqm"));
  if (area !== null && mezz !== null && mezz > area) {
    out.push({
      kind: "mezzanine_over_area",
      fields: ["mezzanine_gla_sqm", "area_sqm"],
      statement_en: `The mezzanine area of ${fmt(mezz)} m2 is larger than the total area of ${fmt(area)} m2.`,
      statement_ar: `مساحة الميزانين ${fmt(mezz)} م2 أكبر من إجمالي المساحة ${fmt(area)} م2.`,
    });
  }

  // The registry already declares the range each numeric field may hold. A stored
  // value outside its own declared range is a contradiction between the value and
  // the schema that accepted it, and it is reported rather than clamped.
  const assetType = typeof facts.asset_type === "string" ? facts.asset_type : "";
  if (assetType && hasRegistry(assetType)) {
    for (const field of fieldsFor(assetType)) {
      const v = field.validation;
      if (!v || (v.min === undefined && v.max === undefined)) continue;
      const value = num(fieldValue(facts, field));
      if (value === null) continue;
      const belowMin = v.min !== undefined && value < v.min;
      const aboveMax = v.max !== undefined && value > v.max;
      if (!belowMin && !aboveMax) continue;
      const bound = belowMin ? (v.min as number) : (v.max as number);
      out.push({
        kind: "value_outside_declared_range",
        fields: [field.key],
        statement_en: belowMin
          ? `${field.label_en} is ${fmt(value)}, below the declared minimum of ${fmt(bound)}.`
          : `${field.label_en} is ${fmt(value)}, above the declared maximum of ${fmt(bound)}.`,
        statement_ar: belowMin
          ? `${field.label_ar} يساوي ${fmt(value)}، وهو دون الحد الأدنى المعلن ${fmt(bound)}.`
          : `${field.label_ar} يساوي ${fmt(value)}، وهو فوق الحد الأعلى المعلن ${fmt(bound)}.`,
      });
    }
  }

  return out;
}

// The score is a pure function of the check list and of nothing else. Not
// applicable checks leave the denominator, so a listing is never marked down for
// a field its asset type does not have or for a source SAT has not wired.
export function scoreFromChecks(checks: QualityCheck[]): number {
  let earned = 0;
  let possible = 0;
  for (const c of checks) {
    if (c.state === "not_applicable") continue;
    const p = POINTS[c.weight];
    possible += p;
    if (c.state === "present") earned += p;
  }
  if (possible === 0) return 0;
  return Math.round((earned / possible) * 100);
}

// The band is not the score alone. A contradiction outranks everything, because a
// listing that disagrees with itself is worse than one that is merely thin. A
// missing essential forces incomplete however high the rest scores.
export function bandFrom(
  score: number,
  missingEssential: string[],
  contradictions: Contradiction[],
): QualityBand {
  if (contradictions.length > 0) return "contradicted";
  if (missingEssential.length > 0) return "incomplete";
  if (score >= STRONG_MIN) return "strong";
  if (score >= GOOD_MIN) return "good";
  return "basic";
}

export function assessListing(facts: ListingFacts, now: number = Date.now()): ListingQuality {
  const checks = [...platformChecks(facts), ...registryChecks(facts)];
  const contradictions = contradictionsOf(facts, now);
  const score = scoreFromChecks(checks);
  const missingEssential = checks
    .filter((c) => c.weight === "essential" && c.state === "missing")
    .map((c) => c.key);
  return {
    checks,
    contradictions,
    score,
    band: bandFrom(score, missingEssential, contradictions),
    missingEssential,
  };
}

export function bandLabel(band: QualityBand, ar: boolean): string {
  switch (band) {
    case "contradicted": return ar ? "معلومات متعارضة" : "Conflicting details";
    case "incomplete": return ar ? "غير مكتملة" : "Incomplete";
    case "basic": return ar ? "أساسية" : "Basic";
    case "good": return ar ? "جيدة" : "Good";
    case "strong": return ar ? "قوية" : "Strong";
  }
}

export function scopeLabel(scope: QualityScope, ar: boolean): string {
  switch (scope) {
    case "identity": return ar ? "التعريف" : "Identity";
    case "space": return ar ? "المساحة" : "Space";
    case "commercial": return ar ? "الشروط التجارية" : "Commercial terms";
    case "media": return ar ? "الصور والمخططات" : "Media";
    case "location": return ar ? "الموقع" : "Location";
    case "compliance": return ar ? "الالتزام النظامي" : "Compliance";
    case "contact": return ar ? "التواصل" : "Contact";
  }
}

export function weightLabel(weight: CheckWeight, ar: boolean): string {
  switch (weight) {
    case "essential": return ar ? "أساسي" : "Essential";
    case "expected": return ar ? "متوقع" : "Expected";
    case "enriching": return ar ? "إضافي" : "Enriching";
  }
}

// What is missing, in the order a lister should fix it: essentials first, then
// expected, then enriching, and within each in check order. This is the list the
// Listing Studio renders as its explicit statement of what the listing lacks.
export function missingChecks(quality: ListingQuality): QualityCheck[] {
  const order: CheckWeight[] = ["essential", "expected", "enriching"];
  const out: QualityCheck[] = [];
  for (const w of order) {
    for (const c of quality.checks) {
      if (c.weight === w && c.state === "missing") out.push(c);
    }
  }
  return out;
}
