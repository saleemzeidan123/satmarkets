import { NextRequest, NextResponse } from "next/server";
import { allow } from "@/lib/ratelimit";
import { getSupabaseServer } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth/session";

export const runtime = "nodejs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// An occupier's saved listings, PERSISTED to their account (the sibling /api/saved
// hydrates listing detail by id for the Saved page; this endpoint owns the durable
// list). Keyed to the signed-in user id; RLS ("user manages own saved listings") is
// the real guard, so this route never filters by user. Anonymous callers are told
// they are signed out and the client keeps its device-local list instead.
async function me() {
  const su = await getSessionUser();
  return su?.userId ? su : null;
}

// GET: the ids this user has saved (newest first). The heart button and the Saved
// page read this to render saved state.
export async function GET(req: NextRequest) {
  if (!allow("fav-get", req, 60)) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  const su = await me();
  if (!su) return NextResponse.json({ ids: [], signedIn: false });
  const sb = getSupabaseServer();
  if (!sb) return NextResponse.json({ ids: [], signedIn: true });
  const { data } = await sb.from("saved_listings").select("listing_id").order("created_at", { ascending: false });
  return NextResponse.json({ ids: (data ?? []).map((r: any) => r.listing_id), signedIn: true });
}

// POST: save one listing, or merge many (used once on first sign-in to fold in the
// favourites the visitor collected in the browser while logged out).
export async function POST(req: NextRequest) {
  if (!allow("fav-post", req, 40)) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  const su = await me();
  if (!su) return NextResponse.json({ error: "Sign in to save listings." }, { status: 401 });
  const sb = getSupabaseServer();
  if (!sb) return NextResponse.json({ error: "Storage unavailable." }, { status: 503 });

  const body = (await req.json().catch(() => ({}))) as { listing_id?: unknown; listing_ids?: unknown };
  const ids = Array.isArray(body.listing_ids)
    ? body.listing_ids.map(String).filter((x) => UUID.test(x))
    : (typeof body.listing_id === "string" && UUID.test(body.listing_id) ? [body.listing_id] : []);
  if (!ids.length) return NextResponse.json({ error: "No listing to save." }, { status: 400 });

  // Idempotent: unique(user_id, listing_id) makes a re-save a no-op. The user id is
  // stamped from the session, never the body.
  const rows = ids.slice(0, 200).map((listing_id) => ({ user_id: su.userId, listing_id }));
  const { error } = await sb.from("saved_listings").upsert(rows, { onConflict: "user_id,listing_id", ignoreDuplicates: true });
  if (error) return NextResponse.json({ error: "Could not save." }, { status: 400 });
  return NextResponse.json({ ok: true, saved: ids.length });
}

// DELETE: unsave one listing.
export async function DELETE(req: NextRequest) {
  if (!allow("fav-del", req, 40)) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  const su = await me();
  if (!su) return NextResponse.json({ error: "Sign in to manage saved listings." }, { status: 401 });
  const sb = getSupabaseServer();
  if (!sb) return NextResponse.json({ error: "Storage unavailable." }, { status: 503 });

  const body = (await req.json().catch(() => ({}))) as { listing_id?: unknown };
  const id = typeof body.listing_id === "string" && UUID.test(body.listing_id) ? body.listing_id : null;
  if (!id) return NextResponse.json({ error: "No listing given." }, { status: 400 });
  const { error } = await sb.from("saved_listings").delete().eq("listing_id", id);
  if (error) return NextResponse.json({ error: "Could not remove." }, { status: 400 });
  return NextResponse.json({ ok: true });
}
