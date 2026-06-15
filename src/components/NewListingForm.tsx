"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabase/client";

export default function NewListingForm({ accountId, locale }: { accountId: string; locale: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [f, setF] = useState({
    title_en: "",
    asset_type: "office",
    deal_type: "lease",
    area_sqm: "",
    asking_rent_sqm: ""
  });

  function set(k: string, v: string) {
    setF((p) => ({ ...p, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const sb = getSupabaseBrowser();
    if (!sb) return;
    const { error } = await sb.from("listings").insert({
      account_id: accountId,
      title_en: f.title_en,
      asset_type: f.asset_type,
      deal_type: f.deal_type,
      area_sqm: Number(f.area_sqm),
      asking_rent_sqm: f.deal_type === "lease" ? Number(f.asking_rent_sqm) : null,
      sale_price: f.deal_type === "sale" ? Number(f.asking_rent_sqm) : null,
      status: "draft"
    });
    if (error) {
      setError(error.message);
      setBusy(false);
    } else {
      router.push(`/${locale}/dashboard`);
    }
  }

  const assets = ["office","retail","medical","showroom","warehouse","serviced","education","land"];
  return (
    <form onSubmit={submit} className="max-w-xl space-y-3">
      <input required placeholder="Title" value={f.title_en} onChange={(e)=>set("title_en",e.target.value)} className="w-full rounded border border-charcoal/20 px-3 py-2" />
      <div className="flex gap-3">
        <select value={f.asset_type} onChange={(e)=>set("asset_type",e.target.value)} className="flex-1 rounded border border-charcoal/20 px-3 py-2">
          {assets.map(a=> <option key={a} value={a}>{a}</option>)}
        </select>
        <select value={f.deal_type} onChange={(e)=>set("deal_type",e.target.value)} className="flex-1 rounded border border-charcoal/20 px-3 py-2">
          <option value="lease">lease</option>
          <option value="sale">sale</option>
        </select>
      </div>
      <input required type="number" placeholder="Area (sqm)" value={f.area_sqm} onChange={(e)=>set("area_sqm",e.target.value)} className="w-full rounded border border-charcoal/20 px-3 py-2" />
      <input required type="number" placeholder={f.deal_type==="lease" ? "Asking rent (SAR/sqm/yr)" : "Sale price (SAR)"} value={f.asking_rent_sqm} onChange={(e)=>set("asking_rent_sqm",e.target.value)} className="w-full rounded border border-charcoal/20 px-3 py-2" />
      <button disabled={busy} className="rounded bg-gold px-4 py-2 text-white">{busy ? "Saving..." : "Save as draft"}</button>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <p className="text-xs text-charcoal/50">Saved as draft. SAT reviews and verifies before it publishes.</p>
    </form>
  );
}
