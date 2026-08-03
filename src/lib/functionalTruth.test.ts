import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { apiErrorMessage } from "./apiErrors";
import { POST as signupPost } from "@/app/api/signup/route";
import { POST as viewingsPost } from "@/app/api/viewings/route";
import type { NextRequest } from "next/server";

/**
 * PKG-E1-READINESS slice A, WS13. Functional truth on the two write routes that
 * reported success for a request they had not stored.
 *
 * THE DEFECT. Both routes ended their validation, asked for a database client,
 * and when there was none answered:
 *
 *   NextResponse.json({ ok: true, note: "supabase not configured (request not stored)" })
 *
 * A 200 with `ok: true`. Both clients test `res.ok`, which is the status and not
 * the payload, so both rendered their success state: the enquiry panel confirmed
 * a viewing nobody would ever read, and the signup flow showed the "Request
 * received" card, which goes on to list what happens next by role. The `note`
 * that admitted the truth was in a field neither client displays. The defect was
 * recorded in the source for weeks with a comment saying so, which is worse than
 * not knowing and is the reason this file reads behaviour rather than comments.
 *
 * WHAT THESE TESTS ARE. The first two call the real handlers. Nothing is mocked,
 * because the condition under test is the absence of configuration and the test
 * process genuinely has none: `await getSupabaseServer()` reads two environment
 * variables and returns null before it touches `cookies()`, so the not-stored
 * path is the path a test process takes by default. That makes this the rare
 * case where the failure mode is the easy one to reproduce.
 *
 * Each request carries its own `x-forwarded-for`, because the rate limiter keys
 * on it and a shared address would make one test's refusal depend on how many
 * ran before it.
 */

const ROOT = path.join(__dirname, "..", "..");

function post(url: string, body: unknown, ip: string): NextRequest {
  return new Request(url, {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify(body),
  }) as unknown as NextRequest;
}

function rawPost(url: string, body: string, ip: string): NextRequest {
  return new Request(url, {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
    body,
  }) as unknown as NextRequest;
}

const validSignup = { role: "occupier", full_name: "Test Person", email: "person@example.com" };
const validViewing = () => ({
  listing_id: "0123abcd-4567-89ab-cdef-0123456789ab",
  contact_name: "Test Person",
  contact_email: "person@example.com",
  scheduled_at: new Date(Date.now() + 86400000).toISOString(),
});

test("slice A: a signup request that was not stored is refused, not confirmed", async () => {
  const res = await signupPost(post("http://test/api/signup", validSignup, "203.0.113.11"));
  const body = await res.json();

  assert.equal(res.status, 503, "an absent dependency is a 503, not a 200");
  assert.notEqual(body.ok, true, "the route reported success for a request it did not store");
  assert.equal(body.code, "storage_unavailable");
  // The old payload's tell. If this string ever comes back in a body, the
  // admission is being made to a field nobody renders again.
  assert.equal(body.note, undefined, "the refusal explains itself in `code`, not in an undisplayed note");
});

test("slice A: a viewing request that was not stored is refused, and promises nothing", async () => {
  const res = await viewingsPost(post("http://test/api/viewings", validViewing(), "203.0.113.12"));
  const body = await res.json();

  assert.equal(res.status, 503);
  assert.notEqual(body.ok, true);
  assert.equal(body.code, "storage_unavailable");
  // The success shape carries these two. A caller that reads either of them out
  // of a refusal is reading a viewing that does not exist, so neither may be
  // present even as null.
  assert.ok(!("id" in body), "a refusal carried the success shape's id");
  assert.ok(!("tracked" in body), "a refusal carried the success shape's tracked flag");
});

test("slice A: the refusal has a sentence in both languages and neither is the wire sentence", async () => {
  const res = await signupPost(post("http://test/api/signup", validSignup, "203.0.113.13"));
  const body = await res.json();

  const en = apiErrorMessage(body.code, false, "FALLBACK");
  const ar = apiErrorMessage(body.code, true, "FALLBACK");
  assert.notEqual(en, "FALLBACK", "the code the route sends is not nameable in English");
  assert.notEqual(ar, "FALLBACK", "the code the route sends is not nameable in Arabic");
  assert.match(ar, /[؀-ۿ]/, "the Arabic sentence has no Arabic in it");
  assert.notEqual(en, body.error, "the reader is shown the log's own sentence");
  assert.notEqual(ar, body.error, "the Arabic reader is shown the log's own English sentence");
});

test("slice A: validation still refuses before the store is ever consulted", async () => {
  // Before-and-after evidence that the repair did not move the guard. A bad role
  // and a bad email are 400s with their own codes, and they are still reached on
  // a deployment with no database, because they are properties of the request.
  const badRole = await signupPost(post("http://test/api/signup", { ...validSignup, role: "landlord" }, "203.0.113.14"));
  assert.equal(badRole.status, 400);
  assert.equal((await badRole.json()).code, "invalid_role");

  const badEmail = await signupPost(post("http://test/api/signup", { ...validSignup, email: "person@" }, "203.0.113.15"));
  assert.equal(badEmail.status, 400);
  assert.equal((await badEmail.json()).code, "invalid_email");

  const pastSlot = await viewingsPost(post("http://test/api/viewings", { ...validViewing(), scheduled_at: "2020-01-01T10:00:00.000Z" }, "203.0.113.16"));
  assert.equal(pastSlot.status, 400);
  assert.equal((await pastSlot.json()).code, "viewing_slot_invalid");
});

test("slice A: an unparseable body is refused with a code rather than thrown", async () => {
  // The signup route read `await req.json()` outside a guard, so a malformed
  // body threw out of the handler and Next answered a bare 500 with no code.
  // The one refusal a reader could not act on was the one their own request
  // caused. Both routes now parse inside a guard and fall through to the first
  // validation that fails.
  const s = await signupPost(rawPost("http://test/api/signup", "{not json", "203.0.113.17"));
  assert.equal(s.status, 400);
  assert.equal((await s.json()).code, "invalid_role");

  const v = await viewingsPost(rawPost("http://test/api/viewings", "{not json", "203.0.113.18"));
  assert.equal(v.status, 400);
  assert.equal((await v.json()).code, "listing_not_identified");
});

test("slice A: the not-stored log line records the condition and not the person", async () => {
  // The payload of both routes is personal data: a name, a work email, and on
  // signup a company and a phone number. A log written for a misconfiguration
  // should not accumulate the details of everyone who met it, so the line names
  // the condition only. Read from source rather than by capturing stderr,
  // because the property being asserted is what the line may contain, not what
  // one invocation happened to write.
  for (const rel of ["src/app/api/signup/route.ts", "src/app/api/viewings/route.ts"]) {
    const src = fs.readFileSync(path.join(ROOT, rel), "utf8");
    const notStored = src.split("\n").filter((l) => l.includes("console.error") && l.includes("not stored"));
    assert.equal(notStored.length, 1, `${rel}: expected exactly one not-stored log line`);
    for (const field of ["name", "email", "phone", "company", "body.", "listing_id", "contact_"]) {
      assert.ok(
        !notStored[0].includes(field),
        `${rel}: the not-stored log line interpolates ${field}, which is a request value`,
      );
    }
  }
});

test("slice A: the database's own error object no longer reaches the log whole", () => {
  // A PostgREST error's `details` field quotes the failing row back, so a unique
  // violation on the email column wrote an applicant's email address into the
  // log. The message and the code are what a reader diagnoses from and neither
  // carries a request value.
  const src = fs.readFileSync(path.join(ROOT, "src/app/api/signup/route.ts"), "utf8");
  assert.ok(
    !/console\.error\([^)]*,\s*error\s*\)/.test(src),
    "the whole PostgREST error object is logged again, and its details field quotes the row",
  );
});

/**
 * The class guard. The two routes are repaired; this is what stops a third
 * arriving.
 *
 * Its boundary, stated rather than implied. It reads write responses only, and
 * it catches the exact shape of this defect: a success status carrying either
 * the phrase "not stored" or `ok: true` beside "not configured". It does NOT
 * catch every way a route could mislead. `GET /api/listings` answers
 * `{ listings: [], note: "supabase not configured" }`, which tells a browsing
 * visitor there are no listings when the truth is that we cannot tell them.
 * That is a read, it was outside the scope Codex set for this slice, and it is
 * recorded in the findings register rather than swept into a guard written for
 * a different shape. A guard that quietly grew to cover it would have made the
 * decision to fix it without anyone taking it.
 */
function apiRouteFiles(): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name === "route.ts") out.push(path.relative(ROOT, p));
    }
  };
  walk(path.join(ROOT, "src", "app", "api"));
  return out;
}

test("slice A: no API route reports success for something it did not store", () => {
  const files = apiRouteFiles();
  assert.ok(files.length > 10, `only ${files.length} route files were found, so the scan is broken rather than clean`);

  for (const rel of files) {
    const src = fs.readFileSync(path.join(ROOT, rel), "utf8");
    // Comments are removed first. Both routes describe the defect they used to
    // carry, and a guard that read prose would fail on the record of its own
    // repair.
    const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

    for (const m of code.matchAll(/NextResponse\.json\(\s*\{([\s\S]{0,400}?)\}\s*(,\s*\{[^}]*\})?\s*\)/g)) {
      const body = m[1];
      const status = /status:\s*(\d{3})/.exec(m[2] ?? "");
      const code_ = status ? Number(status[1]) : 200;
      if (code_ >= 400) continue;
      assert.ok(
        !/not stored/i.test(body),
        `${rel}: a ${code_} response says the request was not stored. A request that was not stored is a refusal`,
      );
      assert.ok(
        !(/\bok:\s*true/.test(body) && /not configured/i.test(body)),
        `${rel}: a ${code_} response reports ok:true while admitting nothing is configured`,
      );
    }
  }
});
