import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth/session";
import { placeName } from "@/lib/displayName";

// GET one requirement + interest in it.
//
// SM-P0-003 / OD-003. This route used to return every respondent's party_name,
// org and message to any anonymous caller. Registering interest in a brief is
// commercially sensitive (it says who is hunting for what, and what they hold),
// and the names and messages are personal data under the PDPL. It was readable
// by anyone who opened the URL.
//
// Now: the public sees an anonymous aggregate ("3 parties interested", split by
// owner vs broker). Identities, organisations and messages are returned only to
// the brief owner, or to SAT staff.
//
// NOTE (deliberate, do not "clean up"): this closes the API half only. The
// requirement_interests table still carries an RLS policy of SELECT USING (true),
// so the same rows remain readable straight from the Supabase REST endpoint with
// the public anon key until 20260712_rls_tighten.sql is applied. This route is
// defence in depth, not the fix.
export async function GET(_req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const sb = getSupabaseServer();
  if (!sb) return NextResponse.json({ error: "Storage unavailable. Please try again." }, { status: 503 });

  if (!/^[0-9a-f-]{36}$/i.test(params.id)) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const { data: r } = await sb.from("requirements_public").select("*").eq("id", params.id).single();
  if (!r) return NextResponse.json({ error: "Not found." }, { status: 404 });

  // Who is asking, and do they own this brief?
  const su = await getSessionUser();
  let canSeeIdentities = false;
  if (su) {
    // Neutrality commitment 03 (/neutrality): "SAT's brokerage arm gets no earlier
    // or privileged access to leads, requirements, or index data than any other
    // verified participant."
    //
    // SAT used to get canSeeIdentities here purely for being SAT, which meant the
    // operator (who also runs a licensed brokerage) could read every competing
    // owner's name, org and verbatim pitch on every open requirement, and reply to
    // them. That is the precise data advantage the published commitment forbids, so
    // it is gone. Only the occupier who created the brief sees who is interested;
    // they are the one choosing who to talk to. Everyone else, SAT included, sees
    // the aggregate count and their own entry.
    //
    // If SAT ever needs identities for moderation, that belongs in the gated /admin
    // console with an audit trail, not on the product page next to a Reply button.
    if (su.userId) {
      const { data: owner } = await sb
        .from("tenant_briefs")
        .select("created_by")
        .eq("id", params.id)
        .single();
      canSeeIdentities = !!owner && owner.created_by === su.userId;
    }
  }

  const { data: ints } = await sb
    .from("requirement_interests")
    .select("id, party_type, party_name, org, message, created_at, account_id")
    .eq("brief_id", params.id)
    .order("created_at", { ascending: false });
  const rows = (ints ?? []) as any[];

  // Arabic parity: the client cannot localize a district it never receives, so
  // send both names and let the locale pick.
  let district = r.city ?? "";
  let districtAr = r.city ?? "";
  if (r.district_id) {
    const { data: d } = await sb.from("districts").select("name_en, name_ar, city").eq("id", r.district_id).single();
    // PKG-NM1. Each language is read on its own. A district we hold in one
    // language only widens to its city in the other, and the requirement's own
    // city stays the last resort.
    if (d) {
      district = placeName(d, "en") || district;
      districtAr = placeName(d, "ar") || districtAr;
    }
  }

  const requirement = {
    id: r.id,
    ref: r.ref_code,
    title: r.title,
    titleAr: r.title_ar ?? null,
    asset: r.asset_type,
    deal: r.deal_type,
    district,
    districtAr,
    city: r.city,
    sizeMin: r.size_min_sqm,
    sizeMax: r.size_max_sqm,
    budget: r.budget_sqm_max,
    timeline: r.timeline,
    mustHaves: r.must_haves ?? [],
    createdAt: r.created_at,
  };

  // Aggregate is safe for everyone: a count carries no identity.
  const summary = {
    total: rows.length,
    owners: rows.filter((i) => i.party_type !== "broker").length,
    brokers: rows.filter((i) => i.party_type === "broker").length,
  };

  if (!canSeeIdentities) {
    // The responder still gets to see their own entry, so the UI can say
    // "you have already registered interest" without exposing anyone else.
    const mine = su?.accountId
      ? rows
          .filter((i) => i.account_id && i.account_id === su.accountId)
          .map((i) => ({ id: i.id, type: i.party_type, name: i.party_name, org: i.org, message: i.message, createdAt: i.created_at, mine: true }))
      : [];
    return NextResponse.json({ requirement, summary, interests: mine, identitiesVisible: false });
  }

  return NextResponse.json({
    requirement,
    summary,
    identitiesVisible: true,
    interests: rows.map((i) => ({
      id: i.id,
      type: i.party_type,
      name: i.party_name,
      org: i.org,
      message: i.message,
      createdAt: i.created_at,
      mine: !!(su?.accountId && i.account_id === su.accountId),
    })),
  });
}
