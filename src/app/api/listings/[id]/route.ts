import { NextRequest, NextResponse } from "next/server";
import { allow } from "@/lib/ratelimit";
import { getSupabaseServer } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth/session";
import { coerceAndValidateAttributes, editedAttributesJson } from "@/lib/intakeValidation";
import { intakeFields } from "@/lib/assetFields";

export const runtime = "nodejs";

const CONTACT_CHANNELS = ["whatsapp", "call", "email", "message"];
// Price columns are owned by the explicit `price` path below (deal-type aware), so
// the registry attribute pass must never write them even if a client tries.
const BASE_OWNED_COLUMNS = new Set(["asking_rent_sqm", "sale_price"]);

// Owner edits to an existing listing. The fields an owner legitimately controls:
// headline, description, price, size, contact routing, AND the per-asset registry
// attributes (grade, fit-out, clear height, compliance flags, and so on) validated
// through the exact same registry pipeline as creation. It NEVER touches verification
// flags, the advertising licence, account, asset type, or deal type. Those are either
// system-owned (verification) or identity-defining (licence, asset/deal type) and
// changing them must go through SAT, not a self-serve PATCH. The database also guards
// the verification columns independently.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!allow("listing-edit", req, 30)) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  const su = await getSessionUser();
  if (!su || !su.accountId) return NextResponse.json({ error: "Sign in to edit." }, { status: 401 });

  const sb = getSupabaseServer();
  if (!sb) return NextResponse.json({ error: "Storage unavailable." }, { status: 503 });

  const { data: listing } = await sb.from("listings").select("id, account_id, deal_type, asset_type, attributes").eq("id", params.id).single();
  if (!listing) return NextResponse.json({ error: "Listing not found." }, { status: 404 });
  if ((listing as { account_id: string }).account_id !== su.accountId) {
    return NextResponse.json({ error: "This is not your listing." }, { status: 403 });
  }
  const dealType = (listing as { deal_type: string }).deal_type;
  const assetType = (listing as { asset_type: string }).asset_type;
  const existingAttrs = ((listing as { attributes?: Record<string, unknown> }).attributes) ?? {};

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
  // The video tour URL is stored as given; the detail page renders it through
  // videoEmbed, which only ever embeds known origins (YouTube/Vimeo/direct file) and
  // falls back to a plain outbound link for anything else, so an arbitrary URL here
  // can never become an embedded iframe of an untrusted origin.
  if (typeof body.video_url === "string") patch.video_url = body.video_url.trim().slice(0, 500) || null;
  if (typeof body.contact_phone === "string") patch.contact_phone = body.contact_phone.trim() || null;
  if (typeof body.contact_email === "string") patch.contact_email = body.contact_email.trim() || null;
  if (Array.isArray(body.contact_channels)) {
    patch.contact_channels = (body.contact_channels as unknown[]).map(String).filter((c) => CONTACT_CHANNELS.includes(c));
  }

  // Per-asset registry attributes, validated and split into typed columns vs the
  // jsonb blob by the SAME pipeline that governs creation. Only present when the
  // client sends an `attributes` object. Provenance is never accepted from the
  // client; the tier lives in the registry, so this can never mark anything verified.
  if (body.attributes && typeof body.attributes === "object" && !Array.isArray(body.attributes)) {
    const { attributes, columns, errors } = coerceAndValidateAttributes(assetType, body.attributes as Record<string, unknown>);
    if (errors.length) {
      const field = intakeFields(assetType).find((f) => f.key === errors[0].key);
      const label = field ? field.label_en : errors[0].key;
      return NextResponse.json({ error: `${label}: ${errors[0].message}`, field: errors[0].key }, { status: 400 });
    }
    for (const [col, val] of Object.entries(columns)) {
      if (!BASE_OWNED_COLUMNS.has(col)) patch[col] = val;
    }
    patch.attributes = editedAttributesJson(assetType, existingAttrs, attributes);
  }

  if (Object.keys(patch).length === 0) return NextResponse.json({ ok: true, note: "nothing to change" });

  // Session client: RLS ("owner manage own listings") allows this update. The
  // verification-column guard never fires because this patch never names one.
  const { error } = await sb.from("listings").update(patch).eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
