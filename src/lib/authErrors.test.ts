import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  AUTH_ERROR_CODES,
  COLLAPSED_AUTH_CODES,
  authErrorCode,
  authErrorMessage,
  authMessage,
  isAuthErrorCode,
} from "./authErrors";
import { DEFAULT_NEXT, localeOfNext, safeNext } from "./authRedirect";
import { getDictionary } from "@/i18n/getDictionary";

/**
 * PKG-E1-READINESS slice D, WS25. Recorded account-enumeration coverage.
 *
 * The property under test is a negative one and that is why it needs recording.
 * Nothing about a page that refuses correctly looks different from a page that
 * refuses too helpfully, so the difference has to be asserted rather than
 * reviewed. Three kinds of assertion appear below.
 *
 * The first reads the resolver. Every account-state code the authentication
 * library can return must arrive at the caller's own generic sentence, and so
 * must a code invented for this test, which stands for the code a future
 * library version will add after nobody is looking at this file any more.
 *
 * The second reads the source of the two sign-in surfaces, because "this page
 * renders the library's English sentence" is a property of the source and of no
 * value the modules export. It is the same technique `apiErrors.test.ts` uses
 * for the same reason.
 *
 * The third reads the two dictionaries, because a generic refusal that exists
 * in one language only is not a generic refusal, it is an English one.
 */

const ROOT = path.join(__dirname, "..", "..");
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8");

const LOGIN = read("src/app/[locale]/login/page.tsx");
const CALLBACK = read("src/app/auth/callback/page.tsx");
const SIGNUP_ROUTE = read("src/app/api/signup/route.ts");
const SIGNUP_CLIENT = read("src/components/SignupFlow.tsx");
const SOURCE = read("src/lib/authErrors.ts");

const ARABIC = /[؀-ۿ]/;
const EN_FALLBACK = "GENERIC-EN";
const AR_FALLBACK = "GENERIC-AR";

/** What the library hands a call site: an object carrying a code and a sentence. */
const authError = (code?: string) => ({
  name: "AuthApiError",
  message: "A sentence written in English by the authentication library.",
  status: 400,
  code,
});

// ----------------------------------------------------------- 1. the resolver

test("every account-state code collapses to the caller's own sentence", () => {
  for (const code of COLLAPSED_AUTH_CODES) {
    assert.equal(authErrorCode(authError(code)), null, `${code} is nameable and must not be`);
    assert.equal(authMessage(authError(code), false, EN_FALLBACK), EN_FALLBACK, code);
    assert.equal(authMessage(authError(code), true, AR_FALLBACK), AR_FALLBACK, code);
  }
});

test("the four sign-in outcomes that name an account are indistinguishable", () => {
  // Stated as its own case because these are the four an attacker would type an
  // address to obtain: wrong password, exists but unconfirmed, exists and
  // suspended, does not exist. If any pair of these ever produces two different
  // sentences, the login form is a membership lookup for a platform whose
  // members are named owners, brokers and licensed agents.
  const said = ["invalid_credentials", "email_not_confirmed", "user_banned", "user_not_found"].map((c) =>
    authMessage(authError(c), false, EN_FALLBACK),
  );
  assert.equal(new Set(said).size, 1, `four outcomes produced ${new Set(said).size} sentences`);
  assert.equal(said[0], EN_FALLBACK);
});

test("an unrecognised code, a missing code and a plain error all collapse", () => {
  // The unrecognised code stands for whatever the next library version adds.
  // The default direction of this resolver is the reason that upgrade is safe.
  assert.equal(authErrorCode(authError("a_code_added_in_some_later_version")), null);
  assert.equal(authErrorCode(authError(undefined)), null);
  assert.equal(authErrorCode(new Error("no session")), null);
  assert.equal(authErrorCode(null), null);
  assert.equal(authErrorCode("invalid_credentials"), null, "a bare string is not an error object");
  assert.equal(authMessage(new Error("no session"), true, AR_FALLBACK), AR_FALLBACK);
});

test("signup_disabled is collapsed, because it is the one configuration that leaks", () => {
  // With `shouldCreateUser` true an unknown address is sent a link exactly as a
  // known one is. If email signups are ever switched off in the project, the
  // unknown address is refused with this code while the known one still
  // succeeds. Naming it would add the reason to the difference; collapsing it
  // does not close the difference, which is recorded as a limitation in the
  // module and is a project configuration decision rather than a wording one.
  assert.equal(authErrorCode(authError("signup_disabled")), null);
  assert.ok(SOURCE.includes("shouldCreateUser"), "the limitation is not recorded beside the table");
});

test("the codes that may be named are true of the request, not of the account", () => {
  const named: Record<string, string> = {
    validation_failed: "email_invalid",
    email_address_invalid: "email_invalid",
    over_request_rate_limit: "too_many_attempts",
    over_email_send_rate_limit: "too_many_attempts",
    provider_disabled: "provider_not_enabled",
    email_provider_disabled: "provider_not_enabled",
    oauth_provider_not_supported: "provider_not_enabled",
    otp_disabled: "provider_not_enabled",
    captcha_failed: "captcha_failed",
    otp_expired: "link_invalid",
    flow_state_expired: "link_invalid",
    bad_oauth_state: "link_invalid",
    session_expired: "link_invalid",
    unexpected_failure: "service_unavailable",
    request_timeout: "service_unavailable",
  };
  for (const [raw, code] of Object.entries(named)) {
    assert.equal(authErrorCode(authError(raw)), code, raw);
    assert.notEqual(authMessage(authError(raw), false, EN_FALLBACK), EN_FALLBACK, raw);
  }
});

test("the nameable table is bilingual, and the two languages are not the same string", () => {
  for (const code of AUTH_ERROR_CODES) {
    const en = authErrorMessage(code, false, EN_FALLBACK);
    const ar = authErrorMessage(code, true, AR_FALLBACK);
    assert.ok(en.length > 8, code);
    assert.ok(ar.length > 8, code);
    assert.notEqual(en, ar, code);
    assert.ok(ARABIC.test(ar), `${code} has no Arabic in its Arabic entry`);
    assert.ok(!ARABIC.test(en), `${code} has Arabic in its English entry`);
    assert.ok(isAuthErrorCode(code));
  }
  assert.ok(!isAuthErrorCode("invalid_credentials"), "a library code is not one of ours");
});

// -------------------------------------------------------- 2. the two surfaces

test("neither sign-in surface renders the authentication library's own sentence", () => {
  // The idiom being refused is the one that reads the error object's message
  // property straight into the page state. It is spelled out nowhere in this
  // assertion, because a guard that reads source would find its own example.
  for (const [name, src] of [["login", LOGIN], ["callback", CALLBACK]] as const) {
    assert.ok(!/setError\(error\.message\)/.test(src), `${name} renders the library sentence`);
    assert.ok(!/setMsg\(error\.message\)/.test(src), `${name} renders the library sentence`);
    assert.ok(!/\berror\.message\b/.test(src), `${name} reads the library sentence`);
    assert.ok(src.includes("authMessage("), `${name} does not resolve refusals through the table`);
  }
});

test("the login page resolves all three of its refusals, and creates on link", () => {
  assert.equal((LOGIN.match(/authMessage\(/g) ?? []).length, 3, "a sign-in path refuses without the table");
  assert.match(LOGIN, /shouldCreateUser:\s*true/);
  // Stated rather than inherited from the library default, so that turning it
  // off has to be typed by somebody who can then be asked why.
  assert.ok(
    LOGIN.indexOf("shouldCreateUser") < LOGIN.indexOf("emailRedirectTo"),
    "the option is not on the sign-in link call",
  );
});

test("the callback page is bilingual and returns the reader to their own login page", () => {
  assert.ok(!/Signing you in/.test(CALLBACK), "the callback still holds hardcoded English");
  assert.ok(!/Auth not configured/.test(CALLBACK), "the callback still holds hardcoded English");
  assert.ok(!/Back to sign in"/.test(CALLBACK), "the callback still holds hardcoded English");
  assert.ok(!CALLBACK.includes('href="/en/login"'), "the callback sends every reader to the English page");
  assert.match(CALLBACK, /getDictionary\(locale\)/);
  assert.match(CALLBACK, /localeOfNext\(/);
  assert.match(CALLBACK, /safeNext\(/);
  assert.match(CALLBACK, /dir=\{locale === "ar"/);
});

test("the signup route keeps one answer for every stored request that failed", () => {
  // The enumeration surface a signup form has is the duplicate address. If the
  // route ever reads the database's unique-violation code and says so, the form
  // becomes a membership lookup that needs no password at all.
  assert.ok(!SIGNUP_ROUTE.includes("23505"), "the signup route branches on the duplicate-row code");
  assert.ok(!/email.*already|already.*registered/i.test(SIGNUP_ROUTE), "the signup route names a duplicate address");
  assert.equal((SIGNUP_ROUTE.match(/signup_store_failed/g) ?? []).length, 1);
  // And the client never renders the route's own English sentence, which is
  // where finding 203 closed this same class everywhere else.
  assert.ok(!/setErr\(j\.error/.test(SIGNUP_CLIENT), "the signup client renders the route sentence");
  assert.match(SIGNUP_CLIENT, /apiErrorMessage\(/);
});

// ------------------------------------------------- 3. where a link may land

test("a sign-in link may only land on a path of this origin", () => {
  assert.equal(safeNext("/ar/go"), "/ar/go");
  assert.equal(safeNext("/en/dashboard?tab=listings"), "/en/dashboard?tab=listings");
  for (const hostile of [
    "https://example.invalid/",
    "//example.invalid/",
    "/\\example.invalid",
    "\\\\example.invalid",
    "javascript:alert(1)",
    "http://example.invalid",
    "",
    null,
    undefined,
  ]) {
    assert.equal(safeNext(hostile), DEFAULT_NEXT, JSON.stringify(hostile));
  }
});

test("the language of the landing page is the language of the destination", () => {
  assert.equal(localeOfNext("/ar/go"), "ar");
  assert.equal(localeOfNext("/en/go"), "en");
  assert.equal(localeOfNext(DEFAULT_NEXT), "en");
  assert.equal(localeOfNext("/fr/go"), "en", "an unknown segment falls to English");
  assert.equal(localeOfNext("/"), "en");
  assert.equal(localeOfNext(safeNext("//example.invalid/ar/go")), "en", "a refused value cannot pick the language");
});

// ------------------------------------------------------- 4. the dictionaries

test("every generic sign-in refusal exists in both languages", () => {
  const keys = ["errSignIn", "errLinkNotSent", "errProvider", "errLinkInvalid", "errNotConfigured", "errEnterEmail"] as const;
  const en = getDictionary("en").login as Record<string, string>;
  const ar = getDictionary("ar").login as Record<string, string>;
  for (const k of keys) {
    assert.ok(typeof en[k] === "string" && en[k].length > 8, `en.login.${k}`);
    assert.ok(typeof ar[k] === "string" && ar[k].length > 8, `ar.login.${k}`);
    assert.ok(ARABIC.test(ar[k]), `ar.login.${k} is not Arabic`);
    assert.ok(!ARABIC.test(en[k]), `en.login.${k} is not English`);
  }
});

test("the generic sign-in refusal leaves the reader a way in", () => {
  // Collapsing the account-state codes costs a real member the reason they were
  // refused. The refusal therefore has to carry the next thing to try, and on
  // the password form that is the sign-in link, which works for a confirmed
  // account and an unconfirmed one alike.
  const en = getDictionary("en").login as Record<string, string>;
  const ar = getDictionary("ar").login as Record<string, string>;
  assert.match(en.errSignIn, /sign-in link/);
  assert.ok(ar.errSignIn.includes("رابط"), "the Arabic refusal does not mention the link");
});
