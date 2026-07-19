import { NextRequest, NextResponse } from "next/server";
import { allow } from "@/lib/ratelimit";
import { getSupabaseServer } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth/session";
import sharp from "sharp";
import { randomUUID } from "crypto";
import { isPlanType } from "@/lib/planTypes";

export const runtime = "nodejs";

// Photo upload for a listing. Proxied through the server (never direct to Storage)
// so we can authenticate, sniff the real file type, re-encode to strip EXIF/GPS,
// and cap counts. One file per request. Object path: {account}/{listing}/{uuid}.webp
// in the private listing-media bucket, written under the lister's own account
// prefix (enforced by storage RLS). Uploading a photo sets no verification flag.
const MAX_BYTES = 4 * 1024 * 1024; // 4MB, within the serverless request body limit
// Photo gallery vs floor-plan IMAGES (PDF floor plans go to the /docs route).
const CAPS: Record<string, number> = { photo: 20, floorplan: 12 };

function sniff(buf: Buffer): boolean {
  if (buf.length < 12) return false;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return true; // jpeg
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return true; // png
  if (buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") return true; // webp
  return false;
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!allow("listing-media-upload", req, 30)) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  const su = await getSessionUser();
  if (!su || !su.accountId) return NextResponse.json({ error: "Sign in to upload." }, { status: 401 });

  const sb = getSupabaseServer();
  if (!sb) return NextResponse.json({ error: "Storage unavailable." }, { status: 503 });

  const listingId = params.id;
  const { data: listing } = await sb.from("listings").select("id, account_id").eq("id", listingId).single();
  if (!listing) return NextResponse.json({ error: "Listing not found." }, { status: 404 });
  if ((listing as { account_id: string }).account_id !== su.accountId) {
    return NextResponse.json({ error: "This is not your listing." }, { status: 403 });
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "No file provided." }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "Image is too large (max 4MB)." }, { status: 400 });
  const kind = form?.get("kind") === "floorplan" ? "floorplan" : "photo";
  const label = String(form?.get("label") ?? "").trim().slice(0, 80);
  const ptRaw = form?.get("plan_type");
  const planType = kind === "floorplan" && isPlanType(ptRaw) ? ptRaw : null;

  const { count } = await sb
    .from("listing_media")
    .select("id", { count: "exact", head: true })
    .eq("listing_id", listingId)
    .eq("kind", kind);
  if ((count ?? 0) >= CAPS[kind]) {
    return NextResponse.json({ error: `Limit reached for ${kind} images.` }, { status: 400 });
  }

  const input = Buffer.from(await file.arrayBuffer());
  if (!sniff(input)) return NextResponse.json({ error: "Only JPEG, PNG, or WebP images are accepted." }, { status: 400 });

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
    return NextResponse.json({ error: "Could not process that image." }, { status: 400 });
  }

  const objectKey = `${su.accountId}/${listingId}/${randomUUID()}.webp`;
  const { error: upErr } = await sb.storage
    .from("listing-media")
    .upload(objectKey, out, { contentType: "image/webp", upsert: false });
  if (upErr) return NextResponse.json({ error: "Upload failed." }, { status: 400 });

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
    })
    .select("id")
    .single();
  if (insErr) return NextResponse.json({ error: "Saved the file but could not attach it." }, { status: 400 });

  const { data: signed } = await sb.storage.from("listing-media").createSignedUrl(objectKey, 3600);
  return NextResponse.json({ id: (row as { id: string })?.id, url: signed?.signedUrl ?? null });
}

// Reorder a listing's photos (which also sets the cover: sort_order 0 is the hero).
// Body: { order: [mediaId, ...] } listing the PHOTO rows in the desired order. Only
// ids that actually belong to this listing's photos are touched; anything else is
// ignored, so a stray id cannot reorder another listing. Owner-scoped in code and by
// the listing_media RLS update policy.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!allow("listing-media-reorder", req, 40)) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  const su = await getSessionUser();
  if (!su || !su.accountId) return NextResponse.json({ error: "Sign in to edit." }, { status: 401 });

  const sb = getSupabaseServer();
  if (!sb) return NextResponse.json({ error: "Storage unavailable." }, { status: 503 });

  const { data: listing } = await sb.from("listings").select("id, account_id").eq("id", params.id).single();
  if (!listing) return NextResponse.json({ error: "Listing not found." }, { status: 404 });
  if ((listing as { account_id: string }).account_id !== su.accountId) {
    return NextResponse.json({ error: "This is not your listing." }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as { order?: unknown };
  const order = Array.isArray(body.order) ? body.order.map(String) : null;
  if (!order || order.length === 0) return NextResponse.json({ error: "No order provided." }, { status: 400 });

  // Only reorder ids that really are this listing's photos.
  const { data: photos } = await sb
    .from("listing_media")
    .select("id")
    .eq("listing_id", params.id)
    .eq("kind", "photo");
  const valid = new Set(((photos ?? []) as { id: string }[]).map((p) => p.id));
  const seq = order.filter((id) => valid.has(id));
  if (seq.length === 0) return NextResponse.json({ error: "No matching photos." }, { status: 400 });

  for (let i = 0; i < seq.length; i++) {
    const { error } = await sb.from("listing_media").update({ sort_order: i }).eq("id", seq[i]).eq("listing_id", params.id);
    if (error) return NextResponse.json({ error: "Could not reorder." }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
