import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";

// The two explicit paths. A lead is direct_contact or representation, nothing
// in between. Representation leads are expected to spawn a SAT mandate.
export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    listing_id?: string;
    path?: "direct_contact" | "representation";
    contact_name?: string;
    contact_email?: string;
    contact_phone?: string;
    message?: string;
  };
  if (body.path !== "direct_contact" && body.path !== "representation") {
    return NextResponse.json({ error: "path must be direct_contact or representation" }, { status: 400 });
  }
  const supabase = getSupabaseServer();
  if (!supabase) return NextResponse.json({ ok: true, note: "supabase not configured (lead not stored)" });
  const { error } = await supabase.from("leads").insert({
    listing_id: body.listing_id ?? null,
    path: body.path,
    contact_name: body.contact_name ?? null,
    contact_email: body.contact_email ?? null,
    contact_phone: body.contact_phone ?? null,
    message: body.message ?? null
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
