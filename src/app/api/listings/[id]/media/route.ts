import { NextRequest, NextResponse } from "next/server";
import { allow } from "@/lib/ratelimit";
import { getSupabaseServer } from "@/lib/supabase/server";
import { getSupabaseServiceRole } from "@/lib/supabase/serviceRole";
import { getSessionUser } from "@/lib/auth/session";
import sharp from "sharp";
import { randomUUID, createHash } from "crypto";
import { isPlanType } from "@/lib/planTypes";
import { MAX_IMAGE_BYTES, MEDIA_CAPS, isAcceptedImageType, sniffImageType, mimeForSniffedType } from "@/lib/uploadQuality";
import { mediaPublishable, type MediaDerivation } from "@/lib/mediaStandard";
import { bestEffortWithFallback, queueMediaCleanup, removeStorageObjects } from "@/lib/mediaCleanup";

// PKG-LISTING-CREATION-1B, outcomes C and D. What every upload through this
// route now also does, beyond PKG-LISTING-CREATION-1A's original re-encode:
// hash the ORIGINAL bytes (before sharp touches them) so a re-upload of the
// same photo in a later session is caught by listing_media's own unique
// index rather than only by uploadQuality.ts's session-only findDuplicates(),
// and preserve those original bytes in storage so mediaIntegrityFaults() has
// a real MediaDerivation to answer rather than an always-empty one. See
// supabase/migrations/20260902c_pkg1b_media_content_fingerprint.sql and
// 20260902d_pkg1b_media_derivation_integrity.sql for the columns this reads
// and writes, and why they are shaped the way they are.
const SYSTEM_DERIVED_BY = "system:upload-pipeline";
const DERIVED_TRANSFORMS = ["downscale", "format_convert"];

export const runtime = "nodejs";

// Photo upload for a listing. Proxied through the server (never direct to Storage)
// so we can authenticate, sniff the real file type, re-encode to strip EXIF/GPS,
// and cap counts. One file per request. Object path: {account}/{listing}/{uuid}.webp
// in the private listing-media bucket, written under the lister's own account
// prefix (enforced by storage RLS). Uploading a photo sets no verification flag.
//
// PKG-LISTING-CREATION-1A. The size limit, the per-kind caps and the magic-byte
// sniff used to be this file's own private copies. They now come from
// uploadQuality.ts, which the browser-side pre-upload checks read too, so the
// client cannot reject or accept a file the server would answer differently
// about; the two used to be two hand-written copies of the same three numbers
// and one byte pattern, which is exactly the drift this package's "one truth
// model" requirement exists to close.
const MAX_BYTES = MAX_IMAGE_BYTES;
const CAPS = MEDIA_CAPS;

export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  if (!allow("listing-media-upload", req, 30)) return NextResponse.json({ error: "rate_limited", code: "rate_limited" }, { status: 429 });

  const su = await getSessionUser();
  if (!su || !su.accountId) return NextResponse.json({ error: "Sign in to upload.", code: "sign_in_to_upload" }, { status: 401 });

  const sb = await getSupabaseServer();
  if (!sb) return NextResponse.json({ error: "Storage unavailable.", code: "storage_unavailable" }, { status: 503 });

  const listingId = params.id;
  const { data: listing } = await sb.from("listings").select("id, account_id").eq("id", listingId).single();
  if (!listing) return NextResponse.json({ error: "Listing not found.", code: "listing_not_found" }, { status: 404 });
  if ((listing as { account_id: string }).account_id !== su.accountId) {
    return NextResponse.json({ error: "This is not your listing.", code: "not_your_listing" }, { status: 403 });
  }

  // Codex review, item 7: fetched now, before any storage write, not only
  // once the trusted-column update needs it. Every successful upload ends
  // up needing this anyway (the trusted columns below cannot be set without
  // it), so failing here, before either storage object is written, avoids
  // the exact inconsistent-state window ("two objects written, DB insert
  // never even attempted") this review item exists to close.
  const serviceRole = getSupabaseServiceRole();
  if (!serviceRole) {
    return NextResponse.json({ error: "This could not be saved right now. Try again in a moment.", code: "storage_unavailable" }, { status: 503 });
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "No file provided.", code: "no_file" }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "Image is too large (max 4MB).", code: "image_too_large" }, { status: 400 });
  const kind = form?.get("kind") === "floorplan" ? "floorplan" : "photo";
  const label = String(form?.get("label") ?? "").trim().slice(0, 80);
  const ptRaw = form?.get("plan_type");
  const planType = kind === "floorplan" && isPlanType(ptRaw) ? ptRaw : null;

  const input = Buffer.from(await file.arrayBuffer());
  if (!isAcceptedImageType(input)) return NextResponse.json({ error: "Only JPEG, PNG, or WebP images are accepted.", code: "image_type_rejected" }, { status: 400 });

  // Fingerprint the ORIGINAL bytes, not the derivative sharp() produces below:
  // two originals are not guaranteed to re-encode byte-identically across a
  // library version bump, so hashing the derivative would be neither sound
  // nor stable. This pre-check is a cheap, non-authoritative early exit for
  // the common case (a real re-upload of the same file) that saves a wasted
  // storage write; listing_media_content_sha256_unique below is the actual
  // safety net, so a race between two concurrent requests for the same bytes
  // is still caught correctly even though this read cannot see a write that
  // has not committed yet.
  //
  // Deliberately BEFORE the cap check below: a listing already at its photo
  // cap, retrying a request whose earlier response was lost (see
  // ListingStudio.tsx's retry loop), must still recognise "this exact file
  // is already attached" rather than answer photo_limit_reached for a file
  // that isn't actually a new addition at all.
  const contentHash = createHash("sha256").update(input).digest("hex");
  const originalExt = sniffImageType(input) ?? "bin";
  const { data: existingDup } = await sb
    .from("listing_media")
    .select("id")
    .eq("listing_id", listingId)
    .eq("content_sha256", contentHash)
    .maybeSingle();
  if (existingDup) {
    return NextResponse.json({ error: "This photo has already been uploaded for this listing.", code: "duplicate_media" }, { status: 409 });
  }

  const { count } = await sb
    .from("listing_media")
    .select("id", { count: "exact", head: true })
    .eq("listing_id", listingId)
    .eq("kind", kind);
  if ((count ?? 0) >= CAPS[kind]) {
    return NextResponse.json(
      {
        error: `Limit reached for ${kind} images.`,
        code: kind === "floorplan" ? "floorplan_limit_reached" : "photo_limit_reached",
      },
      { status: 400 },
    );
  }

  // Re-encode: rotate() applies EXIF orientation then all metadata (including GPS)
  // is dropped, polyglots are neutralized, and the image is normalized to web-sized webp.
  let out: Buffer;
  try {
    const maxDim = kind === "floorplan" ? 4000 : 2000; // floor plans need legible text
    out = await sharp(input)
      .rotate()
      .resize({ width: maxDim, height: maxDim, fit: "inside", withoutEnlargement: true })
      .webp({ quality: kind === "floorplan" ? 88 : 80 })
      .toBuffer();
  } catch {
    return NextResponse.json({ error: "Could not process that image.", code: "image_unprocessable" }, { status: 400 });
  }

  const objectKey = `${su.accountId}/${listingId}/${randomUUID()}.webp`;
  const originalKey = `${su.accountId}/${listingId}/originals/${randomUUID()}.${originalExt}`;
  const derivedAt = new Date().toISOString();

  // Deferred-contracts item 7's own obligation: call the real, existing
  // mediaPublishable() rather than writing derivation columns that merely
  // happen to satisfy it. Today's pipeline is fixed to two always-permitted
  // transforms, so this cannot fail yet; it is the backstop against a future
  // edit to DERIVED_TRANSFORMS above introducing one that is not.
  const derivation: MediaDerivation = {
    originalRef: originalKey,
    transforms: DERIVED_TRANSFORMS,
    appliedBy: SYSTEM_DERIVED_BY,
    appliedAt: derivedAt,
  };
  if (!mediaPublishable(derivation)) {
    return NextResponse.json({ error: "This upload's processing could not be verified as safe to publish.", code: "media_integrity_check_failed" }, { status: 500 });
  }

  const { error: upErr } = await sb.storage
    .from("listing-media")
    .upload(objectKey, out, { contentType: "image/webp", upsert: false });
  if (upErr) return NextResponse.json({ error: "Upload failed.", code: "upload_failed" }, { status: 400 });

  // The original is kept so mediaIntegrityFaults() can be answered rather
  // than assumed (outcome D), under the same private-bucket, owner-prefixed
  // path convention as the derivative, in an originals/ subfolder that no
  // listing_media column a client can read ever points to. Content type is
  // the SNIFFED type (mimeForSniffedType, from the same magic-byte read that
  // decided whether to accept this upload at all), not the browser-supplied
  // file.type: Codex review, item 7, the same "never trust a client-asserted
  // type" reasoning isAcceptedImageType above already applies to acceptance.
  const { error: origUpErr } = await sb.storage
    .from("listing-media")
    .upload(originalKey, input, { contentType: mimeForSniffedType(sniffImageType(input)), upsert: false });
  if (origUpErr) {
    await removeStorageObjects(sb, "listing-media", [objectKey],
      () => queueMediaCleanup(serviceRole, { listingId, storagePaths: [objectKey], reason: "upload_original_failed" }),
    );
    return NextResponse.json({ error: "Upload failed.", code: "upload_failed" }, { status: 400 });
  }

  // Codex review, trusted-write boundary: content_sha256/original_path/
  // derived_* are protected at the database level (see 20260902c/d's own
  // triggers) against the caller's own session, which is what `sb` is.
  // The safe columns are inserted first, with the session-scoped client
  // (so the listing's own RLS ownership check still applies to the
  // insert itself); the trusted columns are set in a second, separate
  // write, using the service-role client, which is the one thing in this
  // codebase allowed to write them.
  const { data: row, error: insErr } = await sb
    .from("listing_media")
    .insert({
      listing_id: listingId,
      path: objectKey,
      kind,
      source: "upload",
      mime: "image/webp",
      bytes: out.length,
      sort_order: count ?? 0,
      alt_en: label || null,
      plan_type: planType,
      // Codex review round 3, item 1: visibility's own column default is
      // 'public' (src/lib/mediaVisibility.ts), which would otherwise make
      // this row publicly readable (getPublicListingMedia()) the instant
      // this INSERT commits, before the trusted-column UPDATE below has
      // recorded content_sha256/original_path/derived_* at all. Inserted
      // private and flipped to public only inside that same UPDATE, so a
      // request landing between the two never sees a row whose integrity
      // record does not exist yet. Not a trusted column (migration B's own
      // trigger deliberately leaves visibility to the owner, see section 6
      // of the runbook), so the session client may legitimately set it.
      visibility: "private",
    })
    .select("id")
    .single();
  if (insErr) {
    // Both objects just landed in storage; an insert failure of any kind
    // must not leave them as undisclosed orphans.
    await removeStorageObjects(sb, "listing-media", [objectKey, originalKey],
      () => queueMediaCleanup(serviceRole, { listingId, storagePaths: [objectKey, originalKey], reason: "upload_insert_failed" }),
    );
    return NextResponse.json({ error: "Saved the file but could not attach it.", code: "attach_failed" }, { status: 400 });
  }
  const mediaId = (row as { id: string }).id;

  const { data: trustedRows, error: trustedErr } = await serviceRole
    .from("listing_media")
    .update({
      content_sha256: contentHash,
      original_path: originalKey,
      derived_transforms: derivation.transforms,
      derived_by: derivation.appliedBy,
      derived_at: derivation.appliedAt,
      // Made public in the SAME write that finalizes the integrity record,
      // not a separate step after it: see the INSERT's own comment above.
      visibility: "public",
    })
    .eq("id", mediaId)
    .select("id");
  // Codex review round 2, item 12 (Fable threat-model review): an
  // .update().eq() with no .select() reports no error when it matches zero
  // rows, which is indistinguishable from success. If this row was deleted
  // by a concurrent request (the owner's own second tab, or this same
  // listing's cascade) between the INSERT above and this UPDATE, the old
  // code would fall through to the success response below for a media id
  // that no longer exists. .select("id") makes "matched nothing" visible.
  if (!trustedErr && (trustedRows ?? []).length === 0) {
    await removeStorageObjects(sb, "listing-media", [objectKey, originalKey],
      () => queueMediaCleanup(serviceRole, { listingId, listingMediaId: mediaId, storagePaths: [objectKey, originalKey], reason: "upload_trusted_write_failed" }),
    );
    return NextResponse.json({ error: "Saved the file but could not attach it.", code: "attach_failed" }, { status: 400 });
  }
  if (trustedErr) {
    // The rare concurrent-duplicate race the pre-check above cannot catch
    // surfaces here, at listing_media_content_sha256_unique. Either way,
    // the row this request created is not usable (no hash recorded means
    // no working duplicate protection for it), so it is removed along
    // with both storage objects rather than left as a half-tracked photo.
    await bestEffortWithFallback(
      () => sb.from("listing_media").delete().eq("id", mediaId),
      () => queueMediaCleanup(serviceRole, { listingId, listingMediaId: mediaId, storagePaths: [objectKey, originalKey], reason: "upload_trusted_write_failed" }),
    );
    await removeStorageObjects(sb, "listing-media", [objectKey, originalKey],
      () => queueMediaCleanup(serviceRole, { listingId, listingMediaId: mediaId, storagePaths: [objectKey, originalKey], reason: "upload_trusted_write_failed" }),
    );
    if (trustedErr.code === "23505") {
      return NextResponse.json({ error: "This photo has already been uploaded for this listing.", code: "duplicate_media" }, { status: 409 });
    }
    return NextResponse.json({ error: "Saved the file but could not attach it.", code: "attach_failed" }, { status: 400 });
  }

  const { data: signed } = await sb.storage.from("listing-media").createSignedUrl(objectKey, 3600);
  return NextResponse.json({ id: mediaId, url: signed?.signedUrl ?? null });
}

// Reorder a listing's photos (which also sets the cover: sort_order 0 is the hero).
// Body: { order: [mediaId, ...] } listing the PHOTO rows in the desired order. Only
// ids that actually belong to this listing's photos are touched; anything else is
// ignored, so a stray id cannot reorder another listing. Owner-scoped in code and by
// the listing_media RLS update policy.
export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  if (!allow("listing-media-reorder", req, 40)) return NextResponse.json({ error: "rate_limited", code: "rate_limited" }, { status: 429 });

  const su = await getSessionUser();
  if (!su || !su.accountId) return NextResponse.json({ error: "Sign in to edit.", code: "sign_in_to_edit_media" }, { status: 401 });

  const sb = await getSupabaseServer();
  if (!sb) return NextResponse.json({ error: "Storage unavailable.", code: "storage_unavailable" }, { status: 503 });

  const { data: listing } = await sb.from("listings").select("id, account_id").eq("id", params.id).single();
  if (!listing) return NextResponse.json({ error: "Listing not found.", code: "listing_not_found" }, { status: 404 });
  if ((listing as { account_id: string }).account_id !== su.accountId) {
    return NextResponse.json({ error: "This is not your listing.", code: "not_your_listing" }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as { order?: unknown };
  const order = Array.isArray(body.order) ? body.order.map(String) : null;
  if (!order || order.length === 0) return NextResponse.json({ error: "No order provided.", code: "no_order" }, { status: 400 });

  // Only reorder ids that really are this listing's photos.
  const { data: photos } = await sb
    .from("listing_media")
    .select("id")
    .eq("listing_id", params.id)
    .eq("kind", "photo");
  const valid = new Set(((photos ?? []) as { id: string }[]).map((p) => p.id));
  const seq = order.filter((id) => valid.has(id));
  if (seq.length === 0) return NextResponse.json({ error: "No matching photos.", code: "no_matching_photos" }, { status: 400 });

  for (let i = 0; i < seq.length; i++) {
    const { error } = await sb.from("listing_media").update({ sort_order: i }).eq("id", seq[i]).eq("listing_id", params.id);
    if (error) return NextResponse.json({ error: "Could not reorder.", code: "reorder_failed" }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
