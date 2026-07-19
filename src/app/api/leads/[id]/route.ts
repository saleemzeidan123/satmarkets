import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { allow } from "@/lib/ratelimit";
import { getSessionUser } from "@/lib/auth/session";

export const runtime = "nodejs";

// The owner marks where an enquiry stands: new, contacted, qualified, converted, or
// closed. This is what lets the "needs attention" queue and the enquiries badge
// actually go down. Only the status moves here; the enquirer's name, message and
// contact details are theirs and are never editable by the listing owner.
//
// The write uses the service role AFTER an ownership check in code, because leads has
// no owner-UPDATE RLS policy on purpose (the public inserts, the owner reads, SAT does
// everything). Granting a blanket owner UPDATE would also expose the contact columns;
// gating here keeps the change to the one field an owner may set.
const ALLOWED = new Set(["new", "contacted", "qualified", "converted", "closed_lost"]);

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!allow("lead-status", req, 40)) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  const su = await getSessionUser();
  if (!su || !su.accountId) return NextResponse.json({ error: "Sign in to update." }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { status?: unknown };
  const status = String(body.status ?? "");
  if (!ALLOWED.has(status)) return NextResponse.json({ error: "Unknown status." }, { status: 400 });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return NextResponse.json({ error: "Storage unavailable." }, { status: 503 });
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

  const { data: lead } = await admin.from("leads").select("id, listing_id").eq("id", params.id).maybeSingle();
  if (!lead) return NextResponse.json({ error: "Enquiry not found." }, { status: 404 });

  // Ownership: the lead must sit on a listing this account owns, unless the caller is
  // SAT (who may act on any lead). A lead on someone else's listing is Not found.
  if (!su.isSat) {
    const lid = (lead as { listing_id: string | null }).listing_id;
    if (!lid) return NextResponse.json({ error: "Enquiry not found." }, { status: 404 });
    const { data: listing } = await admin.from("listings").select("account_id").eq("id", lid).maybeSingle();
    if (!listing || (listing as { account_id: string }).account_id !== su.accountId) {
      return NextResponse.json({ error: "Enquiry not found." }, { status: 404 });
    }
  }

  const { error } = await admin.from("leads").update({ status }).eq("id", params.id);
  if (error) return NextResponse.json({ error: "Could not update the enquiry." }, { status: 400 });
  return NextResponse.json({ ok: true, status });
}
