/**
 * Finding 203. What the rest of the platform says when a write refuses.
 *
 * THE DEFECT, and why it is a separate finding from 22. RC10 closed finding 22
 * by giving the two listing intake routes a stable code and naming that code on
 * the client in the reader's language. It closed the intake and nothing else.
 * Sixteen further call sites in this repository still did the original thing:
 *
 *   setErr(j.error || t.errUp);
 *
 * That reads as a defensive fallback and is the opposite. `j.error` is the
 * route's own English sentence and it is almost always present, so the
 * bilingual fallback beside it is the branch that almost never runs. An Arabic
 * lister removing a photograph from an Arabic page was told "Could not remove
 * the photo." in English; an Arabic reader registering interest in a
 * requirement was refused in English; and three of the surfaces rendered the
 * bare token "error", which is not a sentence in either language.
 *
 * The same class carries a second defect that is not about language at all.
 * Three routes returned PostgREST's own `error.message` to the browser, which
 * is an internal database sentence shown to a member of the public and an
 * information disclosure as well as a translation gap. Finding 22 found the
 * same thing in the intake routes and fixed it there.
 *
 * THE FIX. Identical to the one finding 22 established, applied to the wider
 * class, and deliberately not a new convention: a route states the reason as a
 * stable code, `error` stays on the wire in English because a log and an API
 * consumer read it, and no client renders it. This table names the code on the
 * client, in the language the page is already rendering, because the reader's
 * language is a property of the page and not of the request body.
 *
 * Two departures from `listingIntakeErrors.ts`, both deliberate.
 *
 * First, `apiErrorMessage` takes the caller's own fallback sentence rather than
 * falling to one generic entry. The intake table could assume a single generic
 * refusal because every code in it refuses the same act, saving a listing. This
 * table spans uploading, removing, reordering, publishing, registering interest
 * and reviewing, and "The listing could not be saved." is wrong for all but one
 * of them. Every call site already had a contextual bilingual sentence for the
 * network-failure branch; that sentence is now also what an unrecognised code
 * falls to. So a route added later cannot reintroduce the defect by forgetting
 * this table. The worst it can do is be vague, in the right language.
 *
 * Second, a count limit is four codes rather than one code and a `kind`
 * parameter. The route used to compose `Limit reached for ${kind} images.`,
 * which cannot be translated: Arabic will not accept an English enum spliced
 * into the middle of a sentence, and the grammar around the noun changes with
 * it. Codes are cheap. Interpolated sentences are the thing that does not
 * survive translation.
 */

export type ApiErrorCode =
  // Shared across the media and document surfaces.
  | "rate_limited"
  | "storage_unavailable"
  | "listing_not_found"
  | "not_your_listing"
  | "sign_in_to_upload"
  | "sign_in_to_edit_media"
  | "no_file"
  // Image upload, /api/listings/[id]/media POST.
  | "image_too_large"
  | "image_type_rejected"
  | "image_unprocessable"
  | "photo_limit_reached"
  | "floorplan_limit_reached"
  // Document upload, /api/listings/[id]/docs POST.
  | "document_too_large"
  | "document_type_rejected"
  | "brochure_limit_reached"
  // Shared by both upload routes.
  | "upload_failed"
  | "attach_failed"
  // Reorder, /api/listings/[id]/media PATCH.
  | "no_order"
  | "no_matching_photos"
  | "reorder_failed"
  // Removal, /api/listings/[id]/media/[mediaId] DELETE.
  | "media_not_found"
  | "remove_failed"
  // Slice B. Pause and republish, /api/listings/[id]/status POST.
  | "not_configured"
  | "status_transition_not_allowed"
  | "publish_gate_failed"
  | "status_update_failed"
  // Slice B. Reviewer decisions, /api/listings/[id]/review POST.
  | "review_update_failed"
  | "unknown_action"
  // Slice C. Public profile, /api/account PATCH.
  | "sign_in_to_edit_profile"
  | "website_scheme_required"
  | "logo_url_scheme_required"
  | "invalid_public_email"
  | "profile_save_failed"
  // Slice C. Account requests, /api/signup POST.
  | "invalid_role"
  | "invalid_name"
  | "invalid_email"
  | "details_too_large"
  | "signup_store_failed"
  // Slice C. Advisor shortlist, /api/advisor/shortlist POST.
  | "brief_required"
  | "asset_type_required"
  | "shortlist_failed";

/**
 * [en, ar]. The English half is not always the sentence the route puts in
 * `error`, for the reason finding 22 gave: the route composes for a log and
 * this composes for a person, so "rate_limited" is a token there and a sentence
 * here.
 *
 * The limit sentences do not state the cap as a number. The cap lives in one
 * place, the route's `CAPS` table, and a number repeated here would be a second
 * place for it to be wrong.
 */
const MESSAGES: Record<ApiErrorCode, [string, string]> = {
  rate_limited: [
    "Too many attempts. Wait a moment and try again.",
    "محاولات كثيرة. انتظر قليلاً ثم أعد المحاولة.",
  ],
  storage_unavailable: [
    "File storage is unavailable. Try again in a moment.",
    "خدمة تخزين الملفات غير متاحة. أعد المحاولة بعد قليل.",
  ],
  listing_not_found: ["This listing no longer exists.", "لم يعد هذا العرض موجوداً."],
  not_your_listing: ["This listing belongs to another account.", "هذا العرض يخص حساباً آخر."],
  sign_in_to_upload: ["Sign in to upload files.", "سجّل الدخول لرفع الملفات."],
  sign_in_to_edit_media: ["Sign in to edit this listing.", "سجّل الدخول لتعديل هذا العرض."],
  no_file: ["No file was received. Choose a file and try again.", "لم يصل أي ملف. اختر ملفاً ثم أعد المحاولة."],

  image_too_large: [
    "That image is larger than 4MB. Choose a smaller one.",
    "حجم هذه الصورة يتجاوز 4 ميغابايت. اختر صورة أصغر.",
  ],
  image_type_rejected: [
    "Only JPEG, PNG and WebP images are accepted.",
    "تُقبل صور JPEG وPNG وWebP فقط.",
  ],
  image_unprocessable: [
    "That file could not be read as an image.",
    "تعذّرت قراءة هذا الملف كصورة.",
  ],
  photo_limit_reached: [
    "This listing already has the maximum number of photos.",
    "بلغ هذا العرض الحد الأقصى لعدد الصور.",
  ],
  floorplan_limit_reached: [
    "This listing already has the maximum number of floor plans.",
    "بلغ هذا العرض الحد الأقصى لعدد المخططات.",
  ],

  document_too_large: [
    "That document is larger than 20MB. Choose a smaller one.",
    "حجم هذا المستند يتجاوز 20 ميغابايت. اختر مستنداً أصغر.",
  ],
  document_type_rejected: [
    "Only PDF documents are accepted here.",
    "تُقبل مستندات PDF فقط هنا.",
  ],
  brochure_limit_reached: [
    "This listing already has the maximum number of brochures.",
    "بلغ هذا العرض الحد الأقصى لعدد الكتيّبات.",
  ],

  upload_failed: ["The file could not be uploaded.", "تعذّر رفع الملف."],
  attach_failed: [
    "The file was stored but could not be attached to the listing.",
    "تم حفظ الملف لكن تعذّر إرفاقه بالعرض.",
  ],

  no_order: ["No new order was received.", "لم يصل ترتيب جديد."],
  no_matching_photos: [
    "None of those photos belong to this listing.",
    "لا تنتمي أي من هذه الصور إلى هذا العرض.",
  ],
  reorder_failed: ["The photos could not be reordered.", "تعذّر إعادة ترتيب الصور."],

  media_not_found: ["That file is no longer on this listing.", "لم يعد هذا الملف على هذا العرض."],
  remove_failed: ["The file could not be removed.", "تعذّر حذف الملف."],

  not_configured: [
    "This is temporarily unavailable. Try again shortly.",
    "هذه الخدمة غير متاحة مؤقتاً. أعد المحاولة بعد قليل.",
  ],
  status_transition_not_allowed: [
    "Only a published listing can be paused, and only a paused one resumed.",
    "يمكن إيقاف العرض المنشور فقط، ولا يمكن استئناف إلا العرض الموقوف.",
  ],
  /**
   * The one sentence this table has for the whole publish gate. It is the last
   * resort and not the normal path: the route also returns `reasons`, the gate's
   * own stable vocabulary, and a client that has those renders them through
   * `gateReasonsText` because they name the specific thing the owner has to go
   * and fix. A gate refusal that says only this is a gate refusal that lost its
   * reasons in transit.
   */
  publish_gate_failed: [
    "This listing cannot go back on the market yet.",
    "لا يمكن إعادة نشر هذا العرض بعد.",
  ],
  status_update_failed: [
    "The listing status could not be changed.",
    "تعذّر تغيير حالة العرض.",
  ],

  review_update_failed: [
    "The review decision could not be saved.",
    "تعذّر حفظ قرار المراجعة.",
  ],
  unknown_action: ["That action is not recognised.", "هذا الإجراء غير معروف."],

  sign_in_to_edit_profile: ["Sign in to edit your profile.", "سجّل الدخول لتعديل ملفك."],
  website_scheme_required: [
    "The website address must begin with http:// or https://",
    "يجب أن يبدأ عنوان الموقع بـ http:// أو https://",
  ],
  logo_url_scheme_required: [
    "The logo address must begin with http:// or https://",
    "يجب أن يبدأ عنوان الشعار بـ http:// أو https://",
  ],
  invalid_public_email: [
    "That is not a valid email address.",
    "هذا ليس بريداً إلكترونياً صحيحاً.",
  ],
  /**
   * These four replace a leak, not a sentence. The routes below used to return
   * PostgREST's own `error.message` to the browser, which is an internal database
   * sentence shown to a member of the public: it names columns, constraints and
   * sometimes the shape of a table. Finding 22 found the same thing in the intake
   * routes. The real message is now written to the server log, where the person
   * who can act on it reads it, and the person who cannot is told what happened.
   */
  profile_save_failed: ["Your profile could not be saved.", "تعذّر حفظ ملفك."],

  invalid_role: ["Choose one of the listed roles.", "اختر أحد الأدوار المتاحة."],
  invalid_name: [
    "Enter your full name, between 2 and 120 characters.",
    "اكتب اسمك الكامل، بين حرفين و120 حرفاً.",
  ],
  invalid_email: ["Enter a valid email address.", "اكتب بريداً إلكترونياً صحيحاً."],
  details_too_large: [
    "There is too much detail to store. Shorten your answers.",
    "التفاصيل أطول مما يمكن حفظه. اختصر إجاباتك.",
  ],
  signup_store_failed: [
    "Your request could not be stored. Try again shortly.",
    "تعذّر حفظ طلبك. أعد المحاولة بعد قليل.",
  ],

  brief_required: [
    "No requirement was received. Fill the form and try again.",
    "لم يصل أي طلب. أكمل النموذج ثم أعد المحاولة.",
  ],
  asset_type_required: ["Choose an asset type first.", "اختر نوع الأصل أولاً."],
  shortlist_failed: [
    "The shortlist could not be built. Try again shortly.",
    "تعذّر إعداد القائمة المختصرة. أعد المحاولة بعد قليل.",
  ],
};

export const API_ERROR_CODES = Object.keys(MESSAGES) as ApiErrorCode[];

export function isApiErrorCode(v: unknown): v is ApiErrorCode {
  return typeof v === "string" && Object.prototype.hasOwnProperty.call(MESSAGES, v);
}

/**
 * The sentence for a refusal, in the reader's language.
 *
 * `fallback` is the caller's own sentence for this surface, already in the
 * reader's language, and it is what an unrecognised or missing code resolves
 * to. It is required rather than optional so that adding a call site is a
 * decision about what to say when the platform does not know, rather than a
 * default nobody chose.
 */
export function apiErrorMessage(code: unknown, ar: boolean, fallback: string): string {
  if (!isApiErrorCode(code)) return fallback;
  return MESSAGES[code][ar ? 1 : 0];
}
