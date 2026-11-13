import { foldText } from "@/lib/textFold";

// PKG-ADV-5. What a message is ABOUT, when it is not a question the platform's
// records can answer.
//
// THE DEFECT THIS EXISTS TO KILL, found by exercising the deployed Advisor on
// 13 November 2026.
//
// `AI_AGREEMENT_IN_FORCE` is false, so no language model is called and every
// path that hoped for one fell back to a single written sentence. That sentence
// was written for one case, a model reply that carried an unsourced figure, and
// it was being sent for every case:
//
//   "hello"                              -> "I would rather pull any rent or
//                                            price from the Rent Index than
//                                            quote one from memory."
//   "Are you a human or an AI?"          -> "Happy to help you find the right
//                                            space. Which location are you
//                                            considering..."
//   "Should I lease now or wait? What
//    do you recommend?"                  -> four listing cards, and no word
//                                            about recommending anything.
//   "average apartment rent in Dubai
//    Marina"                             -> a listing search.
//
// The third row is the one that matters most. A person asked the platform for a
// recommendation in writing and was handed property. The operator's register
// records that it holds no licence for real estate consultations, which the
// regulation defines as any recommendation, opinion or advice given to a
// beneficiary in writing. A tool that will not say "I do not recommend" has not
// declined to recommend; it has only failed to finish the sentence.
//
// So these six kinds are read here, without a model, and answered from the
// dictionaries. They are read BEFORE the intent, because "should I lease in Al
// Olaya" names a place and would otherwise be a search.
//
// WHAT IT DELIBERATELY DOES NOT DO.
//
// It does not guess at meaning. Every kind is a short list of words a person
// actually types, in both languages, and a message that matches none of them is
// not talk: it goes to the intent reader exactly as it did before.

export type AdvisorTalk = "greeting" | "identity" | "thanks" | "capability" | "advice" | "scope";

const GREETING =
  /^(hey+|hi+|hello+|hala|halla|salam+|salaam|marhaba|هلا|مرحبا?|اهلا|السلام( عليكم)?( ورحمه الله( وبركاته)?)?|good (morning|evening|afternoon)|صباح الخير|مساء الخير|yo|sup)$/;

const THANKS =
  /^(thanks|thank you|thankyou|thx|cheers|many thanks|thanks a lot|ok thanks|great thanks|شكرا|شكرا لك|شكرا جزيلا|مشكور|يعطيك العافيه|جزاك الله خير)$/;

// A request for a recommendation, an opinion or advice. Phrases, never single
// common words: "best" and "good" are in half of all searches.
const ADVICE_EN = [
  "recommend", "recommendation", "recommendations", "advise", "advice", "your opinion", "your view",
  "what do you think", "do you think", "should i", "should we", "shall i", "shall we", "would you lease",
  "would you buy", "would you rent", "good deal", "bad deal", "good investment", "good time to",
  "best time to", "right time to", "worth it", "worth buying", "worth leasing", "worth renting",
  "is it wise", "wise to", "better to lease", "better to buy", "better to rent", "lease or buy", "buy or lease",
  "rent or buy", "buy or rent", "or wait", "wait or",
];

// Arabic stems, matched as whole words with the ordinary proclitics in front and
// the ordinary attached pronouns behind. "توصيل" (delivery) must not match
// "توصي", so the tail is a closed list and not "anything".
const ADVICE_AR =
  /(?:^|\s)(?:و|ف)?(?:هل )?(?:ب|ل)?(?:ال)?(?:تنصح|انصح|تنصحون|نصيحه|نصيحت|نصايح|توصي|توصيه|توصيات|توصيت|راي|تقترح|اقتراح)(?:ني|نا|ك|كم|ه|ها|ن)?(?=\s|$)/u;

const ADVICE_AR_PHRASES = [
  "هل استاجر", "هل اشتري", "هل ابيع", "هل انتظر",
  "صفقه جيده", "استثمار جيد", "افضل وقت", "الوقت المناسب",
  "هل الافضل", "ايهما افضل", "ام انتظر", "يستاهل",
];

const IDENTITY = [
  "are you human", "are you a human", "are you real", "a real person", "are you a person", "are you a bot",
  "are you a robot", "are you ai", "are you an ai", "are you a machine", "is this ai", "is this an ai",
  "is this a bot", "human or", "who am i talking to", "who am i speaking to", "am i talking to", "who are you",
  "what are you", "language model", "chatgpt",
  "هل انت انسان", "انت انسان", "هل انت بشر", "هل انت روبوت", "انت روبوت",
  "ذكاء اصطناعي", "هل انت حقيقي", "من انت", "مين انت", "ما انت",
  "مع من اتحدث", "مع من اتكلم", "هل اتحدث مع",
];

const CAPABILITY = [
  "what can you do", "what else can you do", "what do you do", "how does this work", "how do you work",
  "what do you offer", "what is sat", "what does sat", "tell me about sat", "help me understand", "can you help",
  "what can i ask", "what do you know", "what data do you", "how can you help",
  "ماذا تفعل", "ماذا تقدم", "ماذا يمكنك", "ما الذي يمكنك", "ما هي سات",
  "كيف يعمل", "كيف تعمل", "وش تسوي", "وش تقدر", "ايش تقدر", "كيف تساعدني",
  "بماذا تساعدني", "ماذا اسال",
];

// Outside what the platform holds. Homes, and places outside the Kingdom. Both
// lists are closed: a place this file has never heard of is not out of scope, it
// is a district name to be looked up, and the lookup says so if it finds nothing.
const RESIDENTIAL = [
  "apartment", "apartments", "flat", "flats", "villa", "villas", "house", "houses", "townhouse", "bedroom",
  "bedrooms", "residential", "studio apartment",
  "شقه", "شقق", "فيلا", "فلل", "سكني", "سكنيه", "منزل", "منازل", "غرفه نوم", "غرف نوم",
];

const ABROAD = [
  "dubai", "abu dhabi", "sharjah", "uae", "emirates", "doha", "qatar", "kuwait", "bahrain", "manama", "muscat",
  "oman", "cairo", "egypt", "amman", "jordan", "london", "new york", "istanbul",
  "دبي", "ابوظبي", "ابو ظبي", "الشارقه", "الامارات", "الدوحه", "قطر", "الكويت",
  "البحرين", "المنامه", "مسقط", "عمان", "القاهره", "مصر", "الاردن", "لندن", "اسطنبول",
];

const ARABIC = /[؀-ۿ]/;
const AR_PREFIX = "(?:و|ف)?(?:ب|ل|ك)?(?:ال|ل)?";

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Whole-word (or whole-phrase) match on folded text, with Arabic proclitics allowed. */
function has(folded: string, words: readonly string[]): boolean {
  const padded = " " + folded + " ";
  for (const w of words) {
    const f = foldText(w);
    if (!f) continue;
    if (padded.includes(" " + f + " ")) return true;
    if (ARABIC.test(f) && new RegExp("(?:^|\\s)" + AR_PREFIX + escapeRe(f) + "(?=\\s|$)", "u").test(folded)) return true;
  }
  return false;
}

/**
 * Read what a message is about, when it is talk rather than a question about
 * the records. Null means "not talk": hand it to `readAdvisorIntent`.
 *
 * `names` says whether the intent reader found a place or an asset type. A
 * capability question that also names one is a question about inventory ("what
 * can you tell me about offices in Hittin"), which is the rule the intent reader
 * already held and is kept here unchanged.
 *
 * Order is the order of consequence. Out of scope first, because nothing else
 * can be answered about a flat in Dubai. Advice second, because a sentence that
 * asks for a recommendation must be told there is none even when the rest of it
 * is answerable. Identity before capability, because "who are you and what can
 * you do" is owed the honest half first.
 */
export function readAdvisorTalk(raw: string, names: { place: boolean; asset: boolean } = { place: false, asset: false }): AdvisorTalk | null {
  const folded = foldText(String(raw ?? ""));
  if (!folded) return null;
  if (has(folded, RESIDENTIAL) || has(folded, ABROAD)) return "scope";
  if (has(folded, ADVICE_EN) || ADVICE_AR.test(folded) || has(folded, ADVICE_AR_PHRASES)) return "advice";
  if (has(folded, IDENTITY)) return "identity";
  if (has(folded, CAPABILITY) && !names.place && !names.asset) return "capability";
  if (THANKS.test(folded)) return "thanks";
  if (GREETING.test(folded) || folded.length < 4) return "greeting";
  return null;
}
