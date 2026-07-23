// Release-state vocabulary (WS05). One approved, bilingual label per state so a
// user can instantly tell current, planned, sample and stale apart, and so the
// same words are reused across every surface instead of ad-hoc copy.
//
// This is the centralized vocabulary module for Phase 0/1; wiring each surface
// to it happens with the data-state components (WS13). Definitions here are the
// single source the claim ledger and UI both defer to.

export type ReleaseState =
  | "preview"        // synthetic/seed data that could be mistaken for live supply
  | "sample"         // an individual sample/mock figure or record
  | "planned"        // a capability that is designed but not yet live
  | "available"      // current and usable now
  | "reconfirm"      // was current, now stale, needs reconfirmation
  | "verified";      // an identity/ownership/authority check that is true

export const RELEASE_STATES: ReleaseState[] = ["preview", "sample", "planned", "available", "reconfirm", "verified"];

const LABEL: Record<ReleaseState, [string, string]> = {
  preview: ["Preview with sample data", "نسخة تجريبية ببيانات نموذجية"],
  sample: ["Sample data", "بيانات نموذجية"],
  planned: ["Planned", "مخطط له"],
  available: ["Available", "متاح"],
  reconfirm: ["Needs reconfirmation", "يلزم إعادة التأكيد"],
  verified: ["Verified", "موثّق"],
};

export function releaseLabel(state: ReleaseState, ar: boolean): string {
  return LABEL[state][ar ? 1 : 0];
}

// Which semantic tone a state should render with (drives colour/icon later,
// never colour alone). "verified" and "available" are positive; "reconfirm" is
// attention; "preview"/"sample"/"planned" are neutral/informational.
export type StateTone = "positive" | "attention" | "neutral";
export function stateTone(state: ReleaseState): StateTone {
  if (state === "verified" || state === "available") return "positive";
  if (state === "reconfirm") return "attention";
  return "neutral";
}
