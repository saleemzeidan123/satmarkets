import { NextRequest, NextResponse } from "next/server";
import { allow } from "@/lib/ratelimit";
import { getSupabaseServer } from "@/lib/supabase/server";

// POST: a broker or landlord registers interest in a requirement
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!allow("interest", req, 8)) return NextResponse.json({ ok: false, error: "Rate limited" }, { status: 429 });
  const b = await req.json();
  const party_type = b.party_type === "broker" ? "broker" : "landlord";
  const sb = getSupabaseServer();
  if (!sb) return NextResponse.json({ ok: true, stored: false });
  const { error } = await sb.from("requirement_interests").insert({
    brief_id: params.id, party_type,
    party_name: b.party_name || (party_type === "broker" ? "A SAT broker" : "A verified landlord"),
    org: b.org || null, message: b.message || null, listing_id: b.listing_id || null,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, stored: true });
}
