"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { assetLabel } from "@/lib/labels";
import { intakeFields, hasRegistry, type AssetField, type DisplaySection } from "@/lib/assetFields";
import LocationPicker from "@/components/LocationPicker";
import type { DistrictPoint } from "@/lib/nearestDistrict";

// These are captured by the base fields above (Area / Asking or Sale price), so
// they are not shown again in the per-asset section even though the registry
// carries them as commercial fields.
const BASE_OWNED = new Set(["asking_rent_sqm", "sale_price"]);
const SECTION_ORDER: DisplaySection[] = ["space", "commercial", "compliance"];
const sectionLabel = (s: DisplaySection, ar: boolean): string => {
  if (s === "commercial") return ar ? "الشروط التجارية" : "Commercial terms";
  if (s === "compliance") return ar ? "الامتثال والتصاريح" : "Compliance and permits";
  return ar ? "المساحة" : "The space";
};

// accountId is intentionally NOT destructured: the server route derives the
// account from the session, never from the client, so the form no longer sends it.
export default function NewListingForm({ locale, districts }: { accountId: string; locale: string; districts: DistrictPoint[] }) {
  const router = useRouter();
  const ar = locale === "ar";
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [f, setF] = useState({
    title_en: "", asset_type: "office", deal_type: "lease",
    area_sqm: "", price: "", description_en: "",
    contact_phone: "", contact_email: "",
    lister_type: "owner_direct", video_url: "", floorplan_url: "", authorization_doc_url: "",
    ad_permit_no: "", ad_permit_expires_at: "",
  });
  const [rightToMarket, setRightToMarket] = useState(false);
  const [loc, setLoc] = useState<{ lat: number | null; lng: number | null; districtId: string | null }>({ lat: null, lng: null, districtId: null });
  const [photos, setPhotos] = useState("");
  const [attrs, setAttrs] = useState<Record<string, unknown>>({});
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));
  const setAttr = (k: string, v: unknown) => setAttrs((p) => ({ ...p, [k]: v }));
  const [ch, setCh] = useState({ whatsapp: true, call: true, email: false, message: true });
  const assets = ["office","retail","medical","showroom","warehouse","serviced","education","land","gas_station","entertainment","wedding_hall","worker_housing","self_storage","hospitality","mixed_use"];
  const isBroker = f.lister_type === "broker_authorized";

  // Reshape the per-asset section when the asset type changes: its fields differ,
  // so previously entered attribute values no longer apply.
  const onAssetChange = (v: string) => { setF((p) => ({ ...p, asset_type: v })); setAttrs({}); };

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError(null);
    if (isBroker && !f.authorization_doc_url.trim()) { setError("Brokers must provide an authorization-to-market document URL."); return; }
    if (!/^\d{10}$/.test(f.ad_permit_no.trim())) {
      setError("Enter the 10 digit real estate advertising licence number. A listing cannot publish without one.");
      return;
    }
    if (!f.ad_permit_expires_at) {
      setError("Enter the date the advertising licence expires. The advertisement is withdrawn automatically on that date.");
      return;
    }
    if (new Date(f.ad_permit_expires_at) <= new Date()) { setError("That licence has already expired."); return; }
    if (!rightToMarket) { setError("Confirm you have the right to market this property."); return; }
    if (loc.lat == null || loc.lng == null) { setError("Place the property location on the map, or enter its coordinates."); return; }

    setBusy(true);
    // Server-authoritative write path. The route validates the base fields AND the
    // per-asset attributes against the registry, and derives the account from the session.
    const res = await fetch(`/api/listings`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title_en: f.title_en, asset_type: f.asset_type, deal_type: f.deal_type,
        district_id: loc.districtId, lat: loc.lat, lng: loc.lng, area_sqm: f.area_sqm, price: f.price,
        description_en: f.description_en,
        contact_phone: f.contact_phone, contact_email: f.contact_email,
        contact_channels: Object.entries(ch).filter(([, v]) => v).map(([k]) => k),
        lister_type: f.lister_type,
        video_url: f.video_url, floorplan_url: f.floorplan_url,
        authorization_doc_url: isBroker ? f.authorization_doc_url : null,
        ad_permit_no: f.ad_permit_no.trim(), ad_permit_expires_at: f.ad_permit_expires_at,
        right_to_market_confirmed: rightToMarket,
        attributes: attrs,
        photos: photos.split(/\n+/).map((s) => s.trim()).filter(Boolean),
      }),
    });
    const json = (await res.json().catch(() => ({}))) as { id?: string; error?: string };
    if (!res.ok) { setError(json.error || "Could not save the listing."); setBusy(false); return; }
    try { if (json.id) fetch(`/api/listings/${json.id}/translate`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ tier: "fast" }) }); } catch {}
    router.push(`/${locale}/dashboard`);
  }

  const inp = "w-full rounded border border-charcoal/20 px-3 py-2";

  function renderField(field: AssetField) {
    // Required is shown with a "*" and enforced by the server (not the native
    // required attribute), so a required field inside a collapsed section can
    // never silently block submit.
    const label = (ar ? field.label_ar : field.label_en) + (field.unit ? ` (${field.unit})` : "") + (field.required ? " *" : "");
    const help = ar ? field.help_ar : field.help_en;
    const val = attrs[field.key];
    if (field.type === "boolean") {
      return (
        <label key={field.key} className="flex items-center gap-2 text-[13px]">
          <input type="checkbox" checked={val === true} onChange={(e) => setAttr(field.key, e.target.checked)} />
          <span>{ar ? field.label_ar : field.label_en}</span>
        </label>
      );
    }
    if (field.type === "enum") {
      const opts = field.validation?.enum ?? [];
      return (
        <div key={field.key}>
          <label className="block text-[12px] text-charcoal/60 mb-1">{label}</label>
          <select value={(val as string) ?? ""} onChange={(e) => setAttr(field.key, e.target.value)} className={inp}>
            <option value="">{ar ? "اختر" : "Select"}</option>
            {opts.map((o) => <option key={o} value={o}>{field.options?.[o]?.[ar ? 1 : 0] ?? o.replace(/_/g, " ")}</option>)}
          </select>
          {help && <p className="text-[11px] text-charcoal/45 mt-1">{help}</p>}
        </div>
      );
    }
    const numeric = field.type === "number" || field.type === "integer" || field.type === "money";
    return (
      <div key={field.key}>
        <label className="block text-[12px] text-charcoal/60 mb-1">{label}</label>
        <input
          type={numeric ? "number" : "text"}
          value={(val as string) ?? ""}
          onChange={(e) => setAttr(field.key, e.target.value)}
          className={inp}
          placeholder={ar ? field.label_ar : field.label_en}
        />
        {help && <p className="text-[11px] text-charcoal/45 mt-1">{help}</p>}
      </div>
    );
  }

  const perAsset = intakeFields(f.asset_type).filter((x) => !BASE_OWNED.has(x.key));

  return (
    <form onSubmit={submit} className="max-w-xl space-y-3">
      <input required placeholder="Title" value={f.title_en} onChange={(e)=>set("title_en",e.target.value)} className={inp} />
      <div className="flex gap-3">
        <select value={f.asset_type} onChange={(e)=>onAssetChange(e.target.value)} className={inp+" flex-1"}>{assets.map(a=><option key={a} value={a}>{assetLabel(a, locale as "en" | "ar")}</option>)}</select>
        <select value={f.deal_type} onChange={(e)=>set("deal_type",e.target.value)} className={inp+" flex-1"}><option value="lease">lease</option><option value="sale">sale</option></select>
      </div>
      <div>
        <div className="text-[12px] font-medium text-charcoal/70 mb-1">{ar ? "الموقع" : "Location"}</div>
        <LocationPicker locale={ar ? "ar" : "en"} districts={districts} value={loc} onChange={setLoc} />
      </div>
      <div className="flex gap-3">
        <input required type="number" placeholder="Area (sqm)" value={f.area_sqm} onChange={(e)=>set("area_sqm",e.target.value)} className={inp+" flex-1"} />
        <input required type="number" placeholder={f.deal_type==="lease" ? "Asking (SAR/m²·yr)" : "Sale price (SAR)"} value={f.price} onChange={(e)=>set("price",e.target.value)} className={inp+" flex-1"} />
      </div>
      <textarea placeholder="Description" value={f.description_en} onChange={(e)=>set("description_en",e.target.value)} className={inp} rows={3} />

      {hasRegistry(f.asset_type) && perAsset.length > 0 && (
        <div className="rounded-lg border border-line bg-ivory-2/40 p-3 space-y-4">
          <div className="text-[12px] font-medium text-charcoal/70">{ar ? "تفاصيل العقار" : "Property details"}</div>
          {SECTION_ORDER.map((sec) => {
            const fields = perAsset.filter((x) => x.section === sec);
            if (fields.length === 0) return null;
            const lead = fields.filter((x) => x.show_rule === "always");
            const more = fields.filter((x) => x.show_rule !== "always");
            return (
              <div key={sec} className="space-y-2">
                <div className="text-[11px] uppercase tracking-wide text-charcoal/45">{sectionLabel(sec, ar)}</div>
                {lead.map(renderField)}
                {more.length > 0 && (
                  <details className="rounded border border-line/70 px-3 py-2">
                    <summary className="text-[12px] text-charcoal/60 cursor-pointer">{ar ? "المزيد من التفاصيل" : "Add more detail"}</summary>
                    <div className="mt-3 space-y-3">{more.map(renderField)}</div>
                  </details>
                )}
              </div>
            );
          })}
          <p className="text-[11px] text-charcoal/45">{ar ? "كل ما تُدخله يظهر كأنه من ذكر المُعلن حتى تتحقق منه سات." : "Everything you enter shows as stated by the lister until SAT verifies it."}</p>
        </div>
      )}

      <div className="rounded-lg border border-line bg-ivory-2/40 p-3 space-y-3">
        <div className="text-[12px] font-medium text-charcoal/70">Who is listing, and media</div>
        <select value={f.lister_type} onChange={(e)=>set("lister_type",e.target.value)} className={inp}>
          <option value="owner_direct">I am the owner (owner-direct)</option>
          <option value="broker_authorized">I am a broker authorized by the owner</option>
        </select>
        {isBroker && (
          <input placeholder="Authorization-to-market document URL (required)" value={f.authorization_doc_url} onChange={(e)=>set("authorization_doc_url",e.target.value)} className={inp} />
        )}
        <div>
          <label className="block text-[12px] text-charcoal/70 mb-1">{ar ? "روابط الصور (رابط في كل سطر)" : "Photo URLs (one per line)"}</label>
          <textarea value={photos} onChange={(e)=>setPhotos(e.target.value)} className={inp} rows={3} placeholder={"https://...\nhttps://..."} />
          <p className="text-[11px] text-charcoal/45">{ar ? "الصور تظهر في معرض العرض. رفع الملفات مباشرة قريباً." : "Real photos appear in the listing gallery. Direct file upload is coming next."}</p>
        </div>
        <input placeholder="Video tour URL (YouTube or .mp4, optional)" value={f.video_url} onChange={(e)=>set("video_url",e.target.value)} className={inp} />
        <input placeholder="Floor plan image URL (optional)" value={f.floorplan_url} onChange={(e)=>set("floorplan_url",e.target.value)} className={inp} />
        <p className="text-[11px] text-charcoal/45">{isBroker ? "SAT verifies your authorization before the listing publishes." : "SAT verifies ownership before the listing publishes."}</p>
      </div>

      <div className="rounded-lg border border-line bg-ivory-2/40 p-3 space-y-3">
        <div className="text-[12px] font-medium text-charcoal/70">Real estate advertising licence</div>
        <div className="flex gap-3">
          <input
            required
            inputMode="numeric"
            pattern="\d{10}"
            placeholder="Licence number (10 digits)"
            value={f.ad_permit_no}
            onChange={(e)=>set("ad_permit_no", e.target.value.replace(/\D/g, "").slice(0,10))}
            className={inp+" flex-1 font-mono"}
          />
          <input
            required
            type="date"
            aria-label="Licence expiry date"
            value={f.ad_permit_expires_at}
            onChange={(e)=>set("ad_permit_expires_at", e.target.value)}
            className={inp+" flex-1"}
          />
        </div>
        <label className="flex items-start gap-2 text-[13px]">
          <input type="checkbox" checked={rightToMarket} onChange={(e)=>setRightToMarket(e.target.checked)} className="mt-0.5" />
          <span>I confirm I have the right to market this property.</span>
        </label>
        <p className="text-[11px] text-charcoal/45">
          The licence number and its expiry are shown on the advertisement, as the real
          estate marketing rules require, and the advertisement is withdrawn automatically
          when the licence expires. A listing cannot publish without a valid licence.
        </p>
      </div>

      <div className="rounded-lg border border-line bg-ivory-2/40 p-3 space-y-3">
        <div className="text-[12px] font-medium text-charcoal/70">How viewers reach you</div>
        <input placeholder="Contact phone (WhatsApp and calls)" value={f.contact_phone} onChange={(e)=>set("contact_phone",e.target.value)} className={inp} />
        <input placeholder="Contact email (optional)" value={f.contact_email} onChange={(e)=>set("contact_email",e.target.value)} className={inp} />
        <div className="flex flex-wrap gap-3 text-[13px]">
          {(([["whatsapp","WhatsApp"],["call","Call"],["email","Email"],["message","Message on SAT"]]) as [string,string][]).map(([k,lab])=>(
            <label key={k} className="flex items-center gap-1.5">
              <input type="checkbox" checked={(ch as Record<string,boolean>)[k]} onChange={(e)=>setCh((p)=>({ ...p, [k]: e.target.checked }))} /> {lab}
            </label>
          ))}
        </div>
        <p className="text-[11px] text-charcoal/45">You choose how viewers reach you. The on-platform message keeps enquiries tracked by SAT.</p>
      </div>

      <button disabled={busy} className="rounded bg-signal px-4 py-2 text-white">{busy ? "Saving..." : "Save as draft"}</button>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <p className="text-xs text-charcoal/50">Saved as draft. SAT reviews and verifies before it publishes.</p>
    </form>
  );
}
