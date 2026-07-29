import type { ParsedQuery } from "@/lib/search/queryParse";
import { figuresIn, unvouchedFigures } from "@/lib/agents/agents";
import { RENT_INDEX_SOURCE } from "@/lib/market/attribution";
import type { GoldCase, GoldLocale, ProseExpect, QueryExpect, TranslationExpect } from "./gold";

// ADV-3B. The graders.
//
// WHAT A GRADER IS FOR HERE. Not a score out of ten. A grader answers one
// question per case, and the question is whether the answer breaks a rule the
// platform already enforces everywhere else. That is a deliberately narrow job:
// nothing below has an opinion about whether an answer is well written, because
// an evaluation that scores taste turns a model swap into an argument about
// prose and quietly stops noticing the things that are not arguable.
//
// WHY THE LAW CHECKS ARE UNIVERSAL. Every text answer runs through
// `lawFailures` regardless of what the case asked for. A model is not a special
// author. If it emits an Arabic-Indic digit, it broke Law 7; if it emits an em
// dash, it broke the dash law; if it prints a licence number that is not FAL
// 1200025510, it broke the licence law. These are not case expectations that a
// case may decline to state. They are the same gates `scripts/ar-lint.mjs` runs
// over shipped source, applied to text that would be shipped if it rendered.
//
// WHY A FIGURE IS THE CENTRAL CHECK. Law 3 says no model generates a rent
// figure, a price or a market statistic. The failure mode is not a model that
// refuses to answer, it is a model that answers plausibly. `unvouchedFigures`
// is reused from the agent layer rather than reimplemented, so an evaluation
// pass and a runtime refusal cannot disagree about what counts as a figure.
//
// THE UNSTATED FIELD RULE, ENFORCED. `gradeQuery` compares every field of the
// parse, not only the fields the expectation named. A field the expectation is
// silent about must come back null or empty. Checking only what was stated
// would pass a parser that invents a city out of a query that never named one,
// which is the failure discovery exists to prevent.

// The character the dash law forbids, named by code point rather than printed,
// because shipped source may not carry it. em-dash-law
const EM_DASH = String.fromCharCode(8212);

/** Arabic-Indic and extended Arabic-Indic digits. Law 7 forbids both in both locales. */
const NON_WESTERN_DIGIT = /[٠-٩۰-۹]/;

/** Any Arabic letter. The cheapest reliable test of which language an answer is in. */
const ARABIC_SCRIPT = /[؀-ۿ]/;

/** The only licence number this platform may state. */
export const FAL_NUMBER = "1200025510";

/** A licence-shaped figure: ten digits standing alone, not part of a longer number. */
const LICENCE_SHAPED = /(?<![\d,.])\d{10}(?![\d,.])/g;

const BANNED_PHRASES = [/company deck/i, /عرض الشركة/];

export type GradeVerdict = {
  ok: boolean;
  /** One sentence per broken rule, in English, naming the rule and not the model. */
  failures: readonly string[];
};

/** What a subject returned: a parse for a classification case, text for the rest. */
export type GoldAnswer =
  | { kind: "parse"; parsed: ParsedQuery }
  | { kind: "text"; text: string };

/**
 * The language a correct answer is written in.
 *
 * A translation case is the one place the answer is not in the case's own
 * locale: an English listing title is graded on its Arabic rendering. Getting
 * this backwards would fail every translation case on the script check and
 * report it as a language defect, which is the kind of wrong result that gets
 * an evaluation harness switched off.
 */
export function answerLocale(c: GoldCase): GoldLocale {
  if (c.profile === "bilingual_translation") return c.locale === "en" ? "ar" : "en";
  return c.locale;
}

/**
 * The rules that apply to any text this platform would render, in either language.
 */
export function lawFailures(text: string, locale: GoldLocale): string[] {
  const out: string[] = [];
  if (!text.trim()) {
    out.push("the answer is empty");
    return out;
  }
  if (text.includes(EM_DASH)) out.push("dash law: the answer contains an em dash");
  if (NON_WESTERN_DIGIT.test(text)) out.push("law 7: the answer contains a non-Western numeral");
  for (const m of text.match(LICENCE_SHAPED) ?? []) {
    if (m !== FAL_NUMBER) out.push(`licence law: the answer states ${m}, which is not FAL ${FAL_NUMBER}`);
  }
  for (const re of BANNED_PHRASES) {
    if (re.test(text)) out.push("vocabulary law: the answer uses a forbidden phrase");
  }
  const hasArabic = ARABIC_SCRIPT.test(text);
  if (locale === "ar" && !hasArabic) out.push("the answer to an Arabic case is not written in Arabic");
  if (locale === "en" && hasArabic) out.push("the answer to an English case is not written in English");
  return out;
}

// ------------------------------------------------------------- classification

const SLOTS = ["asset", "grade", "fitout", "deal", "city"] as const;
const FIGURE_SLOTS = ["priceMax", "priceMin", "areaTarget", "areaMin", "areaMax"] as const;

const sameSet = (a: readonly string[], b: readonly string[]): boolean => {
  if (a.length !== b.length) return false;
  const left = [...a].sort();
  const right = [...b].sort();
  return left.every((v, i) => v === right[i]);
};

/**
 * Grade one parse against one expectation, field by field, including the fields
 * the expectation did not name.
 */
export function gradeQuery(expect: QueryExpect, p: ParsedQuery): GradeVerdict {
  const failures: string[] = [];
  for (const k of SLOTS) {
    const want = expect[k] ?? null;
    const got = p[k];
    if (got !== want) failures.push(`${k}: read ${JSON.stringify(got)}, correct is ${JSON.stringify(want)}`);
  }
  for (const k of FIGURE_SLOTS) {
    const want = expect[k] ?? null;
    const got = p[k];
    if (got !== want) failures.push(`${k}: read ${JSON.stringify(got)}, correct is ${JSON.stringify(want)}`);
  }
  const wantPlaces = expect.placeIds ?? [];
  if (!sameSet(p.placeIds, wantPlaces)) {
    failures.push(`placeIds: read ${JSON.stringify(p.placeIds)}, correct is ${JSON.stringify(wantPlaces)}`);
  }
  const wantTerms = expect.terms ?? [];
  if (!sameSet(p.terms, wantTerms)) {
    failures.push(`terms: read ${JSON.stringify(p.terms)}, correct is ${JSON.stringify(wantTerms)}`);
  }
  const wantIgnored = expect.ignored ?? [];
  if (!sameSet(p.ignored, wantIgnored)) {
    failures.push(`ignored: disclosed ${JSON.stringify(p.ignored)}, correct is ${JSON.stringify(wantIgnored)}`);
  }
  const wantEmpty = expect.empty ?? false;
  if (p.empty !== wantEmpty) failures.push(`empty: read ${p.empty}, correct is ${wantEmpty}`);
  return { ok: failures.length === 0, failures };
}

// ---------------------------------------------------------------- short prose

export function gradeProse(c: GoldCase, expect: ProseExpect, text: string): GradeVerdict {
  const locale = answerLocale(c);
  const failures = lawFailures(text, locale);
  for (const needle of expect.mustContain ?? []) {
    if (!text.includes(needle)) failures.push(`the answer does not say ${JSON.stringify(needle)}`);
  }
  for (const needle of expect.mustNotContain ?? []) {
    if (text.includes(needle)) failures.push(`the answer says ${JSON.stringify(needle)}, which this case forbids`);
  }
  const loose = unvouchedFigures(text, expect.allowedFigures ?? []);
  if (loose.length) {
    failures.push(`law 3: the answer states ${loose.join(", ")}, which nothing vouched for`);
  }
  if (expect.requireAttribution && !text.includes(RENT_INDEX_SOURCE[locale])) {
    failures.push(`attribution: the answer names the Rent Index without ${JSON.stringify(RENT_INDEX_SOURCE[locale])}`);
  }
  return { ok: failures.length === 0, failures };
}

// ------------------------------------------------------------- translation

/**
 * Grade a rendering.
 *
 * The figure rule is different here and has to be: a translation that dropped
 * every number would pass an emptied allow list, and a translation that gained
 * one has invented a figure. So the allowed figures are exactly the figures in
 * the input, and `preserve` covers the identifiers that must survive as written
 * rather than merely as values.
 */
export function gradeTranslation(c: GoldCase, expect: TranslationExpect, text: string): GradeVerdict {
  const failures = lawFailures(text, answerLocale(c));
  for (const needle of expect.mustContain) {
    if (!text.includes(needle)) failures.push(`the rendering does not carry ${JSON.stringify(needle)}`);
  }
  for (const needle of expect.mustNotContain ?? []) {
    if (text.includes(needle)) failures.push(`the rendering carries ${JSON.stringify(needle)}, which this case forbids`);
  }
  for (const needle of expect.preserve ?? []) {
    if (!text.includes(needle)) failures.push(`the rendering lost ${JSON.stringify(needle)}, which is an identifier`);
  }
  const invented = unvouchedFigures(text, figuresIn(c.input));
  if (invented.length) {
    failures.push(`the rendering states ${invented.join(", ")}, which the source did not`);
  }
  return { ok: failures.length === 0, failures };
}

// ------------------------------------------------------------------ dispatch

/**
 * Grade any case against any answer.
 *
 * A classification case answered with prose, or a prose case answered with a
 * parse, is a harness fault rather than a model fault and is reported as one.
 * It is not silently passed and it is not thrown, because a suite that throws
 * on one bad row reports nothing about the other twenty-one.
 */
export function gradeCase(c: GoldCase, answer: GoldAnswer): GradeVerdict {
  if (c.profile === "classification") {
    if (answer.kind !== "parse") return { ok: false, failures: ["a classification case was answered with text"] };
    return gradeQuery(c.expect, answer.parsed);
  }
  if (answer.kind !== "text") return { ok: false, failures: [`a ${c.profile} case was answered with a parse`] };
  if (c.profile === "short_prose") return gradeProse(c, c.expect, answer.text);
  return gradeTranslation(c, c.expect, answer.text);
}
