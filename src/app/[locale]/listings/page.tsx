import { isLocale } from "@/i18n/config";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getDictionary } from "@/i18n/getDictionary";
import { getSupabaseServer } from "@/lib/supabase/server";
import ListingCard from "@/components/ListingCard";
import type { Listing } from "@/lib/types";

const ASSETS = ["office","retail","medical","showroom","warehouse","serviced","education","land"];
const CITIES = ["Riyadh","Jeddah","Dammam","Khobar"];

export default async function ListingsPage({ params, searchParams }: {
  params: { locale: string };
  searchParams: { asset?: string; city?: string };
}) {
  if (!isLocale(params.locale)) notFound();
  const locale = params.locale;
  const dict = getDictionary(locale);
  const supabase = getSupabaseServer();

  let listings: Listing[] = [];
  if (supabase) {
    let query = supabase.from("listings").select("*, districts(name_en, name_ar, city)").eq("status", "published").limit(48);
    if (searchParams.asset) query = query.eq("asset_type", searchParams.asset);
    const { data } = await query;
    listings = (data as Listing[]) ?? [];
    if (searchParams.city) listings = listings.filter((l) => l.districts?.city === searchParams.city);
  }

  const chip = (label: string, key: "asset"|"city", val: string) => {
    const active = searchParams[key] === val;
    const sp = new URLSearchParams(searchParams as any);
    if (active) sp.delete(key); else sp.set(key, val);
    return (
      <Link key={key+val} href={`/${locale}/listings?${sp.toString()}`} className={`rounded-full border px-3 py-1 text-xs ${active ? "border-gold bg-gold text-white" : "border-charcoal/20 text-charcoal/70"}`}>{label}</Link>
    );
  };

  return (
    <section>
      <h1 className="font-serif text-2xl">{dict.nav.listings}</h1>
      <div className="mt-4 flex flex-wrap gap-2">
        {ASSETS.map((a)=>chip(a, "asset", a))}
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {CITIES.map((c)=>chip(c, "city", c))}
      </div>
      {listings.length === 0 ? (
        <p className="mt-6 text-charcoal/50">No listings match.</p>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {listings.map((l) => (
            <ListingCard key={l.id} listing={l} locale={locale} sqmLabel={dict.common.sqm} verifiedLabel={dict.listing.verified} />
          ))}
        </div>
      )}
    </section>
  );
}
