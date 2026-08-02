"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { getDictionary } from "@/i18n/getDictionary";
import { authMessage } from "@/lib/authErrors";

// Occupier social sign-up. Order reflects the Saudi B2B audience: Google and
// Microsoft (Office 365 work accounts) first, then LinkedIn (professional identity),
// then Apple (iOS one-tap). Each needs its provider enabled in Supabase Auth.
const SOCIAL: { provider: "google" | "azure" | "linkedin_oidc" | "apple"; label: string; icon: JSX.Element }[] = [
 { provider: "google", label: "Google", icon: (
  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.8Z"/><path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-3l-3.9-3c-1 .7-2.4 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24Z"/><path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6H1.3a12 12 0 0 0 0 10.8l4-3.1Z"/><path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1C6.2 6.9 8.9 4.8 12 4.8Z"/></svg>
 ) },
 { provider: "azure", label: "Microsoft", icon: (
  <svg width="15" height="15" viewBox="0 0 23 23" aria-hidden="true"><path fill="#F25022" d="M0 0h11v11H0z"/><path fill="#7FBA00" d="M12 0h11v11H12z"/><path fill="#00A4EF" d="M0 12h11v11H0z"/><path fill="#FFB900" d="M12 12h11v11H12z"/></svg>
 ) },
 { provider: "linkedin_oidc", label: "LinkedIn", icon: (
  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path fill="#0A66C2" d="M20.5 2h-17A1.5 1.5 0 0 0 2 3.5v17A1.5 1.5 0 0 0 3.5 22h17a1.5 1.5 0 0 0 1.5-1.5v-17A1.5 1.5 0 0 0 20.5 2ZM8 19H5v-9h3v9Zm-1.5-10.3a1.75 1.75 0 1 1 0-3.5 1.75 1.75 0 0 1 0 3.5ZM19 19h-3v-4.7c0-1.1 0-2.5-1.5-2.5s-1.8 1.2-1.8 2.4V19h-3v-9h2.9v1.2h.04a3.2 3.2 0 0 1 2.9-1.6c3 0 3.6 2 3.6 4.6V19Z"/></svg>
 ) },
 { provider: "apple", label: "Apple", icon: (
  <svg width="15" height="16" viewBox="0 0 24 24" fill="#000" aria-hidden="true"><path d="M17.05 12.6c0-2.5 2-3.7 2.1-3.8-1.1-1.7-2.9-1.9-3.5-1.9-1.5-.2-2.9.9-3.6.9-.8 0-1.9-.9-3.1-.8-1.6 0-3 .9-3.8 2.4-1.6 2.8-.4 7 1.2 9.3.8 1.1 1.7 2.4 2.9 2.3 1.2-.05 1.6-.75 3-.75s1.8.75 3 .73c1.2-.02 2-1.1 2.8-2.2.9-1.3 1.2-2.5 1.3-2.6-.03-.01-2.5-1-2.5-3.7ZM14.6 5.1c.65-.8 1.1-1.9 1-3-.95.04-2.1.6-2.8 1.4-.6.7-1.1 1.8-1 2.9 1.05.08 2.1-.5 2.8-1.3Z"/></svg>
 ) },
];

// SM-P1-009: the login screen is fully localized. Every string comes from the
// dictionary so /ar/login is Arabic, not an Arabic shell around English copy.
export default function LoginPage({ params }: { params: { locale: string } }) {
 const ar = params.locale === "ar";
 const t = getDictionary(ar ? "ar" : "en").login;
 const [step, setStep] = useState<"choose" | "sent">("choose");
 const [email, setEmail] = useState("");
 const [password, setPassword] = useState("");
 const [busy, setBusy] = useState(false);
 const [error, setError] = useState<string | null>(null);

 // ELITE-4 J1-6: setStep("sent") unmounts the magic-link button that had focus, so
 // focus fell to document.body and nothing was announced. Move focus to the panel.
 const sentRef = useRef<HTMLDivElement | null>(null);
 useEffect(() => { if (step === "sent") sentRef.current?.focus(); }, [step]);

 // Slice D of PKG-E1-READINESS, WS25. Every refusal below is resolved through
 // `authMessage`, which names a refusal only when the refusal is true of the
 // request rather than of the account behind the address. Anything about the
 // account itself, and anything this platform has never heard of, arrives as
 // the one generic sentence passed in here. See src/lib/authErrors.ts for why
 // the direction of that default is the whole point.
 async function passwordSignIn(e: React.FormEvent) {
  e.preventDefault();
  setError(null);
  const sb = getSupabaseBrowser();
  if (!sb) { setError(t.errNotConfigured); return; }
  setBusy(true);
  const { error } = await sb.auth.signInWithPassword({ email, password });
  setBusy(false);
  // The generic sentence points at the sign-in link on purpose. It is the one
  // route back in that works for a confirmed account and an unconfirmed one
  // alike, so the reader is never told which of the two they are.
  if (error) { setError(authMessage(error, ar, t.errSignIn)); return; }
  // Hard navigation so the server sees the freshly written session cookies. /go
  // routes owners to the dashboard and occupiers to their own home.
  window.location.replace(`/${params.locale}/go`);
 }

 async function emailLink() {
  setError(null);
  if (!email) { setError(t.errEnterEmail); return; }
  const sb = getSupabaseBrowser();
  if (!sb) { setError(t.errNotConfigured); return; }
  setBusy(true);
  // `shouldCreateUser` is stated rather than left to the library default, and
  // it is the reason this path is safe. With it true an address that holds no
  // account is sent a link exactly as one that does, so the two are
  // indistinguishable from outside. Setting it false would make the unknown
  // address refuse while the known one succeeds, which is a membership oracle
  // that no wording on the refusal could close.
  const { error } = await sb.auth.signInWithOtp({ email, options: { shouldCreateUser: true, emailRedirectTo: `${window.location.origin}/auth/callback?next=/${params.locale}/go` } });
  setBusy(false);
  if (error) setError(authMessage(error, ar, t.errLinkNotSent)); else setStep("sent");
 }

 // Social sign-in / sign-up. One tap, no password, account created on first use.
 // The provider must be enabled in Supabase Auth (its OAuth client id/secret set)
 // for the button to work; until then it returns a configuration error, which we
 // surface plainly rather than failing silently. Occupiers key off the auth user
 // id, so an OAuth user needs no separate provisioning.
 async function oauth(provider: "google" | "azure" | "linkedin_oidc" | "apple") {
  setError(null);
  const sb = getSupabaseBrowser();
  if (!sb) { setError(t.errNotConfigured); return; }
  setBusy(true);
  const { error } = await sb.auth.signInWithOAuth({
   provider,
   options: { redirectTo: `${window.location.origin}/auth/callback?next=/${params.locale}/go` },
  });
  // On success the browser is redirected to the provider, so we only land here on error.
  // A provider that is switched off is nameable, because it is switched off for
  // everybody and says nothing about whoever is standing at the form.
  if (error) { setError(authMessage(error, ar, t.errProvider)); setBusy(false); }
 }

 return (
  <section className="mx-auto max-w-md py-14">
   <div className="card p-7" style={{ boxShadow: "var(--sh-2)" }}>
    {step === "choose" && (
     <>
      <div className="eyebrow">{t.eyebrow}</div>
      <h1 className="mt-2 font-display text-2xl text-charcoal">{t.heading}</h1>
      <p className="mt-2 text-[0.84375rem] leading-relaxed text-charcoal/70">{t.sub}</p>

      <form onSubmit={passwordSignIn} className="mt-6 space-y-3">
       <label htmlFor="login-email" className="sr-only">{t.emailPh}</label>
       <input id="login-email" name="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t.emailPh} autoComplete="email" className="w-full rounded-lg border border-line px-3 py-2.5 text-[0.875rem] outline-none" />
       <label htmlFor="login-password" className="sr-only">{t.passwordPh}</label>
       <input id="login-password" name="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t.passwordPh} autoComplete="current-password" className="w-full rounded-lg border border-line px-3 py-2.5 text-[0.875rem] outline-none" />
       <button type="submit" disabled={busy} className="btn-gold flex w-full items-center justify-center gap-2 py-3 text-[0.875rem] font-medium" style={{ opacity: busy ? 0.6 : 1, minHeight: 44 }}>{busy ? t.signingIn : t.signIn}</button>
       {error && <p role="alert" className="text-sm text-red">{error}</p>}
      </form>

      <div className="my-5 flex items-center gap-3 text-[0.6875rem] uppercase tracking-wide text-charcoal/65"><span className="h-px flex-1 bg-line" />{t.or}<span className="h-px flex-1 bg-line" /></div>

      <button type="button" onClick={emailLink} disabled={busy} className="w-full rounded-lg border border-line bg-white px-4 py-2.5 text-[0.84375rem] font-medium text-charcoal hover:border-signal/50" style={{ minHeight: 44 }}>{t.magicLink}</button>

      {/* Social sign-up (occupiers): one tap, free, account on first use. Enable each
          provider in Supabase Auth for its button to work. */}
      <div className="mt-4 grid grid-cols-2 gap-2.5">
       {SOCIAL.map((s) => (
        <button key={s.provider} type="button" onClick={() => oauth(s.provider)} disabled={busy} aria-label={`${ar ? "المتابعة عبر" : "Continue with"} ${s.label}`} className="flex items-center justify-center gap-2 rounded-lg border border-line bg-white px-3 py-2.5 text-[0.8125rem] font-medium text-charcoal hover:border-signal/50" style={{ minHeight: 44, opacity: busy ? 0.6 : 1 }}>
         <span className="flex-none">{s.icon}</span>
         <span>{s.label}</span>
        </button>
       ))}
      </div>
      <p className="mt-3 text-[0.6875rem] leading-relaxed text-charcoal/65">{ar ? "التسجيل مجاني للباحثين عن مساحات: احفظ المفضّلة وتابع مراسلاتك مع المُعلنين." : "Free for occupiers: save favourites and keep your messages with listers."}</p>

      <p className="mt-5 text-[0.71875rem] leading-relaxed text-charcoal/65">{t.nafathNote} <Link href={`/${params.locale}/signup`} className="text-azure-d hover:underline">{t.createAccount}</Link></p>
     </>
    )}

    {step === "sent" && (
     <div ref={sentRef} tabIndex={-1} role="status" className="text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: "var(--azure-wash)", color: "var(--harbor-d)" }}>
       <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m4 13 5 5L20 7"/></svg>
      </div>
      <h1 className="mt-4 font-display text-2xl text-charcoal">{t.checkEmail}</h1>
      <p className="mt-2 text-[0.84375rem] text-charcoal/70">{t.checkEmailBody} {email || t.yourInbox}.</p>
      <button type="button" onClick={() => setStep("choose")} className="mt-6 text-[0.78125rem] text-azure-d hover:underline" style={{ minHeight: 44 }}>{t.backToSignIn}</button>
     </div>
    )}
   </div>
  </section>
 );
}
