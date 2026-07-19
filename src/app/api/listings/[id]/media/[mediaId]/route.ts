import { NextRequest, NextResponse } from "next/server";
import { allow } from "@/lib/ratelimit";
import { getSupabaseServer } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth/session";

export const runtime = "nodejs";

// Remove one photo (or other media row) from a listing. Owner-scoped both in code
// AND by the listing_media RLS delete policy, so a session that is not the owner
// cannot delete another listing's media even by calling this directly. The storage
// object is removed best-effort; if the bucket's delete-protection refuses it, the
// row is still gone so the photo stops showing, which is what the owner asked for.
export async function DELETE(req: NextRequest, { params }: { params: { id: string; mediaId: string } }) {
  if (!allow("listing-media-delete", req, 40)) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  const su = await getSessionUser();
  if (!su || !su.accountId) return NextResponse.json({ error: "Sign in to edit." }, { status: 401 });

  const sb = getSupabaseServer();
  if (!sb) return NextResponse.json({ error: "Storage unavailable." }, { status: 503 });

  const { data: listing } = await sb.from("listings").select("id, account_id").eq("id", params.id).single();
  if (!listing) return NextResponse.json({ error: "Listing not found." }, { status: 404 });
  if ((listing as { account_id: string }).account_id !== su.accountId) {
    return NextResponse.json({ error: "This is not your listing." }, { status: 403 });
  }

  // The row must belong to THIS listing, not just exist. Selecting it also confirms
  // it is visible to the owner under RLS before we try to remove it.
  const { data: media } = await sb
    .from("listing_media")
    .select("id, path, source")
    .eq("id", params.mediaId)
    .eq("listing_id", params.id)
    .maybeSingle();
  if (!media) return NextResponse.json({ error: "Media not found." }, { status: 404 });

  const { error } = await sb.from("listing_media").delete().eq("id", params.mediaId).eq("listing_id", params.id);
  if (error) return NextResponse.json({ error: "Could not remove the photo." }, { status: 400 });

  // Best-effort storage cleanup; a failure here never fails the request because the
  // row (the source of truth for what shows) is already gone.
  const m = media as { path: string; source: string };
  if (m.source === "upload" && m.path) {
    try { await sb.storage.from("listing-media").remove([m.path]); } catch { /* ignore */ }
  }

  return NextResponse.json({ ok: true });
}
