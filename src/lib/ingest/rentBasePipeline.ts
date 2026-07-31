import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { REGA_RENT_INDEX_SOURCE_ID } from "@/lib/sources/catalogue";

// Service-role client for server-only ingestion. Returns null when not configured,
// so callers can stay dormant until SUPABASE_SERVICE_ROLE_KEY is set in the environment.
export function getServiceClient(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export type RegaRow = {
  district_id: string;
  district_raw?: string;
  asset_type: string;
  avg_rent: number;
  tx_count: number;
  segment?: string;
};

export type IngestInput = {
  period: string;
  payloadHash: string;
  rows: RegaRow[];
  threshold?: number;
  dataClass?: "real" | "synthetic";
  triggeredBy?: string;
};

export type IngestResult = {
  runId: string;
  received: number;
  published: number;
  thin: number;
  idempotentSkip?: boolean;
};

// Runs the data-spine pipeline for the REGA rent base:
// ingestion_runs -> stg_rega_rent -> index_cells (+ sufficiency_basis) -> index_cell_inputs (lineage)
// -> sat_publish_index_cell (the sanctioned publish path that carries the asymmetry rule).
// Idempotent by (source_id, period, payload_hash).
export async function ingestRentBase(sb: SupabaseClient, input: IngestInput): Promise<IngestResult> {
  const threshold = input.threshold ?? 30;
  const dataClass = input.dataClass ?? "real";
  // ADV-1C.1 correction 2 / Codex gate 3: the REGA id resolves through the one
  // canonical catalogue entry rather than a string literal in this function, so
  // the row this pipeline writes and the register row that governs it are the
  // same source by construction.
  const source_id = REGA_RENT_INDEX_SOURCE_ID;

  const { data: existing } = await sb
    .from("ingestion_runs")
    .select("id")
    .eq("source_id", source_id)
    .eq("period", input.period)
    .eq("payload_hash", input.payloadHash)
    .maybeSingle();
  if (existing) {
    return { runId: existing.id as string, received: 0, published: 0, thin: 0, idempotentSkip: true };
  }

  const { data: run, error: runErr } = await sb
    .from("ingestion_runs")
    .insert({
      source_id,
      period: input.period,
      payload_hash: input.payloadHash,
      status: "running",
      rows_received: input.rows.length,
      rows_valid: input.rows.length,
      triggered_by: input.triggeredBy ?? "api",
      data_class: dataClass,
    })
    .select("id")
    .single();
  if (runErr || !run) throw new Error("run insert failed: " + (runErr?.message ?? "unknown"));
  const runId = run.id as string;

  let published = 0;
  let thin = 0;
  try {
    for (const r of input.rows) {
      const { data: stg, error: stgErr } = await sb
        .from("stg_rega_rent")
        .insert({
          run_id: runId,
          period: input.period,
          district_raw: r.district_raw ?? null,
          district_id: r.district_id,
          asset_type: r.asset_type,
          avg_rent: r.avg_rent,
          tx_count: r.tx_count,
          raw: r as unknown as Record<string, unknown>,
          data_class: dataClass,
        })
        .select("id")
        .single();
      if (stgErr || !stg) throw new Error("staging insert failed: " + (stgErr?.message ?? "unknown"));

      const sufficient = r.tx_count >= threshold;
      if (sufficient) published++;
      else thin++;

      const { data: cell, error: cellErr } = await sb
        .from("index_cells")
        .insert({
          period: input.period,
          district_id: r.district_id,
          asset_type: r.asset_type,
          segment: r.segment ?? "blended",
          unit: "sar_sqm_yr",
          band_low: Math.round(r.avg_rent * 0.75),
          band_high: Math.round(r.avg_rent * 1.3),
          median: sufficient ? r.avg_rent : null,
          sufficient,
          sufficiency_basis: { tx_count: r.tx_count, threshold },
          method: "min-max of source medians",
          source_id,
          run_id: runId,
          status: "draft",
          data_class: dataClass,
        })
        .select("id")
        .single();
      if (cellErr || !cell) throw new Error("cell insert failed: " + (cellErr?.message ?? "unknown"));

      const { error: linErr } = await sb
        .from("index_cell_inputs")
        .insert({ cell_id: cell.id, input_table: "stg_rega_rent", input_id: stg.id, role: "rega_transactions" });
      if (linErr) throw new Error("lineage insert failed: " + linErr.message);

      const { error: pubErr } = await sb.rpc("sat_publish_index_cell", { p_cell_id: cell.id });
      if (pubErr) throw new Error("publish rpc failed: " + pubErr.message);
    }
    await sb
      .from("ingestion_runs")
      .update({ status: "ok", finished_at: new Date().toISOString() })
      .eq("id", runId);
  } catch (e) {
    await sb
      .from("ingestion_runs")
      .update({ status: "failed", finished_at: new Date().toISOString(), note: String(e) })
      .eq("id", runId);
    throw e;
  }

  return { runId, received: input.rows.length, published, thin };
}
