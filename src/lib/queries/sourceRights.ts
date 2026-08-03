import { cache } from "react";
import { getSupabaseServer } from "@/lib/supabase/server";
import {
  SOURCE_RIGHTS_COLUMNS,
  deniedRights,
  indexSourceRights,
  type SourceRights,
} from "@/lib/sourceRights";

// ADV-0 loader, corrected at ADV-1C.1. The rules live in `src/lib/sourceRights.ts`;
// this file only fetches. Every failure path denies, and nothing here can open a
// permission that a licence closed. An outage, a missing env var or a schema
// drift must never widen access. The product losing a figure is a visible,
// recoverable fault. The product publishing an unlicensed figure is not.
//
// WHAT WAS WRONG, AND WHY IT MATTERED MORE THAN IT LOOKED.
//
// The loader returned a bare `Map`, and four completely different situations
// collapsed into the same empty one:
//
//   the deployment has no Supabase credentials at all;
//   the query reached PostgREST and came back an error;
//   the query succeeded and the reader was permitted to see no rows;
//   the register genuinely holds nothing.
//
// `/sources` rendered all four as one sentence, "The register could not be
// read". That is Codex correction 5's defect one layer up: a single generic
// unavailable state standing in for several materially different facts. It also
// cost us the diagnosis. The ADV-1C handback told Codex "the source register is
// empty", and correction 2 asked us to reconcile that with earlier packages
// using `source_registry.rega_ejar`. The reconciliation is that the handback was
// wrong, and it was wrong because this function could not tell the difference.
//
// WHAT THE EVIDENCE ACTUALLY SAYS.
//
// `supabase/migrations/20260728_source_rights_ledger.sql` writes nine reviewed
// rows into `public.source_registry` and its own header records that it was
// applied to production. On the deployed preview, `/en/rent-index` reads
// `rent_index_published` through the same anon client on the same request and
// returns seven rows, while `/en/sources` returns none. So Supabase is
// configured, reachable and readable; `source_registry` specifically is not
// readable by anon. No committed migration enables RLS on that table or grants
// anon SELECT, and RLS with no SELECT policy returns exactly this: HTTP 200, no
// error, zero rows.
//
// The honest statement is therefore not "the register is empty". It is "the
// register returned no rows to this reader", which is what `no_rows_visible`
// says. Whether that is because it holds none or because this reader may see
// none is not something a PostgREST response can tell us, and the copy does not
// pretend otherwise.
//
// The behaviour is unchanged in every branch. All four states carry an empty
// rights map and therefore deny everything. The state is reported, never acted
// on: no branch below grants anything the others do not.

/**
 * What happened when the register was read, as four distinguishable facts.
 *
 *   not_configured    no Supabase credentials in this environment, so no read
 *                     was attempted. Local builds and preview deployments
 *                     without env vars land here.
 *   read_failed       the read was attempted and came back an error or a
 *                     thrown exception. Network, schema drift, a revoked key.
 *   no_rows_visible   the read succeeded and returned nothing. Either the
 *                     register holds no rows, or this reader is not permitted
 *                     to see the rows it holds. A PostgREST 200 with an empty
 *                     body cannot distinguish those two, so neither do we.
 *   loaded            rows were returned and indexed.
 */
export type SourceRegisterState =
  | "not_configured"
  | "read_failed"
  | "no_rows_visible"
  | "loaded";

export type SourceRegisterRead = {
  state: SourceRegisterState;
  /** Empty in every state but `loaded`. An empty map denies every lookup. */
  rights: Map<string, SourceRights>;
  /** Rows returned. Zero in every state but `loaded`. */
  count: number;
};

const EMPTY = (state: SourceRegisterState): SourceRegisterRead => ({
  state,
  rights: new Map(),
  count: 0,
});

/**
 * Read the register and say which of the four things happened.
 *
 * `cache()` so that a page reading rights for six figures issues one query, and
 * so that a page rendering the register beside a passport cannot see two
 * different answers within one request.
 */
export const readSourceRegister = cache(
  async (): Promise<SourceRegisterRead> => {
    try {
      const sb = await getSupabaseServer();
      if (!sb) return EMPTY("not_configured");
      const { data, error } = await sb
        .from("source_registry")
        .select(SOURCE_RIGHTS_COLUMNS);
      if (error || !data) return EMPTY("read_failed");
      if (data.length === 0) return EMPTY("no_rows_visible");
      const rights = indexSourceRights(data);
      // A response with rows that index to nothing is a schema disagreement, not
      // a register. Treated as a failed read rather than as an empty one,
      // because "the columns are not what we expect" is a fault to report and
      // not a fact about permissions.
      if (rights.size === 0) return EMPTY("read_failed");
      return { state: "loaded", rights, count: rights.size };
    } catch {
      return EMPTY("read_failed");
    }
  }
);

/**
 * The rights map alone, for the many callers that only need the lookup.
 *
 * Identical behaviour to the pre-ADV-1C.1 function of the same name: empty on
 * every failure, and an empty map denies.
 */
export async function getAllSourceRights(): Promise<Map<string, SourceRights>> {
  return (await readSourceRegister()).rights;
}

/**
 * Rights for one source. Never throws, never returns null, denies on absence.
 *
 * Correct for an ENFORCEMENT caller, which only wants a yes or a no and must
 * get a no when the register cannot be read. Not correct for a caller that has
 * to tell the reader WHY: see `getSourceRightsOrNull` below.
 */
export async function getSourceRights(sourceId: string): Promise<SourceRights> {
  const all = await getAllSourceRights();
  return all.get(sourceId) ?? deniedRights(sourceId);
}

/**
 * Rights for one source, or null when no row was read.
 *
 * ADV-1D. This exists because `getSourceRights` cannot be used by anything that
 * renders an evidence state, and the reason is easy to miss. Its fallback,
 * `deniedRights(sourceId)`, sets `sourceId` to the id that was ASKED FOR, so
 * the value it returns is not null and it does match `passport.sourceId`. Hand
 * that to `publicEvidenceView` as `ctx.rights` and the view concludes that a
 * rights row was read and that the row refuses, which renders `restricted`:
 * "the permission recorded for this source does not cover showing the value to
 * this audience". Nothing was recorded. Nothing was read.
 *
 * Codex correction 5 asks for exactly these two to stay apart, and finding 88
 * is the live case: the public runtime reads zero rows from `source_registry`,
 * so today every sourced figure must resolve to `permission_unrecorded`. An
 * unread permission is not a permission, and it is also not a refusal.
 *
 * A caller that wants the denying behaviour should keep calling
 * `getSourceRights`. A caller that has to say which of the two happened calls
 * this and passes the null through.
 */
export async function getSourceRightsOrNull(
  sourceId: string
): Promise<SourceRights | null> {
  const read = await readSourceRegister();
  return read.rights.get(sourceId) ?? null;
}
