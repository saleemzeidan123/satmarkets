// Honest availability-freshness signal (Fable 5's "own freshness, not just
// provenance" win). The biggest trust failure on Aqar-class platforms is dead,
// stale listings that still show as available. SAT stamps the date availability
// was last affirmed and lets that date visibly decay, rather than pretending
// every listing is current.
//
// Law 3: the date must be a real event, never invented. It is read from
// availability_confirmed_at, which is set when the lister affirms the space is
// available (at publication, or on a later re-confirmation). We deliberately do
// NOT fall back to updated_at (bumped by any edit) or verified_at (owner check,
// a different fact). If the column is null we show nothing.

export type AvailabilityState = "fresh" | "aging" | "stale";

export interface Availability {
  days: number;            // whole days since availability was affirmed, never negative
  state: AvailabilityState;
}

const DAY = 86400000;
// Commercial availability moves slower than residential. Under three weeks reads
// as current; past two months the affirmation is old enough to prompt a re-check.
export const FRESH_MAX_DAYS = 21;
export const STALE_MIN_DAYS = 60;

export function availabilityOf(
  confirmedAt: string | null | undefined,
  now: number = Date.now(),
): Availability | null {
  if (!confirmedAt) return null;
  const t = Date.parse(confirmedAt);
  if (!Number.isFinite(t)) return null;
  const days = Math.max(0, Math.floor((now - t) / DAY));
  const state: AvailabilityState =
    days <= FRESH_MAX_DAYS ? "fresh" : days > STALE_MIN_DAYS ? "stale" : "aging";
  return { days, state };
}

// Bilingual label. Western numerals in both locales (Law 7). Fresh and aging read
// as a plain affirmation with a date; stale turns into a nudge to re-check with
// the lister, because an old affirmation should not masquerade as a live one.
export function availabilityLabel(a: Availability, dateText: string, ar: boolean): string {
  if (a.state === "stale") {
    return ar
      ? `تأكّد من التوفر مع المُدرِج · آخر تأكيد ${dateText}`
      : `Confirm availability with the lister · last confirmed ${dateText}`;
  }
  return ar ? `متاح · تأكد التوفر ${dateText}` : `Available · confirmed ${dateText}`;
}

// Compact form for browse/search cards: a status word whose colour (set by the
// caller from `state`) carries the freshness gradient, so shortlisting tenants can
// spot a stale listing at a glance without a second date line cluttering the card.
export function availabilityShortLabel(a: Availability, ar: boolean): string {
  if (a.state === "stale") return ar ? "تأكّد من التوفر" : "Confirm availability";
  return ar ? "متاح" : "Available";
}
