import { NextRequest, NextResponse } from "next/server";
import { allow } from "@/lib/ratelimit";
import { getSupabaseServer } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth/session";
import { createHash, randomUUID } from "crypto";
import { isDocumentKind } from "@/lib/documentKinds";

export const runtime = "nodejs";

// Private VERIFICATION documents (deed, Ejar, CR, licences, broker authorization).
// These are legal evidence, not marketing media, and go to a SEPARATE private bucket
// (listing-legal-docs) with a SEPARATE table (listing_documents). This route writes
// ONLY to that table and bucket: it references no verification column, and the
// database itself forbids an owner from setting a verification flag, so uploading
// evidence can never assert a verified status. Files are stored AS UPLOADED (never
// re-encoded, so a deed scan is preserved); safety comes from the download path,
// which is SAT/owner only, short-lived, and forced to download (never rendered
// inline), neutralizing any PDF/HTML polyglot.
const MAX_BYTES = 25 * 1024 * 1024; // 25MB, room for a multi-page deed scan
const PER_LISTING_CAP = 20;

// Sniff the real type; never trust the client's declared MIME. Returns a safe
// server-chosen content type, or null to reject.
function sniff(buf: Buffer): { mime: string; ext: string } | null {
  if (buf.length < 12) return null;
  if (buf.toString("ascii", 0, 5) === "%PDF-") return { mime: "application/pdf", ext: "pdf" };
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { mime: "image/jpeg", ext: "jpg" };
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return { mime: "image/png", ext: "png" };
  if (buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") return { mime: "image/webp", ext: "webp" };
  return null;
}

export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  if (!allow("listing-documents-upload", req, 20)) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  const su = await getSessionUser();
  if (!su || !su.accountId) return NextResponse.json({ error: "Sign in to upload." }, { status: 401 });

  const sb = getSupabaseServer();
  if (!sb) return NextResponse.json({ error: "Storage unavailable." }, { status: 503 });

  const listingId = params.id;
  const { data: listing } = await sb.from("listings").select("id, account_id").eq("id", listingId).single();
  if (!listing) return NextResponse.json({ error: "Listing not found." }, { status: 404 });
  // Owner only. SAT reviewers do not upload a lister's evidence.
  if ((listing as { account_id: string }).account_id !== su.accountId) {
    return NextResponse.json({ error: "This is not your listing." }, { status: 403 });
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  const kindRaw = form?.get("kind");
  const kind = isDocumentKind(kindRaw) ? kindRaw : "other";
  const note = String(form?.get("note") ?? "").trim().slice(0, 300) || null;
  if (!(file instanceof File)) return NextResponse.json({ error: "No file provided." }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "Document is too large (max 25MB)." }, { status: 400 });

  const buf = Buffer.from(await file.arrayBuffer());
  const kindType = sniff(buf);
  if (!kindType) return NextResponse.json({ error: "Only PDF, JPEG, PNG, or WebP documents are accepted." }, { status: 400 });

  const { count } = await sb
    .from("listing_documents")
    .select("id", { count: "exact", head: true })
    .eq("listing_id", listingId);
  if ((count ?? 0) >= PER_LISTING_CAP) {
    return NextResponse.json({ error: "Document limit reached for this listing." }, { status: 400 });
  }

  const sha256 = createHash("sha256").update(buf).digest("hex");
  const objectKey = `${su.accountId}/${listingId}/${randomUUID()}.${kindType.ext}`;
  const { error: upErr } = await sb.storage
    .from("listing-legal-docs")
    .upload(objectKey, buf, { contentType: kindType.mime, upsert: false });
  if (upErr) return NextResponse.json({ error: "Upload failed." }, { status: 400 });

  const originalName = (file.name || "").slice(0, 120) || null;
  const { data: row, error: insErr } = await sb
    .from("listing_documents")
    .insert({
      listing_id: listingId,
      account_id: su.accountId,
      kind,
      storage_key: objectKey,
      mime: kindType.mime,
      bytes: buf.length,
      sha256,
      original_name: originalName,
      note,
      uploaded_by: su.userId,
    })
    .select("id")
    .single();
  if (insErr) return NextResponse.json({ error: "Saved the file but could not attach it." }, { status: 400 });

  return NextResponse.json({ id: (row as { id: string })?.id });
}
