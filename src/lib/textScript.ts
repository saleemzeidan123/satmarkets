/**
 * RC10, finding 171. Which script a piece of filed text is actually written in.
 *
 * SAT stores listing prose in two columns, `description_en` and
 * `description_ar`, and the detail page renders whichever matches the reader.
 * The column name is a declaration by the person who filed the text, and it is
 * frequently wrong: a lister who writes the whole listing in English pastes the
 * same paragraph into both fields, and a lister writing in Arabic drops an
 * English building name, a broker's title or a unit specification into the
 * middle of it. So the paragraph inherits the document's `lang` and `dir` from
 * `HtmlLangDir`, and an English paragraph inheriting `lang="ar"` is read aloud
 * by a screen reader with Arabic phonetics, which is not accented English, it
 * is noise. The bidi algorithm resolves the same run against the page direction
 * and can reorder it on screen as well.
 *
 * The passport solves the equivalent problem with a stored flag: a correction
 * carries `reasonLang`, and `readCorrectionReason` marks the text foreign only
 * when the filed language is known and differs from the reader's. That is the
 * right instrument there, because a correction reason is filed through one
 * field with one recorded language. It is not available here: the description
 * columns carry no language flag, and adding one would only move the problem,
 * because the flag would be the field name again.
 *
 * What is available is the text. Script is not inferred, it is read: the code
 * points are either Arabic or they are not. That is evidence of the same kind
 * as anything else this platform publishes, and it is the only kind available
 * for prose a stranger typed.
 *
 * The function is deliberately unwilling. It answers only when one script
 * clearly dominates a run long enough to mean anything, and returns null for
 * everything else, including genuinely mixed text. A caller that gets null is
 * expected to say so rather than guess: `dir="auto"` states that the direction
 * is to be resolved from the content, which is true, where `dir="rtl"` on a
 * mixed paragraph is a claim about text nobody checked.
 */
export type TextScript = "arabic" | "latin" | null;

/** Letters only. Digits, punctuation and whitespace decide nothing. */
function classify(cp: number): "arabic" | "latin" | null {
  // Arabic, Arabic Supplement, Arabic Extended-A, and the two presentation
  // forms blocks. The two digit ranges inside the main block are excluded:
  // SAT writes Western numerals in both languages, so an Arabic-Indic digit is
  // a defect elsewhere and is not evidence of anything here.
  if (cp >= 0x0660 && cp <= 0x0669) return null;
  if (cp >= 0x06f0 && cp <= 0x06f9) return null;
  if (cp >= 0x0600 && cp <= 0x06ff) return "arabic";
  if (cp >= 0x0750 && cp <= 0x077f) return "arabic";
  if (cp >= 0x08a0 && cp <= 0x08ff) return "arabic";
  if (cp >= 0xfb50 && cp <= 0xfdff) return "arabic";
  if (cp >= 0xfe70 && cp <= 0xfeff) return "arabic";
  // Basic Latin letters plus Latin-1 Supplement and Extended-A and B.
  if ((cp >= 0x41 && cp <= 0x5a) || (cp >= 0x61 && cp <= 0x7a)) return "latin";
  if (cp >= 0x00c0 && cp <= 0x024f) return "latin";
  return null;
}

/** How many letters a run needs before its majority means anything. */
const FLOOR = 8;

/** The share of letters one script needs before the run is called by it. */
const MAJORITY = 0.7;

export function detectScript(text: string | null | undefined): TextScript {
  if (!text) return null;
  let arabic = 0;
  let latin = 0;
  for (const ch of text) {
    const k = classify(ch.codePointAt(0)!);
    if (k === "arabic") arabic++;
    else if (k === "latin") latin++;
  }
  const total = arabic + latin;
  if (total < FLOOR) return null;
  if (arabic >= total * MAJORITY) return "arabic";
  if (latin >= total * MAJORITY) return "latin";
  return null;
}

/**
 * The language tag for a detected script, on this platform.
 *
 * SAT publishes in exactly two languages, so Arabic script means Arabic and
 * Latin script means English here. That second step is the one assumption in
 * this file, and it is worth stating rather than hiding: Latin script is not
 * English, and a French paragraph would be tagged `en`. The alternative is to
 * leave the paragraph untagged, which does not avoid the claim, it makes the
 * same claim silently, because an untagged paragraph inherits the document
 * language. Tagging from the script is the same guess with an observation
 * behind it, and it is right in the case that actually occurs: English prose
 * sitting in an Arabic page.
 */
export function scriptLang(s: TextScript): "ar" | "en" | null {
  return s === "arabic" ? "ar" : s === "latin" ? "en" : null;
}

/**
 * `lang` and `dir` for a paragraph of filed text.
 *
 * `dir` is never omitted. When the script is known it is stated; when it is not,
 * `auto` hands the decision to the browser's first-strong-character rule, which
 * is a better answer for mixed text than the page direction and is honest about
 * being a resolution rather than a declaration.
 */
export function textLangAttrs(text: string | null | undefined): {
  lang: "ar" | "en" | undefined;
  dir: "rtl" | "ltr" | "auto";
} {
  const lang = scriptLang(detectScript(text));
  if (lang === "ar") return { lang, dir: "rtl" };
  if (lang === "en") return { lang, dir: "ltr" };
  return { lang: undefined, dir: "auto" };
}
