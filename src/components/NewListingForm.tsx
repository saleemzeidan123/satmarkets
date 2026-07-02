"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { assetLabel } from "@/lib/labels";
import { getSupabaseBrowser } from "@/lib/supabase/client";

interface District { id: string; name_en: string | null; city: string | null; }

export default function NewListingForm({ accountId, locale, districts }: { accountId: string; locale: string; districts: District[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [f, setF] = useState({
    title_en: "", asset_type: "office", deal_type: "lease", district_id: districts[0]?.id || "",
    area_sqm: "", price: "", description_en: "",
    lister_type: "owner_direct", video_url: "", floorplan_url: "", authorization_doc_url: "",
  });
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));
  const assets = ["office","retail","medical","showroom","warehouse","serviced","education","land","gas_station","entertainment","wedding_hall","worker_housing","self_storage","hospitality","mixed_use"];
  const isBroker = f.lister_type === "broker_authorized";

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError(null);
    if (isBroker && !f.authorization_doc_url.trim()) { setError("Brokers must provide an authorization-to-market document URL."); return; }
    setBusy(true);
    const sb = getSupabaseBrowser(); if (!sb) return;
    const { data, error } = await sb.from("listings").insert({
      account_id: accountId, title_en: f.title_en, asset_type: f.asset_type, deal_type: f.deal_type,
      district_id: f.district_id || null, area_sqm: Number(f.area_sqm),
      asking_rent_sqm: f.deal_type === "lease" ? Number(f.price) : null,
      sale_price: f.deal_type === "sale" ? Number(f.price) : null,
      description_en: f.description_en || null,
      lister_type: f.lister_type,
      video_url: f.video_url || null, floorplan_url: f.floorplan_url || null,
      authorization_doc_url: isBroker ? f.authorization_doc_url : null,
      status: "draft"
    }).select("id").single();
    if (error) { setError(error.message); setBusy(false); }
    else { try { if (data?.id) fetch(`/api/listings/${data.id}/translate`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ tier: "fast" }) }); } catch {} router.push(`/${locale}/dashboard`); }
  }

  const inp = "w-full rounded border border-charcoal/20 px-3 py-2";
  return (
    <form onSubmit={submit} className="max-w-xl space-y-3">
      <input required placeholder="Title" value={f.title_en} onChange={(e)=>set("title_en",e.target.value)} className={inp} />
      <div className="flex gap-3">
        <select value={f.asset_type} onChange={(e)=>set("asset_type",e.target.value)} className={inp+" flex-1"}>{assets.map(a=><option key={a} value={a}>{assetLabel(a, locale as "en" | "ar")}</option>)}</select>
        <select value={f.deal_type} onChange={(e)=>set("deal_type",e.target.value)} className={inp+" flex-1"}><option value="lease">lease</option><option value="sale">sale</option></select>
      </div>
      <select value={f.district_id} onChange={(e)=>set("district_id",e.target.value)} className={inp}>
        {districts.map((d)=> <option key={d.id} value={d.id}>{d.name_en}, {d.city}</option>)}
      </select>
      <div className="flex gap-3">
        <input required type="number" placeholder="Area (sqm)" value={f.area_sqm} onChange={(e)=>set("area_sqm",e.target.value)} className={inp+" flex-1"} />
        <input required type="number" placeholder={f.deal_type==="lease" ? "Asking (SAR/sqm/yr)" : "Sale price (SAR)"} value={f.price} onChange={(e)=>set("price",e.target.value)} className={inp+" flex-1"} />
      </div>
      <textarea placeholder="Description" value={f.description_en} onChange={(e)=>set("description_en",e.target.value)} className={inp} rows={3} />

      <div className="rounded-lg border border-line bg-ivory-2/40 p-3 space-y-3">
        <div className="text-[12px] font-medium text-charcoal/70">Representation &amp; media</div>
        <select value={f.lister_type} onChange={(e)=>set("lister_type",e.target.value)} className={inp}>
          <option value="owner_direct">I am the owner (owner-direct)</option>
          <option value="broker_authorized">I am a broker authorized by the owner</option>
        </select>
        {isBroker && (
          <input placeholder="Authorization-to-market document URL (required)" value={f.authorization_doc_url} onChange={(e)=>set("authorization_doc_url",e.target.value)} className={inp} />
        )}
        <input placeholder="Video tour URL (YouTube or .mp4, optional)" value={f.video_url} onChange={(e)=>set("video_url",e.target.value)} className={inp} />
        <input placeholder="Floor plan image URL (optional)" value={f.floorplan_url} onChange={(e)=>set("floorplan_url",e.target.value)} className={inp} />
        <p className="text-[11px] text-charcoal/45">{isBroker ? "SAT verifies your authorization before the listing publishes." : "SAT verifies ownership before the listing publishes."}</p>
      </div>

      <button disabled={busy} className="rounded bg-signal px-4 py-2 text-white">{busy ? "Saving..." : "Save as draft"}</button>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <p className="text-xs text-charcoal/50">Saved as draft. SAT reviews and verifies before it publishes.</p>
    </form>
  );
}
