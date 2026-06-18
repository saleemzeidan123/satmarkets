"use client";
import Link from "next/link";
import type { Listing } from "@/lib/types";
import type { Locale } from "@/i18n/config";
import { photoFor } from "@/lib/photos";
import { assetLabel, gradeLabel, cityLabel, dealLabel } from "@/lib/labels";
import SaveHeart from "@/components/SaveHeart";

export default function ListingCard({ listing, locale, sqm, ui }: {
  listing: Listing; locale: Locale; sqm: string; ui: any;
}) {
  const title = (locale === "ar" ? listing.title_ar : listing.title_en) || listing.reference_code;
  const d = listing.districts;
  const dn = d ? (locale === "ar" ? d.name_ar : d.name_en) : "";
  const place = d ? `${dn}${d.city ? "، " + cityLabel(d.city, locale) : ""}` : "";
  const lease = listing.deal_type === "lease";
  const price = lease ? listing.asking_rent_sqm : listing.sale_price;
  return (
    <Link href={`/${locale}/listings/${listing.id}`} className="card group relative block overflow-hidden">
      <div className="relative h-52 overflow-hidden">
        <img src={photoFor(listing.asset_type, listing.id)} alt={title} className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.06]" loading="lazy" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/5 to-transparent" />
        <div className="absolute start-3 top-3 flex items-center gap-1.5">
          <span className="rounded-md bg-white/90 px-2 py-1 text-[10px] font-semibold text-charcoal ring-1 ring-black/5 backdrop-blur">{assetLabel(listing.asset_type, locale)}</span>
          <span className="rounded-md bg-signal px-2 py-1 text-[10px] font-semibold text-white backdrop-blur">{dealLabel(listing.deal_type, locale)}</span><span className="rounded-md bg-[#0E9488] px-2 py-1 text-[10px] font-semibold text-white backdrop-blur">{locale === "ar" ? "نطاق إيجار" : "Rent band"}</span>
        </div>
        <SaveHeart id={listing.id} label={ui.save || "Save"} />
        <div className="absolute bottom-3 start-3 text-white">
          <div className="fig text-[22px] leading-none drop-shadow tracking-tight">{price != null ? Number(price).toLocaleString() : ui.onRequest}</div>
          <div className="mt-1 text-[10px] opacity-90">{lease ? ui.perSqmYear : ui.sar}</div>
        </div>
      </div>
      <div className="p-4">
        <h3 className="font-display text-[17px] leading-snug text-charcoal line-clamp-1">{title}</h3>
        <div className="mt-1 text-[13px] text-charcoal/55">{place}{place ? " · " : ""}{listing.area_sqm} {sqm}{listing.building_grade !== "n_a" ? " · " + gradeLabel(listing.building_grade, locale) : ""}</div>
        <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
          <span className="inline-flex items-center gap-1 text-[12px] text-charcoal/50">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#0E9488" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
            {ui.verifiedListing}
          </span>
          <span className="text-[12px] text-charcoal/40 transition group-hover:text-signal">{ui.view} →</span>
        </div>
      </div>
    </Link>
  );
}
