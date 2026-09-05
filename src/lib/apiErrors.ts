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
  | "duplicate_media"
  | "media_integrity_check_failed"
  // Durable evidence state, /api/listings/[id]/evidence-marks POST.
  | "evidence_reason_required"
  | "evidence_mark_failed"
  // Reorder, /api/listings/[id]/media PATCH.
  | "no_order"
  | "no_matching_photos"
  | "reorder_failed"
  // Removal, /api/listings/[id]/media/[mediaId] DELETE.
  | "media_not_found"
  | "remove_failed"
  // Categorization, /api/listings/[id]/media/[mediaId] PATCH.
  | "shot_key_invalid"
  | "media_scope_invalid"
  | "media_condition_invalid"
  | "no_categorization_fields"
  | "categorize_failed"
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
  | "shortlist_failed"
  // Slice D. Viewing decisions, /api/viewings/[id]/decision POST.
  | "sign_in_to_manage_viewings"
  | "viewing_status_invalid"
  | "not_your_viewing"
  | "viewing_update_failed"
  // Slice D. The two reviewer queues, /api/viewings/review and /api/signups/review POST.
  | "record_not_found"
  | "id_and_status_required"
  // Slice D. Account verification, /api/admin/accounts/[id]/verification POST.
  | "unknown_verification_status"
  | "basis_required"
  | "account_not_found"
  | "verification_not_recorded"
  | "verification_status_unchanged"
  // Slice E. Posting a requirement, /api/requirements GET and POST.
  | "invalid_request_body"
  | "asset_and_deal_type_required"
  | "title_too_long"
  | "size_and_budget_must_be_numbers"
  | "size_out_of_range"
  | "budget_out_of_range"
  | "size_min_exceeds_max"
  | "timeline_invalid"
  | "notes_too_long"
  | "work_email_invalid"
  | "district_unknown"
  | "location_required"
  | "requirement_not_saved"
  // Slice E. Answering a requirement, /api/requirements/[id]/interest POST.
  | "sign_in_to_register_interest"
  | "interest_requires_owner_or_broker"
  | "account_not_verified"
  | "interest_not_registered"
  // Slice F. Asking to see a space and asking to speak to the lister, the two
  // writes a visitor can make from a listing page without an account.
  | "listing_not_identified"
  | "contact_name_invalid"
  | "viewing_slot_invalid"
  | "viewing_not_requested"
  | "representation_not_offered"
  | "contact_details_required"
  | "enquiry_not_sent";

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
  // The sentence used to say "File storage is unavailable", which was true of
  // the five media and document surfaces this code was written for and wrong on
  // the four that adopted it afterwards: a requirement, a lead and a listing are
  // rows, not files, and nobody filing one was uploading anything. Slice A of
  // PKG-E1-READINESS adds two more row surfaces, a viewing request and an
  // account request, so the sentence is made neutral about what was being saved
  // rather than a tenth and eleventh surface being told about files they never
  // sent. It still says the two things a reader needs: it was not saved, and
  // trying again is worth doing.
  storage_unavailable: [
    "This could not be saved right now. Try again in a moment.",
    "تعذّر الحفظ الآن. أعد المحاولة بعد قليل.",
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
  /**
   * PKG-LISTING-CREATION-1B outcome C. Content-fingerprint duplicate
   * protection on listing_media, so the same photo or document uploaded
   * again in a later session is named rather than silently attached twice.
   */
  duplicate_media: [
    "This file has already been uploaded to this listing.",
    "سبق رفع هذا الملف إلى هذا العرض.",
  ],
  /**
   * Deferred-contracts item 7. mediaPublishable() refusing is not a case a
   * reader can fix by trying again with a different file: the pipeline
   * itself, not the upload, is what would need to change. This can only be
   * reached by a future edit to this route's own fixed transform list, never
   * by anything a lister does today.
   */
  media_integrity_check_failed: [
    "This upload could not be verified as safe to publish. Try again shortly.",
    "تعذّر التحقق من سلامة هذا الملف للنشر. أعد المحاولة بعد قليل.",
  ],

  evidence_reason_required: [
    "Say why this does not exist, in a few words.",
    "اذكر بإيجاز سبب عدم وجود هذا العنصر.",
  ],
  evidence_mark_failed: ["That could not be saved. Try again.", "تعذّر حفظ ذلك. أعد المحاولة."],

  no_order: ["No new order was received.", "لم يصل ترتيب جديد."],
  no_matching_photos: [
    "None of those photos belong to this listing.",
    "لا تنتمي أي من هذه الصور إلى هذا العرض.",
  ],
  reorder_failed: ["The photos could not be reordered.", "تعذّر إعادة ترتيب الصور."],

  media_not_found: ["That file is no longer on this listing.", "لم يعد هذا الملف على هذا العرض."],
  remove_failed: ["The file could not be removed.", "تعذّر حذف الملف."],
  /**
   * PKG-LISTING-CREATION-1B outcome B. Per-shot categorization on one
   * already-uploaded photo. Three separate codes for the three fields
   * rather than one generic code and an interpolated field name, for the
   * reason this file states at its own head: an English field name spliced
   * into a translated sentence is an English word inside an Arabic one.
   */
  shot_key_invalid: [
    "That is not a shot this listing's asset type uses. Choose one from the list.",
    "هذه ليست من اللقطات التي يستخدمها نوع أصل هذا العرض. اختر واحدة من القائمة.",
  ],
  media_scope_invalid: [
    "That is not a scope this platform recognises. Choose building or unit.",
    "هذا ليس نطاقاً معروفاً في المنصة. اختر المبنى أو الوحدة.",
  ],
  media_condition_invalid: [
    "That is not a condition this platform recognises. Choose current or illustrative.",
    "هذه ليست حالة معروفة في المنصة. اختر الحالة الراهنة أو التوضيحية.",
  ],
  no_categorization_fields: [
    "Nothing to update. Choose a shot, a scope, or a condition first.",
    "لا يوجد ما يُحدَّث. اختر لقطة أو نطاقاً أو حالة أولاً.",
  ],
  categorize_failed: ["The category could not be saved.", "تعذّر حفظ التصنيف."],

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

  sign_in_to_manage_viewings: ["Sign in to manage viewings.", "سجّل الدخول لإدارة المعاينات."],
  /**
   * The route used to compose this one by splicing its own allowed list into
   * the words "status must be one of", joined with commas. That is the same
   * shape as the count limit above and it fails for the same reason. It also
   * said nothing a person could act on, because the list it printed was the
   * database's vocabulary and not the two words on the buttons in front of them.
   *
   * The example is described rather than quoted here on purpose: the guard that
   * forbids an interpolated sentence in this table reads the table as text, and
   * a comment quoting the defect would trip the guard that catches it.
   */
  viewing_status_invalid: [
    "That is not a viewing status this platform recognises.",
    "هذه ليست حالة معاينة معروفة في المنصة.",
  ],
  not_your_viewing: [
    "That viewing is not on one of your listings.",
    "هذه المعاينة ليست على أحد عروضك.",
  ],
  viewing_update_failed: ["The viewing could not be updated.", "تعذّر تحديث المعاينة."],

  /**
   * Deliberately unrevealing, and the reason is written into both reviewer
   * routes: a caller who is not SAT is answered 404 rather than 403 so the
   * endpoint does not advertise its own existence. A sentence that distinguished
   * "you may not" from "it is not there" would give back exactly what the status
   * code was chosen to withhold.
   */
  record_not_found: ["That record is not available.", "هذا السجل غير متاح."],
  id_and_status_required: [
    "A record and a valid status are both required.",
    "يلزم تحديد السجل وحالة صحيحة معاً.",
  ],

  unknown_verification_status: [
    "That is not a verification status this platform recognises.",
    "هذه ليست حالة توثيق معروفة في المنصة.",
  ],
  basis_required: [
    "State the basis for this decision: what did you check, and against what?",
    "اذكر أساس هذا القرار: ماذا راجعت، ومقابل ماذا؟",
  ],
  account_not_found: ["That account no longer exists.", "لم يعد هذا الحساب موجوداً."],
  /**
   * These two are not interchangeable and must not be collapsed. The ledger is
   * written before the status moves, on purpose: a badge with no traceable
   * decision behind it is the thing the ledger exists to prevent. So the first
   * says nothing changed, and the second says the decision is on the record but
   * the account did not follow it, which is a different thing to go and check.
   */
  verification_not_recorded: [
    "The decision could not be recorded, so nothing was changed.",
    "تعذّر تسجيل القرار، ولم يتغيّر شيء.",
  ],
  verification_status_unchanged: [
    "The decision was recorded but the status did not change. Try again.",
    "سُجّل القرار لكن الحالة لم تتغيّر. أعد المحاولة.",
  ],

  /**
   * Slice E, the requirement form. This is the most public write path on the
   * platform: an occupier who has never signed in states what they need and
   * presses one button. Every refusal below was an English sentence composed in
   * the route, on a form whose every label, option and heading is already in the
   * reader's language, which made the refusal the one thing on the page that
   * stopped speaking to them at the moment they most needed it to.
   */
  invalid_request_body: [
    "That request could not be read. Reload the page and try again.",
    "تعذّر قراءة الطلب. أعد تحميل الصفحة ثم حاول مرة أخرى.",
  ],
  asset_and_deal_type_required: [
    "Choose an asset type and whether you want to lease or buy.",
    "اختر نوع العقار وما إذا كنت تريد الاستئجار أو الشراء.",
  ],
  title_too_long: [
    "That title is too long. Keep it under 160 characters.",
    "العنوان طويل. اجعله أقل من 160 حرفاً.",
  ],
  size_and_budget_must_be_numbers: [
    "Size and budget must be numbers.",
    "يجب أن يكون المقاس والميزانية أرقاماً.",
  ],
  /**
   * Two codes rather than one code and a field name, for the reason written at
   * the head of this file: the route composed the word "size" or "budget" into
   * an English sentence, and a field name spliced into a translated sentence is
   * an English word inside an Arabic one. Two entries cost two lines each and
   * read correctly in both languages.
   */
  size_out_of_range: [
    "That size is outside the range this form accepts.",
    "المقاس خارج النطاق الذي يقبله هذا النموذج.",
  ],
  budget_out_of_range: [
    "That budget is outside the range this form accepts.",
    "الميزانية خارج النطاق الذي يقبله هذا النموذج.",
  ],
  size_min_exceeds_max: [
    "The smallest size you will take is larger than the largest.",
    "أصغر مقاس تقبله أكبر من أكبر مقاس.",
  ],
  timeline_invalid: [
    "Choose one of the timelines offered.",
    "اختر أحد الجداول الزمنية المتاحة.",
  ],
  notes_too_long: [
    "Those notes are too long. Keep them under 2000 characters.",
    "الملاحظات طويلة. اجعلها أقل من 2000 حرف.",
  ],
  work_email_invalid: [
    "Enter a valid work email address.",
    "أدخل بريداً إلكترونياً مهنياً صحيحاً.",
  ],
  /**
   * Emitted twice by the same route and deliberately worded for the second one.
   * The first check is a shape check on the identifier; the second is a lookup
   * that failed to find the district. A person cannot act differently on those
   * two, because in both cases the place they picked is not one this platform
   * holds, so one sentence is the honest answer to both.
   */
  district_unknown: [
    "That district is not one this platform holds. Choose another.",
    "هذا الحي ليس من الأحياء المتاحة في المنصة. اختر حياً آخر.",
  ],
  /**
   * Finding 102 is the reason this refusal exists at all. The route used to file
   * a requirement under the literal "Riyadh" whenever the caller named no city,
   * which stored a fact nobody stated. Refusing is the correct behaviour and it
   * needs a sentence a person can act on, so this asks for the missing thing
   * rather than reporting that something was rejected.
   */
  location_required: ["Choose where you need the space.", "اختر المكان الذي تحتاج فيه المساحة."],
  requirement_not_saved: [
    "Your requirement could not be saved. Try again.",
    "تعذّر حفظ طلبك. أعد المحاولة.",
  ],

  sign_in_to_register_interest: [
    "Sign in to register interest in this requirement.",
    "سجّل الدخول لتسجيل اهتمامك بهذا الطلب.",
  ],
  /**
   * Emitted for the occupier who has no owner or broker account at all and for
   * the session whose account record has gone. Both are the same answer to the
   * person: this is not a thing your account can do. The account that is verified
   * but of the wrong kind and the account that no longer exists are a distinction
   * for the log, not for the reader, and the route keeps it there.
   */
  interest_requires_owner_or_broker: [
    "Only verified owners and brokers can register interest.",
    "تسجيل الاهتمام متاح للملّاك والوسطاء الموثّقين فقط.",
  ],
  account_not_verified: [
    "Your account is not verified yet.",
    "لم يتم توثيق حسابك بعد.",
  ],
  interest_not_registered: [
    "Your interest could not be registered. Try again.",
    "تعذّر تسجيل اهتمامك. أعد المحاولة.",
  ],

  /**
   * Slice F, the listing page. Two writes, both open to a visitor who has never
   * signed in: asking to see a space and asking to speak to the lister.
   *
   * These two had a defect the earlier slices did not. The client did not render
   * the route's English sentence, so nothing English reached an Arabic reader.
   * It collapsed all twelve refusals into one sentence instead, the same one it
   * showed for a dropped connection. A person given "That did not send" cannot
   * tell that the time they picked has passed, that their email address has a
   * typo in it, or that the platform is asking them to wait a moment. The
   * language was right and the information was gone, which is the same failure
   * arriving from the other direction.
   */
  listing_not_identified: [
    "That space could not be identified. Reload the page and try again.",
    "تعذّر تحديد هذه المساحة. أعد تحميل الصفحة ثم حاول مرة أخرى.",
  ],
  contact_name_invalid: ["Enter your name.", "أدخل اسمك."],
  /**
   * The route refuses a time in the past and a time more than three weeks out,
   * and the rail in front of the person only ever offers times inside that
   * window. So this is reached by a page left open long enough for the earliest
   * slot it drew to pass, which is exactly the case where naming the reason is
   * worth more than a generic failure: the times are still on screen, they still
   * look selectable, and the only useful instruction is to pick again.
   */
  viewing_slot_invalid: [
    "That time is no longer available. Choose another.",
    "لم يعد هذا الوقت متاحاً. اختر وقتاً آخر.",
  ],
  viewing_not_requested: [
    "Your viewing request could not be sent. Try again.",
    "تعذّر إرسال طلب المعاينة. أعد المحاولة.",
  ],
  /**
   * Not a mistake the form can make, because the only button on it sends the one
   * path this platform offers. It is coded because it is a refusal a caller can
   * receive, and because the sentence is a statement about what SAT Markets is
   * rather than about what went wrong, which makes it the last sentence on the
   * platform that should be readable in only one of its two languages.
   */
  representation_not_offered: [
    "SAT Markets does not act for buyers or tenants. Contact the lister directly.",
    "لا تمثّل سات ماركتس المشترين أو المستأجرين. تواصل مع المُعلن مباشرة.",
  ],
  contact_details_required: [
    "Enter your name and a valid work email address.",
    "أدخل اسمك وبريداً إلكترونياً مهنياً صحيحاً.",
  ],
  enquiry_not_sent: [
    "Your enquiry could not be sent. Try again.",
    "تعذّر إرسال طلبك. أعد المحاولة.",
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
