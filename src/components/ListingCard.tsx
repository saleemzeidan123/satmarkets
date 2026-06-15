import Link from "next/link";
import AssetIcon from "@/components/AssetIcon";
import type { Listing } from "@/lib/types";
import type { Locale } from "@/i18n/config";

export default function ListingCard({ listing, locale, sqmLabel, verifiedLabel }: {
  listing: Listing; locale: Locale; sqmLabel: string; verifiedLabel: string;
}) {
  const title = (locale === "ar" ? listing.title_ar : listing.title_en) || listing.reference_code;
  const d = listing.districts;
  const place = d ? `${locale === "ar" ? d.name_ar : d.name_en}${d.city ? ", " + d.city : ""}` : "";
  const lease = listing.deal_type === "lease";
  const price = lease ? listing.asking_rent_sqm : listing.sale_price;
  return (
    <Link href={`/${locale}/listings/${listing.id}`} className="card group block overflow-hidden">
      <div className="asset-photo flex h-40 items-center justify-center">
        <AssetIcon type={listing.asset_type} className="h-10 w-10 text-gold/70" />
        <span className="badge badge-verified absolute left-3 top-3 bg-white/85 backdrop-blur">{verifiedLabel}</span>
        <span className="absolute right-3 top-3 rounded-md bg-white/85 px-2 py-1 text-[10px] uppercase tracking-wide text-charcoal/70 backdrop-blur">{listing.asset_type}</span>
      </div>
      <div className="p-4">
        <h3 className="font-display text-[17px] leading-snug text-charcoal">{title}</h3>
        <div className="mt-1 text-[13px] text-charcoal/55">{place}{place ? " · " : ""}{listing.area_sqm} {sqmLabel}{listing.building_grade !== "n_a" ? " · " + listing.building_grade.replace("_"," ") : ""}</div>
        <div className="mt-3 flex items-end justify-between">
          <div>
            <div className="font-display text-xl text-gold">{price != null ? Number(price).toLocaleString() : "On request"}</div>
            <div className="text-[11px] text-charcoal/45">{lease ? "SAR / sqm / year" : "SAR"}</div>
          </div>
          <span className="text-[12px] text-charcoal/40 transition group-hover:text-gold">View →</span>
        </div>
      </div>
    </Link>
  );
}
