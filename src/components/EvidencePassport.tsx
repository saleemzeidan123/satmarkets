import {
  entityKindLabel,
  freshnessLabel,
  statisticLabel,
  sufficiencyLabel,
  transformationLabel,
  readCorrectionReason,
  verificationDimensionLabel,
  verificationStateLabel,
} from "@/lib/evidence";
import {
  type PublicEvidenceView,
  evidenceStateLabel,
  evidenceStateNote,
  permissionLabel,
  publicSourceText,
} from "@/lib/evidenceView";
import { type Loc, formatUnit } from "@/lib/format";
import { assetLabel } from "@/lib/labels";
import ProvenanceChip from "@/components/ProvenanceChip";

// ADV-1C. The rendering half of the Evidence Passport.
//
// WHY A DISCLOSURE AND NOT A PANEL.
//
// Codex boundary 5: a compact, understandable indicator first, then an
// accessible detail panel, without overloading the main interface. The compact
// indicator is `ProvenanceChip`, which already exists and already says the one
// thing a reader scanning a figure needs: who says so. Everything else is behind
// a native `<details>`.
//
// Native, deliberately. A hand-built drawer needs a client bundle, a focus trap,
// an escape handler, an aria-expanded pair kept in step with state, and a
// reduced-motion branch. `<details>` is keyboard-operable, announces its own
// expanded state, restores focus by having never moved it, costs no JavaScript
// and works before hydration. Every one of those is a requirement in boundary 5,
// and the platform already renders `<details>` in three other places.
//
// WHAT IT SHOWS, AND WHY EVERY ROW IS THERE.
//
// The eleven things boundary 4 requires the passport to preserve are each a row
// or a block below: source owner and reference, reporting period, geography and
// entity kind, asset type and unit, statistic type, the transformation SAT
// performed, sample sufficiency, freshness and last update, correction history,
// exact verification scope, and the three permissions.
//
// A row whose value is absent still appears and says it is not stated. That is
// boundary 10 read strictly: an omitted row is indistinguishable from a row we
// never thought about, and "not stated" is a fact about the record rather than
// wording generated to fill a gap. Nothing here estimates, infers or rounds up.
//
// WHAT IT CANNOT SHOW.
//
// It receives a `PublicEvidenceView` and nothing else, so boundary 6 holds by
// construction: there is no internal source record, confidential URL,
// contributor identity or restricted field on the type it is given, and
// therefore no path by which one could be rendered here even by mistake.

/** Absent, stated as absent. Never a blank, never a dash that reads as a value. */
function notStated(ar: boolean): string {
  return ar ? "غير مذكور" : "Not stated";
}

/**
 * ADV-1E, Codex item 4. Who the figure actually came from.
 *
 * This row used to answer the question by elimination: a view with no source
 * block had no external licensor, "which on this platform means the record is
 * our own". That inference is the source-laundering defect. Three different
 * things arrive here with no source block, and only one of them is SAT's:
 *
 *   - a figure a lister entered or SAT computed from its own records;
 *   - a figure SAT generated to exercise the product;
 *   - a third-party figure whose source block was withheld precisely because
 *     the licence does not permit us to name or display it.
 *
 * Naming the last two "SAT Markets own record" put the exchange's name behind
 * a number the exchange never collected, and did it most confidently in the
 * case where the truth was that we were not permitted to say. So the answer is
 * no longer inferred from the absence of a block. `mayNameSatOwnRecord` is set
 * by `decidePublicQuote`, on the one branch that reaches a genuine first-party
 * record, and this function reads it rather than guessing.
 *
 * The rule itself now lives in `publicSourceText`, because the Rent Index table
 * asks the same question in its Source column and a second handwritten copy of
 * a source-naming rule is the copy that drifts. Localisation happens inside it
 * rather than being trusted from the caller: the owner is a name in one language
 * or the other, and a page that forgot to localise would put English on the
 * Arabic page in the single field a reader is most likely to check.
 */

/**
 * The registered source id, which boundary 4 asks for beside the owner: it is
 * already public on `/sources` and is what a reader follows to check the licence
 * for themselves. Present only when the source itself is, so a withheld source
 * does not leak its identity through its reference.
 */
function sourceSubText(view: PublicEvidenceView, ar: boolean): string | undefined {
  if (!view.source) return undefined;
  return `${ar ? "المرجع" : "Reference"}: ${view.source.id}`;
}

/**
 * The same date rendering the availability line on this page uses, from the same
 * options. Two dates about the same filing, sitting one above the other, that
 * disagree about their format is the small kind of wrong that makes a reader
 * doubt the large kind of right.
 */
function dateText(iso: string | null, ar: boolean): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return null;
  return d.toLocaleDateString(ar ? "ar-SA-u-nu-latn" : "en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Riyadh",
  });
}

export default function EvidencePassport({
  view,
  label,
  ar,
  locale,
}: {
  view: PublicEvidenceView;
  /**
   * The figure's name, already in the reader's language, exactly as the tile
   * beside it prints it. Passed in rather than looked up from a second table:
   * one table would drift from the other and the panel would end up naming a
   * different thing from the value it explains.
   */
  label: string;
  ar: boolean;
  locale: Loc;
}) {
  const asOf = dateText(view.asOf, ar);

  // Rows, in the order a reader asks the questions: what kind of number is it,
  // in what unit, who says so, what did we do to it, and about what and when.
  //
  // The optional third element is a sub-line under the value. It carries the
  // permitted source reference, which boundary 4 asks for beside the owner: the
  // registered source id, which is already public on `/sources` and is what a
  // reader follows to check the licence for themselves.
  const rows: [string, string, string?][] = [
    [ar ? "نوع الرقم" : "Statistic", statisticLabel(view.statistic, ar)],
    [ar ? "الوحدة" : "Unit", view.unit ? formatUnit(view.unit, locale, "long") : notStated(ar)],
    [ar ? "المصدر" : "Source", publicSourceText(view, ar), sourceSubText(view, ar)],
    [ar ? "ما فعلته سات" : "What SAT did", transformationLabel(view.transformation, ar)],
    [ar ? "فترة التقرير" : "Reporting period", view.period ?? notStated(ar)],
    [ar ? "النطاق الجغرافي" : "Geography", view.geography ?? notStated(ar)],
    [
      ar ? "موضوع الرقم" : "Subject",
      view.subjectKind ? entityKindLabel(view.subjectKind, ar) : notStated(ar),
    ],
    [
      ar ? "نوع الأصل" : "Asset type",
      view.assetType ? assetLabel(view.assetType, locale) : notStated(ar),
    ],
    [ar ? "كفاية العينة" : "Sample", sufficiencyLabel(view.sufficiency, ar)],
    [
      ar ? "الحداثة" : "Freshness",
      asOf
        ? `${freshnessLabel(view.freshness, ar)} · ${ar ? "آخر تحديث" : "last updated"} ${asOf}`
        : freshnessLabel(view.freshness, ar),
    ],
  ];

  const perms: [string, string][] = [
    [ar ? "العرض هنا" : "Display here", permissionLabel(view.permissions.display, ar)],
    [ar ? "التصدير" : "Export", permissionLabel(view.permissions.export, ar)],
    [ar ? "الاستخدام في المساعد" : "Use by the assistant", permissionLabel(view.permissions.aiUse, ar)],
  ];

  return (
    <details className="evi">
      {/* ELITE-4 J3-21: this summary carried an aria-label, and an aria-label wins
          over every child. So the one thing the passport exists to say, the
          provenance tier on the chip below, was replaced in the accessible name by
          a sentence that did not contain it, and voice control could not say what
          it saw. The name is computed from the children now. The only thing the
          children did not carry was the figure being explained, so that is added
          here, hidden, and the visible tier text stays in the name. */}
      <summary className="evi-sum">
        <span className="sronly">{label}</span>
        {/* No date on the chip, deliberately.
 *
 * `ProvenanceChip` will append "· checked 10 Jul 2026" when it is given a
 * date, and that is right on a page-width capsule. Here it is wrong twice
 * over. The panel mounts inside a tile in an auto-fit grid, and once the
 * grid splits the tile is between 103 and 154 pixels wide, while the dated
 * chip is 180 and cannot wrap: the responsive probe measured it hanging 51
 * pixels out of its own card at four of six widths. And boundary 5 asks the
 * collapsed line to stay compact, which a date does not.
 *
 * Nothing is lost by dropping it. The panel below carries the freshness date
 * on its own row and a checked date per verification dimension, which is a
 * finer record than the single conflated date the chip was showing. */}
        <ProvenanceChip tier={view.tier} ar={ar} size="sm" wrap />
        {view.state !== "held" && (
          <span className="evi-state">{evidenceStateLabel(view.state, ar)}</span>
        )}
        <span className="evi-more">{ar ? "الدليل" : "Evidence"}</span>
      </summary>

      <div className="evi-body">
        {/* Every state that applies, not only the one the chip line shows. A
            figure is routinely several at once, and a reader told it is stale
            while the reason it is also derived stays hidden has been told half
            the answer. */}
        {view.states.map((s) => (
          <p key={s} className="evi-note">
            <b>{evidenceStateLabel(s, ar)}.</b> {evidenceStateNote(s, ar)}
          </p>
        ))}

        <dl className="evi-dl">
          {rows.map(([k, v, sub]) => (
            <div key={k} className="evi-row">
              <dt>{k}</dt>
              <dd>
                {v}
                {sub ? <span className="evi-sub">{sub}</span> : null}
              </dd>
            </div>
          ))}
        </dl>

        {/* WHAT WAS CHECKED, dimension by dimension. This is the scope, and it is
            deliberately a list of separate answers rather than one word: finding
            24 is what happens when four different questions are collapsed into a
            single badge. None of these dimensions is a statement about the
            number itself, which is what the tier above says. */}
        <div className="evi-sec">
          <div className="evi-h">{ar ? "ما الذي جرى التحقق منه" : "What was checked"}</div>
          {view.verification.length === 0 ? (
            <p className="evi-note">
              {ar
                ? "لا يوجد سجل تحقق مرتبط بهذا الرقم."
                : "No verification record is attached to this figure."}
            </p>
          ) : (
            <ul className="evi-list">
              {view.verification.map((r) => {
                const on = dateText(r.checkedAt, ar);
                return (
                  <li key={r.dimension}>
                    <span>{verificationDimensionLabel(r.dimension, ar)}</span>
                    <span className="evi-val">
                      {verificationStateLabel(r.state, ar)}
                      {on ? ` · ${on}` : ""}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Correction history. An empty history says no correction has been
            filed, which is not the same sentence as none being possible, and it
            is the sentence the record supports. */}
        <div className="evi-sec">
          <div className="evi-h">{ar ? "سجل التصحيحات" : "Correction history"}</div>
          {view.corrections.length === 0 ? (
            <p className="evi-note">
              {ar ? "لم يُسجَّل أي تصحيح على هذا الرقم." : "No correction has been recorded for this figure."}
            </p>
          ) : (
            <ul className="evi-list evi-corr">
              {view.corrections.map((c, i) => {
                // The filed words, never a translation of them. Where the
                // filing language is recorded and is not this reader's, the
                // text is tagged so a screen reader pronounces it correctly
                // and so bidi resolves it against its own base direction
                // instead of the page's. An English sentence dropped
                // unmarked into an Arabic page is read aloud as noise.
                const r = readCorrectionReason(c, ar);
                return (
                <li key={`${c.at}-${i}`}>
                  <span className="evi-val">{dateText(c.at, ar) ?? c.at}</span>
                  <span lang={r.foreign ?? undefined} dir={r.foreign ? (r.foreign === "ar" ? "rtl" : "ltr") : undefined}>
                    {r.text}
                  </span>
                  {c.previousDisplay ? (
                    <span className="evi-prev">
                      {ar ? "كان معروضاً: " : "Previously shown: "}
                      {c.previousDisplay}
                    </span>
                  ) : null}
                </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* The three permissions. "Not recorded" is its own answer and is never
            softened into permitted or hardened into refused: it is the absence
            of a decision, and reporting it as either would be reporting a
            decision nobody made. */}
        <div className="evi-sec">
          <div className="evi-h">{ar ? "ما المسموح بهذا الرقم" : "What is permitted"}</div>
          <ul className="evi-list">
            {perms.map(([k, v]) => (
              <li key={k}>
                <span>{k}</span>
                <span className="evi-val">{v}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </details>
  );
}
