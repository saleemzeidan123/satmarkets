import { NextRequest, NextResponse } from "next/server";
import { allow } from "@/lib/ratelimit";
import { getSupabaseServer } from "@/lib/supabase/server";

const ROLES = ["occupier", "owner", "broker", "investor"] as const;

// Role-based account requests. Accounts are provisioned after SAT verifies the
// person (owners against title/permit, brokers against the FAL register), so
// this endpoint stores a structured request, it does not mint credentials.
export async function POST(req: NextRequest) {
  if (!allow("signup", req, 6)) return NextResponse.json({ ok: false, error: "Rate limited" }, { status: 429 });
  const body = (await req.json()) as {
    role?: string; full_name?: string; company?: string; email?: string;
    phone?: string; details?: Record<string, unknown>; locale?: string;
  };
  const role = String(body.role ?? "");
  if (!(ROLES as readonly string[]).includes(role)) return NextResponse.json({ error: "invalid role" }, { status: 400 });
  const name = String(body.full_name ?? "").trim();
  const email = String(body.email ?? "").trim();
  if (name.length < 2 || name.length > 120) return NextResponse.json({ error: "invalid name" }, { status: 400 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 200) return NextResponse.json({ error: "invalid email" }, { status: 400 });
  const details = body.details && typeof body.details === "object" ? body.details : {};
  if (JSON.stringify(details).length > 4000) return NextResponse.json({ error: "details too large" }, { status: 400 });
  const supabase = getSupabaseServer();
  if (!supabase) return NextResponse.json({ ok: true, note: "supabase not configured (request not stored)" });
  const { error } = await supabase.from("signup_requests").insert({
    role,
    full_name: name.slice(0, 120),
    company: body.company ? String(body.company).slice(0, 160) : null,
    email: email.slice(0, 200),
    phone: body.phone ? String(body.phone).slice(0, 40) : null,
    details,
    locale: body.locale === "ar" ? "ar" : "en",
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
