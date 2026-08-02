import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSessionUser } from "@/lib/auth/session";
import { allow } from "@/lib/ratelimit";

export const runtime = "nodejs";

// Reviewer decisions are gated on the SESSION (app_is_sat, RLS-safe), never on a
// shared token in a URL or client bundle. Non-reviewers get 404: the console does
// not announce itself. The service role performs the write after the gate passes.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return NextResponse.json({ ok: false, error: "Review not configured", code: "not_configured" }, { status: 503 });
  }
  if (!allow("listings-review", req, 10)) return NextResponse.json({ ok: false, error: "rate_limited", code: "rate_limited" }, { status: 429 });
  const su = await getSessionUser();
  if (!su?.isSat) return NextResponse.json({ ok: false, error: "not_found", code: "listing_not_found" }, { status: 404 });
  let body: { action?: string; reason?: string } = {};
  try { body = await req.json(); } catch {}
  const sb = createClient(url, serviceKey, { auth: { persistSession: false } });
  if (body.action === "approve") {
    const { error } = await sb.from("listings").update({
      ownership_verified: true,
      authorization_verified: true,
      verification_method: "manual_review",
      verified_at: new Date().toISOString(),
      verified_by: su.accountId, // FK references accounts, so record the reviewing SAT account
    }).eq("id", params.id);
    if (error) { console.error("[listings-review]", error); return NextResponse.json({ ok: false, error: "update_failed", code: "review_update_failed" }, { status: 400 }); }
    return NextResponse.json({ ok: true });
  }
  if (body.action === "reject") {
    const { error } = await sb.from("listings").update({
      status: "rejected",
      rejection_reason: (body.reason || "Rejected in verification review").slice(0, 500),
    }).eq("id", params.id);
    if (error) { console.error("[listings-review]", error); return NextResponse.json({ ok: false, error: "update_failed", code: "review_update_failed" }, { status: 400 }); }
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ ok: false, error: "Unknown action", code: "unknown_action" }, { status: 400 });
}
