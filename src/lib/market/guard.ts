// Law 3 guard (shared by advisor, translate, shortlist). A number is "unsourced"
// when it sits in a rent/price context and does not appear in the allowed source
// text. Context is detected by an explicit unit OR by rent-related words, so bare
// numbers ("the median is 2,500") are caught, not only unit-tagged ones. Errs safe.
export function unsourcedFigure(text: string, allowed: string): boolean {
  if (!text) return false;
  const ascii = (x: string) => (x || "").replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660)).toLowerCase();
  const stripNum = (x: string) => x.replace(/[,\s٬]/g, "");
  const t = ascii(text);
  const a = stripNum(ascii(allowed));
  const unit = /(sar|ريال|riyal|halala|\/\s*m²|\/\s*sqm|per\s*sqm|per\s*square|sq\s*m|m²|m2|per\s*year|\/\s*yr|per\s*month|\/\s*mo|percent|%|٪)/i;
  const rentCtx = /(rent|price|asking|median|band|index|occupancy|yield|إيجار|سعر|متوسط|وسيط|نطاق|مؤشر|إشغال|عائد)/i;
  const numRe = /\d[\d,.٬]*/g;
  let m: RegExpExecArray | null;
  while ((m = numRe.exec(t))) {
    const num = m[0];
    if (stripNum(num).replace(/\./g, "").length < 2) continue;
    const ctx = t.slice(Math.max(0, m.index - 20), Math.min(t.length, m.index + num.length + 20));
    if ((unit.test(ctx) || rentCtx.test(ctx)) && !a.includes(stripNum(num))) return true;
  }
  return false;
}
