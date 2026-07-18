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
}: {
  tier: ProvenanceTier;
  parts?: ProvenanceParts;
  ar?: boolean;
  size?: "sm" | "md";
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
        whiteSpace: "nowrap",
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
