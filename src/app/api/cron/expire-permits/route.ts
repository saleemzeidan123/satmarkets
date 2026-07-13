import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { authed } from "@/lib/adminauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Withdraws advertisements whose licence has lapsed.
//
// Read this before you rely on it: THIS IS NOT THE COMPLIANCE MECHANISM.
//
// The compliance guarantee lives in the database read policy, which requires an
// unexpired advertising licence in order to select a published listing at all. An
// expired advertisement cannot be served, whether or not this route ever runs. If
// Vercel's scheduler dies tonight, the platform is still compliant tomorrow morning.
//
// What this route does is housekeeping: it moves lapsed listings out of `published`
// so the owner's dashboard tells the truth, and it writes a takedown entry to
// listing_verification_events so there is an audit trail of when each advertisement
// came down and why.
//
// The distinction matters. A cron job is a promise. A read policy is a fact.
//
// Cadence: DAILY, not hourly. Not a preference, a plan limit. Vercel's Hobby plan
// rejects any cron that would run more than once a day, and it does not reject it
// quietly: it fails the whole deployment. An hourly schedule here once left two
// commits sitting on main, unbuilt, while the site served the previous build.
// Daily is safe here precisely because of the paragraph above: the lapsed listing
// is already unservable the moment its licence expires. This job only tidies the
// row and writes the audit entry, and a few hours' delay in doing so costs nothing.
// If the cadence ever needs to be hourly, that is a Pro-plan change, not a code one.
async function run(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ ok: false, error: "not_configured" }, { status: 503 });
  if (!authed(req, secret)) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return NextResponse.json({ ok: false, error: "no_service_client" }, { status: 503 });

  const sb = createClient(url, key, { auth: { persistSession: false } });

  const { data: taken, error } = await sb.rpc("expire_lapsed_listings");
  if (error) {
    console.error("[cron-expire-permits]", error);
    return NextResponse.json({ ok: false, error: "takedown_failed" }, { status: 500 });
  }

  // Who to warn, and how urgently. Renewing the licence is the lister's job.
  // Taking the advertisement down is ours, and we have already done it above.
  const { data: lapsing } = await sb.rpc("permits_lapsing_soon");

  return NextResponse.json({
    ok: true,
    withdrawn: (taken ?? []).length,
    listings: taken ?? [],
    lapsing_soon: lapsing ?? [],
  });
}

// Vercel's scheduler issues a GET, with Authorization: Bearer $CRON_SECRET.
// The first version of this route only did the work on POST, so the cron would
// have called it every hour, been handed a cheerful health probe, and withdrawn
// nothing. A scheduled job that reports success without doing anything is worse
// than no job at all.
//
// So: an authenticated GET runs the takedown. An unauthenticated GET is the probe,
// and it leaks nothing.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && authed(req, secret)) return run(req);

  return NextResponse.json({
    ok: true,
    endpoint: "expire-permits",
    configured: !!process.env.CRON_SECRET && !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    note:
      "Housekeeping only. Expired advertisements are already unservable at the database read policy; this route archives them and writes the takedown trail.",
  });
}

// Kept so the takedown can also be triggered by hand.
export async function POST(req: NextRequest) {
  return run(req);
}
