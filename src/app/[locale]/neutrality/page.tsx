import { getDictionary } from "@/i18n/getDictionary";
import { isLocale } from "@/i18n/config";
import { localeMeta } from "@/lib/meta";
import { notFound } from "next/navigation";
import Link from "next/link";
import Reveal from "@/components/Reveal";

export function generateMetadata({ params }: { params: { locale: string } }) {
  const d = getDictionary(params.locale === "ar" ? "ar" : "en").neutrality;
  return localeMeta(params.locale, "/neutrality", d.metaTitle, d.metaDesc);
}

export default function NeutralityPage({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound();
  const ar = params.locale === "ar";
  const lp = ar ? "ar" : "en";

  // The whole page was one object written twice, once per language, and the two
  // branches had already drifted: the English first commitment explained that
  // SAT's own listings are marked as ours, sit in the same ranking and get no
  // placement, badge or feature another broker cannot get, while the Arabic in
  // the same slot promised something different, that owner-direct listings never
  // fall behind SAT-represented ones. A reader of one language was being told a
  // different neutrality commitment from a reader of the other, on the page whose
  // entire subject is that we say the same thing to everyone. The text now lives
  // in the dictionaries, where the two languages sit on adjacent lines and a
  // divergence like that cannot hide.
  const c = getDictionary(lp).neutrality;
  const commitments: [string, string][] = [
    [c.cRankT, c.cRankB],
    [c.cActT, c.cActB],
    [c.cDataT, c.cDataB],
    [c.cVerifT, c.cVerifB],
    [c.cReportT, c.cReportB],
  ];

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
            {commitments.map((x, i) => (
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
