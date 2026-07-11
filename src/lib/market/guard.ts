// Law 3 guard (shared by advisor, translate, shortlist). A number is "unsourced"
// when it sits in a rent/price context and its VALUE does not appear in the
// allowed source text. Context is detected by an explicit unit OR by rent-related
// words, so bare numbers ("the median is 2,500") are caught, not only unit-tagged
// ones. Comparison is by whole normalized numeric value, never substring, so an
// allowed "12,500" does NOT vouch for a fabricated "2,500". Errs safe.
export function unsourcedFigure(text: string, allowed: string): boolean {
  if (!text) return false;
  const ascii = (x: string) =>
    (x || "").replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660)).toLowerCase();
  // Canonical numeric value of a raw token, or null if not a plain number.
  // Strips thousands separators + spaces, trims trailing punctuation, and
  // normalizes via Number so "2,500" == "2500", "97.70" == "97.7".
  const canon = (raw: string): string | null => {
    const cleaned = raw.replace(/[,\s٬]/g, "").replace(/[.,]+$/, "");
    if (!/^\d+(\.\d+)?$/.test(cleaned)) return null;
    const v = Number(cleaned);
    return Number.isFinite(v) ? String(v) : null;
  };
  const numRe = /\d[\d,.٬]*/g;
  const t = ascii(text);
  // Build the set of allowed numeric VALUES (whole tokens only).
  const allowedVals = new Set<string>();
  const aStr = ascii(allowed);
  let am: RegExpExecArray | null;
  while ((am = numRe.exec(aStr))) {
    const c = canon(am[0]);
    if (c) allowedVals.add(c);
  }
  numRe.lastIndex = 0;
  const unit = /(sar|ريال|riyal|halala|\/\s*m²|\/\s*sqm|per\s*sqm|per\s*square|sq\s*m|m²|m2|per\s*year|\/\s*yr|per\s*month|\/\s*mo|percent|%|٪)/i;
  const rentCtx = /(rent|price|asking|median|band|index|occupancy|yield|إيجار|سعر|متوسط|وسيط|نطاق|مؤشر|إشغال|عائد)/i;
  let m: RegExpExecArray | null;
  while ((m = numRe.exec(t))) {
    const raw = m[0];
    const c = canon(raw);
    if (!c) continue;
    // Ignore trivially short numbers (e.g. "3 months", small counts).
    if (c.replace(/\./g, "").length < 2) continue;
    const ctx = t.slice(Math.max(0, m.index - 20), Math.min(t.length, m.index + raw.length + 20));
    if ((unit.test(ctx) || rentCtx.test(ctx)) && !allowedVals.has(c)) return true;
  }
  return false;
}
