import { getDictionary } from "@/i18n/getDictionary";
import { isLocale } from "@/i18n/config";
import { localeMeta } from "@/lib/meta";
import { notFound } from "next/navigation";
import Reveal from "@/components/Reveal";

export async function generateMetadata(props: { params: Promise<{ locale: string }> }) {
 const params = await props.params;
 const d = getDictionary(params.locale === "ar" ? "ar" : "en").about;
 return localeMeta(params.locale, "/about", d.metaTitle, d.metaDesc);
}

export default async function AboutPage(props: { params: Promise<{ locale: string }> }) {
 const params = await props.params;
 if (!isLocale(params.locale)) notFound();
 const dict = getDictionary(params.locale === "ar" ? "ar" : "en");
 // Two hand-maintained language branches, and the data-moat card in both of them
 // described the rent index as publishing "median rents" and "وسيط الإيجارات".
 // The index publishes an arithmetic average from the REGA source and says so
 // everywhere else on the site, on its own KPI row, in its dataset description
 // and in the Advisor's band line. The claim is corrected here to "average" and
 // "متوسط" so the page describing the product cannot contradict the product.
 //
 // Owner ruling 3, 2026-07-28. This page carried the strongest claims on the
 // platform and the least evidence for them. Against the record it describes, 88
 // published listings hold zero advertising permits, every verification event is
 // flagged is_demo and its own basis text says no Wathq and no REGA lookup was
 // performed, and account_verifications is empty. The copy said a permit is on file
 // for every listing, that the badge here can be trusted, and that SAT is already
 // the verified data authority for the sector.
 //
 // The correction keeps the standard and drops the claim that it has been applied.
 // The three gate steps below were already written as "arrives before launch" and
 // are untouched; what changed is the surrounding copy that read them as finished
 // work. All of it lives in the dictionary, so the fix is there and the guard is
 // src/lib/claims.test.ts, which pins both the removed wording and the preview
 // qualification that replaced it.
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
   <p className="mt-5 text-[1rem] leading-relaxed text-charcoal/70">{c.intro}</p>
   <Reveal>
    <div className="mt-10 grid gap-6 sm:grid-cols-2">
     {cards.map(([t,d])=>(
      <div key={t} className="card p-5"><h3 className="font-display text-lg text-charcoal">{t}</h3><p className="mt-1.5 text-[0.84375rem] leading-relaxed text-charcoal/70">{d}</p></div>
     ))}
    </div>
   </Reveal>
   <Reveal>
    <div className="mt-14">
     <h2 className="font-display text-2xl text-charcoal">{c.verifyTitle}</h2>
     <p className="mt-2 max-w-2xl text-[0.875rem] leading-relaxed text-charcoal/70">{c.verifySub}</p>
     <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {steps.map(([t,d],i)=>(
       <div key={t} className="card p-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-azure-wash fig text-[0.8125rem] font-medium text-azure-d">{i+1}</div>
        <h3 className="mt-3 font-display text-[1rem] text-charcoal">{t}</h3>
        <p className="mt-1.5 text-[0.78125rem] leading-relaxed text-charcoal/70">{d}</p>
       </div>
      ))}
     </div>
     <p className="mt-4 text-[0.75rem] leading-relaxed text-charcoal/65">{dict.about.acronyms}</p>
    </div>
   </Reveal>
   <p className="mt-10 text-sm text-charcoal/65">{c.foot}</p>
  </section>
 );
}
