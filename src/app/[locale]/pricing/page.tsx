import { getDictionary } from "@/i18n/getDictionary";
import { isLocale } from "@/i18n/config";
import { pageMeta } from "@/lib/meta";
import { notFound } from "next/navigation";
import { Icon } from "@/components/satkit";

type Tier = { nm: string; who: string; price: string; unit: string; feat: boolean; ghost?: boolean; cta: string; pts: string[] };

export function generateMetadata({ params }: { params: { locale: string } }) {
  return pageMeta(params.locale, '/pricing', 'Pricing | SAT Markets', 'الأسعار | سات ماركتس', 'How SAT Markets works and what it costs. Listing and verification are free. SAT Markets does not act for buyers or tenants and takes no commission.', 'كيف تعمل سات ماركتس وكم تكلفتها. الإدراج والتوثيق مجاناً. لا تعمل سات ماركتس وكيلاً عن أي طرف ولا تتقاضى عمولة.');
}

export default function PricingPage({ params }: { params: { locale: string } }) {
 if (!isLocale(params.locale)) notFound();
 const ar = params.locale === "ar";
 const dict = getDictionary(params.locale === "ar" ? "ar" : "en");
 const tiers: Tier[] = ar ? [
  { nm: "مستكشف", who: "تصفّح واستفسر، مجاني للأبد", price: "0", unit: "ريال", feat: false, ghost: true, cta: "تصفّح مجاناً",
   pts: ["<b>1</b> قائمة نشطة", "<b>2</b> طلب منشور", "تواصل مع المُدرِجين الموثّقين", "مؤشر الإيجارات، وسطاء الأحياء", "<b>10</b> استفسارات للمستشار الذكي / شهر"] },
  { nm: "مبتدئ", who: "ملاك أفراد في البداية", price: "299", unit: "ريال/شهر", feat: false, cta: "اختر مبتدئ",
   pts: ["<b>5</b> قوائم نشطة", "<b>1</b> تمييز مميّز / شهر", "<b>50</b> كشف تواصل / شهر", "مؤشر الإيجارات الكامل + تنبيهات", "<b>100</b> استفسار ذكاء / شهر"] },
  { nm: "احترافي", who: "ملاك نشطون ووسطاء أفراد", price: "899", unit: "ريال/شهر", feat: true, cta: "اختر احترافي",
   pts: ["<b>25</b> قائمة نشطة", "<b>5</b> تمييزات / شهر", "كشوفات وعملاء بلا حدود", "ذكاء الموقع، <b>10</b>/شهر", "<b>5</b> مقاعد"] },
  { nm: "وكالة", who: "مكاتب وساطة وفرق متعددة", price: "2,900", unit: "ريال/شهر", feat: false, cta: "اختر وكالة",
   pts: ["<b>150</b> قائمة نشطة", "<b>30</b> تمييز / شهر", "ذكاء الموقع، <b>50</b>/شهر", "<b>15</b> مقعداً · توجيه العملاء", "واجهة برمجية، <b>25k</b> طلب / شهر"] },
  { nm: "مؤسسات", who: "مطوّرون وصناديق ومؤسسات", price: "مخصّص", unit: "", feat: false, ghost: true, cta: "تحدّث للمبيعات",
   pts: ["<b>بلا حدود</b> قوائم ومقاعد", "بيانات كاملة وموجزات برمجية", "دخول موحّد وأدوار مخصّصة", "تقارير محفظة مجدولة", "مدير مخصّص + اتفاقية مستوى خدمة"] },
 ] : [
  { nm: "Explorer", who: "Browse & enquire, free forever", price: "0", unit: "SAR", feat: false, ghost: true, cta: "Free to browse",
   pts: ["<b>1</b> active listing", "<b>2</b> requirement posts", "Contact verified listers", "Rent Index, district medians", "<b>10</b> AI Advisor queries / mo"] },
  { nm: "Starter", who: "Individual owners getting started", price: "299", unit: "SAR/mo", feat: false, cta: "Choose Starter",
   pts: ["<b>5</b> active listings", "<b>1</b> featured boost / mo", "<b>50</b> contact reveals / mo", "Full Rent Index + alerts", "<b>100</b> AI queries / mo"] },
  { nm: "Professional", who: "Active owners & solo brokers", price: "899", unit: "SAR/mo", feat: true, cta: "Choose Professional",
   pts: ["<b>25</b> active listings", "<b>5</b> featured boosts / mo", "Unlimited reveals & leads", "Location Intelligence, <b>10</b>/mo", "<b>5</b> seats"] },
  { nm: "Agency", who: "Brokerages & multi-agent teams", price: "2,900", unit: "SAR/mo", feat: false, cta: "Choose Agency",
   pts: ["<b>150</b> active listings", "<b>30</b> featured / mo", "Location Intelligence, <b>50</b>/mo", "<b>15</b> seats · lead routing", "API, <b>25k</b> calls / mo"] },
  { nm: "Enterprise", who: "Developers, REITs & institutions", price: "Custom", unit: "", feat: false, ghost: true, cta: "Talk to sales",
   pts: ["<b>Unlimited</b> listings & seats", "Full data & API feeds", "SSO & custom roles", "Scheduled portfolio reports", "Dedicated manager + SLA"] },
 ];
 const matrix: string[][] = ar ? [
  ["grp", "العروض والتسويق"],
  ["القوائم النشطة", "1", "5", "25", "150", "∞"],
  ["تمييزات / شهر", "غير متاح", "1", "5", "30", "مخصّص"],
  ["الطلبات المنشورة", "2", "10", "∞", "∞", "∞"],
  ["grp", "العملاء والاستفسارات"],
  ["كشوفات التواصل / شهر", "5", "50", "∞", "∞", "∞"],
  ["صندوق العملاء والتحليلات", "no", "yes", "yes", "yes", "yes"],
  ["عمليات البحث المحفوظة والتنبيهات", "3", "20", "∞", "∞", "∞"],
  ["grp", "البيانات والذكاء"],
  ["مؤشر الإيجارات", "وسطاء", "كامل", "كامل + سجل", "كامل + بالجملة", "كامل + موجز"],
  ["ذكاء الموقع / شهر", "غير متاح", "2", "10", "50", "∞"],
  ["استفسارات المستشار الذكي / شهر", "10", "100", "500", "2,000", "∞"],
  ["تصدير التقارير", "no", "yes", "yes", "yes", "yes"],
  ["grp", "الفريق والواجهة البرمجية والدعم"],
  ["مقاعد الفريق", "1", "2", "5", "15", "∞"],
  ["الوصول للواجهة البرمجية", "no", "no", "no", "25k/شهر", "مخصّص"],
  ["الدعم", "المجتمع", "بريد", "أولوية", "مدير", "اتفاقية + مدير"],
 ] : [
  ["grp", "Listings & marketing"],
  ["Active listings", "1", "5", "25", "150", "∞"],
  ["Featured boosts / mo", "n/a", "1", "5", "30", "Custom"],
  ["Requirement posts", "2", "10", "∞", "∞", "∞"],
  ["grp", "Leads & enquiries"],
  ["Contact reveals / mo", "5", "50", "∞", "∞", "∞"],
  ["Lead inbox & analytics", "no", "yes", "yes", "yes", "yes"],
  ["Saved searches & alerts", "3", "20", "∞", "∞", "∞"],
  ["grp", "Data & intelligence"],
  ["Rent Index", "Medians", "Full", "Full + history", "Full + bulk", "Full + feed"],
  ["Location Intelligence / mo", "n/a", "2", "10", "50", "∞"],
  ["AI Advisor queries / mo", "10", "100", "500", "2,000", "∞"],
  ["Report export", "no", "yes", "yes", "yes", "yes"],
  ["grp", "Team, API & support"],
  ["Team seats", "1", "2", "5", "15", "∞"],
  ["API access", "no", "no", "no", "25k/mo", "Custom"],
  ["Support", "Community", "Email", "Priority", "Manager", "SLA + manager"],
 ];
 const heads = ar ? ["مستكشف", "مبتدئ", "احترافي", "وكالة", "مؤسسات"] : ["Explorer", "Starter", "Professional", "Agency", "Enterprise"];
 const cell = (v: string) => v === "yes" ? <span className="yes">✓</span> : v === "no" ? <span className="no">{dict.pricing.na}</span> : <span className="tnum">{v}</span>;
 return (
  <div style={{ background: "var(--paper)" }}>
   <div style={{ padding: "48px 24px 28px", textAlign: "center", background: "linear-gradient(180deg,var(--cool),var(--paper))" }}>
    <div className="eyebrow">{dict.pricing.membership}</div>
    <h1 className="serif" style={{ fontSize: "clamp(30px,5vw,40px)", fontWeight: 500, letterSpacing: "-.02em", margin: "12px 0 0" }}>{dict.pricing.h1}</h1>
    <p className="muted" style={{ fontSize: 15.5, maxWidth: 560, margin: "14px auto 0" }}>{dict.pricing.sub}</p>
    <div className="seg" style={{ display: "inline-flex", marginTop: 22 }}><span className="on">{dict.pricing.monthly}</span><span>{dict.pricing.annual}</span></div>
   </div>
   <div style={{ maxWidth: 1360, margin: "0 auto" }}>
    <div className="tier-grid" style={{ padding: "14px 24px 8px" }}>
     {tiers.map((t, i) => (
      <div key={i} className={"tier" + (t.feat ? " feat" : "")}>
       {t.feat && <span className="ribbon">{dict.pricing.mostPopular}</span>}
       <div className="nm">{t.nm}</div>
       <div className="who">{t.who}</div>
       <div className="price">{t.price}{t.unit && <small> {t.unit}</small>}</div>
       <ul>
        {t.pts.map((p, j) => <li key={j}><span className="ck"><Icon.check size={14} /></span><span dangerouslySetInnerHTML={{ __html: p }} /></li>)}
       </ul>
       <div style={{ flex: 1 }} />
       <span className={"btn " + (t.ghost ? "secondary" : "primary")} style={{ justifyContent: "center", marginTop: 20 }}>{t.cta}</span>
      </div>
     ))}
    </div>
    <p className="muted" style={{ textAlign: "center", fontSize: 12, margin: "10px 0 0" }}>{dict.pricing.vatNote}</p>

    <div style={{ padding: "36px 24px 48px" }}>
     <h2 className="serif" style={{ fontSize: 24, fontWeight: 500, letterSpacing: "-.02em", margin: "0 0 16px" }}>{dict.pricing.compareLimits}</h2>
     <div className="card" style={{ overflow: "hidden", boxShadow: "none" }}>
      <div style={{ overflowX: "auto" }}>
       <table className="matrix">
        <thead><tr><th></th><th>{heads[0]}</th><th>{heads[1]}</th><th style={{ color: "var(--azure-d)" }}>{heads[2]}</th><th>{heads[3]}</th><th>{heads[4]}</th></tr></thead>
        <tbody>
         {matrix.map((r, i) => r[0] === "grp"
          ? <tr key={i} className="grp"><td colSpan={6}>{r[1]}</td></tr>
          : <tr key={i}><td>{r[0]}</td>{r.slice(1).map((v, j) => <td key={j}>{cell(v)}</td>)}</tr>)}
        </tbody>
       </table>
      </div>
     </div>
    </div>
   </div>
  </div>
 );
}
