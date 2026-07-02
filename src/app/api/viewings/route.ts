import { NextRequest, NextResponse } from "next/server";
import { allow } from "@/lib/ratelimit";
import { getSupabaseServer } from "@/lib/supabase/server";

// Public viewing requests. A request is only ever created as status
// "requested"; confirmation stays a SAT action, so nothing is promised
// that a person has not agreed to.
export async function POST(req: NextRequest) {
  if (!allow("viewings", req, 6)) return NextResponse.json({ ok: false, error: "Rate limited" }, { status: 429 });
  let body: { listing_id?: string; scheduled_at?: string; contact_name?: string; contact_email?: string; note?: string } = {};
  try { body = await req.json(); } catch {}
  const id = String(body.listing_id ?? "");
  if (!/^[0-9a-f-]{36}$/.test(id)) return NextResponse.json({ error: "invalid listing" }, { status: 400 });
  const name = String(body.contact_name ?? "").trim();
  const email = String(body.contact_email ?? "").trim();
  if (name.length < 2 || name.length > 120) return NextResponse.json({ error: "invalid name" }, { status: 400 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 200) return NextResponse.json({ error: "invalid email" }, { status: 400 });
  const when = new Date(String(body.scheduled_at ?? ""));
  const now = Date.now();
  if (isNaN(when.getTime()) || when.getTime() < now || when.getTime() > now + 21 * 24 * 3600 * 1000) {
    return NextResponse.json({ error: "invalid slot" }, { status: 400 });
  }
  const supabase = getSupabaseServer();
  if (!supabase) return NextResponse.json({ ok: true, note: "supabase not configured (request not stored)" });
  const { error } = await supabase.from("viewings").insert({
    listing_id: id,
    scheduled_at: when.toISOString(),
    status: "requested",
    contact_name: name.slice(0, 120),
    contact_email: email.slice(0, 200),
    note: body.note ? String(body.note).slice(0, 400) : null,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
