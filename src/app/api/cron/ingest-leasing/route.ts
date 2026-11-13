import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { authed } from "@/lib/adminauth";
import { allowShared } from "@/lib/ratelimit";
import { getSupabaseServiceRole } from "@/lib/supabase/serviceRole";
import { REGA_OPEN_RENTAL_INDICATORS_SOURCE_ID } from "@/lib/sources/catalogue";
import { parseRentalIndicators, rentalIndicatorsTitle, LOADED_REGIONS, PORTAL } from "@/lib/market/regaRentalIndicators";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// PKG-DATA-2. Loads new quarters of the Real Estate General Authority's rental
// indicators from the National Open Data Platform, once a week.
//
// WHAT IT DOES. It asks the portal for the Authority's datasets, keeps the
// ones titled as rental indicators for a region this platform loads, and for
// each one not already published here: downloads the CSV, hashes it, hands the
// bytes to `parseRentalIndicators`, and either stores the counts and marks the
// load published, or records the load as rejected with the reason.
//
// WHAT IT PUBLISHES WITHOUT A PERSON. The Authority's own counts, unaltered,
// from a file that passed every check the earlier quarters pass. That is the
// owner's decision of 2026-11-13. Anything else is a rejection: a rent on a
// commercial row, a new column, a new property type, a title that disagrees
// with its rows. A rejected file changes nothing on the page.
//
// HOW A LOAD BECOMES VISIBLE. The load row is written as rejected with the
// reason "load in progress", then the counts, then the status is set to
// published. The read policy shows only published loads, so a run that dies
// half way leaves nothing a reader can see, and the next run tries again.
//
// The portal's listing feed is undocumented. If it changes shape this route
// reports `portal_unreadable` and loads nothing. It never guesses.
//
// Weekly, not hourly: Vercel's Hobby plan refuses a cron that runs more than
// once a day, and the files appear once a quarter.

const MAX_PER_RUN = 6;
const TIMEOUT_MS = 20_000;

type PortalDataset = { datasetID?: unknown; titleEn?: unknown; titleAr?: unknown; resources?: unknown };

async function portalDatasets(): Promise<PortalDataset[] | null> {
  const out: PortalDataset[] = [];
  for (let page = 0; page < 5; page++) {
    const res = await fetch(`${PORTAL.origin}/api/datasets/list?size=100&page=${page}&sort=updatedAt,DESC`, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ tags: [], publishers: [PORTAL.publisherId], formats: [], categories: [], languages: [], datasetTypes: [], publishDate: { fromDate: null, toDate: null } }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { content?: unknown; last?: unknown };
    if (!Array.isArray(body.content)) return null;
    out.push(...(body.content as PortalDataset[]));
    if (body.last !== false) break;
  }
  return out;
}

function csvPath(d: PortalDataset): string | null {
  if (!Array.isArray(d.resources)) return null;
  for (const r of d.resources as { format?: unknown; url?: unknown }[]) {
    if (r && r.format === "CSV" && typeof r.url === "string" && /\.csv$/i.test(r.url) && !r.url.includes("..")) return r.url;
  }
  return null;
}

async function run(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ ok: false, error: "not_configured" }, { status: 503 });
  if (!(await allowShared("cron-ingest-leasing", req, 10)).ok) return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
  if (!authed(req, secret)) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const sb = getSupabaseServiceRole();
  if (!sb) return NextResponse.json({ ok: false, error: "no_service_client" }, { status: 503 });

  let datasets: PortalDataset[] | null = null;
  try {
    datasets = await portalDatasets();
  } catch (e) {
    console.error("[cron-ingest-leasing] portal", e);
  }
  if (!datasets) return NextResponse.json({ ok: false, error: "portal_unreadable" }, { status: 502 });

  const { data: done, error: doneErr } = await sb.from("official_leasing_loads").select("dataset_id").eq("status", "published");
  if (doneErr) return NextResponse.json({ ok: false, error: "tables_missing_or_unreadable" }, { status: 503 });
  const published = new Set((done ?? []).map((r) => String(r.dataset_id)));

  const results: { dataset: string; title: string; status: "published" | "rejected"; reason?: string }[] = [];
  for (const d of datasets) {
    if (results.length >= MAX_PER_RUN) break;
    const id = typeof d.datasetID === "string" ? d.datasetID : "";
    const titleEn = typeof d.titleEn === "string" ? d.titleEn : "";
    const named = rentalIndicatorsTitle(titleEn);
    if (!id || !/^[0-9a-f-]{36}$/.test(id) || !named) continue;
    const regionInFile = LOADED_REGIONS[named.regionEn];
    if (!regionInFile || published.has(id)) continue;

    const base = {
      dataset_id: id,
      source_id: REGA_OPEN_RENTAL_INDICATORS_SOURCE_ID,
      title_en: titleEn.replace(/\s+/g, " ").trim(),
      title_ar: typeof d.titleAr === "string" ? d.titleAr.replace(/\s+/g, " ").trim() : null,
      dataset_url: PORTAL.datasetUrl(id),
      region: regionInFile,
      period: named.period,
      retrieved_at: new Date().toISOString(),
    };
    const reject = async (reason: string, file?: { url: string; sha: string; bytes: number; rows: number; commercial: number }) => {
      // A rejection is recorded when there is a file to describe. Without one
      // there is nothing the table's own checks would accept, and the response
      // and the log carry the reason.
      if (file) {
        await sb.from("official_leasing_counts").delete().eq("dataset_id", id);
        await sb.from("official_leasing_loads").upsert({ ...base, resource_url: file.url, official_sha256: file.sha, official_bytes: file.bytes, official_rows: file.rows, commercial_rows: file.commercial, status: "rejected", reason });
      }
      console.error("[cron-ingest-leasing] rejected", id, reason);
      results.push({ dataset: id, title: base.title_en, status: "rejected", reason });
    };

    const path = csvPath(d);
    if (!path) { await reject("the dataset lists no CSV file"); continue; }
    const url = PORTAL.fileUrl(path);
    let bytes: Uint8Array;
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS), cache: "no-store" });
      if (!res.ok) { await reject(`the file answered ${res.status}`); continue; }
      bytes = new Uint8Array(await res.arrayBuffer());
    } catch {
      await reject("the file could not be downloaded");
      continue;
    }
    if (bytes.length === 0 || bytes.length > 5_000_000) { await reject("the file is empty or far larger than any earlier quarter"); continue; }
    const sha = createHash("sha256").update(bytes).digest("hex");
    const parsed = parseRentalIndicators(bytes);
    if (!parsed.ok) { await reject(parsed.reason, { url, sha, bytes: bytes.length, rows: 0, commercial: 0 }); continue; }
    const file = { url, sha, bytes: bytes.length, rows: parsed.officialRows, commercial: parsed.commercialRows };
    if (parsed.period !== named.period) { await reject(`the title says ${named.period} and the rows say ${parsed.period}`, file); continue; }
    if (parsed.region !== regionInFile) { await reject("the rows are for another region than the title names", file); continue; }

    // Rejected first, counts second, published last. See the header.
    const { error: loadErr } = await sb.from("official_leasing_loads").upsert({ ...base, resource_url: url, official_sha256: sha, official_bytes: bytes.length, official_rows: parsed.officialRows, commercial_rows: parsed.commercialRows, status: "rejected", reason: "load in progress" });
    if (loadErr) { await reject("the load could not be recorded"); continue; }
    await sb.from("official_leasing_counts").delete().eq("dataset_id", id);
    const { error: countErr } = await sb.from("official_leasing_counts").insert(parsed.rows.map((r) => ({ dataset_id: id, ...r })));
    if (countErr) { await reject("the counts could not be stored", file); continue; }
    const { error: pubErr } = await sb.from("official_leasing_loads").update({ status: "published", reason: null }).eq("dataset_id", id);
    if (pubErr) { await reject("the load could not be marked published", file); continue; }
    results.push({ dataset: id, title: base.title_en, status: "published" });
  }

  return NextResponse.json({ ok: true, seen: datasets.length, loaded: results.filter((r) => r.status === "published").length, rejected: results.filter((r) => r.status === "rejected").length, results });
}

// Vercel's scheduler calls GET with the cron secret as a bearer token.
export async function GET(req: NextRequest) {
  return run(req);
}

export async function POST(req: NextRequest) {
  return run(req);
}
