"use client";
import Link from "next/link";
import type { Listing } from "@/lib/types";
import type { Locale } from "@/i18n/config";
import { photoFor } from "@/lib/photos";
import { assetLabel, gradeLabel, cityLabel, dealLabel } from "@/lib/labels";
import { listingTitle } from "@/lib/listingTitle";
import SaveHeart from "@/components/SaveHeart";
import { verifiedBadgeTexts } from "@/lib/listingVerification";
import { netArea, priceParts } from "@/lib/listingFigures";
import { getDictionary } from "@/i18n/getDictionary";
import { listedSince, listedLabel } from "@/lib/listedSince";
import { availabilityOf, availabilityShortLabel, availabilityTone } from "@/lib/availability";
import { Ph, Verified, Icon } from "@/components/satkit";

// PKG-SUP2. The `sqm` prop is gone. It was a unit string threaded in from two
// callers, which meant this card could be handed a unit that did not match the
// figure beside it, and it was interpolated outside the guard on a nullable
// column, so a listing with no stated area printed "null m2" on the most
// viewed surface on the site. The unit now travels with the figure.
//
// PKG-CARD1. This used to be a single, un-variant card wired to Building and
// Saved, while Home, Listings Search and the Lister profile each hand-rolled
// their own near-duplicate markup for the same underlying row. Every one of
// those private copies had drifted from this one on at least one of the
// things a listing card must never get wrong: Home's price caption ran a
// lease unit under a sale price, Search drew its own decorative heart with no
// handler (finding 173's class, repeated), and the Lister profile showed
// nothing about verification at all. This file is now the one place a
// listing becomes a card, in the two densities the platform actually needs:
// `lead`, the single large feature slot on Home, and `grid`, every other
// card-shaped listing on the site. `showFreshness` and `indexPosition` are
// additive, opt-in props for the two facts only some surfaces show (how
// recently a listing was listed/confirmed, and where its rent sits in the
// published band); a caller that does not pass them gets exactly the card
// this file drew before they existed.
export type ListingCardVariant = "grid" | "lead";
export type IndexPosition = { v: "below" | "within" | "above"; pos: number };

export default function ListingCard({
  listing,
  locale,
  ui,
  variant = "grid",
  indexPosition = null,
  showFreshness = false,
  mapId,
}: {
  listing: Listing;
  locale: Locale;
  ui: any;
  /** `lead`: the single large feature slot (Home). `grid`: every other card grid. */
  variant?: ListingCardVariant;
  /** Where this listing's price sits in the published Rent Index band, when a caller has one to show. */
  indexPosition?: IndexPosition | null;
  /** Adds the "listed N days ago" / availability lines a browse surface can afford and a compact grid cannot. */
  showFreshness?: boolean;
  /**
   * The id the listings map's hover sync looks for on this card, via
   * `.listing[data-lid]` in ListingsMap.tsx. Left unset, this card carries no
   * `.listing` class and no `data-lid`, exactly as it always has for Building
   * and Saved, which draw no map beside their grids.
   */
  mapId?: string;
}) {
  const ar = locale === "ar";
  const dict = getDictionary(ar ? "ar" : "en");
  const title = listingTitle(listing, ar ? "ar" : "en");
  const d = listing.districts;
  const dn = d ? (ar ? d.name_ar : d.name_en) : "";
  const place = d ? `${dn}${d.city ? "، " + cityLabel(d.city, locale) : ""}` : "";
  // ADV-1, owner decision O3. This read passesGate, the PUBLISH gate, and printed
  // "Verified listing" when it returned true. Two problems. The publish gate mirrors
  // the database trigger, whose ownership and authorisation legs default to PASS when
  // the column is unset, so a row nobody had looked at cleared two of its four legs by
  // being silent. And a listing is not the thing that gets verified: an owner, an
  // authorisation, a right to market and a permit are, separately. The card now shows
  // exactly what this record earned, which today is nothing on all 88 published rows.
  const badges = verifiedBadgeTexts(listing as any, null, ar);
  // PKG-SUP2, finding 123. This is a CLIENT component and this was
  // `toLocaleString()` with no locale argument, so the digits resolved from the
  // DEVICE. On a phone set to Arabic, the public explore grid rendered its
  // asking prices in Arabic-Indic numerals, against a standing law that says
  // Western numerals in both languages.
  const pp = priceParts(listing.deal_type === "sale" ? listing.sale_price : listing.asking_rent_sqm, listing.deal_type, locale, "long");
  const areaFig = netArea(listing.area_sqm, locale);
  const grade = listing.building_grade && listing.building_grade !== "n_a" ? gradeLabel(listing.building_grade, locale) : "";
  const photo = photoFor(listing.asset_type, listing.id);
  const asset = assetLabel(listing.asset_type, locale);
  const href = `/${locale}/listings/${listing.id}`;
  // ADV-1D. `ui.save` does not exist on the `ui` dictionary slice every caller
  // passes here (it holds `view`, `onRequest`, `verificationIncomplete`,
  // nothing named `save`), so this always fell back to the English literal
  // "Save" regardless of locale: an Arabic reader on Building or Saved met an
  // English aria-label on the one interactive control the photo carries.
  // `common.save` is the string every other save affordance on the platform
  // already reads (MarketingHome's `C.save`), so this now agrees with them
  // instead of silently failing closed to English.
  const saveLabel = dict.common.save;

  // The freshness and availability lines used to live only in
  // `listings/page.tsx`'s own card markup, reading `listedSince` and
  // `availabilityOf` off the raw row itself, so a listing card drawn anywhere
  // else could not show them even though the columns they read travel on every
  // `Listing`. They are opt-in here (a Building or Saved grid is dense enough
  // without them) but are the platform's one implementation, not a second one
  // kept alive beside this file.
  const ls = showFreshness ? listedSince(listing.created_at) : null;
  const av = showFreshness ? availabilityOf((listing as any).availability_confirmed_at) : null;

  const H = dict.home;
  const idxCaption = indexPosition ? (indexPosition.v === "within" ? H.idxWithin : indexPosition.v === "below" ? H.idxBelow : H.idxAbove) : null;
  // Unchanged from the markup this was lifted out of (MarketingHome's `idxBar`):
  // the mark's position is a numeric gauge along a fixed low-to-high track, not
  // a piece of UI chrome whose side depends on reading direction, so it keeps
  // the same physical `left` the gauge track itself is drawn with.
  const idxBar = indexPosition ? (
    <div className="idxbar">
      <div className="idxbar-track"><span className="idxbar-mark" style={{ left: Math.round(indexPosition.pos * 100) + "%" }} /></div>
      <div className="idxbar-cap" data-v={indexPosition.v}>{idxCaption}</div>
    </div>
  ) : null;

  if (variant === "lead") {
    const badgeNodes = badges.map((t, i) => <Verified key={`v${i}`} text={t} />);
    const assetChip = <span key="t" className="tag" style={{ background: "rgba(255,255,255,.9)" }}>{asset}</span>;
    return (
      <Link href={href} className="home-lead lift" style={{ border: "1px solid var(--silver)", borderRadius: 16, overflow: "hidden", background: "var(--paper)", textDecoration: "none", color: "inherit", boxShadow: "var(--sh-1)" }}>
        <Ph src={photo} label={`${asset}, ${place}`} h={284} badges={[...badgeNodes, assetChip]}>
          <SaveHeart id={listing.id} label={saveLabel} />
        </Ph>
        <div style={{ padding: "clamp(24px,3vw,38px)", display: "flex", flexDirection: "column", justifyContent: "center", gap: 11 }}>
          <div style={{ fontFamily: "var(--mono)", fontWeight: 500, fontSize: "1.75rem", color: "var(--ink)" }}>
            <bdi>{pp ? pp.value : ui.onRequest}</bdi>
            {pp && <small style={{ fontSize: "var(--fs-sm)", color: "var(--slate)", fontWeight: 400 }}>{" "}<bdi>{pp.unit}</bdi></small>}
          </div>
          <div style={{ fontSize: "1.3125rem", fontWeight: 600, letterSpacing: "-.01em" }}>{title}</div>
          <div style={{ display: "flex", gap: 9, flexWrap: "wrap", fontFamily: "var(--mono)", fontSize: "var(--fs-xs)", color: "var(--slate)" }}>
            {place ? <span>{place}</span> : null}
            {areaFig ? <><span>·</span><span>{areaFig}</span></> : null}
            <span>·</span><span>{asset}</span>
          </div>
          {idxBar}
          <span style={{ marginTop: 8, fontSize: "var(--fs-sm)", fontWeight: 600, color: "var(--azure-d)", display: "inline-flex", alignItems: "center", gap: 7 }}>{ui.view} <Icon.arrow size={16} /></span>
        </div>
      </Link>
    );
  }

  return (
    <Link href={href} data-lid={mapId} className={"card group relative block overflow-hidden" + (mapId ? " listing" : "")}>
      <div className="relative h-52 overflow-hidden">
        <img src={photo} alt={title} className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.06]" loading="lazy" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/5 to-transparent" />
        <div className="absolute start-3 top-3 flex flex-wrap items-center gap-1.5 max-w-[calc(100%-3.25rem)]">
          <span className="rounded-md bg-white/90 px-2 py-1 text-[0.625rem] font-semibold text-charcoal ring-1 ring-black/5 backdrop-blur">{asset}</span>
          <span className="rounded-md bg-signal px-2 py-1 text-[0.625rem] font-semibold text-white backdrop-blur">{dealLabel(listing.deal_type, locale)}</span>{/* Rent-Index coverage is INFORMATIONAL (D24: informational = Harbor), not a
              status and not a verification. It was an off-palette teal, which D24 rules
              out; it is now the Harbor wash so it reads as information beside, not above,
              the solid deal badge. */}
          <span className="rounded-md bg-azure-wash px-2 py-1 text-[0.625rem] font-semibold text-harbor-d backdrop-blur">{locale === "ar" ? "نطاق إيجار" : "Rent band"}</span>
          {showFreshness && ls?.isNew ? <span className="rounded-md bg-harbor px-2 py-1 text-[0.625rem] font-semibold text-white backdrop-blur">{dict.listings.newBadge}</span> : null}
        </div>
        <SaveHeart id={listing.id} label={saveLabel} />
        <div className="absolute bottom-3 start-3 text-white">
          <div className="fig text-[1.375rem] leading-none drop-shadow tracking-tight"><bdi>{pp ? pp.value : ui.onRequest}</bdi></div>
          {pp && <div className="mt-1 text-[0.625rem] opacity-90"><bdi>{pp.unit}</bdi></div>}
        </div>
      </div>
      <div className="p-4">
        <h3 className="font-display text-[1.0625rem] leading-snug text-charcoal line-clamp-1">{title}</h3>
        <div className="mt-1 text-[0.8125rem] text-charcoal/65">{[place, areaFig, grade].filter(Boolean).join(" · ")}</div>
        {indexPosition ? idxBar : null}
        {showFreshness && (ls || av) ? (
          <div className="mt-2 flex flex-col gap-1">
            {ls ? <div className="mono text-charcoal/65" style={{ fontSize: "0.65625rem", letterSpacing: ".02em" }}>{listedLabel(ls.days, ar)}</div> : null}
            {/* Finding 46. The reserved verification green stays off this line: the
                tick in the footer below is the only claim on this card that an
                evidence-backed check was run, and availability is a date the
                lister typed, not a check anyone ran against it. */}
            {av ? (
              <div className="flex items-center gap-1.5">
                <span aria-hidden="true" style={{ width: 6, height: 6, borderRadius: "50%", background: availabilityTone(av.state), display: "inline-block", flex: "0 0 auto" }} />
                <span className="mono" style={{ fontSize: "0.65625rem", letterSpacing: ".02em", color: availabilityTone(av.state) }}>{availabilityShortLabel(av, ar)}</span>
              </div>
            ) : null}
          </div>
        ) : null}
        <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
          {/* This tick used to be unconditional, then it read the publish gate. It now
              names the gates this record has actually cleared. */}
          {badges.length > 0 ? (
            <span className="inline-flex items-center gap-1 text-[0.75rem] text-charcoal/65">
              {/* The hex is literal because var() does not resolve in an SVG stroke
                  presentation attribute, and this tick once rendered off-palette teal,
                  which both broke the reservation and made the strongest signal on the
                  card read as decoration. Each badge is an evidence-backed verification
                  naming its own gate, so the tick carries confirmed green (D11/D24). */}
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#1B7A50" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
              {badges.join(locale === "ar" ? "، " : " · ")}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[0.75rem] text-charcoal/65">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v5"/><path d="M12 16.5v.01"/></svg>
              {ui.verificationIncomplete}
            </span>
          )}
          <span className="text-[0.75rem] text-charcoal/65 transition group-hover:text-signal">{ui.view} {locale === "ar" ? "←" : "→"}</span>
        </div>
      </div>
    </Link>
  );
}
