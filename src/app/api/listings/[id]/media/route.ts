import { NextRequest, NextResponse } from "next/server";
import { allow } from "@/lib/ratelimit";
import { getSupabaseServer } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth/session";
import sharp from "sharp";
import { randomUUID } from "crypto";

export const runtime = "nodejs";

// Photo upload for a listing. Proxied through the server (never direct to Storage)
// so we can authenticate, sniff the real file type, re-encode to strip EXIF/GPS,
// and cap counts. One file per request. Object path: {account}/{listing}/{uuid}.webp
// in the private listing-media bucket, written under the lister's own account
// prefix (enforced by storage RLS). Uploading a photo sets no verification flag.
const MAX_BYTES = 4 * 1024 * 1024; // 4MB, within the serverless request body limit
const MAX_PHOTOS = 20;

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

  const { count } = await sb
    .from("listing_media")
    .select("id", { count: "exact", head: true })
    .eq("listing_id", listingId)
    .eq("kind", "photo");
  if ((count ?? 0) >= MAX_PHOTOS) {
    return NextResponse.json({ error: `A listing can have up to ${MAX_PHOTOS} photos.` }, { status: 400 });
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "No file provided." }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "Image is too large (max 4MB)." }, { status: 400 });

  const input = Buffer.from(await file.arrayBuffer());
  if (!sniff(input)) return NextResponse.json({ error: "Only JPEG, PNG, or WebP images are accepted." }, { status: 400 });

  // Re-encode: rotate() applies EXIF orientation then all metadata (including GPS)
  // is dropped, polyglots are neutralized, and the image is normalized to web-sized webp.
  let out: Buffer;
  try {
    out = await sharp(input)
      .rotate()
      .resize({ width: 2000, height: 2000, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 80 })
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
      kind: "photo",
      source: "upload",
      mime: "image/webp",
      bytes: out.length,
      sort_order: count ?? 0,
    })
    .select("id")
    .single();
  if (insErr) return NextResponse.json({ error: "Saved the file but could not attach it." }, { status: 400 });

  const { data: signed } = await sb.storage.from("listing-media").createSignedUrl(objectKey, 3600);
  return NextResponse.json({ id: (row as { id: string })?.id, url: signed?.signedUrl ?? null });
}
