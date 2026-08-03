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

// A shortlist name is a name, not a document. The column check says the same thing in
// the database, so a caller that goes straight at PostgREST gets the same answer.
const SHORTLIST_MAX = 60;
function shortlistOf(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  // An empty string is not a name. Clearing a shortlist is null, and the two are not the
  // same thing to Postgres, so they are not allowed to become the same thing here.
  if (!s) return null;
  return s.slice(0, SHORTLIST_MAX);
}

// GET: the ids this user has saved (newest first). The heart button and the Saved
// page read this to render saved state.
//
// `items` carries the shortlist name alongside each id. `ids` stays exactly as it was,
// because the heart button asks one question (is this saved) and should not have to
// learn about shortlists to keep answering it.
export async function GET(req: NextRequest) {
  if (!allow("fav-get", req, 60)) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  const su = await me();
  if (!su) return NextResponse.json({ ids: [], items: [], shortlists: [], signedIn: false });
  const sb = await getSupabaseServer();
  if (!sb) return NextResponse.json({ ids: [], items: [], shortlists: [], signedIn: true });
  const { data } = await sb.from("saved_listings").select("listing_id,shortlist").order("created_at", { ascending: false });
  const items = (data ?? []).map((r: any) => ({ listing_id: r.listing_id, shortlist: r.shortlist ?? null }));
  // The set of names in use, so a client can offer them without inventing a second store
  // of what shortlists exist. A shortlist is not an entity; it is the names its rows carry.
  const shortlists = Array.from(new Set(items.map((i) => i.shortlist).filter(Boolean) as string[])).sort();
  return NextResponse.json({ ids: items.map((i) => i.listing_id), items, shortlists, signedIn: true });
}

// POST: save one listing, or merge many (used once on first sign-in to fold in the
// favourites the visitor collected in the browser while logged out).
export async function POST(req: NextRequest) {
  if (!allow("fav-post", req, 40)) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  const su = await me();
  if (!su) return NextResponse.json({ error: "Sign in to save listings." }, { status: 401 });
  const sb = await getSupabaseServer();
  if (!sb) return NextResponse.json({ error: "Storage unavailable." }, { status: 503 });

  const body = (await req.json().catch(() => ({}))) as { listing_id?: unknown; listing_ids?: unknown; shortlist?: unknown };
  const ids = Array.isArray(body.listing_ids)
    ? body.listing_ids.map(String).filter((x) => UUID.test(x))
    : (typeof body.listing_id === "string" && UUID.test(body.listing_id) ? [body.listing_id] : []);
  if (!ids.length) return NextResponse.json({ error: "No listing to save." }, { status: 400 });
  const shortlist = shortlistOf(body.shortlist);

  // Idempotent: unique(user_id, listing_id) makes a re-save a no-op. The user id is
  // stamped from the session, never the body.
  //
  // The two conflict behaviours are not a detail. Saving without a name must leave an
  // existing name alone, or the sign-in merge (which posts every device-local favourite
  // at once, with no names) would silently unfile everything the person had filed. Saving
  // WITH a name is a filing instruction and must land on the row that is already there.
  const rows = ids.slice(0, 200).map((listing_id) => ({ user_id: su.userId, listing_id, ...(shortlist ? { shortlist } : {}) }));
  const { error } = await sb
    .from("saved_listings")
    .upsert(rows, { onConflict: "user_id,listing_id", ignoreDuplicates: !shortlist });
  if (error) return NextResponse.json({ error: "Could not save." }, { status: 400 });
  return NextResponse.json({ ok: true, saved: ids.length, shortlist });
}

// PATCH: file a saved listing onto a shortlist, or take it off one.
//
// Separate from POST because the two say different things. POST says keep this space.
// PATCH says this space belongs with those spaces, and it is the only route that can
// CLEAR a name: a null in POST is indistinguishable from a caller that never mentioned
// shortlists at all. Unsaving is still DELETE; taking a space off a shortlist does not
// mean the person stopped wanting it.
export async function PATCH(req: NextRequest) {
  if (!allow("fav-patch", req, 40)) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  const su = await me();
  if (!su) return NextResponse.json({ error: "Sign in to manage saved listings." }, { status: 401 });
  const sb = await getSupabaseServer();
  if (!sb) return NextResponse.json({ error: "Storage unavailable." }, { status: 503 });

  const body = (await req.json().catch(() => ({}))) as { listing_id?: unknown; shortlist?: unknown };
  const id = typeof body.listing_id === "string" && UUID.test(body.listing_id) ? body.listing_id : null;
  if (!id) return NextResponse.json({ error: "No listing given." }, { status: 400 });
  const shortlist = shortlistOf(body.shortlist);

  // No user_id filter, by design: RLS scopes the update to this user's rows, so a listing
  // id belonging to somebody else's saved row matches nothing rather than moving it.
  const { data, error } = await sb
    .from("saved_listings")
    .update({ shortlist })
    .eq("listing_id", id)
    .select("listing_id")
    .maybeSingle();
  if (error) return NextResponse.json({ error: "Could not update." }, { status: 400 });
  if (!data) return NextResponse.json({ error: "Save it first, then file it." }, { status: 404 });
  return NextResponse.json({ ok: true, shortlist });
}

// DELETE: unsave one listing.
export async function DELETE(req: NextRequest) {
  if (!allow("fav-del", req, 40)) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  const su = await me();
  if (!su) return NextResponse.json({ error: "Sign in to manage saved listings." }, { status: 401 });
  const sb = await getSupabaseServer();
  if (!sb) return NextResponse.json({ error: "Storage unavailable." }, { status: 503 });

  const body = (await req.json().catch(() => ({}))) as { listing_id?: unknown };
  const id = typeof body.listing_id === "string" && UUID.test(body.listing_id) ? body.listing_id : null;
  if (!id) return NextResponse.json({ error: "No listing given." }, { status: 400 });
  const { error } = await sb.from("saved_listings").delete().eq("listing_id", id);
  if (error) return NextResponse.json({ error: "Could not remove." }, { status: 400 });
  return NextResponse.json({ ok: true });
}
