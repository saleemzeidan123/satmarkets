import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { getSupabaseServer } from "@/lib/supabase/server";
import { allow } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The lister confirms or declines a viewing on their own listing.
//
// Until now there was no such route. A visitor booked a viewing, the row landed in the
// table, the visitor was told it had been sent, and the one person who had to act on it
// could not see it: `viewings` had a SELECT policy for SAT and for nobody else. The only
// surface that displayed them was /verify/viewings, SAT-only, linked from nowhere, and
// gated by a `?key=` in the query string.
//
// On a platform whose central promise is neutrality, the operator was the only party who
// could see which tenants wanted to view which buildings.
//
// Ownership is enforced by RLS, not by this route. We use the ordinary cookie-scoped
// client, so the UPDATE runs as the signed-in lister and the policy decides whether the
// row is theirs to touch. This route cannot grant what the database denies, which is the
// point: if the check lived only here, a direct PostgREST call would walk around it.
//
// The vocabulary is the database's. viewing_status is requested / confirmed / completed /
// no_show / cancelled. There is no "declined": a refusal IS a cancellation. And the
// policy forbids moving a viewing back to 'requested', because a status you can rewind is
// a status that can lie about what happened.
const ALLOWED = ["confirmed", "cancelled", "completed", "no_show"] as const;

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!allow("viewing-decision", req, 20)) {
    return NextResponse.json({ error: "rate_limited", code: "rate_limited" }, { status: 429 });
  }

  const su = await getSessionUser();
  if (!su?.accountId) {
    return NextResponse.json({ error: "Sign in to manage viewings.", code: "sign_in_to_manage_viewings" }, { status: 401 });
  }

  let body: { status?: string } = {};
  try { body = await req.json(); } catch {}
  const status = String(body.status ?? "");
  if (!(ALLOWED as readonly string[]).includes(status)) {
    // Finding 203. This spliced the database's own vocabulary into a sentence,
    // which does not translate and named none of the two words on the buttons the
    // lister actually pressed. `error` keeps the list because a log and an API
    // consumer are the readers who want it.
    return NextResponse.json(
      { error: `status must be one of: ${ALLOWED.join(", ")}`, code: "viewing_status_invalid" },
      { status: 400 }
    );
  }

  const sb = getSupabaseServer();
  if (!sb) return NextResponse.json({ error: "not_configured", code: "not_configured" }, { status: 503 });

  // Count the rows. An UPDATE that matches nothing is not an error in Postgres, so
  // without this a lister trying to decide someone else's viewing would be told it
  // worked. Zero rows means RLS refused, and a refusal is reported as a refusal.
  const { data, error } = await sb
    .from("viewings")
    .update({ status })
    .eq("id", params.id)
    .select("id, status");

  if (error) {
    console.error("[viewing-decision]", error);
    return NextResponse.json({ error: "Could not update the viewing.", code: "viewing_update_failed" }, { status: 500 });
  }
  if (!data || data.length === 0) {
    return NextResponse.json({ error: "That viewing is not on one of your listings.", code: "not_your_viewing" }, { status: 403 });
  }

  return NextResponse.json({ ok: true, id: data[0].id, status: data[0].status });
}
