import Link from "next/link";
import { isLocale } from "@/i18n/config";
import { notFound } from "next/navigation";
import { Icon, Mark, HARBOR } from "@/components/satkit";
import { getDictionary } from "@/i18n/getDictionary";
import { localeMeta } from "@/lib/meta";
import { intakeStages, intakeSize, intakeRequirements } from "@/lib/listIntake";

// PKG-SUP1, finding 35. The public entry point for supply stops simulating a
// form and describes the real one.
//
// WHAT WAS HERE. Eight `<label>` elements and zero `<input>`, `<textarea>`,
// `<select>` or `<form>`, measured on the deployment in both languages. Every
// field was a `<div class="input">` holding somebody else's answer: "Grade A
// office floor", "Al Olaya", "320". A four step bar showed step 1 ticked and
// step 2 active. A "Drag photos here" zone was not a drop target, and a "Live
// preview" card showed a listing nobody had entered.
//
// Three separate harms, not one cosmetic one. An owner believed they were two
// steps into a submission that did not exist, so the work they did on this
// screen was lost the moment they left it. A photograph dragged onto that zone
// vanished with no message. And a screen reader announced a "Listing title"
// field with nothing to focus, because a `<label>` with no control is a promise
// the page cannot keep.
//
// It also described the wrong intake: four steps against the ten stages the
// Listing Studio actually runs.
//
// WHAT IS HERE NOW. A description of the real intake, computed from the models
// that run it. `src/lib/listIntake.ts` reads `studioSteps()` for the stages and
// `DRAFT_REQUIRED_CHECK_KEYS` with `assessListing()` for the facts the write
// path will not save a draft without, so this page cannot describe an intake
// that does not exist, and it changes when the intake changes.
//
// WHAT IS DELIBERATELY NOT BUILT. No real form on this route. Listing intake is
// permissioned and writes to a lister's own draft, so a public form here would
// either collect facts it cannot store or invite an unauthenticated visitor to
// type a licence number into nothing. The one control is a link to the Studio,
// and the page says plainly that signing in comes first rather than discovering
// it on arrival.

export function generateMetadata({ params }: { params: { locale: string } }) {
  const d = getDictionary(params.locale === "ar" ? "ar" : "en").list;
  return localeMeta(params.locale, "/list", d.metaTitle, d.metaDesc);
}

export default function ListPage({ params }: { params: { locale: string } }) {
 if (!isLocale(params.locale)) notFound();
 const ar = params.locale === "ar";
 const lp = getDictionary(params.locale === "ar" ? "ar" : "en").list;
 const sells: [(p: { size?: number }) => JSX.Element, string][] = [
  [Icon.check, lp.sellVerified],
  [Icon.chart, lp.sellPriced],
  [Icon.user, lp.sellDirect],
 ];
 const stages = intakeStages(ar);
 const size = intakeSize();
 const needs = intakeRequirements(ar, lp.orWord);
 // Western numerals in both languages, so the count is written by the same
 // formatter the rest of the platform uses rather than by the locale's digits.
 const countNote = lp.stageCountNote
  .replace("{stages}", String(size.stages))
  .replace("{min}", String(size.minSteps))
  .replace("{max}", String(size.maxSteps));
 return (
  <div className="list-split">
   <div className="list-rail">
    <div style={{ position: "absolute", right: -30, bottom: -30, opacity: .3 }}><Mark size={240} base="#222A31" lit={HARBOR} /></div>
    <div style={{ position: "relative" }}>
     <div className="eyebrow" style={{ color: "var(--azure-l)" }}>{lp.eyebrow}</div>
     <h1 className="serif" style={{ fontSize: 30, fontWeight: 500, letterSpacing: "-.01em", margin: "14px 0 0", color: "var(--on-brand)" }}>{lp.h1}</h1>
     <p style={{ fontSize: 14.5, lineHeight: 1.65, color: "#AEB6C0", margin: "16px 0 28px" }}>{lp.intro}</p>
     <div className="col gap16">
      {sells.map((x, i) => { const I = x[0]; return <div key={i} className="row gap12"><span style={{ color: "var(--harbor-d)" }}><I size={18} /></span><span style={{ fontSize: 13.5, color: "#D6DCE3" }}>{x[1]}</span></div>; })}
     </div>
     <div style={{ marginTop: 36, padding: "16px 18px", background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.12)", borderRadius: 11 }}>
      <div className="mono" style={{ fontSize: 11, color: "#8A93A0", letterSpacing: ".06em" }}>{lp.avgTimeLabel}</div>
      <div className="mono tnum" style={{ fontSize: 22, fontWeight: 500, color: "var(--on-brand)", marginTop: 6 }}>{lp.avgTimeValue}</div>
      <div style={{ fontSize: 12, lineHeight: 1.6, color: "#AEB6C0", marginTop: 8 }}>{lp.avgTimeNote}</div>
     </div>
    </div>
   </div>

   <div className="list-form">
    <h2 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-.02em", margin: "0 0 4px" }}>{lp.intakeTitle}</h2>
    <p className="muted" style={{ fontSize: 14, margin: 0, maxWidth: 720, lineHeight: 1.65 }}>{lp.intakeSub}</p>

    {/* An ordered list because these are stages in an order, and the number is
        written out rather than left to `list-style`, so it is a Western numeral
        in Arabic as everywhere else on the platform. */}
    <ol style={{ listStyle: "none", margin: "26px 0 0", padding: 0, maxWidth: 720 }}>
     {stages.map((s) => (
      <li key={s.kind} className="row gap14" style={{ alignItems: "flex-start", padding: "14px 0", borderTop: "1px solid var(--silver)" }}>
       <span
        className="mono tnum"
        aria-hidden
        style={{ flex: "0 0 auto", width: 26, height: 26, borderRadius: 999, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 12, background: "var(--cool)", color: "var(--harbor)", border: "1px solid var(--silver)" }}
       >
        {s.index}
       </span>
       <span style={{ minWidth: 0 }}>
        <span style={{ display: "block", fontSize: 14.5, fontWeight: 600 }}>{s.title}</span>
        <span className="muted" style={{ display: "block", fontSize: 13, lineHeight: 1.6, marginTop: 3 }}>{s.purpose}</span>
       </span>
      </li>
     ))}
    </ol>
    {/* Stated only when the two ends genuinely differ, so the page never says
        "10 or 10 steps" if an asset type is ever added that splits nothing. */}
    {size.minSteps !== size.maxSteps ? (
     <p className="muted2" style={{ fontSize: 12.5, lineHeight: 1.6, margin: "14px 0 0", maxWidth: 720 }}>{countNote}</p>
    ) : null}

    <div className="card pad" style={{ marginTop: 28, maxWidth: 720, background: "var(--cool)", boxShadow: "none" }}>
     <h3 className="eyebrow" style={{ margin: 0 }}>{lp.needTitle}</h3>
     <p className="muted" style={{ fontSize: 13, lineHeight: 1.6, margin: "8px 0 0" }}>{lp.needSub}</p>
     <ul style={{ listStyle: "none", margin: "16px 0 0", padding: 0 }}>
      {needs.map((r) => (
       <li key={r.key} className="row gap10" style={{ alignItems: "flex-start", marginTop: 12 }}>
        <span aria-hidden style={{ flex: "0 0 auto", color: "var(--harbor)", marginTop: 2 }}><Icon.check size={15} /></span>
        <span style={{ minWidth: 0 }}>
         <span style={{ display: "block", fontSize: 13.5, fontWeight: 600 }}>{r.label}</span>
         <span className="muted" style={{ display: "block", fontSize: 12.5, lineHeight: 1.6, marginTop: 2 }}>{r.why}</span>
        </span>
       </li>
      ))}
     </ul>
    </div>

    {/* The only control on the route, and the sign-in requirement is stated
        before the click rather than discovered after it. */}
    <p className="muted2" style={{ fontSize: 12.5, lineHeight: 1.6, margin: "24px 0 0", maxWidth: 720 }}>{lp.signInNote}</p>
    <div className="row gap12 between wrap" style={{ marginTop: 14, maxWidth: 720 }}>
     <Link href={`/${params.locale}`} className="btn secondary"><span style={{ display: "inline-flex", transform: ar ? "none" : "rotate(180deg)" }}><Icon.chevr size={15} /></span> {lp.back}</Link>
     <Link href={`/${params.locale}/dashboard/new`} className="btn primary lg">{lp.startDraft} <Icon.arrow size={16} /></Link>
    </div>
   </div>
  </div>
 );
}
