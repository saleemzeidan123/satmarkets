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

import { formatCounted } from "./format";

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

// Finding 46. Every one of the three states now reads differently in words, and
// every one of them carries the age of the affirmation. Before this, fresh and
// aging both said "Available" with no date, so the only thing separating a space
// confirmed this week from one last confirmed two months ago was a colour. A
// reader who cannot distinguish those two colours, or who is hearing the card
// read aloud, received no signal at all.
//
// The wording change is not cosmetic. An aging affirmation no longer says
// "Available", because SAT does not know that. It says when the lister last said
// so and lets the reader judge, which is finding 11's "static trust statement"
// defect at its source.

// Bilingual age phrase for a day count. Western numerals in both locales (Law 7),
// and the Arabic count goes through the counted-noun formatter because `قبل`
// governs what follows: "قبل يومين", never "قبل 2 يوماً".
export function availabilityAge(days: number, ar: boolean): string {
  if (days === 0) return ar ? "اليوم" : "today";
  return ar
    ? `قبل ${formatCounted(days, "day", "ar", { oblique: true })}`
    : `${formatCounted(days, "day", "en")} ago`;
}

// Full label, for surfaces that can afford the exact date (the listing page).
export function availabilityLabel(a: Availability, dateText: string, ar: boolean): string {
  if (a.state === "stale") {
    return ar
      ? `تأكّد من التوفر مع المُدرِج · آخر تأكيد ${dateText}`
      : `Confirm availability with the lister · last confirmed ${dateText}`;
  }
  if (a.state === "aging") {
    return ar ? `آخر تأكيد ${dateText}` : `Last confirmed ${dateText}`;
  }
  return ar ? `متاح · تأكد التوفر ${dateText}` : `Available · confirmed ${dateText}`;
}

// Compact form for browse/search cards, where the exact date does not fit but the
// age does. Three distinct sentences, each with a number, so the freshness
// gradient survives greyscale, colour blindness and a screen reader.
export function availabilityShortLabel(a: Availability, ar: boolean): string {
  const age = availabilityAge(a.days, ar);
  if (a.state === "stale") {
    return ar ? `تأكّد من التوفر · آخر تأكيد ${age}` : `Confirm availability · last confirmed ${age}`;
  }
  if (a.state === "aging") {
    return ar ? `آخر تأكيد ${age}` : `Last confirmed ${age}`;
  }
  return ar ? `متاح · تأكد التوفر ${age}` : `Available · confirmed ${age}`;
}

// The single writer of the availability colour.
//
// Both surfaces used to compose this inline, and both reached for the reserved
// confirmed green on the fresh state. On the browse card that put the reserved
// colour on one card twice for two unrelated claims: the verification tick, which
// is an evidence-backed check somebody ran, and a date the lister typed. The
// standing rule is that verified green appears only for evidence-backed
// verification, so availability gives it up. Freshness reads in the words above;
// the colour is now a quiet second-order cue, not the signal itself.
export function availabilityTone(state: AvailabilityState): string {
  if (state === "stale") return "var(--status-stale)";
  if (state === "aging") return "var(--slate)";
  return "var(--harbor-d)";
}

// ---------------------------------------------------------------------------
// The lister's side of the same sentence. PKG-AV2, finding 11.
// ---------------------------------------------------------------------------
//
// PKG-AV1 made the browse card say "Last confirmed 46 days ago" and gave the
// lister no way to answer it. The rule chosen for this side is that the lister
// is shown the EXACT sentence an occupier reads, not a private paraphrase of
// it, and is then told what happens next and on what schedule. A prompt that
// only said "re-confirm your listing" would be asking for a click. This asks a
// question the lister can actually answer, because it names the claim being
// made on their behalf and the date that claim changes.
//
// Nothing here decides anything. The thresholds are the same two constants the
// public label uses, so the two sides of the platform can never drift into
// telling different people different things about the same timestamp.

export interface ListerAvailability {
  /** The sentence an occupier reads, or null when the listing carries no availability line at all. */
  publicLine: string | null;
  /** The colour that sentence is drawn in, so the lister sees their own copy of it. */
  tone: string;
  /** What happens next, and when. */
  note: string;
  /** Whether affirming today would change what an occupier reads. */
  worthReaffirming: boolean;
}

/** Whole days from an affirmation of `days` old until it crosses `boundary`. Never negative. */
export function daysUntilBoundary(days: number, boundary: number): number {
  return Math.max(0, boundary + 1 - days);
}

export function listerAvailability(
  confirmedAt: string | null | undefined,
  ar: boolean,
  now: number = Date.now(),
): ListerAvailability {
  const a = availabilityOf(confirmedAt, now);
  if (!a) {
    return {
      publicLine: null,
      tone: "var(--slate)",
      worthReaffirming: true,
      note: ar
        ? "لم يُؤكَّد التوفر على هذا العرض من قبل، فلا يظهر للباحثين أي سطر توفر."
        : "Availability has never been confirmed on this listing, so occupiers see no availability line at all.",
    };
  }
  const publicLine = availabilityShortLabel(a, ar);
  const tone = availabilityTone(a.state);
  // `بعد` governs what follows, so the Arabic dual takes the oblique form here
  // for the same reason `قبل` does above: "بعد يومين", never "بعد 2 يوماً".
  if (a.state === "fresh") {
    const left = daysUntilBoundary(a.days, FRESH_MAX_DAYS);
    return {
      publicLine,
      tone,
      worthReaffirming: false,
      note: ar
        ? `يقرأ الباحثون العرض متاحاً. بعد ${formatCounted(left, "day", "ar", { oblique: true })} يظهر عمر التأكيد بدلاً من كلمة متاح.`
        : `Occupiers read this as available. In ${formatCounted(left, "day", "en")} the line shows the age of the confirmation instead.`,
    };
  }
  if (a.state === "aging") {
    const left = daysUntilBoundary(a.days, STALE_MIN_DAYS);
    return {
      publicLine,
      tone,
      worthReaffirming: true,
      note: ar
        ? `يرى الباحثون عمر التأكيد لا كلمة متاح. بعد ${formatCounted(left, "day", "ar", { oblique: true })} يُطلب منهم تأكيد التوفر معك.`
        : `Occupiers are told how old the confirmation is, not that the space is available. In ${formatCounted(left, "day", "en")} they are asked to confirm availability with you.`,
    };
  }
  return {
    publicLine,
    tone,
    worthReaffirming: true,
    note: ar
      ? "يُطلب من الباحثين الآن تأكيد التوفر معك قبل التواصل."
      : "Occupiers are now being told to confirm availability with you before they enquire.",
  };
}
