import { getDictionary } from "@/i18n/getDictionary";
import { isLocale } from "@/i18n/config";
import { pageMeta } from "@/lib/meta";
import { notFound } from "next/navigation";
import Link from "next/link";
import Reveal from "@/components/Reveal";

export function generateMetadata({ params }: { params: { locale: string } }) {
  return pageMeta(
    params.locale,
    "/neutrality",
    "How SAT Markets stays neutral | SAT Markets",
    "كيف تبقى سات ماركتس محايدة | سات ماركتس",
    "SAT Markets is operated by SAT Real Estate and discloses it openly. Here is exactly how operating the exchange gives SAT no advantage as a broker.",
    "تُشغّل سات ماركتس من قبل سات العقارية وتفصح عن ذلك بوضوح. وهنا كيف لا يمنح تشغيل المنصة سات أي أفضلية كوسيط."
  );
}

export default function NeutralityPage({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound();
  const ar = params.locale === "ar";
  const lp = ar ? "ar" : "en";

  const c = ar
    ? {
        eyebrow: "الحياد",
        title: "كيف تبقى سات ماركتس محايدة",
        intro:
          "نُفصح عن هذا بوضوح: تُشغّل سات ماركتس من قبل شركة سات العقارية، وهي شركة عقارية مرخّصة (رخصة فال 1200025510)، ولدى سات العقارية أيضاً ذراع وساطة مرخّصة. نُدير المنصة بحيث لا يمنح تشغيلُها سات أي أفضلية كوسيط. الحياد هنا ليس شعاراً بل مجموعة التزامات قابلة للتحقق.",
        commitmentsTitle: "التزامات الحياد",
        commitments: [
          ["لا أفضلية في الترتيب", "القوائم المباشرة من الملّاك لا تتراجع أبداً خلف القوائم التي تمثّلها سات. يُطبَّق الترتيب بالقواعد نفسها على الجميع."],
          ["لا نُمثّل أحداً", "سات ماركتس لا تُمثّل المستأجرين ولا المشترين ولا الملّاك ولا الوسطاء. هناك مسار واحد للتواصل من الإعلان وهو يصل إلى المُعلِن مباشرة. أزلنا خدمة التمثيل بالكامل بدلاً من تشغيل منصة تنافس من يُدرجون إعلاناتهم عليها."],
          ["لا أفضلية في البيانات", "لا تحصل ذراع الوساطة في سات على وصول أبكر أو مميّز إلى العملاء المحتملين أو المتطلبات أو بيانات المؤشر مقارنةً بأي مشارك موثّق آخر."],
          ["التوثيق تقرره جهة مرجعية", "شارة “موثّق” تأتي من مطابقة سجل مرجعي أو من مُراجع بشري، لا من اختيار سات محاباة نفسها."],
          ["نُبلّغ عن ذلك", "نعتزم أن ننشر كل ربع سنة نسبة الإعلانات والصفقات التي تعود لشركة سات العقارية نفسها، حتى يكون التوازن ظاهراً للجميع لا مجرّد ادّعاء. (مُخطّط له.)"],
        ],
        whyTitle: "لماذا كيان واحد الآن",
        whyBody:
          "في هذه المرحلة التجريبية تعمل المنصة تحت رخصة سات العقارية، والفصل بين سات-المُشغّل وسات-الوسيط تعاقدي وتشغيلي. ونحن ندرس فصلاً قانونياً مستقلاً للمنصة قبل الإطلاق العام. نُفضّل أن نكون صريحين بشأن هذا الترتيب بدلاً من إخفائه.",
        closeTitle: "إن رأيت خللاً في الحياد",
        closeBody:
          "إن رأيت يوماً سات-المُشغّل يمنح سات-الوسيط أفضلية، فهذا خطأ يجب إصلاحه. أخبرنا عبر صفحة التواصل.",
        cta: "تواصل معنا",
      }
    : {
        eyebrow: "Neutrality",
        title: "How SAT Markets stays neutral",
        intro:
          "We disclose this plainly: SAT Markets is operated by SAT Real Estate, a licensed real estate company (FAL 1200025510), and SAT Real Estate also has a licensed brokerage arm. We run the exchange so that operating it gives SAT no advantage as a broker. Neutrality here is not a slogan; it is a set of commitments you can check.",
        commitmentsTitle: "The neutrality commitments",
        commitments: [
          ["No ranking preference", "SAT Real Estate publishes its own listings here, as any licensed broker does. They are marked as ours, they sit in the same ranking, and they get no placement, badge or feature another broker cannot get."],
          ["We do not act for anyone", "SAT Markets does not represent tenants, buyers, owners or brokers. There is one path off a listing and it goes to the lister. We removed the representation service entirely rather than run an exchange that competes with the people listing on it."],
          ["No data advantage", "SAT's brokerage arm gets no earlier or privileged access to leads, requirements, or index data than any other verified participant."],
          ["Verification is authority-decided", "A “verified” badge comes from an authoritative record match or a human reviewer, never from SAT choosing to favour itself."],
          ["We report on it", "We intend to publish, each quarter, what share of listings and deals were SAT Real Estate's own, so the balance is visible to everyone and not merely asserted. (Planned.)"],
        ],
        whyTitle: "Why one entity, for now",
        whyBody:
          "During this preview the platform operates under SAT Real Estate's licence, and the separation between SAT-as-operator and SAT-as-broker is contractual and operational. We are considering a separate legal entity for the exchange before public launch. We would rather be candid about this arrangement than hide it.",
        closeTitle: "If you ever see neutrality break",
        closeBody:
          "If you ever see SAT-as-operator giving SAT-as-broker an edge, that is a bug to fix. Tell us via the contact page.",
        cta: "Contact us",
      };

  return (
    <div style={{ background: "var(--cool)" }}>
      <div style={{ maxWidth: 880, margin: "0 auto", padding: "40px 24px 64px" }}>
        <Reveal>
          <div className="eyebrow">{c.eyebrow}</div>
          <h1 className="serif" style={{ fontSize: "clamp(28px,4vw,40px)", fontWeight: 500, letterSpacing: "-.02em", margin: "12px 0 0" }}>{c.title}</h1>
          <p className="muted" style={{ fontSize: "var(--fs-lg)", lineHeight: 1.7, marginTop: 16, maxWidth: 680 }}>{c.intro}</p>
        </Reveal>

        <Reveal delay={80}>
          <h2 style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-.01em", margin: "36px 0 4px" }}>{c.commitmentsTitle}</h2>
          <div style={{ display: "grid", gap: 12, marginTop: 14 }}>
            {c.commitments.map((x, i) => (
              <div key={i} className="card pad" style={{ boxShadow: "var(--sh-1)" }}>
                <div className="row gap12" style={{ alignItems: "baseline" }}>
                  <span className="mono" style={{ color: "var(--harbor)", fontWeight: 600, fontSize: 13, flex: "none" }}>{"0" + (i + 1)}</span>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700 }}>{x[0]}</div>
                    <div className="muted" style={{ fontSize: 13.5, lineHeight: 1.6, marginTop: 4 }}>{x[1]}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Reveal>

        <Reveal delay={140}>
          <div className="card pad" style={{ marginTop: 22, background: "var(--paper)", boxShadow: "none", border: "1px solid var(--silver)" }}>
            <div style={{ fontSize: 15, fontWeight: 700 }}>{c.whyTitle}</div>
            <p className="muted" style={{ fontSize: 13.5, lineHeight: 1.7, marginTop: 6 }}>{c.whyBody}</p>
          </div>
          <div className="card pad" style={{ marginTop: 14, boxShadow: "var(--sh-1)" }}>
            <div style={{ fontSize: 15, fontWeight: 700 }}>{c.closeTitle}</div>
            <p className="muted" style={{ fontSize: 13.5, lineHeight: 1.7, marginTop: 6 }}>{c.closeBody}</p>
            <Link href={`/${lp}/contact`} className="btn secondary sm" style={{ marginTop: 12 }}>{c.cta}</Link>
          </div>
        </Reveal>
      </div>
    </div>
  );
}
