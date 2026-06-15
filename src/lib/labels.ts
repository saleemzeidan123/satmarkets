type L = "en" | "ar";
const ASSET: Record<string, [string,string]> = {
  office:["Office","مكاتب"], retail:["Retail & F&B","تجزئة ومطاعم"], medical:["Medical","رعاية صحية"],
  showroom:["Showroom","معارض"], warehouse:["Warehouse","مستودعات"], serviced:["Serviced","مكاتب مخدومة"],
  education:["Education","تعليم"], land:["Land","أراضٍ"]
};
const DEAL: Record<string,[string,string]> = { lease:["Lease","إيجار"], sale:["Sale","بيع"] };
const GRADE: Record<string,[string,string]> = { a_plus:["A+","أ+"], a:["A","أ"], b:["B","ب"], c:["C","ج"], n_a:["—","—"] };
const FITOUT: Record<string,[string,string]> = {
  shell_and_core:["Shell & core","على المحارة"], warm_shell:["Warm shell","نصف تشطيب"],
  fitted:["Fitted","مجهز"], furnished:["Furnished","مفروش"], n_a:["—","—"]
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
