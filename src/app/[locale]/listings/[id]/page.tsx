import { isLocale } from "@/i18n/config";
import { notFound } from "next/navigation";
import { getDictionary } from "@/i18n/getDictionary";
import { getSupabaseServer } from "@/lib/supabase/server";
import RentBand from "@/components/RentBand";
import LeadForm from "@/components/LeadForm";
import type { Listing, RentIndexCell } from "@/lib/types";

export default async function ListingDetail({ params }: { params: { locale: string; id: string } }) {
  if (!isLocale(params.locale)) notFound();
  const locale = params.locale;
  const dict = getDictionary(locale);
  const sb = getSupabaseServer();

  let listing: Listing | null = null;
  let cell: RentIndexCell | null = null;
  let briefCount = 0;
  let availCount = 0;
  if (sb) {
    const { data } = await sb.from("listings").select("*, districts(name_en, name_ar, city)").eq("id", params.id).single();
    listing = (data as Listing) ?? null;
    if (listing?.district_id) {
      const { data: cells } = await sb.from("rent_index_cells").select("*")
        .eq("district_id", listing.district_id).eq("asset_type", listing.asset_type).eq("deal_type", listing.deal_type).limit(1);
      cell = ((cells as RentIndexCell[]) ?? [])[0] ?? null;
      const { count: bc } = await sb.from("tenant_briefs").select("*", { count: "exact", head: true })
        .eq("district_id", listing.district_id).eq("asset_type", listing.asset_type);
      briefCount = bc ?? 0;
      const { count: ac } = await sb.from("listings").select("*", { count: "exact", head: true })
        .eq("district_id", listing.district_id).eq("asset_type", listing.asset_type).eq("status", "published");
      availCount = ac ?? 0;
    }
  }

  if (!listing) return <p className="text-charcoal/50">Listing not found.</p>;
  const title = (locale === "ar" ? listing.title_ar : listing.title_en) || listing.reference_code;
  const d = listing.districts;
  const place = d ? `${locale === "ar" ? d.name_ar : d.name_en}${d.city ? ", " + d.city : ""}` : "";

  return (
    <article className="grid gap-8 lg:grid-cols-3">
      <div className="lg:col-span-2 space-y-6">
        <div>
          <div className="text-xs uppercase tracking-wide text-charcoal/50">{listing.asset_type} · {place}</div>
          <h1 className="mt-1 font-serif text-2xl">{title}</h1>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Spec label="Area" value={`${listing.area_sqm} ${dict.common.sqm}`} />
          <Spec label="Grade" value={listing.building_grade} />
          <Spec label="Fit-out" value={listing.fitout_condition} />
          <Spec label={listing.deal_type === "lease" ? "Asking (SAR/sqm)" : "Price (SAR)"} value={String(listing.asking_rent_sqm ?? listing.sale_price ?? "-")} />
        </div>
        <div className="rounded-lg border border-charcoal/10 p-4">
          <div className="text-xs uppercase tracking-wide text-gold">{dict.areaIntel.title}</div>
          <div className="mt-3 space-y-3">
            <RentBand cell={cell} labels={{ rentBand: dict.areaIntel.band, medianAsking: dict.listing.medianAsking, medianAchieved: dict.listing.medianAchieved }} />
            <div className="flex gap-6 text-sm">
              <div><span className="text-2xl text-gold">{briefCount}</span><div className="text-xs text-charcoal/60">{dict.areaIntel.briefs}</div></div>
              <div><span className="text-2xl text-gold">{availCount}</span><div className="text-xs text-charcoal/60">{dict.areaIntel.available}</div></div>
            </div>
            <p className="text-xs text-charcoal/40">{dict.areaIntel.note}</p>
          </div>
        </div>
      </div>
      <aside className="rounded-lg border border-charcoal/10 p-4 h-fit">
        <LeadForm listingId={listing.id} labels={{ contactDirectly: dict.listing.contactDirectly, bookRepresentation: dict.listing.bookRepresentation, contactNote: dict.listing.contactNote, repNote: dict.listing.repNote }} />
      </aside>
    </article>
  );
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase text-charcoal/40">{label}</div>
      <div className="font-serif text-lg">{value}</div>
    </div>
  );
}
