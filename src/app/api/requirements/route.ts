import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";

const ASSETS = ["office","retail","warehouse","medical","showroom","serviced","education"];
const DEALS = ["lease","sale"];

// GET: the public requirements board (no contact info)
export async function GET() {
 const sb = getSupabaseServer();
 if (!sb) return NextResponse.json({ requirements: MOCK });
 const { data: reqs } = await sb.from("requirements_public").select("*").order("created_at", { ascending: false }).limit(50);
 const { data: ints } = await sb.from("requirement_interests").select("brief_id");
 const { data: dists } = await sb.from("districts").select("id,name_en,name_ar,city");
 const dmap = new Map((dists ?? []).map((d: any) => [d.id, d]));
 const counts = new Map<string, number>();
 (ints ?? []).forEach((i: any) => counts.set(i.brief_id, (counts.get(i.brief_id) ?? 0) + 1));
 const requirements = (reqs ?? []).map((r: any) => ({
  id: r.id, ref: r.ref_code, title: r.title, asset: r.asset_type, deal: r.deal_type,
  district: dmap.get(r.district_id)?.name_en ?? r.city ?? "", city: r.city ?? "",
  sizeMin: r.size_min_sqm, sizeMax: r.size_max_sqm, budget: r.budget_sqm_max,
  timeline: r.timeline, mustHaves: r.must_haves ?? [], createdAt: r.created_at,
  interest: counts.get(r.id) ?? 0,
 }));
 return NextResponse.json({ requirements: requirements.length ? requirements : MOCK });
}

// POST: create a requirement, notify the three audiences, return match count
export async function POST(req: NextRequest) {
 const b = await req.json();
 if (!ASSETS.includes(b.asset_type) || !DEALS.includes(b.deal_type)) {
  return NextResponse.json({ error: "invalid asset or deal type" }, { status: 400 });
 }
 const ref = "R-" + Math.floor(20000 + Math.random() * 79999);
 const sb = getSupabaseServer();
 if (!sb) {
  return NextResponse.json({ ok: true, ref, match: 12, notified: NOTIFIED, stored: false });
 }
 const row = {
  title: b.title || `${b.asset_type} requirement`, asset_type: b.asset_type, deal_type: b.deal_type,
  district_id: b.district_id || null, city: b.city || "Riyadh",
  size_min_sqm: b.size_min ?? null, size_max_sqm: b.size_max ?? null, budget_sqm_max: b.budget ?? null,
  timeline: b.timeline || null, must_haves: b.must_haves ?? [], notes: b.notes || null,
  contact_name: b.contact_name || null, contact_email: b.contact_email || null, contact_phone: b.contact_phone || null,
  ref_code: ref, status: "open",
 };
 const { data: ins, error } = await sb.from("tenant_briefs").insert(row).select("id").single();
 if (error) return NextResponse.json({ error: error.message }, { status: 500 });
 const id = ins?.id;
 if (id) {
  await sb.from("requirement_notifications").insert(
   ["broker","landlord","sat"].map((a) => ({ brief_id: id, audience: a }))
  );
 }
 // real match count from verified listings
 let q = sb.from("listings").select("id", { count: "exact", head: true }).eq("status", "published").eq("asset_type", b.asset_type).eq("deal_type", b.deal_type);
 if (b.district_id) q = q.eq("district_id", b.district_id);
 const { count } = await q;
 return NextResponse.json({ ok: true, id, ref, match: count ?? 0, notified: NOTIFIED, stored: true });
}

const NOTIFIED = ["SAT broker network", "Verified landlords in your districts", "SAT requirements desk"];
const MOCK = [
 { id: "m1", ref: "R-20418", title: "Regional HQ office, Grade A, KAFD", asset: "office", deal: "lease", district: "KAFD", city: "Riyadh", sizeMin: 500, sizeMax: 1200, budget: 3000, timeline: "Q3", mustHaves: ["Fitted","Parking","Metro nearby"], interest: 1 },
 { id: "m2", ref: "R-20420", title: "Fitted office, regional team, Al Olaya", asset: "office", deal: "lease", district: "Al Olaya", city: "Riyadh", sizeMin: 300, sizeMax: 700, budget: 2700, timeline: "Q4", mustHaves: ["Fitted","Raised floor"], interest: 0 },
 { id: "m3", ref: "R-20421", title: "Logistics warehouse, 2nd Industrial", asset: "warehouse", deal: "lease", district: "2nd Industrial", city: "Riyadh", sizeMin: 2000, sizeMax: 5000, budget: 320, timeline: "Q3", mustHaves: ["Dock doors","Heavy power"], interest: 0 },
];
