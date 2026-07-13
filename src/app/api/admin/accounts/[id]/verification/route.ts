import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { getSupabaseServer } from "@/lib/supabase/server";

// P0-6. Every listing wears a "VERIFIED OWNER" badge and /neutrality promises that
// badge "comes from an authoritative record match or a human reviewer". There was no
// write path through which any reviewer could ever have acted. This is it.
//
// Three rules, all enforced at the database and re-checked here:
//   1. Only SAT may decide. Anyone else gets a 404, not a 403: the endpoint does not
//      advertise its own existence.
//   2. The actor is derived from the session, never accepted from the client, so a
//      decision cannot be pinned on someone who did not make it.
//   3. A decision requires a stated basis. A verification with no evidence behind it
//      is a rubber stamp, and the whole point of the badge is that it is not one.
//
// The ledger (public.verification_events) is append-only: no UPDATE and no DELETE
// policy exists, so once written a decision cannot be rewritten or erased, by SAT or
// by anyone. The badge always traces back to a person, a moment and a reason.

const ALLOWED = new Set(["unverified", "pending", "verified", "rejected"]);

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const su = await getSessionUser();
  if (!su || !su.isSat || !su.userId) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  const sb = getSupabaseServer();
  if (!sb) return NextResponse.json({ error: "Not configured." }, { status: 500 });

  const body = await req.json().catch(() => ({} as any));
  const to = String(body?.status ?? "");
  const basis = String(body?.basis ?? "").trim();

  if (!ALLOWED.has(to)) {
    return NextResponse.json({ error: "Unknown verification status." }, { status: 400 });
  }
  // Mirrors the DB check constraint. A decision without a reason is not a decision.
  if (basis.length < 8) {
    return NextResponse.json(
      { error: "State the basis for this decision (at least a sentence): what did you check, and against what?" },
      { status: 400 }
    );
  }

  const { data: acct, error: readErr } = await sb
    .from("accounts")
    .select("id,verification_status")
    .eq("id", params.id)
    .maybeSingle();
  if (readErr || !acct) return NextResponse.json({ error: "Account not found." }, { status: 404 });

  const from = (acct as any).verification_status as string;

  // Write the ledger entry FIRST. If the audit row fails, the status must not move:
  // a badge with no traceable decision behind it is exactly what we are fixing.
  const { error: logErr } = await sb.from("verification_events").insert({
    account_id: params.id,
    from_status: from,
    to_status: to,
    actor_user_id: su.userId,
    actor_email: su.email,
    basis,
  });
  if (logErr) {
    return NextResponse.json({ error: "Could not record the decision, so nothing was changed." }, { status: 500 });
  }

  const { error: updErr } = await sb
    .from("accounts")
    .update({ verification_status: to, updated_at: new Date().toISOString() })
    .eq("id", params.id);
  if (updErr) {
    return NextResponse.json({ error: "Decision recorded but the status did not change. Try again." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, from, to });
}
