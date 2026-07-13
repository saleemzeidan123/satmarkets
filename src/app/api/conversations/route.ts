import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { getSupabaseServer } from "@/lib/supabase/server";
import { allow } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Open (or continue) a conversation about a listing.
//
// "Message on SAT" was offered as a contact channel on every listing and led
// nowhere: there was no conversations table, no messages table, and the inbox was a
// dictionary file. Worse, the message box faked a reply from the owner 900ms after
// you sent one. The platform was inventing a counterparty.
//
// Two rules enforced here, and both again at the database:
//   1. You must be signed in. An anonymous enquiry is a lead, not a conversation:
//      there is nobody to reply to, and the thread would have no second party.
//   2. The listing must actually be on the market. You cannot open a thread about an
//      advertisement that is not being advertised.
export async function POST(req: NextRequest) {
  if (!allow("conversations", req, 20)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const su = await getSessionUser();
  if (!su) {
    return NextResponse.json(
      { error: "sign_in_required", message: "Sign in to message the lister. Or contact them directly by phone or email." },
      { status: 401 }
    );
  }

  const sb = getSupabaseServer();
  if (!sb) return NextResponse.json({ error: "not_configured" }, { status: 503 });

  let body: { listing_id?: string; message?: string } = {};
  try { body = await req.json(); } catch {}
  if (!body.listing_id) return NextResponse.json({ error: "listing_id required" }, { status: 400 });

  const { data: listing } = await sb
    .from("listings")
    .select("id, account_id, status")
    .eq("id", body.listing_id)
    .maybeSingle();

  // The read policy already hides unpublished and permit-expired listings, so a null
  // here means "not on the market", whatever the reason. Same answer either way.
  if (!listing) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const l = listing as any;

  if (l.account_id === su.accountId) {
    return NextResponse.json(
      { error: "own_listing", message: "This is your own listing." },
      { status: 409 }
    );
  }

  // One thread per person per listing. A second enquiry continues the conversation
  // rather than starting a rival one, so the owner sees one history, not five.
  const { data: existing } = await sb
    .from("conversations")
    .select("id")
    .eq("listing_id", l.id)
    .eq("enquirer_user_id", su.userId)
    .maybeSingle();

  let conversationId = (existing as any)?.id as string | undefined;

  if (!conversationId) {
    const { data: created, error } = await sb
      .from("conversations")
      .insert({
        listing_id: l.id,
        owner_account_id: l.account_id,
        enquirer_user_id: su.userId,
      })
      .select("id")
      .single();

    if (error || !created) {
      console.error("[conversations]", error);
      return NextResponse.json({ error: "Could not open the conversation." }, { status: 500 });
    }
    conversationId = (created as any).id;
  }

  const first = (body.message ?? "").trim();
  if (first) {
    const { error } = await sb.from("messages").insert({
      conversation_id: conversationId,
      sender_user_id: su.userId,
      sender_side: "enquirer",
      body: first.slice(0, 4000),
    });
    if (error) {
      console.error("[conversations:first-message]", error);
      // The thread exists; the message did not. Say so rather than implying it sent.
      return NextResponse.json(
        { ok: true, conversation_id: conversationId, sent: false, error: "Message not sent." },
        { status: 207 }
      );
    }
  }

  return NextResponse.json({ ok: true, conversation_id: conversationId, sent: !!first });
}
