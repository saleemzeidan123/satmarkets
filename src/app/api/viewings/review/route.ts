import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const STATUSES = ["confirmed", "cancelled", "completed", "no_show"] as const;

// Privileged viewing lifecycle updates. Confirmation is always a human action
// behind the admin gate; until real lister accounts exist this queue serves
// both routes (SAT-listed and owner-listed) with the routing flag visible.
export async function POST(req: NextRequest) {
  const token = process.env.ADMIN_REVIEW_TOKEN;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!token || !url || !serviceKey) {
    return NextResponse.json({ ok: false, error: "Review not configured" }, { status: 503 });
  }
  let body: { id?: string; status?: string; key?: string } = {};
  try { body = await req.json(); } catch {}
  if (body?.key !== token) return NextResponse.json({ ok: false, error: "Not authorized" }, { status: 401 });
  if (!body.id || !(STATUSES as readonly string[]).includes(String(body.status))) {
    return NextResponse.json({ ok: false, error: "id and a valid status are required" }, { status: 400 });
  }
  const sb = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { error } = await sb.from("viewings").update({ status: body.status }).eq("id", body.id);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
