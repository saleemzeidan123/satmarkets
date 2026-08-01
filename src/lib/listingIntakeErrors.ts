/**
 * RC10, finding 22. What the listing intake says when it refuses.
 *
 * THE DEFECT. `/api/listings` and `/api/listings/[id]` between them refuse a
 * save for twenty-odd distinct reasons, and every one of those reasons was an
 * English sentence composed in the route and handed to the browser as
 * `{ error: "Enter a valid area." }`. `ListingStudio` rendered it with
 *
 *   setError(json.error || t("Could not save the listing.", "..."));
 *
 * so an Arabic lister who filled in an Arabic form, in an Arabic page, under an
 * Arabic heading, was refused in English. That is the whole of finding 22: not
 * an untranslated label anyone could find by reading the form, but a set of
 * sentences that exist only on the unhappy path, which is exactly the path a
 * first-time lister is most likely to meet and least able to recover from.
 *
 * Two of those sentences were worse than untranslated. The edit route composed
 * `${label}: ${message}` from `field.label_en`, so the English registry label
 * was sent even when the reader's language was known; and both routes returned
 * PostgREST's own `error.message` verbatim on a failed write, which is an
 * internal database sentence, in English, shown to a member of the public.
 *
 * THE FIX, and why it is here rather than in the routes. A route knows what
 * happened. It does not know who is reading, because the reader's language is a
 * property of the page, not of the request body, and inventing a locale
 * parameter on the write API would make every future caller responsible for
 * passing it. So the route states the reason as a stable code and this table
 * names it, on the client, in the language that page is already rendering. That
 * is the same division `documentKinds.ts`, `planTypes.ts` and `labels.ts` use
 * for every other controlled vocabulary in the platform, and the shape here is
 * deliberately identical to theirs: a code union, a `[en, ar]` table, a type
 * guard and one naming function.
 *
 * `error` stays on the wire in English, because it is what an API consumer and
 * a server log read, and removing it would break both to fix neither. What
 * changes is that no client renders it. A code the client does not recognise
 * falls to the generic sentence in the reader's language rather than to an
 * English one, so a route added later cannot reintroduce the defect by
 * forgetting the table: the worst it can do is be vague.
 */

export type IntakeErrorCode =
  | "rate_limited"
  | "sign_in_to_list"
  | "sign_in_to_edit"
  | "account_incomplete"
  | "not_found"
  | "not_yours"
  | "title_required"
  | "asset_type_required"
  | "area_invalid"
  | "rent_invalid"
  | "price_invalid"
  | "permit_number_invalid"
  | "permit_expiry_required"
  | "permit_expired"
  | "permit_locked"
  | "right_to_market_required"
  | "location_required"
  | "location_outside_sa"
  | "location_locked"
  | "location_contradiction"
  | "details_invalid"
  | "field_invalid"
  | "availability_unreadable"
  | "availability_future"
  | "storage_unavailable"
  | "save_failed";

/**
 * [en, ar]. The English half is not always the sentence the route puts in
 * `error`: the route composes for a log and this composes for a person, so
 * "rate_limited" becomes a sentence here and stays a token there.
 *
 * `location_contradiction` is in the table because the guard requires every
 * emitted code to be nameable, but the edit route sends a record-specific
 * bilingual pair with it, and the client prefers that pair. This is the
 * sentence a client that ignored the pair would show, not the one it does.
 */
const MESSAGES: Record<IntakeErrorCode, [string, string]> = {
  rate_limited: ["Too many attempts. Wait a moment and try again.", "محاولات كثيرة. انتظر قليلاً ثم أعد المحاولة."],
  sign_in_to_list: ["Sign in to list a space.", "سجّل الدخول لعرض مساحة."],
  sign_in_to_edit: ["Sign in to edit this listing.", "سجّل الدخول لتعديل هذا العرض."],
  account_incomplete: ["Finish creating your account before listing.", "أكمل إنشاء حسابك قبل عرض مساحة."],
  not_found: ["This listing no longer exists.", "لم يعد هذا العرض موجوداً."],
  not_yours: ["This listing belongs to another account.", "هذا العرض يخص حساباً آخر."],
  title_required: ["A title is required.", "العنوان مطلوب."],
  asset_type_required: ["Choose an asset type.", "اختر نوع الأصل."],
  area_invalid: ["Enter a valid area.", "أدخل مساحة صحيحة."],
  rent_invalid: ["Enter a valid asking rent.", "أدخل قيمة إيجار صحيحة."],
  price_invalid: ["Enter a valid sale price.", "أدخل سعر بيع صحيحاً."],
  permit_number_invalid: [
    "Enter the 10 digit real estate advertising licence number.",
    "أدخل رقم رخصة الإعلان العقاري المكوّن من 10 أرقام.",
  ],
  permit_expiry_required: [
    "Enter the date the advertising licence expires.",
    "أدخل تاريخ انتهاء رخصة الإعلان العقاري.",
  ],
  permit_expired: ["That licence has already expired.", "انتهت صلاحية هذه الرخصة."],
  permit_locked: [
    "The advertising licence on a published listing is changed by SAT.",
    "رخصة الإعلان على عرض منشور تُعدّل من قبل سات.",
  ],
  right_to_market_required: [
    "Confirm you have the right to market this property.",
    "أكّد أن لديك الحق في تسويق هذا العقار.",
  ],
  location_required: ["The property location is required.", "موقع العقار مطلوب."],
  location_outside_sa: [
    "The pinned location is outside Saudi Arabia.",
    "الموقع المحدّد خارج المملكة العربية السعودية.",
  ],
  location_locked: [
    "The location of a published listing is changed by SAT.",
    "موقع العرض المنشور يُعدّل من قبل سات.",
  ],
  location_contradiction: [
    "The pin and the address on file do not agree.",
    "العلامة على الخريطة والعنوان المسجّل لا يتفقان.",
  ],
  details_invalid: ["Some property details are invalid.", "بعض تفاصيل العقار غير صحيحة."],
  field_invalid: ["This property detail could not be accepted.", "تعذّر قبول هذه التفصيلة."],
  availability_unreadable: [
    "That availability date could not be read.",
    "تعذّرت قراءة تاريخ الإتاحة.",
  ],
  availability_future: [
    "Availability is confirmed as of today, not a future date.",
    "تُؤكَّد الإتاحة اعتباراً من اليوم، لا بتاريخ مستقبلي.",
  ],
  storage_unavailable: [
    "The listing store is unavailable. Try again in a moment.",
    "خدمة حفظ العروض غير متاحة. أعد المحاولة بعد قليل.",
  ],
  save_failed: ["The listing could not be saved.", "تعذّر حفظ العرض."],
};

export const INTAKE_ERROR_CODES = Object.keys(MESSAGES) as IntakeErrorCode[];

export function isIntakeErrorCode(v: unknown): v is IntakeErrorCode {
  return typeof v === "string" && Object.prototype.hasOwnProperty.call(MESSAGES, v);
}

/**
 * The sentence for a refusal, in the reader's language.
 *
 * Returns the generic save failure for anything it does not recognise, which
 * includes a missing code, so a caller never has to decide what to do with
 * null and never has an English sentence to fall back to.
 */
export function intakeErrorMessage(code: unknown, ar: boolean): string {
  const k: IntakeErrorCode = isIntakeErrorCode(code) ? code : "save_failed";
  return MESSAGES[k][ar ? 1 : 0];
}
