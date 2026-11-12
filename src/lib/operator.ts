/**
 * PKG-SEPARABILITY-1. Who operates this platform, held in one place.
 *
 * WHY THIS EXISTS.
 * The operator's name, its licence number and its own website were written out
 * by hand in the dictionaries and in a dozen components. That is fine while one
 * company runs the platform under one licence, and it is the thing that makes a
 * later move expensive: a platform that is handed to its own company, under its
 * own registration and licence, would have to be found-and-replaced by hand, in
 * two languages, with nothing to say when the job is finished.
 *
 * WHAT IT DOES.
 * The text in the repository stays exactly as it is, written for the default
 * operator, so every pinned string, every claims-ledger entry and every Law
 * test reads what it always read. This module is the single boundary where
 * that text meets the operator actually configured for the deployment:
 *
 *   - `OPERATOR` is the configured operator (the default unless all four
 *     NEXT_PUBLIC_OPERATOR_* variables are set).
 *   - `rebrand(text)` rewrites the default operator's identity into the
 *     configured one. With the default operator it returns its input untouched.
 *   - `rebrandDeep(value)` does the same through objects and arrays, keys
 *     included, so lookup tables keyed by a label keep agreeing with it.
 *
 * WHAT KEEPS IT HONEST.
 * `operator.test.ts` runs a separation drill on every gate: it rebrands both
 * dictionaries for a second, test-only operator and fails if any trace of the
 * default operator survives, and it walks the source tree with the TypeScript
 * parser and fails if a string naming the default operator is written anywhere
 * outside a `rebrand` or `rebrandDeep` call.
 *
 * WHAT IT IS NOT.
 * It is not a disclosure decision. Law 1 stands: the platform names its
 * operator in public, whoever that is. This only makes sure the name it states
 * is the configured one, everywhere at once.
 */

export type Operator = {
  /** Trading name, Latin script, as it appears in running text. */
  nameEn: string;
  /** Trading name, Arabic script. */
  nameAr: string;
  /** The operator's FAL licence number. Digits only. */
  licence: string;
  /** The operator's own website, absolute, no trailing slash. */
  url: string;
};

/** The operator this repository's text is written for. */
export const DEFAULT_OPERATOR: Operator = {
  nameEn: "SAT Real Estate" /* i18n-exempt */,
  nameAr: "سات العقارية" /* i18n-exempt */,
  licence: "1200025510",
  url: "https://www.satestate.com",
};

type OperatorEnv = { nameEn?: string; nameAr?: string; licence?: string; url?: string };

/**
 * Reads the configured operator. All four values or none: a deployment that
 * names a new operator but still prints the old licence number is a false
 * public statement, so a partial configuration is an error, never a blend.
 */
export function readOperator(env: OperatorEnv): Operator {
  const given = [env.nameEn, env.nameAr, env.licence, env.url].map((v) => (v ?? "").trim());
  const set = given.filter((v) => v !== "").length;
  if (set === 0) return DEFAULT_OPERATOR;
  if (set !== 4) {
    throw new Error(
      "Operator configuration is partial. Set all four of NEXT_PUBLIC_OPERATOR_NAME_EN, NEXT_PUBLIC_OPERATOR_NAME_AR, NEXT_PUBLIC_OPERATOR_LICENCE and NEXT_PUBLIC_OPERATOR_URL, or none of them.",
    );
  }
  const [nameEn, nameAr, licence, url] = given;
  if (!/^\d{10}$/.test(licence)) throw new Error("NEXT_PUBLIC_OPERATOR_LICENCE must be exactly ten digits.");
  if (!/^https:\/\/[^\s/]+$/.test(url)) throw new Error("NEXT_PUBLIC_OPERATOR_URL must be an https origin with no path and no trailing slash.");
  return { nameEn, nameAr, licence, url };
}

// Each variable is named in full so that the bundler can inline it for client
// components. A computed lookup would read as undefined in the browser.
export const OPERATOR: Operator = readOperator({
  nameEn: process.env.NEXT_PUBLIC_OPERATOR_NAME_EN,
  nameAr: process.env.NEXT_PUBLIC_OPERATOR_NAME_AR,
  licence: process.env.NEXT_PUBLIC_OPERATOR_LICENCE,
  url: process.env.NEXT_PUBLIC_OPERATOR_URL,
});

const host = (url: string) => url.replace(/^https:\/\/(www\.)?/, "");

/** The default operator's identity, as ordered find-and-replace pairs for `op`. */
function pairs(op: Operator): [RegExp, string][] {
  const d = DEFAULT_OPERATOR;
  return [
    [new RegExp(d.url.replace(/[.]/g, "\\."), "g"), op.url],
    [new RegExp(host(d.url).replace(/[.]/g, "\\."), "g"), host(op.url)],
    [new RegExp(d.nameEn, "g"), op.nameEn],
    [new RegExp(d.nameEn.toUpperCase(), "g"), op.nameEn.toUpperCase()],
    [new RegExp(d.nameEn.toLowerCase(), "g"), op.nameEn.toLowerCase()],
    [new RegExp(d.nameAr, "g"), op.nameAr],
    [new RegExp(d.licence, "g"), op.licence],
  ];
}

/** Rewrites the default operator's identity in `text` into `op`'s. */
export function rebrand(text: string, op: Operator = OPERATOR): string {
  if (op === DEFAULT_OPERATOR) return text;
  let out = text;
  for (const [from, to] of pairs(op)) out = out.replace(from, to);
  return out;
}

/** `rebrand` through arrays and plain objects, keys included. Other values pass through. */
export function rebrandDeep<T>(value: T, op: Operator = OPERATOR): T {
  if (op === DEFAULT_OPERATOR) return value;
  const walk = (v: unknown): unknown => {
    if (typeof v === "string") return rebrand(v, op);
    if (Array.isArray(v)) return v.map(walk);
    if (v !== null && typeof v === "object" && Object.getPrototypeOf(v) === Object.prototype) {
      return Object.fromEntries(Object.entries(v as Record<string, unknown>).map(([k, x]) => [rebrand(k, op), walk(x)]));
    }
    return v;
  };
  return walk(value) as T;
}
