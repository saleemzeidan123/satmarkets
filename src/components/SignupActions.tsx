"use client";
import { useState, type CSSProperties } from "react";

// No token prop: the review API authorizes on the session cookie.
export default function SignupActions({ id, status }: { id: string; status: string }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  async function act(next: "contacted" | "verified" | "rejected") {
    let notes = "";
    if (next === "rejected") {
      notes = window.prompt("Rejection note?") || "";
      if (!notes) return;
    }
    setBusy(true); setMsg("");
    try {
      const res = await fetch("/api/signups/review", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, status: next, notes }),
      });
      const j = await res.json().catch(() => ({}));
      if (j?.ok) { location.reload(); } else { setMsg(j?.error || "error"); setBusy(false); }
    } catch { setMsg("network error"); setBusy(false); }
  }
  const btn = (color: string): CSSProperties => ({ fontSize: "0.6875rem", padding: "3px 9px", borderRadius: 6, border: "1px solid " + color, background: "var(--paper)", color, cursor: busy ? "default" : "pointer", opacity: busy ? 0.5 : 1, whiteSpace: "nowrap" });
  return (
    <span style={{ display: "inline-flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
      {status === "new" && <button disabled={busy} onClick={() => act("contacted")} style={btn("var(--harbor-d)")}>Contacted</button>}
      {status !== "verified" && <button disabled={busy} onClick={() => act("verified")} style={btn("var(--verified)")}>Approve</button>}
      {status !== "rejected" && <button disabled={busy} onClick={() => act("rejected")} style={btn("var(--red)")}>Reject</button>}
      {msg && <span style={{ fontSize: "0.6875rem", color: "var(--red)" }}>{msg}</span>}
    </span>
  );
}
