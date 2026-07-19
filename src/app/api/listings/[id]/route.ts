import { NextRequest, NextResponse } from "next/server";
import { allow } from "@/lib/ratelimit";
import { getSupabaseServer } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth/session";

export const runtime = "nodejs";

const CONTACT_CHANNELS = ["whatsapp", "call", "email", "message"];

// Owner edits to an existing listing. Deliberately narrow: only the fields an owner
// legitimately controls (headline, description, price, size, contact routing). It
// NEVER touches verification flags, the advertising licence, account, asset type, or
// deal type. Those are either system-owned (verification) or identity-defining
// (licence, asset/deal type) and changing them must go through SAT, not a self-serve
// PATCH. The database also guards the verification columns independently.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!allow("listing-edit", req, 30)) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  const su = await getSessionUser();
  if (!su || !su.accountId) return NextResponse.json({ error: "Sign in to edit." }, { status: 401 });

  const sb = getSupabaseServer();
  if (!sb) return NextResponse.json({ error: "Storage unavailable." }, { status: 503 });

  const { data: listing } = await sb.from("listings").select("id, account_id, deal_type").eq("id", params.id).single();
  if (!listing) return NextResponse.json({ error: "Listing not found." }, { status: 404 });
  if ((listing as { account_id: string }).account_id !== su.accountId) {
    return NextResponse.json({ error: "This is not your listing." }, { status: 403 });
  }
  const dealType = (listing as { deal_type: string }).deal_type;

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const patch: Record<string, unknown> = {};

  if (typeof body.title_en === "string") {
    const t = body.title_en.trim();
    if (!t) return NextResponse.json({ error: "A title is required." }, { status: 400 });
    patch.title_en = t.slice(0, 160);
  }
  if (typeof body.description_en === "string") {
    patch.description_en = body.description_en.trim().slice(0, 4000) || null;
  }
  if (body.area_sqm != null && body.area_sqm !== "") {
    const a = Number(body.area_sqm);
    if (!Number.isFinite(a) || a <= 0) return NextResponse.json({ error: "Enter a valid area." }, { status: 400 });
    patch.area_sqm = a;
  }
  if (body.price != null && body.price !== "") {
    const p = Number(body.price);
    if (!Number.isFinite(p) || p <= 0) {
      return NextResponse.json({ error: dealType === "lease" ? "Enter a valid asking rent." : "Enter a valid sale price." }, { status: 400 });
    }
    if (dealType === "lease") patch.asking_rent_sqm = p;
    else patch.sale_price = p;
  }
  if (typeof body.contact_phone === "string") patch.contact_phone = body.contact_phone.trim() || null;
  if (typeof body.contact_email === "string") patch.contact_email = body.contact_email.trim() || null;
  if (Array.isArray(body.contact_channels)) {
    patch.contact_channels = (body.contact_channels as unknown[]).map(String).filter((c) => CONTACT_CHANNELS.includes(c));
  }

  if (Object.keys(patch).length === 0) return NextResponse.json({ ok: true, note: "nothing to change" });

  // Session client: RLS ("owner manage own listings") allows this update. The
  // verification-column guard never fires because this patch never names one.
  const { error } = await sb.from("listings").update(patch).eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
