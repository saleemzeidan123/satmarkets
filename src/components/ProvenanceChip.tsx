import {
  type ProvenanceTier,
  type ProvenanceParts,
  provenanceStyle,
  provenanceLabel,
  provenanceAria,
} from "@/lib/provenance";

// The shared provenance chip: the single component that renders any datum's
// origin tier consistently across the whole platform. Built once, early (per the
// per-asset plan), so the honesty surface is uniform and Law 3 is visible at the
// point of every figure. It reuses the verification-stamp colours for the
// Verified tier. Additive: importing it changes nothing until a surface renders
// it.
//
// size "sm" is the inline, in-a-field size; "md" matches the standalone capsule
// on the detail page.
export default function ProvenanceChip({
  tier,
  parts = {},
  ar = false,
  size = "sm",
  wrap = false,
}: {
  tier: ProvenanceTier;
  parts?: ProvenanceParts;
  ar?: boolean;
  size?: "sm" | "md";
  /**
   * Let the label break across lines.
   *
   * Off by default, because a chip beside a field has room and a pill broken
   * over two lines is uglier than one that stays on one. On by default nowhere:
   * a caller turns it on when it knows its own container can be narrower than
   * the widest label this component produces, which "From a published source"
   * reaches at 130px. The Evidence Passport is that caller. Its tile drops to
   * 103px once the listing page's auto-fit grid splits, and a chip that cannot
   * wrap there does not shrink, it hangs out of the card.
   *
   * A prop rather than an `!important` override from the caller's stylesheet:
   * the width the chip occupies is the chip's business, and a rule reaching in
   * to defeat this component's own inline style is a rule that stops working
   * the day the inline style moves.
   */
  wrap?: boolean;
}) {
  const s = provenanceStyle(tier);
  const label = provenanceLabel(tier, parts, ar);
  const aria = provenanceAria(tier, parts, ar);
  const md = size === "md";

  return (
    <span
      title={aria}
      aria-label={aria}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: md ? 8 : 6,
        background: `var(${s.wash})`,
        color: `var(${s.fg})`,
        border: `1px solid var(${s.line})`,
        borderRadius: 999,
        paddingBlock: md ? 6 : 3,
        paddingInline: md ? 12 : 8,
        fontSize: md ? 13 : 11,
        fontWeight: 600,
        lineHeight: 1.3,
        whiteSpace: wrap ? "normal" : "nowrap",
        ...(wrap ? { maxWidth: "100%", minWidth: 0 } : {}),
      }}
    >
      {s.dot && (
        <span
          aria-hidden="true"
          style={{ width: md ? 8 : 6, height: md ? 8 : 6, borderRadius: 999, background: `var(${s.fg})`, flexShrink: 0 }}
        />
      )}
      {label}
    </span>
  );
}
