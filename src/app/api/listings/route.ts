import { NextRequest, NextResponse } from "next/server";
import { allow } from "@/lib/ratelimit";
import { getSupabaseServer } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth/session";
import { coerceAndValidateAttributes } from "@/lib/intakeValidation";

const CONTACT_CHANNELS = ["whatsapp", "call", "email", "message"];

export async function GET(req: NextRequest) {
  if (!allow("listings-get", req, 60)) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  const supabase = getSupabaseServer();
  if (!supabase) return NextResponse.json({ listings: [], note: "supabase not configured" });
  const { searchParams } = new URL(req.url);
  let query = supabase.from("listings").select("*").eq("status", "published").limit(50);
  const asset = searchParams.get("asset");
  const district = searchParams.get("district");
  if (asset) query = query.eq("asset_type", asset);
  if (district) query = query.eq("district_id", district);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ listings: data ?? [] });
}

// Create a listing (draft). This is the server-authoritative write path, replacing
// the old direct browser insert. It authenticates via the session, derives the
// account from the session (never the request body), validates the base fields
// AND the per-asset registry attributes server-side, and writes registry
// column-backed values to their columns while the rest go to `attributes`.
export async function POST(req: NextRequest) {
  if (!allow("listings-create", req, 10)) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  const su = await getSessionUser();
  if (!su) return NextResponse.json({ error: "Sign in to list a space." }, { status: 401 });
  if (!su.accountId) return NextResponse.json({ error: "Finish creating your account before listing." }, { status: 403 });

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  const title_en = String(body.title_en ?? "").trim();
  if (!title_en) return NextResponse.json({ error: "A title is required." }, { status: 400 });

  const asset_type = String(body.asset_type ?? "").trim();
  if (!asset_type) return NextResponse.json({ error: "Choose an asset type." }, { status: 400 });
  const deal_type = body.deal_type === "sale" ? "sale" : "lease";

  const area_sqm = Number(body.area_sqm);
  if (!Number.isFinite(area_sqm) || area_sqm <= 0) return NextResponse.json({ error: "Enter a valid area." }, { status: 400 });

  const price = Number(body.price);
  if (!Number.isFinite(price) || price <= 0) {
    return NextResponse.json({ error: deal_type === "lease" ? "Enter the asking rent." : "Enter the sale price." }, { status: 400 });
  }

  // Advertising licence: enforced here AND by the database. A listing cannot
  // publish without a valid one, so it is collected at intake, not later.
  const ad_permit_no = String(body.ad_permit_no ?? "").replace(/\D/g, "");
  if (!/^\d{10}$/.test(ad_permit_no)) return NextResponse.json({ error: "Enter the 10 digit real estate advertising licence number." }, { status: 400 });
  const ad_permit_expires_at = String(body.ad_permit_expires_at ?? "");
  const expiresMs = Date.parse(ad_permit_expires_at);
  if (!ad_permit_expires_at || Number.isNaN(expiresMs)) return NextResponse.json({ error: "Enter the date the advertising licence expires." }, { status: 400 });
  if (expiresMs <= Date.now()) return NextResponse.json({ error: "That licence has already expired." }, { status: 400 });

  if (body.right_to_market_confirmed !== true) return NextResponse.json({ error: "Confirm you have the right to market this property." }, { status: 400 });

  // Exact building coordinates from the map pin. Required, and validated to Saudi
  // bounds. A listing with no location is not useful, so it is mandatory here too.
  if (body.lat == null || body.lat === "" || body.lng == null || body.lng === "") {
    return NextResponse.json({ error: "The property location is required." }, { status: 400 });
  }
  const lat = Number(body.lat);
  const lng = Number(body.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < 16 || lat > 33 || lng < 34 || lng > 56) {
    return NextResponse.json({ error: "The pinned location is outside Saudi Arabia." }, { status: 400 });
  }

  const lister_type = body.lister_type === "broker_authorized" ? "broker_authorized" : "owner_direct";
  const authorization_doc_url = lister_type === "broker_authorized" ? String(body.authorization_doc_url ?? "").trim() : null;
  if (lister_type === "broker_authorized" && !authorization_doc_url) {
    return NextResponse.json({ error: "Brokers must provide an authorization-to-market document URL." }, { status: 400 });
  }

  // Per-asset registry attributes, validated and split into typed columns vs jsonb.
  const { attributes, columns, errors } = coerceAndValidateAttributes(asset_type, (body.attributes as Record<string, unknown>) ?? {});
  if (errors.length) return NextResponse.json({ error: "Some property details are invalid.", fields: errors }, { status: 400 });

  const contact_channels = Array.isArray(body.contact_channels)
    ? (body.contact_channels as unknown[]).map(String).filter((c) => CONTACT_CHANNELS.includes(c))
    : [];

  const supabase = getSupabaseServer();
  if (!supabase) return NextResponse.json({ error: "Storage unavailable. Please try again." }, { status: 503 });

  const { data, error } = await supabase
    .from("listings")
    .insert({
      // Registry column-backed values first (grade, fit-out, clear height, ...).
      ...columns,
      // Authoritative base fields override anything above. account_id comes from
      // the session, never the body, so a caller cannot list under another account.
      account_id: su.accountId,
      title_en,
      asset_type,
      deal_type,
      district_id: (body.district_id as string) || null,
      lat,
      lng,
      area_sqm,
      asking_rent_sqm: deal_type === "lease" ? price : null,
      sale_price: deal_type === "sale" ? price : null,
      description_en: (body.description_en as string) || null,
      contact_phone: (body.contact_phone as string) || null,
      contact_email: (body.contact_email as string) || null,
      contact_channels,
      lister_type,
      video_url: (body.video_url as string) || null,
      floorplan_url: (body.floorplan_url as string) || null,
      authorization_doc_url,
      ad_permit_no,
      ad_permit_expires_at,
      right_to_market_confirmed: true,
      status: "draft",
      attributes,
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  const id = data?.id as string | undefined;

  // Attach photo URLs as listing_media rows (best effort; the listing is already
  // created). source='url' stores the external link in `path`. Uploaded files
  // (source='upload') are added by the media upload route in a later slice.
  if (id && Array.isArray(body.photos)) {
    const rows = (body.photos as unknown[])
      .map((u) => String(u).trim())
      .filter((u) => /^https?:\/\/.+/i.test(u))
      .slice(0, 20)
      .map((u, i) => ({ listing_id: id, path: u, kind: "photo", source: "url", sort_order: i }));
    if (rows.length) {
      const { error: mErr } = await supabase.from("listing_media").insert(rows);
      if (mErr) return NextResponse.json({ id, warning: "Listing saved, but photos could not be attached." });
    }
  }

  return NextResponse.json({ id });
}
