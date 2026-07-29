import { foldText } from "@/lib/textFold";
import { ASSET_SYN, CITY_SYN } from "@/lib/search/queryParse";
import { readNumericIntent } from "@/lib/market/numericIntent";

// ADV-3A.1. The advisor's deterministic intent reader.
//
// WHY THIS FILE EXISTS.
//
// `/api/advisor` routed every message by asking a model to return
// `{mode, district, asset, figure, threshold}` as JSON. ADV-3A.1 closes the
// external boundary against unstructured user text while no enterprise AI
// agreement is in force, so that call now returns null before it reaches a
// socket. Without a deterministic reader, `parseJsonLoose(null)` yields `{}`,
// every non-greeting collapses to `mode: "search"`, and the advisor answers every
// question with the same request for a district and a budget.
//
// That failure would have been worse than it sounds, because the `value` and
// `watch` paths are the two that involve NO model at all once the intent is
// known: they read the published Rent Index, build structured evidence and render
// both languages deterministically. Losing them to a closed AI boundary would
// have meant losing the most evidence-correct answers the advisor gives, for a
// reason that has nothing to do with them.
//
// So the fallback is a reader, not a shrug.
//
// WHAT IT DELIBERATELY DOES NOT DO.
//
// It does not guess. An unrecognised place is passed through as the words the
// person typed and resolved against the districts table, and when that finds
// nothing the advisor says it has no published data rather than answering about
// somewhere else. It never upgrades an unrecognised term into a constraint, which
// is the same law the discovery parser works under.
//
// The figure is read by `readNumericIntent`, not by taking the first number:
// a reporting year, a floor area, a percentage and a total budget are not rents,
// and only an explicit rent unit or an explicit rent comparison produces one.
// That correction is already tested in `src/lib/market/numericIntent.test.ts` and
// this file must not reintroduce the bug it fixed.

export type AdvisorMode = "chat" | "search" | "draft" | "value" | "watch";

export type AdvisorIntent = {
  mode: AdvisorMode;
  /** The place as it should be resolved against the districts table, or null. */
  district: string | null;
  /** One of the eight asset types the advisor answers about, or null. */
  asset: string | null;
  /** A rent figure the person offered for comparison. Never a year, area or budget. */
  figure: number | null;
  /** A percent move for a watch, or null. */
  threshold: number | null;
};

/** The eight asset types the advisor answers about. */
export const ADVISOR_ASSETS = [
  "office",
  "retail",
  "medical",
  "showroom",
  "warehouse",
  "serviced",
  "education",
  "land",
] as const;

// Base words per asset, additive to the shared discovery synonyms. The discovery
// lists carry every rendering a search string uses; these are the bare labels a
// sentence uses.
const ASSET_BASE: Record<string, string[]> = {
  office: ["office", "مكتب"],
  retail: ["retail", "تجزئه"],
  medical: ["medical", "طبي"],
  showroom: ["showroom", "معرض"],
  warehouse: ["warehouse", "مستودع"],
  serviced: ["serviced", "مخدوم"],
  education: ["education", "تعليمي"],
  land: ["land", "ارض"],
};

// Places the platform already names in its own advisor instruction: Saudi cities,
// the districts the Rent Index publishes, and the developments that are projects
// rather than districts. The canonical value is the English name, because that is
// what `districts.name_en` holds and what the route matches on.
//
// A place absent from this list is not rejected. It falls through to the phrase
// reader below and is resolved against the table like any other name.
type Place = { canonical: string; aliases: string[] };

const PLACES: Place[] = [
  // Riyadh districts
  { canonical: "Al Olaya", aliases: ["olaya", "al olaya", "العليا", "عليا"] },
  { canonical: "Al Malaz", aliases: ["malaz", "al malaz", "الملز", "ملز"] },
  { canonical: "Hittin", aliases: ["hittin", "hitteen", "حطين"] },
  { canonical: "Qurtubah", aliases: ["qurtubah", "qurtuba", "cordoba", "قرطبه"] },
  { canonical: "Sulay", aliases: ["sulay", "as sulay", "السلي", "سلي"] },
  { canonical: "Granada", aliases: ["granada", "غرناطه"] },
  { canonical: "Diplomatic Quarter", aliases: ["diplomatic quarter", "dq", "الحي الدبلوماسي", "السفارات"] },
  // Jeddah, Makkah, Madinah, Eastern Province districts
  { canonical: "Al Hamra", aliases: ["al hamra", "hamra", "الحمراء", "الحمرا"] },
  { canonical: "Ar Rawdah", aliases: ["ar rawdah", "al rawdah", "rawdah", "الروضه"] },
  { canonical: "Ash Shati", aliases: ["ash shati", "al shati", "shati", "الشاطئ", "الشاطي"] },
  { canonical: "Al Aziziyah", aliases: ["al aziziyah", "aziziyah", "العزيزيه"] },
  { canonical: "Quba", aliases: ["quba", "قباء", "قبا"] },
  { canonical: "Al Faisaliyah", aliases: ["al faisaliyah", "faisaliyah", "الفيصليه"] },
  // Developments. Projects, never districts, and the advisor says so.
  { canonical: "KAFD", aliases: ["kafd", "cafd", "king abdullah financial district", "كافد", "المركز المالي", "واجهه الرياض الماليه"] },
  { canonical: "ITCC", aliases: ["itcc", "اي تي سي سي"] },
  { canonical: "Laysen Valley", aliases: ["laysen valley", "laysen", "وادي ليسن", "ليسن"] },
  { canonical: "Roshn Front", aliases: ["roshn front", "roshn", "روشن", "واجهه روشن"] },
];

// Words that introduce a place. The capture stops at the first token that belongs
// to some other part of the question.
const PLACE_LEAD = new Set(["in", "at", "near", "around", "on", "for", "في", "بمنطقه", "منطقه", "حي", "بحي"]);

const PLACE_STOP = new Set([
  "a", "an", "the", "and", "or", "is", "are", "was", "my", "our", "your", "me", "i",
  "sar", "sr", "per", "sqm", "m2", "m", "square", "metre", "meter", "year", "month",
  "rent", "rents", "rental", "price", "prices", "lease", "sale", "buy", "sell",
  "space", "spaces", "unit", "units", "listing", "listings", "market", "index",
  "ريال", "متر", "مربع", "سنه", "شهر", "ايجار", "ايجارات", "سعر", "اسعار", "مساحه",
  "وحده", "عرض", "عروض", "السوق", "المؤشر", "مؤشر", "من", "الي", "علي", "عن", "هل",
  "كم", "ما", "هي", "هو", "لدي", "عندكم", "عندك",
]);

const WATCH_WORDS = [
  "watch", "watching", "alert", "alerts", "notify", "notification", "notifications",
  "track", "tracking", "monitor", "monitoring", "keep an eye", "let me know when",
  "راقب", "مراقبه", "تنبيه", "تنبيهات", "نبهني", "اعلمني", "تابع", "متابعه", "رصد",
];

const DRAFT_WORDS = [
  "draft", "write me", "write a", "write the", "listing copy", "ad copy", "advert",
  "description for", "write my listing", "rewrite",
  "اكتب", "صياغه", "صغ", "مسوده", "اعلان لعقاري", "وصف لعقاري", "اعد صياغه",
];

const VALUE_WORDS = [
  "fair", "worth", "valuation", "value my", "overpriced", "underpriced", "too high",
  "too much", "too expensive", "market rate", "going rate", "rent level", "rent levels",
  "average rent", "typical rent", "benchmark", "how much is rent", "how much rent",
  "what are rents", "what is the rent", "reasonable", "rents in",
  // "ايجارات" only, never "ايجار": the singular fuses to "للايجار" in an ordinary
  // lease search, and a search is not a valuation question.
  "ايجارات",
  "مناسب", "معقول", "تقييم", "قيمه سوقيه", "غالي", "مرتفع", "منخفض", "متوسط الايجار",
  "سعر السوق", "كم ايجار", "كم الايجار", "المعدل", "هل السعر",
];

const SEARCH_WORDS = [
  "find", "looking for", "look for", "show me", "browse", "available", "availability",
  "i need", "we need", "i want", "we want", "any listings", "options",
  "ابحث", "ادور", "ابغي", "اريد", "محتاج", "اعرض", "متوفر", "متاح", "خيارات", "عروض",
];

const CHAT_WORDS = [
  "what can you do", "who are you", "what are you", "what is sat", "what does sat",
  "how does this work", "how do you work", "what do you offer", "tell me about sat",
  "help me understand", "can you help",
  "من انت", "ماذا تفعل", "ما هي سات", "كيف يعمل", "ماذا تقدم", "وش تسوي", "كيف تساعدني",
];

const ARABIC = /[؀-ۿ]/;

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Arabic writes the article and several prepositions as prefixes on the word
// itself, so a padded substring test misses the ordinary way a person asks. In
// "كم متوسط الإيجار للمكاتب" the asset word is fused to its preposition and its
// article, and a search for " مكاتب " finds nothing. This allows the standard
// proclitic cluster and nothing else: it does not fold suffixes, so a longer word
// that merely begins with an asset word still does not match.
const AR_PREFIX = "(?:و|ف)?(?:ب|ل|ك)?(?:ال|ل)?";

function hasAny(folded: string, words: readonly string[]): boolean {
  const padded = " " + folded + " ";
  for (const w of words) {
    const f = foldText(w);
    if (!f) continue;
    // Padded on both sides so "land" never matches inside "Riyadh landmark".
    if (padded.includes(" " + f + " ")) return true;
    if (ARABIC.test(f)) {
      const re = new RegExp("(?:^|\\s)" + AR_PREFIX + escapeRe(f) + "(?=\\s|$)", "u");
      if (re.test(folded)) return true;
    }
  }
  return false;
}

function readAsset(folded: string): string | null {
  for (const key of ADVISOR_ASSETS) {
    const words = [...(ASSET_BASE[key] ?? []), ...(ASSET_SYN[key] ?? [])];
    if (hasAny(folded, words)) return key;
  }
  return null;
}

function readCity(folded: string): string | null {
  for (const [canonical, aliases] of Object.entries(CITY_SYN)) {
    if (hasAny(folded, [canonical, ...aliases])) return canonical;
  }
  return null;
}

function readKnownPlace(folded: string): string | null {
  // Longest alias first, so "al olaya" wins over "olaya" and a two-word
  // development name is never split by a one-word city.
  let best: { name: string; len: number } | null = null;
  for (const p of PLACES) {
    for (const a of [p.canonical, ...p.aliases]) {
      const f = foldText(a);
      if (!f) continue;
      if ((" " + folded + " ").includes(" " + f + " ") && (!best || f.length > best.len)) {
        best = { name: p.canonical, len: f.length };
      }
    }
  }
  return best ? best.name : null;
}

/**
 * The place phrase after a locating word, in the script the person typed.
 *
 * This is the fallback for a district no list knows. It returns the person's own
 * words, which are then resolved against the districts table; if nothing matches,
 * the advisor says it has no published data for that place. It never invents a
 * district and never substitutes a nearby one.
 */
function readPlacePhrase(raw: string): string | null {
  const tokens = String(raw).split(/[\s,.;:!?()"'،؛؟]+/).filter(Boolean);
  const folded = tokens.map((t) => foldText(t));
  for (let i = 0; i < tokens.length - 1; i++) {
    if (!PLACE_LEAD.has(folded[i])) continue;
    const taken: string[] = [];
    for (let j = i + 1; j < tokens.length && taken.length < 4; j++) {
      const f = folded[j];
      if (!f) break;
      if (PLACE_STOP.has(f)) break;
      if (/\d/.test(f)) break;
      taken.push(tokens[j]);
    }
    if (taken.length) return taken.join(" ");
  }
  return null;
}

function readMode(folded: string, hasRentFigure: boolean, asset: string | null, place: string | null): AdvisorMode {
  // Order matters and is not arbitrary. A watch is a standing instruction and says
  // so explicitly; a draft names the writing; a value question is either asked in
  // words or carried by an offered rent figure. Everything else is a search,
  // which is the same default the model-backed classifier used.
  if (hasAny(folded, WATCH_WORDS)) return "watch";
  if (hasAny(folded, DRAFT_WORDS)) return "draft";
  if (hasRentFigure || hasAny(folded, VALUE_WORDS)) return "value";
  if (hasAny(folded, SEARCH_WORDS)) return "search";
  // A capability or identity question only counts as chat when the person is not
  // also naming a place or an asset. "What can you tell me about offices in
  // Hittin" is a question about inventory, not about the advisor.
  if (hasAny(folded, CHAT_WORDS) && !asset && !place) return "chat";
  return "search";
}

/**
 * Read a message's intent without a model.
 *
 * This is the advisor's behaviour whenever the external AI boundary is closed,
 * and it is also the shape a future typed tool call must produce, so the route
 * consumes exactly one intent type either way.
 */
export function readAdvisorIntent(raw: string): AdvisorIntent {
  const text = String(raw ?? "");
  const folded = foldText(text);
  const numeric = readNumericIntent(text);

  const asset = readAsset(folded);
  const place = readKnownPlace(folded) ?? readCity(folded) ?? readPlacePhrase(text);
  const figure = numeric.rent;
  const threshold = numeric.percents.length ? numeric.percents[0] : null;
  const mode = readMode(folded, figure !== null, asset, place);

  return {
    mode,
    district: place,
    asset,
    figure,
    threshold: mode === "watch" ? threshold : null,
  };
}
