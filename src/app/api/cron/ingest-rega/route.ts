import { NextRequest, NextResponse } from "next/server";
import { getServiceClient, ingestRentBase, type RegaRow } from "@/lib/ingest/rentBasePipeline";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Authenticated REGA rent-base ingestion endpoint.
// DORMANT and safe until CRON_SECRET and SUPABASE_SERVICE_ROLE_KEY are set in the
// server environment. Accepts a POST of one monthly REGA slice and runs it through
// the data spine (run -> staging -> cells -> lineage -> gated publish).
export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ ok: false, error: "not_configured" }, { status: 503 });

  const auth = req.headers.get("authorization") || "";
  if (auth !== `Bearer ${secret}`) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const sb = getServiceClient();
  if (!sb) return NextResponse.json({ ok: false, error: "no_service_client" }, { status: 503 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad_json" }, { status: 400 });
  }

  const b = (body ?? {}) as {
    period?: string;
    payloadHash?: string;
    rows?: RegaRow[];
    dataClass?: "real" | "synthetic";
    threshold?: number;
  };
  if (!b.period || !b.payloadHash || !Array.isArray(b.rows)) {
    return NextResponse.json({ ok: false, error: "missing period/payloadHash/rows" }, { status: 400 });
  }

  try {
    const result = await ingestRentBase(sb, {
      period: b.period,
      payloadHash: b.payloadHash,
      rows: b.rows,
      dataClass: b.dataClass,
      threshold: b.threshold,
      triggeredBy: "cron/ingest-rega",
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}

// Health/config probe (no secrets leaked).
export async function GET() {
  const configured = !!process.env.CRON_SECRET && !!process.env.SUPABASE_SERVICE_ROLE_KEY;
  return NextResponse.json({ ok: true, endpoint: "ingest-rega", configured });
}
