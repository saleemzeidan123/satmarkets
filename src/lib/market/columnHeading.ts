import { normalizeStatisticKind, statisticLabel, type StatisticKind } from "@/lib/evidence";
import { fill, resolveUnitKey, unitText, type Loc, type UnitKey } from "@/lib/format";

/**
 * PKG-FIG2 closure, finding 132. What a column of figures is, resolved from the
 * figures rather than asserted in the copy above them.
 *
 * The defect this closes: two tables printed the header "Average SAR/m²" over
 * rows whose stored unit was `SAR/m2/yr`, and whose `stat_kind` the header never
 * read. Both halves were wrong in a way a reader cannot detect. The statistic
 * was a word someone typed once, so a median row and an average row got the same
 * heading; and the unit dropped the period, and 1,650 SAR/m² is not the same
 * claim as 1,650 SAR/m²/yr. It is off by a factor of twelve if the reader
 * assumes a month, and the reader has no way to know they should not.
 *
 * The rule here is the one the passports already follow: name a thing only if
 * every record under it agrees, and say nothing rather than guess. A column of
 * mixed statistics has no statistic, so it gets the neutral quantity word. A
 * column of mixed or unresolvable units has no unit, so none is printed.
 *
 * A unit and a statistic name are not market figures, so resolving a heading
 * over rows whose figures the licence withheld publishes nothing that Codex
 * item 2 fences. The heading describes the column; the cells decide, one by one,
 * whether they have anything to put in it.
 */
export type FigureCell = {
  statistic: StatisticKind;
  /** Null where the stored unit was absent or did not resolve through the one table. */
  unit: UnitKey | null;
};

/**
 * A cell read off a raw index row. Deliberately tolerant of a narrow select:
 * a row that arrives without `unit` resolves to null and the heading then names
 * no unit, which is the safe direction. An unrecognised `stat_kind` becomes
 * `unknown`, which never earns a name.
 */
export const figureCellOf = (row: { stat_kind?: unknown; unit?: unknown }): FigureCell => ({
  statistic: normalizeStatisticKind(row?.stat_kind as string | null | undefined),
  unit: resolveUnitKey(row?.unit as string | null | undefined),
});

/** The statistic every cell agrees on, or null. `unknown` never counts as agreement. */
export function agreedStatistic(cells: readonly FigureCell[]): StatisticKind | null {
  if (!cells.length) return null;
  const first = cells[0].statistic;
  if (first === "unknown") return null;
  return cells.every((c) => c.statistic === first) ? first : null;
}

/** The unit every cell agrees on, or null. A single null unit denies the whole column. */
export function agreedUnit(cells: readonly FigureCell[]): UnitKey | null {
  if (!cells.length) return null;
  const first = cells[0].unit;
  if (!first) return null;
  return cells.every((c) => c.unit === first) ? first : null;
}

/**
 * `word`, with the unit after it in the reader's language, or `word` alone.
 *
 * `pattern` is `common.statUnit`, the one sentence shape that puts a quantity
 * word and a unit together. It lives in the dictionary rather than here because
 * the two languages separate them differently: English with a space, Arabic with
 * an Arabic comma.
 */
export function appendUnit(word: string, unit: UnitKey | null, locale: Loc, pattern: string): string {
  return unit ? fill(pattern, { stat: word, unit: unitText(unit, locale, "short") }) : word;
}

/** `appendUnit` over the unit the cells agree on. */
export function withUnit(word: string, cells: readonly FigureCell[], locale: Loc, pattern: string): string {
  return appendUnit(word, agreedUnit(cells), locale, pattern);
}

/**
 * The heading for a column of figures: the statistic the cells agree on, or the
 * neutral quantity word, followed by the unit they agree on, or nothing.
 */
export function statUnitHeading(
  cells: readonly FigureCell[],
  locale: Loc,
  words: { neutral: string; pattern: string },
): string {
  const s = agreedStatistic(cells);
  return withUnit(s ? statisticLabel(s, locale === "ar") : words.neutral, cells, locale, words.pattern);
}
