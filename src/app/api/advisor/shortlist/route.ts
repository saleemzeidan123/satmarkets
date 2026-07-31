// src/app/api/advisor/shortlist/route.ts
//
// The deal agent's core: a requirement in, a verdict-graded shortlist out.
// Each result is scored for fit AND graded against the Rent Index, so the
// answer is not "here are some listings" but "here is what to take, and why."
// Read-only over published listings + the Rent Index. No auth, no AI cost.

import { NextRequest, NextResponse } from "next/server";
import { allow } from "@/lib/ratelimit";
import { releaseVisibleInventory } from "@/lib/inventory";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { pickIndexRow, marketVerdict, type IndexRow } from "@/lib/market/verdict";
import { underwrite } from "@/lib/market/underwrite";
import { quotableRentIndexRows } from "@/lib/market/quotable";
import { type Loc } from "@/lib/format";

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
  if (!allow("advisor-shortlist", req, 5)) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
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
  // Hoisted from the message block below, because the quote decision needs it:
  // the sentence that has to travel with a figure is language-specific, and the
  // decision is taken at the read rather than at the point the prose is written.
  const locale: Loc = (b as any)?.locale === "ar" ? "ar" : "en";

  // Progressive relaxation: strict, then drop budget, then drop district.
  const stages = [
    { budget: true, district: true },
    { budget: false, district: true },
    { budget: false, district: false },
  ];
  let rows: any[] = [];
  let relaxed = "none";
  for (const st of stages) {
    let q = releaseVisibleInventory(client.from("listings").select(SEL).eq("status", "published")).eq("asset_type", b.assetType);
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
  //
  // ADV-1E, Codex item 2. This select asked no question at all: not the licence,
  // not even `sufficient`. Every surviving row then flowed through pickIndexRow
  // into marketVerdict and underwrite, and both of those emit the third-party
  // figure in a different shape ("12% below the district median", a yield built
  // on the band) straight into a JSON response. A figure reshaped is still the
  // figure, and a JSON response is precisely the "API consumer" the correction
  // names. So the rows now take the same decision every rendered surface takes,
  // and the columns the decision needs are selected rather than omitted, because
  // an omitted column reads as unknown and unknown fails closed.
  const districtIds = Array.from(new Set(rows.map((r) => r.district_id).filter(Boolean)));
  let idx: IndexRow[] = [];
  let idxStatements: readonly string[] = [];
  if (districtIds.length) {
    const { data: ir } = await client
      .from("rent_index_published")
      .select("district_id, district_label, district_label_ar, asset_type, segment, unit, band_low, median, band_high, period, sufficient, stat_kind, data_class, is_demo")
      .in("district_id", districtIds)
      .eq("asset_type", b.assetType);
    const quotable = await quotableRentIndexRows((ir ?? []) as any[], locale, (r: any) =>
      (locale === "ar" ? r.district_label_ar || r.district_label : r.district_label) ?? null,
    );
    idx = quotable.rows.map((q) => q.row) as unknown as IndexRow[];
    idxStatements = quotable.statements;
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
  let message: string;
  if (shown.length === 0) {
    message = locale === "ar" ? "لا توجد مساحات معروضة مطابقة الآن. وسّع الميزانية أو الموقع، أو انشر طلباً وسيصلك ردّ المُلّاك والوسطاء." : "No listed spaces match right now. Widen the budget or location, or post a requirement and let owners and brokers come to you.";
  } else {
    const prices = shown
      .filter((r: any) => {
        const bh = r.verdict?.band_high != null ? Number(r.verdict.band_high) : null;
        if (bh != null && r.asking_rent_sqm != null && Number(r.asking_rent_sqm) > bh * 3) {
          console.warn(`[shortlist] ${r.reference_code || r.id} asking ${r.asking_rent_sqm} exceeds 3x band_high ${bh}; excluded from range`);
          return false;
        }
        return true;
      })
      .map((r: any) => r.asking_rent_sqm)
      .filter((v: any) => v != null)
      .map(Number);
    const lo = prices.length ? Math.min(...prices).toLocaleString("en-US") : null;
    const hi = prices.length ? Math.max(...prices).toLocaleString("en-US") : null;
    const within = shown.filter((r: any) => r.verdict?.status === "within" || r.verdict?.status === "below").length;
    // The asking range is the listings' own data and is always sayable. The
    // second half of the sentence counts spaces against the index band, which is
    // the third-party figure restated, so it is said only where a band survived
    // the decision. Saying "0 at or below their index band" when every band was
    // withheld would report an absence of permission as a market fact.
    const graded = shown.filter((r: any) => r.verdict?.status && r.verdict.status !== "na").length;
    const range = lo && hi
      ? (locale === "ar" ? ` الأسعار المعلنة من ${lo} إلى ${hi} ريال/م²·سنة` : ` Asking runs ${lo} to ${hi} SAR/m²·yr`)
      : "";
    const band = range && graded > 0
      ? (locale === "ar" ? `، منها ${within} ضمن نطاق المؤشر أو أدنى` : `, with ${within} at or below their index band`)
      : "";
    const mid = range ? `${range}${band}.` : "";
    // Codex item 3: the label stays connected to the figure, including inside an
    // Advisor answer, so the statement rides in the same sentence block rather
    // than in a footnote the client may not render.
    const notes = graded > 0 && idxStatements.length ? ` ${idxStatements.join(" ")}` : "";
    message = locale === "ar"
      ? `وجدت ${shown.length} مساحة معروضة مطابقة.${mid}${notes} أخبرني بالميزانية أو المساحة أو الموقع لأضيّق القائمة، أو اسألني عن أي واحدة منها.`
      : `Found ${shown.length} listed ${shown.length === 1 ? "space" : "spaces"}.${mid}${notes} Give me a budget, size or location to narrow it, or ask me about any of them.`;
  }
  return NextResponse.json({ count: results.length, relaxed, message, statements: idxStatements, results: shown });
}
