"use client";
import { useState, type CSSProperties } from "react";

// No token prop: the review API authorizes on the session cookie.
export default function ViewingActions({ id, status }: { id: string; status: string }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  async function act(next: "confirmed" | "cancelled" | "completed" | "no_show") {
    setBusy(true); setMsg("");
    try {
      const res = await fetch("/api/viewings/review", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, status: next }),
      });
      const j = await res.json().catch(() => ({}));
      if (j?.ok) { location.reload(); } else { setMsg(j?.error || "error"); setBusy(false); }
    } catch { setMsg("network error"); setBusy(false); }
  }
  const btn = (color: string): CSSProperties => ({ fontSize: 11, padding: "3px 9px", borderRadius: 6, border: "1px solid " + color, background: "var(--paper)", color, cursor: busy ? "default" : "pointer", opacity: busy ? 0.5 : 1, whiteSpace: "nowrap" });
  return (
    <span style={{ display: "inline-flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
      {status === "requested" && <button disabled={busy} onClick={() => act("confirmed")} style={btn("#1B7A50")}>Confirm</button>}
      {status === "requested" && <button disabled={busy} onClick={() => act("cancelled")} style={btn("var(--red)")}>Decline</button>}
      {status === "confirmed" && <button disabled={busy} onClick={() => act("completed")} style={btn("var(--harbor-d)")}>Completed</button>}
      {status === "confirmed" && <button disabled={busy} onClick={() => act("no_show")} style={btn("var(--amber)")}>No-show</button>}
      {msg && <span style={{ fontSize: 11, color: "var(--red)" }}>{msg}</span>}
    </span>
  );
}
