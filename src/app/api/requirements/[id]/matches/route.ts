import { NextRequest, NextResponse } from "next/server";
import { allow } from "@/lib/ratelimit";
import { getSupabaseServer } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth/session";
import {
  matchListing,
  compareMatches,
  verdictLabel,
  SIZE_TOLERANCE_PCT,
  BUDGET_TOLERANCE_PCT,
  type MatchListing,
  type MatchRequirement,
} from "@/lib/matching";
import { listingTitle } from "@/lib/listingTitle";
import { placeName } from "@/lib/displayName";

// Which of MY listings answer this requirement, and why.
//
// The question is asked from a public requirement page, but the answer is
// private: it names the caller's own inventory. So this route reads exactly one
// account's listings, the caller's, derived from the session. Nothing in the
// request can widen that, and nothing in the response describes a listing the
// caller does not own.
//
// The permission bar is the same one that guards registering interest
// (SM-P0-002): anonymous is 401, an account-less user is 403, an unverified
// account is 403. That is deliberate rather than convenient. This endpoint is
// the step before a pitch, and a party who may not pitch has no business
// enumerating which briefs their space would answer.
//
// The response is the model's output, not a rewrite of it. Every result carries
// its dimensions, each dimension its state and its sentence in both languages,
// and every unknown its remedy. A caller cannot render a verdict from this
// payload without also having the reasons in hand, which is the property
// src/lib/matching.ts exists to hold.
//
// No figure here is generated. Sizes, rates and margins are arithmetic on facts
// the two records already state, and a fact neither record states comes back as
// unknown rather than as a number.
export const dynamic = "force-dynamic";

const MAX_RESULTS = 25;

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  if (!allow("req-matches", req, 30)) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }

  const su = await getSessionUser();
  if (!su) {
    return NextResponse.json({ error: "Sign in to see which of your listings answer this requirement." }, { status: 401 });
  }
  if (!su.accountId) {
    return NextResponse.json({ error: "Only verified owners and brokers can answer a requirement." }, { status: 403 });
  }

  const sb = getSupabaseServer();
  if (!sb) {
    return NextResponse.json({ error: "Storage unavailable. Please try again." }, { status: 503 });
  }

  const { data: acct } = await sb
    .from("accounts")
    .select("id,verification_status")
    .eq("id", su.accountId)
    .maybeSingle();
  if (!acct) {
    return NextResponse.json({ error: "Only verified owners and brokers can answer a requirement." }, { status: 403 });
  }
  if (acct.verification_status !== "verified") {
    return NextResponse.json({ error: "Your account is not verified yet." }, { status: 403 });
  }

  const { data: brief } = await sb
    .from("tenant_briefs")
    .select("id,ref_code,status,asset_type,deal_type,city,district_id,size_min_sqm,size_max_sqm,budget_sqm_max,timeline,must_haves,is_demo")
    .eq("id", params.id)
    .maybeSingle();
  if (!brief) {
    return NextResponse.json({ error: "Requirement not found." }, { status: 404 });
  }
  if (brief.status !== "open") {
    // A closed requirement is not answered. Saying so is more useful than
    // returning an empty list, which would read as "you have nothing for it".
    return NextResponse.json({ error: "This requirement is closed.", closed: true }, { status: 409 });
  }

  const [{ data: mine }, { data: districts }] = await Promise.all([
    sb
      .from("listings")
      .select("id,title_en,title_ar,status,asset_type,deal_type,district_id,area_sqm,asking_rent_sqm,sale_price,availability_confirmed_at,ad_permit_expires_at,is_demo")
      .eq("account_id", su.accountId),
    sb.from("districts").select("id,name_en,name_ar,city"),
  ]);

  const drows = (districts || []) as any[];
  const dcity = new Map(drows.map((x) => [x.id, x.city]));
  const drow = new Map(drows.map((x) => [x.id, x]));
  // PKG-NM1. A district with no name in one language falls back to its own
  // city, never to the other language's name.
  const dnameEn = new Map(drows.map((x) => [x.id, placeName(x, "en") || null]));
  const dnameAr = new Map(drows.map((x) => [x.id, placeName(x, "ar") || null]));

  const requirement: MatchRequirement = {
    asset_type: String(brief.asset_type ?? ""),
    deal_type: String(brief.deal_type ?? ""),
    // A brief states its own city. When it does not, the district it named
    // states one, and reading that is reading a record rather than guessing.
    city: brief.city ?? (brief.district_id ? dcity.get(brief.district_id) ?? null : null),
    district_id: brief.district_id ? String(brief.district_id) : null,
    district_label_en: brief.district_id ? dnameEn.get(brief.district_id) ?? null : null,
    district_label_ar: brief.district_id ? dnameAr.get(brief.district_id) ?? null : null,
    size_min_sqm: brief.size_min_sqm,
    size_max_sqm: brief.size_max_sqm,
    budget_sqm_max: brief.budget_sqm_max,
    timeline: brief.timeline,
    must_haves: Array.isArray(brief.must_haves) ? brief.must_haves.map(String) : null,
    is_demo: brief.is_demo === true,
  };

  const now = Date.now();
  const rows = ((mine || []) as any[]).map((l) => {
    const listing: MatchListing = {
      id: String(l.id),
      status: String(l.status ?? ""),
      asset_type: String(l.asset_type ?? ""),
      deal_type: String(l.deal_type ?? ""),
      // A listing has no city column. Its district record holds one.
      city: l.district_id ? (dcity.get(l.district_id) ?? null) : null,
      district_id: l.district_id ? String(l.district_id) : null,
      area_sqm: l.area_sqm,
      asking_rent_sqm: l.asking_rent_sqm,
      sale_price: l.sale_price,
      availability_confirmed_at: l.availability_confirmed_at,
      ad_permit_expires_at: l.ad_permit_expires_at,
      is_demo: l.is_demo === true,
    };
    return { row: l, listing, result: matchListing(requirement, listing, now) };
  });

  // Ineligible listings are counted, never described. A draft or an expired
  // advertisement is the caller's own record, so the count is theirs to see,
  // but putting it in the list would suggest it is offerable.
  const excluded = rows.filter((r) => !r.result.eligible);
  const matches = rows
    .filter((r) => r.result.eligible)
    .sort((a, b) => compareMatches(a.result, b.result))
    .slice(0, MAX_RESULTS)
    .map(({ row, result }) => ({
      listing_id: String(row.id),
      title_en: row.title_en ?? null,
      title_ar: row.title_ar ?? null,
      // PKG-NM1. The name in each language, resolved here through the one
      // function that owns the ladder, so the client cannot borrow the other
      // language's title when its own is blank. Each is laddered independently:
      // neither is derived from the other.
      name_en: listingTitle({ ...(row as any), districts: drow.get((row as any).district_id) ?? null }, "en"),
      name_ar: listingTitle({ ...(row as any), districts: drow.get((row as any).district_id) ?? null }, "ar"),
      verdict: result.verdict,
      verdict_en: verdictLabel(result.verdict, false),
      verdict_ar: verdictLabel(result.verdict, true),
      counts: { met: result.met, tolerance: result.tolerance, unknown: result.unknown, failed: result.failed },
      reasons: result.reasons,
    }));

  return NextResponse.json({
    requirement: { id: String(brief.id), ref: brief.ref_code ?? null },
    // The margins are published with the answer rather than buried in a page,
    // because a possible match means nothing without the size of the margin
    // that made it possible.
    tolerances: { size_pct: SIZE_TOLERANCE_PCT, budget_pct: BUDGET_TOLERANCE_PCT },
    matches,
    truncated: rows.filter((r) => r.result.eligible).length > MAX_RESULTS,
    excluded_count: excluded.length,
  });
}
