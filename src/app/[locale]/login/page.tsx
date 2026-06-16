"use client";
import { useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabase/client";

export default function LoginPage({ params }: { params: { locale: string } }) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const sb = getSupabaseBrowser();
    if (!sb) {
      setError("Auth not configured");
      return;
    }
    const { error } = await sb.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/${params.locale}/dashboard`
      }
    });
    if (error) setError(error.message);
    else setSent(true);
  }

  return (
    <section className="mx-auto max-w-md py-12">
      <h1 className="font-serif text-2xl">Sign in</h1>
      <p className="mt-2 text-sm text-charcoal/60">
        For landlords and SAT. Enter your email and we send a secure sign-in link.
      </p>
      {sent ? (
        <div className="mt-6 rounded border border-slate/30 bg-slate/10 p-4 text-sm">
          Check your email for the sign-in link.
        </div>
      ) : (
        <form onSubmit={submit} className="mt-6 space-y-3">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            className="w-full rounded border border-charcoal/20 px-3 py-2"
          />
          <button type="submit" className="w-full rounded bg-signal px-4 py-2 text-white">
            Send sign-in link
          </button>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </form>
      )}
    </section>
  );
}
