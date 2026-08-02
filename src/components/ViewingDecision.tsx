"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiErrorMessage } from "@/lib/apiErrors";

// Confirm or decline. No optimistic update: if the decision did not save, the screen
// must not show it as saved. The lister is about to tell a human being to drive across
// Riyadh on the strength of what this button says.
export default function ViewingDecision({
  id, locale, current,
}: { id: string; locale: string; current: string }) {
  const ar = locale === "ar";
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const t = ar
    ? {
        confirm: "تأكيد",
        decline: "اعتذار",
        failed: "تعذر الحفظ. حاول مرة أخرى.",
        network: "تعذّر الوصول إلى الخادم. تحقق من اتصالك ثم أعد المحاولة.",
      }
    : {
        confirm: "Confirm",
        decline: "Decline",
        failed: "That did not save. Try again.",
        network: "Could not reach the server. Check your connection and try again.",
      };

  async function decide(status: "confirmed" | "cancelled") {
    setBusy(status);
    setErr(null);
    try {
      const res = await fetch(`/api/viewings/${id}/decision`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        // Finding 203. This rendered whatever English sentence the route put on
        // the wire, and the Arabic line beside it was the branch that almost
        // never ran. One of those sentences spliced the database's own status
        // vocabulary into a list, so a lister who pressed Decline on an Arabic
        // page could be shown four English words none of which are on the two
        // buttons in front of them. The route names the reason as a stable code
        // now and this names the code in the language the page is rendering.
        setErr(apiErrorMessage(j?.code, ar, t.failed));
        setBusy(null);
        return;
      }
      router.refresh();
    } catch {
      // Only a genuine network or parse failure reaches here, so it says so
      // rather than borrowing the sentence for a refusal the server did state.
      setErr(t.network);
    }
    setBusy(null);
  }

  if (current !== "requested") return null;

  return (
    <div className="col" style={{ gap: 6, alignItems: "flex-end" }}>
      <div className="row" style={{ gap: 8 }}>
        <button
          onClick={() => decide("confirmed")}
          disabled={!!busy}
          className="btn primary sm"
          style={{ minHeight: 36, opacity: busy ? 0.6 : 1 }}
        >
          {busy === "confirmed" ? "..." : t.confirm}
        </button>
        <button
          onClick={() => decide("cancelled")}
          disabled={!!busy}
          className="btn ghost sm"
          style={{ minHeight: 36, opacity: busy ? 0.6 : 1 }}
        >
          {busy === "cancelled" ? "..." : t.decline}
        </button>
      </div>
      {err && <span role="alert" style={{ color: "var(--red)", fontSize: "0.71875rem" }}>{err}</span>}
    </div>
  );
}
