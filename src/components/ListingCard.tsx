import Link from "next/link";
import type { Listing } from "@/lib/types";
import type { Locale } from "@/i18n/config";
import { photoFor } from "@/lib/photos";
import { assetLabel, gradeLabel, cityLabel } from "@/lib/labels";

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
    <Link href={`/${locale}/listings/${listing.id}`} className="card group block overflow-hidden">
      <div className="relative h-48 overflow-hidden">
        <img src={photoFor(listing.asset_type, listing.id)} alt={title} className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.06]" loading="lazy" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
        <span className="badge glass absolute start-3 top-3 text-charcoal/80">{ui.verifiedListing}</span>
        <span className="absolute end-3 top-3 rounded-md bg-black/35 px-2 py-1 text-[10px] text-white backdrop-blur">{assetLabel(listing.asset_type, locale)}</span>
        <div className="absolute bottom-3 start-3 text-white">
          <div className="font-display text-lg drop-shadow">{price != null ? Number(price).toLocaleString() : ui.onRequest}</div>
          <div className="text-[10px] opacity-90">{lease ? ui.perSqmYear : ui.sar}</div>
        </div>
      </div>
      <div className="p-4">
        <h3 className="font-display text-[17px] leading-snug text-charcoal">{title}</h3>
        <div className="mt-1 text-[13px] text-charcoal/55">{place}{place ? " · " : ""}{listing.area_sqm} {sqm}{listing.building_grade !== "n_a" ? " · " + gradeLabel(listing.building_grade, locale) : ""}</div>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-[12px] text-charcoal/45">{ui.verifiedListing}</span>
          <span className="text-[12px] text-charcoal/40 transition group-hover:text-gold">{ui.view} →</span>
        </div>
      </div>
    </Link>
  );
}
