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
  /**
   * The low and high of a band THE SOURCE published for this row. Both or
   * neither. The pipeline never works a band out for itself: see `sourceBand`.
   */
  band_low?: number;
  band_high?: number;
};

/**
 * The band a row may carry: the one its source published, or none.
 *
 * Law 3. This pipeline used to write `avg_rent * 0.75` and `avg_rent * 1.3` as
 * the low and high of every cell and call the method "min-max of source
 * medians". The source published an average and no band, there were no medians,
 * and the two multipliers came from nowhere. Every page that drew a band from
 * such a cell would have drawn a range nobody measured, under an official
 * attribution. The endpoint was dormant, so no such cell was ever written.
 *
 * A row now carries a band only when the caller passes one the source itself
 * published, both ends finite and in order. Anything else is no band, and a
 * cell with no band is drawn as a single figure by the readers that already
 * handle a null band.
 */
export function sourceBand(r: Pick<RegaRow, "band_low" | "band_high">): { low: number; high: number } | null {
  const { band_low: low, band_high: high } = r;
  if (typeof low !== "number" || typeof high !== "number") return null;
  if (!Number.isFinite(low) || !Number.isFinite(high) || low <= 0 || high < low) return null;
  return { low, high };
}

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
      const band = sourceBand(r);
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
          band_low: band ? band.low : null,
          band_high: band ? band.high : null,
          // The column is named `median` and holds the source's AVERAGE; the
          // read side maps it (see laws.test.ts). `stat_kind` says which it is,
          // and its column default is 'median', so it is stated here.
          median: sufficient ? r.avg_rent : null,
          stat_kind: "average",
          sufficient,
          sufficiency_basis: { tx_count: r.tx_count, threshold },
          method: band ? "source average, with the band the source published" : "source average; the source published no band",
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
