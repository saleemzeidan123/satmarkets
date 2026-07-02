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
const CITY: Record<string,[string,string]> = { Riyadh:["Riyadh","الرياض"], Jeddah:["Jeddah","جدة"], Dammam:["Dammam","الدمام"], Khobar:["Khobar","الخبر"] };
const idx = (l: L) => (l === "ar" ? 1 : 0);
export const assetLabel = (t: string, l: L) => (ASSET[t]?.[idx(l)]) ?? t;
export const dealLabel = (t: string, l: L) => (DEAL[t]?.[idx(l)]) ?? t;
export const gradeLabel = (t: string, l: L) => (GRADE[t]?.[idx(l)]) ?? t;
export const fitoutLabel = (t: string, l: L) => (FITOUT[t]?.[idx(l)]) ?? t;
export const confLabel = (t: string, l: L) => (CONF[t]?.[idx(l)]) ?? t;
export const cityLabel = (t: string | null | undefined, l: L) => (t ? (CITY[t]?.[idx(l)] ?? t) : "");

const SEGMENT: Record<string,[string,string]> = {
  grade_a:["Grade A","فئة A"], grade_b:["Grade B","فئة B"], serviced:["Serviced & furnished","مخدومة ومفروشة"],
  clinic:["Clinic in Grade A mixed-use","عيادات ضمن مبانٍ فئة A"], modern:["Modern · post-2015","حديثة · بعد 2015"],
  older:["Older · pre-2015","قديمة · قبل 2015"], street_front:["Street-front","واجهة شارع"],
  mall_inline:["Mall in-line","داخل المول"], listing:["Listing-derived","من القوائم"]
};
const UNIT: Record<string,[string,string]> = {
  sar_sqm_year:["SAR / sqm / yr","ريال / م² / سنة"], sar_desk_month:["SAR / desk / mo","ريال / مكتب / شهر"]
};
export const segmentLabel = (t: string | null | undefined, l: L) => (t ? (SEGMENT[t]?.[idx(l)] ?? t) : "");
export const unitLabel = (t: string, l: L) => (UNIT[t]?.[idx(l)]) ?? t;
