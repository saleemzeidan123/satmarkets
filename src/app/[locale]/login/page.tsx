"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabase/client";

export default function LoginPage({ params }: { params: { locale: string } }) {
  const router = useRouter();
  const [step, setStep] = useState<"choose" | "nafath" | "sent">("choose");
  const [num] = useState(() => 10 + Math.floor(Math.random() * 89));
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (step !== "nafath") return;
    const t = setTimeout(() => router.push(`/${params.locale}/dashboard`), 3200);
    return () => clearTimeout(t);
  }, [step, params.locale, router]);

  async function emailLink(e: React.FormEvent) {
    e.preventDefault(); setError(null);
    const sb = getSupabaseBrowser();
    if (!sb) { setStep("sent"); return; } // demo: no auth configured
    const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/${params.locale}/dashboard` } });
    if (error) setError(error.message); else setStep("sent");
  }

  return (
    <section className="mx-auto max-w-md py-14">
      <div className="card p-7" style={{ boxShadow: "var(--sh-2)" }}>
        {step === "choose" && (
          <>
            <div className="eyebrow">Sign in to SAT Markets</div>
            <h1 className="mt-2 font-display text-2xl text-charcoal">Verify it&apos;s really you</h1>
            <p className="mt-2 text-[13.5px] leading-relaxed text-charcoal/60">SAT is a verified exchange — owners and brokers sign in with Nafath, Saudi Arabia&apos;s national digital identity, so every party is a real, verified person.</p>

            <button onClick={() => setStep("nafath")} className="btn-gold mt-6 flex w-full items-center justify-center gap-2 py-3 text-[14px] font-medium">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2 4 6v6c0 5 3.5 8 8 10 4.5-2 8-5 8-10V6z"/><path d="m9 12 2 2 4-4"/></svg>
              Continue with Nafath
            </button>

            <div className="my-5 flex items-center gap-3 text-[11px] uppercase tracking-wide text-charcoal/35"><span className="h-px flex-1 bg-line" />or<span className="h-px flex-1 bg-line" /></div>

            <form onSubmit={emailLink} className="space-y-3">
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" className="w-full rounded-lg border border-line px-3 py-2.5 text-[14px] outline-none" />
              <button type="submit" className="w-full rounded-lg border border-line bg-white px-4 py-2.5 text-[13.5px] font-medium text-charcoal hover:border-signal/50">Email me a secure link</button>
              {error && <p className="text-sm text-red-600">{error}</p>}
            </form>
            <p className="mt-5 text-[11.5px] leading-relaxed text-charcoal/45">Occupiers can browse and enquire without an account. Nafath is required to list space or act as a broker.</p>
          </>
        )}

        {step === "nafath" && (
          <div className="text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: "var(--azure-wash)", color: "var(--azure-d)" }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2 4 6v6c0 5 3.5 8 8 10 4.5-2 8-5 8-10V6z"/><path d="m9 12 2 2 4-4"/></svg>
            </div>
            <div className="eyebrow mt-4">Nafath</div>
            <h1 className="mt-1 font-display text-2xl text-charcoal">Open your Nafath app</h1>
            <p className="mt-2 text-[13.5px] text-charcoal/60">Approve the sign-in request showing this number:</p>
            <div className="mx-auto my-5 flex h-20 w-20 items-center justify-center rounded-2xl border-2 border-azure-l fig text-3xl text-azure-d" style={{ background: "var(--azure-wash)" }}>{num}</div>
            <div className="flex items-center justify-center gap-2 text-[13px] text-charcoal/55">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-signal/30 border-t-signal" /> Waiting for approval…
            </div>
            <button onClick={() => setStep("choose")} className="mt-6 text-[12.5px] text-charcoal/45 hover:text-charcoal">Cancel</button>
          </div>
        )}

        {step === "sent" && (
          <div className="text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: "var(--green-wash,#E7F3EC)", color: "var(--green)" }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m4 13 5 5L20 7"/></svg>
            </div>
            <h1 className="mt-4 font-display text-2xl text-charcoal">Check your email</h1>
            <p className="mt-2 text-[13.5px] text-charcoal/60">We sent a secure sign-in link to {email || "your inbox"}.</p>
            <button onClick={() => setStep("choose")} className="mt-6 text-[12.5px] text-azure-d hover:underline">Back to sign in</button>
          </div>
        )}
      </div>
    </section>
  );
}
