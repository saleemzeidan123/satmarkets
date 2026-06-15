import { isLocale } from "@/i18n/config";
import { notFound } from "next/navigation";
import Reveal from "@/components/Reveal";

export default function AboutPage({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound();
  const ar = params.locale === "ar";
  const c = ar ? {
    eyebrow: "عن المنصة",
    title: "المرجع الموثوق لبيانات العقارات التجارية في الخليج.",
    intro: "سات ماركتس منصة تأجير وبيع تجارية تبدأ من الرياض، مدعومة من سات العقارية كشريك مؤسس ووسيط رئيسي. نجمع قوائم موثقة مباشرة من الملاك، وتمثيل المستأجرين، ومسار معاينات متوافق، ومؤشر إيجار يدعم القرار في منصة محايدة واحدة، بالإنجليزية أولاً مع نسخة عربية كاملة وبحث ذكي مؤصَّل ببيانات موثقة.",
    cards: [["محايدة بالتصميم","مفتوحة لكل مالك ومستأجر. لا تتفوق قوائم سات صامتةً على القوائم المباشرة من الملاك."],
            ["موثقة لا إعلانات","يُوثَّق الملاك قبل نشر أي قائمة. مدعومة بالتصاريح، خالية من التكرار، ومنظمة."],
            ["حاجز بيانات حقيقي","مؤشر سات للإيجارات التجارية بالرياض: وسيط الإيجارات المتحققة، حد أدنى للصفقات، وشارات ثقة."],
            ["متوافقة نظامياً","رخصة منصة FAL، تفويضات مكتوبة مودعة لدى الهيئة، ضبط تصاريح الإعلان، وتوافق مع نظام حماية البيانات والفوترة."]],
    foot: "مدعومة من سات العقارية. ٢٠ عاماً وأكثر من ٢٠٠ صفقة من الخبرة، عبر أكثر من ٥٠٠ مبنى تمت مراجعته. مرخّصة من الهيئة العامة للعقار، المملكة العربية السعودية.",
  } : {
    eyebrow: "About",
    title: "The verified data authority for Gulf commercial real estate.",
    intro: "SAT Markets is a Riyadh-first, commercial-only leasing and sales exchange, powered by SAT Real Estate as founding partner and anchor brokerage. We combine verified, owner-direct listings, tenant representation, a compliant viewing workflow, and a decision-grade rent index in one neutral exchange, delivered English-first with a full Arabic mirror and AI search grounded in verified data.",
    cards: [["Neutral by design","Open to every owner and occupier. SAT-originated stock never silently outranks owner-direct listings."],
            ["Verified, not classifieds","Owners are verified before any listing publishes. Permit-backed, deduplicated, structured."],
            ["A real data moat","The SAT Riyadh Commercial Rent Index: median achieved rents, minimum cell counts, confidence badges."],
            ["Compliance-native","FAL platform class, written REGA-deposited mandates, ad-permit gating, PDPL and ZATCA by design."]],
    foot: "Powered by SAT Real Estate. 20 years and 200+ transactions of experience, across 500+ buildings reviewed. FAL licensed, Real Estate General Authority, Kingdom of Saudi Arabia.",
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
