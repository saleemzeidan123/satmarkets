import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { allow } from "@/lib/ratelimit";
import { getSessionUser } from "@/lib/auth/session";

export const runtime = "nodejs";

// The ONLY way to read a verification document. Authorizes on the SESSION: the
// owning account, or a SAT reviewer. Everyone else, including any signed-out
// scraper, gets 404 (the route does not confirm the document exists). It mints a
// SHORT-LIVED (60s) signed URL forced to DOWNLOAD (Content-Disposition attachment),
// so the file is never rendered inline and a PDF/HTML polyglot cannot run in the
// viewer's origin. The signed URL is a per-click capability; it is never stored,
// never logged, and expires in a minute. The client id is a document id, never an
// object key, so the object path cannot be guessed or supplied by the caller.
const TTL_SECONDS = 60;

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  if (!allow("document-download", req, 60)) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  const su = await getSessionUser();
  // Signed out -> 404, not 401: do not reveal that there is anything here.
  if (!su) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const sb = createClient(url, serviceKey, { auth: { persistSession: false } });

  const { data: doc } = await sb
    .from("listing_documents")
    .select("id, account_id, storage_key, original_name, kind, deleted_at")
    .eq("id", params.id)
    .single();

  // One authorization rule, no third branch: the owning account, or a SAT reviewer.
  const authorized = !!doc && !doc.deleted_at && (doc.account_id === su.accountId || su.isSat);
  if (!authorized) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const downloadName = (doc.original_name as string) || `${doc.kind}.dat`;
  const { data: signed, error } = await sb.storage
    .from("listing-legal-docs")
    .createSignedUrl(doc.storage_key as string, TTL_SECONDS, { download: downloadName });
  if (error || !signed?.signedUrl) return NextResponse.json({ error: "not_found" }, { status: 404 });

  // Lightweight audit: who reached which document, and when. Never the signed URL.
  console.log(`[doc-access] account=${su.accountId} sat=${su.isSat} document=${doc.id}`);

  // Redirect to the short-lived signed URL. 303 so the browser issues a GET.
  return NextResponse.redirect(signed.signedUrl, 303);
}
