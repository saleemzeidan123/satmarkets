// src/app/api/listings/[id]/translate-preview/route.ts
//
// Read-only verification endpoint: translate a listing's English fields to
// Arabic and RETURN them, without writing to the database. Lets us confirm the
// engine + ANTHROPIC_API_KEY work end to end. Published listings are readable
// by anon under RLS, so no auth is needed for a dry-run preview.
//
// GET /api/listings/<id>/translate-preview?tier=fast|quality

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { translateToArabic, type Tier } from "@/lib/translate/translateToArabic";

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

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const tier: Tier = req.nextUrl.searchParams.get("tier") === "quality" ? "quality" : "fast";
  const sb = sbServer();

  const { data: listing, error } = await sb
    .from("listings")
    .select("id, title_en, description_en")
    .eq("id", params.id)
    .single();

  if (error || !listing) {
    return NextResponse.json({ error: "Listing not found or not accessible." }, { status: 404 });
  }

  const out: Record<string, unknown> = { id: listing.id, tier };
  try {
    if (listing.title_en) {
      const r = await translateToArabic(listing.title_en, { tier });
      out.title_en = listing.title_en;
      out.title_ar = r.arabic;
      out.model = r.model;
    }
    if (listing.description_en) {
      const r = await translateToArabic(listing.description_en, { tier });
      out.description_en = listing.description_en;
      out.description_ar = r.arabic;
      out.model = r.model;
    }
  } catch (e) {
    return NextResponse.json({ error: String(e instanceof Error ? e.message : e) }, { status: 500 });
  }

  return NextResponse.json(out);
}
