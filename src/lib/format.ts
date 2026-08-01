// Typed unit, plural and numeral formatters (WS11, PKG-1C).
//
// THREE DEFECTS THIS EXISTS TO KILL.
//
// 1. Numerals. Figures were rendered with a bare `n.toLocaleString()`, which
//    resolves the RUNTIME default locale, not the page locale. On a device set to
//    Arabic that emits Arabic-Indic digits for 1250, which breaks the global law
//    that numerals stay Western in both languages. Every number now goes through
//    one function that pins the numbering system to Latin, whatever the device.
//
// 2. Units. The same unit was spelled six ways across the codebase: SAR/m2*yr,
//    SAR/m2/year, SAR / m2 / yr, and three Arabic variants including one with
//    spaces around the slash. A unit is now a typed key with exactly one
//    rendering per locale and per length.
//
// 3. Plurals. Arabic was given English plural logic, so "3 months" became a
//    literal "3 شهر" or an invented form. Arabic has six plural categories, and
//    the noun case changes with them (3 to 10 takes the plural اشهر, 11 to 99
//    takes the accusative singular شهرا). Both languages now go through one
//    typed selector whose categories are asserted against Intl.PluralRules.
//
// BIDI. Western numerals inside Arabic prose are fine on their own, but a
// COMPOSITE token (a figure plus its unit, a range, a reference code) can be
// rearranged by the surrounding paragraph when the two halves have different
// directions. The composite is therefore wrapped in a FIRST-STRONG isolate,
// U+2068, not a left-to-right isolate. This matters and the difference is not
// cosmetic: "2,000 م²" is an Arabic-script composite and must stay right to
// left, so forcing LTR would visually put the unit on the wrong side, while
// "1,600 SAR/m²/year" is Latin and must stay left to right. First-strong picks
// the direction from the content and gets BOTH right; a hardcoded LRI gets the
// Arabic case wrong. Isolation is invisible and zero-width, it is not a nowrap,
// and it cannot cause an overflow.

export type Loc = "en" | "ar";

// U+2068 FIRST STRONG ISOLATE / U+2069 POP DIRECTIONAL ISOLATE.
const FSI = "\u2068";
const PDI = "\u2069";
// U+2066 LEFT-TO-RIGHT ISOLATE, for the rare run that must read left to right
// whatever it contains (the numeric magnitude axis on the band chart).
const LRI = "\u2066";
// U+2060 WORD JOINER: no break opportunity, no width, no space. Keeps a unit
// token whole without a hard nowrap, so `overflow-wrap:anywhere` can still break
// it if a line genuinely cannot hold it (the PKG-1B.2 closure rule).
const WJ = "\u2060";

/**
 * Wrap a composite token so the surrounding paragraph cannot reorder its parts.
 * The run keeps its own natural direction, taken from its first strong character.
 */
export const bidiIsolate = (s: string): string => `${FSI}${s}${PDI}`;

/** Force a run to read left to right regardless of content. Used for numeric axes. */
export const ltrIsolate = (s: string): string => `${LRI}${s}${PDI}`;

/** Insert word joiners around the separators of a unit so it never breaks mid-unit. */
const joinUnit = (s: string): string => s.replace(/([/·])/g, `${WJ}$1${WJ}`);

// ----------------------------------------------------------------- numerals

/**
 * The one numeral formatter. Latin digits are pinned explicitly for BOTH
 * locales (`-u-nu-latn`), so a device set to an Arabic locale cannot swap the
 * numbering system. Grouping is the Western comma in both languages, which is
 * what Saudi commercial practice and every figure on this site already uses.
 */
export function formatNumber(n: number, _locale: Loc = "en", opts: Intl.NumberFormatOptions = {}): string {
  if (!Number.isFinite(n)) return "";
  return new Intl.NumberFormat("en-US-u-nu-latn", opts).format(n);
}

/** A whole number: 1250.4 renders as 1,250. */
export const formatInteger = (n: number, locale: Loc = "en"): string =>
  formatNumber(Math.round(n), locale, { maximumFractionDigits: 0 });

/** A figure with at most `dp` decimals and no trailing zeros: 1250.04 stays 1,250.04. */
export const formatDecimal = (n: number, locale: Loc = "en", dp = 2): string =>
  formatNumber(n, locale, { maximumFractionDigits: dp });

/** A percentage. The sign is kept for a change figure: +5.2%, -1.8%. */
export function formatPercent(n: number, locale: Loc = "en", opts: { signed?: boolean; dp?: number } = {}): string {
  const dp = opts.dp ?? 1;
  const body = `${formatNumber(Math.abs(n), locale, { maximumFractionDigits: dp })}%`;
  const sign = opts.signed ? (n > 0 ? "+" : n < 0 ? "-" : "") : n < 0 ? "-" : "";
  return locale === "ar" ? bidiIsolate(`${sign}${body}`) : `${sign}${body}`;
}

/**
 * An inclusive numeric range, always low to high, in the separator the reading
 * language uses.
 *
 * PKG-FIG1, finding 127. This function already existed, and six surfaces spelled
 * the separator themselves anyway, in four different ways: `1,800-2,900` with an
 * en dash and no spaces, the same with spaces, ` إلى ` branched inline, and this.
 * One of the six built the Arabic verdict sentence `النطاق 1,800-2,900` in source,
 * which puts inside Arabic prose the dash the Arabic gate exists to keep out of
 * it, in a file the gate did not walk. Arabic does not take a dash between two
 * figures: it takes إلى, and on a right-to-left line a dash between figures can
 * also be read as a minus sign.
 *
 * The isolate is the second half of the same defect. This module's own header
 * names a range as a composite that has to be wrapped so the surrounding
 * paragraph cannot reorder its parts, and this was the one composite formatter
 * here that never did it.
 */
export function formatRange(low: number, high: number, locale: Loc = "en", dp = 2): string {
  const body = `${formatDecimal(low, locale, dp)} ${locale === "ar" ? "إلى" : "to"} ${formatDecimal(high, locale, dp)}`;
  return locale === "ar" ? bidiIsolate(body) : body;
}

// -------------------------------------------------------------------- units

/**
 * Every unit the public surfaces render, as a typed key. `long` is the form used
 * in prose and in the deterministic advisor answers; `short` is the form used in
 * dense chips, table headers and cards where the long form would wrap.
 */
export const UNITS = {
  sar: { en: { long: "SAR", short: "SAR" }, ar: { long: "ريال", short: "ريال" } },
  sqm: { en: { long: "m²", short: "m²" }, ar: { long: "م²", short: "م²" } },
  metre: { en: { long: "m", short: "m" }, ar: { long: "م", short: "م" } },
  sar_sqm_year: { en: { long: "SAR/m²/year", short: "SAR/m²/yr" }, ar: { long: "ريال/م²·سنة", short: "ريال/م²·سنة" } },
  sar_sqm_month: { en: { long: "SAR/m²/month", short: "SAR/m²/mo" }, ar: { long: "ريال/م²·شهر", short: "ريال/م²·شهر" } },
  sar_desk_month: { en: { long: "SAR/desk/month", short: "SAR/desk/mo" }, ar: { long: "ريال/مكتب·شهر", short: "ريال/مكتب·شهر" } },
  sar_sqm: { en: { long: "SAR/m²", short: "SAR/m²" }, ar: { long: "ريال/م²", short: "ريال/م²" } },
  // PKG-SUP2. The whole-space annual rent, which is the per-square-metre rate
  // times the area. The compare table spelled it inline as `SAR/yr` and
  // `ريال/سنة`, so the claim two comments below this one, that the subscription
  // price was the last unit outside this table, was not true when it was
  // written: this one and `sar_sqm` were both still out here.
  sar_year: { en: { long: "SAR/year", short: "SAR/yr" }, ar: { long: "ريال/سنة", short: "ريال/سنة" } },
  // A subscription price is per month and per nothing else. The pricing page
  // spelled it inline, "SAR/mo" and "ريال/شهر", the last unit on a public page
  // still living outside this table.
  sar_month: { en: { long: "SAR/month", short: "SAR/mo" }, ar: { long: "ريال/شهر", short: "ريال/شهر" } },
  kva: { en: { long: "kVA", short: "kVA" }, ar: { long: "ك.ف.أ", short: "ك.ف.أ" } },
  pct: { en: { long: "%", short: "%" }, ar: { long: "%", short: "%" } },
} as const;

export type UnitKey = keyof typeof UNITS;

/** Legacy spellings still present in seed data and API payloads, mapped to a key. */
const UNIT_ALIASES: Record<string, UnitKey> = {
  "sar/m2/yr": "sar_sqm_year", "sar/m²/yr": "sar_sqm_year", "sar/m²·yr": "sar_sqm_year",
  // The exact string `rentBasePipeline.ts` writes into `index_cells.unit`, and
  // therefore the exact string the Rent Index rows carry. It was missing, so
  // `resolveUnitKey` answered null for the one unit the index actually uses.
  "sar_sqm_yr": "sar_sqm_year",
  "sar/m²/year": "sar_sqm_year", "sar / m² / yr": "sar_sqm_year", "sar_sqm_year": "sar_sqm_year",
  "m2/yr": "sar_sqm_year", "m²/yr": "sar_sqm_year", "sqm/yr": "sar_sqm_year",
  "sar/m2/mo": "sar_sqm_month", "sar/m²/mo": "sar_sqm_month", "m²/mo": "sar_sqm_month", "m2/mo": "sar_sqm_month",
  "sar/desk/mo": "sar_desk_month", "sar_desk_month": "sar_desk_month",
  "sar/m2": "sar_sqm", "sar/m²": "sar_sqm",
  "sar/mo": "sar_month", "sar/month": "sar_month", "sar_month": "sar_month",
  "sar/yr": "sar_year", "sar/year": "sar_year", "sar_year": "sar_year", "sar·yr": "sar_year",
  "m2": "sqm", "m²": "sqm", "sqm": "sqm",
  "sar": "sar", "kva": "kva", "%": "pct",
};

export const resolveUnitKey = (raw: string | null | undefined): UnitKey | null =>
  UNIT_ALIASES[String(raw ?? "").trim().toLowerCase()] ?? (raw && raw in UNITS ? (raw as UnitKey) : null);

/**
 * Render a unit. Unknown units are passed through verbatim rather than dropped,
 * so a new unit arriving from data is visible and reportable instead of silently
 * blank; the word joiners are still applied so it cannot break mid-token.
 */
export function formatUnit(unit: string | null | undefined, locale: Loc = "en", length: "long" | "short" = "long"): string {
  const key = resolveUnitKey(unit);
  const text = key ? UNITS[key][locale][length] : String(unit ?? "").trim();
  return joinUnit(text);
}

/** A measured area: 2,000 m² / 2,000 م², isolated so the digits and unit stay adjacent in RTL. */
export function formatArea(n: number, locale: Loc = "en"): string {
  const body = `${formatInteger(n, locale)} ${formatUnit("sqm", locale)}`;
  return locale === "ar" ? bidiIsolate(body) : body;
}

/** A figure with its unit: 1,420.5 SAR/m²/year. */
export function formatWithUnit(n: number, unit: string | null | undefined, locale: Loc = "en", length: "long" | "short" = "long", dp = 2): string {
  const body = `${formatDecimal(n, locale, dp)} ${formatUnit(unit, locale, length)}`;
  return locale === "ar" ? bidiIsolate(body) : body;
}

/** A money amount with no per-area component: 900,000 SAR / 900,000 ريال. */
export function formatMoney(n: number, locale: Loc = "en"): string {
  const body = `${formatInteger(n, locale)} ${formatUnit("sar", locale)}`;
  return locale === "ar" ? bidiIsolate(body) : body;
}

// ------------------------------------------------------------------ plurals

export type PluralCategory = "zero" | "one" | "two" | "few" | "many" | "other";

/**
 * The six CLDR forms, plus one form CLDR does not have.
 *
 * ADV-3A.1. CLDR gives Arabic a single `two` form, and for a phrase standing on
 * its own that form is right: "شهران". But Arabic marks the dual for case,
 * and every counted phrase that follows a preposition or sits in a construct is
 * oblique, where the ending is different and visible: "قبل يومين", never
 * "قبل يومان". No other category is affected, because the plural
 * ("أيام") and the accusative singular ("يوماً") already read correctly in
 * both positions.
 *
 * The alternative was to rewrite each sentence so the dual never lands after a
 * preposition. That is patching individual sentences, which is the thing the
 * finding exists to stop, and it would have to be done again for every sentence
 * written afterwards.
 */
export type PluralForms = Partial<Record<PluralCategory, string>> & {
  other: string;
  /** The Arabic dual after a preposition or in a construct. Ignored elsewhere. */
  twoOblique?: string;
};

/** Where the counted phrase sits in the sentence. Only Arabic reads this. */
export type CountOptions = {
  /**
   * True when the phrase follows a preposition (قبل, عند, في, لـ) or a governing
   * noun (مدة, خلال). Default false: the phrase stands on its own.
   */
  oblique?: boolean;
};

/**
 * CLDR plural category for a cardinal. Implemented directly rather than read off
 * Intl at render time so the rule is deterministic, testable and identical on
 * every runtime; a test asserts it agrees with Intl.PluralRules across 0 to 200.
 */
export function pluralCategory(n: number, locale: Loc): PluralCategory {
  const i = Math.abs(n);
  if (locale === "en") return i === 1 && Number.isInteger(i) ? "one" : "other";
  if (!Number.isInteger(i)) return "other";
  if (i === 0) return "zero";
  if (i === 1) return "one";
  if (i === 2) return "two";
  const mod = i % 100;
  if (mod >= 3 && mod <= 10) return "few";
  if (mod >= 11 && mod <= 99) return "many";
  return "other";
}

/** Pick the right form for a count. Falls back down the CLDR chain to `other`. */
export function plural(n: number, forms: PluralForms, locale: Loc): string {
  const cat = pluralCategory(n, locale);
  return forms[cat] ?? forms.other;
}

/**
 * Arabic counted-noun agreement in one place. The DUAL and the ZERO forms carry
 * no numeral in natural Arabic ("شهران", not "2 شهران"), which is why this
 * returns the whole phrase rather than a suffix the caller concatenates.
 */
export function formatCount(n: number, forms: PluralForms, locale: Loc, opts: CountOptions = {}): string {
  const cat = pluralCategory(n, locale);
  const oblique = locale === "ar" && cat === "two" && opts.oblique === true && forms.twoOblique !== undefined;
  const word = oblique ? (forms.twoOblique as string) : (forms[cat] ?? forms.other);
  if (locale === "ar" && (cat === "one" || cat === "two")) return word;
  // A whole count is a whole number; a fractional one keeps its fraction rather
  // than being rounded into a different figure on the way to a noun.
  const num = Number.isInteger(n) ? formatInteger(n, locale) : formatDecimal(n, locale, 2);
  return `${num} ${word}`;
}

/** The counted nouns the public surfaces use. Arabic carries all six forms. */
export const COUNTED = {
  month: {
    en: { one: "month", other: "months" },
    ar: { zero: "شهر", one: "شهر واحد", two: "شهران", twoOblique: "شهرين", few: "أشهر", many: "شهراً", other: "شهر" },
  },
  year: {
    en: { one: "year", other: "years" },
    ar: { zero: "سنة", one: "سنة واحدة", two: "سنتان", twoOblique: "سنتين", few: "سنوات", many: "سنة", other: "سنة" },
  },
  day: {
    en: { one: "day", other: "days" },
    ar: { zero: "يوم", one: "يوم واحد", two: "يومان", twoOblique: "يومين", few: "أيام", many: "يوماً", other: "يوم" },
  },
  listing: {
    en: { one: "listing", other: "listings" },
    ar: { zero: "قائمة", one: "قائمة واحدة", two: "قائمتان", twoOblique: "قائمتين", few: "قوائم", many: "قائمة", other: "قائمة" },
  },
  space: {
    en: { one: "space", other: "spaces" },
    ar: { zero: "مساحة", one: "مساحة واحدة", two: "مساحتان", twoOblique: "مساحتين", few: "مساحات", many: "مساحة", other: "مساحة" },
  },
  match: {
    en: { one: "match", other: "matches" },
    ar: { zero: "مطابقة", one: "مطابقة واحدة", two: "مطابقتان", twoOblique: "مطابقتين", few: "مطابقات", many: "مطابقة", other: "مطابقة" },
  },
  district: {
    en: { one: "district", other: "districts" },
    ar: { zero: "حي", one: "حي واحد", two: "حيان", twoOblique: "حيين", few: "أحياء", many: "حياً", other: "حي" },
  },
  result: {
    en: { one: "result", other: "results" },
    ar: { zero: "نتيجة", one: "نتيجة واحدة", two: "نتيجتان", twoOblique: "نتيجتين", few: "نتائج", many: "نتيجة", other: "نتيجة" },
  },
  leaseListing: {
    en: { one: "lease listing", other: "lease listings" },
    ar: { zero: "عرض إيجار", one: "عرض إيجار واحد", two: "عرضا إيجار", twoOblique: "عرضي إيجار", few: "عروض إيجار", many: "عرض إيجار", other: "عرض إيجار" },
  },
  liveSpace: {
    en: { one: "space on the market", other: "spaces on the market" },
    ar: { zero: "مساحة معروضة", one: "مساحة معروضة واحدة", two: "مساحتان معروضتان", twoOblique: "مساحتين معروضتين", few: "مساحات معروضة", many: "مساحة معروضة", other: "مساحة معروضة" },
  },
  rentFreeMonth: {
    en: { one: "rent free month", other: "rent free months" },
    ar: {
      zero: "شهر بلا إيجار",
      one: "شهر واحد بلا إيجار",
      two: "شهران بلا إيجار",
      twoOblique: "شهرين بلا إيجار",
      few: "أشهر بلا إيجار",
      many: "شهراً بلا إيجار",
      other: "شهر بلا إيجار",
    },
  },
} as const satisfies Record<string, { en: PluralForms; ar: PluralForms }>;

export type CountedNoun = keyof typeof COUNTED;

/**
 * formatCounted(3, "month", "ar") is "3 أشهر"; formatCounted(2, "month", "ar") is
 * "شهران", and formatCounted(2, "month", "ar", { oblique: true }) is "شهرين".
 */
export const formatCounted = (n: number, noun: CountedNoun, locale: Loc, opts: CountOptions = {}): string =>
  formatCount(n, COUNTED[noun][locale], locale, opts);

// ---------------------------------------------------------------- templates

/**
 * Fill {name} placeholders in a dictionary string.
 *
 * Prose that has to name a district, a building or a figure cannot be assembled
 * with a template literal in the page file, because that leaves half the
 * sentence in the source and out of the dictionary, which is exactly how the
 * Arabic side ends up with English word order. The whole sentence lives in both
 * dictionaries with its variable parts marked, and this puts the values in.
 *
 * A placeholder with no matching key is left VISIBLE rather than blanked, so a
 * missing variable surfaces in review instead of shipping a hole in a sentence.
 */
export function fill(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (whole, key: string) => (key in vars ? String(vars[key]) : whole));
}

/**
 * Fill a sentence whose variable parts are ALLOWED to be empty, then close the
 * gap the empty part leaves behind.
 *
 * A building grade, a district qualifier or a type word is optional data. The
 * wrong answer is to print a placeholder such as N/A inside a sentence, which is
 * how a description ends up reading "N/A Serviced in Al Aqiq" and, in Arabic,
 * how a Latin abbreviation lands in the middle of Arabic prose. The right answer
 * is for the phrase to disappear and for the sentence to still read correctly:
 * one space between words, and no space before a comma or a full stop in either
 * script.
 *
 * Only the ASCII space is collapsed. The invisible bidi isolates and word
 * joiners the unit formatters emit are left exactly where they were put.
 */
export function fillProse(template: string, vars: Record<string, string | number>): string {
  return fill(template, vars)
    .replace(/ {2,}/g, " ")
    .replace(/ ([,،.:؛])/g, "$1")
    .trim();
}
