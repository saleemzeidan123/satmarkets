// ADV-3A.1. The search intent parsers, lifted out of the route.
//
// They were defined inside `src/app/api/search/route.ts`, where nothing could
// test them: a route module may only export HTTP handlers, so the deterministic
// fallback and the model-assisted parser were both unreachable from a test file.
// Codex item 1 asks for a test proving the search path stops before network
// access, and a claim about a function no test can call is the kind of claim
// ADV-3A.1 exists to correct. So they live here and the route imports them.

import { callModelText, instruction, userWords } from "@/lib/ai";
import { foldText } from "@/lib/textFold";
import { CITY_SPELLINGS, cityKey } from "@/lib/labels";
import { ASSET_SYN, DEAL_SYN } from "@/lib/search/queryParse";

export const ASSETS = ["office","retail","medical","showroom","warehouse","serviced","education","land"] as const;
type AssetT = typeof ASSETS[number];
export type Parsed = { asset: AssetT | null; deal: "lease" | "sale" | null; district: string | null; city: string | null; minSize: number | null; maxRent: number | null };

// Rules-based parser, kept as a fast, reliable fallback for when the model is
// unavailable (no key set, timeout, or error). It never sees the network.
// ADV-3A.1. THIS PARSER WAS ENGLISH ONLY, AND THAT ONLY STOPPED MATTERING WHEN
// IT STOPPED BEING THE FALLBACK.
//
// It matched `q.includes("office")` against a lowercased string, plus a handful
// of English words for clinics, warehouses and shops. For as long as a model
// answered first, that was a degraded path nobody reached. Now that the boundary
// denies the model call, this IS the search parser, and an Arabic query would
// have come back with every filter null: no asset, no deal, no size, no budget.
// Half the platform's users would have received an unfiltered list and no
// explanation, and the closure record would have called it a controlled fallback.
//
// So it folds the query the way the rest of discovery folds it, and reads assets
// and deal types from the SAME synonym tables `queryParse.ts` uses, rather than
// keeping a second, poorer vocabulary that drifts. The eight asset types this
// endpoint answers about are a subset of the discovery list, so the extra keys
// there are simply not consulted here.
const AR_PREFIX = "(?:و|ف)?(?:ب|ل|ك)?(?:ال|ل)?";
const ARABIC = /[\u0600-\u06FF]/;

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Arabic writes the article and several prepositions onto the word itself, so
// "للمكاتب" is the ordinary way to ask and a padded substring test misses it.
// Prefixes only: no suffix folding, so a longer word that merely begins with an
// asset word still does not match.
function matchLen(folded: string, word: string): number {
  const f = foldText(word);
  if (!f) return 0;
  if ((" " + folded + " ").includes(" " + f + " ")) return f.length;
  if (!ARABIC.test(f)) return 0;
  return new RegExp("(?:^|\\s)" + AR_PREFIX + escapeRe(f) + "(?=\\s|$)", "u").test(folded) ? f.length : 0;
}

const hasWord = (folded: string, word: string) => matchLen(folded, word) > 0;

const hasAny = (folded: string, words: readonly string[]) => words.some((w) => hasWord(folded, w));

// Folded, so the Arabic forms below are written the way `foldText` leaves them.
// An input grammar, not copy. Both spellings of the unit have to be
// accepted from one query, whatever keyboard it was typed on.
const AREA_UNIT = "(?:sqm|sq m|m2|m²|meter|metre|متر مربع|متر|م2)"; // unit-law
const NUMBER = "[0-9]+(?:[ ,.][0-9]{3})*";
const toNumber = (v: string) => Number(v.replace(/[ ,.]/g, ""));
const MAX_LEAD = "(?:under|below|max|maximum|up to|less than|no more than|اقل من|تحت|بحد اقصي|لا يزيد عن|لا يزيد|حتي|في حدود)";

/**
 * The canonical key of a city named anywhere in the query, or null.
 *
 * ADV-3A.1, finding 55. A city is not a district, and the two are not
 * interchangeable: `/api/search` used to test the query against the districts
 * table's `city` COLUMN, take the first row that matched, and then filter by
 * that one district. So "warehouse for lease in Riyadh" was answered by
 * narrowing to KAFD, a district the person never typed, and the relaxation note
 * told them their results were "outside KAFD".
 *
 * Resolving a city here is safe in a way that resolving a district here is not.
 * The city vocabulary is closed, finite and already rendered on public surfaces;
 * a district vocabulary is open and lives in the database, which is why the
 * comment below still refuses to guess one. Longest spelling wins, so
 * "مكه المكرمه" is not eaten by "مكه".
 */
function cityIn(folded: string): string | null {
  let city: string | null = null;
  let best = 0;
  for (const key of Object.keys(CITY_SPELLINGS)) {
    for (const spelling of CITY_SPELLINGS[key]) {
      const n = matchLen(folded, spelling);
      if (n > best) {
        best = n;
        city = key;
      }
    }
  }
  return city;
}

export function rulesParse(raw: string): Parsed {
  const q = foldText(raw);

  // Longest matched synonym wins, not first asset in the list. "serviced office"
  // and "مكتب مخدوم" both contain the word for a plain office, so a
  // first-match-wins loop returned `office` and quietly dropped the part of the
  // query that said what kind. The same shape protects "self storage" against
  // "storage" and any future specific type built on a general word.
  let asset: AssetT | null = null;
  let best = 0;
  for (const a of ASSETS) {
    for (const w of [a, ...(ASSET_SYN[a] ?? [])]) {
      const n = matchLen(q, w);
      if (n > best) {
        best = n;
        asset = a;
      }
    }
  }

  const deal: Parsed["deal"] = hasAny(q, DEAL_SYN.sale ?? [])
    ? "sale"
    : hasAny(q, DEAL_SYN.lease ?? []) || hasWord(q, "rent") || hasWord(q, "lease")
      ? "lease"
      : null;

  // `foldText` has already turned Arabic-Indic digits into Western ones, so one
  // pattern serves both scripts. It has also turned every thousands separator
  // into a space, which is why the group below accepts spaced triples: without
  // that, "under SAR 250,000" folds to "under sar 250 000" and reads as a budget
  // of 250. A trailing triple must be exactly three digits, so a stray following
  // number cannot be absorbed into the figure.
  const sizeMatch = q.match(new RegExp("(" + NUMBER + ")\\s*" + AREA_UNIT));
  const minSize = sizeMatch ? toNumber(sizeMatch[1]) : null;
  const budgetMatch = q.match(new RegExp(MAX_LEAD + "\\s*(?:sar|sr|ريال)?\\s*(" + NUMBER + ")"));
  const maxRent = budgetMatch ? toNumber(budgetMatch[1]) : null;

  // The district is deliberately still null. Resolving a district needs the
  // districts vocabulary, which this parser does not load, and inventing one
  // from a word list is exactly the silent upgrade of an unrecognised term into
  // a constraint that the discovery law forbids. A city is a different case: the
  // list is closed and we publish it, so naming one is recognition, not a guess.
  return { asset, deal, district: null, city: cityIn(q), minSize, maxRent };
}

const SEARCH_INSTRUCTION = instruction("search intent instruction")`You extract structured search filters from a commercial real estate query for Saudi Arabia. Understand both Arabic and English, including dialect and loose phrasing. Respond with strict JSON only, no prose, with exactly these keys:
- asset: one of "office","retail","medical","showroom","warehouse","serviced","education","land", or null
- deal: "lease", "sale", or null
- district: the district or area name the user means as a string, or null
- city: one of "Riyadh","Jeddah","Dammam","Khobar","Makkah","Madinah", or null
- minSize: minimum floor area in square metres as a number, or null
- maxRent: maximum rent in SAR per square metre per year as a number, or null
Infer intent: a clinic is medical, a logistics shed is warehouse, a restaurant or shop is retail, a fitted or co-working suite is serviced, a school or training centre is education. Never invent a value that is not implied. Output only the JSON object.`;

// The model-assisted intent parser.
//
// ADV-3A. This route used to reach two providers directly, from an inline array
// of base-url/key/model tuples, with no boundary call anywhere in the file. The
// ADV-0 closure record described the advisor's `llm()` as the single choke point
// through which providers are reached. That was true of the advisor and false of
// the platform, which is finding 54.
//
// It now goes through the gateway like everything else, so the boundary sees the
// request, failover is the router's chain rather than a local array, and the same
// unknown-class denial applies here as anywhere.
//
// What is sent is exactly what it looks like: our own extraction instruction and
// the words the user typed into the search box.
//
// ADV-3A.1. And while no enterprise AI agreement is in force, that second message
// is precisely what may not go: a search box is where a person types a company
// name, an expansion plan or a tenant's confidential requirement. So the boundary
// denies the request, `callModelText` returns null before any provider is
// selected or any socket is opened, and `rulesParse` answers instead. That
// degradation was already the design; what changed is that it is now the normal
// path rather than the error path. `src/lib/search/queryParse.ts` is the
// deterministic parser the discovery surface uses, and it never involves a model.
export async function llmParse(raw: string): Promise<Parsed | null> {
  if (raw.trim().length < 3) return null;
  const txt = await callModelText({
    profile: "classification",
    messages: [SEARCH_INSTRUCTION, userWords(raw, "search query")],
    json: true,
    maxTokens: 200,
    // Search is in front of a person waiting for results, so it gets a shorter
    // leash than the advisor's twelve seconds.
    timeoutMs: 7000,
  });
  if (!txt) return null;
  let o: any;
  try {
    o = JSON.parse(txt);
  } catch {
    return null;
  }
  const asset = (ASSETS as readonly string[]).includes(o?.asset) ? (o.asset as AssetT) : null;
  const deal: Parsed["deal"] = o?.deal === "lease" || o?.deal === "sale" ? o.deal : null;
  const district = typeof o?.district === "string" && o.district.trim() ? o.district.trim() : null;
  // A city the model names is only accepted if it is one of ours. An unrecognised
  // place name stays unrecognised rather than becoming a filter nobody can see.
  const city = typeof o?.city === "string" ? cityKey(o.city) : null;
  const minSize = typeof o?.minSize === "number" && isFinite(o.minSize) ? o.minSize : null;
  const maxRent = typeof o?.maxRent === "number" && isFinite(o.maxRent) ? o.maxRent : null;
  return { asset, deal, district, city, minSize, maxRent };
}
