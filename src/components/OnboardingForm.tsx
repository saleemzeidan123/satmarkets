"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabase/client";

export default function OnboardingForm() {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const sb = getSupabaseBrowser();
    if (!sb) return;
    const { error } = await sb.rpc("create_owner_account", { p_legal_name: name });
    if (error) {
      setError(error.message);
      setBusy(false);
    } else {
      router.refresh();
    }
  }

  return (
    <div className="rounded-lg border border-charcoal/10 bg-white p-6">
      <h2 className="font-serif text-lg">Become a lister</h2>
      <p className="mt-1 text-sm text-charcoal/60">
        Register your company to list space. You will be verified as the legitimate owner before any listing publishes.
      </p>
      <form onSubmit={submit} className="mt-4 flex gap-2">
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Company legal name"
          className="flex-1 rounded border border-charcoal/20 px-3 py-2"
        />
        <button disabled={busy} className="rounded bg-gold px-4 py-2 text-white">
          {busy ? "..." : "Register"}
        </button>
      </form>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
