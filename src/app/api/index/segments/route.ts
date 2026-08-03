import { NextResponse } from "next/server";
import { allow } from "@/lib/ratelimit";
import { getSupabaseServer } from "@/lib/supabase/server";
import { toPublicSegment, type IndexRowLike } from "@/lib/market/segments";
import { type RentIndexCell, rentIndexQuoteGate } from "@/lib/rentIndexEvidence";
import { getSourceRightsOrNull } from "@/lib/queries/sourceRights";
import { REGA_RENT_INDEX_SOURCE_ID } from "@/lib/sources/catalogue";
import { quoteStatement } from "@/lib/publicQuote";

// Public, already-published index rows, used by the deal analyser and the watch
// banner. Same data the /rent-index page renders. Law 3: published rows only,
// nothing computed or estimated here.
//
// The payload exposes the figure as `average`, never `median`: the stored value
// is an arithmetic average (see lib/market/segments.ts for the evidence chain).
// The internal column name stays `median` only until the supervised rename.
//
// ADV-1E, CODEX ITEM 1 AND ITEM 2.
//
// This route used to be the plainest form of finding 90. It asked one question,
// `sufficient = true`, and serialised the figure for every row that answered
// yes. Sufficiency is a statistical property of a sample. It says nothing about
// whether SAT holds the right to publish the number, and an API is the surface
// where that distinction matters most, because a JSON figure travels further
// than a rendered one: into analytics jobs, into caches, into AI retrieval, and
// into places where no banner, no passport and no `noindex` header follows it.
//
// So the same decision the page and the Advisor take is taken here, per row,
// before serialisation. A row whose figure may not be quoted is absent from the
// array. Not null, not zeroed, not flagged for a client to filter: absent, so
// there is no key for a future consumer to read.
//
// WHY THERE IS NO NARROW FALLBACK HERE.
//
// The other two readers of this table use a wide-then-narrow pair of selects,
// because PostgREST fails the whole query on an unknown column and those two
// surfaces can still render something honest from the narrow row: a page can
// say the figure is unavailable. This payload is nothing but figures. A narrow
// row lacks `data_class`, `is_demo` and `sufficient`, every unknown resolves to
// the restrictive side, the gate withholds all of them, and the array comes out
// empty. The fallback would be a longer road to the same empty array, so the
// route takes the one select and returns nothing when it cannot be read.
export const revalidate = 1800;

const COLUMNS =
  "district_label, district_label_ar, district_id, asset_type, segment, band_low, band_high, median, unit, period, source, sufficient, stat_kind, data_class, is_demo";

export async function GET(req: Request) {
  if (!allow("index-segments", req, 60)) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  const sb = await getSupabaseServer();
  if (!sb) return NextResponse.json({ segments: [], notes: [], withheld: 0 });

  // The statement has to reach the reader in the reader's language, and this
  // route has no reader: it is called from both locales by two client
  // components that each know their own. So the locale is asked for rather than
  // guessed, and English is the default because it is what an unlabelled
  // machine consumer gets everywhere else in this codebase.
  const ar = new URL(req.url).searchParams.get("locale") === "ar";
  const locale = ar ? ("ar" as const) : ("en" as const);

  const { data, error } = await sb
    .from("rent_index_published")
    .select(COLUMNS)
    .eq("sufficient", true)
    .order("median", { ascending: false });
  if (error || !data) return NextResponse.json({ segments: [], notes: [], withheld: 0 });

  // Read once, outside the loop. The rights row is a property of the source,
  // not of the row, and re-reading it per row would be one network call per
  // district for an answer that cannot differ between them.
  let rights = null;
  let rightsRead = true;
  try {
    rights = await getSourceRightsOrNull(REGA_RENT_INDEX_SOURCE_ID);
  } catch {
    rightsRead = false;
  }

  const segments: Array<Record<string, unknown>> = [];
  const notes: string[] = [];
  let withheld = 0;

  for (const row of (data ?? []) as unknown as Array<IndexRowLike & RentIndexCell>) {
    // A failed rights read is not a reason to publish. It is the one case where
    // we know least, so it withholds every row rather than falling through to
    // the licence branch with a null that reads as "no rights recorded".
    const gate = rightsRead
      ? rentIndexQuoteGate(row as RentIndexCell, { locale, geography: ar ? (row.district_label_ar || row.district_label) : row.district_label }, rights)
      : null;
    if (!gate || !gate.mayShowFigure) {
      withheld += 1;
      continue;
    }
    // Finding 91. `sourceText` replaces the stored `source` column, and
    // `proseSource` travels with the row because the client composes a deal
    // check sentence from it and must not write its own attribution. Both come
    // out of the same gate as `quote` and `statement`, so a consumer reading
    // this array cannot assemble a figure and a source that disagree.
    segments.push({
      ...toPublicSegment(row as IndexRowLike, gate.sourceText),
      quote: gate.kind,
      statement: gate.statement,
      proseSource: gate.proseSource,
    });
    // Codex item 3: sample data stays identified as sample data wherever the
    // figure goes, including into a payload a component will render without
    // reading this file. The statement travels on the row AND is collected here
    // so a consumer showing one list can label the list once.
    if (gate.statement && !notes.includes(gate.statement)) notes.push(gate.statement);
  }

  // Rows dropped for want of publication rights are counted, never named. A
  // count is not a figure and it stops the shorter list from reading as a
  // complete one, which is the quiet way a withheld market becomes an
  // apparently small one.
  if (withheld > 0) {
    const s = quoteStatement("withheld", ar);
    if (s && !notes.includes(s)) notes.push(s);
  }

  return NextResponse.json({ segments, notes, withheld });
}
