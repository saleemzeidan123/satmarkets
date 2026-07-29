import { Fragment } from "react";
import { getDictionary } from "@/i18n/getDictionary";
import { isLocale } from "@/i18n/config";
import { localeMeta } from "@/lib/meta";
import { notFound } from "next/navigation";
import Link from "next/link";
import Reveal from "@/components/Reveal";
import { formatCounted, formatInteger } from "@/lib/format";
import { RE_GLOSSARY } from "@/lib/translate/glossary";
import { COUNT_BOUNDARIES, SHOWN_NOUNS } from "@/lib/publishedRecords";

// ADV-4B. The bilingual standards record.
//
// This route was a four-line redirect to /listings. It is now the page that
// publishes the language rules, and two of its three sections are GENERATED
// rather than written:
//
//   1. The counted-noun table is rendered by `formatCounted`, the same function
//      every counted sentence on the platform calls, at the boundaries Arabic
//      actually breaks on. A page that TYPED those forms into the dictionary
//      would be asserting the formatter is correct instead of showing that it
//      is, and the two copies would drift the first time a form was corrected.
//      This is the public half of the evidence for finding 52: the fix is a
//      formatter covering 1, 2, 3, 10, 11, 99 and 100, not a patched sentence.
//   2. The term base is `RE_GLOSSARY` itself, read whole. Publishing a curated
//      subset would let the shipped mapping and the published mapping diverge,
//      which is the defect this page is claiming not to have.
//
// The narrative around them is dictionary copy, under key parity like every
// other public string.
//
// `COUNT_BOUNDARIES` and `SHOWN_NOUNS` live in `src/lib/publishedRecords.ts`
// rather than here. A page module may only export the route contract, so an
// extra export fails the generated route type at build time.

export function generateMetadata({ params }: { params: { locale: string } }) {
  const d = getDictionary(params.locale === "ar" ? "ar" : "en").bilingual;
  return localeMeta(params.locale, "/bilingual", d.metaTitle, d.metaDesc);
}

export default function BilingualPage({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound();
  const lp = params.locale === "ar" ? "ar" : "en";
  const c = getDictionary(lp).bilingual;

  const rules: [string, string][] = [
    [c.parityT, c.parityB],
    [c.numeralsT, c.numeralsB],
    [c.rtlT, c.rtlB],
    [c.ownersT, c.ownersB],
    [c.avgT, c.avgB],
    [c.distT, c.distB],
    [c.indexT, c.indexB],
    [c.voiceT, c.voiceB],
  ];

  const terms = Object.entries(RE_GLOSSARY);

  // The English column reads left to right and the Arabic column right to left
  // on BOTH documents. A term base is a pairing, so each side keeps its own
  // direction whichever language the reader opened.
  const enCell = { direction: "ltr", textAlign: "start" } as const;
  const arCell = { direction: "rtl", textAlign: "start" } as const;

  return (
    <div style={{ background: "var(--cool)" }}>
      <div style={{ maxWidth: 880, margin: "0 auto", padding: "40px 24px 64px" }}>
        <Reveal>
          <div className="eyebrow">{c.eyebrow}</div>
          <h1
            className="serif"
            style={{ fontSize: "clamp(28px,4vw,40px)", fontWeight: 500, letterSpacing: "-.02em", margin: "12px 0 0" }}
          >
            {c.title}
          </h1>
          <p className="muted" style={{ fontSize: "var(--fs-lg)", lineHeight: 1.7, marginTop: 16, maxWidth: 680 }}>
            {c.intro}
          </p>
        </Reveal>

        <Reveal delay={80}>
          <div style={{ display: "grid", gap: 12, marginTop: 28 }}>
            {rules.map((r, i) => (
              <div key={i} className="card pad" style={{ boxShadow: "var(--sh-1)" }}>
                <div style={{ fontSize: 15, fontWeight: 700 }}>{r[0]}</div>
                <p className="muted" style={{ fontSize: 13.5, lineHeight: 1.7, marginTop: 6 }}>{r[1]}</p>
              </div>
            ))}
          </div>
        </Reveal>

        <Reveal delay={140}>
          <h2 style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-.01em", margin: "36px 0 4px" }}>{c.countT}</h2>
          <p className="muted" style={{ fontSize: 13.5, lineHeight: 1.7, marginTop: 6, maxWidth: 680 }}>{c.countB}</p>
          <div style={{ display: "grid", gap: 12, marginTop: 14 }}>
            {SHOWN_NOUNS.map((noun) => (
              <div key={noun} className="card pad" style={{ boxShadow: "var(--sh-1)" }}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "minmax(40px,auto) 1fr 1fr",
                    gap: "8px 12px",
                    alignItems: "baseline",
                  }}
                >
                  <div className="mono muted" style={{ fontSize: 12, direction: "ltr" }}>{noun}</div>
                  <div className="muted" style={{ fontSize: 12, fontWeight: 600 }}>{c.termsEn}</div>
                  <div className="muted" style={{ fontSize: 12, fontWeight: 600 }}>{c.termsAr}</div>
                  {COUNT_BOUNDARIES.map((n) => (
                    <Fragment key={n}>
                      <div
                        className="mono"
                        style={{ fontSize: 13, color: "var(--harbor)", fontWeight: 600, direction: "ltr" }}
                      >
                        {formatInteger(n, lp)}
                      </div>
                      <div style={{ fontSize: 13.5, ...enCell }}>{formatCounted(n, noun, "en")}</div>
                      <div style={{ fontSize: 13.5, ...arCell }}>{formatCounted(n, noun, "ar")}</div>
                    </Fragment>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <p className="muted" style={{ fontSize: 12.5, lineHeight: 1.6, marginTop: 10 }}>{c.countCaption}</p>
        </Reveal>

        <Reveal delay={200}>
          <h2 style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-.01em", margin: "36px 0 4px" }}>{c.termsT}</h2>
          <p className="muted" style={{ fontSize: 13.5, lineHeight: 1.7, marginTop: 6, maxWidth: 680 }}>{c.termsB}</p>
          <div className="row gap12" style={{ alignItems: "baseline", marginTop: 14 }}>
            <span className="mono" style={{ color: "var(--harbor)", fontWeight: 700, fontSize: 18 }}>
              {formatInteger(terms.length, lp)}
            </span>
            <span className="muted" style={{ fontSize: 13 }}>{c.termsCount}</span>
          </div>
          <div className="card pad" style={{ marginTop: 12, boxShadow: "var(--sh-1)" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "7px 12px", alignItems: "baseline" }}>
              <div className="muted" style={{ fontSize: 12, fontWeight: 600 }}>{c.termsEn}</div>
              <div className="muted" style={{ fontSize: 12, fontWeight: 600 }}>{c.termsAr}</div>
              {terms.map(([e, a]) => (
                <Fragment key={e}>
                  <div style={{ fontSize: 13, overflowWrap: "anywhere", ...enCell }}>{e}</div>
                  <div style={{ fontSize: 13, overflowWrap: "anywhere", ...arCell }}>{a}</div>
                </Fragment>
              ))}
            </div>
          </div>
          <Link href={`/${lp}/verification`} className="btn secondary sm" style={{ marginTop: 16 }}>
            {getDictionary(lp).verification.title}
          </Link>
        </Reveal>
      </div>
    </div>
  );
}
