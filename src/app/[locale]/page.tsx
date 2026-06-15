import { isLocale } from "@/i18n/config";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getDictionary } from "@/i18n/getDictionary";
import { getSupabaseServer } from "@/lib/supabase/server";
import SearchBar from "@/components/SearchBar";
import ListingCard from "@/components/ListingCard";
import Skyline from "@/components/Skyline";
import type { Listing } from "@/lib/types";

export default async function HomePage({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound();
  const locale = params.locale;
  const dict = getDictionary(locale);
  const sb = getSupabaseServer();
  let featured: Listing[] = [];
  let stats = { listings: 0, cities: 4 };
  if (sb) {
    const { data } = await sb.from("listings").select("*, districts(name_en, name_ar, city)").eq("status","published").order("created_at",{ascending:false}).limit(6);
    featured = (data as Listing[]) ?? [];
    const { count } = await sb.from("listings").select("*", { count: "exact", head: true }).eq("status","published");
    stats.listings = count ?? 0;
  }
  return (
    <div>
      <section className="relative -mt-2 overflow-hidden rounded-2xl border border-line bg-white/40 px-7 pt-12 pb-0 shadow-card">
        <div className="relative z-10 max-w-3xl pb-12">
          <div className="eyebrow">{dict.hero.eyebrow}</div>
          <h1 className="mt-4 font-display text-[44px] leading-[1.05] text-charcoal sm:text-[56px]">{dict.hero.title}</h1>
          <p className="mt-5 max-w-xl text-[15.5px] leading-relaxed text-charcoal/65">{dict.hero.subtitle}</p>
          <div className="mt-8"><SearchBar locale={locale} placeholder={dict.hero.searchPlaceholder} cta={dict.hero.browse} /></div>
          <div className="mt-9 flex flex-wrap gap-x-10 gap-y-3">
            <Stat n={`${stats.listings}+`} l="Verified listings" />
            <Stat n="7" l="Asset classes" />
            <Stat n="4" l="Cities, Kingdom-wide" />
            <Stat n="EN / AR" l="Bilingual, RTL" />
          </div>
        </div>
        <Skyline className="pointer-events-none absolute inset-x-0 bottom-0 z-0 w-full opacity-90" />
      </section>

      {featured.length > 0 && (
        <section className="mt-14">
          <div className="flex items-end justify-between">
            <div>
              <div className="eyebrow">Featured</div>
              <h2 className="mt-1 font-display text-2xl text-charcoal">Verified commercial space</h2>
            </div>
            <Link href={`/${locale}/listings`} className="link-underline text-sm text-gold">View all</Link>
          </div>
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((l)=>(<ListingCard key={l.id} listing={l} locale={locale} sqmLabel={dict.common.sqm} verifiedLabel={dict.listing.verified} />))}
          </div>
        </section>
      )}

      <section className="mt-14 overflow-hidden rounded-2xl border border-line bg-gradient-to-br from-[#1C1A15] to-[#2A2620] px-8 py-10 text-ivory">
        <div className="eyebrow text-gold-soft">SAT Riyadh Commercial Rent Index</div>
        <h2 className="mt-2 max-w-2xl font-display text-2xl text-ivory">Decision-grade rent bands, from verified transactions, not a model.</h2>
        <p className="mt-3 max-w-2xl text-sm text-ivory/60">Median achieved rents by district and asset class, published only where the data is real. The moat that makes this an authority, not a classifieds board.</p>
        <Link href={`/${locale}/rent-index`} className="mt-5 inline-block btn-gold px-5 py-2.5 text-sm font-medium">Open the rent index</Link>
      </section>
    </div>
  );
}

function Stat({ n, l }: { n: string; l: string }) {
  return (
    <div>
      <div className="font-display text-2xl text-gold">{n}</div>
      <div className="text-[12px] text-charcoal/50">{l}</div>
    </div>
  );
}
