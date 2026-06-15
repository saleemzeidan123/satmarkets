import { isLocale } from "@/i18n/config";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getDictionary } from "@/i18n/getDictionary";
import { getSupabaseServer } from "@/lib/supabase/server";
import RentBand from "@/components/RentBand";
import LeadForm from "@/components/LeadForm";
import AssetIcon from "@/components/AssetIcon";
import type { Listing, RentIndexCell } from "@/lib/types";

export default async function ListingDetail({ params }: { params: { locale: string; id: string } }) {
  if (!isLocale(params.locale)) notFound();
  const locale = params.locale;
  const dict = getDictionary(locale);
  const sb = getSupabaseServer();
  let listing: Listing | null = null;
  let cell: RentIndexCell | null = null;
  let briefCount = 0, availCount = 0;
  if (sb) {
    const { data } = await sb.from("listings").select("*, districts(name_en, name_ar, city)").eq("id", params.id).single();
    listing = (data as Listing) ?? null;
    if (listing?.district_id) {
      const { data: cells } = await sb.from("rent_index_cells").select("*").eq("district_id", listing.district_id).eq("asset_type", listing.asset_type).eq("deal_type", listing.deal_type).limit(1);
      cell = ((cells as RentIndexCell[]) ?? [])[0] ?? null;
      const { count: bc } = await sb.from("tenant_briefs").select("*", { count:"exact", head:true }).eq("district_id", listing.district_id).eq("asset_type", listing.asset_type);
      briefCount = bc ?? 0;
      const { count: ac } = await sb.from("listings").select("*", { count:"exact", head:true }).eq("district_id", listing.district_id).eq("asset_type", listing.asset_type).eq("status","published");
      availCount = ac ?? 0;
    }
  }
  if (!listing) return <p className="text-charcoal/50">Listing not found.</p>;
  const title = (locale === "ar" ? listing.title_ar : listing.title_en) || listing.reference_code;
  const d = listing.districts;
  const place = d ? `${locale === "ar" ? d.name_ar : d.name_en}${d.city ? ", " + d.city : ""}` : "";
  const lease = listing.deal_type === "lease";

  return (
    <div>
      <Link href={`/${locale}/listings`} className="text-sm text-charcoal/50 hover:text-charcoal">← All listings</Link>
      <div className="mt-3 grid gap-8 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="asset-photo flex h-64 items-center justify-center">
            <AssetIcon type={listing.asset_type} className="h-16 w-16 text-gold/60" />
            <span className="badge badge-verified absolute left-4 top-4 bg-white/85 backdrop-blur">{dict.listing.verified}</span>
          </div>
          <div>
            <div className="eyebrow">{listing.asset_type} · {place}</div>
            <h1 className="mt-1 font-display text-3xl text-charcoal">{title}</h1>
          </div>
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-4">
            <Spec label="Area" value={`${listing.area_sqm} ${dict.common.sqm}`} />
            <Spec label="Grade" value={listing.building_grade.replace("_"," ")} />
            <Spec label="Fit-out" value={listing.fitout_condition.replace(/_/g," ")} />
            <Spec label={lease ? "Asking SAR/sqm" : "Price SAR"} value={Number(listing.asking_rent_sqm ?? listing.sale_price ?? 0).toLocaleString()} />
          </div>
          {listing.description_en && <p className="text-[15px] leading-relaxed text-charcoal/70">{(locale==="ar"&&listing.description_ar)?listing.description_ar:listing.description_en}</p>}
          <div className="rounded-2xl border border-line bg-white p-5 shadow-card">
            <div className="eyebrow">{dict.areaIntel.title}</div>
            <div className="mt-4 space-y-4">
              <RentBand cell={cell} labels={{ rentBand: dict.areaIntel.band, medianAsking: dict.listing.medianAsking, medianAchieved: dict.listing.medianAchieved }} />
              <div className="grid grid-cols-2 gap-4">
                <Metric n={briefCount} l={dict.areaIntel.briefs} />
                <Metric n={availCount} l={dict.areaIntel.available} />
              </div>
              <p className="text-xs text-charcoal/40">{dict.areaIntel.note}</p>
            </div>
          </div>
        </div>
        <aside className="lg:sticky lg:top-24 h-fit rounded-2xl border border-line bg-white p-5 shadow-card">
          <div className="font-display text-2xl text-gold">{Number(listing.asking_rent_sqm ?? listing.sale_price ?? 0).toLocaleString()}</div>
          <div className="text-xs text-charcoal/45">{lease ? "SAR / sqm / year" : "SAR"}</div>
          <div className="mt-4 hairline" />
          <div className="mt-4"><LeadForm listingId={listing.id} labels={{ contactDirectly: dict.listing.contactDirectly, bookRepresentation: dict.listing.bookRepresentation, contactNote: dict.listing.contactNote, repNote: dict.listing.repNote }} /></div>
        </aside>
      </div>
    </div>
  );
}
function Spec({ label, value }: { label: string; value: string }) {
  return <div className="bg-white px-4 py-3"><div className="text-[10px] uppercase tracking-wide text-charcoal/40">{label}</div><div className="mt-0.5 font-display text-lg text-charcoal">{value}</div></div>;
}
function Metric({ n, l }: { n: number; l: string }) {
  return <div className="rounded-xl border border-line bg-ivory-2/40 p-3"><div className="font-display text-2xl text-gold">{n}</div><div className="text-[11px] text-charcoal/55">{l}</div></div>;
}
