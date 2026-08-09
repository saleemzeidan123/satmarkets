import { getSupabaseServer } from "@/lib/supabase/server";

// PKG-DISCOVERY-1, item 6. The public bilingual directory of owners and
// licensed brokers who currently have at least one commercial space live on
// the exchange.
//
// WHY A DEDICATED QUERY MODULE. `src/lib/queries/listings.ts` already reads
// `listers_public` for a single account (`getLister`); this reads it as a
// paginated, filterable set for the directory route, which is a different
// shape of query (offset/limit, a real total, a role filter) and belongs
// next to it rather than inside it.
//
// PAGINATION, NOT A CAP. The directory used to be a single `.limit(200)`
// read with no page 2: "browse every lister" and a 200-row ceiling
// contradict each other the moment the platform has a 201st lister, and
// nothing on the page would have said so. `listListers` takes a page number
// and returns a real total from a separate `count: "exact"` aggregate, not
// derived from the truncated page it also returns, so the total is honest
// even though the page is bounded. Offset pagination (not a cursor) is the
// deliberate choice here: `listers_public` is a small, slow-growing set (one
// row per account with at least one published listing), not a
// high-write-volume feed where a concurrent insert could skew an offset
// page, so the extra complexity of a cursor buys nothing a directory this
// size needs.
export const LISTERS_PAGE_SIZE = 24;

export type ListerRole = "owner" | "broker";

export type ListerRow = {
  id: string;
  name_en: string | null;
  name_ar: string | null;
  lister_type: string;
  is_operator: boolean;
  is_verified: boolean;
  is_demo: boolean;
  logo_url: string | null;
  member_since: string | null;
};

export type ListersPage = {
  /** False only when the database could not be reached at all. */
  dataOk: boolean;
  rows: ListerRow[];
  /** The real total matching the current filter, from a separate exact count. */
  total: number;
  page: number;
  pageSize: number;
};

export type ListersPageInfo = {
  /** 1 when there is nothing to page over, never 0: a page count of zero would
   * make `page > totalPages` true for the ordinary first-page, no-results
   * case, which is a genuine empty result and not a continuation failure. */
  totalPages: number;
  /** True only when the total is real (> 0) AND the requested page is past
   * the last one it supports: a distinct condition from "nothing matched". */
  pastEnd: boolean;
  /** 1-based first and last row index shown on this page, both 0 when the
   * total itself is 0, so a caller can never print "Showing 1 to 24 of 0". */
  from: number;
  to: number;
};

/**
 * The pure arithmetic behind the directory's pagination controls and its
 * "Showing X to Y of Z" line, pulled out of the route component so it can be
 * asserted directly rather than only through a render nothing in this
 * codebase's test runner can perform (no React rendering library is wired
 * into `npm test`; see package.json).
 */
export function listersPageInfo(total: number, page: number, pageSize: number): ListersPageInfo {
  const totalPages = total > 0 ? Math.ceil(total / pageSize) : 1;
  const pastEnd = total > 0 && page > totalPages;
  const from = total > 0 ? (page - 1) * pageSize + 1 : 0;
  const to = total > 0 ? Math.min(page * pageSize, total) : 0;
  return { totalPages, pastEnd, from, to };
}

export async function listListers(opts: { page?: number; role?: ListerRole | null }): Promise<ListersPage> {
  const page = Math.max(1, Math.floor(opts.page ?? 1));
  const pageSize = LISTERS_PAGE_SIZE;
  const sb = await getSupabaseServer();
  if (!sb) return { dataOk: false, rows: [], total: 0, page, pageSize };

  let query = sb
    .from("listers_public")
    .select("id,name_en,name_ar,lister_type,is_operator,is_verified,is_demo,logo_url,member_since", { count: "exact" });
  if (opts.role) query = query.eq("lister_type", opts.role);

  const start = (page - 1) * pageSize;
  const { data, count, error } = await query
    .order("member_since", { ascending: true, nullsFirst: false })
    .order("id", { ascending: true })
    .range(start, start + pageSize - 1);

  if (error) return { dataOk: false, rows: [], total: 0, page, pageSize };
  return { dataOk: true, rows: (data as ListerRow[]) ?? [], total: count ?? 0, page, pageSize };
}
