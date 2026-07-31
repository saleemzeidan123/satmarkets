import { type Loc } from "@/lib/format";
import {
  type RentIndexCell,
  type RentIndexQuoteGate,
  rentIndexQuoteGate,
  withheldGate,
} from "@/lib/rentIndexEvidence";
import { getSourceRightsOrNull } from "@/lib/queries/sourceRights";
import { REGA_RENT_INDEX_SOURCE_ID } from "@/lib/sources/catalogue";
import { quoteStatement } from "@/lib/publicQuote";

// ADV-1E. The batch form of the one decision, for the twelve surfaces that read
// `rent_index_published` in bulk.
//
// WHY THIS EXISTS AT ALL.
//
// `rentIndexQuoteGate` decides one cell and is synchronous, because the rights
// row is passed in. Almost every reader of this table fetches many rows at once
// and then builds a Map: listings, compare, map, market, locations, the home
// page hero, the flyer, saved searches, the shortlist. Each of them asked the
// same wrong question, `sufficient = true`, and each of them would otherwise
// have grown its own copy of the rights read, the loop and the fallback. Twelve
// copies of a decision is how finding 90 happened once already.
//
// So the rights read happens here, once per request (the loader is wrapped in
// React `cache`, so repeated calls inside one render are free), and the caller
// receives back only the rows it may quote, plus the sentences that must travel
// with them, plus a count of what was withheld.
//
// WHY THE COUNT IS RETURNED AND THE ROWS ARE NOT.
//
// A withheld row must not reach the caller, because a caller holding it will
// eventually render it. But a caller that silently receives four rows where the
// table holds seven will describe four as the market, and a shortened market is
// a claim too. The count lets a surface say that something is missing without
// saying what, which is the only honest position when the figure itself is what
// we may not disclose.
//
// FAILURE.
//
// A failed rights read withholds everything. It is the case where we know
// least, and `sourceRights.ts` already states the asymmetry this follows: the
// product losing a figure is a visible, recoverable fault, and the product
// publishing an unlicensed figure is not.
//
// No em dashes (Law 2).

export type QuotedRow<T> = {
  readonly row: T;
  readonly gate: RentIndexQuoteGate;
};

export type QuotableRows<T> = {
  /** Only the rows whose figure may be quoted, in the order given. */
  readonly rows: readonly QuotedRow<T>[];
  /** The distinct sentences that must accompany those figures. */
  readonly statements: readonly string[];
  /** How many rows were dropped. Never which, and never why. */
  readonly withheld: number;
};

/**
 * Decide a batch of published cells.
 *
 * `geographyOf` supplies the district name already resolved into the reader's
 * language, for the same reason `RentIndexEvidenceOptions` asks for it: this
 * module holds neither spelling and choosing one would put an English place
 * name on the Arabic page. Callers that do not render a passport may omit it.
 */
export async function quotableRentIndexRows<T extends RentIndexCell>(
  rows: readonly T[],
  locale: Loc,
  geographyOf?: (row: T) => string | null,
): Promise<QuotableRows<T>> {
  if (!rows.length) return { rows: [], statements: [], withheld: 0 };

  let rights = null;
  try {
    rights = await getSourceRightsOrNull(REGA_RENT_INDEX_SOURCE_ID);
  } catch {
    const s = quoteStatement("withheld", locale === "ar");
    return { rows: [], statements: s ? [s] : [], withheld: rows.length };
  }

  const out: QuotedRow<T>[] = [];
  const statements: string[] = [];
  let withheld = 0;

  for (const row of rows) {
    const gate = rentIndexQuoteGate(
      row,
      { locale, geography: geographyOf ? geographyOf(row) : null },
      rights,
    );
    if (!gate.mayShowFigure) {
      withheld += 1;
      continue;
    }
    out.push({ row, gate });
    if (gate.statement && !statements.includes(gate.statement)) statements.push(gate.statement);
  }

  if (withheld > 0) {
    const s = quoteStatement("withheld", locale === "ar");
    if (s && !statements.includes(s)) statements.push(s);
  }

  return { rows: out, statements, withheld };
}

/**
 * Every row, each carrying its own verdict, for the surfaces that render a row
 * even when the figure inside it is withheld.
 *
 * The Rent Index cut on the listings page is the case this exists for: it lists
 * a segment per row and prints "not enough data" in the figure cell for a thin
 * sample, so dropping a withheld row would erase the segment itself rather than
 * the figure, and a reader comparing two districts would not know one of them
 * had been removed from the comparison.
 *
 * THE DANGER, STATED PLAINLY. Unlike `quotableRentIndexRows`, this hands the
 * caller rows it may not quote. Every caller must test `gate.mayShowFigure`
 * before printing `median`, `band_low`, `band_high` or anything computed from
 * them. Use `quotableRentIndexRows` unless the row shell genuinely has to
 * survive the figure.
 */
export async function decidedRentIndexRows<T extends RentIndexCell>(
  rows: readonly T[],
  locale: Loc,
  geographyOf?: (row: T) => string | null,
): Promise<QuotableRows<T>> {
  if (!rows.length) return { rows: [], statements: [], withheld: 0 };

  const fallback = (): QuotableRows<T> => {
    const s = quoteStatement("withheld", locale === "ar");
    return {
      rows: rows.map((row) => ({ row, gate: withheldGate(locale) })),
      statements: s ? [s] : [],
      withheld: rows.length,
    };
  };

  let rights = null;
  try {
    rights = await getSourceRightsOrNull(REGA_RENT_INDEX_SOURCE_ID);
  } catch {
    return fallback();
  }

  const out: QuotedRow<T>[] = [];
  const statements: string[] = [];
  let withheld = 0;

  for (const row of rows) {
    const gate = rentIndexQuoteGate(
      row,
      { locale, geography: geographyOf ? geographyOf(row) : null },
      rights,
    );
    out.push({ row, gate });
    if (!gate.mayShowFigure) withheld += 1;
    else if (gate.statement && !statements.includes(gate.statement)) statements.push(gate.statement);
  }

  if (withheld > 0) {
    const s = quoteStatement("withheld", locale === "ar");
    if (s && !statements.includes(s)) statements.push(s);
  }

  return { rows: out, statements, withheld };
}

/** The rows alone, for callers that render no sentence of their own. */
export async function quotableRentIndexOnly<T extends RentIndexCell>(
  rows: readonly T[],
  locale: Loc,
): Promise<T[]> {
  const q = await quotableRentIndexRows(rows, locale);
  return q.rows.map((r) => r.row);
}
