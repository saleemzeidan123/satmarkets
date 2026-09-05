import { NextRequest, NextResponse } from "next/server";
import { allow } from "@/lib/ratelimit";
import { getSupabaseServer } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth/session";

export const runtime = "nodejs";

// PKG-LISTING-CREATION-1B outcome A. Durable evidence state.
//
// Writes one append-only row to listing_evidence_marks: a lister (or SAT,
// assisting one) marking a guided-evidence item unavailable, with a real
// reason, or clearing that mark. This is what replaces guidedEvidence.ts's
// session-only Map, disclosed in that module's own header as a known gap
// since PKG-LISTING-CREATION-1A. See
// supabase/migrations/20260902_pkg1b_durable_evidence_state.sql for the
// table itself, why it is append-only rather than a mutable row, and why a
// mark here is never read as satisfying a publication requirement.
//
// The 8-character minimum on `reason` for marked_unavailable is checked here
// BEFORE the insert, not only relied on as the database's own
// listing_evidence_marks_reason_shape constraint: a caller gets a named,
// bilingual reason (evidence_reason_required) instead of a generic
// PostgREST constraint-violation message.
const ITEM_KINDS = new Set(["photo", "fact"]);
// Deliberately narrower than the database's own action_check constraint
// (20260905_pkg1b_evidence_mark_invalidation.sql adds a third value,
// invalidated_by_asset_change). That third action is system-authored, only
// ever appended by the asset-type-change trigger, and must never be
// something a caller can claim through this route: a lister asserting their
// own mark was "invalidated by an asset change" that never happened would
// be forging the one thing this table's audit trail exists to make honest.
const ACTIONS = new Set(["marked_unavailable", "cleared"]);
const MIN_REASON_LENGTH = 8;

export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  if (!allow("listing-evidence-marks", req, 40)) return NextResponse.json({ error: "rate_limited", code: "rate_limited" }, { status: 429 });

  const su = await getSessionUser();
  if (!su || !su.userId || !su.accountId) return NextResponse.json({ error: "Sign in to edit this listing.", code: "sign_in_to_edit_media" }, { status: 401 });

  const sb = await getSupabaseServer();
  if (!sb) return NextResponse.json({ error: "Storage unavailable.", code: "storage_unavailable" }, { status: 503 });

  const listingId = params.id;
  const { data: listing } = await sb.from("listings").select("id, account_id").eq("id", listingId).single();
  if (!listing) return NextResponse.json({ error: "Listing not found.", code: "listing_not_found" }, { status: 404 });
  // Owner writes on their own listing, or SAT writes on any listing (assisting
  // a lister, or correcting a record), matching the table's own RLS policy.
  if (!su.isSat && (listing as { account_id: string }).account_id !== su.accountId) {
    return NextResponse.json({ error: "This is not your listing.", code: "not_your_listing" }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    item_kind?: unknown; item_key?: unknown; action?: unknown; reason?: unknown;
  };
  const itemKind = typeof body.item_kind === "string" ? body.item_kind : "";
  const itemKey = typeof body.item_key === "string" ? body.item_key.trim() : "";
  const action = typeof body.action === "string" ? body.action : "";
  if (!ITEM_KINDS.has(itemKind) || !itemKey || itemKey.length > 120 || !ACTIONS.has(action)) {
    return NextResponse.json({ error: "That request could not be read. Reload the page and try again.", code: "invalid_request_body" }, { status: 400 });
  }

  // Forbidden for cleared (nothing to explain about no longer asserting
  // something), required and length-checked for marked_unavailable: the
  // same minimum-content discipline verification_events already applies to
  // its own free-text `basis` column.
  let reason: string | null = null;
  if (action === "marked_unavailable") {
    reason = typeof body.reason === "string" ? body.reason.trim() : "";
    if (reason.length < MIN_REASON_LENGTH) {
      return NextResponse.json({ error: "Say why this is unavailable, in a few words.", code: "evidence_reason_required" }, { status: 400 });
    }
  }

  const { error } = await sb.from("listing_evidence_marks").insert({
    listing_id: listingId,
    item_kind: itemKind,
    item_key: itemKey,
    action,
    reason,
    // The caller's own identity, exactly what the table's RLS insert policy
    // checks (actor_user_id = app_user_id(), actor_account_id =
    // app_account_id()): never the listing's account when the caller is SAT
    // assisting on someone else's listing.
    actor_user_id: su.userId,
    actor_account_id: su.accountId,
  });
  if (error) return NextResponse.json({ error: "That could not be saved. Try again.", code: "evidence_mark_failed" }, { status: 400 });

  return NextResponse.json({ ok: true });
}
