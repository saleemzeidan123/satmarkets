import { NextRequest, NextResponse } from "next/server";
import { allow } from "@/lib/ratelimit";
import { getSupabaseServer } from "@/lib/supabase/server";
import { releaseVisibleInventory } from "@/lib/inventory";
import { isTimelineToken, REQUIREMENT_ASSET_TYPES, REQUIREMENT_DEAL_TYPES } from "@/lib/requirementIntake";
import { cityKey } from "@/lib/labels";

// PKG-DEM1. These were literals here and a shorter literal in the form, so the
// public form silently refused to offer two asset types this route accepts.
const ASSETS = REQUIREMENT_ASSET_TYPES;
const DEALS = REQUIREMENT_DEAL_TYPES;

// GET: the public requirements board (no contact info)
export async function GET(req: NextRequest) {
  if (!allow("requirements-get", req, 60)) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
 const sb = getSupabaseServer();
 // Sample requirements exist only to exercise the board in the preview build.
 // In production they are never served: an empty board is the honest answer,
 // and a missing database is a 503, not a silent fixture list (SM-P0-006).
 if (!sb) {
  if (!PREVIEW) return NextResponse.json({ error: "Storage unavailable. Please try again." }, { status: 503 });
  return NextResponse.json({ requirements: MOCK, sample: true });
 }
 const { data: reqs } = await sb.from("requirements_public").select("*").order("created_at", { ascending: false }).limit(50);
 const { data: ints } = await sb.from("requirement_interests").select("brief_id");
 const { data: dists } = await sb.from("districts").select("id,name_en,name_ar,city");
 const dmap = new Map((dists ?? []).map((d: any) => [d.id, d]));
 const counts = new Map<string, number>();
 (ints ?? []).forEach((i: any) => counts.set(i.brief_id, (counts.get(i.brief_id) ?? 0) + 1));
 const requirements = (reqs ?? []).map((r: any) => ({
  id: r.id, ref: r.ref_code, title: r.title, titleAr: r.title_ar ?? null, asset: r.asset_type, deal: r.deal_type,
  district: dmap.get(r.district_id)?.name_en ?? r.city ?? "",
  districtAr: dmap.get(r.district_id)?.name_ar ?? dmap.get(r.district_id)?.name_en ?? r.city ?? "",
  city: r.city ?? "",
  sizeMin: r.size_min_sqm, sizeMax: r.size_max_sqm, budget: r.budget_sqm_max,
  timeline: r.timeline, mustHaves: r.must_haves ?? [], createdAt: r.created_at,
  interest: counts.get(r.id) ?? 0,
 }));
 if (requirements.length) return NextResponse.json({ requirements, sample: false });
 return NextResponse.json({ requirements: PREVIEW ? MOCK : [], sample: PREVIEW });
}

// POST: create a requirement.
//
// SM-P0-005. What was wrong:
//   - When Supabase was unavailable it returned ok:true with a made-up
//     "match: 12". The user was told twelve verified spaces matched their brief
//     when nothing had been stored and nothing had been counted.
//   - The ref code was "R-" + Math.random() in this file: not unique, and
//     chosen by the caller's process rather than the system of record.
//   - Raw Postgres error.message was returned to the browser.
//   - Validation was two enum checks. Sizes, budget, title, contact and notes
//     were passed through untouched.
//   - The brief and its notification rows were separate inserts, so a brief
//     could exist with nobody notified.
//
// Now: strict validation, DB-issued sequential ref, one transactional RPC,
// sanitized errors, and a 503 rather than a comforting lie.
// PKG-DEM1, finding 100. The accepted timeline vocabulary was a literal here and
// a different literal in the form, so the public form could not submit from its
// shipped state: it pre-selected a value this route refused, and every Arabic
// option it offered was refused. Both sides now read `requirementIntake`, which
// is the only way two lists stop disagreeing.
const num = (v: unknown): number | null => {
 if (v === null || v === undefined || v === "") return null;
 const n = Number(v);
 return Number.isFinite(n) ? n : NaN;
};

export async function POST(req: NextRequest) {
 if (!allow("requirements", req, 8)) return NextResponse.json({ error: "Too many requests. Please try again shortly." }, { status: 429 });

 let b: any;
 try { b = await req.json(); } catch { return NextResponse.json({ error: "Invalid request body." }, { status: 400 }); }

 if (!ASSETS.includes(b?.asset_type) || !DEALS.includes(b?.deal_type)) {
  return NextResponse.json({ error: "Choose a valid asset type and deal type." }, { status: 400 });
 }

 const title = String(b.title ?? "").trim();
 if (title.length > 160) return NextResponse.json({ error: "Title is too long." }, { status: 400 });

 const sizeMin = num(b.size_min), sizeMax = num(b.size_max), budget = num(b.budget);
 if ([sizeMin, sizeMax, budget].some((n) => Number.isNaN(n))) {
  return NextResponse.json({ error: "Size and budget must be numbers." }, { status: 400 });
 }
 for (const [v, label] of [[sizeMin, "size"], [sizeMax, "size"], [budget, "budget"]] as [number | null, string][]) {
  if (v !== null && (v < 0 || v > 10_000_000)) return NextResponse.json({ error: `That ${label} is out of range.` }, { status: 400 });
 }
 if (sizeMin !== null && sizeMax !== null && sizeMin > sizeMax) {
  return NextResponse.json({ error: "Minimum size cannot exceed maximum size." }, { status: 400 });
 }

 const timeline = b.timeline ? String(b.timeline).trim() : "";
 if (timeline && !isTimelineToken(timeline)) return NextResponse.json({ error: "Choose a valid timeline." }, { status: 400 });

 const mustHaves = Array.isArray(b.must_haves)
  ? b.must_haves.filter((m: unknown) => typeof m === "string" && m.length <= 60).slice(0, 12)
  : [];

 const notes = String(b.notes ?? "").trim();
 if (notes.length > 2000) return NextResponse.json({ error: "Notes are too long." }, { status: 400 });

 const email = String(b.contact_email ?? "").trim();
 if (email && (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 200)) {
  return NextResponse.json({ error: "Enter a valid work email." }, { status: 400 });
 }
 const contactName = String(b.contact_name ?? "").trim().slice(0, 120);
 const contactPhone = String(b.contact_phone ?? "").trim().slice(0, 40);

 const districtId = b.district_id ? String(b.district_id) : "";
 if (districtId && !/^[0-9a-f-]{36}$/i.test(districtId)) {
  return NextResponse.json({ error: "Unknown district." }, { status: 400 });
 }

 const sb = getSupabaseServer();
 // No storage means no requirement and no match count. Say so.
 if (!sb) return NextResponse.json({ error: "Storage unavailable. Please try again." }, { status: 503 });

 // PKG-DEM1, finding 105. The check above is a shape check: any well formed UUID
 // passed it, so a requirement could be stored against a district that does not
 // exist, and the board would then quietly fall back to the free text city. The
 // district is looked up rather than pattern matched.
 //
 // And finding 102: `city` fell back to the literal "Riyadh" whenever the caller
 // sent none, which stored a fact nobody stated. The city now comes from the
 // district row, which is the only place it is actually known. A request with
 // neither a real district nor a recognised city is refused rather than filed in
 // a city it never named.
 let city = "";
 if (districtId) {
  const { data: drow, error: derr } = await sb.from("districts").select("id,city").eq("id", districtId).maybeSingle();
  if (derr) {
   console.error("district lookup failed", derr);
   return NextResponse.json({ error: "Could not save your requirement. Please try again." }, { status: 500 });
  }
  if (!drow) return NextResponse.json({ error: "Unknown district." }, { status: 400 });
  city = String((drow as any).city ?? "").trim();
 }
 if (!city) {
  const raw = String(b.city ?? "").trim();
  city = (cityKey(raw) ?? "").slice(0, 80);
 }
 if (!city) return NextResponse.json({ error: "Choose a location." }, { status: 400 });

 // create_requirement() inserts the brief AND its notification rows in one
 // transaction, and the ref code comes from a database sequence.
 const { data, error } = await sb.rpc("create_requirement", {
  payload: {
   title: title || `${b.asset_type} requirement`,
   asset_type: b.asset_type,
   deal_type: b.deal_type,
   district_id: districtId,
   city,
   size_min_sqm: sizeMin,
   size_max_sqm: sizeMax,
   budget_sqm_max: budget,
   timeline,
   must_haves: mustHaves,
   notes,
   contact_name: contactName,
   contact_email: email,
   contact_phone: contactPhone,
  },
 });

 if (error) {
  console.error("create_requirement failed", error);
  return NextResponse.json({ error: "Could not save your requirement. Please try again." }, { status: 500 });
 }

 const row = Array.isArray(data) ? data[0] : data;
 const id: string | undefined = row?.id;
 const ref: string | undefined = row?.ref_code;
 if (!id || !ref) return NextResponse.json({ error: "Could not save your requirement. Please try again." }, { status: 500 });

 // A real count of published listings that match. Never a placeholder.
 let match = 0;
 try {
  let q = releaseVisibleInventory(sb.from("listings").select("id", { count: "exact", head: true })
   .eq("status", "published")).eq("asset_type", b.asset_type).eq("deal_type", b.deal_type);
  if (districtId) q = q.eq("district_id", districtId);
  const { count } = await q;
  match = count ?? 0;
 } catch {
  match = 0;
 }

 return NextResponse.json({ ok: true, id, ref, match, notified: NOTIFIED, stored: true });
}

const NOTIFIED = ["SAT broker network", "Verified landlords in your locations", "SAT requirements desk"];
// Preview-only. Set SITE_ENV=production (or NEXT_PUBLIC_SITE_ENV=production) to
// switch every sample fallback off.
const PREVIEW = (process.env.SITE_ENV ?? process.env.NEXT_PUBLIC_SITE_ENV) !== "production";
// PKG-DEM1. The must-haves here were English phrases, so the preview board showed
// an Arabic reader "Fitted" and "Dock doors" on every sample card, and one of them
// was a condition the form has never offered. Sample data that cannot be produced
// by the form misdescribes the product as surely as a wrong figure does. These are
// the tokens the form writes.
const MOCK = [
 { sample: true, id: "m1", ref: "SAMPLE-20418", title: "Regional HQ office, Grade A, KAFD", asset: "office", deal: "lease", district: "KAFD", city: "Riyadh", sizeMin: 500, sizeMax: 1200, budget: 3000, timeline: "Q3", mustHaves: ["fitted","parking","metro_nearby"], interest: 1 },
 { sample: true, id: "m2", ref: "SAMPLE-20420", title: "Fitted office, regional team, Al Olaya", asset: "office", deal: "lease", district: "Al Olaya", city: "Riyadh", sizeMin: 300, sizeMax: 700, budget: 2700, timeline: "Q4", mustHaves: ["fitted","raised_floor"], interest: 0 },
 { sample: true, id: "m3", ref: "SAMPLE-20421", title: "Logistics warehouse, 2nd Industrial", asset: "warehouse", deal: "lease", district: "2nd Industrial", city: "Riyadh", sizeMin: 2000, sizeMax: 5000, budget: 320, timeline: "Q3", mustHaves: ["dock_doors"], interest: 0 },
];
