import { getDictionary } from "@/i18n/getDictionary";
import { isLocale } from "@/i18n/config";
import { localeMeta } from "@/lib/meta";
import { notFound } from "next/navigation";
import Link from "next/link";
import Reveal from "@/components/Reveal";
import {
  verificationDimensionLabel,
  verificationStateLabel,
  unknownLabel,
} from "@/lib/evidence";
import { gateReasonText } from "@/lib/gate";
import { LISTING_DIMENSIONS, notVerifiedReasonText } from "@/lib/listingVerification";
import { ALL_STATES, DEMOTION_REASONS, ALL_GATE_REASONS } from "@/lib/publishedRecords";

// ADV-4B. The page that says what the word means.
//
// Everything on it that names a dimension, a state, a demotion reason or a gate
// failure is READ FROM THE ENGINE, not copied into the dictionary beside it. The
// dictionary carries the narrative only. That is deliberate and it is the whole
// design: a page that restates the rule in its own words is a second copy of the
// rule, and a second copy drifts. `docs/adv-4a-closure.md` is the record of what
// drift costs when a claim lives two folders away from the guard that governs it.
//
// The lists it renders are the unions themselves, spelled out because TypeScript
// cannot enumerate a union at runtime. They live in `src/lib/publishedRecords.ts`
// because a page module may only export the route contract, and `adv4b.test.ts`
// asserts each one is complete, so a dimension, state or reason added to the
// engine tomorrow fails the suite rather than quietly going unpublished.

export function generateMetadata({ params }: { params: { locale: string } }) {
  const d = getDictionary(params.locale === "ar" ? "ar" : "en").verification;
  return localeMeta(params.locale, "/verification", d.metaTitle, d.metaDesc);
}

export default function VerificationPage({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound();
  const ar = params.locale === "ar";
  const lp = ar ? "ar" : "en";
  const c = getDictionary(lp).verification;

  const checks: [string, string][] = [
    [c.ownerT, c.ownerB],
    [c.listingT, c.listingB],
    [c.satT, c.satB],
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
          <h2 style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-.01em", margin: "36px 0 4px" }}>{c.twoTitle}</h2>
          <p className="muted" style={{ fontSize: 13.5, lineHeight: 1.7, marginTop: 6, maxWidth: 680 }}>{c.twoBody}</p>
          <div style={{ display: "grid", gap: 12, marginTop: 14 }}>
            {checks.map((x, i) => (
              <div key={i} className="card pad" style={{ boxShadow: "var(--sh-1)" }}>
                <div className="row gap12" style={{ alignItems: "baseline" }}>
                  <span className="mono" style={{ color: "var(--harbor)", fontWeight: 600, fontSize: 13, flex: "none" }}>
                    {"0" + (i + 1)}
                  </span>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700 }}>{x[0]}</div>
                    <div className="muted" style={{ fontSize: 13.5, lineHeight: 1.6, marginTop: 4 }}>{x[1]}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Reveal>

        <Reveal delay={110}>
          <h2 style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-.01em", margin: "36px 0 4px" }}>{c.dimsTitle}</h2>
          <p className="muted" style={{ fontSize: 13.5, lineHeight: 1.7, marginTop: 6, maxWidth: 680 }}>{c.dimsBody}</p>
          <div className="card pad" style={{ marginTop: 14, boxShadow: "var(--sh-1)" }}>
            <div style={{ display: "grid", gap: 8 }}>
              {LISTING_DIMENSIONS.map((d) => (
                <div key={d} className="row gap12" style={{ alignItems: "baseline", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>{verificationDimensionLabel(d, ar)}</span>
                  <span className="mono muted" style={{ fontSize: 12, direction: "ltr" }}>{d}</span>
                </div>
              ))}
            </div>
          </div>
        </Reveal>

        <Reveal delay={140}>
          <h2 style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-.01em", margin: "36px 0 4px" }}>{c.statesTitle}</h2>
          <p className="muted" style={{ fontSize: 13.5, lineHeight: 1.7, marginTop: 6, maxWidth: 680 }}>{c.statesBody}</p>
          <div className="card pad" style={{ marginTop: 14, boxShadow: "var(--sh-1)" }}>
            <div style={{ display: "grid", gap: 8 }}>
              {ALL_STATES.map((s) => (
                <div key={s} className="row gap12" style={{ alignItems: "baseline", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>{verificationStateLabel(s, ar)}</span>
                  <span className="mono muted" style={{ fontSize: 12, direction: "ltr" }}>{s}</span>
                </div>
              ))}
            </div>
          </div>
          <div
            className="card pad"
            style={{ marginTop: 14, background: "var(--paper)", boxShadow: "none", border: "1px solid var(--silver)" }}
          >
            <div style={{ fontSize: 15, fontWeight: 700 }}>{c.unknownT}</div>
            <p className="muted" style={{ fontSize: 13.5, lineHeight: 1.7, marginTop: 6 }}>{c.unknownB}</p>
            <div className="mono" style={{ fontSize: 13, marginTop: 8, color: "var(--harbor)", fontWeight: 600 }}>
              {unknownLabel(ar)}
            </div>
          </div>
          {/* The states table prints `not_verified` and `unknown` with the same
              words, because the engine maps them to the same badge on purpose.
              On a listing that collapse is protective. On the page that explains
              the states it reads as a duplicate, so the page says which two
              collide and why rather than leaving a reader to notice it. */}
          <div
            className="card pad"
            style={{ marginTop: 14, background: "var(--paper)", boxShadow: "none", border: "1px solid var(--silver)" }}
          >
            <div style={{ fontSize: 15, fontWeight: 700 }}>{c.collideT}</div>
            <p className="muted" style={{ fontSize: 13.5, lineHeight: 1.7, marginTop: 6 }}>{c.collideB}</p>
          </div>
        </Reveal>

        <Reveal delay={170}>
          <h2 style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-.01em", margin: "36px 0 4px" }}>{c.demoteTitle}</h2>
          <p className="muted" style={{ fontSize: 13.5, lineHeight: 1.7, marginTop: 6, maxWidth: 680 }}>{c.demoteBody}</p>
          <div style={{ display: "grid", gap: 8, marginTop: 14 }}>
            {DEMOTION_REASONS.map((r) => (
              <div key={r} className="card pad" style={{ boxShadow: "none", border: "1px solid var(--silver)", background: "var(--paper)" }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{notVerifiedReasonText(r, ar)}</div>
                <div className="mono muted" style={{ fontSize: 12, marginTop: 3, direction: "ltr" }}>{r}</div>
              </div>
            ))}
          </div>
        </Reveal>

        <Reveal delay={200}>
          <h2 style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-.01em", margin: "36px 0 4px" }}>{c.gateTitle}</h2>
          <p className="muted" style={{ fontSize: 13.5, lineHeight: 1.7, marginTop: 6, maxWidth: 680 }}>{c.gateBody}</p>
          <div style={{ display: "grid", gap: 8, marginTop: 14 }}>
            {ALL_GATE_REASONS.map((r) => (
              <div key={r} className="card pad" style={{ boxShadow: "none", border: "1px solid var(--silver)", background: "var(--paper)" }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{gateReasonText(r, ar)}</div>
                <div className="mono muted" style={{ fontSize: 12, marginTop: 3, direction: "ltr" }}>{r}</div>
              </div>
            ))}
          </div>
        </Reveal>

        <Reveal delay={230}>
          <div className="card pad" style={{ marginTop: 26, boxShadow: "var(--sh-1)" }}>
            <div style={{ fontSize: 15, fontWeight: 700 }}>{c.todayTitle}</div>
            <p className="muted" style={{ fontSize: 13.5, lineHeight: 1.7, marginTop: 6 }}>{c.todayBody}</p>
            <div className="mono" style={{ fontSize: 12.5, marginTop: 8, color: "var(--harbor)", fontWeight: 600 }}>
              {notVerifiedReasonText("relation_contradicted", ar)}
            </div>
          </div>
          <div
            className="card pad"
            style={{ marginTop: 14, background: "var(--paper)", boxShadow: "none", border: "1px solid var(--silver)" }}
          >
            <div style={{ fontSize: 15, fontWeight: 700 }}>{c.noteTitle}</div>
            <p className="muted" style={{ fontSize: 13.5, lineHeight: 1.7, marginTop: 6 }}>{c.noteBody}</p>
            <Link href={`/${lp}/sources`} className="btn secondary sm" style={{ marginTop: 12 }}>
              {getDictionary(lp).sources.title}
            </Link>
          </div>
        </Reveal>
      </div>
    </div>
  );
}
