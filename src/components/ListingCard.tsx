import Link from "next/link";
import type { Listing } from "@/lib/types";
import type { Locale } from "@/i18n/config";

export default function ListingCard({ listing, locale, sqmLabel, verifiedLabel }: {
  listing: Listing; locale: Locale; sqmLabel: string; verifiedLabel: string;
}) {
  const title = (locale === "ar" ? listing.title_ar : listing.title_en) || listing.reference_code;
  const price = listing.deal_type === "lease" ? listing.asking_rent_sqm : listing.sale_price;
  const d = listing.districts;
  const place = d ? `${locale === "ar" ? d.name_ar : d.name_en}${d.city ? ", " + d.city : ""}` : "";
  return (
    <Link href={`/${locale}/listings/${listing.id}`} className="block rounded-lg border border-charcoal/10 bg-white p-4 hover:border-gold/40">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase text-charcoal/50">{listing.asset_type}</span>
        {listing.status === "published" && (
          <span className="rounded bg-slate/10 px-2 py-0.5 text-xs text-slate">{verifiedLabel}</span>
        )}
      </div>
      <h3 className="mt-2 font-serif text-lg">{title}</h3>
      <div className="mt-1 text-sm text-charcoal/60">{place ? place + " · " : ""}{listing.area_sqm} {sqmLabel}</div>
      {price != null && <div className="mt-2 text-gold">{price}</div>}
    </Link>
  );
}
