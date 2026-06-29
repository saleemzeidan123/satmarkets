import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const token = process.env.ADMIN_REVIEW_TOKEN;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!token || !url || !serviceKey) {
    return NextResponse.json({ ok: false, error: "Review not configured" }, { status: 503 });
  }
  let body: { action?: string; reason?: string; key?: string } = {};
  try { body = await req.json(); } catch {}
  if (body?.key !== token) {
    return NextResponse.json({ ok: false, error: "Not authorized" }, { status: 401 });
  }
  const sb = createClient(url, serviceKey, { auth: { persistSession: false } });
  if (body.action === "approve") {
    const { error } = await sb.from("listings").update({
      ownership_verified: true,
      authorization_verified: true,
      verification_method: "manual_review",
      verified_at: new Date().toISOString(),
    }).eq("id", params.id);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  }
  if (body.action === "reject") {
    const { error } = await sb.from("listings").update({
      status: "rejected",
      rejection_reason: (body.reason || "Rejected in verification review").slice(0, 500),
    }).eq("id", params.id);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ ok: false, error: "Unknown action" }, { status: 400 });
}
