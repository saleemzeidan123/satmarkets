import type { QueryVocab } from "@/lib/search/queryParse";

// ADV-3B. The synthetic bilingual evaluation gold set.
//
// WHY A GOLD SET AT ALL. `src/lib/ai/router.ts` registers four model candidates
// and every one of them carries `evaluation: { status: "unevaluated" }`. That is
// the honest state, and the router says so out loud by returning a selection
// `basis` of `configured_default_no_evaluation`. But an unevaluated register is a
// register that cannot answer the only question worth asking about a model
// swap: did the output get better or worse. This file is what turns that into a
// measurable question rather than a matter of opinion.
//
// WHY IT IS SYNTHETIC, AND WHAT THAT HAD TO MEAN. Codex permits the evaluation
// harness to call providers, and permits it on exactly one condition: the set
// contains no real user and no real platform data. That is not satisfied by
// taking real rows and changing the names. A district that exists, a rent that
// was quoted, a requirement somebody actually typed, all remain real content
// after a find and replace. So every row here is written for this file:
//
//   * The districts are invented. Northgate Quarter, Lantern Row and Sail Point
//     are not districts in Riyadh or anywhere else, and a reader can confirm
//     that by looking, which is the property that matters.
//   * The companies are invented. Northwind Logistics and Harborlight Clinics
//     exist nowhere.
//   * The figures are invented and are deliberately implausible as market
//     numbers, so that a figure escaping from this file into a page would be
//     recognisable as this file's rather than mistaken for a market rate.
//   * No listing, requirement, advisor message, document or database row is
//     copied, paraphrased or sampled.
//
// It is registered in `SYNTHETIC_SETS` in `src/lib/aiBoundary.ts` under the id
// below, which is what permits a row to reach an external model while the
// agreement gate is closed. The registration is the claim; this file is the
// evidence for it.
//
// WHAT THE CASES ARE FOR. A case states an input and the properties a correct
// answer has, never an exact expected string. Prose has many correct forms and
// pinning one of them would score fluency against the author's taste rather than
// score the thing that matters. What is pinned is what the platform's laws
// require of any answer: no invented figure, Western numerals in both locales,
// the Rent Index attribution wherever the Rent Index is named, no em dash, and
// the reader's own script.
//
// THE UNSTATED FIELD RULE. For a query case, a field the expectation does not
// mention must come back null or empty. Checking only the stated fields would
// pass a parser that invents a city, and inventing a city out of a query that
// never named one is precisely the failure the discovery parser exists to
// prevent. Silence in an expectation is a requirement, not an omission.

export const GOLD_SET_ID = "adv3-eval-gold";

export type GoldLocale = "en" | "ar";

export type GoldProfile = "classification" | "short_prose" | "bilingual_translation";

/**
 * A district vocabulary invented for this set.
 *
 * The discovery parser resolves places against whatever vocabulary it is handed,
 * so the set can carry its own and never touch the loaded location list. This is
 * the difference between an evaluation that contains no platform data and one
 * that merely does not print any.
 */
export const GOLD_VOCAB: QueryVocab = {
  assets: [
    { value: "office", en: "Office", ar: "مكاتب" },
    { value: "warehouse", en: "Warehouse", ar: "مستودعات" },
    { value: "showroom", en: "Showroom", ar: "معارض" },
    { value: "medical", en: "Medical", ar: "طبي" },
  ],
  grades: [
    { value: "a", en: "Grade A", ar: "الفئة أ" },
    { value: "b", en: "Grade B", ar: "الفئة ب" },
  ],
  fitouts: [
    { value: "fitted", en: "Fitted", ar: "مجهزة" },
    { value: "shell_and_core", en: "Shell and core", ar: "على المحارة" },
  ],
  deals: [
    { value: "lease", en: "For lease", ar: "للإيجار" },
    { value: "sale", en: "For sale", ar: "للبيع" },
  ],
  cities: [
    { value: "Riyadh", en: "Riyadh", ar: "الرياض" },
    { value: "Jeddah", en: "Jeddah", ar: "جدة" },
  ],
  places: [
    { id: "gold-northgate", en: "Northgate Quarter", ar: "حي البوابة الشمالية" },
    { id: "gold-lantern", en: "Lantern Row", ar: "حي الفنار" },
    { id: "gold-sailpoint", en: "Sail Point", ar: "حي رأس الشراع" },
  ],
};

/**
 * What a correct parse of a query case looks like.
 *
 * Every field is optional and every omitted field is asserted null or empty. See
 * the unstated field rule above.
 */
export type QueryExpect = {
  asset?: string;
  grade?: string;
  fitout?: string;
  deal?: string;
  city?: string;
  placeIds?: readonly string[];
  priceMax?: number;
  priceMin?: number;
  areaTarget?: number;
  areaMin?: number;
  areaMax?: number;
  /** Free text the vocabulary did not resolve. Its presence is what closes the boundary. */
  terms?: readonly string[];
  /**
   * Figures the parser was right to read and wrong to use, which it discloses
   * rather than guesses at. Stated so the unstated field rule can require an
   * empty disclosure instead of quietly tolerating any.
   */
  ignored?: readonly string[];
  empty?: boolean;
};

export type ProseExpect = {
  /** Substrings a correct answer must carry, written in the case's own locale. */
  mustContain?: readonly string[];
  mustNotContain?: readonly string[];
  /**
   * Figures an answer is allowed to state, because a tool or the input vouched
   * for them. Defaults to none, which is the correct default under Law 3.
   */
  allowedFigures?: readonly number[];
  /** The answer names the Rent Index, so it must carry the REGA attribution. */
  requireAttribution?: boolean;
};

export type TranslationExpect = {
  mustContain: readonly string[];
  mustNotContain?: readonly string[];
  /** Substrings that must survive translation unchanged, such as a reference code. */
  preserve?: readonly string[];
};

export type GoldCase =
  | { id: string; profile: "classification"; locale: GoldLocale; input: string; why: string; expect: QueryExpect }
  | { id: string; profile: "short_prose"; locale: GoldLocale; input: string; why: string; expect: ProseExpect }
  | { id: string; profile: "bilingual_translation"; locale: GoldLocale; input: string; why: string; expect: TranslationExpect };

// ------------------------------------------------------------ classification

const QUERIES: readonly GoldCase[] = [
  {
    id: "q-en-01",
    profile: "classification",
    locale: "en",
    input: "fitted Grade A office in Northgate Quarter under 1,600, around 300 m2",
    why: "The placeholder the discovery box actually shows. If this one does not parse, the box is making a promise the parser does not keep.",
    expect: { asset: "office", grade: "a", fitout: "fitted", placeIds: ["gold-northgate"], priceMax: 1600, areaTarget: 300 },
  },
  {
    id: "q-en-02",
    profile: "classification",
    locale: "en",
    input: "warehouse for sale in Jeddah",
    why: "Asset, deal and city with nothing else. Anything more in the parse is invented.",
    expect: { asset: "warehouse", deal: "sale", city: "Jeddah" },
  },
  {
    id: "q-en-03",
    profile: "classification",
    locale: "en",
    input: "office for lease in Riyadh for the Northwind Logistics expansion",
    why: "The boundary case. A company name and an expansion plan are commercially sensitive, they are not vocabulary, and they must land in terms so the classification says so.",
    expect: { asset: "office", deal: "lease", city: "Riyadh", terms: ["northwind", "logistics", "expansion"] },
  },
  {
    id: "q-en-04",
    profile: "classification",
    locale: "en",
    input: "showroom on Lantern Row above 900",
    why: "A lower bound. A parser that reads every figure as a ceiling filters the opposite of what was asked.",
    expect: { asset: "showroom", placeIds: ["gold-lantern"], priceMin: 900 },
  },
  {
    id: "q-en-05",
    profile: "classification",
    locale: "en",
    input: "medical 200 to 400 m2",
    why: "A range, which is two bounds from one phrase rather than a target.",
    expect: { asset: "medical", areaMin: 200, areaMax: 400 },
  },
  {
    id: "q-en-06",
    profile: "classification",
    locale: "en",
    input: "   ",
    why: "Whitespace is not a query. An empty parse must report itself empty rather than match everything.",
    expect: { empty: true },
  },
  {
    id: "q-ar-01",
    profile: "classification",
    locale: "ar",
    input: "مكاتب مجهزة الفئة أ في حي البوابة الشمالية تحت 1,600 حوالي 300 م2",
    why: "The Arabic mirror of q-en-01. Arabic discovery was silently unfiltered once already, so parity here is a regression gate and not a nicety.",
    expect: { asset: "office", grade: "a", fitout: "fitted", placeIds: ["gold-northgate"], priceMax: 1600, areaTarget: 300 },
  },
  {
    id: "q-ar-02",
    profile: "classification",
    locale: "ar",
    input: "مستودعات للبيع في جدة",
    why: "The Arabic city name must filter. It is written here without the definite article the label carries, because people type it both ways.",
    expect: { asset: "warehouse", deal: "sale", city: "Jeddah" },
  },
  {
    id: "q-ar-03",
    profile: "classification",
    locale: "ar",
    input: "مكاتب للإيجار في الرياض لتوسعة نورثويند",
    why: "The Arabic boundary case. Free Arabic text is as unstructured as free English text and gates the same way.",
    expect: { asset: "office", deal: "lease", city: "Riyadh", terms: ["لتوسعه", "نورثويند"] },
  },
  {
    id: "q-ar-04",
    profile: "classification",
    locale: "ar",
    input: "معارض في حي الفنار اكثر من 900",
    why: "An Arabic lower bound. The direction word sits before the figure in both languages but is a different word list.",
    expect: { asset: "showroom", placeIds: ["gold-lantern"], priceMin: 900 },
  },
  {
    id: "q-ar-05",
    profile: "classification",
    locale: "ar",
    input: "الفئة أ",
    why: "A grade with no asset, no city and no district. The parser must return a grade and invent nothing around it.",
    expect: { grade: "a" },
  },
  {
    id: "q-ar-06",
    profile: "classification",
    locale: "ar",
    input: "طبي في حي رأس الشراع مساحة 250 م2",
    why: "An Arabic area target with the unit written in Arabic. The unit glyph decides whether a figure is money or metres.",
    expect: { asset: "medical", placeIds: ["gold-sailpoint"], areaTarget: 250 },
  },
];

// --------------------------------------------------------------- short prose

const PROSE: readonly GoldCase[] = [
  {
    id: "p-en-01",
    profile: "short_prose",
    locale: "en",
    input: "I need something in Riyadh.",
    why: "The commonest opening message there is. A correct answer asks for the asset type rather than guessing one, because guessing produces a confident result set nobody asked for.",
    expect: { mustNotContain: ["Grade A", "Northgate"], allowedFigures: [] },
  },
  {
    id: "p-en-02",
    profile: "short_prose",
    locale: "en",
    input: "What is a fair rent for a fitted office in Northgate Quarter?",
    why: "Law 3 in one sentence. There is no answer to this that states a figure, and the failure mode is a model that produces a plausible one.",
    expect: { allowedFigures: [] },
  },
  {
    id: "p-en-03",
    profile: "short_prose",
    locale: "en",
    input: "Where do your rent figures come from?",
    why: "Owner ruling 2. Naming the Rent Index without naming REGA and Ejar is the exact defect the attribution module was built to close.",
    expect: { requireAttribution: true, allowedFigures: [] },
  },
  {
    id: "p-ar-01",
    profile: "short_prose",
    locale: "ar",
    input: "أبحث عن شيء في الرياض.",
    why: "The Arabic mirror. An answer in English to an Arabic question is a failure even when its content is right.",
    expect: { allowedFigures: [] },
  },
  {
    id: "p-ar-02",
    profile: "short_prose",
    locale: "ar",
    input: "كم الإيجار المناسب لمكتب مجهز في حي البوابة الشمالية؟",
    why: "Law 3 in Arabic, with the added trap that an Arabic answer may reach for Arabic-Indic digits, which Law 7 forbids in both locales.",
    expect: { allowedFigures: [] },
  },
  {
    id: "p-ar-03",
    profile: "short_prose",
    locale: "ar",
    input: "ما مصدر أرقام الإيجار لديكم؟",
    why: "The attribution in Arabic, which was written five different ways across the platform before one module took ownership of it.",
    expect: { requireAttribution: true, allowedFigures: [] },
  },
];

// ------------------------------------------------------- bilingual translation

const TRANSLATION: readonly GoldCase[] = [
  {
    id: "t-en-01",
    profile: "bilingual_translation",
    locale: "en",
    input: "Fitted Grade A office, Northgate Quarter, 300 m2, reference NG-4417.",
    why: "A listing title. The reference code is an identifier and must survive verbatim, and the area must stay in Western numerals.",
    expect: { mustContain: ["مكتب"], preserve: ["NG-4417", "300"] },
  },
  {
    id: "t-en-02",
    profile: "bilingual_translation",
    locale: "en",
    input: "Shell and core showroom on Lantern Row, available for lease from the first of next quarter.",
    why: "Shell and core has one professional Arabic form. A literal rendering of the two English words is the failure this case catches.",
    expect: { mustContain: ["معرض"], mustNotContain: ["قشرة"] },
  },
  {
    id: "t-en-03",
    profile: "bilingual_translation",
    locale: "en",
    input: "Harborlight Clinics is seeking a medical unit of 250 m2 in Sail Point.",
    why: "An invented company name. A brand is transliterated or left alone, never translated into its parts.",
    expect: { mustContain: ["250"], mustNotContain: ["ضوء الميناء"] },
  },
  {
    id: "t-ar-01",
    profile: "bilingual_translation",
    locale: "ar",
    input: "مستودع على المحارة في حي رأس الشراع، مساحة 1,200 م2، رقم المرجع SP-2290.",
    why: "The reverse direction. The figure carries a thousands separator, which is where a round trip most often loses a digit.",
    expect: { mustContain: ["1,200"], preserve: ["SP-2290"] },
  },
];

/**
 * The whole set, in a stable order.
 *
 * Order is stable because a report that reorders itself between runs cannot be
 * diffed, and a suite nobody can diff is a suite nobody reruns.
 */
export const GOLD_CASES: readonly GoldCase[] = [...QUERIES, ...PROSE, ...TRANSLATION];

export const GOLD_PROFILES: readonly GoldProfile[] = ["classification", "short_prose", "bilingual_translation"];

export function casesFor(profile: GoldProfile): readonly GoldCase[] {
  return GOLD_CASES.filter((c) => c.profile === profile);
}
