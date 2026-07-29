import { foldText, prettifyKey } from "@/lib/textFold";

type L = "en" | "ar";
const ASSET: Record<string, [string,string]> = {
  office:["Office","مكاتب"], retail:["Retail & F&B","تجزئة ومطاعم"], medical:["Medical","رعاية صحية"],
  showroom:["Showroom","معارض"], warehouse:["Warehouse","مستودعات"], serviced:["Serviced","مكاتب مخدومة"],
  education:["Education","تعليم"], hospitality:["Hospitality","ضيافة"], mixed_use:["Mixed-use","متعدد الاستخدامات"],
  land:["Land","أراضٍ"], gas_station:["Gas station","محطة وقود"],
  entertainment:["Entertainment","ترفيه"], wedding_hall:["Events & wedding halls","قاعات ومناسبات"],
  worker_housing:["Worker housing","سكن عمالة"], self_storage:["Self storage","تخزين ذاتي"]
};
const DEAL: Record<string,[string,string]> = { lease:["Lease","إيجار"], sale:["Sale","بيع"] };
const GRADE: Record<string,[string,string]> = { a_plus:["A+","أ+"], a:["A","أ"], b:["B","ب"], c:["C","ج"], n_a:["N/A","N/A"] };
const FITOUT: Record<string,[string,string]> = {
  shell_and_core:["Shell & core","على المحارة"], warm_shell:["Warm shell","نصف تشطيب"],
  fitted:["Fitted","مجهز"], furnished:["Furnished","مفروش"], n_a:["N/A","N/A"]
};
const CONF: Record<string,[string,string]> = { low:["Low","منخفضة"], medium:["Medium","متوسطة"], high:["High","عالية"] };
const CITY: Record<string,[string,string]> = { Riyadh:["Riyadh","الرياض"], Jeddah:["Jeddah","جدة"], Dammam:["Dammam","الدمام"], Khobar:["Khobar","الخبر"], Makkah:["Makkah","مكة المكرمة"], Madinah:["Madinah","المدينة المنورة"] };
const idx = (l: L) => (l === "ar" ? 1 : 0);
export const assetLabel = (t: string, l: L) => (ASSET[t]?.[idx(l)]) ?? t;
export const dealLabel = (t: string, l: L) => (DEAL[t]?.[idx(l)]) ?? t;
export const gradeLabel = (t: string, l: L) => (GRADE[t]?.[idx(l)]) ?? t;
export const fitoutLabel = (t: string, l: L) => (FITOUT[t]?.[idx(l)]) ?? t;
export const confLabel = (t: string, l: L) => (CONF[t]?.[idx(l)]) ?? t;

/**
 * Spellings that mean the same city, beyond the two the CITY table renders.
 *
 * THE DEFECT THIS EXISTS TO KILL (owner ruling 5). `cityLabel` ended in `?? t`, and
 * the `city` search parameter is a slug in every link a person is likely to type or
 * share. So `/listings?city=riyadh` published "Commercial spaces in riyadh" as an H1
 * and "مساحات تجارية في riyadh" as an Arabic meta description, with a Latin slug
 * sitting inside an Arabic sentence. The lookup below is case, separator, transliteration
 * and Arabic tolerant, so the one lower-case letter that broke it cannot break it again.
 */
const CITY_ALIAS: Record<string, string[]> = {
  Riyadh: ["riyad", "ar riyadh", "al riyadh", "arriyadh", "رياض"],
  Jeddah: ["jiddah", "jedda", "jed", "جده"],
  Dammam: ["ad dammam", "al dammam", "eastern dammam"],
  Khobar: ["al khobar", "alkhobar", "el khobar", "خبر"],
  Makkah: ["mecca", "makkah al mukarramah", "makkah almukarramah", "مكه", "مكه المكرمه"],
  Madinah: ["medina", "al madinah", "almadinah", "madinah al munawwarah", "المدينه", "المدينه المنوره"],
};

const CITY_BY_FOLD: Record<string, string> = (() => {
  const m: Record<string, string> = {};
  const add = (k: string, spelling: string) => {
    const f = foldText(spelling);
    if (f && !m[f]) m[f] = k;
  };
  for (const k of Object.keys(CITY)) {
    add(k, k);
    add(k, CITY[k][0]);
    add(k, CITY[k][1]);
    for (const a of CITY_ALIAS[k] ?? []) add(k, a);
  }
  return m;
})();

/**
 * The canonical city key for anything a person or a link might carry, or null.
 *
 * Display was not the only casualty of the missing fold: `/listings` narrows by
 * `district.city === searchParams.city`, so a slug returned an empty result set as
 * well as a raw heading. Both call this, so both agree about what a city is.
 */
export const cityKey = (t: string | null | undefined): string | null =>
  t ? (CITY_BY_FOLD[foldText(t)] ?? null) : null;

/**
 * Every spelling of every city we recognise, by canonical key.
 *
 * `cityKey` folds a whole string and looks it up, which is right for a URL
 * parameter and useless for a sentence: nothing in "warehouse for lease in
 * Riyadh" is a city key. A parser that has to find a city INSIDE a longer query
 * needs the spellings themselves, and it must get them from here rather than
 * keeping its own list, because a second list is how "الخبر" comes to be a city
 * on one surface and an unrecognised word on another.
 */
export const CITY_SPELLINGS: Readonly<Record<string, readonly string[]>> = Object.freeze(
  Object.fromEntries(
    Object.keys(CITY).map((k) => [k, Object.freeze([k, CITY[k][0], CITY[k][1], ...(CITY_ALIAS[k] ?? [])])])
  )
);

export const cityLabel = (t: string | null | undefined, l: L) => {
  if (!t) return "";
  const k = cityKey(t);
  // An unknown key stays unknown, but it is never published as machine punctuation.
  return k ? CITY[k][idx(l)] : prettifyKey(t);
};

/**
 * The grade as it belongs INSIDE a sentence, or nothing at all.
 *
 * gradeLabel returns the bare letter for a chip, and returns the literal N/A
 * when a listing carries no grade, which is right for a table cell and wrong for
 * prose: it produced descriptions reading "N/A Serviced in Al Aqiq", and in
 * Arabic it dropped a Latin abbreviation into the middle of an Arabic sentence.
 * Every visible surface already guards on n_a; only the metadata layer did not.
 * An absent grade is absent, so the phrase disappears and fillProse closes the
 * gap. The word is here rather than in the dictionaries because the grade
 * vocabulary itself lives here.
 */
export const gradePhrase = (t: string | null | undefined, l: L): string =>
  !t || t === "n_a" ? "" : l === "ar" ? `فئة ${gradeLabel(t, l)}` : `Grade ${gradeLabel(t, l)}`;

const SEGMENT: Record<string,[string,string]> = {
  serviced:["Serviced & furnished","مخدومة ومفروشة"],
  clinic:["Clinic in Grade A mixed-use","عيادات ضمن مبانٍ فئة أ"], modern:["Modern · post-2015","حديثة · بعد 2015"],
  older:["Older · pre-2015","قديمة · قبل 2015"], street_front:["Street-front","واجهة شارع"],
  mall_inline:["Mall in-line","داخل المول"], listing:["Listing-derived","من القوائم"],
  // The Rent Index publishes three further segments that this table did not
  // carry, so its page kept a private copy of the whole vocabulary to name them.
  // Without these three the page could not be moved onto the shared table at
  // all: segmentLabel would have printed the raw keys "blended", "prime" and
  // "street" on a public row.
  blended:["Blended","مجمّع"], prime:["Prime","مميّز"], street:["Street retail","تجزئة الشارع"]
};
/**
 * An index segment named after a building grade is that grade, so it has to be
 * spelled the way every other grade on the site is spelled. This table used to
 * carry its own grade_a and grade_b entries reading "فئة A" with a Latin letter,
 * while gradePhrase said "فئة أ", and the listings page carried a third copy
 * saying "الفئة A" and inventing a grade_c the table did not have. One grade
 * vocabulary now answers all three, so the letter cannot drift again and no
 * segment can print a raw key.
 */
const SEGMENT_GRADE: Record<string, string> = { grade_a: "a", grade_b: "b", grade_c: "c" };
const UNIT: Record<string,[string,string]> = {
  sar_sqm_year:["SAR / m² / yr","ريال / م² / سنة"], sar_desk_month:["SAR / desk / mo","ريال / مكتب / شهر"]
};
export const segmentLabel = (t: string | null | undefined, l: L) =>
  !t ? "" : SEGMENT_GRADE[t] ? gradePhrase(SEGMENT_GRADE[t], l) : (SEGMENT[t]?.[idx(l)] ?? t);
export const unitLabel = (t: string, l: L) => (UNIT[t]?.[idx(l)]) ?? t;
