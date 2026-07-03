// src/app/api/advisor/shortlist/route.ts
//
// The deal agent's core: a requirement in, a verdict-graded shortlist out.
// Each result is scored for fit AND graded against the SAT Rent Index, so the
// answer is not "here are some listings" but "here is what to take, and why."
// Read-only over published listings + the Rent Index. No auth, no AI cost.

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { pickIndexRow, marketVerdict, type IndexRow } from "@/lib/market/verdict";
import { underwrite } from "@/lib/market/underwrite";

export const runtime = "nodejs";

interface Brief {
  assetType: string;
  dealType?: string;
  districtId?: string;
  sizeMin?: number;
  sizeMax?: number;
  budgetSqmMax?: number;
  grade?: string;
  fitout?: string;
  limit?: number;
}

function sb() {
  const c = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (n: string) => c.get(n)?.value, set() {}, remove() {} } },
  );
}

const SEL =
  "id, reference_code, title_en, title_ar, asset_type, deal_type, area_sqm, asking_rent_sqm, building_grade, fitout_condition, district_id, sale_price, sale_price_sqm, service_charge_sqm, districts(name_en,name_ar)";

function fitScore(l: any, b: Brief, verdictStatus: string): number {
  let s = 50;
  const a = l.area_sqm != null ? Number(l.area_sqm) : null;
  if (a != null) {
    if (b.sizeMin != null && b.sizeMax != null) {
      if (a >= b.sizeMin && a <= b.sizeMax) s += 18;
      else if (a >= b.sizeMin * 0.8 && a <= b.sizeMax * 1.2) s += 8;
    }
  }
  if (b.budgetSqmMax != null && l.asking_rent_sqm != null) {
    if (Number(l.asking_rent_sqm) <= b.budgetSqmMax) s += 14;
  }
  if (b.grade && l.building_grade && l.building_grade === b.grade) s += 8;
  if (b.fitout && l.fitout_condition && l.fitout_condition === b.fitout) s += 6;
  if (b.districtId && l.district_id === b.districtId) s += 8;
  if (verdictStatus === "below") s += 10;
  else if (verdictStatus === "within") s += 4;
  return Math.max(0, Math.min(100, s));
}

export async function POST(req: NextRequest) {
  let b: Brief;
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ error: "Send a JSON brief." }, { status: 400 });
  }
  if (!b.assetType) {
    return NextResponse.json({ error: "assetType is required." }, { status: 400 });
  }
  const client = sb();
  const limit = Math.min(b.limit || 6, 20);

  // Progressive relaxation: strict, then drop budget, then drop district.
  const stages = [
    { budget: true, district: true },
    { budget: false, district: true },
    { budget: false, district: false },
  ];
  let rows: any[] = [];
  let relaxed = "none";
  for (const st of stages) {
    let q = client.from("listings").select(SEL).eq("status", "published").eq("asset_type", b.assetType);
    if (b.dealType) q = q.eq("deal_type", b.dealType);
    if (b.sizeMin != null) q = q.gte("area_sqm", b.sizeMin);
    if (b.sizeMax != null) q = q.lte("area_sqm", b.sizeMax);
    if (st.district && b.districtId) q = q.eq("district_id", b.districtId);
    if (st.budget && b.budgetSqmMax != null) q = q.lte("asking_rent_sqm", b.budgetSqmMax);
    const { data, error } = await q.limit(40);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    rows = data || [];
    if (rows.length >= 3) {
      relaxed = st.budget && st.district ? "none" : !st.budget && st.district ? "budget" : "budget+district";
      break;
    }
    relaxed = st.budget && st.district ? "none" : !st.budget && st.district ? "budget" : "budget+district";
  }

  // Index rows for the districts involved.
  const districtIds = Array.from(new Set(rows.map((r) => r.district_id).filter(Boolean)));
  let idx: IndexRow[] = [];
  if (districtIds.length) {
    const { data: ir } = await client
      .from("rent_index_published")
      .select("district_id, district_label, district_label_ar, asset_type, segment, unit, band_low, median, band_high, period")
      .in("district_id", districtIds)
      .eq("asset_type", b.assetType);
    idx = (ir || []) as any;
  }
  const idxByDistrict: Record<string, IndexRow[]> = {};
  for (const r of idx as any[]) (idxByDistrict[r.district_id] ||= []).push(r);

  const results = rows.map((l) => {
    const drows = idxByDistrict[l.district_id] || [];
    const row = pickIndexRow(drows, l.asset_type, l.building_grade);
    const dist = l.districts || {};
    const v = marketVerdict(l.asking_rent_sqm, row, dist.name_en, dist.name_ar);
    const u = underwrite(l, row, dist.name_en, dist.name_ar);
    const fit = fitScore(l, b, v.status);
    return {
      id: l.id,
      reference_code: l.reference_code,
      title_en: l.title_en,
      title_ar: l.title_ar,
      district_en: dist.name_en ?? null,
      district_ar: dist.name_ar ?? null,
      area_sqm: l.area_sqm,
      asking_rent_sqm: l.asking_rent_sqm,
      building_grade: l.building_grade,
      fit_score: fit,
      verdict: v,
      underwrite: u,
    };
  });

  // Rank: value first (below market), then fit.
  const rank = { below: 0, within: 1, above: 2, na: 3 } as Record<string, number>;
  results.sort((a, c) => (rank[a.verdict.status] - rank[c.verdict.status]) || c.fit_score - a.fit_score);

  const shown = results.slice(0, limit);
  const locale = (b as any)?.locale === "ar" ? "ar" : "en";
  let message: string;
  if (shown.length === 0) {
    message = locale === "ar" ? "لا توجد مساحات موثّقة مطابقة الآن. وسّع الميزانية أو الموقع، أو انشر طلباً وسيصلك ردّ المُلّاك والوسطاء." : "No verified spaces match right now. Widen the budget or location, or post a requirement and let owners and brokers come to you.";
  } else {
    const prices = shown.map((r: any) => r.listing?.asking_rent_sqm ?? r.listing?.sale_price_sqm).filter((v: any) => v != null).map(Number);
    const lo = prices.length ? Math.min(...prices).toLocaleString("en-US") : null;
    const hi = prices.length ? Math.max(...prices).toLocaleString("en-US") : null;
    const within = shown.filter((r: any) => r.verdict?.status === "within" || r.verdict?.status === "below").length;
    const range = lo && hi ? (locale === "ar" ? `الأسعار من ${lo} إلى ${hi} ريال/م²·سنة` : `asking runs ${lo} to ${hi} SAR/m²·yr`) : "";
    const disc = prices.length ? (locale === "ar" ? `، ${within} منها ضمن نطاق المؤشر أو أدنى` : `, ${within} of them at or below their index band`) : "";
    message = locale === "ar"
      ? `وجدت ${shown.length} مساحة موثّقة مطابقة. ${range}${disc}. أخبرني بالميزانية أو المساحة أو الموقع لأضيّق القائمة، أو اسألني عن أي واحدة منها.`
      : `Found ${shown.length} verified ${shown.length === 1 ? "space" : "spaces"}. Where prices are stated, ${range}${disc}. Give me a budget, size or location to narrow it, or ask me about any of them.`;
  }
  return NextResponse.json({ count: results.length, relaxed, message, results: shown });
}
