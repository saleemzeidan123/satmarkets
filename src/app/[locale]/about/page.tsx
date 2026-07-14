import { getDictionary } from "@/i18n/getDictionary";
import { isLocale } from "@/i18n/config";
import { pageMeta } from "@/lib/meta";
import { notFound } from "next/navigation";
import Reveal from "@/components/Reveal";

export function generateMetadata({ params }: { params: { locale: string } }) {
  return pageMeta(params.locale, '/about', 'About | SAT Markets', 'من نحن | سات ماركتس', 'The neutral, verified commercial real estate exchange for Saudi Arabia, powered by SAT Real Estate (REGA FAL 1200025510).', 'منصة العقار التجاري المحايدة والموثّقة في السعودية، مشغّلة من سات العقارية (رخصة فال 1200025510).');
}

export default function AboutPage({ params }: { params: { locale: string } }) {
 if (!isLocale(params.locale)) notFound();
 const ar = params.locale === "ar";
 const dict = getDictionary(params.locale === "ar" ? "ar" : "en");
 const c = ar ? {
  eyebrow: "عن المنصة",
  title: "المرجع الموثوق لبيانات العقارات التجارية في السعودية.",
  intro: "سات ماركتس منصة مستقلة ومحايدة للذكاء العقاري التجاري والتأجير والبيع، تبدأ من الرياض. نجمع قوائم موثقة مباشرة من الملاك، وتمثيل المستأجرين، ومسار معاينات متوافق، ومؤشر إيجار يدعم القرار، وخريطة ذكاء على مستوى المبنى، في منصة واحدة بالإنجليزية أولاً مع نسخة عربية كاملة وبحث ذكي مؤصَّل ببيانات موثقة.",
  cards: [["محايدة بالتصميم","مفتوحة لكل مالك ومستأجر. لا تتفوق القوائم الخاصة صامتةً على القوائم المباشرة من الملاك."],
      ["مفحوصة لا إعلانات","يُوثَّق الملاك قبل نشر أي عرض، ولا يدخل السوق عرض بلا تصريح إعلان مسجّل. ولكل عرض حالة توثيقه ظاهرة عليه، فالشارة ليست زينة."],
      ["حاجز بيانات حقيقي","مؤشر إيجار تجاري: وسيط الإيجارات حسب الحي ونوع المساحة، حد أدنى للعينة، وخلايا فارغة بصدق حين لا تتوفر البيانات."],
      ["متوافقة نظامياً","مصمّمة حول متطلبات الهيئة العامة للعقار، والتفويضات المكتوبة، وضبط تصاريح الإعلان، وحماية البيانات والفوترة."]],
  verifyTitle: "كيف نتحقق من كل قائمة",
  verifySub: "بدون إعلانات مجهولة. قبل نشر أي مساحة، نتحقق من الشخص والملكية والترخيص.",
  steps: [
   ["هوية نفاذ","تراجع سات الشخص وراء كل قائمة قبل نشرها. وتسجيل الدخول عبر نفاذ، لربط الهوية بالهوية الرقمية الوطنية، يصل قبل الإطلاق."],
   ["الملكية والتصريح","يؤكد الملّاك الملكية وحق التأجير. والتحقق الآلي مع سجلات الهيئة العامة للعقار ومنصة إيجار يصل قبل الإطلاق."],
   ["وسطاء مرخّصون","على أي وسيط أن يحمل ترخيص فال سارياً من الهيئة العامة للعقار. والتحقق الآلي من السجل يصل قبل الإطلاق."],
   ["ثم تُنشر","بعد هذه الفحوص فقط تُنشر القائمة، مع شارة موثّقة يمكن لأي زائر الاطمئنان لها."],
  ],
  foot: "سات ماركتس، ذكاء عقاري تجاري موثوق للمملكة العربية السعودية.",
 } : {
  eyebrow: "About",
  title: "The verified data authority for Saudi commercial real estate.",
  intro: "SAT Markets is an independent, neutral commercial real estate intelligence, leasing, and sales platform, starting in Riyadh. We combine verified listings from owners and licensed brokers, a compliant viewing workflow, a decision-grade rent index, and a building-level intelligence map in one platform, delivered English-first with a full Arabic mirror and AI search grounded in verified data.",
  cards: [["Neutral by design","Open to every owner and occupier. Platform-originated stock never silently outranks owner-direct listings."],
      ["Checked, not classifieds","Owners are verified before a listing publishes, and no listing enters the market without an advertising permit on file. Every listing shows its own verification state; the badge is never decoration."],
      ["A real data moat","A commercial rent index: median rents by district and space type, minimum sample counts, and honest blanks where data is missing."],
      ["Compliance-native","Designed around REGA requirements, written mandates, ad-permit gating, and data-protection and e-invoicing by design."]],
  verifyTitle: "How we verify every listing",
  verifySub: "No anonymous classifieds. Before a space goes live, we check the person, the property, and the licence.",
  steps: [
   ["Nafath identity","SAT reviews the person behind each listing before it publishes. Nafath national-ID sign-in, binding identity to the national digital identity, arrives before launch."],
   ["Ownership & permit","Owners confirm ownership and the right to lease. Automated checks against REGA (the Real Estate General Authority) and the Ejar registry arrive before launch."],
   ["Licensed brokers","Brokers must hold a valid FAL licence from REGA. Automated verification against the REGA register arrives before launch."],
   ["Then it goes live","Only after these checks does a listing publish, with a Verified badge any visitor can trust."],
  ],
  foot: "SAT Markets, verified commercial real estate intelligence for Saudi Arabia.",
 };
 return (
  <section className="mx-auto max-w-3xl">
   <div className="eyebrow">{c.eyebrow}</div>
   <h1 className="mt-2 font-display text-4xl text-charcoal">{c.title}</h1>
   <p className="mt-5 text-[16px] leading-relaxed text-charcoal/70">{c.intro}</p>
   <Reveal>
    <div className="mt-10 grid gap-6 sm:grid-cols-2">
     {c.cards.map(([t,d])=>(
      <div key={t} className="card p-5"><h3 className="font-display text-lg text-charcoal">{t}</h3><p className="mt-1.5 text-[13.5px] leading-relaxed text-charcoal/60">{d}</p></div>
     ))}
    </div>
   </Reveal>
   <Reveal>
    <div className="mt-14">
     <h2 className="font-display text-2xl text-charcoal">{c.verifyTitle}</h2>
     <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-charcoal/60">{c.verifySub}</p>
     <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {c.steps.map(([t,d],i)=>(
       <div key={t} className="card p-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-azure-wash fig text-[13px] font-medium text-azure-d">{i+1}</div>
        <h3 className="mt-3 font-display text-[16px] text-charcoal">{t}</h3>
        <p className="mt-1.5 text-[12.5px] leading-relaxed text-charcoal/60">{d}</p>
       </div>
      ))}
     </div>
     <p className="mt-4 text-[12px] leading-relaxed text-charcoal/45">{dict.about.acronyms}</p>
    </div>
   </Reveal>
   <p className="mt-10 text-sm text-charcoal/50">{c.foot}</p>
  </section>
 );
}
