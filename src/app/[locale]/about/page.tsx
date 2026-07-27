import { getDictionary } from "@/i18n/getDictionary";
import { isLocale } from "@/i18n/config";
import { localeMeta } from "@/lib/meta";
import { notFound } from "next/navigation";
import Reveal from "@/components/Reveal";

export function generateMetadata({ params }: { params: { locale: string } }) {
  const d = getDictionary(params.locale === "ar" ? "ar" : "en").about;
  return localeMeta(params.locale, "/about", d.metaTitle, d.metaDesc);
}

export default function AboutPage({ params }: { params: { locale: string } }) {
 if (!isLocale(params.locale)) notFound();
 const dict = getDictionary(params.locale === "ar" ? "ar" : "en");
 // Two hand-maintained language branches, and the data-moat card in both of them
 // described the rent index as publishing "median rents" and "وسيط الإيجارات".
 // The index publishes an arithmetic average from the REGA source and says so
 // everywhere else on the site, on its own KPI row, in its dataset description
 // and in the Advisor's band line. The claim is corrected here to "average" and
 // "متوسط" so the page describing the product cannot contradict the product.
 const c = dict.about;
 const cards: [string, string][] = [
  [c.cardNeutralT, c.cardNeutralB],
  [c.cardCheckedT, c.cardCheckedB],
  [c.cardMoatT, c.cardMoatB],
  [c.cardComplianceT, c.cardComplianceB],
 ];
 const steps: [string, string][] = [
  [c.stepNafathT, c.stepNafathB],
  [c.stepOwnerT, c.stepOwnerB],
  [c.stepBrokerT, c.stepBrokerB],
  [c.stepLiveT, c.stepLiveB],
 ];
 return (
  <section className="mx-auto max-w-3xl">
   <div className="eyebrow">{c.eyebrow}</div>
   <h1 className="mt-2 font-display text-4xl text-charcoal">{c.title}</h1>
   <p className="mt-5 text-[16px] leading-relaxed text-charcoal/70">{c.intro}</p>
   <Reveal>
    <div className="mt-10 grid gap-6 sm:grid-cols-2">
     {cards.map(([t,d])=>(
      <div key={t} className="card p-5"><h3 className="font-display text-lg text-charcoal">{t}</h3><p className="mt-1.5 text-[13.5px] leading-relaxed text-charcoal/60">{d}</p></div>
     ))}
    </div>
   </Reveal>
   <Reveal>
    <div className="mt-14">
     <h2 className="font-display text-2xl text-charcoal">{c.verifyTitle}</h2>
     <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-charcoal/60">{c.verifySub}</p>
     <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {steps.map(([t,d],i)=>(
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
