import { NextRequest, NextResponse } from "next/server";
import { allow } from "@/lib/ratelimit";
import { getSupabaseServer } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth/session";

export const runtime = "nodejs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ASSETS = new Set([
  "office", "retail", "medical", "showroom", "warehouse", "serviced", "education",
  "land", "mixed_use", "hospitality", "gas_station", "entertainment", "wedding_hall",
  "worker_housing", "self_storage",
]);

// An occupier's saved searches, PERSISTED to their account. Keyed to the signed-in
// user id; RLS ("user own saved searches": user_id = app_user_id()) is the real
// guard, so this route never filters by user. Anonymous callers keep the device
// list. asset_type (single only) and district_id are lifted out of the query string
// into columns so /me can count how many new spaces match each search.
async function me() {
  const su = await getSessionUser();
  return su?.userId ? su : null;
}

function parse(qs: string): { asset_type: string | null; district_id: string | null } {
  const p = new URLSearchParams(qs || "");
  const asset = (p.get("asset") || "").split(",").filter(Boolean);
  const asset_type = asset.length === 1 && ASSETS.has(asset[0]) ? asset[0] : null;
  const d = p.get("district");
  const district_id = d && UUID.test(d) ? d : null;
  return { asset_type, district_id };
}

// GET: this user's saved searches, newest first.
export async function GET(req: NextRequest) {
  if (!allow("ss-get", req, 60)) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  const su = await me();
  if (!su) return NextResponse.json({ searches: [], signedIn: false });
  const sb = await getSupabaseServer();
  if (!sb) return NextResponse.json({ searches: [], signedIn: true });
  const { data } = await sb
    .from("saved_searches")
    .select("id,asset_type,district_id,query,created_at")
    .order("created_at", { ascending: false });
  return NextResponse.json({ searches: data ?? [], signedIn: true });
}

// POST: save one search, or merge many (folding in the device-local searches on
// first sign-in). Duplicates (same query string) are skipped, since there is no
// unique constraint to lean on.
export async function POST(req: NextRequest) {
  if (!allow("ss-post", req, 40)) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  const su = await me();
  if (!su) return NextResponse.json({ error: "Sign in to save searches." }, { status: 401 });
  const sb = await getSupabaseServer();
  if (!sb) return NextResponse.json({ error: "Storage unavailable." }, { status: 503 });

  const body = (await req.json().catch(() => ({}))) as {
    qs?: unknown; label?: unknown; items?: { qs?: unknown; label?: unknown }[];
  };
  const raw = Array.isArray(body.items)
    ? body.items
    : (typeof body.qs === "string" ? [{ qs: body.qs, label: body.label }] : []);
  const items = raw
    .filter((i) => typeof i.qs === "string")
    .map((i) => ({ qs: String(i.qs).slice(0, 1000), label: String(i.label ?? "").slice(0, 120) }))
    .slice(0, 20);
  if (!items.length) return NextResponse.json({ error: "No search to save." }, { status: 400 });

  // Skip qs already saved by this user.
  const { data: existing } = await sb.from("saved_searches").select("query");
  const seen = new Set((existing ?? []).map((r: any) => r?.query?.qs).filter(Boolean));
  const fresh = items.filter((i) => !seen.has(i.qs));
  if (!fresh.length) return NextResponse.json({ ok: true, saved: 0 });

  const rows = fresh.map((i) => {
    const { asset_type, district_id } = parse(i.qs);
    return { user_id: su.userId, asset_type, district_id, query: { qs: i.qs, label: i.label } };
  });
  const { error } = await sb.from("saved_searches").insert(rows);
  if (error) return NextResponse.json({ error: "Could not save." }, { status: 400 });
  return NextResponse.json({ ok: true, saved: rows.length });
}

// DELETE: remove one saved search by id.
export async function DELETE(req: NextRequest) {
  if (!allow("ss-del", req, 40)) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  const su = await me();
  if (!su) return NextResponse.json({ error: "Sign in to manage searches." }, { status: 401 });
  const sb = await getSupabaseServer();
  if (!sb) return NextResponse.json({ error: "Storage unavailable." }, { status: 503 });

  const body = (await req.json().catch(() => ({}))) as { id?: unknown };
  const id = typeof body.id === "string" && UUID.test(body.id) ? body.id : null;
  if (!id) return NextResponse.json({ error: "No search given." }, { status: 400 });
  const { error } = await sb.from("saved_searches").delete().eq("id", id);
  if (error) return NextResponse.json({ error: "Could not remove." }, { status: 400 });
  return NextResponse.json({ ok: true });
}
