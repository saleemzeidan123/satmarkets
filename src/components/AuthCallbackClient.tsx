"use client";
import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { mergeSavedOnLogin, mergeSavedSearchesOnLogin } from "@/lib/saved";
import { getDictionary } from "@/i18n/getDictionary";
import { authMessage } from "@/lib/authErrors";
import { safeNext, localeOfNext } from "@/lib/authRedirect";

/**
 * PKG-E1-READINESS slice D, WS25, then SM-P1-009's second correction pass.
 * Where a sign-in link lands.
 *
 * This started as the bilingual landing for every emailed link. The second
 * correction split it into a server route (src/app/auth/callback/page.tsx) and
 * this client half, for one reason with live evidence behind it: a single-use
 * link that is spent by page load is spent by whoever loads the page first,
 * and the reader is rarely first. Outlook Safe Links visited one recovery
 * link before its owner could; Chrome's own preloading spent three more in a
 * row while the person who requested them watched an "invalid or expired"
 * screen, each time with the auth server's log showing a perfectly successful
 * exchange nobody ever saw. The fix is not a retry, it is a rule: a token the
 * email carries directly (`token_hash`) is consumed only inside a click
 * handler, never inside an effect. Scanners and preloaders do not click.
 *
 * The PKCE `?code=` shape keeps its on-load exchange. By the time a code
 * exists, the emailed token was already spent at the provider's /verify hop,
 * so a gate here would guard a door that is already open, and magic links
 * have carried that shape through this page since WS25 without complaint.
 *
 * The route has no locale segment, because it is the address registered with
 * the authentication provider and there is one of it. The locale is read from
 * `next`, which the login page builds as `/{locale}/go`, and it is derived
 * from the server-passed props at render rather than discovered in an effect,
 * so an Arabic reader is never shown an English frame that corrects itself.
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

/**
 * Which of Supabase's own link shapes actually arrived. The code shape is the
 * PKCE exchange this project's magic links have been directly observed to use;
 * token_hash is the shape the corrected email templates send so that nothing
 * is spent server-side before this page renders; the implicit pair is the
 * legacy hash-fragment response kept so an older template cannot strand a
 * reader. Only the `none` arm reaches the reader without a session having been
 * established by one of them.
 */
type Artifact =
  | { kind: "code"; code: string; type: OtpType | null }
  | { kind: "token_hash"; tokenHash: string; type: OtpType }
  | { kind: "implicit"; accessToken: string; refreshToken: string; type: OtpType | null }
  | { kind: "none"; type: OtpType | null };

function linkArtifact(u: URL): Artifact {
  const hash = new URLSearchParams(u.hash.startsWith("#") ? u.hash.slice(1) : u.hash);
  const code = u.searchParams.get("code");
  const tokenHash = u.searchParams.get("token_hash");
  // `type` can arrive in the query string (the code and token_hash shapes) or
  // the hash fragment (the implicit shape, where GoTrue encodes the whole
  // response after `#`). Both are read; neither is trusted over the other.
  const type = otpType(u.searchParams.get("type")) ?? otpType(hash.get("type"));
  const accessToken = hash.get("access_token");
  const refreshToken = hash.get("refresh_token");
  if (code) return { kind: "code", code, type };
  if (tokenHash && type) return { kind: "token_hash", tokenHash, type };
  if (accessToken && refreshToken) return { kind: "implicit", accessToken, refreshToken, type };
  return { kind: "none", type };
}

/**
 * Turn a verified artifact into a session and send the reader on. Module
 * level and fed everything through arguments, so the mount effect below can
 * call it without closing over a single reactive value, which is what lets
 * that effect keep an honest empty dependency list.
 */
async function establishSession(
  artifact: Artifact,
  ctx: { next: string; locale: string; ar: boolean; fallback: string; notConfigured: string; fail: (m: string) => void },
) {
  const { next, locale, ar, fallback, notConfigured, fail } = ctx;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) { fail(notConfigured); return; }
  const sb = createBrowserClient(url, key, { auth: { detectSessionInUrl: false, flowType: "pkce" } });
  try {
    if (artifact.kind === "code") {
      const { error } = await sb.auth.exchangeCodeForSession(artifact.code);
      if (error) throw error;
    } else if (artifact.kind === "token_hash") {
      const { error } = await sb.auth.verifyOtp({ type: artifact.type, token_hash: artifact.tokenHash });
      if (error) throw error;
    } else if (artifact.kind === "implicit") {
      const { error } = await sb.auth.setSession({ access_token: artifact.accessToken, refresh_token: artifact.refreshToken });
      if (error) throw error;
    } else {
      throw new Error("no session artifact in the link");
    }
    // Fold anything saved on this device (while logged out) into the new
    // session's account, so signing in never loses a saved listing or search.
    await mergeSavedOnLogin();
    await mergeSavedSearchesOnLogin();
    // An invite or a recovery link authenticates the reader from the token
    // alone; neither one has ever asked them for a password. Route through the
    // login page's set-password step, which re-verifies the session on the
    // server before showing anything. Reached only after one of the branches
    // above has actually exchanged or verified a real artifact and thrown on
    // failure: `type` alone, before that, proves nothing.
    if (artifact.type === "invite" || artifact.type === "recovery") {
      window.location.replace(`/${locale}/login?step=set-password&next=${encodeURIComponent(next)}`);
      return;
    }
    // hard navigation so the server sees the freshly written cookies
    window.location.replace(next);
  } catch (e) {
    // The expired link and the spent link are the same event to whoever is
    // holding it; the service being down is not, and that is the whole of what
    // this resolver is allowed to tell them apart by.
    fail(authMessage(e, ar, fallback));
  }
}

export default function AuthCallbackClient(props: {
  code: string | null;
  tokenHash: string | null;
  typeParam: string | null;
  nextParam: string | null;
}) {
  const next = safeNext(props.nextParam);
  const locale = localeOfNext(next);
  const ar = locale === "ar";
  const t = getDictionary(locale).login;
  const type = otpType(props.typeParam);
  // The confirm gate. True only for the template-carried token_hash shape,
  // which is the one shape whose single use this page itself controls.
  const confirmNeeded = !props.code && !!props.tokenHash && !!type;
  const [msg, setMsg] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // Everything here is re-derived from the address bar rather than closed
    // over from the component, so the empty dependency list below states a
    // fact instead of hiding one.
    const u = new URL(window.location.href);
    const gated = !u.searchParams.get("code") && !!u.searchParams.get("token_hash") && !!otpType(u.searchParams.get("type"));
    if (gated) return; // a gated link is spent by the reader's click, never by this mount
    const nx = safeNext(u.searchParams.get("next"));
    const lc = localeOfNext(nx);
    const dict = getDictionary(lc).login;
    void establishSession(linkArtifact(u), {
      next: nx,
      locale: lc,
      ar: lc === "ar",
      fallback: dict.errLinkInvalid,
      notConfigured: dict.errNotConfigured,
      fail: (m) => { setMsg(m); setFailed(true); setBusy(false); },
    });
  }, []);

  async function confirm() {
    if (!props.tokenHash || !type) return;
    setBusy(true);
    await establishSession(
      { kind: "token_hash", tokenHash: props.tokenHash, type },
      {
        next,
        locale,
        ar,
        fallback: t.errLinkInvalid,
        notConfigured: t.errNotConfigured,
        fail: (m) => { setMsg(m); setFailed(true); setBusy(false); },
      },
    );
  }

  return (
    <section className="mx-auto flex max-w-md flex-col items-center py-20 text-center" dir={locale === "ar" ? "rtl" : "ltr"}>
      {confirmNeeded && !failed ? (
        <>
          <h1 className="font-serif text-2xl text-charcoal">{t.confirmHeading}</h1>
          <p className="mt-3 text-charcoal/65">{t.confirmBody}</p>
          <button type="button" disabled={busy} onClick={confirm} className="btn-gold mt-6 px-6 py-2.5 text-sm">
            {busy ? t.signingIn : t.confirmCta}
          </button>
        </>
      ) : (
        <>
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-signal/30 border-t-gold" />
          <p className="mt-5 text-charcoal/65">{failed ? msg : t.signingIn}</p>
          {failed && <a href={`/${locale}/login`} className="btn-gold mt-5 px-5 py-2.5 text-sm">{t.backToSignIn}</a>}
        </>
      )}
    </section>
  );
}
