import { NextRequest, NextResponse } from "next/server";
import { allow } from "@/lib/ratelimit";
import { getSupabaseServer } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth/session";
import { isValidShotKey, isValidMediaScope, isValidMediaCondition } from "@/lib/mediaCategorization";

export const runtime = "nodejs";

// Remove one photo (or other media row) from a listing. Owner-scoped both in code
// AND by the listing_media RLS delete policy, so a session that is not the owner
// cannot delete another listing's media even by calling this directly. The storage
// object is removed best-effort; if the bucket's delete-protection refuses it, the
// row is still gone so the photo stops showing, which is what the owner asked for.
export async function DELETE(
  req: NextRequest,
  props: { params: Promise<{ id: string; mediaId: string }> }
) {
  const params = await props.params;
  if (!allow("listing-media-delete", req, 40)) return NextResponse.json({ error: "rate_limited", code: "rate_limited" }, { status: 429 });

  const su = await getSessionUser();
  if (!su || !su.accountId) return NextResponse.json({ error: "Sign in to edit.", code: "sign_in_to_edit_media" }, { status: 401 });

  const sb = await getSupabaseServer();
  if (!sb) return NextResponse.json({ error: "Storage unavailable.", code: "storage_unavailable" }, { status: 503 });

  const { data: listing } = await sb.from("listings").select("id, account_id").eq("id", params.id).single();
  if (!listing) return NextResponse.json({ error: "Listing not found.", code: "listing_not_found" }, { status: 404 });
  if ((listing as { account_id: string }).account_id !== su.accountId) {
    return NextResponse.json({ error: "This is not your listing.", code: "not_your_listing" }, { status: 403 });
  }

  // The row must belong to THIS listing, not just exist. Selecting it also confirms
  // it is visible to the owner under RLS before we try to remove it.
  const { data: media } = await sb
    .from("listing_media")
    .select("id, path, source, original_path")
    .eq("id", params.mediaId)
    .eq("listing_id", params.id)
    .maybeSingle();
  if (!media) return NextResponse.json({ error: "Media not found.", code: "media_not_found" }, { status: 404 });

  const { error } = await sb.from("listing_media").delete().eq("id", params.mediaId).eq("listing_id", params.id);
  if (error) return NextResponse.json({ error: "Could not remove the photo.", code: "remove_failed" }, { status: 400 });

  // Best-effort storage cleanup; a failure here never fails the request because the
  // row (the source of truth for what shows) is already gone. The preserved
  // original (outcome D) is removed alongside the derivative: once the row is
  // gone neither file has a reader left, and leaving the original behind would
  // be exactly the undisclosed-orphan failure mode this package's own review
  // of the upload path was written to close.
  const m = media as { path: string; source: string; original_path: string | null };
  if (m.source === "upload" && m.path) {
    const toRemove = m.original_path ? [m.path, m.original_path] : [m.path];
    try { await sb.storage.from("listing-media").remove(toRemove); } catch { /* ignore */ }
  }

  return NextResponse.json({ ok: true });
}

// PKG-LISTING-CREATION-1B, outcome B. Categorize one already-uploaded photo:
// which named shot (mediaStandard.ts, asset-type specific) it answers, and
// two small, asset-type-independent facts about it, building vs unit and
// current vs illustrative. A PATCH on this per-row route rather than a mode
// grafted onto media/route.ts's own PATCH (which reorders the whole photo
// array under a single-purpose body shape, { order: [...] }), because this
// mediaId is already the URL's own resource and a partial update of one
// row's fields is what PATCH on a specific resource means.
//
// shot_key is validated against the listing's REAL asset_type, read here
// server-side, never trusted from the client: the same "ownership enforced
// in the query, not just app code" discipline this file's own DELETE above
// and media/route.ts's POST and PATCH already follow, applied to the shot
// taxonomy rather than to the account_id check. A client that claims a
// listing is an office when it is a warehouse would otherwise be able to
// attach a shot key that means nothing for what the listing actually is.
//
// is_cover, rights_acknowledged_by/at, visibility and moderation_state are
// deliberately not settable here; see mediaCategorization.ts's own header
// for why is_cover in particular is held back.
export async function PATCH(
  req: NextRequest,
  props: { params: Promise<{ id: string; mediaId: string }> }
) {
  const params = await props.params;
  if (!allow("listing-media-categorize", req, 60)) return NextResponse.json({ error: "rate_limited", code: "rate_limited" }, { status: 429 });

  const su = await getSessionUser();
  if (!su || !su.accountId) return NextResponse.json({ error: "Sign in to edit.", code: "sign_in_to_edit_media" }, { status: 401 });

  const sb = await getSupabaseServer();
  if (!sb) return NextResponse.json({ error: "Storage unavailable.", code: "storage_unavailable" }, { status: 503 });

  // asset_type travels with the same lookup that already confirms ownership,
  // rather than a second query, because the shot validation below needs it
  // and the row is being fetched regardless.
  const { data: listing } = await sb.from("listings").select("id, account_id, asset_type").eq("id", params.id).single();
  if (!listing) return NextResponse.json({ error: "Listing not found.", code: "listing_not_found" }, { status: 404 });
  const L = listing as { account_id: string; asset_type: string };
  // Owner, or SAT: the same allowance media/route.ts's siblings do not yet
  // need but documents/[id]/download/route.ts and listings/[id]/status/route.ts
  // already establish for a listing-scoped write, "!su.isSat && account_id !==
  // su.accountId" rather than a bespoke check invented for this route alone.
  if (!su.isSat && L.account_id !== su.accountId) {
    return NextResponse.json({ error: "This is not your listing.", code: "not_your_listing" }, { status: 403 });
  }

  const { data: media } = await sb
    .from("listing_media")
    .select("id")
    .eq("id", params.mediaId)
    .eq("listing_id", params.id)
    .maybeSingle();
  if (!media) return NextResponse.json({ error: "Media not found.", code: "media_not_found" }, { status: 404 });

  const body = (await req.json().catch(() => ({}))) as {
    shot_key?: unknown;
    media_scope?: unknown;
    media_condition?: unknown;
  };

  // Partial update: only the fields the caller actually sent are validated
  // and written, so one control changing on a photo tile does not require
  // the other two to be resent. null clears a field back to "not yet set",
  // which the migration's own header comment treats as a valid, honest
  // state and not an error.
  const update: Record<string, string | null> = {};

  if ("shot_key" in body) {
    const raw = body.shot_key;
    const shotKey = raw === null ? null : typeof raw === "string" ? raw : undefined;
    if (shotKey === undefined || !isValidShotKey(L.asset_type, shotKey)) {
      return NextResponse.json({ error: "That shot is not one this asset type uses.", code: "shot_key_invalid" }, { status: 400 });
    }
    update.shot_key = shotKey;
  }

  if ("media_scope" in body) {
    const raw = body.media_scope;
    const scope = raw === null ? null : typeof raw === "string" ? raw : undefined;
    if (scope === undefined || !isValidMediaScope(scope)) {
      return NextResponse.json({ error: "That is not a scope this platform recognises.", code: "media_scope_invalid" }, { status: 400 });
    }
    update.media_scope = scope;
  }

  if ("media_condition" in body) {
    const raw = body.media_condition;
    const condition = raw === null ? null : typeof raw === "string" ? raw : undefined;
    if (condition === undefined || !isValidMediaCondition(condition)) {
      return NextResponse.json({ error: "That is not a condition this platform recognises.", code: "media_condition_invalid" }, { status: 400 });
    }
    update.media_condition = condition;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nothing to update.", code: "no_categorization_fields" }, { status: 400 });
  }

  const { error } = await sb.from("listing_media").update(update).eq("id", params.mediaId).eq("listing_id", params.id);
  if (error) return NextResponse.json({ error: "Could not save the category.", code: "categorize_failed" }, { status: 400 });

  return NextResponse.json({ ok: true });
}
