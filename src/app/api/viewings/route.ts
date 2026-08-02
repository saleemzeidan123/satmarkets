import { NextRequest, NextResponse } from "next/server";
import { allow } from "@/lib/ratelimit";
import { getSupabaseServer } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth/session";

// Public viewing requests. A request is only ever created as status
// "requested"; confirmation stays a lister action, so nothing is promised
// that a person has not agreed to.
//
// Asking to see a space does not require an account, and it should not: a
// requirement to sign in before you may ask a question empties the funnel and
// tells the market nothing it did not already know. So the anonymous path is
// the default and stays open.
//
// But when the booker IS signed in, the row records who they are. requested_by
// has existed on this table since it was created and was never written, which
// meant a signed-in occupier's booking filed itself anonymously: the lister
// decided it, the status column recorded the outcome, and the one person
// waiting on that outcome had no row they could read. The identity is taken
// from the session and never from the body, for the same reason party_type is
// derived in the requirement interest route. A person may file a booking
// anonymously or in their own name, and the RLS check now enforces that too,
// so the guarantee does not depend on this route being the only writer.
//
// Finding 203. Four of the seven refusals below were bare tokens rather than
// sentences: "invalid listing", "invalid name", "invalid email", "invalid slot".
// Nothing rendered them, which is why they survived, and the client showed one
// sentence for all of them instead. They are stated as codes now, and the words
// left in `error` are still the log's words rather than a reader's.
export async function POST(req: NextRequest) {
  if (!allow("viewings", req, 6)) return NextResponse.json({ ok: false, error: "Rate limited", code: "rate_limited" }, { status: 429 });
  let body: { listing_id?: string; scheduled_at?: string; contact_name?: string; contact_email?: string; note?: string; qualification?: Record<string, unknown> } = {};
  try { body = await req.json(); } catch {}
  const id = String(body.listing_id ?? "");
  if (!/^[0-9a-f-]{36}$/.test(id)) return NextResponse.json({ error: "invalid listing", code: "listing_not_identified" }, { status: 400 });
  const name = String(body.contact_name ?? "").trim();
  const email = String(body.contact_email ?? "").trim();
  if (name.length < 2 || name.length > 120) return NextResponse.json({ error: "invalid name", code: "contact_name_invalid" }, { status: 400 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 200) return NextResponse.json({ error: "invalid email", code: "work_email_invalid" }, { status: 400 });
  const when = new Date(String(body.scheduled_at ?? ""));
  const now = Date.now();
  if (isNaN(when.getTime()) || when.getTime() < now || when.getTime() > now + 21 * 24 * 3600 * 1000) {
    return NextResponse.json({ error: "invalid slot", code: "viewing_slot_invalid" }, { status: 400 });
  }
  const supabase = getSupabaseServer();
  // This answers ok for a request it did not store, which is a defect and is
  // deliberately not repaired here. It belongs to the class SM-P0-005 closed on
  // the requirements route, the signup route still carries the identical line,
  // and repairing one of a matched pair inside a translation package leaves the
  // other looking correct by comparison. It is recorded rather than half fixed.
  if (!supabase) return NextResponse.json({ ok: true, note: "supabase not configured (request not stored)" });

  // Null for an anonymous booker, which is the ordinary case and stays ordinary.
  const su = await getSessionUser();
  const requested_by = su?.userId ?? null;

  const { data, error } = await supabase
    .from("viewings")
    .insert({
      listing_id: id,
      scheduled_at: when.toISOString(),
      status: "requested",
      contact_name: name.slice(0, 120),
      contact_email: email.slice(0, 200),
      note: body.note ? String(body.note).slice(0, 400) : null,
      qualification: body.qualification && typeof body.qualification === "object" && JSON.stringify(body.qualification).length < 2000 ? body.qualification : null,
      requested_by,
    })
    .select("id")
    .single();
  // Finding 203. This returned PostgREST's own sentence to the browser, on a
  // route that takes no session and refuses nobody for lacking one, so the
  // database described its own schema to a member of the public. The real
  // sentence goes to the log, which is where finding 22 and slice C put it.
  if (error) {
    console.error("viewing insert failed:", error.message);
    return NextResponse.json({ error: "Could not store the viewing request.", code: "viewing_not_requested" }, { status: 500 });
  }
  // `tracked` says whether this booking is one the requester can come back to.
  // A caller that renders "we will email you" for an anonymous booking and
  // "this is in your viewings" for a signed-in one needs to know which it made,
  // and inferring it from the presence of a session on the client is exactly
  // the kind of guess that goes wrong.
  return NextResponse.json({ ok: true, id: data?.id ?? null, tracked: requested_by !== null });
}
