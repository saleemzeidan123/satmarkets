import { NextRequest, NextResponse } from "next/server";
import { allow } from "@/lib/ratelimit";
import { getSupabaseServer } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth/session";

// SM-P0-002. Registering interest in a requirement is a TRUST claim: the board
// renders it as "a verified owner" or "a SAT broker" has space for this. So the
// identity is derived entirely server-side from the authenticated session and
// the account record. Nothing about WHO you are may come from the request body:
// party_type, party_name and org are ignored if sent. Anonymous is 401,
// unverified is 403, and every row records the acting user and account.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!allow("interest", req, 8)) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }

  const su = await getSessionUser();
  if (!su) {
    return NextResponse.json({ error: "Sign in to register interest." }, { status: 401 });
  }
  if (!su.accountId) {
    // Occupiers have no owner/broker account. They post requirements, not answer them.
    return NextResponse.json({ error: "Only verified owners and brokers can register interest." }, { status: 403 });
  }

  const sb = getSupabaseServer();
  if (!sb) {
    // Never report success when nothing can be stored.
    return NextResponse.json({ error: "Storage unavailable. Please try again." }, { status: 503 });
  }

  const { data: acct } = await sb
    .from("accounts")
    .select("id,type,legal_name,name_en,verification_status")
    .eq("id", su.accountId)
    .maybeSingle();
  if (!acct) {
    return NextResponse.json({ error: "Only verified owners and brokers can register interest." }, { status: 403 });
  }
  if (acct.verification_status !== "verified") {
    return NextResponse.json({ error: "Your account is not verified yet." }, { status: 403 });
  }

  // Party type comes from the account type, never the request. An owner account
  // cannot submit as a broker, and a broker/SAT account cannot submit as an owner.
  const party_type = acct.type === "sat" ? "broker" : "landlord";
  const party_name = acct.name_en || acct.legal_name || null;
  const org = acct.legal_name || null;

  const body = (await req.json().catch(() => ({}))) as { message?: unknown; listing_id?: unknown };
  const message = typeof body.message === "string" && body.message.trim() ? body.message.trim().slice(0, 2000) : null;
  const listing_id =
    typeof body.listing_id === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.listing_id)
      ? body.listing_id
      : null;

  const { data, error } = await sb
    .from("requirement_interests")
    .insert({
      brief_id: params.id,
      party_type,
      party_name,
      org,
      message,
      listing_id,
      user_id: su.userId,
      account_id: acct.id,
    })
    .select("id")
    .single();

  if (error) {
    console.error("requirement_interest insert failed:", error.message);
    return NextResponse.json({ error: "Could not register interest. Please try again." }, { status: 500 });
  }
  return NextResponse.json({ ok: true, id: data?.id ?? null, party_type });
}
