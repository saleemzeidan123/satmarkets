import { NextRequest, NextResponse } from "next/server";
import { allow } from "@/lib/ratelimit";
import { getSupabaseServer } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth/session";

export const runtime = "nodejs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const REASONS = new Set(["inaccurate", "unavailable", "duplicate", "suspicious", "other"]);

// File a report against a listing. Open to anyone (signed in or not); a signed-in
// reporter is stamped so SAT can follow up. The report is a record SAT reviews,
// not an email pipeline. Rate limited to blunt abuse.
export async function POST(req: NextRequest) {
  if (!allow("report", req, 8)) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  const sb = await getSupabaseServer();
  if (!sb) return NextResponse.json({ error: "Unavailable." }, { status: 503 });

  const body = (await req.json().catch(() => ({}))) as { listing_id?: unknown; reason?: unknown; detail?: unknown };
  const listing_id = typeof body.listing_id === "string" && UUID.test(body.listing_id) ? body.listing_id : null;
  const reason = typeof body.reason === "string" && REASONS.has(body.reason) ? body.reason : null;
  const detail = typeof body.detail === "string" ? body.detail.trim().slice(0, 1000) : null;
  if (!listing_id) return NextResponse.json({ error: "No listing given." }, { status: 400 });
  if (!reason) return NextResponse.json({ error: "Choose a reason." }, { status: 400 });

  // Only accept reports for a listing that actually exists and is public.
  // simulated-visible. Anything a reader can see in the preview they must be able to
  // report, and this is an existence check on one id rather than a count of anything.
  const { data: exists } = await sb.from("listings").select("id").eq("id", listing_id).eq("status", "published").maybeSingle();
  if (!exists) return NextResponse.json({ error: "Listing not found." }, { status: 404 });

  const su = await getSessionUser();
  const { error } = await sb.from("listing_reports").insert({
    listing_id,
    reporter_user_id: su?.userId ?? null,
    reason,
    detail: detail || null,
  });
  if (error) return NextResponse.json({ error: "Could not file the report." }, { status: 400 });
  return NextResponse.json({ ok: true });
}
