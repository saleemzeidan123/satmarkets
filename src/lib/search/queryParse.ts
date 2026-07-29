// Deterministic discovery query parsing (PKG-2A, WS16).
//
// THE DEFECT THIS EXISTS TO KILL. `/listings` has always rendered a search box and
// has never searched. The input submits, the URL gains a `q`, and the result set is
// unchanged, because `searchParams.q` was read by nothing on the server. Findings
// register rank 23, P1.
//
// THE PROMISE THIS HAS TO KEEP. The placeholder is specific, in both languages:
// "fitted Grade A office in Al Olaya under 1,600, around 300 m²". A box that makes
// that promise and then does a bare substring match on a title is a worse defect
// than one that does nothing, because it looks like it worked.
//
// THE RULE. No model participates. Every word is resolved against vocabularies that
// already exist and are already rendered on the page (asset, deal, grade, fitout and
// city in `labels.ts`, districts from the loaded location list). Anything that
// resolves becomes a structured constraint. Anything that does not resolve is
// applied as literal text matching against identifying fields. Anything the parser
// deliberately declined to use is returned in `ignored` so the page can say so out
// loud. The search may never turn an unrecognised word into a silent assumption:
// that is the "never convert unknown data into known data" law, applied one level
// earlier than the advisor applies it.
//
// WHY THE HAYSTACK EXCLUDES DESCRIPTIONS. Free terms match titles, reference codes,
// district and city names, building names and type vocabulary. They do not match
// listing descriptions. A description is prose, some of it assembled, and matching
// on it produces results nobody can explain from what they typed. A result set has
// to be defensible field by field, the same way a figure does.

import { foldText, toWesternDigits } from "@/lib/textFold";

export type Loc = "en" | "ar";

/** One selectable value with its rendered name in both languages. */
export type VocabEntry = { value: string; en: string; ar: string };
/** A district or development, as the listings page already loads it. */
export type PlaceEntry = { id: string; en: string; ar: string };

export type QueryVocab = {
  assets: VocabEntry[];
  grades: VocabEntry[];
  fitouts: VocabEntry[];
  deals: VocabEntry[];
  /** Canonical city keys, exactly as the `districts.city` column stores them. */
  cities: VocabEntry[];
  places: PlaceEntry[];
};

export type ParsedQuery = {
  raw: string;
  asset: string | null;
  grade: string | null;
  fitout: string | null;
  deal: string | null;
  /** Every district id whose name matched. A name can be shared by two records. */
  placeIds: string[];
  /** The matched district name as written in the vocabulary, for the chip. */
  place: { en: string; ar: string } | null;
  city: string | null;
  /** The price axis relevant to the deal type. The caller picks the column. */
  priceMax: number | null;
  priceMin: number | null;
  areaTarget: number | null;
  areaMin: number | null;
  areaMax: number | null;
  /** Normalized free-text tokens that must all match. */
  terms: string[];
  /** Tokens read but deliberately not used, so the page can disclose them. */
  ignored: string[];
  /** True when nothing at all was understood or matched. */
  empty: boolean;
};

// ------------------------------------------------------------- normalization

// Tashkeel and the dagger alef, needed again below for the numeric pass, which folds
// less than a full comparison does because the direction and unit rules read the
// separators and the unit glyphs that a full fold removes.
const AR_MARKS = /[ً-ْٰـ]/g;

/** The platform folding law. Named `normalize` here for the callers already on it. */
export const normalize = foldText;

/**
 * The Arabic definite article and the transliterated "al" prefix are optional in
 * practice: people type العليا and عليا, "Al Olaya" and "Olaya", for one district.
 * Stripped on both sides so either spelling finds the other. Only stripped when
 * something of substance is left behind, so "الف" does not become "ف".
 */
function stripArticle(tok: string): string {
  if (tok.startsWith("ال") && tok.length >= 5) return tok.slice(2);
  if (tok.startsWith("al") && tok.length >= 5) return tok.slice(2);
  return tok;
}

const tokens = (s: string): string[] => (s ? s.split(" ").filter(Boolean) : []);

// ------------------------------------------------------------------ stopwords

// Function words, unit words and the verbs of a stated requirement. These are
// removed rather than matched: a person who types "I need an office in Al Olaya"
// is not asking for listings whose title contains the word "need".
const STOP = new Set([
  // english structure
  "a", "an", "the", "in", "at", "on", "of", "for", "with", "and", "or", "to", "from",
  "near", "around", "about", "approx", "approximately", "circa", "roughly", "some",
  "under", "below", "less", "than", "max", "maximum", "up", "over", "above", "more",
  "least", "min", "minimum", "between", "any", "please", "me", "i", "we", "my", "our",
  "need", "needs", "needed", "want", "wants", "looking", "look", "find", "show", "get",
  "is", "are", "be", "available", "sqm", "sq", "m2", "m²", "sar", "sr", "riyal",
  "riyals", "per", "year", "yr", "yearly", "annum", "month", "mo", "monthly", "size",
  "area", "budget", "price", "rent", "space", "spaces", "property", "properties",
  "unit", "units", "listing", "listings",
  // arabic structure, already folded by normalize()
  "في", "من", "الي", "علي", "مع", "او", "و", "ب", "بـ", "عن", "قرب", "بجوار", "بجانب",
  "حي", "حوالي", "نحو", "تقريبا", "حدود", "تحت", "اقل", "اكثر", "الاقل", "الاكثر",
  "بحد", "اقصي", "ادني", "حتي", "بين", "اي", "اريد", "احتاج", "ابحث", "ابحت", "عندكم",
  "لدي", "يوجد", "هل", "من فضلك", "ريال", "متر", "مربع", "م2", "م²", "سنه", "سنوي",
  "شهر", "شهري", "مساحه", "مساحات", "عقار", "عقارات", "وحده", "وحدات", "سعر", "ميزانيه",
  "ايجار", "قائمه", "قوائم",
  // Arabic attaches its prepositions to the word, so the direction words the numeric
  // rules below read appear as بأقل and بنحو, not as اقل and نحو. Every word that a
  // direction, size or unit regex can consume has to be a stopword too, or the parser
  // applies the constraint AND then searches for the word that expressed it, which
  // returns nothing and looks like broken inventory rather than a broken parser.
  "باقل", "باكثر", "بنحو", "بحوالي", "بحدود", "قرابه", "لا", "يزيد", "يقل", "فوق",
  "بمساحه", "بمساحات", "بميزانيه", "بسعر", "ابتداء",
]);

// ------------------------------------------------------------------ synonyms

// Vocabulary the label tables do not carry because a label is one rendering and a
// search string is every rendering. Each list is additive to the label itself.
export const ASSET_SYN: Record<string, string[]> = {
  office: ["offices", "office space", "workspace", "مكتب", "مكاتب", "مكتبي", "مساحه مكتبيه"],
  retail: ["shop", "shops", "store", "stores", "f b", "fnb", "food", "beverage", "restaurant", "restaurants", "cafe", "محل", "محلات", "تجزئه", "مطعم", "مطاعم", "مقهي", "تجاري"],
  medical: ["clinic", "clinics", "dental", "polyclinic", "عياده", "عيادات", "طبي", "طبيه", "مجمع طبي"],
  showroom: ["showrooms", "معرض", "معارض", "صاله عرض"],
  warehouse: ["warehouses", "storage", "logistics", "مستودع", "مستودعات", "مخزن", "مخازن", "لوجستي"],
  serviced: ["serviced office", "serviced offices", "coworking", "co working", "flexible office", "مكتب مخدوم", "مكاتب مخدومه", "مكاتب جاهزه"],
  education: ["school", "schools", "nursery", "training", "مدرسه", "مدارس", "حضانه", "تعليمي", "معهد"],
  hospitality: ["hotel", "hotels", "hotel apartments", "فندق", "فنادق", "شقق فندقيه", "ضيافه"],
  mixed_use: ["mixed use", "متعدد الاستخدام", "متعدد الاستخدامات", "استخدام مختلط"],
  land: ["plot", "plots", "site", "ارض", "اراضي", "قطعه", "قطع"],
  gas_station: ["petrol station", "fuel station", "محطه وقود", "محطات وقود", "بنزين"],
  entertainment: ["leisure", "cinema", "gym", "ترفيه", "ترفيهي", "صاله رياضيه", "سينما"],
  wedding_hall: ["events hall", "events halls", "wedding hall", "banquet", "قاعه", "قاعات", "افراح", "مناسبات"],
  worker_housing: ["labour housing", "labor housing", "staff accommodation", "سكن عمال", "سكن عماله", "اسكان عمال"],
  self_storage: ["self storage", "storage units", "تخزين ذاتي", "وحدات تخزين"],
};

const FITOUT_SYN: Record<string, string[]> = {
  shell_and_core: ["shell and core", "shell core", "core and shell", "علي المحاره", "عظم"],
  warm_shell: ["warm shell", "semi fitted", "نصف تشطيب", "شبه مجهز"],
  fitted: ["fitted out", "fit out", "ready to move", "مجهزه", "جاهز", "جاهزه"],
  furnished: ["fully furnished", "مفروشه", "مؤثثه", "موثثه"],
};

export const DEAL_SYN: Record<string, string[]> = {
  lease: ["for rent", "to rent", "rental", "leasing", "to lease", "for lease", "للايجار", "للاستئجار", "للاستيجار", "استئجار", "استيجار", "تاجير"],
  sale: ["for sale", "buy", "to buy", "purchase", "freehold", "للبيع", "شراء", "تمليك"],
};

// A grade is a single letter and cannot be matched bare: "a" is an article, "b" and
// "c" are noise. The letter only counts when a grade word introduces it.
const GRADE_WORDS_EN = ["grade", "class"];
const GRADE_WORDS_AR = ["فئه", "الفئه", "درجه", "الدرجه"];
const GRADE_LETTER: Record<string, string[]> = {
  a_plus: ["a+", "ا+", "أ+"],
  a: ["a", "ا"],
  b: ["b", "ب"],
  c: ["c", "ج"],
};

export const CITY_SYN: Record<string, string[]> = {
  Riyadh: ["riyad", "ar riyadh", "al riyadh", "الرياض"],
  Jeddah: ["jiddah", "jedda", "جده"],
  Dammam: ["ad dammam", "al dammam", "الدمام"],
  Khobar: ["al khobar", "alkhobar", "الخبر"],
  Makkah: ["mecca", "makkah al mukarramah", "مكه", "مكه المكرمه"],
  Madinah: ["medina", "al madinah", "madinah al munawwarah", "المدينه", "المدينه المنوره"],
};

// ------------------------------------------------------- numeric constraints

// A number token with optional thousands separators and decimals.
const NUM = /\d[\d,]*(?:\.\d+)?/g;

// Direction words immediately before the figure. A search string states a bound far
// more often than it states a value, which is the difference between this and the
// advisor's numeric intent: there the question is what a number MEANS, here it is
// which way the constraint points.
const MAX_BEFORE = /(?:under|below|less\s+than|no\s+more\s+than|max(?:imum)?|up\s+to|at\s+most|within|<=?|اقل\s+من|تحت|باقل\s+من|بحد\s+اقصي|لا\s+يزيد|حتي|في\s+حدود)\s*(?:sar|sr|ريال)?\s*$/i;
const MIN_BEFORE = /(?:over|above|more\s+than|at\s+least|min(?:imum)?|starting\s+(?:at|from)|from|>=?|اكثر\s+من|فوق|علي\s+الاقل|بحد\s+ادني|لا\s+يقل)\s*(?:sar|sr|ريال)?\s*$/i;
const ABOUT_BEFORE = /(?:around|about|approx(?:imately)?|circa|roughly|near(?:ly)?|~|حوالي|نحو|تقريبا|بحدود|قرابه)\s*$/i;

// The unit that makes a figure an area rather than money. Terminated on "not an
// alphanumeric" rather than \b, because \b never fires after "²".
const UNIT_END = "(?![0-9A-Za-z])";
const AREA_AFTER = new RegExp(`^[\\s,]*(?:m2|m²|sqm|sq\\.?\\s?m|square\\s+met(?:er|re)s?|متر\\s*مربع|م²|م2)${UNIT_END}`, "i");
// "of" is deliberately absent from the size words: it would claim "a rent of 1,600"
// as a floor area, which is the same misclassification the advisor was corrected for.
const AREA_BEFORE = /(?:size|area|floorplate|مساحه|بمساحه)\s*(?:of\s*)?\D{0,4}$/i;

// A figure fused to a word is part of an identifier, not a quantity. "SAT-1042" is a
// reference code and the trailing 2 of "م2" is half a unit; reading either as a number
// both loses the token the person typed and invents a constraint they did not state.
// Direct letter adjacency counts on the left ("م2"); on the right a joining character
// is required, so "300sqm" still reaches the area rule.
const IDENT_BEFORE = /[\p{L}][-_/#]?$/u;
const IDENT_AFTER = /^[-_/#][\p{L}]/u;

const isYearValue = (n: number) => Number.isInteger(n) && n >= 1900 && n <= 2100;

type Numerics = {
  priceMax: number | null;
  priceMin: number | null;
  areaTarget: number | null;
  areaMin: number | null;
  areaMax: number | null;
  /** Character ranges of the number tokens that were consumed. */
  spans: [number, number][];
  ignored: string[];
};

/**
 * Read the bounded quantities out of a search string.
 *
 * A figure with no direction word and no unit is NOT guessed at. It is recorded in
 * `ignored` and shown to the person, because the two plausible readings of a bare
 * "300" are a floor area and a rent, and picking one silently is exactly the class
 * of fabrication the advisor was corrected for.
 */
function readNumerics(base: string): Numerics {
  const out: Numerics = { priceMax: null, priceMin: null, areaTarget: null, areaMin: null, areaMax: null, spans: [], ignored: [] };
  NUM.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = NUM.exec(base)) !== null) {
    const token = m[0];
    const value = parseFloat(token.replace(/,/g, ""));
    if (!Number.isFinite(value) || value <= 0) continue;
    const before = base.slice(Math.max(0, m.index - 30), m.index);
    const after = base.slice(m.index + token.length, m.index + token.length + 30);
    const span: [number, number] = [m.index, m.index + token.length];
    // Left untouched and unmasked, so the whole identifier survives into the terms.
    if (IDENT_BEFORE.test(before) || IDENT_AFTER.test(after)) continue;
    const isArea = AREA_AFTER.test(after) || AREA_BEFORE.test(before);
    const dir = MAX_BEFORE.test(before) ? "max" : MIN_BEFORE.test(before) ? "min" : ABOUT_BEFORE.test(before) ? "about" : null;

    if (isArea) {
      if (dir === "max") out.areaMax = out.areaMax ?? value;
      else if (dir === "min") out.areaMin = out.areaMin ?? value;
      else out.areaTarget = out.areaTarget ?? value;
      out.spans.push(span);
      continue;
    }
    if (dir === "max") { out.priceMax = out.priceMax ?? value; out.spans.push(span); continue; }
    if (dir === "min") { out.priceMin = out.priceMin ?? value; out.spans.push(span); continue; }
    // A bare in-range integer written without a separator reads as a year, and a
    // year is not a constraint on inventory. Dropped quietly rather than disclosed,
    // because "2026" in a search string is almost never a request.
    if (isYearValue(value) && !token.includes(",") && !token.includes(".")) { out.spans.push(span); continue; }
    out.ignored.push(token);
    out.spans.push(span);
  }
  return out;
}

// ------------------------------------------------------------ phrase matching

type Candidate = { kind: "asset" | "grade" | "fitout" | "deal" | "city" | "place"; value: string; phrase: string; place?: PlaceEntry };

const push = (into: Candidate[], kind: Candidate["kind"], value: string, phrase: string, place?: PlaceEntry) => {
  const p = normalize(phrase);
  if (p) into.push({ kind, value, phrase: p, place });
};

function buildCandidates(vocab: QueryVocab): Candidate[] {
  const out: Candidate[] = [];
  for (const a of vocab.assets) {
    push(out, "asset", a.value, a.en);
    push(out, "asset", a.value, a.ar);
    for (const s of ASSET_SYN[a.value] ?? []) push(out, "asset", a.value, s);
  }
  for (const f of vocab.fitouts) {
    push(out, "fitout", f.value, f.en);
    push(out, "fitout", f.value, f.ar);
    for (const s of FITOUT_SYN[f.value] ?? []) push(out, "fitout", f.value, s);
  }
  for (const d of vocab.deals) {
    push(out, "deal", d.value, d.en);
    push(out, "deal", d.value, d.ar);
    for (const s of DEAL_SYN[d.value] ?? []) push(out, "deal", d.value, s);
  }
  for (const g of vocab.grades) {
    for (const letter of GRADE_LETTER[g.value] ?? []) {
      for (const w of GRADE_WORDS_EN) push(out, "grade", g.value, `${w} ${letter}`);
      for (const w of GRADE_WORDS_AR) push(out, "grade", g.value, `${w} ${letter}`);
    }
  }
  for (const c of vocab.cities) {
    push(out, "city", c.value, c.en);
    push(out, "city", c.value, c.ar);
    for (const s of CITY_SYN[c.value] ?? []) push(out, "city", c.value, s);
  }
  for (const p of vocab.places) {
    push(out, "place", p.id, p.en, p);
    push(out, "place", p.id, p.ar, p);
  }
  // Longest phrase first, so "serviced office" is not eaten by "office" and
  // "مكه المكرمه" is not eaten by "مكه".
  return out.sort((a, b) => b.phrase.length - a.phrase.length);
}

/** Whole-token containment: " olaya " inside " office in olaya ", never "olayat". */
function cut(hay: string, phrase: string): string | null {
  const h = ` ${hay} `;
  const p = ` ${phrase} `;
  const i = h.indexOf(p);
  if (i < 0) return null;
  return `${h.slice(0, i)} ${h.slice(i + p.length)}`.replace(/\s+/g, " ").trim();
}

// ---------------------------------------------------------------- the parser

/**
 * Parse a discovery query against the vocabularies the page already renders.
 *
 * Structured hints are extracted first, longest phrase first, and each match is
 * removed from the string so it cannot also be applied as a text term. What is left
 * after stopword removal is the literal part of the search.
 */
export function parseQuery(raw: string, vocab: QueryVocab): ParsedQuery {
  const src = String(raw ?? "").trim();
  const out: ParsedQuery = {
    raw: src, asset: null, grade: null, fitout: null, deal: null, placeIds: [], place: null,
    city: null, priceMax: null, priceMin: null, areaTarget: null, areaMin: null, areaMax: null,
    terms: [], ignored: [], empty: true,
  };
  if (!src) return out;

  // Numerics run on a lightly folded string that still carries the separators and
  // the unit glyphs the direction and unit rules depend on.
  const base = toWesternDigits(src)
    .toLowerCase()
    .replace(AR_MARKS, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه");
  const nums = readNumerics(base);
  out.priceMax = nums.priceMax;
  out.priceMin = nums.priceMin;
  out.areaTarget = nums.areaTarget;
  out.areaMin = nums.areaMin;
  out.areaMax = nums.areaMax;
  out.ignored = nums.ignored;

  // Blank the consumed figures. The direction and unit words around them are
  // stopwords and fall out of the term list on their own.
  let masked = "";
  let cursor = 0;
  for (const [s, e] of nums.spans.sort((a, b) => a[0] - b[0])) {
    masked += base.slice(cursor, s) + " ";
    cursor = e;
  }
  masked += base.slice(cursor);

  let rest = normalize(masked);
  for (const c of buildCandidates(vocab)) {
    if (c.kind === "asset" && out.asset) continue;
    if (c.kind === "grade" && out.grade) continue;
    if (c.kind === "fitout" && out.fitout) continue;
    if (c.kind === "deal" && out.deal) continue;
    // A district is more specific than the city that contains it, so once a place
    // matched, a city name is only taken if it is still separately present.
    const next = cut(rest, c.phrase);
    if (next === null) continue;
    rest = next;
    if (c.kind === "asset") out.asset = c.value;
    else if (c.kind === "grade") out.grade = c.value;
    else if (c.kind === "fitout") out.fitout = c.value;
    else if (c.kind === "deal") out.deal = c.value;
    else if (c.kind === "city") { if (!out.city) out.city = c.value; }
    else if (c.kind === "place") {
      if (!out.placeIds.includes(c.value)) out.placeIds.push(c.value);
      if (!out.place && c.place) out.place = { en: c.place.en, ar: c.place.ar };
    }
  }

  out.terms = Array.from(new Set(
    tokens(rest)
      .filter((t) => !STOP.has(t))
      .filter((t) => t.length > 1)
  ));
  out.empty = !out.asset && !out.grade && !out.fitout && !out.deal && !out.city &&
    out.placeIds.length === 0 && out.priceMax == null && out.priceMin == null &&
    out.areaTarget == null && out.areaMin == null && out.areaMax == null && out.terms.length === 0;
  return out;
}

// ------------------------------------------------------ removing one reading

/**
 * The keys a person can take back.
 *
 * A parse is a claim about what someone meant, and a claim they cannot withdraw is
 * an imposition. Chips are removed by name through a `qx` parameter rather than by
 * editing the sentence, because the parser knows which reading it made but not where
 * in the typed words that reading came from, and rewriting a person's sentence on
 * their behalf would be a second guess on top of the first.
 */
export const QUERY_KEYS = ["asset", "grade", "fitout", "deal", "place", "city", "priceMax", "priceMin", "area", "areaMin", "areaMax", "terms"] as const;
export type QueryKey = (typeof QUERY_KEYS)[number];

export function dropKeys(p: ParsedQuery, keys: string[]): ParsedQuery {
  if (!keys.length) return p;
  const k = new Set(keys);
  const out: ParsedQuery = { ...p, placeIds: [...p.placeIds], terms: [...p.terms], ignored: [...p.ignored] };
  if (k.has("asset")) out.asset = null;
  if (k.has("grade")) out.grade = null;
  if (k.has("fitout")) out.fitout = null;
  if (k.has("deal")) out.deal = null;
  if (k.has("place")) { out.placeIds = []; out.place = null; }
  if (k.has("city")) out.city = null;
  if (k.has("priceMax")) out.priceMax = null;
  if (k.has("priceMin")) out.priceMin = null;
  if (k.has("area")) out.areaTarget = null;
  if (k.has("areaMin")) out.areaMin = null;
  if (k.has("areaMax")) out.areaMax = null;
  if (k.has("terms")) out.terms = [];
  out.empty = !out.asset && !out.grade && !out.fitout && !out.deal && !out.city &&
    out.placeIds.length === 0 && out.priceMax == null && out.priceMin == null &&
    out.areaTarget == null && out.areaMin == null && out.areaMax == null && out.terms.length === 0;
  return out;
}

// ------------------------------------------------------------- the narrowing

export type QueryContext = {
  /** The identifying fields free terms may match. Never a description. */
  text: (string | null | undefined)[];
  /** District ids belonging to the city the query named, resolved by the caller. */
  cityDistrictIds?: Set<string> | null;
};

/**
 * Does one listing satisfy a parsed query?
 *
 * `areaTarget` is deliberately absent. "around 300 m²" is a preference and not a
 * bound, and turning it into one would either invent a tolerance the person never
 * stated or return an empty page for a reasonable request. It orders the results
 * instead, and the page says so.
 */
export function matchesQuery(l: Record<string, any>, p: ParsedQuery, ctx: QueryContext): boolean {
  if (p.asset && l.asset_type !== p.asset) return false;
  if (p.grade && l.building_grade !== p.grade) return false;
  if (p.fitout && l.fitout_condition !== p.fitout) return false;
  if (p.deal && l.deal_type !== p.deal) return false;
  if (p.placeIds.length && !(l.district_id && p.placeIds.includes(l.district_id))) return false;
  if (p.city && !(l.district_id && ctx.cityDistrictIds?.has(l.district_id))) return false;
  if (p.priceMax != null || p.priceMin != null) {
    const price = l.deal_type === "sale" ? l.sale_price : l.asking_rent_sqm;
    // A listing that publishes no figure cannot be shown to satisfy a figure.
    if (price == null) return false;
    if (p.priceMax != null && Number(price) > p.priceMax) return false;
    if (p.priceMin != null && Number(price) < p.priceMin) return false;
  }
  if (p.areaMin != null && !(l.area_sqm != null && Number(l.area_sqm) >= p.areaMin)) return false;
  if (p.areaMax != null && !(l.area_sqm != null && Number(l.area_sqm) <= p.areaMax)) return false;
  return matchesTerms(ctx.text, p.terms);
}

// --------------------------------------------------------------- the matcher

/**
 * Does a listing satisfy the free-text part of a query?
 *
 * Every term must match, because a person who types two words means both. A term
 * matches when any identifying field carries a token that starts with it, which is
 * what makes "مكتب" find "مكاتب" and "olay" find "olaya" without a stemmer whose
 * rules nobody could audit.
 */
export function matchesTerms(fields: (string | null | undefined)[], terms: string[]): boolean {
  if (!terms.length) return true;
  const hay: string[] = [];
  for (const f of fields) {
    for (const t of tokens(normalize(f ?? ""))) {
      hay.push(t);
      const stripped = stripArticle(t);
      if (stripped !== t) hay.push(stripped);
    }
  }
  if (!hay.length) return false;
  return terms.every((termRaw) => {
    const term = stripArticle(termRaw);
    return hay.some((h) => h.startsWith(term) || (term.length >= 4 && h.includes(term)));
  });
}
