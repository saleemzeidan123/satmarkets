"use client";
import Link from "next/link";
import type { Listing } from "@/lib/types";
import type { Locale } from "@/i18n/config";
import { photoFor } from "@/lib/photos";
import { assetLabel, gradeLabel, cityLabel, dealLabel } from "@/lib/labels";
import { listingTitle } from "@/lib/listingTitle";
import SaveHeart from "@/components/SaveHeart";
import { verifiedBadgeTexts } from "@/lib/listingVerification";

export default function ListingCard({ listing, locale, sqm, ui }: {
  listing: Listing; locale: Locale; sqm: string; ui: any;
}) {
  const title = listingTitle(listing, locale === "ar" ? "ar" : "en");
  const d = listing.districts;
  const dn = d ? (locale === "ar" ? d.name_ar : d.name_en) : "";
  const place = d ? `${dn}${d.city ? "، " + cityLabel(d.city, locale) : ""}` : "";
  const lease = listing.deal_type === "lease";
  // ADV-1, owner decision O3. This read passesGate, the PUBLISH gate, and printed
  // "Verified listing" when it returned true. Two problems. The publish gate mirrors
  // the database trigger, whose ownership and authorisation legs default to PASS when
  // the column is unset, so a row nobody had looked at cleared two of its four legs by
  // being silent. And a listing is not the thing that gets verified: an owner, an
  // authorisation, a right to market and a permit are, separately. The card now shows
  // exactly what this record earned, which today is nothing on all 88 published rows.
  const badges = verifiedBadgeTexts(listing as any, null, locale === "ar");
  const price = lease ? listing.asking_rent_sqm : listing.sale_price;
  return (
    <Link href={`/${locale}/listings/${listing.id}`} className="card group relative block overflow-hidden">
      <div className="relative h-52 overflow-hidden">
        <img src={photoFor(listing.asset_type, listing.id)} alt={title} className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.06]" loading="lazy" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/5 to-transparent" />
        <div className="absolute start-3 top-3 flex flex-wrap items-center gap-1.5 max-w-[calc(100%-3.25rem)]">
          <span className="rounded-md bg-white/90 px-2 py-1 text-[10px] font-semibold text-charcoal ring-1 ring-black/5 backdrop-blur">{assetLabel(listing.asset_type, locale)}</span>
          <span className="rounded-md bg-signal px-2 py-1 text-[10px] font-semibold text-white backdrop-blur">{dealLabel(listing.deal_type, locale)}</span>{/* Rent-Index coverage is INFORMATIONAL (D24: informational = Harbor), not a
              status and not a verification. It was an off-palette teal, which D24 rules
              out; it is now the Harbor wash so it reads as information beside, not above,
              the solid deal badge. */}
          <span className="rounded-md bg-azure-wash px-2 py-1 text-[10px] font-semibold text-harbor-d backdrop-blur">{locale === "ar" ? "نطاق إيجار" : "Rent band"}</span>
        </div>
        <SaveHeart id={listing.id} label={ui.save || "Save"} />
        <div className="absolute bottom-3 start-3 text-white">
          <div className="fig text-[22px] leading-none drop-shadow tracking-tight">{price != null ? Number(price).toLocaleString() : ui.onRequest}</div>
          <div className="mt-1 text-[10px] opacity-90">{lease ? ui.perSqmYear : ui.sar}</div>
        </div>
      </div>
      <div className="p-4">
        <h3 className="font-display text-[17px] leading-snug text-charcoal line-clamp-1">{title}</h3>
        <div className="mt-1 text-[13px] text-charcoal/55">{place}{place ? " · " : ""}<bdi dir="ltr">{listing.area_sqm} {sqm}</bdi>{listing.building_grade !== "n_a" ? " · " + gradeLabel(listing.building_grade, locale) : ""}</div>
        <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
          {/* This tick used to be unconditional, then it read the publish gate. It now
              names the gates this record has actually cleared. */}
          {badges.length > 0 ? (
            <span className="inline-flex items-center gap-1 text-[12px] text-charcoal/50">
              {/* The hex is literal because var() does not resolve in an SVG stroke
                  presentation attribute, and this tick once rendered off-palette teal,
                  which both broke the reservation and made the strongest signal on the
                  card read as decoration. Each badge is an evidence-backed verification
                  naming its own gate, so the tick carries confirmed green (D11/D24). */}
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#1B7A50" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
              {badges.join(locale === "ar" ? "، " : " · ")}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[12px] text-charcoal/40">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v5"/><path d="M12 16.5v.01"/></svg>
              {ui.verificationIncomplete}
            </span>
          )}
          <span className="text-[12px] text-charcoal/40 transition group-hover:text-signal">{ui.view} {locale === "ar" ? "←" : "→"}</span>
        </div>
      </div>
    </Link>
  );
}
