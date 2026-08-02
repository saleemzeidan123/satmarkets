/**
 * PKG-E1-READINESS slice D, WS25. What the sign-in surfaces say when they
 * refuse, and the one thing they must never say.
 *
 * THE DEFECT. Three call sites on `/[locale]/login` and the whole of
 * `/auth/callback` rendered the authentication library's own English sentence
 * straight into the page. That is two failures at once and only the first is
 * obvious.
 *
 * The obvious one is language. An Arabic reader signing in on the Arabic build
 * was refused in English, which is the same class as finding 22 and finding
 * 203, already closed everywhere else on the platform.
 *
 * The one that matters more is enumeration. GoTrue does not return one refusal
 * for a failed sign-in, it returns the true reason: `invalid_credentials` when
 * the password is wrong, `email_not_confirmed` when the account exists but has
 * never confirmed, `user_banned` when it exists and is suspended,
 * `user_not_found` when there is no such account at all. Rendering whichever
 * one arrives turns the login form into a free membership oracle: type an
 * address, read the sentence, learn whether that person holds an account on a
 * platform whose members are named owners, brokers and licensed agents. On a
 * Saudi commercial property exchange that is a disclosure about the person, not
 * about the request, and the person never agreed to it.
 *
 * THE FIX, and why it is an allowlist rather than a blocklist. `authErrorCode`
 * names a refusal only when the refusal is true no matter whose email address
 * was typed. Everything else resolves to `null` and the call site says its own
 * single generic sentence. The default direction is therefore silence: a code
 * this file has never heard of, a library upgrade that adds a new one, an
 * error that arrives with no code at all, and every account-state code listed
 * in COLLAPSED below all reach the reader as the same sentence. A blocklist
 * would have the opposite default and would leak on the next dependency bump.
 *
 * THIS IS A THIRD TABLE AND MUST STAY ONE. `listingIntakeErrors.ts` names why
 * a listing would not save; `apiErrors.ts` names why a write refused across the
 * wider API. Both exist to tell a reader precisely what went wrong. This table
 * exists to tell a reader as little as the platform can get away with while
 * still leaving them a way in, which is the opposite instruction, so merging it
 * into either of the others would eventually import their virtue as a bug.
 *
 * KEEPING RECOVERY POSSIBLE. Collapsing the account-state codes has a cost: a
 * real member whose account exists but was never confirmed is told only that
 * something did not match. So the generic sentences do not stop at the refusal.
 * Each one names the next thing the reader can do, and on the password form
 * that is the sign-in link, which works for a confirmed account and an
 * unconfirmed one alike. The reader is never told which of the two they are,
 * and never needs to be.
 *
 * A RECORDED LIMITATION, not a defect in this file. The magic-link path is safe
 * because `shouldCreateUser` is true, so an address with no account is sent a
 * link exactly as one with an account is, and the two are indistinguishable
 * from outside. If email signups are ever disabled in the Supabase project,
 * GoTrue answers the unknown address with `signup_disabled` while the known one
 * still succeeds, and the difference between "check your email" and any refusal
 * at all becomes an oracle that no wording on this side can close. That is a
 * project configuration decision, it is recorded here, and `authErrors.test.ts`
 * holds `shouldCreateUser: true` in place so it cannot be changed silently.
 */

/**
 * The refusals that may be named. Every one of them is true of the request
 * rather than of the account behind the email address in it.
 */
export type AuthErrorCode =
  /** The address is not a usable email address. About the string, not the account. */
  | "email_invalid"
  /** Too many attempts from here, or too many emails to this address. */
  | "too_many_attempts"
  /** The provider is switched off in this project. True for every account. */
  | "provider_not_enabled"
  /** The bot check did not pass. Nothing to do with membership. */
  | "captcha_failed"
  /** The token in the link is spent, expired or was never issued by us. */
  | "link_invalid"
  /** This deployment has no auth credentials configured. */
  | "not_configured"
  /** Auth is reachable but did not answer. */
  | "service_unavailable";

const MESSAGES: Record<AuthErrorCode, [string, string]> = {
  email_invalid: [
    "Enter a valid email address.",
    "أدخل بريداً إلكترونياً صحيحاً.",
  ],
  too_many_attempts: [
    "Too many attempts. Wait a few minutes and try again.",
    "محاولات كثيرة. انتظر بضع دقائق ثم أعد المحاولة.",
  ],
  provider_not_enabled: [
    "That sign-in method is not enabled yet.",
    "طريقة الدخول هذه غير مفعّلة بعد.",
  ],
  captcha_failed: [
    "The security check did not pass. Reload the page and try again.",
    "لم يجتز فحص الأمان. أعد تحميل الصفحة ثم حاول مرة أخرى.",
  ],
  link_invalid: [
    "That sign-in link is invalid or has expired. Request a new one.",
    "رابط الدخول غير صالح أو انتهت صلاحيته. اطلب رابطاً جديداً.",
  ],
  // Worded identically to `login.errNotConfigured` in both dictionaries, because
  // it is the same condition met on the page next door and a reader who bounces
  // between them should not think two different things went wrong.
  not_configured: [
    "Sign-in is not configured on this environment yet.",
    "تسجيل الدخول غير مهيأ في هذه البيئة بعد.",
  ],
  service_unavailable: [
    "Sign-in is unavailable right now. Try again shortly.",
    "تسجيل الدخول غير متاح حالياً. أعد المحاولة بعد قليل.",
  ],
};

export const AUTH_ERROR_CODES = Object.keys(MESSAGES) as AuthErrorCode[];

export function isAuthErrorCode(v: unknown): v is AuthErrorCode {
  return typeof v === "string" && Object.prototype.hasOwnProperty.call(MESSAGES, v);
}

/**
 * The library codes this file agrees to name, and the name each one takes.
 *
 * Read this as the complete list of things a stranger is allowed to learn from
 * a failed sign-in. Adding a row is a decision that the new row is true of
 * every email address on earth, including one that has never been typed into
 * this platform before.
 */
const NAMEABLE: Record<string, AuthErrorCode> = {
  // About the address as text.
  validation_failed: "email_invalid",
  email_address_invalid: "email_invalid",

  // About the rate of requests. Applied before the account is looked at, and
  // applied to an unknown address exactly as to a known one.
  over_request_rate_limit: "too_many_attempts",
  over_email_send_rate_limit: "too_many_attempts",
  over_sms_send_rate_limit: "too_many_attempts",

  // About this project's configuration. `signup_disabled` is deliberately NOT
  // here even though it looks like it belongs: it fires for the unknown address
  // and not for the known one, which is the definition of the thing this file
  // exists to prevent.
  provider_disabled: "provider_not_enabled",
  email_provider_disabled: "provider_not_enabled",
  phone_provider_disabled: "provider_not_enabled",
  oauth_provider_not_supported: "provider_not_enabled",
  anonymous_provider_disabled: "provider_not_enabled",
  saml_provider_disabled: "provider_not_enabled",
  otp_disabled: "provider_not_enabled",

  captcha_failed: "captcha_failed",

  // About the token already in the reader's hand. Whoever is holding the link
  // learns only that the link is finished, which they can see anyway.
  otp_expired: "link_invalid",
  flow_state_not_found: "link_invalid",
  flow_state_expired: "link_invalid",
  bad_code_verifier: "link_invalid",
  bad_oauth_state: "link_invalid",
  bad_oauth_callback: "link_invalid",
  bad_jwt: "link_invalid",
  session_not_found: "link_invalid",
  session_expired: "link_invalid",
  refresh_token_not_found: "link_invalid",
  refresh_token_already_used: "link_invalid",

  // About the service.
  unexpected_failure: "service_unavailable",
  request_timeout: "service_unavailable",
  hook_timeout: "service_unavailable",
  hook_timeout_after_retry: "service_unavailable",
};

/**
 * The library codes that describe the account rather than the request.
 *
 * Nothing reads this map. It is here so that the reasoning is recorded next to
 * the allowlist rather than in a commit message, and so that
 * `authErrors.test.ts` can assert that not one of them ever resolves to a
 * sentence. Anything absent from both lists collapses too, by default.
 */
export const COLLAPSED_AUTH_CODES = [
  "invalid_credentials",
  "email_not_confirmed",
  "phone_not_confirmed",
  "user_not_found",
  "user_banned",
  "email_exists",
  "phone_exists",
  "user_already_exists",
  "identity_already_exists",
  "identity_not_found",
  "signup_disabled",
  "email_address_not_authorized",
  "user_sso_managed",
  "provider_email_needs_verification",
  "weak_password",
  "same_password",
  "conflict",
] as const;

/**
 * The name for a refusal, or `null` when the platform will not say.
 *
 * Accepts the whole error object rather than a code, because the object is what
 * every call site is holding and asking each of them to reach for `.code`
 * themselves is asking each of them to remember not to reach for `.message`
 * instead.
 */
export function authErrorCode(err: unknown): AuthErrorCode | null {
  if (!err || typeof err !== "object") return null;
  const raw = (err as { code?: unknown }).code;
  if (typeof raw !== "string") return null;
  return Object.prototype.hasOwnProperty.call(NAMEABLE, raw) ? NAMEABLE[raw] : null;
}

/**
 * The sentence for a named refusal, in the reader's language.
 *
 * `fallback` is required, and is the caller's own generic sentence for this
 * surface, already in the reader's language. It is what an unnamed refusal
 * resolves to, which on this table is most of them. Requiring it means adding a
 * sign-in surface is a decision about what to say when the platform will not
 * explain, rather than a default nobody chose.
 */
export function authErrorMessage(code: unknown, ar: boolean, fallback: string): string {
  if (!isAuthErrorCode(code)) return fallback;
  return MESSAGES[code][ar ? 1 : 0];
}

/**
 * The one call the sign-in surfaces make. Classify, then say.
 */
export function authMessage(err: unknown, ar: boolean, fallback: string): string {
  return authErrorMessage(authErrorCode(err), ar, fallback);
}
