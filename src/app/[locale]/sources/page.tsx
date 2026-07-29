import { getDictionary } from "@/i18n/getDictionary";
import { isLocale } from "@/i18n/config";
import { localeMeta } from "@/lib/meta";
import { notFound } from "next/navigation";
import Link from "next/link";
import Reveal from "@/components/Reveal";
import { getAllSourceRights } from "@/lib/queries/sourceRights";
import type { SourceRights, UsePolicy, ModelInputPolicy, RightsStatus } from "@/lib/sourceRights";
import { DECLARED_SOURCES, SOURCE_COPY } from "@/lib/publishedRecords";

// ADV-4B. The source register, rendered from the register.
//
// Three things are deliberately NOT on this page, and each omission is a rule
// rather than a layout choice:
//
//   1. `denialReason()`. Its own doc comment in `src/lib/sourceRights.ts` says
//      callers must not render it to the public, because it quotes internal
//      licence reasoning. Publishing our summary of a licensor's terms is a
//      republication of those terms.
//   2. `stopCondition` and `reviewedNote`. Both are recorded in one language
//      only. Rendering them would put English text on the Arabic page, which is
//      the bilingual parity law failing on the page that explains our rules.
//   3. Any licensor named on a prohibited row. Naming them republishes the term
//      being respected.
//
// The narrative is in the dictionary; every policy value on the page comes from
// the live register through an enum-to-label map. A source id with no dictionary
// entry falls back to its own id, which is a single-token code and therefore
// passes the prose gate, so a row added to the register tomorrow appears here
// unlabelled rather than silently disappearing.
//
// `DECLARED_SOURCES` and `SOURCE_COPY` live in `src/lib/publishedRecords.ts`
// rather than here. A page module may only export the route contract, so an
// extra export fails the generated route type at build time.

export function generateMetadata({ params }: { params: { locale: string } }) {
  const d = getDictionary(params.locale === "ar" ? "ar" : "en").sources;
  return localeMeta(params.locale, "/sources", d.metaTitle, d.metaDesc);
}

export default async function SourcesPage({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound();
  const ar = params.locale === "ar";
  const lp = ar ? "ar" : "en";
  const c = getDictionary(lp).sources;

  const use: Record<UsePolicy, string> = { none: c.pNone, internal: c.pInternal, public: c.pPublic };
  const store: Record<SourceRights["storagePolicy"], string> = { none: c.stNone, id_only: c.stId, full: c.stFull };
  const model: Record<ModelInputPolicy, string> = {
    none: c.mNone,
    redacted: c.mRedacted,
    sample_only: c.mSample,
    full: c.mFull,
  };
  const status: Record<RightsStatus, string> = {
    unknown: c.rUnknown,
    asserted_unverified: c.rAsserted,
    evidenced: c.rEvidenced,
    prohibited: c.rProhibited,
  };

  const register = await getAllSourceRights();
  // Every declared id, plus anything live that we have not declared. A register
  // row we did not expect must appear, not be filtered out by our own list.
  const ids = [...DECLARED_SOURCES, ...[...register.keys()].filter((k) => !DECLARED_SOURCES.includes(k))];

  const notes: [string, string][] = [
    [c.statusTitle, c.statusBody],
    [c.modelTitle, c.modelBody],
    [c.neverTitle, c.neverBody],
    [c.gapTitle, c.gapBody],
    [c.notShownTitle, c.notShownBody],
  ];

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
          {register.size === 0 ? (
            <div
              className="card pad"
              style={{ marginTop: 24, background: "var(--paper)", boxShadow: "none", border: "1px solid var(--silver)" }}
            >
              <div style={{ fontSize: 15, fontWeight: 700 }}>{c.unavailableTitle}</div>
              <p className="muted" style={{ fontSize: 13.5, lineHeight: 1.7, marginTop: 6 }}>{c.unavailableBody}</p>
            </div>
          ) : (
            <>
              <div className="row gap12" style={{ alignItems: "baseline", marginTop: 26 }}>
                <span className="mono" style={{ color: "var(--harbor)", fontWeight: 700, fontSize: 18 }}>
                  {register.size}
                </span>
                <span className="muted" style={{ fontSize: 13 }}>{c.countLabel}</span>
              </div>
              <div style={{ display: "grid", gap: 12, marginTop: 14 }}>
                {ids.map((id) => {
                  const key = SOURCE_COPY[id];
                  const r = register.get(id);
                  const rows: [string, string][] = r
                    ? [
                        [c.colStore, store[r.storagePolicy]],
                        [c.colRedisplay, use[r.redisplayPolicy]],
                        [c.colDerived, use[r.derivedDisplayPolicy]],
                        [c.colExport, use[r.exportPolicy]],
                        [c.colAi, use[r.aiRetrievalPolicy]],
                        [c.colStatus, status[r.rightsStatus]],
                      ]
                    : [];
                  return (
                    <div key={id} className="card pad" style={{ boxShadow: "var(--sh-1)" }}>
                      <div style={{ fontSize: 15, fontWeight: 700 }}>{key ? c[`s${key}T`] : id}</div>
                      <div className="mono muted" style={{ fontSize: 11.5, marginTop: 2, direction: "ltr" }}>{id}</div>
                      {key ? (
                        <p className="muted" style={{ fontSize: 13.5, lineHeight: 1.7, marginTop: 8 }}>{c[`s${key}B`]}</p>
                      ) : null}
                      {r ? (
                        <div style={{ display: "grid", gap: 6, marginTop: 12 }}>
                          {rows.map((row, i) => (
                            <div
                              key={i}
                              className="row gap12"
                              style={{ alignItems: "baseline", justifyContent: "space-between", fontSize: 13 }}
                            >
                              <span className="muted">{row[0]}</span>
                              <span style={{ fontWeight: 600 }}>{row[1]}</span>
                            </div>
                          ))}
                          <div
                            className="row gap12"
                            style={{ alignItems: "baseline", justifyContent: "space-between", fontSize: 13 }}
                          >
                            <span className="muted">{c.modelTitle}</span>
                            <span style={{ fontWeight: 600 }}>{model[r.modelInputPolicy]}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="mono muted" style={{ fontSize: 12.5, marginTop: 10 }}>{c.notRecorded}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </Reveal>

        <Reveal delay={140}>
          <div style={{ display: "grid", gap: 12, marginTop: 26 }}>
            {notes.map((n, i) => (
              <div
                key={i}
                className="card pad"
                style={{ background: "var(--paper)", boxShadow: "none", border: "1px solid var(--silver)" }}
              >
                <div style={{ fontSize: 15, fontWeight: 700 }}>{n[0]}</div>
                <p className="muted" style={{ fontSize: 13.5, lineHeight: 1.7, marginTop: 6 }}>{n[1]}</p>
              </div>
            ))}
          </div>
          <Link href={`/${lp}/verification`} className="btn secondary sm" style={{ marginTop: 16 }}>
            {getDictionary(lp).verification.title}
          </Link>
        </Reveal>
      </div>
    </div>
  );
}
