import { isLocale } from "@/i18n/config";
import { notFound } from "next/navigation";
import Reveal from "@/components/Reveal";

export default function AboutPage({ params }: { params: { locale: string } }) {
 if (!isLocale(params.locale)) notFound();
 const ar = params.locale === "ar";
 const c = ar ? {
  eyebrow: "عن المنصة",
  title: "المرجع الموثوق لبيانات العقارات التجارية في الخليج.",
  intro: "سات ماركتس منصة مستقلة ومحايدة للذكاء العقاري التجاري والتأجير والبيع، تبدأ من الرياض. نجمع قوائم موثقة مباشرة من الملاك، وتمثيل المستأجرين، ومسار معاينات متوافق، ومؤشر إيجار يدعم القرار، وخريطة ذكاء على مستوى المبنى، في منصة واحدة بالإنجليزية أولاً مع نسخة عربية كاملة وبحث ذكي مؤصَّل ببيانات موثقة.",
  cards: [["محايدة بالتصميم","مفتوحة لكل مالك ومستأجر. لا تتفوق القوائم الخاصة صامتةً على القوائم المباشرة من الملاك."],
      ["موثقة لا إعلانات","يُوثَّق الملاك قبل نشر أي قائمة. مدعومة بالتصاريح، خالية من التكرار، ومنظمة."],
      ["حاجز بيانات حقيقي","مؤشر إيجار تجاري: وسيط الإيجارات حسب الحي ونوع المساحة، حد أدنى للعينة، وخلايا فارغة بصدق حين لا تتوفر البيانات."],
      ["متوافقة نظامياً","مصمّمة حول متطلبات الهيئة العامة للعقار، والتفويضات المكتوبة، وضبط تصاريح الإعلان، وحماية البيانات والفوترة."]],
  verifyTitle: "كيف نتحقق من كل قائمة",
  verifySub: "بدون إعلانات مجهولة. قبل نشر أي مساحة، نتحقق من الشخص والملكية والترخيص.",
  steps: [
   ["هوية نفاذ","يسجّل كل مالك الدخول عبر نفاذ، الهوية الرقمية الوطنية السعودية، لنتأكد أن شخصاً حقيقياً وموثقاً وراء كل قائمة."],
   ["الملكية والتصريح","نطابق العقار مع سجلات الهيئة العامة للعقار (ريقا) ومنصة إيجار، فتكون المساحة وحق تأجيرها حقيقيين."],
   ["وسطاء مرخّصون","أي وسيط على المنصة يحمل ترخيص فال سارياً من الهيئة العامة للعقار، نتحقق منه قبل أن يعمل."],
   ["ثم تُنشر","بعد هذه الفحوص فقط تُنشر القائمة، مع شارة موثّقة يمكن لأي زائر الاطمئنان لها."],
  ],
  foot: "سات ماركتس، ذكاء عقاري تجاري موثوق للمملكة العربية السعودية.",
 } : {
  eyebrow: "About",
  title: "The verified data authority for Gulf commercial real estate.",
  intro: "SAT Markets is an independent, neutral commercial real estate intelligence, leasing, and sales platform, starting in Riyadh. We combine verified, owner-direct listings, tenant representation, a compliant viewing workflow, a decision-grade rent index, and a building-level intelligence map in one platform, delivered English-first with a full Arabic mirror and AI search grounded in verified data.",
  cards: [["Neutral by design","Open to every owner and occupier. Platform-originated stock never silently outranks owner-direct listings."],
      ["Verified, not classifieds","Owners are verified before any listing publishes. Permit-backed, deduplicated, structured."],
      ["A real data moat","A commercial rent index: median rents by district and space type, minimum sample counts, and honest blanks where data is missing."],
      ["Compliance-native","Designed around REGA requirements, written mandates, ad-permit gating, and data-protection and e-invoicing by design."]],
  verifyTitle: "How we verify every listing",
  verifySub: "No anonymous classifieds. Before a space goes live, we check the person, the property, and the licence.",
  steps: [
   ["Nafath identity","Every owner signs in with Nafath, Saudi Arabia\u2019s national digital identity, so we know a real, verified person is behind each listing."],
   ["Ownership & permit","We match the property against REGA (the Real Estate General Authority) and the Ejar tenancy registry, so the space and the right to lease it are real."],
   ["Licensed brokers","Any broker on the platform holds a valid FAL licence from REGA. We verify it before they can act on a deal."],
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
     <p className="mt-4 text-[12px] leading-relaxed text-charcoal/45">{ar ? "نفاذ: الهوية الرقمية الوطنية · ريقا: الهيئة العامة للعقار · إيجار: منصة العقود الإيجارية · فال: ترخيص الوساطة العقارية" : "Nafath = national digital ID · REGA = Real Estate General Authority · Ejar = government tenancy registry · FAL = real-estate brokerage licence"}</p>
    </div>
   </Reveal>
   <p className="mt-10 text-sm text-charcoal/50">{c.foot}</p>
  </section>
 );
}
