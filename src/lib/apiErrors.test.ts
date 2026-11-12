import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { API_ERROR_CODES, apiErrorMessage, isApiErrorCode } from "./apiErrors";

/**
 * Finding 203. These are guards, not unit tests of a pure function.
 *
 * The defect they exist to prevent is not "the table has a typo". It is a route
 * added later that refuses without naming a reason, or a client that goes back
 * to rendering the route's English sentence because that is one character
 * shorter to write. Both are caught here by reading the source, because both
 * are properties of the source and not of any value this module returns.
 */

const ROOT = path.join(__dirname, "..", "..");
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8");

// The routes whose refusals this table names. Slices A to F of finding 203.
//
// One route is deliberately absent: /api/requirements/[id]/matches. Its eight
// refusals are never rendered, because the page that calls it treats a 401 or a
// 403 as a permission the visitor has not got yet rather than as a failure, and
// says so through the register button instead. Coding refusals nobody displays
// would put eight sentence pairs in this table that no reader will ever meet,
// which is the dead weight guard 3 exists to prevent.
const ROUTES_IN_SCOPE = [
  "src/app/api/listings/[id]/media/route.ts",
  "src/app/api/listings/[id]/media/[mediaId]/route.ts",
  "src/app/api/listings/[id]/docs/route.ts",
  "src/app/api/listings/[id]/evidence-marks/route.ts",
  "src/app/api/listings/[id]/status/route.ts",
  "src/app/api/listings/[id]/review/route.ts",
  "src/app/api/account/route.ts",
  "src/app/api/signup/route.ts",
  "src/app/api/advisor/shortlist/route.ts",
  "src/app/api/viewings/[id]/decision/route.ts",
  "src/app/api/viewings/review/route.ts",
  "src/app/api/signups/review/route.ts",
  "src/app/api/admin/accounts/[id]/verification/route.ts",
  "src/app/api/requirements/route.ts",
  "src/app/api/requirements/[id]/interest/route.ts",
  "src/app/api/viewings/route.ts",
  "src/app/api/leads/route.ts",
];

// The clients that render those refusals.
const CLIENTS_IN_SCOPE = [
  "src/components/ListingMediaManager.tsx",
  "src/components/ListingDocsManager.tsx",
  "src/components/ListingStudio.tsx",
  "src/components/ListingStatusToggle.tsx",
  "src/components/ReviewActions.tsx",
  "src/components/ProfileForm.tsx",
  "src/components/SignupFlow.tsx",
  "src/app/[locale]/find/page.tsx",
  "src/components/ViewingDecision.tsx",
  "src/components/ViewingActions.tsx",
  "src/components/SignupActions.tsx",
  "src/components/VerifyAccount.tsx",
  "src/app/[locale]/post-requirement/RequirementForm.tsx",
  "src/app/[locale]/requirements/[id]/page.tsx",
  "src/components/ListingEnquiry.tsx",
];

/** Every `NextResponse.json({ ... }, { status: NNN })` in a route file. */
function responses(src: string): { body: string; status: number }[] {
  const out: { body: string; status: number }[] = [];
  const marker = "NextResponse.json(";
  let i = src.indexOf(marker);
  while (i !== -1) {
    // Walk braces from the call's open paren so a nested object or a template
    // literal containing a brace does not end the match early.
    let depth = 0;
    let j = i + marker.length;
    let start = -1;
    for (; j < src.length; j++) {
      const c = src[j];
      if (c === "(") depth++;
      else if (c === ")") {
        if (depth === 0) break;
        depth--;
      } else if (c === "{" && depth === 0 && start === -1) start = j;
      else if (c === "{") depth++;
      else if (c === "}") depth--;
      if (start !== -1 && depth === 0 && c === "}") {
        break;
      }
    }
    const body = start === -1 ? "" : src.slice(start, j + 1);
    const tail = src.slice(j, j + 80);
    const m = /status:\s*(\d{3})/.exec(tail);
    out.push({ body, status: m ? Number(m[1]) : 200 });
    i = src.indexOf(marker, j);
  }
  return out;
}

/**
 * Every code a route can emit, including both halves of a ternary. The value of
 * `code:` is read to the end of its line rather than matched as a quoted
 * literal, because `code: kind === "brochure" ? "a" : "b"` emits two codes and a
 * literal-only pattern silently sees neither.
 *
 * The right side of a comparison is removed before the quoted strings are read.
 * In `code: kind === "floorplan" ? "floorplan_limit_reached" : "photo_limit_reached"`
 * the word "floorplan" is the value being tested, not a code the route can
 * return, and counting it would have this guard reject a correct route.
 */
function emittedCodes(src: string): string[] {
  const out: string[] = [];
  for (const m of src.matchAll(/\bcode:\s*([^\n]*)/g)) {
    const value = m[1].replace(/[=!]==?\s*"[^"]*"/g, "");
    for (const q of value.matchAll(/"([a-z_]+)"/g)) out.push(q[1]);
  }
  return out;
}

test("finding 203: every refusal in scope states a code", () => {
  for (const rel of ROUTES_IN_SCOPE) {
    const src = read(rel);
    for (const r of responses(src)) {
      if (r.status < 400) continue;
      assert.ok(
        /\bcode:/.test(r.body),
        `${rel}: a refusal with status ${r.status} states no code:\n${r.body}`,
      );
    }
  }
});

test("finding 203: every code a route emits is nameable", () => {
  const emitted = new Set<string>();
  for (const rel of ROUTES_IN_SCOPE) {
    for (const c of emittedCodes(read(rel))) emitted.add(c);
  }
  assert.ok(emitted.size > 0, "no codes were found, so the scan is broken rather than clean");
  for (const c of emitted) {
    assert.ok(isApiErrorCode(c), `route emits "${c}" which this table cannot name`);
  }
});

test("finding 203: every code this table names is emitted by a route", () => {
  const emitted = new Set<string>();
  for (const rel of ROUTES_IN_SCOPE) {
    for (const c of emittedCodes(read(rel))) emitted.add(c);
  }
  // A limit code is reached through a ternary, so the scan reads the whole
  // value expression rather than a quoted literal sitting against the colon.
  // Both halves of the ternary count. Nothing in this table is dead.
  for (const c of API_ERROR_CODES) {
    assert.ok(emitted.has(c), `"${c}" is named here and no route emits it`);
  }
});

test("finding 203: no client in scope renders the route's English sentence", () => {
  for (const rel of CLIENTS_IN_SCOPE) {
    const src = read(rel);
    assert.ok(
      // Optional chaining counts. `j?.error` is the same defect with one more
      // character in it, and a pattern that missed it would pass a client that
      // never stopped rendering the wire sentence.
      !/\bj\??\.error\b|\bdata\??\.error\b|\bjson\??\.error\b/.test(src),
      `${rel} still reads the route's English sentence`,
    );
    assert.ok(
      src.includes("apiErrorMessage("),
      `${rel} does not name the code, so a refusal has no sentence`,
    );
  }
});

test("finding 203: both halves of every entry are present and the Arabic half is Arabic", () => {
  for (const c of API_ERROR_CODES) {
    const en = apiErrorMessage(c, false, "FALLBACK");
    const ar = apiErrorMessage(c, true, "FALLBACK");
    assert.notEqual(en, "FALLBACK", `${c} has no English sentence`);
    assert.notEqual(ar, "FALLBACK", `${c} has no Arabic sentence`);
    assert.notEqual(en, ar, `${c} says the same thing in both languages`);
    assert.match(ar, /[؀-ۿ]/, `${c} has an Arabic slot with no Arabic in it`);
    assert.doesNotMatch(en, /[؀-ۿ]/, `${c} has Arabic in its English slot`);
  }
});

test("finding 203: an unrecognised or missing code falls to the caller's sentence", () => {
  assert.equal(apiErrorMessage(undefined, false, "Could not upload."), "Could not upload.");
  assert.equal(apiErrorMessage(null, true, "تعذّر الرفع."), "تعذّر الرفع.");
  assert.equal(apiErrorMessage("code_added_next_year", false, "Could not upload."), "Could not upload.");
  assert.equal(apiErrorMessage(7, false, "Could not upload."), "Could not upload.");
  assert.equal(apiErrorMessage({ code: "no_file" }, false, "Could not upload."), "Could not upload.");
});

test("finding 203: no sentence in this table is an interpolated enum", () => {
  const src = read("src/lib/apiErrors.ts");
  const table = src.slice(src.indexOf("const MESSAGES"), src.indexOf("export const API_ERROR_CODES"));
  assert.doesNotMatch(table, /\$\{/, "a sentence in this table interpolates, which does not translate");
});

test("finding 203: no em dash reached the table or the routes it serves", () => {
  // Escaped rather than written literally, because this file is itself shipped
  // copy as far as the Arabic lint is concerned, and a guard that fails the gate
  // it enforces is a guard nobody keeps.
  const emDash = "\u2014";
  for (const rel of ["src/lib/apiErrors.ts", ...ROUTES_IN_SCOPE, ...CLIENTS_IN_SCOPE]) {
    assert.ok(!read(rel).includes(emDash), `${rel} contains an em dash. Law 2`);
  }
});

test("finding 203: no route in scope guesses the reader's language from the request", () => {
  for (const rel of ROUTES_IN_SCOPE) {
    const src = read(rel).toLowerCase();
    for (const tell of ["referer", "referrer", "accept-language"]) {
      assert.ok(
        !src.includes(tell),
        `${rel} reads ${tell}, which is a guess at the reader's language and not a fact about it`,
      );
    }
  }
});

test("finding 203: no route in scope puts the database's own sentence on the wire", () => {
  // Slice C. Three of these routes returned PostgREST's `message` straight to the
  // browser: one of them before any account exists and one of them without
  // authentication at all. That is an information disclosure and not merely a
  // translation gap, so it is guarded separately from the language guards above
  // and would still be a defect in a monolingual product.
  //
  // The pattern is deliberately literal-minded. It does not attempt to work out
  // whether a given `.message` reaches a response body, because a guard that
  // reasons about reachability is a guard that can be argued with. A route that
  // needs the real sentence writes it to the log.
  for (const rel of ROUTES_IN_SCOPE) {
    const src = read(rel);
    const stripped = src.replace(/console\.error\([^\n]*\)/g, "");
    assert.doesNotMatch(
      stripped,
      /\berror\??\.message\b/,
      `${rel} reads the database's own sentence outside a log line, which is how it reached the browser`,
    );
  }
});

test("finding 203: the publish gate's own reasons survive to the client", () => {
  // The gate refusal is the one case where the shared table is the fallback and
  // not the answer. The route has to keep sending `reasons`, and the toggle has
  // to keep preferring them, or an owner is told only that the listing cannot go
  // up and never which document is missing.
  const route = read("src/app/api/listings/[id]/status/route.ts");
  assert.match(route, /reasons:\s*fails/, "the status route stopped sending the gate's reasons");

  const client = read("src/components/ListingStatusToggle.tsx");
  assert.match(client, /isGateReason/, "the toggle no longer validates the reasons it renders");
  assert.match(client, /gateReasonsText\(/, "the toggle no longer renders the gate's own reasons");
});
