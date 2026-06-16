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
    foot: "سات ماركتس — ذكاء عقاري تجاري موثوق للمملكة العربية السعودية. (الاسم والعلامة قيد الإعداد.)",
  } : {
    eyebrow: "About",
    title: "The verified data authority for Gulf commercial real estate.",
    intro: "SAT Markets is an independent, neutral commercial real estate intelligence, leasing, and sales platform, starting in Riyadh. We combine verified, owner-direct listings, tenant representation, a compliant viewing workflow, a decision-grade rent index, and a building-level intelligence map in one platform, delivered English-first with a full Arabic mirror and AI search grounded in verified data.",
    cards: [["Neutral by design","Open to every owner and occupier. Platform-originated stock never silently outranks owner-direct listings."],
            ["Verified, not classifieds","Owners are verified before any listing publishes. Permit-backed, deduplicated, structured."],
            ["A real data moat","A commercial rent index: median rents by district and space type, minimum sample counts, and honest blanks where data is missing."],
            ["Compliance-native","Designed around REGA requirements, written mandates, ad-permit gating, and data-protection and e-invoicing by design."]],
    foot: "SAT Markets — verified commercial real estate intelligence for Saudi Arabia. (Name and brand in progress.)",
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
      <p className="mt-10 text-sm text-charcoal/50">{c.foot}</p>
    </section>
  );
}
