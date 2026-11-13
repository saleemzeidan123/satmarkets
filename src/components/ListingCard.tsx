"use client";
import Link from "next/link";
import type { Listing } from "@/lib/types";
import type { Locale } from "@/i18n/config";
import { assetLabel, gradeLabel, gradePhrase, cityLabel, dealLabel } from "@/lib/labels";
import { listingTitle } from "@/lib/listingTitle";
import SaveHeart from "@/components/SaveHeart";
import { listingVerification, notVerifiedReasonText, verifiedBadgeTexts } from "@/lib/listingVerification";
import { leadMeasureOf } from "@/lib/leadMeasure";
import { fill } from "@/lib/format";
import TypeGlyph from "@/components/TypeGlyph";
import { netArea, priceParts } from "@/lib/listingFigures";
import { getDictionary } from "@/i18n/getDictionary";
import { listedSince, listedLabel } from "@/lib/listedSince";
import { availabilityOf, availabilityShortLabel, availabilityTone } from "@/lib/availability";
import { Verified, Icon } from "@/components/satkit";

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
//
// PKG-DESIGN-3. A third density, `row`: one line of the search results. On a
// wide screen the rows read as a table (property, area, asking price,
// verification) under one set of column headings; on a phone the same markup
// stacks into a card. It is a variant here and not a component of its own
// because the listings page drawing its own row is exactly the drift
// ListingCard.canonical.test.ts exists to stop.
export type ListingCardVariant = "grid" | "lead" | "row";
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
  /** `lead`: the single large feature slot (Home). `row`: one search result. `grid`: every other card grid. */
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
  // PKG-DESIGN-3. The separator was the Arabic comma in both languages, so an
  // English card read "Al Olaya، Riyadh".
  const place = d ? `${dn}${d.city ? (ar ? "، " : ", ") + cityLabel(d.city, locale) : ""}` : "";
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
    const assetChip = <span key="t" className="ld-tag">{asset}</span>;
    return (
      <Link href={href} className="home-lead lift" style={{ border: "1px solid var(--silver)", borderRadius: 16, overflow: "hidden", background: "var(--paper)", textDecoration: "none", color: "inherit", boxShadow: "var(--sh-1)" }}>
        {/* PKG-DESIGN-4B. This panel held a library photograph chosen by hashing
            the listing id. It holds the drawing of the type of space now, as the
            results rows do (claims ledger C46), until the card is handed the
            listing's own photographs. */}
        <div className="lc-leadpic">
          <TypeGlyph type={listing.asset_type} size={132} />
          <div className="lc-leadbadges">{[...badgeNodes, assetChip]}</div>
          <SaveHeart id={listing.id} label={saveLabel} />
        </div>
        <div style={{ padding: "clamp(24px,3vw,38px)", display: "flex", flexDirection: "column", justifyContent: "center", gap: 11 }}>
          <div style={{ fontWeight: 600, fontSize: "1.75rem", color: "var(--ink)", fontVariantNumeric: "tabular-nums" }}>
            <bdi>{pp ? pp.value : ui.onRequest}</bdi>
            {pp && <small style={{ fontSize: "var(--fs-sm)", color: "var(--slate)", fontWeight: 400 }}>{" "}<bdi>{pp.unit}</bdi></small>}
          </div>
          <div style={{ fontSize: "1.3125rem", fontWeight: 600, letterSpacing: "-.01em" }}>{title}</div>
          <div style={{ display: "flex", gap: 9, flexWrap: "wrap", fontSize: "0.875rem", color: "var(--slate)" }}>
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

  // ------------------------------------------------------------------ row
  // One search result. Everything it prints is read off the row: the title, the
  // place, the lead measure the lister recorded for this asset type, the stated
  // area, the asking price with the unit its deal type gives it, and what the
  // verification resolver says about each question this record can answer.
  //
  // THE SQUARES. One per verification question that APPLIES to this listing
  // (an owner listing their own asset has no third party to be authorised by,
  // so that question is left out rather than drawn as unmet). A square is
  // filled, in the reserved green, only where `listingVerification` resolved
  // that question to verified; every other square is an empty dashed outline.
  // The green is stated on that one line here and not in the stylesheet,
  // because greenReservation.test.ts allows it in this file, beside the word
  // that earns it, and nowhere in globals.css.
  // The count is stated in words beside them, so nothing rests on the drawing,
  // and the first recorded reason says why the rest are open. On today's sample
  // corpus that is "0 of 3" on every row, which is the true reading.
  if (variant === "row") {
    const L = dict.listings;
    const dims = listingVerification(listing as any, null).filter((x) => x.state !== "not_applicable");
    const nVerified = dims.filter((x) => x.state === "verified").length;
    const open = dims.find((x) => x.state !== "verified");
    const reason = open && open.reasons.length ? notVerifiedReasonText(open.reasons[0], ar) : null;
    const lead = leadMeasureOf(listing as any, ar);
    const meta = [place, asset, dealLabel(listing.deal_type, locale)].filter(Boolean).join(" · ");
    return (
      <Link href={href} data-lid={mapId} className={"rs-row" + (mapId ? " listing" : "")}>
        <span className="rs-thumb"><TypeGlyph type={listing.asset_type} /></span>
        <span className="rs-main">
          <span className="rs-title">
            <span className="rs-name">{title}</span>
            {ls?.isNew ? <span className="rs-new">{L.newBadge}</span> : null}
          </span>
          <span className="rs-meta">{meta}</span>
          {lead ? <span className="rs-lead">{lead.label} <bdi>{lead.value}</bdi></span> : null}
          {ls ? <span className="rs-sub">{listedLabel(ls.days, ar)}</span> : null}
        </span>
        <span className="rs-cell rs-area">
          <span className="rs-k">{L.colArea}</span>
          <span className="rs-v">{areaFig ?? L.na}</span>
          {grade ? <span className="rs-sub">{gradePhrase(listing.building_grade, locale)}</span> : null}
        </span>
        <span className="rs-cell rs-price">
          <span className="rs-k">{L.colPrice}</span>
          <span className="rs-v"><bdi>{pp ? pp.value : ui.onRequest}</bdi></span>
          {pp ? <span className="rs-sub"><bdi>{pp.unit}</bdi></span> : null}
        </span>
        <span className="rs-cell rs-verif">
          <span className="rs-k">{L.colVerification}</span>
          <span className="rs-checks">
            <span className="rs-squares" aria-hidden="true">
              {dims.map((x) => <span key={x.dimension} className={x.state === "verified" ? "rs-sq on" : "rs-sq"} style={x.state === "verified" ? { background: "var(--verified)" } : undefined} />)}
            </span>
            <span className="rs-count">{fill(L.rowVerified, { n: String(nVerified), m: String(dims.length) })}</span>
          </span>
          {reason ? <span className="rs-sub">{reason}</span> : null}
          {av ? (
            <span className="rs-sub rs-avail">
              <span aria-hidden="true" className="rs-dot" style={{ background: availabilityTone(av.state) }} />
              <span style={{ color: availabilityTone(av.state) }}>{availabilityShortLabel(av, ar)}</span>
            </span>
          ) : null}
        </span>
        <span className="rs-save"><SaveHeart id={listing.id} label={saveLabel} /></span>
      </Link>
    );
  }

  return (
    <Link href={href} data-lid={mapId} className={"card group relative block overflow-hidden" + (mapId ? " listing" : "")}>
      {/* PKG-DESIGN-4B. The card opened on a library photograph with the price
          laid over it. It opens on what the space is: the drawing of its type,
          its title and place, then the stated area and the asking price under
          their own labels, in the same words the results rows use. The chip that
          read "Rent band" on every card whether or not an index band covered the
          listing is gone with the photograph it sat on. */}
      <div className="lc-top">
        <span className="lc-thumb"><TypeGlyph type={listing.asset_type} size={48} /></span>
        <div className="lc-head">
          <h3 className="lc-title">{title}</h3>
          <div className="lc-meta">{[place, asset, dealLabel(listing.deal_type, locale)].filter(Boolean).join(" · ")}</div>
          {showFreshness && ls?.isNew ? <span className="rs-new">{dict.listings.newBadge}</span> : null}
        </div>
        <SaveHeart id={listing.id} label={saveLabel} />
      </div>
      <div className="lc-body">
        <div className="lc-figs">
          <div className="lc-fig">
            <span className="lc-k">{dict.listings.colArea}</span>
            <span className="lc-v">{areaFig ?? dict.listings.na}</span>
            {grade ? <span className="lc-sub">{gradePhrase(listing.building_grade, locale)}</span> : null}
          </div>
          <div className="lc-fig">
            <span className="lc-k">{dict.listings.colPrice}</span>
            <span className="lc-v"><bdi>{pp ? pp.value : ui.onRequest}</bdi></span>
            {pp ? <span className="lc-sub"><bdi>{pp.unit}</bdi></span> : null}
          </div>
        </div>
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
