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
  const supabase = getSupabaseServer();

  let listing: Listing | null = null;
  let cell: RentIndexCell | null = null;
  if (supabase) {
    const { data } = await supabase.from("listings").select("*").eq("id", params.id).single();
    listing = (data as Listing) ?? null;
    if (listing?.district_id) {
      const { data: cells } = await supabase
        .from("rent_index_cells")
        .select("*")
        .eq("district_id", listing.district_id)
        .eq("asset_type", listing.asset_type)
        .eq("deal_type", listing.deal_type)
        .limit(1);
      cell = ((cells as RentIndexCell[]) ?? [])[0] ?? null;
    }
  }

  if (!listing) {
    return <p className="text-charcoal/50">Listing not found, or the database is not connected yet.</p>;
  }

  const title = (locale === "ar" ? listing.title_ar : listing.title_en) || listing.reference_code;
  return (
    <article className="grid gap-8 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <h1 className="font-serif text-2xl">{title}</h1>
        <div className="mt-2 text-charcoal/60">
          {listing.area_sqm} {dict.common.sqm} · {listing.building_grade} · {listing.fitout_condition}
        </div>
        <div className="mt-6">
          <RentBand
            cell={cell}
            labels={{
              rentBand: dict.listing.rentBand,
              medianAsking: dict.listing.medianAsking,
              medianAchieved: dict.listing.medianAchieved
            }}
          />
        </div>
      </div>
      <aside className="rounded-lg border border-charcoal/10 p-4">
        <LeadForm
          listingId={listing.id}
          labels={{
            contactDirectly: dict.listing.contactDirectly,
            bookRepresentation: dict.listing.bookRepresentation,
            contactNote: dict.listing.contactNote,
            repNote: dict.listing.repNote
          }}
        />
      </aside>
    </article>
  );
}
