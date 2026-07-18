// The provenance model is the honesty spine of the per-asset system. Every datum
// shown on a listing declares where it came from, so Law 3 (SAT never invents a
// figure) is structural rather than a matter of remembering to be careful. There
// are exactly four tiers and never a fifth "Invented":
//
//   entered  - stated by the lister, not yet checked
//   verified - SAT confirmed it, carries the date of the check
//   computed - SAT derived it deterministically, carries the date and the method
//   sourced  - from a named external dataset, carries that dataset and its period
//
// Rendering reuses the verification-stamp colours already shipped (the Verified
// tier is the green capsule); the other tiers are muted so the eye reads the
// verified state as the strong one. No em dashes anywhere (Law 2). Western
// numerals in both locales.

export type ProvenanceTier = "entered" | "verified" | "computed" | "sourced";

export interface ProvenanceParts {
  date?: string;     // display date for verified and computed, e.g. "29 Jun 2026"
  method?: string;   // short method for computed, e.g. "nearest anchor, RCRC open data"
  dataset?: string;  // dataset name for sourced, e.g. "REGA Rental Index (Ejar)"
  period?: string;   // period for sourced, e.g. "2026-Q2"
}

// Token names (CSS custom properties), never raw colours, so the chip stays
// driven by the design system and inherits any light/dark or brand change.
export interface ProvenanceStyle {
  fg: string;    // text and dot colour token
  wash: string;  // background wash token
  line: string;  // border colour token
  dot: boolean;  // render the status dot (verified only, matching the capsule)
}

export function provenanceStyle(tier: ProvenanceTier): ProvenanceStyle {
  switch (tier) {
    case "verified":
      return { fg: "--verified", wash: "--verified-wash", line: "--green-line", dot: true };
    case "computed":
    case "sourced":
      return { fg: "--harbor", wash: "--cool", line: "--silver-2", dot: false };
    case "entered":
    default:
      return { fg: "--slate", wash: "--cool", line: "--silver", dot: false };
  }
}

// The short label shown inside the chip. "Stated by the lister" matches the
// existing statedGeneric wording already used on the detail page, so the chip is
// consistent with copy already live. Optional parts are appended only when given,
// never fabricated: a verified field with no date reads simply "Verified".
export function provenanceLabel(tier: ProvenanceTier, parts: ProvenanceParts, ar: boolean): string {
  switch (tier) {
    case "verified":
      return ar
        ? `موثّق${parts.date ? ` · روجع ${parts.date}` : ""}`
        : `Verified${parts.date ? ` · checked ${parts.date}` : ""}`;
    case "computed":
      return ar
        ? `محسوب${parts.date ? ` ${parts.date}` : ""}${parts.method ? ` · ${parts.method}` : ""}`
        : `Computed${parts.date ? ` ${parts.date}` : ""}${parts.method ? ` · ${parts.method}` : ""}`;
    case "sourced":
      return [parts.dataset, parts.period].filter(Boolean).join(" · ")
        || (ar ? "من مصدر منشور" : "From a published source");
    case "entered":
    default:
      return ar ? "كما ذكرها المُعلن" : "Stated by the lister";
  }
}

// A fuller accessible description for the chip's title/aria, so a screen reader
// user gets the meaning of the tier, not just the terse visible label.
export function provenanceAria(tier: ProvenanceTier, parts: ProvenanceParts, ar: boolean): string {
  switch (tier) {
    case "verified":
      return ar
        ? `تحقّقت سات من هذه المعلومة${parts.date ? ` بتاريخ ${parts.date}` : ""}`
        : `SAT verified this${parts.date ? ` on ${parts.date}` : ""}`;
    case "computed":
      return ar
        ? `حسبتها سات${parts.method ? ` (${parts.method})` : ""}${parts.date ? ` بتاريخ ${parts.date}` : ""}`
        : `Computed by SAT${parts.method ? ` (${parts.method})` : ""}${parts.date ? ` on ${parts.date}` : ""}`;
    case "sourced":
      return ar
        ? `من مصدر خارجي: ${[parts.dataset, parts.period].filter(Boolean).join("، ") || "منشور"}`
        : `From an external source: ${[parts.dataset, parts.period].filter(Boolean).join(", ") || "published"}`;
    case "entered":
    default:
      return ar ? "ذكرها المُعلن ولم تتحقق منها سات بعد" : "Stated by the lister, not yet verified by SAT";
  }
}
