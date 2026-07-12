"use client";
import { useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabase/client";

// SM-P1-010: a real, visible, keyboard-operable sign-out control with an
// accessible name. Terminates the Supabase session, then hard-navigates to the
// locale's login route so the server re-evaluates authorization from scratch.
export default function SignOutButton({ locale, label }: { locale: string; label: string }) {
  const [busy, setBusy] = useState(false);
  async function signOut() {
    setBusy(true);
    const sb = getSupabaseBrowser();
    if (sb) {
      try { await sb.auth.signOut(); } catch { /* fall through to redirect */ }
    }
    window.location.replace(`/${locale}/login`);
  }
  return (
    <button
      type="button"
      onClick={signOut}
      disabled={busy}
      aria-label={label}
      title={label}
      className="btn ghost sm"
      style={{ marginInlineStart: "auto", minHeight: 44, minWidth: 44, display: "inline-flex", alignItems: "center", gap: 6, color: "var(--slate)", opacity: busy ? 0.6 : 1 }}
    >
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
      <span>{label}</span>
    </button>
  );
}
