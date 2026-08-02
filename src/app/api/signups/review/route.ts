import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSessionUser } from "@/lib/auth/session";
import { allow } from "@/lib/ratelimit";

export const runtime = "nodejs";

// The lifecycle is: new -> contacted -> approved -> provisioned -> verified/rejected.
//
// "approved" MUST be here. It was not, and that single omission bricked onboarding a
// second time: the provision endpoint refuses to act on anyone who is not approved,
// and this route is the only way SAT can approve. So SAT could not approve, therefore
// could not provision, therefore could not let a single person in. PR-AT taught the
// database and the provision route about "approved" and forgot to tell the one route
// that has to set it.
//
// "provisioned" is deliberately NOT settable here. It is not a decision anyone makes;
// it is a fact recorded by the provisioning endpoint once an account actually exists.
// A status you can assert by hand is a status that can lie.
const STATUSES = ["contacted", "approved", "verified", "rejected"] as const;

// Privileged status updates for signup requests. Gated on the SESSION (app_is_sat,
// RLS-safe), never a shared token in a URL or client bundle. Service role writes
// after the gate. Non-reviewers get 404 so the console does not announce itself.
export async function POST(req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return NextResponse.json({ ok: false, error: "Review not configured", code: "not_configured" }, { status: 503 });
  }
  if (!allow("signups-review", req, 10)) return NextResponse.json({ ok: false, error: "rate_limited", code: "rate_limited" }, { status: 429 });
  const su = await getSessionUser();
  if (!su?.isSat) return NextResponse.json({ ok: false, error: "not_found", code: "record_not_found" }, { status: 404 });
  let body: { id?: string; status?: string; notes?: string } = {};
  try { body = await req.json(); } catch {}
  if (!body.id || !(STATUSES as readonly string[]).includes(String(body.status))) {
    return NextResponse.json({ ok: false, error: "id and a valid status are required", code: "id_and_status_required" }, { status: 400 });
  }
  const sb = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { error } = await sb.from("signup_requests").update({
    status: body.status,
    notes: body.notes ? String(body.notes).slice(0, 500) : null,
  }).eq("id", body.id);
  if (error) { console.error("[signups-review]", error); return NextResponse.json({ ok: false, error: "update_failed", code: "review_update_failed" }, { status: 400 }); }
  return NextResponse.json({ ok: true });
}
