import { isLocale } from "@/i18n/config";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getDictionary } from "@/i18n/getDictionary";
import { getSupabaseServer } from "@/lib/supabase/server";
import SearchBar from "@/components/SearchBar";
import ListingCard from "@/components/ListingCard";
import type { Listing } from "@/lib/types";

export default async function HomePage({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound();
  const locale = params.locale;
  const dict = getDictionary(locale);
  const sb = getSupabaseServer();
  let featured: Listing[] = [];
  if (sb) {
    const { data } = await sb.from("listings").select("*, districts(name_en, name_ar, city)").eq("status","published").limit(6);
    featured = (data as Listing[]) ?? [];
  }
  return (
    <section className="py-10">
      <div className="text-xs uppercase tracking-widest text-gold">{dict.hero.eyebrow}</div>
      <h1 className="mt-3 max-w-3xl font-serif text-4xl leading-tight">{dict.hero.title}</h1>
      <p className="mt-4 max-w-2xl text-charcoal/70">{dict.hero.subtitle}</p>
      <div className="mt-8">
        <SearchBar locale={locale} placeholder={dict.hero.searchPlaceholder} cta={dict.hero.browse} />
      </div>
      {featured.length > 0 && (
        <div className="mt-12">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-xl">{dict.nav.listings}</h2>
            <Link href={`/${locale}/listings`} className="text-sm text-gold">View all</Link>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((l)=>(<ListingCard key={l.id} listing={l} locale={locale} sqmLabel={dict.common.sqm} verifiedLabel={dict.listing.verified} />))}
          </div>
        </div>
      )}
      <div className="mt-12 rounded-lg border border-charcoal/10 bg-white p-6">
        <div className="text-xs uppercase tracking-widest text-gold">SAT Riyadh Commercial Rent Index</div>
        <p className="mt-2 max-w-2xl text-charcoal/70">Decision-grade rent bands by district and asset type, from verified transactions.</p>
        <Link href={`/${locale}/rent-index`} className="mt-3 inline-block rounded bg-gold px-4 py-2 text-sm text-white">Open the rent index</Link>
      </div>
    </section>
  );
}
