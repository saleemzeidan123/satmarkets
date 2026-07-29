// The decision pack: what a shortlist has to state before it can be decided on.
//
// A shortlist is not a decision. An occupier who has saved four spaces holds
// four records of uneven completeness, and the temptation of every property
// platform is to line them up in a table and let the layout imply they are
// comparable. They usually are not. One states a service charge and three do
// not; two quote rent per square metre and one quotes a total; every one of
// them states an area and none of them states whether that area is net or
// gross. Printed side by side, the missing facts read as zeros and the reader
// makes a decision on arithmetic nobody performed.
//
// This model exists to stop that. It answers two questions and refuses to
// answer a third.
//
// 1. Per candidate: which decision relevant facts does the record state, on
//    whose word, and how recently. Every dimension carries a state, a sentence
//    naming the fact or its absence, and, where the fact is missing or has gone
//    stale, the ask that would resolve it. An ask is always addressed to a
//    person who can answer it, because "unknown" with no route to knowing is
//    just a shrug.
// 2. Per pack: which comparisons are actually available across these
//    candidates. A comparison is offered only when every candidate states the
//    inputs it needs, on the same basis. Otherwise the comparison is withheld
//    with a reason, and the candidates that cannot join it are named.
//
// The third question, "which one should I take", this model does not answer and
// will not. Readiness is a statement about the completeness of the record, not
// a recommendation about the property. A pack where every fact is present is
// ready to be decided on; it is not thereby the right answer.
//
// Four rules carried down from ADV-1.
//
// * An absent figure is never zero. A listing that does not state a rent free
//   period is not a listing with no rent free period. It is a listing whose
//   incentives are unknown, and the difference is worth real money.
// * Arithmetic on stated facts is allowed; arithmetic across a gap is not. An
//   effective rent is computed only when every one of its inputs is on the
//   record, and it carries the basis it was computed from.
// * A fact SAT checked and a fact a lister typed are different states and are
//   never rendered alike. Only the first is "known".
// * Freshness decays. An availability affirmed four months ago is not current
//   evidence, and the pack says so rather than letting the timestamp sit there
//   looking like a fact.
//
// Pure: no I/O, no React, no clock of its own beyond an injected `now`.

import { availabilityOf } from "./availability";
import { formatCounted } from "./format";
import { dealLabel, fitoutLabel } from "./labels";

// How well the record holds a fact.
//
// `known`   SAT holds evidence for it: a check it ran, a credential it recorded,
//           a timestamped affirmation still inside its freshness window.
// `stated`  It is on the record on the lister's word alone. Usable, and clearly
//           labelled as unchecked.
// `stale`   It was stated, and the statement has aged past the published window,
//           so it is not current evidence any more.
// `unknown` The record does not state it. Never a zero, never a default.
// `not_applicable` The dimension does not arise for this deal type.
export type PackState = "known" | "stated" | "stale" | "unknown" | "not_applicable";

export type PackWeight = "essential" | "expected";

export type PackDimensionKind =
  | "price"
  | "size"
  | "availability"
  | "authority"
  | "permit"
  | "service_charge"
  | "vat"
  | "incentives"
  | "tenure"
  | "fitout";

// Everything essential is a fact without which a person cannot responsibly
// commit: what it costs, how big it is, whether it is free, whether the party
// offering it may offer it, and whether the advertisement is licensed.
const WEIGHTS: Record<PackDimensionKind, PackWeight> = {
  price: "essential",
  size: "essential",
  availability: "essential",
  authority: "essential",
  permit: "essential",
  service_charge: "expected",
  vat: "expected",
  incentives: "expected",
  tenure: "expected",
  fitout: "expected",
};

export interface PackDimension {
  kind: PackDimensionKind;
  weight: PackWeight;
  state: PackState;
  label_en: string;
  label_ar: string;
  detail_en: string; // states the fact, or states that the record does not hold it
  detail_ar: string;
  ask_en?: string; // present exactly when the state is unknown or stale
  ask_ar?: string;
}

// `ready`     Every essential fact is on the record and nothing has gone stale.
// `ask_first` The essentials are there, but something is missing or has aged
//             past its window, and the pack names what to ask for.
// `not_ready` An essential fact is absent. There is nothing to decide yet.
export type PackReadiness = "ready" | "ask_first" | "not_ready";

export interface PackCandidate {
  listing_id: string;
  readiness: PackReadiness;
  dimensions: PackDimension[];
  known: number;
  stated: number;
  stale: number;
  unknown: number;
}

export type ComparabilityKind = "price" | "size" | "occupancy_cost" | "effective_rent";

export interface Comparability {
  kind: ComparabilityKind;
  comparable: boolean;
  reason_en: string;
  reason_ar: string;
  // Candidates that cannot join this comparison, named rather than dropped, so
  // a reader can see the comparison is partial and which rows it leaves out.
  excluded_ids: string[];
  // A true comparison that still carries a limit. Present on `size` always: the
  // platform records a number of square metres and does not record whether it
  // is net or gross, so two areas are comparable as numbers and not yet as
  // areas. Saying so is the difference between a comparison and a claim.
  caveat_en?: string;
  caveat_ar?: string;
}

export interface DecisionPack {
  candidates: PackCandidate[];
  comparisons: Comparability[];
  ready: number;
  ask_first: number;
  not_ready: number;
}

export interface PackListing {
  id: string;
  deal_type: string;
  area_sqm?: number | string | null;
  asking_rent_sqm?: number | string | null;
  asking_rent_total?: number | string | null;
  sale_price?: number | string | null;
  sale_price_sqm?: number | string | null;
  service_charge_sqm?: number | string | null;
  vat_treatment?: string | null;
  rent_free_months?: number | string | null;
  fitout_contribution?: number | string | null;
  lease_term_months?: number | string | null;
  break_option_months?: number | string | null;
  fitout_condition?: string | null;
  availability_confirmed_at?: string | null;
  ad_permit_number?: string | null;
  ad_permit_no?: string | null;
  ad_permit_expires_at?: string | null;
  ownership_verified?: boolean | null;
  authorization_verified?: boolean | null;
  right_to_market_confirmed?: boolean | null;
}

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

// Western numerals in both languages (Law 7). Whole numbers stay whole; a
// fraction keeps one decimal, because a decision pack that rounds a rate to a
// round number has changed the number.
function fmt(n: number): string {
  const r = Math.round(n * 10) / 10;
  return Number.isInteger(r) ? r.toLocaleString("en-US") : r.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

const SAR_SQM_YR_EN = "SAR per square metre per year";
const SAR_SQM_YR_AR = "ريال لكل متر مربع سنوياً";

export function permitNumberOf(l: PackListing): string | null {
  // The table carries two permit columns from two different eras of the schema.
  // Either one holds the licence, so both are read and the first non-empty wins.
  const a = (l.ad_permit_number ?? "").trim();
  if (a) return a;
  const b = (l.ad_permit_no ?? "").trim();
  return b || null;
}

// An effective rent over the stated term, computed only when every input is on
// the record.
//
// The formula is not the interesting part. The interesting part is what makes
// it return null: a missing rent free period is not treated as zero months, and
// a missing term is not treated as a year. Either absence means the platform
// cannot state an effective rent, and stating one anyway would be inventing the
// most consequential figure in a lease negotiation.
//
// A fit out contribution joins the calculation only when the contribution and
// the area are both stated, because it is a lump sum and turning it into a rate
// needs an area to divide by. When it does join, the basis says so, so a reader
// can always see which inputs produced the number.
export interface EffectiveRent {
  value: number; // SAR per square metre per year, over the stated term
  basis_en: string;
  basis_ar: string;
}

export function effectiveRentSqm(l: PackListing): EffectiveRent | null {
  if (l.deal_type !== "lease") return null;
  const rent = num(l.asking_rent_sqm);
  const term = num(l.lease_term_months);
  const free = num(l.rent_free_months);
  if (rent === null || term === null || free === null) return null;
  if (term <= 0 || free < 0 || free >= term) return null;

  const paidShare = (term - free) / term;
  let value = rent * paidShare;

  const contribution = num(l.fitout_contribution);
  const area = num(l.area_sqm);
  const withContribution = contribution !== null && contribution > 0 && area !== null && area > 0;
  if (withContribution) {
    const perSqmPerYear = (contribution as number) / (area as number) / ((term as number) / 12);
    value = value - perSqmPerYear;
  }

  // ADV-3A.1, finding 52. Every counted noun below goes through `formatCounted`.
  //
  // The English was wrong too, and less visibly: a single rent free month read
  // "1 rent free months". The Arabic was wrong at the numbers that actually
  // occur, since a rent free period is typically 1 to 6 and the sentence emitted
  // the 11-to-99 form for all of them.
  //
  // `ضمن مدة` governs what follows, so the term is oblique; the rent free phrase
  // is coordinated with the asking price and stands on its own.
  const freeMonths_en = formatCounted(free, "rentFreeMonth", "en");
  const freeMonths_ar = formatCounted(free, "rentFreeMonth", "ar");
  const termOblique_ar = formatCounted(term, "month", "ar", { oblique: true });
  const basis_en = withContribution
    ? `Asking ${fmt(rent)}, ${freeMonths_en} over a ${fmt(term)} month term, less the stated fit out contribution spread over that term.`
    : `Asking ${fmt(rent)}, ${freeMonths_en} over a ${fmt(term)} month term.`;
  const basis_ar = withContribution
    ? `السعر المعلن ${fmt(rent)}، و${freeMonths_ar} ضمن مدة ${termOblique_ar}، مخصوماً منها مساهمة التجهيز المذكورة موزعة على المدة.`
    : `السعر المعلن ${fmt(rent)}، و${freeMonths_ar} ضمن مدة ${termOblique_ar}.`;

  return { value: Math.round(value * 10) / 10, basis_en, basis_ar };
}

function dim(
  kind: PackDimensionKind,
  state: PackState,
  label_en: string,
  label_ar: string,
  detail_en: string,
  detail_ar: string,
  ask?: { en: string; ar: string },
): PackDimension {
  const d: PackDimension = {
    kind,
    weight: WEIGHTS[kind],
    state,
    label_en,
    label_ar,
    detail_en,
    detail_ar,
  };
  // An ask belongs to an unresolved fact and nowhere else. Attaching one to a
  // dimension that is already answered would train readers to skip them.
  if (ask && (state === "unknown" || state === "stale")) {
    d.ask_en = ask.en;
    d.ask_ar = ask.ar;
  }
  return d;
}

export function packDimensions(l: PackListing, now: number = Date.now()): PackDimension[] {
  const out: PackDimension[] = [];
  const lease = l.deal_type === "lease";

  // Price. A price is never "known": SAT does not verify what a party asks for
  // its own space, and a platform that rendered an asking figure as a checked
  // fact would be underwriting somebody's negotiating position.
  {
    const rentSqm = num(l.asking_rent_sqm);
    const rentTotal = num(l.asking_rent_total);
    const price = num(l.sale_price);
    const priceSqm = num(l.sale_price_sqm);
    if (lease && rentSqm !== null) {
      out.push(dim("price", "stated", "Asking rent", "الإيجار المطلوب", `Asking ${fmt(rentSqm)} ${SAR_SQM_YR_EN}, stated by the lister.`, `السعر المطلوب ${fmt(rentSqm)} ${SAR_SQM_YR_AR}، بحسب ما ذكره المُدرِج.`));
    } else if (lease && rentTotal !== null) {
      out.push(dim("price", "stated", "Asking rent", "الإيجار المطلوب", `Asking ${fmt(rentTotal)} SAR per year as a total, stated by the lister. No rate per square metre is on the record.`, `السعر المطلوب ${fmt(rentTotal)} ريال سنوياً كمبلغ إجمالي، بحسب ما ذكره المُدرِج. ولا يوجد سعر لكل متر مربع في السجل.`));
    } else if (!lease && (price !== null || priceSqm !== null)) {
      const parts_en: string[] = [];
      const parts_ar: string[] = [];
      if (price !== null) { parts_en.push(`${fmt(price)} SAR`); parts_ar.push(`${fmt(price)} ريال`); }
      if (priceSqm !== null) { parts_en.push(`${fmt(priceSqm)} SAR per square metre`); parts_ar.push(`${fmt(priceSqm)} ريال لكل متر مربع`); }
      out.push(dim("price", "stated", "Asking price", "السعر المطلوب", `Asking ${parts_en.join(", ")}, stated by the lister.`, `السعر المطلوب ${parts_ar.join("، ")}، بحسب ما ذكره المُدرِج.`));
    } else {
      out.push(dim("price", "unknown", lease ? "Asking rent" : "Asking price", lease ? "الإيجار المطلوب" : "السعر المطلوب", "The record states no asking figure.", "لا يذكر السجل أي سعر مطلوب.", {
        en: lease ? "Ask the lister for the asking rent and the basis it is quoted on." : "Ask the lister for the asking price and the basis it is quoted on.",
        ar: lease ? "اطلب من المُدرِج الإيجار المطلوب والأساس الذي احتُسب عليه." : "اطلب من المُدرِج السعر المطلوب والأساس الذي احتُسب عليه.",
      }));
    }
  }

  // Size.
  {
    const area = num(l.area_sqm);
    if (area !== null && area > 0) {
      out.push(dim("size", "stated", "Area", "المساحة", `${fmt(area)} square metres, stated by the lister. The record does not say whether that area is net or gross.`, `${fmt(area)} متر مربع، بحسب ما ذكره المُدرِج. ولا يوضح السجل ما إذا كانت المساحة صافية أم إجمالية.`));
    } else {
      out.push(dim("size", "unknown", "Area", "المساحة", "The record states no area.", "لا يذكر السجل أي مساحة.", {
        en: "Ask the lister for the area and whether it is measured net or gross.",
        ar: "اطلب من المُدرِج المساحة وما إذا كانت مقاسة صافية أم إجمالية.",
      }));
    }
  }

  // Availability. A timestamped affirmation SAT recorded is evidence while it is
  // current, which is why a fresh one is `known` and an old one is not.
  {
    const av = availabilityOf(l.availability_confirmed_at, now);
    if (!av) {
      out.push(dim("availability", "unknown", "Availability", "التوفر", "No affirmation of availability is on the record.", "لا يوجد في السجل أي تأكيد للتوفر.", {
        en: "Ask the lister to confirm the space is still available and on what date.",
        ar: "اطلب من المُدرِج تأكيد أن المساحة ما زالت متاحة وتاريخ ذلك التأكيد.",
      }));
    } else if (av.state === "stale") {
      out.push(dim("availability", "stale", "Availability", "التوفر", `Availability was last affirmed ${formatCounted(av.days, "day", "en")} ago, which is past the published window.`, `آخر تأكيد للتوفر كان قبل ${formatCounted(av.days, "day", "ar", { oblique: true })}، وهو خارج النافذة المنشورة.`, {
        en: "Ask the lister to re confirm availability before this candidate is compared on it.",
        ar: "اطلب من المُدرِج إعادة تأكيد التوفر قبل مقارنة هذا الخيار على أساسه.",
      }));
    } else if (av.state === "aging") {
      out.push(dim("availability", "stated", "Availability", "التوفر", `Availability was affirmed ${formatCounted(av.days, "day", "en")} ago.`, `تم تأكيد التوفر قبل ${formatCounted(av.days, "day", "ar", { oblique: true })}.`));
    } else {
      out.push(dim("availability", "known", "Availability", "التوفر", `Availability was affirmed ${formatCounted(av.days, "day", "en")} ago and is inside the published window.`, `تم تأكيد التوفر قبل ${formatCounted(av.days, "day", "ar", { oblique: true })} وهو ضمن النافذة المنشورة.`));
    }
  }

  // Authority to offer the space. Verified ownership and verified authorization
  // are checks SAT ran. A right to market the lister ticked is a claim, and the
  // two are not rendered alike.
  {
    if (l.ownership_verified === true) {
      out.push(dim("authority", "known", "Right to offer", "صفة العرض", "Ownership was checked by SAT Markets.", "تم التحقق من الملكية من قبل سات ماركتس."));
    } else if (l.authorization_verified === true) {
      out.push(dim("authority", "known", "Right to offer", "صفة العرض", "A marketing authorization was checked by SAT Markets.", "تم التحقق من تفويض التسويق من قبل سات ماركتس."));
    } else if (l.right_to_market_confirmed === true) {
      out.push(dim("authority", "stated", "Right to offer", "صفة العرض", "The lister confirmed a right to market this space. No document has been checked against it.", "أكّد المُدرِج حقه في تسويق هذه المساحة، ولم يُراجَع أي مستند مقابل هذا الإقرار."));
    } else {
      out.push(dim("authority", "unknown", "Right to offer", "صفة العرض", "The record does not say on what basis this party offers the space.", "لا يذكر السجل الأساس الذي يعرض به هذا الطرف المساحة.", {
        en: "Ask the lister whether they are the owner or hold a written authorization, and ask for it.",
        ar: "اسأل المُدرِج إن كان المالك أم يحمل تفويضاً خطياً، واطلب صورة منه.",
      }));
    }
  }

  // Advertisement permit. A licence number with a live expiry is a credential
  // that can be checked against the issuing authority, so it is `known`. A
  // number with no expiry is a claim. An expired one is stale by definition.
  {
    const permit = permitNumberOf(l);
    const exp = l.ad_permit_expires_at ? Date.parse(l.ad_permit_expires_at) : NaN;
    if (!permit) {
      out.push(dim("permit", "unknown", "Advertisement permit", "ترخيص الإعلان", "No advertisement permit number is on the record.", "لا يوجد رقم ترخيص إعلان في السجل.", {
        en: "Ask the lister for the advertisement permit number and its expiry date.",
        ar: "اطلب من المُدرِج رقم ترخيص الإعلان وتاريخ انتهائه.",
      }));
    } else if (!Number.isFinite(exp)) {
      out.push(dim("permit", "stated", "Advertisement permit", "ترخيص الإعلان", `Permit ${permit} is on the record. No expiry date is recorded against it.`, `الترخيص ${permit} مسجل، ولا يوجد تاريخ انتهاء مسجل مقابله.`));
    } else if (exp < now) {
      out.push(dim("permit", "stale", "Advertisement permit", "ترخيص الإعلان", `Permit ${permit} expired.`, `انتهت صلاحية الترخيص ${permit}.`, {
        en: "Ask the lister for a current advertisement permit before proceeding.",
        ar: "اطلب من المُدرِج ترخيص إعلان سارياً قبل المتابعة.",
      }));
    } else {
      out.push(dim("permit", "known", "Advertisement permit", "ترخيص الإعلان", `Permit ${permit} is on the record and current.`, `الترخيص ${permit} مسجل وساري المفعول.`));
    }
  }

  // Service charge. This is the dimension that most often turns a cheap space
  // into an expensive one, and it is the one most often left blank.
  {
    const sc = num(l.service_charge_sqm);
    if (sc !== null) {
      out.push(dim("service_charge", "stated", "Service charge", "رسوم الخدمات", `${fmt(sc)} ${SAR_SQM_YR_EN}, stated by the lister.`, `${fmt(sc)} ${SAR_SQM_YR_AR}، بحسب ما ذكره المُدرِج.`));
    } else {
      out.push(dim("service_charge", "unknown", "Service charge", "رسوم الخدمات", "The record states no service charge. That is not the same as no service charge being payable.", "لا يذكر السجل أي رسوم خدمات، وهذا لا يعني أن الرسوم غير مستحقة.", {
        en: "Ask the lister for the service charge per square metre and what it covers.",
        ar: "اطلب من المُدرِج رسوم الخدمات لكل متر مربع وما الذي تشمله.",
      }));
    }
  }

  // VAT treatment.
  {
    const v = (l.vat_treatment ?? "").trim();
    const EN: Record<string, string> = {
      inclusive: "The stated figure includes VAT.",
      exclusive: "The stated figure excludes VAT.",
      exempt: "The record states this transaction is exempt from VAT.",
      not_applicable: "The record states VAT does not apply.",
    };
    const AR: Record<string, string> = {
      inclusive: "المبلغ المذكور شامل ضريبة القيمة المضافة.",
      exclusive: "المبلغ المذكور غير شامل ضريبة القيمة المضافة.",
      exempt: "يذكر السجل أن هذه الصفقة معفاة من ضريبة القيمة المضافة.",
      not_applicable: "يذكر السجل أن ضريبة القيمة المضافة لا تنطبق.",
    };
    if (v && EN[v]) {
      out.push(dim("vat", "stated", "VAT treatment", "معالجة ضريبة القيمة المضافة", EN[v], AR[v]));
    } else {
      out.push(dim("vat", "unknown", "VAT treatment", "معالجة ضريبة القيمة المضافة", "The record does not say whether the stated figure includes VAT.", "لا يذكر السجل ما إذا كان المبلغ المذكور شاملاً ضريبة القيمة المضافة.", {
        en: "Ask the lister whether the quoted figure is inclusive or exclusive of VAT.",
        ar: "اسأل المُدرِج إن كان المبلغ المعلن شاملاً ضريبة القيمة المضافة أم غير شامل لها.",
      }));
    }
  }

  // Incentives. Lease only. The absence of a rent free period on the record is
  // the absence of a statement, not the absence of an incentive, and this is the
  // single place where reading a blank as a zero costs the most money.
  {
    if (!lease) {
      out.push(dim("incentives", "not_applicable", "Incentives", "الحوافز", "Incentives arise on a lease, not on a purchase.", "الحوافز ترد في الإيجار لا في البيع."));
    } else {
      const free = num(l.rent_free_months);
      const contribution = num(l.fitout_contribution);
      if (free === null && contribution === null) {
        out.push(dim("incentives", "unknown", "Incentives", "الحوافز", "The record states no rent free period and no fit out contribution. Neither is recorded as absent; neither is recorded at all.", "لا يذكر السجل فترة بلا إيجار ولا مساهمة في التجهيز. ولم تُسجل أي منهما كغير موجودة، بل لم تُسجل أصلاً.", {
          en: "Ask the lister whether a rent free period or a fit out contribution is offered.",
          ar: "اسأل المُدرِج إن كانت هناك فترة بلا إيجار أو مساهمة في التجهيز.",
        }));
      } else {
        const parts_en: string[] = [];
        const parts_ar: string[] = [];
        if (free !== null) { parts_en.push(formatCounted(free, "rentFreeMonth", "en")); parts_ar.push(formatCounted(free, "rentFreeMonth", "ar")); }
        if (contribution !== null) { parts_en.push(`a fit out contribution of ${fmt(contribution)} SAR`); parts_ar.push(`مساهمة في التجهيز قدرها ${fmt(contribution)} ريال`); }
        const missing_en = free === null ? " No rent free period is recorded." : contribution === null ? " No fit out contribution is recorded." : "";
        const missing_ar = free === null ? " ولم تُسجل فترة بلا إيجار." : contribution === null ? " ولم تُسجل مساهمة في التجهيز." : "";
        out.push(dim("incentives", "stated", "Incentives", "الحوافز", `Stated by the lister: ${parts_en.join(" and ")}.${missing_en}`, `بحسب ما ذكره المُدرِج: ${parts_ar.join(" و")}.${missing_ar}`));
      }
    }
  }

  // Tenure. Lease only.
  {
    if (!lease) {
      out.push(dim("tenure", "not_applicable", "Lease term", "مدة العقد", "A lease term does not arise on a purchase.", "مدة العقد لا ترد في البيع."));
    } else {
      const term = num(l.lease_term_months);
      const brk = num(l.break_option_months);
      if (term === null) {
        out.push(dim("tenure", "unknown", "Lease term", "مدة العقد", "The record states no lease term.", "لا يذكر السجل مدة العقد.", {
          en: "Ask the lister for the lease term and whether a break option is available.",
          ar: "اطلب من المُدرِج مدة العقد وما إذا كان هناك خيار إنهاء مبكر.",
        }));
      } else {
        // `عند` is a preposition, so the break option is oblique. The lease term
        // opens its own sentence and is not governed by anything.
        const brk_en = brk !== null ? ` A break option is stated at ${formatCounted(brk, "month", "en")}.` : " No break option is recorded.";
        const brk_ar = brk !== null ? ` وهناك خيار إنهاء مبكر عند ${formatCounted(brk, "month", "ar", { oblique: true })}.` : " ولم يُسجل خيار إنهاء مبكر.";
        out.push(dim("tenure", "stated", "Lease term", "مدة العقد", `${formatCounted(term, "month", "en")}, stated by the lister.${brk_en}`, `${formatCounted(term, "month", "ar")}، بحسب ما ذكره المُدرِج.${brk_ar}`));
      }
    }
  }

  // Fit out condition. What the tenant walks into decides what they spend.
  {
    const f = (l.fitout_condition ?? "").trim();
    if (f && f !== "n_a") {
      out.push(dim("fitout", "stated", "Fit out condition", "حالة التجهيز", `${fitoutLabel(f, "en")}, stated by the lister.`, `${fitoutLabel(f, "ar")}، بحسب ما ذكره المُدرِج.`));
    } else {
      out.push(dim("fitout", "unknown", "Fit out condition", "حالة التجهيز", "The record states no fit out condition.", "لا يذكر السجل حالة التجهيز.", {
        en: "Ask the lister what condition the space is handed over in.",
        ar: "اسأل المُدرِج عن الحالة التي تُسلَّم بها المساحة.",
      }));
    }
  }

  return out;
}

export function readinessFrom(dimensions: readonly PackDimension[]): PackReadiness {
  const live = dimensions.filter((d) => d.state !== "not_applicable");
  if (live.some((d) => d.weight === "essential" && d.state === "unknown")) return "not_ready";
  if (live.some((d) => d.state === "unknown" || d.state === "stale")) return "ask_first";
  return "ready";
}

export function packCandidate(l: PackListing, now: number = Date.now()): PackCandidate {
  const dimensions = packDimensions(l, now);
  const count = (s: PackState) => dimensions.filter((d) => d.state === s).length;
  return {
    listing_id: l.id,
    readiness: readinessFrom(dimensions),
    dimensions,
    known: count("known"),
    stated: count("stated"),
    stale: count("stale"),
    unknown: count("unknown"),
  };
}

// Which comparisons this set of candidates actually supports.
//
// The rule throughout is the same: a comparison is offered when every candidate
// states the inputs it needs, and withheld when one does not. Withheld is not
// the same as empty. A withheld comparison names the candidates that could not
// join it, because "we cannot compare these on total cost" is a useful thing to
// know and "here is a total cost column with three numbers and a dash" is not.
export function comparabilityOf(listings: readonly PackListing[]): Comparability[] {
  const out: Comparability[] = [];
  const ids = listings.map((l) => l.id);
  const deals = Array.from(new Set(listings.map((l) => l.deal_type).filter(Boolean)));
  const mixed = deals.length > 1;
  const lease = deals.length === 1 && deals[0] === "lease";

  const dealNames_en = deals.map((d) => dealLabel(d, "en")).join(" and ");
  const dealNames_ar = deals.map((d) => dealLabel(d, "ar")).join(" و");

  // Price.
  if (mixed) {
    out.push({
      kind: "price",
      comparable: false,
      reason_en: `This shortlist mixes ${dealNames_en}. A rent and a purchase price are not one number, so they are not compared as one.`,
      reason_ar: `تجمع هذه القائمة بين ${dealNames_ar}. والإيجار وسعر الشراء ليسا رقماً واحداً، فلا يقارنان كرقم واحد.`,
      excluded_ids: [],
    });
  } else {
    const missing = listings.filter((l) => (lease ? num(l.asking_rent_sqm) === null : num(l.sale_price_sqm) === null && num(l.sale_price) === null)).map((l) => l.id);
    out.push({
      kind: "price",
      comparable: missing.length === 0 && listings.length > 0,
      reason_en: missing.length === 0 && listings.length > 0
        ? (lease ? `Every candidate states an asking rent in ${SAR_SQM_YR_EN}.` : "Every candidate states an asking price.")
        : (lease ? "One or more candidates do not state a rate per square metre, so the asking figures are not on one basis." : "One or more candidates do not state an asking price."),
      reason_ar: missing.length === 0 && listings.length > 0
        ? (lease ? `كل خيار يذكر إيجاراً مطلوباً بـ ${SAR_SQM_YR_AR}.` : "كل خيار يذكر سعراً مطلوباً.")
        : (lease ? "لا يذكر خيار أو أكثر سعراً لكل متر مربع، فالأسعار المطلوبة ليست على أساس واحد." : "لا يذكر خيار أو أكثر سعراً مطلوباً."),
      excluded_ids: missing,
    });
  }

  // Size. Numbers exist or they do not; what they measure is a separate question
  // and the platform does not hold the answer to it.
  {
    const missing = listings.filter((l) => num(l.area_sqm) === null).map((l) => l.id);
    out.push({
      kind: "size",
      comparable: missing.length === 0 && listings.length > 0,
      reason_en: missing.length === 0 && listings.length > 0 ? "Every candidate states an area." : "One or more candidates do not state an area.",
      reason_ar: missing.length === 0 && listings.length > 0 ? "كل خيار يذكر مساحة." : "لا يذكر خيار أو أكثر أي مساحة.",
      excluded_ids: missing,
      caveat_en: "SAT Markets records the area a lister states and does not record whether it is measured net or gross. Two areas here are comparable as figures, not yet as floor space.",
      caveat_ar: "تسجل سات ماركتس المساحة كما يذكرها المُدرِج ولا تسجل ما إذا كانت مقاسة صافية أم إجمالية. فالمساحتان هنا قابلتان للمقارنة كأرقام، لا كمساحة أرضية بعد.",
    });
  }

  // Total occupancy cost, lease only. Rent plus service charge, which needs both
  // from every candidate. A total built from three service charges and one blank
  // would rank the listing that withheld its service charge first.
  if (lease) {
    const missing = listings.filter((l) => num(l.asking_rent_sqm) === null || num(l.service_charge_sqm) === null).map((l) => l.id);
    out.push({
      kind: "occupancy_cost",
      comparable: missing.length === 0 && listings.length > 0,
      reason_en: missing.length === 0 && listings.length > 0
        ? "Every candidate states both a rent and a service charge, so occupancy cost is comparable."
        : "One or more candidates do not state a service charge. A total built without it would rank the candidate that withheld it first.",
      reason_ar: missing.length === 0 && listings.length > 0
        ? "كل خيار يذكر الإيجار ورسوم الخدمات معاً، فتكلفة الإشغال قابلة للمقارنة."
        : "لا يذكر خيار أو أكثر رسوم الخدمات. والإجمالي المحسوب بدونها يضع الخيار الذي أغفلها في المقدمة.",
      excluded_ids: missing,
    });

    // Effective rent, lease only. The hardest of the four to earn, because it
    // needs a term and a rent free period from every candidate.
    const missingE = listings.filter((l) => effectiveRentSqm(l) === null).map((l) => l.id);
    out.push({
      kind: "effective_rent",
      comparable: missingE.length === 0 && listings.length > 0,
      reason_en: missingE.length === 0 && listings.length > 0
        ? "Every candidate states a rent, a term and a rent free period, so an effective rent can be computed for each from stated facts alone."
        : "One or more candidates do not state a term or a rent free period. An effective rent for those would be an assumption, not a calculation.",
      reason_ar: missingE.length === 0 && listings.length > 0
        ? "كل خيار يذكر الإيجار والمدة والفترة بلا إيجار، فيمكن حساب الإيجار الفعلي لكل منها من وقائع مذكورة فقط."
        : "لا يذكر خيار أو أكثر المدة أو الفترة بلا إيجار. والإيجار الفعلي لتلك الخيارات سيكون افتراضاً لا حساباً.",
      excluded_ids: missingE,
    });
  }

  // Referenced so an empty shortlist still returns a shaped answer rather than
  // an empty array a caller has to special case.
  void ids;
  return out;
}

export function decisionPack(listings: readonly PackListing[], now: number = Date.now()): DecisionPack {
  const candidates = listings.map((l) => packCandidate(l, now));
  return {
    candidates,
    comparisons: comparabilityOf(listings),
    ready: candidates.filter((c) => c.readiness === "ready").length,
    ask_first: candidates.filter((c) => c.readiness === "ask_first").length,
    not_ready: candidates.filter((c) => c.readiness === "not_ready").length,
  };
}

// Every open ask across the pack, deduplicated by wording and carrying the
// candidates it applies to. An occupier chasing four listings should send one
// list of questions per lister, not read ten panels and assemble it themselves.
export interface PackAsk {
  kind: PackDimensionKind;
  ask_en: string;
  ask_ar: string;
  listing_ids: string[];
}

export function packAsks(pack: DecisionPack): PackAsk[] {
  const byKey = new Map<string, PackAsk>();
  for (const c of pack.candidates) {
    for (const d of c.dimensions) {
      if (!d.ask_en || !d.ask_ar) continue;
      const key = `${d.kind}|${d.ask_en}`;
      const existing = byKey.get(key);
      if (existing) existing.listing_ids.push(c.listing_id);
      else byKey.set(key, { kind: d.kind, ask_en: d.ask_en, ask_ar: d.ask_ar, listing_ids: [c.listing_id] });
    }
  }
  return Array.from(byKey.values());
}

export function readinessLabel(r: PackReadiness, ar: boolean): string {
  if (r === "ready") return ar ? "السجل مكتمل" : "Record complete";
  if (r === "ask_first") return ar ? "اسأل قبل المقارنة" : "Ask before comparing";
  return ar ? "ناقص أساسي" : "Missing an essential";
}

export function stateLabel(s: PackState, ar: boolean): string {
  if (s === "known") return ar ? "موثّق" : "Evidenced";
  if (s === "stated") return ar ? "مذكور" : "Stated";
  if (s === "stale") return ar ? "قديم" : "Out of date";
  if (s === "not_applicable") return ar ? "لا ينطبق" : "Not applicable";
  return ar ? "غير مذكور" : "Not stated";
}

export function comparabilityLabel(k: ComparabilityKind, ar: boolean): string {
  if (k === "price") return ar ? "السعر" : "Price";
  if (k === "size") return ar ? "المساحة" : "Area";
  if (k === "occupancy_cost") return ar ? "تكلفة الإشغال" : "Occupancy cost";
  return ar ? "الإيجار الفعلي" : "Effective rent";
}
