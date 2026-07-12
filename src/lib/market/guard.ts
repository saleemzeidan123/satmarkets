// Law 3 guard (shared by advisor, translate, shortlist). A number is "unsourced"
// when it sits in a rent/price context and its SIGNED VALUE does not appear in the
// allowed source text. Context is detected by an explicit unit OR by rent-related
// words, so bare numbers ("the median is 2,500") are caught, not only unit-tagged
// ones. Comparison is by whole normalized numeric value, never substring, so an
// allowed "12,500" does NOT vouch for a fabricated "2,500".
//
// Direction matters as much as magnitude: a source that says footfall rose 18%
// must not vouch for a claim that footfall fell 18%. Percentages therefore carry
// a polarity, taken from an explicit +/- sign or from a directional word next to
// the number, and "-18" and "18" are treated as different values. Polarity is only
// applied to percentages, so a level ("down from 2,500 to 2,000") is not misread
// as a negative quantity. Errs safe.

// Direction words that make a percentage negative, in English and Arabic.
const NEG_WORDS =
  /(down|fell|fall|falling|declin|decreas|drop|shrank|shrink|contract|lower|softe|انخفاض|انخفض|تراجع|هبوط|نقص|انكماش|تباطؤ)/i;

type Token = { value: string; index: number; length: number };

// Canonical numeric value of a raw token, or null if not a plain number.
// Strips thousands separators + spaces, trims trailing punctuation, and
// normalizes via Number so "2,500" == "2500", "97.70" == "97.7".
function canon(raw: string): string | null {
  const cleaned = raw.replace(/[,\s٬]/g, "").replace(/[.,]+$/, "");
  if (!/^\d+(\.\d+)?$/.test(cleaned)) return null;
  const v = Number(cleaned);
  return Number.isFinite(v) ? String(v) : null;
}

function ascii(x: string): string {
  return (x || "").replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660)).toLowerCase();
}

// Every number in `s`, canonicalized and signed. Sign comes from an explicit
// +/- immediately before the number (but not a hyphen used as a range separator,
// e.g. "2,000-2,500"), or from a directional word beside a percentage.
function signedTokens(s: string): Token[] {
  const out: Token[] = [];
  const numRe = /\d[\d,.٬]*/g;
  let m: RegExpExecArray | null;
  while ((m = numRe.exec(s))) {
    const raw = m[0];
    const c = canon(raw);
    if (!c) continue;

    // Explicit sign: skip one optional space back, then look for + or - (or the
    // Unicode minus). A "-" directly after a digit is a range dash, not a sign.
    let i = m.index - 1;
    if (s[i] === " ") i -= 1;
    const ch = i >= 0 ? s[i] : "";
    const prev = i - 1 >= 0 ? s[i - 1] : "";
    const isSignChar = ch === "+" || ch === "-" || ch === "−";
    const isRangeDash = (ch === "-" || ch === "−") && /[\d٬]/.test(prev);
    const explicit = isSignChar && !isRangeDash ? ch : "";

    const after = s.slice(m.index + raw.length, m.index + raw.length + 20);
    const isPercent = /^\s*(%|٪|percent|في\s*المئة|بالمئة|بالمائة)/.test(after);

    let sign = "";
    if (explicit === "-" || explicit === "−") {
      sign = "-";
    } else if (!explicit && isPercent) {
      // No explicit sign: a directional word beside the percentage sets polarity.
      const before = s.slice(Math.max(0, m.index - 28), m.index);
      if (NEG_WORDS.test(before) || NEG_WORDS.test(after)) sign = "-";
    }

    out.push({ value: sign + c, index: m.index, length: raw.length });
  }
  return out;
}

export function unsourcedFigure(text: string, allowed: string): boolean {
  if (!text) return false;

  const t = ascii(text);
  const allowedVals = new Set(signedTokens(ascii(allowed)).map((k) => k.value));

  const unit =
    /(sar|ريال|riyal|halala|\/\s*m²|\/\s*sqm|per\s*sqm|per\s*square|sq\s*m|m²|m2|per\s*year|\/\s*yr|per\s*month|\/\s*mo|percent|%|٪)/i;
  const rentCtx =
    /(rent|price|asking|median|band|index|occupancy|yield|إيجار|سعر|متوسط|وسيط|نطاق|مؤشر|إشغال|عائد)/i;

  for (const tok of signedTokens(t)) {
    // Ignore trivially short numbers (e.g. "3 months", small counts).
    if (tok.value.replace(/[.\-]/g, "").length < 2) continue;
    const ctx = t.slice(
      Math.max(0, tok.index - 20),
      Math.min(t.length, tok.index + tok.length + 20)
    );
    if ((unit.test(ctx) || rentCtx.test(ctx)) && !allowedVals.has(tok.value)) return true;
  }
  return false;
}
