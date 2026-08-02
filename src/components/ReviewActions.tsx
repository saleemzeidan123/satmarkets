"use client";
import { useState, type CSSProperties } from "react";
import { apiErrorMessage } from "@/lib/apiErrors";

// No token prop: the review API authorizes on the session cookie the browser
// already sends. A secret must never cross into a client component.
//
// Finding 203. This rendered whatever English sentence the route put on the wire
// and, where the route sent none, the bare string "error", which is not a
// sentence in any language. The route now names its refusals as stable codes and
// this names the code.
//
// The code is named in English, and that is deliberate rather than an oversight.
// The reviewer console is English throughout: its headings, its column names,
// its Yes and No, and its two buttons here. The page that renders it,
// src/app/[locale]/verify/page.tsx, takes no params at all, so the locale is not
// merely unused there, it is not in scope. Putting one Arabic sentence into an
// otherwise English console would make it less coherent, not more. That the
// console is monolingual is a real gap and it is recorded as its own finding; it
// is not something to half fix inside an error handler.
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
      if (j?.ok) { location.reload(); } else { setMsg(apiErrorMessage(j?.code, false, "Could not save the decision.")); setBusy(false); }
    } catch {
      setMsg("Could not reach the server."); setBusy(false);
    }
  }
  const btn = (color: string): CSSProperties => ({ fontSize: "0.6875rem", padding: "3px 9px", borderRadius: 6, border: "1px solid " + color, background: "var(--paper)", color, cursor: busy ? "default" : "pointer", opacity: busy ? 0.5 : 1 });
  return (
    <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
      <button disabled={busy} onClick={() => act("approve")} style={btn("var(--harbor-d)")}>Approve</button>
      <button disabled={busy} onClick={() => act("reject")} style={btn("var(--red)")}>Reject</button>
      {msg && <span style={{ fontSize: "0.6875rem", color: "var(--red)" }}>{msg}</span>}
    </span>
  );
}
