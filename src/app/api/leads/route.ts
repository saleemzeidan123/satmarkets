import { NextRequest, NextResponse } from "next/server";
import { allow } from "@/lib/ratelimit";
import { getSupabaseServer } from "@/lib/supabase/server";

// SM-P0-004. Two paths only: direct_contact or representation. Representation is
// an explicit mandate for SAT Real Estate, so it requires contact identity AND a
// recorded consent (PDPL). And we never report success for something we did not
// store: if storage is unavailable this fails loudly (503), it does not return ok.
export async function POST(req: NextRequest) {
  if (!allow("leads", req, 8)) return NextResponse.json({ error: "Rate limited" }, { status: 429 });

  const body = (await req.json().catch(() => ({}))) as {
    listing_id?: string;
    path?: "direct_contact" | "representation";
    contact_name?: string;
    contact_email?: string;
    contact_phone?: string;
    message?: string;
    consent?: boolean;
  };

  if (body.path !== "direct_contact" && body.path !== "representation") {
    return NextResponse.json({ error: "path must be direct_contact or representation" }, { status: 400 });
  }

  // Contact identity is required on BOTH paths. A lead nobody can reply to is not a lead.
  const name = String(body.contact_name ?? "").trim();
  const email = String(body.contact_email ?? "").trim();
  if (name.length < 2 || name.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 200) {
    return NextResponse.json({ error: "A name and a valid work email are required." }, { status: 400 });
  }

  // Representation is a mandate: it needs explicit, recorded consent.
  const isRep = body.path === "representation";
  if (isRep && body.consent !== true) {
    return NextResponse.json({ error: "Representation requires explicit consent." }, { status: 400 });
  }

  const supabase = getSupabaseServer();
  if (!supabase) {
    return NextResponse.json({ error: "Storage unavailable. Please try again." }, { status: 503 });
  }

  const { data, error } = await supabase
    .from("leads")
    .insert({
      listing_id: body.listing_id ?? null,
      path: body.path,
      contact_name: name.slice(0, 120),
      contact_email: email.slice(0, 200),
      contact_phone: body.contact_phone ? String(body.contact_phone).slice(0, 40) : null,
      message: body.message ? String(body.message).slice(0, 2000) : null,
      consent: isRep,
      consent_at: isRep ? new Date().toISOString() : null,
    })
    .select("id")
    .single();

  if (error) {
    console.error("leads insert failed:", error.message);
    return NextResponse.json({ error: "Could not save the enquiry. Please try again." }, { status: 500 });
  }
  return NextResponse.json({ ok: true, id: data?.id ?? null });
}
