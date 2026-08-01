import { formatInteger, formatUnit, bidiIsolate, type Loc } from "./format";

/**
 * PKG-SUP2. A listing's public figures, stated once.
 *
 * `requirementFigures.ts` is this module's demand-side twin, and it exists for
 * the same reason: ten surfaces were each spelling a listing's area and price
 * themselves, and where a surface spells a figure it also decides, privately,
 * what the figure means. Three of them decided wrong.
 *
 * THE UNIT. `listings.asking_rent_sqm` is collected by a form whose own label
 * reads "Asking rent (SAR per sqm per year)" and, in Arabic,
 * "الإيجار المطلوب (ريال للمتر المربع سنوياً)" (`ListingStudio.tsx`). The public
 * listing page, the compare table, the map pin and the broker profile all render
 * it as a per-year rate. The lister's own dashboard, their own listing table and
 * `/find` rendered it as `SAR/m²`, with the year taken off. So the one person
 * who has to be able to check that their price is stated correctly was the one
 * person shown it stated incorrectly, and a rate that is annual read as a rate
 * that is not.
 *
 * THE ABSENT FIGURE. `area_sqm` is nullable. The printable flyer rendered
 * `${l.area_sqm} m²`, which prints `null m²` on a document a broker hands to a
 * client, and the dashboard's requirement panel rendered
 * `(b.size_min_sqm || "?")`, which prints `? to ? m²` for a brief whose author
 * deliberately left the size open. An unstated figure is stated by drawing
 * nothing, never by drawing the sentence around a hole.
 *
 * THE NUMERALS. `Number(price).toLocaleString()` with no locale argument
 * resolves the RUNTIME default, and two of these surfaces are client components,
 * so on a device set to Arabic the explore card and the saved shortlist emitted
 * Arabic-Indic digits on a public page. That is the first defect `format.ts` was
 * written to kill, still live on the most-viewed surface on the site.
 *
 * Every function here returns `null` for a figure the record does not state.
 * Null is not "zero", not "?" and not the empty string: it is the caller's
 * instruction to draw no line at all.
 */

export type StatedFigure = string | null;

/**
 * A stored value as a number, or null if the record does not state one.
 *
 * PostgREST hands `numeric` columns back as strings, so a string that parses is
 * a stated figure. A string that does not parse, a non-finite value or an object
 * is a fault upstream rather than something the lister typed, and a fault is
 * withheld rather than printed as NaN.
 */
const num = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const isolate = (body: string, locale: Loc): string => (locale === "ar" ? bidiIsolate(body) : body);

/**
 * The unit a listing's headline price is quoted in, decided by the deal type and
 * nowhere else.
 *
 * A lease is quoted per square metre per year; a sale is a single amount. The
 * two are different units for the same column pair, which is why every caller
 * that decided this inline eventually decided it differently.
 */
export const priceUnitKey = (deal: string | null | undefined): "sar_sqm_year" | "sar" =>
  String(deal ?? "").toLowerCase() === "sale" ? "sar" : "sar_sqm_year";

/** The rendered unit for a listing's headline price, for surfaces that show it beside the figure. */
export const priceUnit = (deal: string | null | undefined, locale: Loc, length: "long" | "short" = "short"): string =>
  formatUnit(priceUnitKey(deal), locale, length);

/**
 * A listing's net area: `2,000 m²` / `2,000 م²`, grouped, in Western numerals in
 * both languages, and isolated in Arabic so the digits and the unit cannot swap
 * places inside a right-to-left line. Null when the record states no area.
 */
export function netArea(area: unknown, locale: Loc): StatedFigure {
  const n = num(area);
  if (n === null) return null;
  return isolate(`${formatInteger(n, locale)} ${formatUnit("sqm", locale)}`, locale);
}

/**
 * A listing's headline price split into the amount and its unit, for the two
 * surfaces that set the unit in a smaller weight beside the figure.
 *
 * They exist because a card wants the number to carry the visual weight and the
 * unit to sit quietly next to it. That is a typographic decision and it is
 * allowed. Deciding what the unit SAYS is not, which is why the split happens
 * here rather than in the card: both parts still come from one place, and a
 * caller that takes the amount cannot take it without the unit that qualifies it.
 * Null when the record states no price.
 */
export function priceParts(
  price: unknown,
  deal: string | null | undefined,
  locale: Loc,
  length: "long" | "short" = "short",
): { value: string; unit: string } | null {
  const n = num(price);
  if (n === null) return null;
  return { value: formatInteger(n, locale), unit: priceUnit(deal, locale, length) };
}

/**
 * A listing's headline price with the unit its deal type gives it. Null when the
 * record states no price, which is the case the surfaces render as "on request".
 */
export function askingPrice(
  price: unknown,
  deal: string | null | undefined,
  locale: Loc,
  length: "long" | "short" = "short",
): StatedFigure {
  const p = priceParts(price, deal, locale, length);
  if (p === null) return null;
  return isolate(`${p.value} ${p.unit}`, locale);
}

/**
 * The annual rent for the whole space: the per-square-metre rate multiplied by
 * the area.
 *
 * This is a DERIVED figure, so it is stated only where both of its inputs are
 * stated. A missing area silently treated as zero, or a missing rate treated as
 * zero, would produce a total nobody wrote down and no record supports, which is
 * the standing rule against invented figures applied to arithmetic rather than
 * to copy. It is also only meaningful for a lease: a sale price is already the
 * whole amount, and multiplying it by an area would state a number that means
 * nothing.
 */
export function annualTotal(
  rentPerSqm: unknown,
  area: unknown,
  deal: string | null | undefined,
  locale: Loc,
  length: "long" | "short" = "short",
): StatedFigure {
  if (priceUnitKey(deal) !== "sar_sqm_year") return null;
  const rate = num(rentPerSqm);
  const sqm = num(area);
  if (rate === null || sqm === null) return null;
  const total = rate * sqm;
  if (!Number.isFinite(total)) return null;
  return isolate(`${formatInteger(total, locale)} ${formatUnit("sar_year", locale, length)}`, locale);
}
