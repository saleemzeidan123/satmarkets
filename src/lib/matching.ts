// Requirement matching, stated rather than scored.
//
// An occupier posts a requirement. The platform holds published listings. The
// question "does this listing answer that requirement" is answered here, once,
// as a set of named dimensions with a state each, and the verdict is derived
// from those states rather than asserted alongside them. Nothing on any surface
// may print a match without printing the reasons, because a match with no
// reasons is a recommendation, and a recommendation is a claim SAT cannot
// evidence.
//
// Four properties this is built to hold.
//
// 1. A fact the listing does not state is UNKNOWN, never a pass and never a
//    fail. This is the ADV-1 rule at the matching layer: unknown data does not
//    become known data by being compared to something. An unknown dimension
//    carries a remedy naming the fact that would resolve it, so the answer to
//    "why is this only a possible match" is always a fact somebody can supply.
// 2. A free-text must-have is never inferred from structured fields. "Heavy
//    power" and "metro nearby" are phrases an occupier typed; the platform
//    holds no field that answers them, so every must-have is unknown until a
//    person confirms it. A brief with must-haves therefore has no exact match
//    by construction, which is the honest result.
// 3. Tolerance is declared, not hidden. A listing that misses a stated size or
//    budget by a small, published margin is a POSSIBLE match whose reason says
//    by how much. It is never quietly rounded into an exact one.
// 4. Eligibility comes before comparison. A draft, a demo row facing a real
//    requirement, or an advertisement whose licence has expired is excluded
//    with a stated exclusion, not scored badly. Exclusion is a permission
//    question and permission questions are answered first.
//
// Pure: no I/O, no React, no clock of its own beyond an injected `now`.

import { foldText } from "./textFold";
import { formatArea, formatCounted, formatWithUnit, type Loc } from "./format";
import { sizeRange } from "./requirementFigures";
import { availabilityOf } from "./availability";
import { assetLabel, cityLabel, dealLabel } from "./labels";
import { isUrgentTimeline, timelineLabel, mustHaveLabel } from "./requirementIntake";

// Published tolerances. These are the only two places a near miss is allowed,
// and both of them say so on the result.
export const SIZE_TOLERANCE_PCT = 10;
export const BUDGET_TOLERANCE_PCT = 10;

// Timelines that make availability part of the question live in
// `requirementIntake`, with the tokens the form offers and the labels each one
// carries, because this set used to be a third independent literal: the form had
// one list, the write path had another and this had a third, and the Arabic
// urgent option matched none of them (PKG-DEM1, finding 100).

export type MatchState = "met" | "tolerance" | "unknown" | "failed";

export type MatchVerdict = "exact" | "possible" | "needs_clarification" | "no";

export type MatchDimensionKind =
  | "asset_type"
  | "deal_type"
  | "city"
  | "district"
  | "size"
  | "budget"
  | "timeline"
  | "must_have";

export type MatchExclusionKind = "not_published" | "demo_boundary" | "permit_expired";

export interface MatchReason {
  key: string;            // unique within one result
  dimension: MatchDimensionKind;
  state: MatchState;
  label_en: string;
  label_ar: string;
  reason_en: string;      // states both sides of the comparison, never a verdict word alone
  reason_ar: string;
  remedy_en?: string;     // present exactly when the state is unknown
  remedy_ar?: string;
}

export interface MatchExclusion {
  kind: MatchExclusionKind;
  reason_en: string;
  reason_ar: string;
}

export interface MatchResult {
  eligible: boolean;
  verdict: MatchVerdict;
  exclusion: MatchExclusion | null;
  reasons: MatchReason[];
  met: number;
  tolerance: number;
  unknown: number;
  failed: number;
}

export interface MatchRequirement {
  asset_type: string;
  deal_type: string;
  city?: string | null;
  district_id?: string | null;
  district_label_en?: string | null;
  district_label_ar?: string | null;
  size_min_sqm?: number | null;
  size_max_sqm?: number | null;
  budget_sqm_max?: number | null;
  timeline?: string | null;
  must_haves?: string[] | null;
  is_demo?: boolean | null;
}

export interface MatchListing {
  id: string;
  status: string;
  asset_type: string;
  deal_type: string;
  city?: string | null;
  district_id?: string | null;
  area_sqm?: number | null;
  asking_rent_sqm?: number | null;
  sale_price?: number | null;
  availability_confirmed_at?: string | null;
  ad_permit_expires_at?: string | null;
  is_demo?: boolean | null;
}

const num = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

// Western numerals in both languages (Law 7). Whole numbers stay whole; anything
// else keeps one decimal, which is as much precision as a rate or a margin
// carries in a sentence a person reads.
//
// PKG-FIG1, finding 128. `fmt` survives only for the PERCENTAGES, which carry
// their own word ("percent", "بالمئة") and no unit. Every figure that has a unit
// left it. It said `${fmt(budget)} per sqm`, in Arabic `${fmt(budget)} للمتر
// المربع`, which names an area and NO CURRENCY AND NO PERIOD: the occupier was
// shown a ceiling of "2000 per sqm" for a number the form collected under the
// label "Budget ceiling (SAR/m²·yr)". A rate with the currency taken off is not
// a smaller version of the figure, it is a different figure, and the reader has
// no way to tell which one they are looking at.
const fmt = (n: number): string => (Number.isInteger(n) ? String(n) : String(Math.round(n * 10) / 10));
const money = (n: number, locale: Loc): string => formatWithUnit(n, "sar_sqm_year", locale, "short", 0);

const same = (a: unknown, b: unknown): boolean => {
  const x = foldText(String(a ?? ""));
  const y = foldText(String(b ?? ""));
  return x.length > 0 && x === y;
};

// The listing's per square metre figure, which is the unit the requirement's
// budget is stated in. A lease states it directly. A sale states a total, and
// dividing it by a stated area is arithmetic on two facts the listing already
// carries, so it is derived here rather than asked for again. If either fact is
// missing the answer is null, which becomes an unknown dimension, never a zero.
export function ratePerSqm(l: MatchListing): number | null {
  if (l.deal_type === "sale") {
    const total = num(l.sale_price);
    const area = num(l.area_sqm);
    if (total === null || area === null || area <= 0) return null;
    return total / area;
  }
  return num(l.asking_rent_sqm);
}

function reason(r: MatchReason): MatchReason {
  return r;
}

// Every stated dimension of the requirement, compared to what the listing says.
// A dimension the requirement does not state is absent from the list entirely:
// silence in a brief is not a constraint, and an unconstrained dimension that
// appeared as "met" would inflate the count of things actually checked.
export function matchReasons(
  req: MatchRequirement,
  listing: MatchListing,
  now: number = Date.now(),
): MatchReason[] {
  const out: MatchReason[] = [];

  // Asset type and deal type are always stated on both sides and both are
  // required columns, so neither can be unknown. They are the two facts that
  // make the rest of the comparison meaningful at all.
  const reqAsset = { en: assetLabel(req.asset_type, "en"), ar: assetLabel(req.asset_type, "ar") };
  const lAsset = { en: assetLabel(listing.asset_type, "en"), ar: assetLabel(listing.asset_type, "ar") };
  const reqDeal = { en: dealLabel(req.deal_type, "en"), ar: dealLabel(req.deal_type, "ar") };
  const lDeal = { en: dealLabel(listing.deal_type, "en"), ar: dealLabel(listing.deal_type, "ar") };

  out.push(
    same(req.asset_type, listing.asset_type)
      ? reason({
          key: "asset_type", dimension: "asset_type", state: "met",
          label_en: "Asset type", label_ar: "نوع الأصل",
          reason_en: `The requirement asks for ${reqAsset.en} and this listing is ${lAsset.en}.`,
          reason_ar: `المتطلب يطلب ${reqAsset.ar} وهذه القائمة ${lAsset.ar}.`,
        })
      : reason({
          key: "asset_type", dimension: "asset_type", state: "failed",
          label_en: "Asset type", label_ar: "نوع الأصل",
          reason_en: `The requirement asks for ${reqAsset.en}. This listing is ${lAsset.en}.`,
          reason_ar: `المتطلب يطلب ${reqAsset.ar}. هذه القائمة ${lAsset.ar}.`,
        }),
  );

  out.push(
    same(req.deal_type, listing.deal_type)
      ? reason({
          key: "deal_type", dimension: "deal_type", state: "met",
          label_en: "Deal type", label_ar: "نوع الصفقة",
          reason_en: `Both the requirement and the listing are ${lDeal.en}.`,
          reason_ar: `المتطلب والقائمة كلاهما ${lDeal.ar}.`,
        })
      : reason({
          key: "deal_type", dimension: "deal_type", state: "failed",
          label_en: "Deal type", label_ar: "نوع الصفقة",
          reason_en: `The requirement is ${reqDeal.en} and this listing is ${lDeal.en}.`,
          reason_ar: `المتطلب ${reqDeal.ar} وهذه القائمة ${lDeal.ar}.`,
        }),
  );

  // City. Stated on the brief far more often than a district is, so it carries
  // the location question on its own when no district was chosen.
  const reqCity = String(req.city ?? "").trim();
  if (reqCity) {
    const lCity = String(listing.city ?? "").trim();
    // Cities are rendered through the shared label table, never as the raw
    // stored value, so a slug in the column can never reach a reader.
    const rc = { en: cityLabel(reqCity, "en"), ar: cityLabel(reqCity, "ar") };
    const lc = { en: cityLabel(lCity, "en"), ar: cityLabel(lCity, "ar") };
    if (!lCity) {
      out.push(reason({
        key: "city", dimension: "city", state: "unknown",
        label_en: "City", label_ar: "المدينة",
        reason_en: `The requirement is for ${rc.en}. This listing does not state a city.`,
        reason_ar: `المتطلب في ${rc.ar}. هذه القائمة لا تذكر المدينة.`,
        remedy_en: "The lister states the city on the listing.",
        remedy_ar: "يذكر المُدرِج المدينة في القائمة.",
      }));
    } else if (same(reqCity, lCity)) {
      out.push(reason({
        key: "city", dimension: "city", state: "met",
        label_en: "City", label_ar: "المدينة",
        reason_en: `Both are in ${lc.en}.`,
        reason_ar: `كلاهما في ${lc.ar}.`,
      }));
    } else {
      out.push(reason({
        key: "city", dimension: "city", state: "failed",
        label_en: "City", label_ar: "المدينة",
        reason_en: `The requirement is for ${rc.en}. This listing is in ${lc.en}.`,
        reason_ar: `المتطلب في ${rc.ar}. هذه القائمة في ${lc.ar}.`,
      }));
    }
  }

  // District. A different district in the same city is a possible answer, not a
  // refusal, because an occupier who named one district will usually look at the
  // next one. A different city has already failed above, so this stays quiet
  // about cities entirely.
  const reqDistrict = String(req.district_id ?? "").trim();
  if (reqDistrict) {
    const label_en = String(req.district_label_en ?? "").trim();
    const label_ar = String(req.district_label_ar ?? "").trim() || label_en;
    const named_en = label_en ? ` (${label_en})` : "";
    const named_ar = label_ar ? ` (${label_ar})` : "";
    const lDistrict = String(listing.district_id ?? "").trim();
    if (!lDistrict) {
      out.push(reason({
        key: "district", dimension: "district", state: "unknown",
        label_en: "District", label_ar: "الحي",
        reason_en: `The requirement names a district${named_en}. This listing is not assigned to a district.`,
        reason_ar: `المتطلب يحدد حياً${named_ar}. هذه القائمة غير مرتبطة بحي.`,
        remedy_en: "The lister pins the location so the district can be derived.",
        remedy_ar: "يحدد المُدرِج الموقع على الخريطة ليُشتق الحي.",
      }));
    } else if (reqDistrict === lDistrict) {
      out.push(reason({
        key: "district", dimension: "district", state: "met",
        label_en: "District", label_ar: "الحي",
        reason_en: `This listing is in the district the requirement names${named_en}.`,
        reason_ar: `هذه القائمة في الحي الذي يحدده المتطلب${named_ar}.`,
      }));
    } else {
      out.push(reason({
        key: "district", dimension: "district", state: "tolerance",
        label_en: "District", label_ar: "الحي",
        reason_en: `This listing is in a different district from the one the requirement names${named_en}.`,
        reason_ar: `هذه القائمة في حي مختلف عن الحي الذي يحدده المتطلب${named_ar}.`,
      }));
    }
  }

  // Size. The brief states a range, the listing states an area, and a miss is
  // reported as the percentage it missed by rather than as a bare refusal.
  const min = num(req.size_min_sqm);
  const max = num(req.size_max_sqm);
  if (min !== null || max !== null) {
    const area = num(listing.area_sqm);
    // PKG-FIG1, finding 128. These four lines built a requirement's size range
    // by hand, in a unit spelling no surface on this platform renders: `sqm` and
    // `متر مربع`, where every visitor screen, the flyer and `format.ts` itself
    // say `m²` and `م²`. `fmt` is `String(n)`, so the figures arrived ungrouped
    // as well: the occupier read "1200 sqm" where the listing card beside it read
    // "1,200 m²". `requirementFigures.sizeRange` already renders exactly this
    // fact, in both languages, isolated, with the half-open case handled, and it
    // was written for this column. The match explanation is read by the occupier
    // and by the lister, so it is a visitor surface and it takes the visitor
    // spelling.
    const range_en = sizeRange(min, max, "en") as string;
    const range_ar = sizeRange(min, max, "ar") as string;
    if (area === null) {
      out.push(reason({
        key: "size", dimension: "size", state: "unknown",
        label_en: "Size", label_ar: "المساحة",
        reason_en: `The requirement is ${range_en}. This listing does not state an area.`,
        reason_ar: `المتطلب ${range_ar}. هذه القائمة لا تذكر المساحة.`,
        remedy_en: "The lister states the area in square metres.",
        remedy_ar: "يذكر المُدرِج المساحة بالمتر المربع.",
      }));
    } else {
      const shortBy = min !== null && area < min ? ((min - area) / min) * 100 : 0;
      const overBy = max !== null && area > max ? ((area - max) / max) * 100 : 0;
      const off = Math.max(shortBy, overBy);
      if (off === 0) {
        out.push(reason({
          key: "size", dimension: "size", state: "met",
          label_en: "Size", label_ar: "المساحة",
          reason_en: `${formatArea(area, "en")} falls inside the requirement, ${range_en}.`,
          reason_ar: `${formatArea(area, "ar")} ضمن المطلوب ${range_ar}.`,
        }));
      } else if (off <= SIZE_TOLERANCE_PCT) {
        out.push(reason({
          key: "size", dimension: "size", state: "tolerance",
          label_en: "Size", label_ar: "المساحة",
          reason_en: `${formatArea(area, "en")} is ${fmt(off)} percent outside the requirement, ${range_en}, within the ${SIZE_TOLERANCE_PCT} percent margin SAT treats as a possible answer.`,
          reason_ar: `${formatArea(area, "ar")} خارج المطلوب ${range_ar} بنسبة ${fmt(off)} بالمئة، ضمن هامش ${SIZE_TOLERANCE_PCT} بالمئة الذي تعدّه سات إجابة محتملة.`,
        }));
      } else {
        out.push(reason({
          key: "size", dimension: "size", state: "failed",
          label_en: "Size", label_ar: "المساحة",
          reason_en: `${formatArea(area, "en")} is ${fmt(off)} percent outside the requirement, ${range_en}.`,
          reason_ar: `${formatArea(area, "ar")} خارج المطلوب ${range_ar} بنسبة ${fmt(off)} بالمئة.`,
        }));
      }
    }
  }

  // Budget, compared per square metre in both directions of the deal. A sale
  // needs an area before its total can be read as a rate, so a sale with no area
  // is unknown here as well as on the size dimension: two different facts are
  // missing for two different reasons.
  const budget = num(req.budget_sqm_max);
  if (budget !== null && budget > 0) {
    const rate = ratePerSqm(listing);
    if (rate === null) {
      const missing_en = listing.deal_type === "sale"
        ? "This listing does not state a price and an area together, so a rate per square metre cannot be read from it."
        : "This listing does not state an asking rent.";
      const missing_ar = listing.deal_type === "sale"
        ? "هذه القائمة لا تذكر السعر والمساحة معاً، فلا يمكن استخراج سعر المتر المربع منها."
        : "هذه القائمة لا تذكر الإيجار المطلوب.";
      out.push(reason({
        key: "budget", dimension: "budget", state: "unknown",
        label_en: "Budget", label_ar: "الميزانية",
        reason_en: `The requirement sets a ceiling of ${money(budget, "en")}. ${missing_en}`,
        reason_ar: `المتطلب يضع سقفاً قدره ${money(budget, "ar")}. ${missing_ar}`,
        remedy_en: listing.deal_type === "sale" ? "The lister states the price and the area." : "The lister states the asking rent per square metre.",
        remedy_ar: listing.deal_type === "sale" ? "يذكر المُدرِج السعر والمساحة." : "يذكر المُدرِج الإيجار المطلوب للمتر المربع.",
      }));
    } else if (rate <= budget) {
      out.push(reason({
        key: "budget", dimension: "budget", state: "met",
        label_en: "Budget", label_ar: "الميزانية",
        reason_en: `${money(rate, "en")} is at or below the ceiling of ${money(budget, "en")}.`,
        reason_ar: `${money(rate, "ar")} عند السقف ${money(budget, "ar")} أو دونه.`,
      }));
    } else {
      const over = ((rate - budget) / budget) * 100;
      if (over <= BUDGET_TOLERANCE_PCT) {
        out.push(reason({
          key: "budget", dimension: "budget", state: "tolerance",
          label_en: "Budget", label_ar: "الميزانية",
          reason_en: `${money(rate, "en")} is ${fmt(over)} percent above the ceiling of ${money(budget, "en")}, within the ${BUDGET_TOLERANCE_PCT} percent margin SAT treats as a possible answer.`,
          reason_ar: `${money(rate, "ar")} أعلى من السقف ${money(budget, "ar")} بنسبة ${fmt(over)} بالمئة، ضمن هامش ${BUDGET_TOLERANCE_PCT} بالمئة الذي تعدّه سات إجابة محتملة.`,
        }));
      } else {
        out.push(reason({
          key: "budget", dimension: "budget", state: "failed",
          label_en: "Budget", label_ar: "الميزانية",
          reason_en: `${money(rate, "en")} is ${fmt(over)} percent above the ceiling of ${money(budget, "en")}.`,
          reason_ar: `${money(rate, "ar")} أعلى من السقف ${money(budget, "ar")} بنسبة ${fmt(over)} بالمئة.`,
        }));
      }
    }
  }

  // Timeline, and only when the timeline makes availability part of the
  // question. The fact read here is the dated affirmation, never updated_at and
  // never the publication date, so an old affirmation reads as an unknown rather
  // than as a live space.
  const timeline = String(req.timeline ?? "").trim();
  if (timeline && isUrgentTimeline(timeline)) {
    // The timeline reads as a label in each language rather than as the stored
    // token, so an Arabic reader is never shown an English word. Both sides come
    // from the vocabulary now: the English side used to print the raw token, so
    // one requirement said "ASAP" and the next said "Immediate" for the same
    // answer.
    const tl = { en: timelineLabel(timeline, false), ar: timelineLabel(timeline, true) };
    const a = availabilityOf(listing.availability_confirmed_at, now);
    if (!a) {
      out.push(reason({
        key: "timeline", dimension: "timeline", state: "unknown",
        label_en: "Timeline", label_ar: "الإطار الزمني",
        reason_en: `The requirement is ${tl.en}. Availability has never been affirmed on this listing.`,
        reason_ar: `المتطلب ${tl.ar}. لم يُؤكَّد التوفر على هذه القائمة من قبل.`,
        remedy_en: "The lister affirms the space is available.",
        remedy_ar: "يؤكد المُدرِج أن المساحة متاحة.",
      }));
    } else if (a.state === "stale") {
      out.push(reason({
        key: "timeline", dimension: "timeline", state: "unknown",
        label_en: "Timeline", label_ar: "الإطار الزمني",
        reason_en: `The requirement is ${tl.en}. Availability was last affirmed ${formatCounted(a.days, "day", "en")} ago, which is too old to answer it.`,
        reason_ar: `المتطلب ${tl.ar}. آخر تأكيد للتوفر كان قبل ${formatCounted(a.days, "day", "ar", { oblique: true })}، وهو أقدم من أن يجيب عليه.`,
        remedy_en: "The lister confirms the space is still available.",
        remedy_ar: "يؤكد المُدرِج أن المساحة ما زالت متاحة.",
      }));
    } else if (a.state === "aging") {
      out.push(reason({
        key: "timeline", dimension: "timeline", state: "tolerance",
        label_en: "Timeline", label_ar: "الإطار الزمني",
        reason_en: `The requirement is ${tl.en} and availability was affirmed ${formatCounted(a.days, "day", "en")} ago.`,
        reason_ar: `المتطلب ${tl.ar} وقد تأكد التوفر قبل ${formatCounted(a.days, "day", "ar", { oblique: true })}.`,
      }));
    } else {
      out.push(reason({
        key: "timeline", dimension: "timeline", state: "met",
        label_en: "Timeline", label_ar: "الإطار الزمني",
        reason_en: `The requirement is ${tl.en} and availability was affirmed ${formatCounted(a.days, "day", "en")} ago.`,
        reason_ar: `المتطلب ${tl.ar} وقد تأكد التوفر قبل ${formatCounted(a.days, "day", "ar", { oblique: true })}.`,
      }));
    }
  }

  // Must-haves. The platform holds no field that answers a phrase somebody
  // typed, and guessing one from a registry attribute would be exactly the
  // conversion of unknown into known that ADV-1 forbids. Each one is carried
  // through as an open question with the phrase quoted back, so the person who
  // can answer it sees precisely what was asked.
  const musts = Array.isArray(req.must_haves) ? req.must_haves : [];
  const seen = new Set<string>();
  for (const raw of musts) {
    const phrase = String(raw ?? "").trim();
    if (!phrase) continue;
    const k = foldText(phrase);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(reason({
      key: `must_have:${k}`, dimension: "must_have", state: "unknown",
      label_en: "Must have", label_ar: "شرط أساسي",
      reason_en: `The requirement lists "${mustHaveLabel(phrase, false)}". SAT holds no record that states whether this space has it.`,
      reason_ar: `المتطلب يذكر "${mustHaveLabel(phrase, true)}". لا تحتفظ سات بسجل يبيّن توفره في هذه المساحة.`,
      remedy_en: "The lister or the broker confirms it in writing.",
      remedy_ar: "يؤكده المُدرِج أو الوسيط كتابةً.",
    }));
    if (seen.size >= 12) break;
  }

  return out;
}

// Whether this listing may be offered against this requirement at all. Answered
// before any comparison, because a listing that cannot be shown does not get a
// near miss recorded against it.
//
// An advertisement whose licence has expired is excluded. A listing with no
// licence number at all is not excluded here: publication is where that gate
// belongs, and duplicating it in the matcher would hide a publication defect
// behind a matching result.
export function matchExclusion(
  req: MatchRequirement,
  listing: MatchListing,
  now: number = Date.now(),
): MatchExclusion | null {
  if (listing.status !== "published") {
    return {
      kind: "not_published",
      reason_en: "This listing is not published, so it is not offered against any requirement.",
      reason_ar: "هذه القائمة غير منشورة، فلا تُعرض على أي متطلب.",
    };
  }
  if ((listing.is_demo === true) !== (req.is_demo === true)) {
    return {
      kind: "demo_boundary",
      reason_en: "A demonstration record and a real record are never matched to each other.",
      reason_ar: "لا يُطابق السجل التجريبي مع السجل الحقيقي أبداً.",
    };
  }
  const expiry = listing.ad_permit_expires_at ? Date.parse(listing.ad_permit_expires_at) : NaN;
  if (Number.isFinite(expiry) && expiry < now) {
    return {
      kind: "permit_expired",
      reason_en: "The advertising licence on this listing has expired.",
      reason_ar: "انتهت صلاحية رخصة الإعلان على هذه القائمة.",
    };
  }
  return null;
}

// The verdict, derived from the states and from nothing else.
//
// Severity runs failed, then unknown, then tolerance. One failed dimension is a
// refusal however many others passed, because an occupier who asked for a
// warehouse is not helped by an excellent office. One unknown dimension outranks
// any number of tolerances, because a question nobody has answered is a
// different thing from a margin somebody has measured.
export function verdictFrom(reasons: MatchReason[]): MatchVerdict {
  let failed = 0, unknown = 0, tolerance = 0;
  for (const r of reasons) {
    if (r.state === "failed") failed++;
    else if (r.state === "unknown") unknown++;
    else if (r.state === "tolerance") tolerance++;
  }
  if (failed > 0) return "no";
  if (unknown > 0) return "needs_clarification";
  if (tolerance > 0) return "possible";
  return "exact";
}

export function matchListing(
  req: MatchRequirement,
  listing: MatchListing,
  now: number = Date.now(),
): MatchResult {
  const exclusion = matchExclusion(req, listing, now);
  if (exclusion) {
    return { eligible: false, verdict: "no", exclusion, reasons: [], met: 0, tolerance: 0, unknown: 0, failed: 0 };
  }
  const reasons = matchReasons(req, listing, now);
  let met = 0, tolerance = 0, unknown = 0, failed = 0;
  for (const r of reasons) {
    if (r.state === "met") met++;
    else if (r.state === "tolerance") tolerance++;
    else if (r.state === "unknown") unknown++;
    else failed++;
  }
  return { eligible: true, verdict: verdictFrom(reasons), exclusion: null, reasons, met, tolerance, unknown, failed };
}

// Presentation order for a list of matches. Better verdict first, then the one
// with more dimensions actually met, then the one with fewer open questions.
// Deterministic and total, so the same set of matches is always presented in the
// same order to both parties.
export const VERDICT_RANK: Record<MatchVerdict, number> = {
  exact: 0, possible: 1, needs_clarification: 2, no: 3,
};

export function compareMatches(a: MatchResult, b: MatchResult): number {
  const v = VERDICT_RANK[a.verdict] - VERDICT_RANK[b.verdict];
  if (v !== 0) return v;
  if (b.met !== a.met) return b.met - a.met;
  return a.unknown - b.unknown;
}

// The verdict as a person reads it. A verdict word alone is not enough on any
// surface, but the word still has to be the same word everywhere it appears.
export function verdictLabel(v: MatchVerdict, ar: boolean): string {
  if (v === "exact") return ar ? "مطابق لكل شرط مذكور" : "Meets every stated requirement";
  if (v === "possible") return ar ? "مطابقة محتملة" : "Possible match";
  if (v === "needs_clarification") return ar ? "يحتاج توضيحاً" : "Needs clarification";
  return ar ? "غير مطابق" : "Not a match";
}

/* ELITE-4 J4-6: the state of one dimension, as a word.
 *
 * `reason_en` states both sides of the comparison and never a verdict word
 * alone, and `label_en` is the dimension name, so the exposed text of a reason
 * row names nothing about its state. Every surface carried the state in a
 * colour and in a glyph marked aria-hidden, which left a screen reader unable
 * to tell a met dimension from a failed one. This is that word, in both
 * languages, rendered visually hidden beside each row. It is deliberately not
 * shown to sighted readers, who already have the mark and the sentence. */
export function stateLabel(s: MatchState, ar: boolean): string {
  if (s === "met") return ar ? "مستوفى" : "Met";
  if (s === "tolerance") return ar ? "ضمن الهامش المعلن" : "Within the published margin";
  if (s === "unknown") return ar ? "سؤال مفتوح" : "Open question";
  return ar ? "غير مستوفى" : "Not met";
}
