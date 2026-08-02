"use client";
import { useState, type CSSProperties } from "react";
import { apiErrorMessage } from "@/lib/apiErrors";

// No token prop: the review API authorizes on the session cookie.
//
// Finding 203. This rendered whatever English sentence the route put on the wire
// and, where the route sent none, the bare string "error", which is not a
// sentence in any language. The route now names its refusals as stable codes and
// this names the code.
//
// The code is named in English, and that is deliberate rather than an oversight,
// for the same reason recorded in ReviewActions. The page that renders this,
// src/app/[locale]/verify/viewings/page.tsx, takes no params at all, so the
// locale is not merely unused there, it is not in scope. One Arabic sentence in
// an otherwise English console would make it less coherent, not more. That the
// console is monolingual is a real gap recorded as its own finding; it is not
// something to half fix inside an error handler.
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
      if (j?.ok) { location.reload(); } else { setMsg(apiErrorMessage(j?.code, false, "Could not save the decision.")); setBusy(false); }
    } catch { setMsg("Could not reach the server."); setBusy(false); }
  }
  const btn = (color: string): CSSProperties => ({ fontSize: "0.6875rem", padding: "3px 9px", borderRadius: 6, border: "1px solid " + color, background: "var(--paper)", color, cursor: busy ? "default" : "pointer", opacity: busy ? 0.5 : 1, whiteSpace: "nowrap" });
  return (
    <span style={{ display: "inline-flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
      {status === "requested" && <button disabled={busy} onClick={() => act("confirmed")} style={btn("var(--harbor-d)")}>Confirm</button>}
      {status === "requested" && <button disabled={busy} onClick={() => act("cancelled")} style={btn("var(--red)")}>Decline</button>}
      {status === "confirmed" && <button disabled={busy} onClick={() => act("completed")} style={btn("var(--harbor-d)")}>Completed</button>}
      {status === "confirmed" && <button disabled={busy} onClick={() => act("no_show")} style={btn("var(--amber-d)")}>No-show</button>}
      {msg && <span style={{ fontSize: "0.6875rem", color: "var(--red)" }}>{msg}</span>}
    </span>
  );
}
