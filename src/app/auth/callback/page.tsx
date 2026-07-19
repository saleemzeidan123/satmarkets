"use client";
import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { mergeSavedOnLogin } from "@/lib/saved";

export default function AuthCallback() {
  const [msg, setMsg] = useState("Signing you in…");
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    (async () => {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (!url || !key) { setMsg("Auth not configured."); setFailed(true); return; }
      const sb = createBrowserClient(url, key, { auth: { detectSessionInUrl: false, flowType: "pkce" } });
      const u = new URL(window.location.href);
      const code = u.searchParams.get("code");
      const tokenHash = u.searchParams.get("token_hash");
      const type = u.searchParams.get("type");
      const next = u.searchParams.get("next") || "/en/dashboard";
      try {
        if (code) {
          const { error } = await sb.auth.exchangeCodeForSession(code);
          if (error) throw error;
        } else if (tokenHash && type) {
          const { error } = await sb.auth.verifyOtp({ type: type as any, token_hash: tokenHash });
          if (error) throw error;
        } else {
          // implicit hash fallback
          const { data } = await sb.auth.getSession();
          if (!data.session) throw new Error("no session");
        }
        // Fold any favourites saved on this device (while logged out) into the new
        // session's account, so signing in never loses a saved listing. Best effort.
        await mergeSavedOnLogin();
        // hard navigation so the server sees the freshly written cookies
        window.location.replace(next);
      } catch {
        setMsg("That sign-in link is invalid or has expired. Please request a new one.");
        setFailed(true);
      }
    })();
  }, []);
  return (
    <section className="mx-auto flex max-w-md flex-col items-center py-20 text-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-signal/30 border-t-gold" />
      <p className="mt-5 text-charcoal/65">{msg}</p>
      {failed && <a href="/en/login" className="btn-gold mt-5 px-5 py-2.5 text-sm">Back to sign in</a>}
    </section>
  );
}
