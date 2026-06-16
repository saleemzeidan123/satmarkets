import { isLocale } from "@/i18n/config";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getDictionary } from "@/i18n/getDictionary";
import { getSupabaseServer } from "@/lib/supabase/server";
import ListingCard from "@/components/ListingCard";
import { assetLabel, cityLabel, dealLabel } from "@/lib/labels";
import type { Listing } from "@/lib/types";

const ASSETS = ["office","retail","medical","showroom","warehouse","serviced","education","hospitality","mixed_use","land"];
const CITIES = ["Riyadh","Jeddah","Dammam","Khobar"];
const DEALS = ["lease","sale"];

export default async function ListingsPage({ params, searchParams }: { params: { locale: string }; searchParams: { asset?: string; city?: string; deal?: string } }) {
  if (!isLocale(params.locale)) notFound();
  const locale = params.locale;
  const ar = locale === "ar";
  const dict = getDictionary(locale);
  const supabase = getSupabaseServer();
  let listings: Listing[] = [];
  if (supabase) {
    let query = supabase.from("listings").select("*, districts(name_en, name_ar, city)").eq("status","published").order("created_at",{ascending:false}).limit(60);
    if (searchParams.asset) query = query.eq("asset_type", searchParams.asset);
    if (searchParams.deal) query = query.eq("deal_type", searchParams.deal);
    const { data } = await query;
    listings = (data as Listing[]) ?? [];
    if (searchParams.city) listings = listings.filter((l)=>l.districts?.city === searchParams.city);
  }
  const chip = (label: string, key: "asset"|"city"|"deal", val: string) => {
    const active = searchParams[key] === val;
    const sp = new URLSearchParams(searchParams as any);
    if (active) sp.delete(key); else sp.set(key, val);
    return <Link key={key+val} href={`/${locale}/listings?${sp.toString()}`} className={`rounded-full border px-3.5 py-1.5 text-[12.5px] transition ${active ? "border-gold bg-gold text-white" : "border-line text-charcoal/65 hover:border-gold/50 hover:text-charcoal"}`}>{label}</Link>;
  };
  return (
    <section>
      <div className="eyebrow">{dict.ui.browse}</div>
      <h1 className="mt-1 font-display text-3xl text-charcoal">{dict.nav.listings}</h1>
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <span className="me-1 text-[11px] uppercase tracking-wide text-charcoal/40">{ar ? "نوع الصفقة" : "Deal"}</span>
        {DEALS.map((d)=>chip(dealLabel(d, locale),"deal",d))}
      </div>
      <div className="mt-2.5 flex flex-wrap gap-2">{ASSETS.map((a)=>chip(assetLabel(a, locale),"asset",a))}</div>
      <div className="mt-2.5 flex flex-wrap gap-2">{CITIES.map((c)=>chip(cityLabel(c, locale),"city",c))}</div>
      <div className="mt-3 text-sm text-charcoal/50">{listings.length} {dict.ui.results}</div>
      {listings.length === 0 ? (
        <p className="mt-8 text-charcoal/50">{dict.ui.noMatch}</p>
      ) : (
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {listings.map((l)=>(<ListingCard key={l.id} listing={l} locale={locale} sqm={dict.common.sqm} ui={dict.ui} />))}
        </div>
      )}
    </section>
  );
}
