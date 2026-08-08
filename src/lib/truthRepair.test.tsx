import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import type { NextRequest } from "next/server";
import { POST as requirementsPost } from "@/app/api/requirements/route";
import { buildRequirementSuccessResponse } from "@/lib/requirementApi";
import NotificationsPage from "@/app/[locale]/notifications/page";
import en from "@/i18n/dictionaries/en.json";
import ar from "@/i18n/dictionaries/ar.json";

/**
 * PKG-TRUTH-REQ-1, item 5: regression protection for the honesty repair.
 *
 * WHAT THIS FILE GUARDS. Four things the synthesis found the product claiming
 * without evidence, and one page that looked like it had working controls it
 * did not have:
 *
 *   1. The requirements API returned `notified: NOTIFIED`, a hardcoded
 *      three-entry audience list, on every successful submission. Nothing in
 *      the codebase dispatches to any of the three.
 *   2. The same response called a partial-filter query "match", which
 *      overstated what it checks (status, asset type, deal type, district;
 *      not size, budget, timeline, availability, or must-haves).
 *   3. The public success card and the empty-interest state on the
 *      requirement detail page repeated the notified claim in prose.
 *   4. The notifications preview page rendered "Mark all read" and
 *      "Preferences" as button-styled spans, and rendered its per-channel
 *      preferences as switch-shaped elements, none of which did anything.
 *
 * Per Codex's instruction for this item, a source scan alone is not enough
 * for the public success state; the tests below call the actual route
 * function and the actual page component rather than only pattern-matching
 * their source.
 */

const ROOT = path.join(__dirname, "..", "..");
const SRC = (rel: string): string => fs.readFileSync(path.join(ROOT, rel), "utf8");

function post(url: string, body: unknown, ip: string): NextRequest {
  return new Request(url, {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify(body),
  }) as unknown as NextRequest;
}

const validRequirement = () => ({
  asset_type: "office",
  deal_type: "lease",
  title: "Truth repair regression fixture",
  size_min: 200,
  size_max: 500,
  budget: 2000,
});

// ---------------------------------------------------------------------------
// 1 & 2: the requirements API's success shape, called directly rather than
// scanned. This is the exact object the route sends; there is no copy for a
// regex to trust matches it.
// ---------------------------------------------------------------------------

test("the requirements success shape carries a candidate count and nothing that claims an audience or a match", () => {
  const body = buildRequirementSuccessResponse("req-1", "R-00042", 3);
  assert.equal(body.ok, true);
  assert.equal(body.id, "req-1");
  assert.equal(body.ref, "R-00042");
  assert.equal(body.candidate_count, 3);
  assert.equal(body.stored, true);
  assert.ok(!("notified" in body), "the success shape must not carry a notified field");
  assert.ok(!("match" in body), "the success shape must not carry a match field");
  assert.deepEqual(
    Object.keys(body).sort(),
    ["candidate_count", "id", "ok", "ref", "stored"],
    "the success shape grew or lost a field; every field on a public success response is a claim, so this list is exact",
  );
});

test("a zero candidate count renders as zero, not as an absent or falsy field", () => {
  // `candidate_count ?? 0` upstream means zero is a real, common outcome (an
  // asset type or district with no published inventory), and it must reach
  // the client as the number 0, not be dropped the way a falsy check would
  // drop it.
  const body = buildRequirementSuccessResponse("req-2", "R-00043", 0);
  assert.ok("candidate_count" in body, "a zero count must still be present as a key");
  assert.equal(body.candidate_count, 0);
  assert.equal(typeof body.candidate_count, "number");
});

test("the retired NOTIFIED audience constant cannot reappear in the requirements route", () => {
  // Comments legitimately name the retired constant and its members in prose
  // (this file's own header does the same, twice), so the code is scanned
  // with comments stripped rather than the raw source. `functionalTruth.test.ts`
  // establishes the same convention for the same reason.
  const src = SRC("src/app/api/requirements/route.ts");
  const code = src.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/[^\n]*/g, "$1");
  for (const phrase of ["SAT broker network", "Verified landlords in your locations", "SAT requirements desk"]) {
    assert.equal(code.includes(phrase), false, `the retired audience "${phrase}" is back in the route's live code`);
  }
  assert.equal(/\bNOTIFIED\b/.test(code), false, "a NOTIFIED constant is back in the route's live code");
  assert.equal(/\bmatch\s*:/.test(code), false, "a `match:` field is back in a response body");
});

test("an unconfigured requirements submission is refused, not confirmed, and carries none of the retired claims", async () => {
  // Mirrors functionalTruth.test.ts's pattern for the same class of defect on
  // the signup and viewings routes: the test process has no Supabase env, so
  // this exercises the route's real not-stored path, live, rather than a
  // fixture standing in for it.
  const res = await requirementsPost(post("http://test/api/requirements", validRequirement(), "203.0.113.41"));
  const body = await res.json();
  assert.equal(res.status, 503);
  assert.notEqual(body.ok, true, "an unstored requirement must not report success");
  assert.ok(!("notified" in body), "a refusal must not carry the retired notified field");
  assert.ok(!("match" in body), "a refusal must not carry the retired match field");
  assert.ok(!("candidate_count" in body), "a refusal must not carry a candidate count for a requirement that was never stored");
});

// ---------------------------------------------------------------------------
// 3: the prose claims the synthesis found in the dictionary. Scoped to the two
// namespaces that describe what happened after a submission, rather than the
// whole dictionary, because "notifications" is also a legitimate page name and
// "alerts" is also a legitimate paid-feature name elsewhere in the product.
// ---------------------------------------------------------------------------

const CLAIMS_A_COMPLETED_NOTIFICATION_EN = /\b(we\W?ve notified|we notified|notified the|notified everyone)\b/i;
const CLAIMS_A_COMPLETED_NOTIFICATION_AR = /(أبلغنا|أُبلغ|تم إبلاغ)/;

test("the requirement success body and empty-interest state no longer claim anyone was notified", () => {
  assert.equal(CLAIMS_A_COMPLETED_NOTIFICATION_EN.test(en.postReq.successBody), false, "postReq.successBody (EN) claims a completed notification");
  assert.equal(CLAIMS_A_COMPLETED_NOTIFICATION_AR.test(ar.postReq.successBody), false, "postReq.successBody (AR) claims a completed notification");
  assert.equal(CLAIMS_A_COMPLETED_NOTIFICATION_EN.test(en.reqDetail.none), false, "reqDetail.none (EN) claims a completed notification");
  assert.equal(CLAIMS_A_COMPLETED_NOTIFICATION_AR.test(ar.reqDetail.none), false, "reqDetail.none (AR) claims a completed notification");
});

test("the retired match-count and audience-notified dictionary keys are gone, not merely unused", () => {
  // Deleted rather than orphaned: a key nobody references can be reattached to
  // a surface later by someone who assumes it is still accurate.
  assert.equal("matchToday" in en.postReq, false);
  assert.equal("audiencesNotified" in en.postReq, false);
  assert.equal("matchToday" in ar.postReq, false);
  assert.equal("audiencesNotified" in ar.postReq, false);
});

test("the candidate count has a real label and caveat in both languages", () => {
  for (const dict of [en, ar]) {
    assert.ok(typeof dict.postReq.candidateCountLabel === "string" && dict.postReq.candidateCountLabel.length > 0);
    assert.ok(typeof dict.postReq.candidateCountNote === "string" && dict.postReq.candidateCountNote.length > 0);
  }
  // The label itself (as opposed to the caveat sentence below it) must not
  // claim completeness on its own if read in isolation.
  assert.equal(/\bmatch(es|ing)?\b/i.test(en.postReq.candidateCountLabel), false, "the candidate count label alone claims a match");
});

// ---------------------------------------------------------------------------
// 4 & 5(e): the notifications preview page, rendered rather than scanned.
// NotificationsPage takes no client state, so a real server render exercises
// exactly what a visitor's first paint shows.
// ---------------------------------------------------------------------------

// Next 16's async request API means a page component's `params` prop arrives
// as a Promise, and NotificationsPage is itself now `async`, returning a
// Promise<JSX.Element> rather than a JSX.Element. It is awaited twice here:
// once for the component's own promise, and the `params` it reads is a
// resolved promise too, matching what Next actually passes at runtime.
async function renderNotifications(locale: "en" | "ar"): Promise<string> {
  const element = await NotificationsPage({ params: Promise.resolve({ locale }) });
  return renderToStaticMarkup(element);
}

test("the notifications preview renders no working-looking action buttons", async () => {
  for (const locale of ["en", "ar"] as const) {
    const html = await renderNotifications(locale);
    const d = (locale === "en" ? en : ar).notifications;
    assert.equal("markAllRead" in d, false, `${locale} dictionary still carries the retired markAllRead key`);
    assert.equal("preferences" in d, false, `${locale} dictionary still carries the retired preferences key`);
    // The class the two removed buttons shared with real, working buttons
    // elsewhere in the product. If it reappears bound to non-functional text,
    // the same false affordance is back.
    assert.equal(/class="btn secondary sm"/.test(html), false, `${locale}: a decoy "btn secondary sm" control is back on the notifications page`);
  }
});

test("the notifications preview states plainly that its controls are not active", async () => {
  for (const locale of ["en", "ar"] as const) {
    const html = await renderNotifications(locale);
    const notice = (locale === "en" ? en : ar).notifications.previewNotice;
    assert.ok(notice && notice.length > 0, `${locale} has no previewNotice string`);
    assert.ok(html.includes(notice), `${locale}: the rendered page does not include the preview disclosure`);
  }
});

test("the notifications preview's per-channel indicators are static dots, not switch-shaped controls", async () => {
  for (const locale of ["en", "ar"] as const) {
    const html = await renderNotifications(locale);
    // The retired shape: a 30x18 pill (border-radius:10px) with an absolutely
    // positioned 14px circle inside it and a transition, i.e. an iOS/Material
    // toggle switch. None of those measurements belong to a static indicator.
    assert.equal(/border-radius:10px/.test(html), false, `${locale}: the switch-shaped pill radius is back`);
    assert.equal(/width:14px;?height:14px/.test(html.replace(/\s/g, "")), false, `${locale}: the switch's sliding knob size is back`);
    assert.equal(/transition:\.15s/.test(html.replace(/\s/g, "")), false, `${locale}: a transition on the indicator implies it responds to interaction`);
    // The replacement: a small round dot, described by an aria-label rather
    // than implied by a shape.
    assert.ok(html.includes("included in this preview") || html.includes((ar.notifications as any).previewOn), `${locale}: no static-indicator aria-label found`);
  }
});

test("the notifications preview keeps the generic sample-data disclosure alongside its own control disclosure", async () => {
  // SampleBanner discloses that the CONTENT is fake; previewNotice discloses
  // that the CONTROLS are inert. These are two different claims and the page
  // must keep making both.
  for (const locale of ["en", "ar"] as const) {
    const html = await renderNotifications(locale);
    const chrome = (locale === "en" ? en : ar).chrome.sampleData;
    assert.ok(html.includes(chrome), `${locale}: the generic sample-data banner is missing`);
  }
});
