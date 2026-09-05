import { NextRequest, NextResponse } from "next/server";
import { allow } from "@/lib/ratelimit";
import { getSupabaseServer } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth/session";
import { randomUUID, createHash } from "crypto";
import { isPlanType } from "@/lib/planTypes";

export const runtime = "nodejs";

// PDF documents for a listing: floor plans (as PDF) and the marketing brochure /
// offering memorandum. DELIBERATELY separate from the image upload route so a PDF
// never touches sharp (which would destroy it) and is never re-encoded. Security:
// sniff the %PDF- header, store in the private bucket, and the detail page serves
// it ONLY via a signed URL forced to download (Content-Disposition: attachment),
// never inline, so a PDF/HTML polyglot cannot execute in a viewer's session.
// Uploading a document sets no verification flag.
const MAX_BYTES = 20 * 1024 * 1024; // 20MB
const CAPS: Record<string, number> = { floorplan: 12, brochure: 3 };

export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  if (!allow("listing-docs-upload", req, 20)) return NextResponse.json({ error: "rate_limited", code: "rate_limited" }, { status: 429 });

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

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  const kind = form?.get("kind") === "brochure" ? "brochure" : "floorplan";
  const label = String(form?.get("label") ?? "").trim().slice(0, 80);
  const ptRaw = form?.get("plan_type");
  const planType = kind === "floorplan" && isPlanType(ptRaw) ? ptRaw : null;
  if (!(file instanceof File)) return NextResponse.json({ error: "No file provided.", code: "no_file" }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "Document is too large (max 20MB).", code: "document_too_large" }, { status: 400 });

  const buf = Buffer.from(await file.arrayBuffer());
  // Sniff the real type; never trust the client. Only PDFs on this route.
  if (buf.length < 5 || buf.toString("ascii", 0, 5) !== "%PDF-") {
    return NextResponse.json({ error: "Only PDF documents are accepted here.", code: "document_type_rejected" }, { status: 400 });
  }

  // PKG-LISTING-CREATION-1B outcome C: the same content-hash duplicate
  // protection media/route.ts now applies to photos, extended to this
  // route's PDFs since both write to listing_media and share its unique
  // index. Pre-check is a non-authoritative early exit; the index is the
  // real safety net (see the insErr.code === "23505" branch below).
  //
  // Deliberately BEFORE the cap check below, matching media/route.ts's own
  // ordering and for the same reason: a listing already at its document cap,
  // retrying a request whose earlier response was lost, must still recognise
  // "this exact file is already attached" rather than answer a limit error
  // for a file that isn't actually a new addition at all.
  const sha256 = createHash("sha256").update(buf).digest("hex");
  const { data: existingDup } = await sb
    .from("listing_media")
    .select("id")
    .eq("listing_id", listingId)
    .eq("content_sha256", sha256)
    .maybeSingle();
  if (existingDup) {
    return NextResponse.json({ error: "This document has already been uploaded for this listing.", code: "duplicate_media" }, { status: 409 });
  }

  const { count } = await sb
    .from("listing_media")
    .select("id", { count: "exact", head: true })
    .eq("listing_id", listingId)
    .eq("kind", kind);
  if ((count ?? 0) >= CAPS[kind]) {
    return NextResponse.json(
      {
        error: `Limit reached for ${kind} documents.`,
        code: kind === "brochure" ? "brochure_limit_reached" : "floorplan_limit_reached",
      },
      { status: 400 },
    );
  }

  const objectKey = `${su.accountId}/${listingId}/${randomUUID()}.pdf`;
  const { error: upErr } = await sb.storage
    .from("listing-media")
    .upload(objectKey, buf, { contentType: "application/pdf", upsert: false });
  if (upErr) return NextResponse.json({ error: "Upload failed.", code: "upload_failed" }, { status: 400 });

  const { data: row, error: insErr } = await sb
    .from("listing_media")
    .insert({
      listing_id: listingId,
      path: objectKey,
      kind,
      source: "upload",
      mime: "application/pdf",
      bytes: buf.length,
      sort_order: count ?? 0,
      alt_en: label || null,
      plan_type: planType,
      content_sha256: sha256,
    })
    .select("id")
    .single();
  if (insErr) {
    try { await sb.storage.from("listing-media").remove([objectKey]); } catch { /* ignore: best-effort cleanup */ }
    if (insErr.code === "23505") {
      return NextResponse.json({ error: "This document has already been uploaded for this listing.", code: "duplicate_media" }, { status: 409 });
    }
    return NextResponse.json({ error: "Saved the file but could not attach it.", code: "attach_failed" }, { status: 400 });
  }

  return NextResponse.json({ id: (row as { id: string })?.id });
}
