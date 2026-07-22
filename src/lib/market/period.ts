// One typed source for rendering a Rent Index reporting period (PKG-0A, Codex
// correction 1). The database stores periods as "YYYY-Qn" (rent_index_published
// currently carries exactly "2026-Q2"); older copy and fixtures used "Qn YYYY".
// Every surface that shows a period must render it through this function so
// English, Arabic and structured data can never disagree on the quarter again.
//
// This function FORMATS a stored period. It never invents one: if the input is
// not a recognizable quarter identifier, the caller gets the raw string back
// unchanged rather than a guessed quarter (Law 3: no invented figures, and a
// reporting period is part of the figure).

const AR_QUARTER: Record<string, string> = {
  "1": "الربع الأول",
  "2": "الربع الثاني",
  "3": "الربع الثالث",
  "4": "الربع الرابع",
};

/** Parse "2026-Q2", "Q2 2026" or "2026 Q2" into {q, year}, else null. */
export function parsePeriod(period: string | null | undefined): { q: string; year: string } | null {
  const s = String(period ?? "").trim();
  let m = /^(\d{4})[\s-]?Q([1-4])$/i.exec(s);
  if (m) return { year: m[1], q: m[2] };
  m = /^Q([1-4])[\s-]?(\d{4})$/i.exec(s);
  if (m) return { year: m[2], q: m[1] };
  return null;
}

/** Render a stored period for display. Unrecognized input is returned as-is. */
export function formatPeriod(period: string | null | undefined, ar: boolean): string {
  const p = parsePeriod(period);
  if (!p) return String(period ?? "");
  return ar ? `${AR_QUARTER[p.q]} ${p.year}` : `Q${p.q} ${p.year}`;
}
