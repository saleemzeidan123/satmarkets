"use client";
import { useState, type CSSProperties } from "react";

// No token prop: the review API authorizes on the session cookie the browser
// already sends. A secret must never cross into a client component.
export default function ReviewActions({ id }: { id: string }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  async function act(action: "approve" | "reject") {
    let reason = "";
    if (action === "reject") {
      reason = window.prompt("Rejection reason?") || "";
      if (!reason) return;
    }
    setBusy(true); setMsg("");
    try {
      const res = await fetch(`/api/listings/${id}/review`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action, reason }),
      });
      const j = await res.json().catch(() => ({}));
      if (j?.ok) { location.reload(); } else { setMsg(j?.error || "error"); setBusy(false); }
    } catch {
      setMsg("network error"); setBusy(false);
    }
  }
  const btn = (color: string): CSSProperties => ({ fontSize: 11, padding: "3px 9px", borderRadius: 6, border: "1px solid " + color, background: "#fff", color, cursor: busy ? "default" : "pointer", opacity: busy ? 0.5 : 1 });
  return (
    <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
      <button disabled={busy} onClick={() => act("approve")} style={btn("#1B7A50")}>Approve</button>
      <button disabled={busy} onClick={() => act("reject")} style={btn("#C8412E")}>Reject</button>
      {msg && <span style={{ fontSize: 11, color: "#C8412E" }}>{msg}</span>}
    </span>
  );
}
