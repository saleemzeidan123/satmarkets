import type { ReactNode } from "react";
import { stateTone } from "@/lib/releaseState";

// Shared data-state block (WS13). One accessible, RTL-safe pattern for the empty,
// loading, error, stale, sample, planned and permission-denied states, so no
// surface renders blank or falsely positive. Tone drives colour AND an icon,
// never colour alone; text is always present. Server-compatible (no client
// hooks). Consumers pass already-localized strings.

export type DataStateKind =
  | "loading"
  | "empty"
  | "error"
  | "stale"        // maps to release-state reconfirm tone
  | "sample"
  | "planned"
  | "permission";

// Map a UI state kind to a release-state tone (verified | info | attention | neutral).
function toneOf(kind: DataStateKind) {
  if (kind === "error") return "attention" as const; // deep, but attention family for icon/colour pairing
  if (kind === "stale") return stateTone("reconfirm");
  if (kind === "sample") return stateTone("sample");
  if (kind === "planned") return stateTone("planned");
  return "neutral" as const; // loading, empty, permission
}

const TONE_STYLE: Record<string, { fg: string; bg: string; bd: string }> = {
  verified: { fg: "var(--status-verified)", bg: "var(--status-verified-wash)", bd: "var(--status-verified-line)" },
  info: { fg: "var(--status-info)", bg: "var(--status-info-wash)", bd: "var(--border-brand)" },
  attention: { fg: "var(--status-attention)", bg: "var(--status-attention-wash)", bd: "var(--status-attention)" },
  neutral: { fg: "var(--slate)", bg: "var(--surface-sunken)", bd: "var(--border)" },
};

function Glyph({ kind, color }: { kind: DataStateKind; color: string }) {
  const common = { width: 22, height: 22, viewBox: "0 0 24 24", fill: "none", stroke: color, strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
  switch (kind) {
    case "loading": return <svg {...common}><path d="M12 3a9 9 0 1 0 9 9" /></svg>;
    case "error": return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16h.01" /></svg>;
    case "stale": return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>;
    case "sample": return <svg {...common}><path d="M4 7h16M4 12h16M4 17h10" strokeDasharray="3 3" /></svg>;
    case "planned": return <svg {...common}><rect x="4" y="5" width="16" height="16" rx="2" /><path d="M8 3v4M16 3v4M4 10h16" /></svg>;
    case "permission": return <svg {...common}><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>;
    default: return <svg {...common}><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></svg>; // empty = search
  }
}

export default function DataState({
  kind,
  title,
  body,
  action,
  compact = false,
}: {
  kind: DataStateKind;
  title: string;
  body?: string;
  action?: ReactNode;
  compact?: boolean;
}) {
  const tone = toneOf(kind);
  const s = TONE_STYLE[tone] ?? TONE_STYLE.neutral;
  const busy = kind === "loading";
  return (
    <div
      role={kind === "error" ? "alert" : "status"}
      aria-busy={busy || undefined}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        gap: 10,
        padding: compact ? "20px 16px" : "40px 22px",
        border: `1px solid ${s.bd}`,
        borderRadius: "var(--r-panel)",
        background: s.bg,
        color: "var(--ink)",
      }}
    >
      <span style={{ display: "inline-flex", color: s.fg }}>
        <Glyph kind={kind} color={s.fg} />
      </span>
      <div style={{ fontSize: "var(--fs-md)", fontWeight: 600 }}>{title}</div>
      {body ? <div className="muted" style={{ fontSize: "var(--fs-sm)", maxWidth: 420, lineHeight: 1.5 }}>{body}</div> : null}
      {action ? <div style={{ marginTop: 6 }}>{action}</div> : null}
    </div>
  );
}
