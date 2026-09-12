import { NextRequest, NextResponse } from "next/server";
import { allow } from "@/lib/ratelimit";
import { getSupabaseServer } from "@/lib/supabase/server";
import { getSupabaseServiceRole } from "@/lib/supabase/serviceRole";
import { getSessionUser } from "@/lib/auth/session";
import { isValidShotKey, isValidMediaScope, isValidMediaCondition } from "@/lib/mediaCategorization";
import { queueMediaCleanup, removeStorageObjects } from "@/lib/mediaCleanup";

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
  //
  // original_path is deliberately NOT in this select: its SELECT is revoked
  // from the ordinary session client (20260912_pkg1b_sensitive_media_column_
  // grants.sql), so including it here would fail this whole existence check
  // with a permission error, which `!media` would then misreport as "media
  // not found" for every deletion. It is fetched separately below, via
  // serviceRole, before the row is deleted (that read would return nothing
  // once the row is gone).
  const { data: media } = await sb
    .from("listing_media")
    .select("id, path, source")
    .eq("id", params.mediaId)
    .eq("listing_id", params.id)
    .maybeSingle();
  if (!media) return NextResponse.json({ error: "Media not found.", code: "media_not_found" }, { status: 404 });
  const m = media as { path: string; source: string };

  // original_path read via serviceRole (see the select() comment above),
  // BEFORE the delete below: ownership of params.id was already confirmed
  // against the listing above, so this does not widen access, only reads a
  // column the ordinary client is no longer privileged to see. Must happen
  // before the row is gone, or this read finds nothing.
  //
  // Codex review: the row about to be deleted is the ONLY durable record
  // of original_path (outcome D never wrote it anywhere else). A prior
  // version of this read discarded its own error and treated a failed
  // lookup identically to "confirmed, this row genuinely has no original",
  // then deleted the row anyway: a real lookup failure (serviceRole
  // unavailable, a transient query error) would silently lose the only
  // reference needed to ever clean up the preserved original, an orphan
  // object media_cleanup_queue would never even learn about. Matching
  // serviceRole.ts's own stated discipline ("fail loudly, not silently
  // degrade"), and media/route.ts's own upload-side precedent (refuses
  // the request, before any write, if serviceRole is unavailable): a
  // failed or unavailable lookup here refuses the DELETE entirely (503,
  // retryable), rather than proceeding without the information needed to
  // account for every object this row might reference. `.eq("listing_id",
  // ...)` is added to this privileged read too (Codex review): ownership
  // of this exact (mediaId, listingId) pair was already confirmed above
  // with the ordinary client, so this is defence in depth, not a
  // widening, matching the same two-column scope that check already used.
  const serviceRole = getSupabaseServiceRole();
  if (!serviceRole) {
    return NextResponse.json({ error: "This could not be removed right now. Try again in a moment.", code: "storage_unavailable" }, { status: 503 });
  }
  let originalPath: string | null = null;
  if (m.source === "upload") {
    const { data: withOriginal, error: originalLookupErr } = await serviceRole
      .from("listing_media")
      .select("original_path")
      .eq("id", params.mediaId)
      .eq("listing_id", params.id)
      .maybeSingle();
    if (originalLookupErr) {
      return NextResponse.json({ error: "This could not be removed right now. Try again in a moment.", code: "storage_unavailable" }, { status: 503 });
    }
    // withOriginal === null here (no error) means the row already vanished
    // (a concurrent delete) between the existence check above and this
    // lookup: nothing left to account for under a path that no longer
    // exists either, so the DELETE below simply affects zero rows.
    originalPath = (withOriginal as { original_path: string | null } | null)?.original_path ?? null;
  }

  const { error } = await sb.from("listing_media").delete().eq("id", params.mediaId).eq("listing_id", params.id);
  if (error) return NextResponse.json({ error: "Could not remove the photo.", code: "remove_failed" }, { status: 400 });

  // Best-effort storage cleanup; a failure here never fails the request because the
  // row (the source of truth for what shows) is already gone, which is what
  // "deletion must immediately remove public visibility" (Codex review, item 7)
  // actually requires. The preserved original (outcome D) is removed alongside
  // the derivative: once the row is gone neither file has a reader left, and
  // leaving the original behind would be exactly the undisclosed-orphan
  // failure mode this package's own review of the upload path was written to
  // close. A failure here is no longer silently discarded: removeStorageObjects
  // checks the returned `.error` (a storage policy refusal resolves to one of
  // these, it does not throw, see mediaCleanup.ts's own header) AND, per a
  // Codex review round 2 (item 12, Fable threat-model review) finding, the
  // case where a policy silently filters out objects the caller may not
  // delete: that resolves with a 200 `{ data: [], error: null }`, no error
  // at all, which only a returned-count check can catch. Either failure
  // shape is queued durably rather than lost the moment this request ends.
  // serviceRole is guaranteed non-null here (checked above, before the
  // original_path lookup); queueMediaCleanup still takes it as a plain
  // argument rather than being hardcoded to it, matching its own general
  // signature.
  if (m.source === "upload" && m.path) {
    const toRemove = originalPath ? [m.path, originalPath] : [m.path];
    await removeStorageObjects(sb, "listing-media", toRemove,
      () => queueMediaCleanup(serviceRole, { listingId: params.id, listingMediaId: params.mediaId, storagePaths: toRemove, reason: "deletion_storage_remove_failed" }),
    );
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
// rights_acknowledged_by/at, visibility and moderation_state are
// deliberately not settable here; see mediaCategorization.ts's own header
// for why. is_cover does not exist: an earlier migration draft added it,
// and Codex's own review removed it entirely rather than duplicate the
// sort_order = 0 cover convention this codebase already has.
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
      return NextResponse.json({ error: "That is not a photo type this platform recognises.", code: "media_condition_invalid" }, { status: 400 });
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
