"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabase/client";

interface District { id: string; name_en: string | null; city: string | null; }

export default function NewListingForm({ accountId, locale, districts }: { accountId: string; locale: string; districts: District[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [f, setF] = useState({ title_en: "", asset_type: "office", deal_type: "lease", district_id: districts[0]?.id || "", area_sqm: "", price: "", description_en: "" });
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));
  const assets = ["office","retail","medical","showroom","warehouse","serviced","education","land"];

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError(null);
    const sb = getSupabaseBrowser(); if (!sb) return;
    const { error } = await sb.from("listings").insert({
      account_id: accountId, title_en: f.title_en, asset_type: f.asset_type, deal_type: f.deal_type,
      district_id: f.district_id || null, area_sqm: Number(f.area_sqm),
      asking_rent_sqm: f.deal_type === "lease" ? Number(f.price) : null,
      sale_price: f.deal_type === "sale" ? Number(f.price) : null,
      description_en: f.description_en || null, status: "draft"
    });
    if (error) { setError(error.message); setBusy(false); }
    else router.push(`/${locale}/dashboard`);
  }

  return (
    <form onSubmit={submit} className="max-w-xl space-y-3">
      <input required placeholder="Title" value={f.title_en} onChange={(e)=>set("title_en",e.target.value)} className="w-full rounded border border-charcoal/20 px-3 py-2" />
      <div className="flex gap-3">
        <select value={f.asset_type} onChange={(e)=>set("asset_type",e.target.value)} className="flex-1 rounded border border-charcoal/20 px-3 py-2">{assets.map(a=><option key={a} value={a}>{a}</option>)}</select>
        <select value={f.deal_type} onChange={(e)=>set("deal_type",e.target.value)} className="flex-1 rounded border border-charcoal/20 px-3 py-2"><option value="lease">lease</option><option value="sale">sale</option></select>
      </div>
      <select value={f.district_id} onChange={(e)=>set("district_id",e.target.value)} className="w-full rounded border border-charcoal/20 px-3 py-2">
        {districts.map((d)=> <option key={d.id} value={d.id}>{d.name_en}, {d.city}</option>)}
      </select>
      <input required type="number" placeholder="Area (sqm)" value={f.area_sqm} onChange={(e)=>set("area_sqm",e.target.value)} className="w-full rounded border border-charcoal/20 px-3 py-2" />
      <input required type="number" placeholder={f.deal_type==="lease" ? "Asking rent (SAR/sqm/yr)" : "Sale price (SAR)"} value={f.price} onChange={(e)=>set("price",e.target.value)} className="w-full rounded border border-charcoal/20 px-3 py-2" />
      <textarea placeholder="Description" value={f.description_en} onChange={(e)=>set("description_en",e.target.value)} className="w-full rounded border border-charcoal/20 px-3 py-2" rows={3} />
      <button disabled={busy} className="rounded bg-gold px-4 py-2 text-white">{busy ? "Saving..." : "Save as draft"}</button>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <p className="text-xs text-charcoal/50">Saved as draft. SAT reviews and verifies ownership before it publishes.</p>
    </form>
  );
}
