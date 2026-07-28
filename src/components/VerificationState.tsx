import { verificationDimensionLabel, verificationStateLabel } from "@/lib/evidence";
import {
  listingVerification,
  listingVerifiedDimensions,
  notVerifiedReasonText,
  unverifiedNoticeText,
  verificationHeadingText,
  verifiedBadgeText,
  type FilingAccount,
  type VerifiableListing,
} from "@/lib/listingVerification";

// WHAT A LISTING'S VERIFICATION LOOKS LIKE ON THE PAGE.
//
// The rendering half of ADV-1, closing register findings 3 and 24 and owner
// decision O3. `listingVerification.ts` decides what a row supports saying; this
// file is the only place that draws it.
//
// The badge it replaces read "Verified owner" and was drawn from
// `ownership_verified` alone, on cards, on the gallery, in the page metadata and
// on the home page. That single boolean is true on all 88 published listings,
// every one of which is a fixture: no reviewer countersigned any of them, the
// method column names the loader that inserted them, and not one holds an
// advertising permit. So the badge appeared 88 times and meant nothing 88 times.
//
// Two rules govern everything below.
//
//   A badge names its own gate. Ownership, authorisation, the right to market
//   and the advertising permit are four separate questions with four separate
//   answers, and a reader who sees one is entitled to know which one it is.
//
//   No badge is the correct output for an unchecked record. Where the old code
//   drew a green tick this draws nothing at all on a card, and on the listing
//   page it draws a plain statement of what has not been checked. D24 runs in
//   both directions: green is never spent on an unearned claim, and a claim that
//   is earned is never painted anything else.

/**
 * The badges a card may carry, which today is none.
 *
 * Returns an array so it drops straight into the `badges` prop that `Photo` and
 * `Ph` already take. A card has no room to explain an absence, and an absence
 * that is explained badly is worse than one the listing page states properly,
 * so the unverified case is silent here and spelled out in `VerificationSummary`.
 */
export function verifiedBadges(
  listing: VerifiableListing,
  account: FilingAccount | null | undefined,
  ar: boolean
): React.ReactNode[] {
  return listingVerifiedDimensions(listing, account ?? null).map((d) => (
    <span key={`v-${d}`} className="verified">
      <span className="dot" />
      {verifiedBadgeText(d, ar)}
    </span>
  ));
}

/** True when at least one dimension has genuinely earned a badge. */
export function hasVerifiedBadge(
  listing: VerifiableListing,
  account?: FilingAccount | null
): boolean {
  return listingVerifiedDimensions(listing, account ?? null).length > 0;
}

/**
 * The dimension list on a listing page.
 *
 * Every dimension is shown whatever its answer, because the questions a reader
 * needs answered do not change with the answers. A dimension that is unverified
 * says why in terms of the record: not a policy, not an apology, a fact.
 */
export default function VerificationSummary({
  listing,
  account,
  ar,
}: {
  listing: VerifiableListing;
  account?: FilingAccount | null;
  ar: boolean;
}) {
  const rows = listingVerification(listing, account ?? null);
  const anyVerified = rows.some((r) => r.state === "verified");

  return (
    <div
      className="card pad"
      style={{ marginTop: 16, boxShadow: "none", background: "var(--paper)" }}
    >
      <div className="eyebrow">{verificationHeadingText(ar)}</div>

      <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
        {rows.map((r) => {
          const good = r.state === "verified";
          const tone = good
            ? "var(--verified)"
            : r.state === "not_applicable"
              ? "var(--slate)"
              : "var(--ink)";
          return (
            <div
              key={r.dimension}
              className="row between gap10 wrap"
              style={{ alignItems: "flex-start" }}
            >
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>
                {verificationDimensionLabel(r.dimension, ar)}
              </span>
              <span style={{ minWidth: 0, textAlign: ar ? "left" : "right" }}>
                <span style={{ fontSize: 13, fontWeight: good ? 600 : 500, color: tone }}>
                  {verificationStateLabel(r.state, ar)}
                </span>
                {r.reasons.length > 0 ? (
                  <span
                    className="muted"
                    style={{ display: "block", fontSize: 11.5, lineHeight: 1.6, marginTop: 2 }}
                  >
                    {r.reasons.map((x) => notVerifiedReasonText(x, ar)).join(ar ? "، " : ", ")}
                  </span>
                ) : null}
              </span>
            </div>
          );
        })}
      </div>

      {anyVerified ? null : (
        <div
          className="muted"
          style={{
            marginTop: 12,
            paddingTop: 10,
            borderTop: "1px solid var(--silver)",
            fontSize: 12,
            lineHeight: 1.7,
          }}
        >
          {unverifiedNoticeText(ar)}
        </div>
      )}
    </div>
  );
}
