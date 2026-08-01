import { bidiIsolate, formatInteger, formatUnit, type Loc } from "./format";

/**
 * PKG-DEM2, findings 114 and 115. How a requirement's size and budget are read.
 *
 * WHAT THIS EXISTS TO STOP HAPPENING.
 *
 * Size and budget are optional on the public form and nullable in the column.
 * `RequirementForm` sends `Number(sizeMin) || null`, so a visitor who leaves
 * either blank stores a null, and PKG-DEM1 is what made that path reachable at
 * all: before it, the form could not submit.
 *
 * The two public surfaces then interpolated the raw values. The board rendered
 * `{r.sizeMin} to {r.sizeMax} m²`, so an unstated size printed the word `null`
 * twice, and it rendered `Number(r.budget).toLocaleString("en-US")`, which for
 * a null budget is not blank and is not an error: it is the string `0`. A
 * visitor would have been shown a requirement whose occupier had stated no
 * budget as a requirement with a budget of zero. That is an invented figure on
 * a public surface, which is the one thing this platform's standing law does
 * not allow, and it was invented by arithmetic rather than by anybody's
 * judgement, which is why no review caught it.
 *
 * The same fact also had three renderings. The board and the detail card both
 * printed `null to null m²`; the lister-facing dashboard already read the nulls
 * honestly but said `200 to ? m²` for a half-open range and spelled its own
 * unit. None of the three went through `src/lib/format.ts`, the module this
 * platform built precisely so that a figure has exactly one rendering, with
 * grouped numerals, one unit spelling per locale, and a first-strong isolate so
 * the digits and the unit do not swap places in an Arabic paragraph.
 *
 * THE CONTRACT. Each function returns either a finished string or `null`, and
 * `null` means the occupier did not state it. It never means "we failed to
 * fetch it" and it is never a number. A caller that wants a phrase for the
 * unstated case supplies its own from its own dictionary, because what to say
 * in place of a figure is a decision about a surface, not about a figure.
 *
 * The connective words live here rather than in a dictionary for the same
 * reason `formatRange` holds "to" and "إلى": they are part of the figure's
 * grammar, not copy, and a range whose two halves were assembled in different
 * files is how finding 100 happened. `scripts/ar-lint.mjs` reads this file, so
 * the Arabic below is inside the same banned-term gate as `format.ts`.
 */

/** A finished figure, or `null` meaning the occupier stated none. */
export type StatedFigure = string | null;

/**
 * Anything the API or the column can carry, reduced to a number or to nothing.
 * A numeric string is a number: `budget_sqm_max` is `numeric` and PostgREST
 * hands some numerics back as strings. `NaN` and `Infinity` are nothing, because
 * a figure that cannot be printed is not a figure the occupier stated.
 */
const num = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const WORD = {
  to: { en: "to", ar: "إلى" },
  from: { en: "from", ar: "من" },
  upTo: { en: "up to", ar: "حتى" },
} as const;

/** Isolate on the same rule `formatArea` uses: the Arabic paragraph is the one that reorders. */
const isolate = (body: string, locale: Loc): string => (locale === "ar" ? bidiIsolate(body) : body);

/**
 * The size a requirement asks for.
 *
 * A half-open range is stated as the one bound that exists rather than filled in
 * with a placeholder. "from 500 m²" is what an occupier who typed a minimum and
 * no maximum actually said; `500 to ? m²` invites the reader to supply the
 * missing half, and `500 to null m²` is not a sentence.
 *
 * Equal bounds collapse to the single figure. An occupier who typed 500 twice
 * asked for 500 m², and "500 to 500 m²" reads as a range that failed to render.
 */
export function sizeRange(min: unknown, max: unknown, locale: Loc): StatedFigure {
  const lo = num(min);
  const hi = num(max);
  if (lo === null && hi === null) return null;
  const unit = formatUnit("sqm", locale);
  let body: string;
  if (lo !== null && hi !== null) {
    body = lo === hi
      ? `${formatInteger(lo, locale)} ${unit}`
      : `${formatInteger(lo, locale)} ${WORD.to[locale]} ${formatInteger(hi, locale)} ${unit}`;
  } else if (lo !== null) {
    body = `${WORD.from[locale]} ${formatInteger(lo, locale)} ${unit}`;
  } else {
    body = `${WORD.upTo[locale]} ${formatInteger(hi as number, locale)} ${unit}`;
  }
  return isolate(body, locale);
}

/**
 * The budget a requirement states, which is a ceiling and says so.
 *
 * The column is `budget_sqm_max`, and the board already prefixed the figure with
 * "up to" while the detail card printed it bare under the label "Budget", so the
 * same stored number was a ceiling on one screen and a price on the other. It is
 * a ceiling on both now, and the ceiling is part of the figure rather than a
 * word a caller remembers to add.
 *
 * A lease budget is per square metre per year and a purchase budget is a total,
 * which is why the deal type is an argument: the unit is not a property of the
 * number.
 */
export function budgetCeiling(budget: unknown, deal: string | null | undefined, locale: Loc): StatedFigure {
  const n = num(budget);
  if (n === null) return null;
  const unit = formatUnit(deal === "lease" ? "sar_sqm_year" : "sar", locale, "short");
  return isolate(`${WORD.upTo[locale]} ${formatInteger(n, locale)} ${unit}`, locale);
}
