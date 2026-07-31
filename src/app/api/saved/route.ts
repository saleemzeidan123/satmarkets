import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { pickIndexRow, marketVerdict, type IndexRow } from "@/lib/market/verdict";
import { quotableRentIndexRows } from "@/lib/market/quotable";
import { type Loc } from "@/lib/format";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const ids = (searchParams.get("ids") || "").split(",").map((s) => s.trim()).filter((s) => /^[0-9a-fA-F-]{36}$/.test(s)).slice(0, 50);
  if (!ids.length) return NextResponse.json({ listings: [] });
  const locale: Loc = searchParams.get("locale") === "ar" ? "ar" : "en";
  const sb = getSupabaseServer();
  if (!sb) return NextResponse.json({ listings: [] });
  // simulated-visible. This hydrates the ids the user themself saved. Dropping a
  // simulated row from their own shortlist would read as data loss, not a correction.
  const { data } = await sb.from("listings").select("*, districts(name_en, name_ar, city)").in("id", ids).eq("status", "published");
  const ls = data ?? [];
  const dids = Array.from(new Set(ls.map((l: any) => l.district_id).filter(Boolean)));
  const byD = new Map<string, IndexRow[]>();
  let statements: readonly string[] = [];
  if (dids.length) {
    // ADV-1E, Codex item 2. The comment above explains why a simulated LISTING
    // survives here: the user saved it themself and removing it would read as
    // data loss. That reasoning stops at the listing. `vs_index` is the
    // third-party index figure restated as a percentage against the user's
    // asking rent, and a percentage derived from a figure carries the figure's
    // permission, so it takes the decision rather than inheriting the listing's
    // exemption. A withheld row now yields `vs_index: null`, which the card
    // already renders as no verdict, rather than a number nobody may publish.
    const { data: ir } = await sb.from("rent_index_published").select("district_id,asset_type,segment,unit,median,band_low,band_high,period,sufficient,stat_kind,data_class,is_demo").eq("sufficient", true).in("district_id", dids);
    const quotable = await quotableRentIndexRows((ir ?? []) as any[], locale);
    statements = quotable.statements;
    quotable.rows.forEach(({ row }) => { const r: any = row; const a = byD.get(r.district_id) ?? []; a.push(r as IndexRow); byD.set(r.district_id, a); });
  }
  const out = ls.map((l: any) => {
    let vs: { status: string; deltaPct: number | null } | null = null;
    if (l.deal_type === "lease" && l.asking_rent_sqm != null && l.district_id) {
      const v = marketVerdict(l.asking_rent_sqm, pickIndexRow(byD.get(l.district_id) ?? [], l.asset_type, l.building_grade));
      if (v.status !== "na") vs = { status: v.status, deltaPct: v.deltaPct };
    }
    return { ...l, vs_index: vs };
  });
  return NextResponse.json({ listings: out, statements });
}
