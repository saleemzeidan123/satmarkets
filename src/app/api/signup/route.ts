import { NextRequest, NextResponse } from "next/server";
import { allow } from "@/lib/ratelimit";
import { getSupabaseServer } from "@/lib/supabase/server";

const ROLES = ["occupier", "owner", "broker", "investor"] as const;

// Role-based account requests. Accounts are provisioned after SAT verifies the
// person (owners against title/permit, brokers against the FAL register), so
// this endpoint stores a structured request, it does not mint credentials.
export async function POST(req: NextRequest) {
  if (!allow("signup", req, 6)) return NextResponse.json({ ok: false, error: "Rate limited", code: "rate_limited" }, { status: 429 });
  // Parsed inside a guard, as the viewings route already does. An unparseable
  // body used to throw out of the handler, which Next answers with a bare 500
  // carrying no code, so the one refusal a reader could not act on was the one
  // caused by a malformed request. An empty object falls through to the role
  // check and refuses with `invalid_role`, which is both true and nameable.
  let body: {
    role?: string; full_name?: string; company?: string; email?: string;
    phone?: string; details?: Record<string, unknown>; locale?: string;
  } = {};
  try { body = (await req.json()) ?? {}; } catch {}
  const role = String(body.role ?? "");
  if (!(ROLES as readonly string[]).includes(role)) return NextResponse.json({ error: "invalid role", code: "invalid_role" }, { status: 400 });
  const name = String(body.full_name ?? "").trim();
  const email = String(body.email ?? "").trim();
  if (name.length < 2 || name.length > 120) return NextResponse.json({ error: "invalid name", code: "invalid_name" }, { status: 400 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 200) return NextResponse.json({ error: "invalid email", code: "invalid_email" }, { status: 400 });
  const details = body.details && typeof body.details === "object" ? body.details : {};
  if (JSON.stringify(details).length > 4000) return NextResponse.json({ error: "details too large", code: "details_too_large" }, { status: 400 });
  const supabase = getSupabaseServer();
  // Slice A of PKG-E1-READINESS, WS13, functional truth. The matched half of the
  // viewings defect, and the worse of the two to meet: `{ ok: true }` on a 200
  // took the reader to the "Request received" card, which then lists what
  // happens next by role, so the product made three specific promises about a
  // request it had not written down. The same condition, the same code, the same
  // 503 the other ten sites use, and a log line that names the misconfiguration
  // without recording the name, company, email or phone number of the person who
  // met it.
  if (!supabase) {
    console.error("[signup] not stored: no database client is configured");
    return NextResponse.json(
      { ok: false, error: "Storage unavailable. Please try again.", code: "storage_unavailable" },
      { status: 503 },
    );
  }
  const { error } = await supabase.from("signup_requests").insert({
    role,
    full_name: name.slice(0, 120),
    company: body.company ? String(body.company).slice(0, 160) : null,
    email: email.slice(0, 200),
    phone: body.phone ? String(body.phone).slice(0, 40) : null,
    details,
    locale: body.locale === "ar" ? "ar" : "en",
  });
  // Finding 203. PostgREST's own message went straight to the browser here, on
  // a page open to the public and before any account exists.
  if (error) {
    // The whole PostgREST error object used to go to the log. Its `details`
    // field quotes the failing row back, so a unique-constraint violation on
    // the email column wrote the applicant's email address into the log of a
    // route whose entire payload is personal data. The message and the code are
    // what a reader of the log is actually diagnosing from, and neither carries
    // a value from the request. This is the same rule the viewings route below
    // already followed.
    console.error("[signup] insert failed:", error.code, error.message);
    return NextResponse.json({ error: "Could not store the request.", code: "signup_store_failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
