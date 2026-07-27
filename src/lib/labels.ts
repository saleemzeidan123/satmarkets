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
export const cityLabel = (t: string | null | undefined, l: L) => (t ? (CITY[t]?.[idx(l)] ?? t) : "");

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
