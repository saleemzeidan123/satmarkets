// ADV-1E. One decision for the Advisor: the prose, the passport and the payload.
//
// FINDING 90, WHICH THIS FILE EXISTS TO CLOSE.
//
// The value path used to take two independent readings of one row. The prose
// came from `renderValue(ev)`, which is a pure function of the row and prints
// the figure whenever the row is `sufficient`. The passports came from
// `rentIndexEvidenceViews`, which asks the licence and withholds the figure when
// the answer is no. Nothing connected the two, and the route said so in a
// comment: "whether it should ALSO be gated on the passport is finding 90 and is
// deliberately not decided here."
//
// What that produced was an answer stating an average in a sentence, above a
// passport panel saying the value is not shown, or above no panel at all,
// because the withheld view was filtered out and its absence read as silence
// rather than as refusal. A reader was told a number and told nothing about why
// the evidence beside it had vanished. Codex item 5 rules that the prose and the
// passport must never disagree, and the only way two things never disagree is
// for there to be one of them.
//
// So the reading is taken once, and it is taken in `rentIndexEvidence.ts` under
// the neutral name `rentIndexQuoteGate`, because the Advisor is not the only
// surface that quotes a published cell: `/rent-index` renders one, and
// `/api/index/segments` serialises one for machines. A gate living under
// `lib/advisor/` would have been a gate the machine-readable route could not
// import without pretending to be the Advisor, and the second copy is exactly
// what finding 90 was.
//
// WHAT REMAINS HERE.
//
// Only the prose assembly, which is genuinely Advisor-shaped: a chat answer is
// one string, so the statement has to be concatenated into it rather than
// returned beside it for a layout to place.
//
// No em dashes (Law 2). Western numerals in both locales (Law 4).

import type { RentIndexQuoteGate } from "../rentIndexEvidence";

/**
 * The prose, assembled so the statement cannot become detached from the figure.
 *
 * Codex item 3 requires the sample label to stay connected to the number
 * "including inside Advisor answers", and a chat answer has no layout to hang a
 * caption on: there is one string, and anything not in it is not in the answer.
 * So the statement is concatenated into the same paragraph rather than returned
 * beside it for a caller to remember to render.
 */
export function advisorQuoteMessage(gate: RentIndexQuoteGate, figureSentence: string): string {
  if (!gate.mayShowFigure) return gate.statement ?? figureSentence;
  // Finding 91. The attribution is appended here rather than composed upstream.
  // `renderValue` used to print a source clause of its own, built from the row's
  // stored column with the rent index authority as a default, which is how a
  // synthetic figure came to be attributed to a party that never published it.
  // The composer now writes the figure and nothing about where it came from; the
  // decision writes the provenance. Order is figure, then source, then statement,
  // so a reader meets the number, learns who stands behind it, and is told what
  // kind of number it is, in that order.
  const parts = [figureSentence.trim(), gate.proseSource, gate.statement].filter(
    (p): p is string => typeof p === "string" && p.length > 0,
  );
  return parts.reduce((acc, p) =>
    acc.endsWith(".") || acc.endsWith("،") || acc.endsWith("؟") || acc.endsWith("!")
      ? `${acc} ${p}`
      : `${acc}. ${p}`,
  );
}
