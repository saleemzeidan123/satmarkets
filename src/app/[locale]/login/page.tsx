"use client";
import { useState } from "react";
import Link from "next/link";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { getDictionary } from "@/i18n/getDictionary";

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

 async function passwordSignIn(e: React.FormEvent) {
  e.preventDefault();
  setError(null);
  const sb = getSupabaseBrowser();
  if (!sb) { setError(t.errNotConfigured); return; }
  setBusy(true);
  const { error } = await sb.auth.signInWithPassword({ email, password });
  setBusy(false);
  if (error) { setError(error.message); return; }
  // Hard navigation so the server sees the freshly written session cookies.
  window.location.replace(`/${params.locale}/dashboard`);
 }

 async function emailLink() {
  setError(null);
  if (!email) { setError(t.errEnterEmail); return; }
  const sb = getSupabaseBrowser();
  if (!sb) { setError(t.errNotConfigured); return; }
  setBusy(true);
  const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/${params.locale}/dashboard` } });
  setBusy(false);
  if (error) setError(error.message); else setStep("sent");
 }

 return (
  <section className="mx-auto max-w-md py-14">
   <div className="card p-7" style={{ boxShadow: "var(--sh-2)" }}>
    {step === "choose" && (
     <>
      <div className="eyebrow">{t.eyebrow}</div>
      <h1 className="mt-2 font-display text-2xl text-charcoal">{t.heading}</h1>
      <p className="mt-2 text-[13.5px] leading-relaxed text-charcoal/60">{t.sub}</p>

      <form onSubmit={passwordSignIn} className="mt-6 space-y-3">
       <label htmlFor="login-email" className="sr-only">{t.emailPh}</label>
       <input id="login-email" name="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t.emailPh} autoComplete="email" className="w-full rounded-lg border border-line px-3 py-2.5 text-[14px] outline-none" />
       <label htmlFor="login-password" className="sr-only">{t.passwordPh}</label>
       <input id="login-password" name="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t.passwordPh} autoComplete="current-password" className="w-full rounded-lg border border-line px-3 py-2.5 text-[14px] outline-none" />
       <button type="submit" disabled={busy} className="btn-gold flex w-full items-center justify-center gap-2 py-3 text-[14px] font-medium" style={{ opacity: busy ? 0.6 : 1, minHeight: 44 }}>{busy ? t.signingIn : t.signIn}</button>
       {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      </form>

      <div className="my-5 flex items-center gap-3 text-[11px] uppercase tracking-wide text-charcoal/35"><span className="h-px flex-1 bg-line" />{t.or}<span className="h-px flex-1 bg-line" /></div>

      <button type="button" onClick={emailLink} disabled={busy} className="w-full rounded-lg border border-line bg-white px-4 py-2.5 text-[13.5px] font-medium text-charcoal hover:border-signal/50" style={{ minHeight: 44 }}>{t.magicLink}</button>

      <p className="mt-5 text-[11.5px] leading-relaxed text-charcoal/45">{t.nafathNote} <Link href={`/${params.locale}/signup`} className="text-azure-d hover:underline">{t.createAccount}</Link></p>
     </>
    )}

    {step === "sent" && (
     <div className="text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: "var(--green-wash,#E7F3EC)", color: "var(--green)" }}>
       <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m4 13 5 5L20 7"/></svg>
      </div>
      <h1 className="mt-4 font-display text-2xl text-charcoal">{t.checkEmail}</h1>
      <p className="mt-2 text-[13.5px] text-charcoal/60">{t.checkEmailBody} {email || t.yourInbox}.</p>
      <button type="button" onClick={() => setStep("choose")} className="mt-6 text-[12.5px] text-azure-d hover:underline" style={{ minHeight: 44 }}>{t.backToSignIn}</button>
     </div>
    )}
   </div>
  </section>
 );
}
