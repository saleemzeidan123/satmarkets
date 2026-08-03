// src/app/api/listings/[id]/translate/route.ts
//
// Translate a single listing's English fields into professional Saudi MSA Arabic
// and store the result, with per-field source hashes and a review status.
//
// Auth: uses the project's standard SSR server client (cookie-based), so the
// caller's own RLS permissions apply. A listing owner publishing/editing their
// own listing can therefore trigger this. No service-role key required.
//
// POST /api/listings/<id>/translate        -> translate stale/empty fields
// POST /api/listings/<id>/translate { force: true, tier: "quality" }

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { translateToArabic, hashSource, type Tier } from "@/lib/translate/translateToArabic";
import { allow } from "@/lib/ratelimit";
import { getSessionUser } from "@/lib/auth/session";
import { unsourcedFigure } from "@/lib/market/guard";

export const runtime = "nodejs";

async function sbServer() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set() {},
        remove() {},
      },
    },
  );
}

export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  if (!allow("translate", req, 10)) return NextResponse.json({ error: "Rate limited" }, { status: 429 });

  // YOU MUST BE SIGNED IN, AND IT IS CHECKED BEFORE WE SPEND ANYTHING.
  //
  // This route was public. Anyone on the internet could POST to it with any published
  // listing id and cause two calls to a paid translation model, over and over, up to
  // the rate limit, from as many IPs as they cared to use. Nobody had to log in to
  // spend our money.
  //
  // Worse, it then LIED. The update runs under the caller's own RLS, and an anonymous
  // caller matches no row in "owner manage own listings", so the UPDATE touched zero
  // rows -- and Postgres does not call that an error. `upErr` was null. So the route
  // answered {"status":"translated"} having translated nothing and written nothing.
  // Verified live: it returned "translated", and title_ar was unchanged.
  //
  // RLS was doing its job the whole time; it stopped the write. What it cannot do is
  // stop us paying a model before we ever get to the write. An authorisation check
  // that happens after the expensive part is not an authorisation check.
  const su = await getSessionUser();
  if (!su) {
    return NextResponse.json(
      { error: "Sign in to translate a listing." },
      { status: 401 }
    );
  }

  const id = params.id;
  let body: { force?: boolean; tier?: Tier } = {};
  try {
    body = await req.json();
  } catch {
    // empty body is fine
  }
  const force = body.force === true;
  const tier: Tier = body.tier === "quality" ? "quality" : "fast";

  const sb = await sbServer();

  const { data: listing, error } = await sb
    .from("listings")
    .select("id, title_en, description_en, title_ar_src_hash, description_ar_src_hash")
    .eq("id", id)
    .single();

  if (error || !listing) {
    return NextResponse.json({ error: "Listing not found or not accessible." }, { status: 404 });
  }

  const update: Record<string, unknown> = {};
  let model = "";
  let touched = false;

  // ADV-3A.1. A REFUSAL IS ANSWERED, NOT RECORDED AS A TRANSLATION.
  //
  // Below, every successful field sets `touched`, and `touched` is what causes
  // `ar_translation_status = 'machine'` to be written. When the translator could
  // not run, no field is set, so no status is written, and the route says why in
  // its own response. The previous shape threw out of `callTranslator` and the
  // failure surfaced as a 500; worse, any future partial path would have left a
  // row claiming a machine translation that never happened.
  const unavailable = (r: { reason: string; detail: string }) =>
    NextResponse.json(
      {
        status: "unavailable",
        id,
        reason: r.reason,
        message:
          r.reason === "agreement_required"
            ? "Automatic Arabic translation is unavailable until the enterprise AI agreement is recorded. The English copy is unchanged and no Arabic status was written."
            : "Automatic Arabic translation is unavailable right now. The English copy is unchanged and no Arabic status was written.",
        detail: r.detail,
      },
      { status: 503 }
    );

  // Title
  if (listing.title_en && (force || hashSource(listing.title_en) !== listing.title_ar_src_hash)) {
    const r = await translateToArabic(listing.title_en, { tier });
    if (!r.ok) return unavailable(r);
    if (unsourcedFigure(r.arabic, listing.title_en)) {
      console.warn(`[translate] unsourced figure in title of ${id}; keeping source`);
    } else {
      update.title_ar = r.arabic;
      update.title_ar_src_hash = r.srcHash;
      model = r.model;
      touched = true;
    }
  }

  // Description (longer copy; default to the chosen tier)
  if (
    listing.description_en &&
    (force || hashSource(listing.description_en) !== listing.description_ar_src_hash)
  ) {
    const r = await translateToArabic(listing.description_en, { tier });
    if (!r.ok) return unavailable(r);
    if (unsourcedFigure(r.arabic, listing.description_en)) {
      console.warn(`[translate] unsourced figure in description of ${id}; keeping source`);
    } else {
      update.description_ar = r.arabic;
      update.description_ar_src_hash = r.srcHash;
      model = r.model;
      touched = true;
    }
  }

  if (!touched) {
    return NextResponse.json({ status: "up_to_date", id });
  }

  update.ar_translation_status = "machine";
  update.ar_translated_at = new Date().toISOString();
  update.ar_translation_model = model;

  // Count the rows. An UPDATE that matches nothing is not an error in Postgres, it is
  // simply an update of nothing, so `upErr` stays null and the old code called that a
  // success. If RLS declined to let this caller touch this listing, we say so.
  const { data: updated, error: upErr } = await sb
    .from("listings")
    .update(update)
    .eq("id", id)
    .select("id");

  if (upErr) {
    return NextResponse.json({ error: upErr.message }, { status: 500 });
  }
  if (!updated || updated.length === 0) {
    return NextResponse.json(
      { error: "You cannot edit this listing." },
      { status: 403 }
    );
  }

  return NextResponse.json({ status: "translated", id, model, fields: Object.keys(update) });
}
