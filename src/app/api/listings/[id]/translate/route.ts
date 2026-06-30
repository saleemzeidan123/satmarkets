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

export const runtime = "nodejs";

function sbServer() {
  const cookieStore = cookies();
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

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!allow("translate", req, 10)) return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  const id = params.id;
  let body: { force?: boolean; tier?: Tier } = {};
  try {
    body = await req.json();
  } catch {
    // empty body is fine
  }
  const force = body.force === true;
  const tier: Tier = body.tier === "quality" ? "quality" : "fast";

  const sb = sbServer();

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

  // Title
  if (listing.title_en && (force || hashSource(listing.title_en) !== listing.title_ar_src_hash)) {
    const r = await translateToArabic(listing.title_en, { tier });
    update.title_ar = r.arabic;
    update.title_ar_src_hash = r.srcHash;
    model = r.model;
    touched = true;
  }

  // Description (longer copy; default to the chosen tier)
  if (
    listing.description_en &&
    (force || hashSource(listing.description_en) !== listing.description_ar_src_hash)
  ) {
    const r = await translateToArabic(listing.description_en, { tier });
    update.description_ar = r.arabic;
    update.description_ar_src_hash = r.srcHash;
    model = r.model;
    touched = true;
  }

  if (!touched) {
    return NextResponse.json({ status: "up_to_date", id });
  }

  update.ar_translation_status = "machine";
  update.ar_translated_at = new Date().toISOString();
  update.ar_translation_model = model;

  const { error: upErr } = await sb.from("listings").update(update).eq("id", id);
  if (upErr) {
    return NextResponse.json({ error: upErr.message }, { status: 500 });
  }

  return NextResponse.json({ status: "translated", id, model, fields: Object.keys(update) });
}
