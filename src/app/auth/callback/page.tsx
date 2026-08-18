"use client";
import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { mergeSavedOnLogin, mergeSavedSearchesOnLogin } from "@/lib/saved";
import { defaultLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/getDictionary";
import { authMessage } from "@/lib/authErrors";
import { safeNext, localeOfNext } from "@/lib/authRedirect";

/**
 * PKG-E1-READINESS slice D, WS25. Where a sign-in link lands.
 *
 * This page was the last monolingual surface on the authenticated path. An
 * Arabic reader asked for a link on the Arabic build, opened it in their mail
 * client, and met four English sentences and a button back to the English login
 * page. The brief for this slice asks for recovery to stay understandable in
 * both languages, and recovery on this platform is the link, so this is the
 * page that had to change.
 *
 * The route has no locale segment, because it is the address registered with
 * the authentication provider and there is one of it. The locale is therefore
 * read from `next`, which the login page already builds as `/{locale}/go`. A
 * link that carries no usable `next` falls to English, which is the same rule
 * the rest of the platform uses when it cannot tell.
 *
 * No text renders until that read has happened. The spinner alone is honest for
 * the fraction of a second it takes, and it avoids showing an Arabic reader an
 * English sentence and then correcting it.
 */

/**
 * The link types this platform issues. `type` is supplied by whoever opened the
 * page, so it is checked against the list rather than passed through, and an
 * unrecognised one is treated as a link we did not send.
 */
const OTP_TYPES = ["signup", "invite", "magiclink", "recovery", "email_change", "email"] as const;
type OtpType = (typeof OTP_TYPES)[number];
function otpType(raw: string | null): OtpType | null {
  return (OTP_TYPES as readonly string[]).includes(raw ?? "") ? (raw as OtpType) : null;
}

export default function AuthCallback() {
  const [locale, setLocale] = useState<Locale>(defaultLocale);
  const [msg, setMsg] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    (async () => {
      const u = new URL(window.location.href);
      const next = safeNext(u.searchParams.get("next"));
      const loc = localeOfNext(next);
      const ar = loc === "ar";
      const t = getDictionary(loc).login;
      setLocale(loc);
      setMsg(t.signingIn);
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (!url || !key) { setMsg(t.errNotConfigured); setFailed(true); return; }
      const sb = createBrowserClient(url, key, { auth: { detectSessionInUrl: false, flowType: "pkce" } });
      const code = u.searchParams.get("code");
      const tokenHash = u.searchParams.get("token_hash");
      const type = otpType(u.searchParams.get("type"));
      try {
        if (code) {
          const { error } = await sb.auth.exchangeCodeForSession(code);
          if (error) throw error;
        } else if (tokenHash && type) {
          const { error } = await sb.auth.verifyOtp({ type, token_hash: tokenHash });
          if (error) throw error;
        } else {
          // implicit hash fallback
          const { data } = await sb.auth.getSession();
          if (!data.session) throw new Error("no session");
        }
        // Fold anything saved on this device (while logged out) into the new session's
        // account, so signing in never loses a saved listing or search. Best effort.
        await mergeSavedOnLogin();
        await mergeSavedSearchesOnLogin();
        // An invite or a recovery link authenticates the reader from the token
        // alone; neither one has ever asked them for a password. Route through
        // the login page's set-password step instead of straight to `next`, and
        // carry `next` along so that step can finish the trip once a password is
        // actually set. Every other link type (magic link, OAuth) already led
        // somewhere the reader chose to sign in with a password they already
        // have, so this branch changes nothing for them.
        if (type === "invite" || type === "recovery") {
          window.location.replace(`/${loc}/login?step=set-password&next=${encodeURIComponent(next)}`);
          return;
        }
        // hard navigation so the server sees the freshly written cookies
        window.location.replace(next);
      } catch (e) {
        // The expired link and the spent link are the same event to whoever is
        // holding it; the service being down is not, and that is the whole of
        // what this resolver is allowed to tell them apart by. Nothing here can
        // reach the account behind an address, because nothing here was given
        // an address.
        setMsg(authMessage(e, ar, t.errLinkInvalid));
        setFailed(true);
      }
    })();
  }, []);
  const t = getDictionary(locale).login;
  return (
    <section className="mx-auto flex max-w-md flex-col items-center py-20 text-center" dir={locale === "ar" ? "rtl" : "ltr"}>
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-signal/30 border-t-gold" />
      {msg && <p className="mt-5 text-charcoal/65">{msg}</p>}
      {failed && <a href={`/${locale}/login`} className="btn-gold mt-5 px-5 py-2.5 text-sm">{t.backToSignIn}</a>}
    </section>
  );
}
