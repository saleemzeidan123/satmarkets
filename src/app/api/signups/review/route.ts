import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { authed } from "@/lib/adminauth";
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

// Privileged status updates for signup requests. Same gate as listing review:
// ADMIN_REVIEW_TOKEN + service role, never exposed to the client bundle.
export async function POST(req: NextRequest) {
  const token = process.env.ADMIN_REVIEW_TOKEN;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!token || !url || !serviceKey) {
    return NextResponse.json({ ok: false, error: "Review not configured" }, { status: 503 });
  }
  if (!allow("signups-review", req, 10)) return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
  if (!authed(req, token)) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  let body: { id?: string; status?: string; notes?: string } = {};
  try { body = await req.json(); } catch {}
  if (!body.id || !(STATUSES as readonly string[]).includes(String(body.status))) {
    return NextResponse.json({ ok: false, error: "id and a valid status are required" }, { status: 400 });
  }
  const sb = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { error } = await sb.from("signup_requests").update({
    status: body.status,
    notes: body.notes ? String(body.notes).slice(0, 500) : null,
  }).eq("id", body.id);
  if (error) { console.error("[signups-review]", error); return NextResponse.json({ ok: false, error: "update_failed" }, { status: 400 }); }
  return NextResponse.json({ ok: true });
}
