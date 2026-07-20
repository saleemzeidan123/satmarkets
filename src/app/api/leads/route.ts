import { NextRequest, NextResponse } from "next/server";
import { allow } from "@/lib/ratelimit";
import { getSupabaseServer } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth/session";

// One path off a listing: direct_contact. It goes to the lister.
//
// There used to be a second, "representation", where SAT Real Estate would act for the
// tenant or buyer under a mandate. It is gone. On a platform whose whole proposition is
// neutrality, that path sat on a broker's own listing and offered the visitor a
// different agent: the platform's. You cannot run the market and compete in it.
//
// The value stays in the leads.path enum so existing rows survive, but nothing new can
// be created with it: refused here, AND refused by the RLS policy, so a direct call to
// PostgREST cannot make one either. Never enforce a rule in one place only.
//
// And we never report success for something we did not store: if storage is unavailable
// this fails loudly (503), it does not return ok.
export async function POST(req: NextRequest) {
  if (!allow("leads", req, 8)) return NextResponse.json({ error: "Rate limited" }, { status: 429 });

  const body = (await req.json().catch(() => ({}))) as {
    listing_id?: string;
    path?: "direct_contact";
    contact_name?: string;
    contact_email?: string;
    contact_phone?: string;
    message?: string;
    consent?: boolean;
  };

  // ONE PATH. SAT Markets does not act for anyone.
  //
  // "representation" used to be accepted here, and a button on every listing offered it.
  // On a platform whose whole proposition is neutrality, that button sat on a broker's
  // own listing and offered the visitor a different agent: the platform's. You cannot
  // run the market and compete in it.
  //
  // The value stays in the leads.path enum so the existing rows survive, but it is dead
  // on arrival: refused here, and refused by the RLS policy, so a direct call to
  // PostgREST cannot create one either. Nothing is enforced in one place only.
  if (body.path !== "direct_contact") {
    return NextResponse.json(
      { error: "SAT Markets does not act for buyers or tenants. Contact the lister directly." },
      { status: 400 }
    );
  }

  // Contact identity is required on BOTH paths. A lead nobody can reply to is not a lead.
  const name = String(body.contact_name ?? "").trim();
  const email = String(body.contact_email ?? "").trim();
  if (name.length < 2 || name.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 200) {
    return NextResponse.json({ error: "A name and a valid work email are required." }, { status: 400 });
  }

  const supabase = getSupabaseServer();
  if (!supabase) {
    return NextResponse.json({ error: "Storage unavailable. Please try again." }, { status: 503 });
  }

  // NO .select() AFTER THE INSERT. Not a style preference. It is the fix.
  //
  // This route runs on the ANON key, so an enquiry from a member of the public inserts
  // as role `anon`. The leads table is deliberately WRITE-ONLY for the public: anyone
  // may put an enquiry in, and nobody but the owner of the listing or SAT may take one
  // out. There is therefore no SELECT policy for anon, on purpose, so a stranger cannot
  // read back other people's enquiries or enumerate who is interested in what.
  //
  // `.select("id").single()` asks PostgREST to RETURN the inserted row, which requires
  // exactly the SELECT permission we have deliberately withheld. So the row was written,
  // the read-back came up empty, .single() turned that into an error, and this route
  // answered 500: "Could not save the enquiry." The enquiry had been saved.
  //
  // Nothing reads the id. An insert with no error IS the success.
  // Attribute the enquiry to the signed-in occupier who filed it, so it shows in
  // their own enquiry history. Best effort and never trusted from the body: it is
  // read from the session, and stays null for anonymous enquirers.
  const su = await getSessionUser();

  const { error } = await supabase.from("leads").insert({
    listing_id: body.listing_id ?? null,
    path: body.path,
    contact_name: name.slice(0, 120),
    contact_email: email.slice(0, 200),
    contact_phone: body.contact_phone ? String(body.contact_phone).slice(0, 40) : null,
    message: body.message ? String(body.message).slice(0, 2000) : null,
    created_by_user_id: su?.userId ?? null,
    consent: false,
    consent_at: null,
  });

  if (error) {
    console.error("leads insert failed:", error.message);
    return NextResponse.json({ error: "Could not save the enquiry. Please try again." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
