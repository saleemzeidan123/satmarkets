import { NextRequest, NextResponse } from "next/server";
import { allow } from "@/lib/ratelimit";
import { getSupabaseServer } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth/session";
import { coerceAndValidateAttributes, editedAttributesJson } from "@/lib/intakeValidation";
import { intakeFields } from "@/lib/assetFields";
import { mayEdit, mayFillAbsent, stageOf } from "@/lib/listingEdit";
import { hashSource } from "@/lib/translate/translateToArabic";
import { assessLocationConsistency } from "@/lib/locationConsistency";

export const runtime = "nodejs";

const CONTACT_CHANNELS = ["whatsapp", "call", "email", "message"];
// Price columns are owned by the explicit `price` path below (deal-type aware), so
// the registry attribute pass must never write them even if a client tries.
const BASE_OWNED_COLUMNS = new Set(["asking_rent_sqm", "sale_price"]);

// Owner edits to an existing listing. What an owner may change is not one fixed
// list any more; it is a function of the field AND the stage, stated in
// src/lib/listingEdit.ts and applied here through mayEdit(). Headline,
// description, price, size, contact routing, availability and the per-asset
// registry attributes are theirs at any stage. The advertising licence, the map
// pin, the district, the deal type and the lister capacity are theirs only while
// the listing is still a draft, because a draft is intake and nobody has read it;
// once it is public those are what the advertisement rests on and a change goes
// through SAT. Verification flags, account, status and asset type are never the
// lister's. The database guards the verification columns independently. The one
// widening is the first pin on a listing that has never had one, which adds a
// fact rather than substituting one; see mayFillAbsent in listingEdit.ts.
//
// This route is also how the Listing Studio saves after the first time, so it
// accepts the same Arabic the create path does, and stamps the source hash for
// the same reason: /api/listings/[id]/translate rewrites title_ar whenever the
// hash of title_en does not match, and Arabic a lister wrote themselves must not
// be replaced by a machine rendering of the English.
export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  if (!allow("listing-edit", req, 30)) return NextResponse.json({ error: "rate_limited", code: "rate_limited" }, { status: 429 });

  const su = await getSessionUser();
  if (!su || !su.accountId) return NextResponse.json({ error: "Sign in to edit.", code: "sign_in_to_edit" }, { status: 401 });

  const sb = getSupabaseServer();
  if (!sb) return NextResponse.json({ error: "Storage unavailable.", code: "storage_unavailable" }, { status: 503 });

  const { data: listing } = await sb
    .from("listings")
    .select("id, account_id, deal_type, asset_type, attributes, status, title_en, description_en, lat, lng, district_id")
    .eq("id", params.id)
    .single();
  if (!listing) return NextResponse.json({ error: "Listing not found.", code: "not_found" }, { status: 404 });
  if ((listing as { account_id: string }).account_id !== su.accountId) {
    return NextResponse.json({ error: "This is not your listing.", code: "not_yours" }, { status: 403 });
  }
  const assetType = (listing as { asset_type: string }).asset_type;
  const existingAttrs = ((listing as { attributes?: Record<string, unknown> }).attributes) ?? {};
  const stage = stageOf((listing as { status?: string }).status);

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const patch: Record<string, unknown> = {};
  const can = (field: string) => mayEdit(field, stage);

  // The deal type decides which column the price lands in, so it is resolved
  // before the price and the other column is cleared when it moves. A draft that
  // switched from lease to sale while leaving a rent behind would be a listing
  // with two prices.
  let dealType = (listing as { deal_type: string }).deal_type;
  let dealMoved = false;
  if (can("deal_type") && (body.deal_type === "lease" || body.deal_type === "sale") && body.deal_type !== dealType) {
    dealType = body.deal_type;
    patch.deal_type = dealType;
    dealMoved = true;
  }

  if (can("title_en") && typeof body.title_en === "string") {
    const t = body.title_en.trim();
    if (!t) return NextResponse.json({ error: "A title is required.", code: "title_required" }, { status: 400 });
    patch.title_en = t.slice(0, 160);
  }
  if (can("description_en") && typeof body.description_en === "string") {
    patch.description_en = body.description_en.trim().slice(0, 4000) || null;
  }
  // Arabic the lister wrote, with the hash of the English it corresponds to, so
  // no later translate run reads it as stale and overwrites it. The hash is taken
  // from the English being saved in this same patch when there is one, and from
  // the English already on the row otherwise.
  if (can("title_ar") && typeof body.title_ar === "string") {
    const ta = body.title_ar.trim().slice(0, 160);
    patch.title_ar = ta || null;
    const en = typeof patch.title_en === "string" ? patch.title_en : ((listing as { title_en?: string }).title_en ?? "");
    patch.title_ar_src_hash = ta && en ? hashSource(en) : null;
  }
  if (can("description_ar") && typeof body.description_ar === "string") {
    const da = body.description_ar.trim().slice(0, 4000);
    patch.description_ar = da || null;
    const en = typeof patch.description_en === "string"
      ? patch.description_en
      : ((listing as { description_en?: string | null }).description_en ?? "");
    patch.description_ar_src_hash = da && en ? hashSource(en) : null;
  }
  if (can("area_sqm") && body.area_sqm != null && body.area_sqm !== "") {
    const a = Number(body.area_sqm);
    if (!Number.isFinite(a) || a <= 0) return NextResponse.json({ error: "Enter a valid area.", code: "area_invalid" }, { status: 400 });
    patch.area_sqm = a;
  }
  if (can("price") && body.price != null && body.price !== "") {
    const p = Number(body.price);
    if (!Number.isFinite(p) || p <= 0) {
      return NextResponse.json({ error: dealType === "lease" ? "Enter a valid asking rent." : "Enter a valid sale price.", code: dealType === "lease" ? "rent_invalid" : "price_invalid" }, { status: 400 });
    }
    patch.asking_rent_sqm = dealType === "lease" ? p : null;
    patch.sale_price = dealType === "sale" ? p : null;
  } else if (dealMoved) {
    // The deal type moved with no new figure, so the old column is emptied rather
    // than left advertising a rent under a sale.
    patch.asking_rent_sqm = null;
    patch.sale_price = null;
  }
  // The date the lister affirmed the space is available. A confirmation dated in
  // the future is not a confirmation, and an empty string clears it.
  if (can("availability_confirmed_at") && typeof body.availability_confirmed_at === "string") {
    const raw = body.availability_confirmed_at.trim();
    if (!raw) {
      patch.availability_confirmed_at = null;
    } else {
      const ms = Date.parse(raw);
      if (Number.isNaN(ms)) return NextResponse.json({ error: "That availability date could not be read.", code: "availability_unreadable" }, { status: 400 });
      if (ms > Date.now() + 60_000) return NextResponse.json({ error: "Availability is confirmed as of today, not a future date.", code: "availability_future" }, { status: 400 });
      patch.availability_confirmed_at = new Date(ms).toISOString();
    }
  }

  // Draft-only corrections. Each is refused outright on a public listing rather
  // than silently dropped, so a client that tries is told why.
  //
  // The pin is the one exception, and only in one direction. A published listing
  // that has never been pinned may receive its first pin, because nothing was
  // relied on and the space is on no map until it has one. A pin that already
  // exists is still SAT's to move. mayFillAbsent states that rule; the test below
  // is against the value on the row, never against what the client asserts.
  const pinned =
    (listing as { lat?: number | null }).lat != null && (listing as { lng?: number | null }).lng != null;
  if (body.lat != null && body.lat !== "" && body.lng != null && body.lng !== "") {
    if (!mayFillAbsent("lat", stage, pinned) || !mayFillAbsent("lng", stage, pinned)) {
      return NextResponse.json({ error: "The location of a published listing is changed by SAT.", code: "location_locked" }, { status: 403 });
    }
    const lat = Number(body.lat);
    const lng = Number(body.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < 16 || lat > 33 || lng < 34 || lng > 56) {
      return NextResponse.json({ error: "The pinned location is outside Saudi Arabia.", code: "location_outside_sa" }, { status: 400 });
    }
    patch.lat = lat;
    patch.lng = lng;
  }
  // Finding 137. The first pin on a published listing is the one location write
  // that lands without SAT reading it first, so it is the one that must not
  // silently contradict the location already on file. SAT holds no boundaries, so
  // this is not a containment test: it is the only thing a set of centroids can
  // honestly say, which is that two points are too far apart to describe the same
  // building. Under the floor nothing is asserted either way, because a coarse
  // centroid inside one city proves nothing. The refusal carries both languages
  // and names no column, no table and no distance model.
  if (typeof patch.lat === "number" && typeof patch.lng === "number") {
    const recordedId = (listing as { district_id?: string | null }).district_id ?? null;
    if (recordedId) {
      const { data: recorded } = await sb
        .from("districts_geo")
        .select("id,name_en,name_ar,lat,lng,kind")
        .eq("id", recordedId)
        .maybeSingle();
      const row = recorded as Record<string, unknown> | null;
      const verdict = assessLocationConsistency({
        lat: patch.lat,
        lng: patch.lng,
        recorded: row
          ? {
              id: String(row.id), name_en: String(row.name_en ?? ""),
              name_ar: (row.name_ar as string | null) ?? null,
              kind: (row.kind as string | null) ?? null,
              lat: Number(row.lat), lng: Number(row.lng),
            }
          : null,
      });
      if (verdict.verdict === "contradicted") {
        return NextResponse.json(
          { error: verdict.statement_en, error_ar: verdict.statement_ar, code: "location_contradiction" },
          { status: 409 },
        );
      }
    }
  }
  if (typeof body.district_id === "string" && can("district_id")) {
    patch.district_id = body.district_id || null;
  }
  if (typeof body.ad_permit_no === "string" && body.ad_permit_no.trim() !== "") {
    if (!can("ad_permit_no")) {
      return NextResponse.json({ error: "The advertising licence on a published listing is changed by SAT.", code: "permit_locked" }, { status: 403 });
    }
    const permit = body.ad_permit_no.replace(/\D/g, "");
    if (!/^\d{10}$/.test(permit)) return NextResponse.json({ error: "Enter the 10 digit real estate advertising licence number.", code: "permit_number_invalid" }, { status: 400 });
    patch.ad_permit_no = permit;
  }
  if (typeof body.ad_permit_expires_at === "string" && body.ad_permit_expires_at.trim() !== "") {
    if (!can("ad_permit_expires_at")) {
      return NextResponse.json({ error: "The advertising licence on a published listing is changed by SAT.", code: "permit_locked" }, { status: 403 });
    }
    const ms = Date.parse(body.ad_permit_expires_at);
    if (Number.isNaN(ms)) return NextResponse.json({ error: "Enter the date the advertising licence expires.", code: "permit_expiry_required" }, { status: 400 });
    if (ms <= Date.now()) return NextResponse.json({ error: "That licence has already expired.", code: "permit_expired" }, { status: 400 });
    patch.ad_permit_expires_at = body.ad_permit_expires_at;
  }
  if (typeof body.lister_type === "string" && can("lister_type")) {
    patch.lister_type = body.lister_type === "broker_authorized" ? "broker_authorized" : "owner_direct";
  }
  if (typeof body.floorplan_url === "string" && can("floorplan_url")) {
    patch.floorplan_url = body.floorplan_url.trim().slice(0, 500) || null;
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
      return NextResponse.json({ error: `${label}: ${errors[0].message}`, code: "field_invalid", field: errors[0].key }, { status: 400 });
    }
    for (const [col, val] of Object.entries(columns)) {
      if (!BASE_OWNED_COLUMNS.has(col)) patch[col] = val;
    }
    patch.attributes = editedAttributesJson(assetType, existingAttrs, attributes);
  }

  if (Object.keys(patch).length > 0) {
    // Session client: RLS ("owner manage own listings") allows this update. The
    // verification-column guard never fires because this patch never names one.
    const { error } = await sb.from("listings").update(patch).eq("id", params.id);
    if (error) return NextResponse.json({ error: error.message, code: "save_failed" }, { status: 400 });
  }

  // Photo links added after the first save. The create path attaches them as
  // listing_media rows and the Studio can now save more than once, so the second
  // save has to reach the same place or a link typed on a return visit would be
  // silently discarded. Uploaded files go through the media route, which is why
  // only URLs are handled here.
  //
  // Sent links are the ones typed since the last save; the Studio clears the box
  // after each one. A link that is already attached is skipped anyway, so a
  // client that resends the whole box cannot create duplicate rows.
  const urls = Array.isArray(body.photos)
    ? (body.photos as unknown[]).map((u) => String(u).trim()).filter((u) => /^https?:\/\/.+/i.test(u)).slice(0, 20)
    : [];
  if (urls.length) {
    const { data: existingMedia, count } = await sb
      .from("listing_media")
      .select("path", { count: "exact" })
      .eq("listing_id", params.id)
      .eq("kind", "photo");
    const held = new Set(((existingMedia ?? []) as { path: string }[]).map((m) => m.path));
    const base = count ?? held.size;
    const rows = urls
      .filter((u) => !held.has(u))
      .map((u, i) => ({ listing_id: params.id, path: u, kind: "photo", source: "url", sort_order: base + i }));
    if (rows.length) {
      const { error: mErr } = await sb.from("listing_media").insert(rows);
      if (mErr) return NextResponse.json({ ok: true, warning: "Saved, but the photo links could not be attached." });
    }
  }

  // The same reconciliation the create path performs: a floor-plan link becomes a
  // listing_media row, because the detail page renders plans from media and not
  // from listings.floorplan_url. Only when the link is new to this listing.
  if (typeof patch.floorplan_url === "string" && /^https?:\/\/.+/i.test(patch.floorplan_url)) {
    const { data: plans } = await sb
      .from("listing_media")
      .select("path")
      .eq("listing_id", params.id)
      .eq("kind", "floorplan");
    const known = new Set(((plans ?? []) as { path: string }[]).map((m) => m.path));
    if (!known.has(patch.floorplan_url)) {
      await sb.from("listing_media").insert({
        listing_id: params.id,
        path: patch.floorplan_url,
        kind: "floorplan",
        source: "url",
        sort_order: known.size,
      });
    }
  }

  return NextResponse.json({ ok: true });
}
