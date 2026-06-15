import { isLocale } from "@/i18n/config";
import { notFound } from "next/navigation";
import { getDictionary } from "@/i18n/getDictionary";
import { getSupabaseServer } from "@/lib/supabase/server";
import ListingCard from "@/components/ListingCard";
import type { Listing } from "@/lib/types";

export default async function ListingsPage({
  params,
  searchParams
}: {
  params: { locale: string };
  searchParams: { q?: string; asset?: string };
}) {
  if (!isLocale(params.locale)) notFound();
  const locale = params.locale;
  const dict = getDictionary(locale);
  const supabase = getSupabaseServer();

  let listings: Listing[] = [];
  if (supabase) {
    let query = supabase.from("listings").select("*").eq("status", "published").limit(24);
    if (searchParams.asset) query = query.eq("asset_type", searchParams.asset);
    const { data } = await query;
    listings = (data as Listing[]) ?? [];
  }

  return (
    <section>
      <h1 className="font-serif text-2xl">{dict.nav.listings}</h1>
      {listings.length === 0 ? (
        <p className="mt-6 text-charcoal/50">
          No published listings yet. Connect the SAT Markets Supabase project and seed inventory.
        </p>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {listings.map((l) => (
            <ListingCard
              key={l.id}
              listing={l}
              locale={locale}
              sqmLabel={dict.common.sqm}
              verifiedLabel={dict.listing.verified}
            />
          ))}
        </div>
      )}
    </section>
  );
}
