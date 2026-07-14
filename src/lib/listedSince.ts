// Honest, un-gameable "time listed" signal (roadmap Q10, Redfin "Time on Redfin"
// pattern). We count from created_at, the row's first-seen timestamp, NOT from
// published_at: a lister who archives and re-publishes to look fresh does not move
// created_at, so the day count cannot be reset by re-listing. "New" is a genuine
// recency cue for the first two weeks. We deliberately do NOT infer "Reduced",
// "Under offer" or "Leased": there is no price history and no such status in the
// schema, and SAT never shows a signal it cannot back with data.

export interface ListedSince {
  days: number;   // whole days since first seen, never negative
  isNew: boolean; // first-seen within the last 14 days
}

const DAY = 86400000;
const NEW_WINDOW_DAYS = 14;

export function listedSince(createdAt: string | null | undefined, now: number = Date.now()): ListedSince | null {
  if (!createdAt) return null;
  const t = Date.parse(createdAt);
  if (!Number.isFinite(t)) return null;
  const days = Math.max(0, Math.floor((now - t) / DAY));
  return { days, isNew: days <= NEW_WINDOW_DAYS };
}

// Bilingual label for the day count. Western numerals in both locales (Law 7).
export function listedLabel(days: number, ar: boolean): string {
  if (ar) return days === 0 ? "أُدرج اليوم" : `أُدرج قبل ${days} يوماً`;
  return days === 0 ? "Listed today" : days === 1 ? "Listed 1 day ago" : `Listed ${days} days ago`;
}
