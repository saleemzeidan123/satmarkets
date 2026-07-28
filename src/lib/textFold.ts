// One folding law for every string comparison on the platform.
//
// This exists because the same question was being answered by three different pieces
// of code: the advisor folded Arabic-Indic digits, the discovery parser folded the
// script, and the label tables folded nothing at all, which is how `?city=riyadh`
// came to print the raw slug on a public page while `?city=Riyadh` printed the city.
// Two normalizers eventually disagree about the same input, and then the platform
// answers one question two ways.
//
// Folding is for COMPARISON ONLY. Nothing folded here is ever rendered: display keeps
// its script, its capitals and its Western numerals.

const AR_INDIC = /[٠-٩۰-۹]/g;

/** Arabic-Indic and Persian digits read as Western digits, for parsing only. */
export function toWesternDigits(s: string): string {
  return s.replace(AR_INDIC, (d) => {
    const c = d.charCodeAt(0);
    const base = c >= 0x06f0 ? 0x06f0 : 0x0660;
    return String(c - base);
  });
}

// Tashkeel, the dagger alef and the tatweel carry no lexical weight and are typed
// inconsistently, so they come out before anything is compared.
const AR_MARKS = /[ً-ْٰـ]/g;

/**
 * Fold a string to the form both sides of a comparison are measured in.
 *
 * The Arabic part is what matters: أ إ آ ٱ all fold to ا, ى to ي, ة to ه. Without it
 * "العليا" typed with a final ى never matches "العليا" stored with a ي, and a person
 * searching their own district gets an empty page.
 *
 * `+` survives punctuation stripping because it is the whole difference between grade
 * A and grade A+, and `²` survives because it is a digit-class character.
 */
export function foldText(s: string): string {
  return toWesternDigits(String(s ?? ""))
    .toLowerCase()
    .replace(AR_MARKS, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[^\p{L}\p{N}+]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * A last-resort rendering for a key no table knows.
 *
 * The rule it replaces was `?? t`, which printed the URL slug verbatim into a heading
 * and into the metadata head. An unknown key is still unknown after this, but a
 * reader is never shown machine punctuation where a place name belongs. Arabic is
 * unaffected by the capitalisation step, which is correct: the script has no case.
 */
export function prettifyKey(t: string): string {
  return String(t ?? "")
    .replace(/[-_.+]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/(^|\s)\p{Ll}/gu, (c) => c.toUpperCase());
}
