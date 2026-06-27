// src/app/api/admin/translate-batch/route.ts
//
// TEMPORARY token-guarded backfill helper. Returns Arabic translations for
// listings that still lack title_ar / description_ar, WITHOUT writing to the DB
// (the caller persists via an elevated path). Token-guarded so it is not a
// public cost vector. Remove after the one-time backfill.
//
// GET /api/admin/translate-batch?token=...&limit=8

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { translateToArabic } from "@/lib/translate/translateToArabic";

export const runtime = "nodejs";
export const maxDuration = 60;

const TOKEN = "sat_bf_856d34753178affec3af13bb";

function sb() {
  const c = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (n: string) => c.get(n)?.value, set() {}, remove() {} } },
  );
}

export async function GET(req: NextRequest) {
  if (req.nextUrl.searchParams.get("token") !== TOKEN) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const limit = Math.min(Number(req.nextUrl.searchParams.get("limit") || 8), 12);
  const client = sb();

  const { data: rows, error } = await client
    .from("listings")
    .select("id, title_en, description_en, title_ar, description_ar")
    .not("title_en", "is", null)
    .is("title_ar", null)
    .limit(limit);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const results: Array<Record<string, unknown>> = [];
  for (const r of rows || []) {
    const out: Record<string, unknown> = { id: r.id, title_en: r.title_en };
    if (r.title_en) {
      const t = await translateToArabic(r.title_en, { tier: "fast" });
      out.title_ar = t.arabic;
      out.model = t.model;
    }
    if (r.description_en && !r.description_ar) {
      const d = await translateToArabic(r.description_en, { tier: "fast" });
      out.description_ar = d.arabic;
      out.model = d.model;
    }
    results.push(out);
  }

  return NextResponse.json({ count: results.length, results });
}
