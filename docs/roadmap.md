# SAT Markets — build state & roadmap

Updated 2026-07-20. Companion to `competitive-research.md` (the OSUS / Property Finder
decisions and the ASSET_FIELDS data-coverage audit).

## Shipped and verified (recent sessions)

- **Google OAuth** for occupier sign-in — live and published to production.
- **Coverage-gated per-asset filters** + completed warehouse technical group + boolean
  facet matching; **PDP facts-grid** promotes present typed-column specs into the
  at-a-glance tiles. (`facets.ts`, `/listings`, `/listings/[id]`)
- **CRITICAL FIX — RLS infinite recursion** (`listings` ↔ `offmarket_access_grants`)
  that was hiding **every** public listing. Fixed via a SECURITY DEFINER helper
  (`account_owns_listing`); all 89 listings visible again. (migration
  `fix_offmarket_listings_rls_recursion`)
- **Attributes backfill** for the six newer asset types (medical, serviced, showroom,
  education, land, mixed_use) so they render facts + coverage-gated filters. Demo data.
- **Broker/agency verification profile** (`/lister/[id]`): trust dossier — Identity
  verified by SAT, live-spaces / lease-sale split / member-since, operator disclosure.
  CR + legal name stay private by design. (added `member_since` to `listers_public`)
- **Occupier slice**: enquiry history (message threads **plus** attributed
  direct-contact leads, deduped by listing — thread wins) + **account-backed saved
  searches with in-app new-match alerts** on `/me`. (`/api/saved-searches`,
  `SavedSearchRows`, `SaveSearch` mirror, auth-callback merge)
- **Report this listing** — governance-as-trust; files into `listing_reports` for SAT
  review; anyone files, only SAT reads. (`/api/report`, `ReportListing`)
- **Enquiry attribution** — `leads.created_by_user_id` stamped from the session; self-
  read RLS so an occupier can read their own enquiries. (migration
  `leads_created_by_attribution`)
- **Typography system (Fable review)** — Playfair → Source Serif 4 (EN display),
  Cairo dropped → IBM Plex Sans Arabic 700 for AR headings (one unified Arabic voice),
  Arabic size/leading uplift + hard no-tracking, Western numerals. Verified EN + AR.
- **Map Phase 0 + Phase 1** — see below.

## Map enhancement (Fable plan) — status

The `/listings` split map was confusing: two overlapping mark systems, full-page reload
on click, tiny pins under big bubbles.

- **Phase 0 — DONE & verified.** Killed the full-page reload → in-place soft-nav filter
  + fly-to + amber selected ring; a filter header above the list (District · N spaces ·
  Clear); a legend (district approx vs exact building); invisible padded hit-areas +
  larger min bubble radius; map reacts to filter via its sources (camera survives).
- **Phase 1 — DONE & verified.** Zoom-gated crossfade: district bubbles own the overview
  and fade out past z12.5 (maxzoom 14.5); exact building pins hidden at overview, fade in
  past z12 (minzoom 11.5). Overview is now clean bubbles only; drill-in reveals pins.
- **Phase 2 — DEFERRED (careful follow-up).** Wire `listings.geom` into the pin pipeline
  to raise exact coverage (16/93 → 54/93) via a PostGIS RPC; city-level aggregation for
  the far-out Kingdom view (fixes central-Riyadh bubble overlap when zoomed out); honest
  "≈" grammar + exact-location chips. Left for a supervised pass — the geom/RPC query
  changes touch the core listings query and shouldn't ship unwatched.

## Open — NEEDS OWNER INPUT (deliberately not done)

- **Microsoft / LinkedIn / Apple OAuth** — each needs its OAuth app created in that
  provider's console (like we did Google together).
- **Saved-search EMAIL alerts** — in-app alert ships; emailing on new matches needs an
  email provider (Resend/SendGrid) + credentials. Which provider?
- **Direct WhatsApp/Call vs mediated enquiry** — a product decision. The PDP still
  exposes direct lister contact, against Fable's advice.
- **Market data** (transactions + price trends) — NO LONGER BLOCKED as of 2026-07-28.
  The sourcing question is answered; see the public data programme below.
- **Report destination** — reports land in `listing_reports` for now; if you want email
  notification or an admin review screen, say so.

## Public data programme (owner ruling, 2026-07-28)

Source: `docs/competitive-paseetah.md`. Paseetah (بسيطة) and its enterprise sibling
Paseet (paseet.ai) sell Saudi real-estate data assembled entirely from public government
sources, which they state themselves: "بيانات دقيقة من وزارة العدل والسجل العقاري وشبكة
إيجار والعديد من المصادر". No FAL licence, no MOU and no data partnership was found.
Their data position is therefore not defensible, and every source is open to us on
identical terms. This closes the long-standing "gated on sourcing KSA commercial data"
blocker above. It is now a build problem, not a sourcing problem.

Five workstreams, in priority order.

**PD1. Official ingestion of MOJ open data.** Through moj.gov.sa/ar/opendata and the
custom data-request form at moj.gov.sa/ar/OpenData/Pages/Request.aspx. Every dataset
enters `source_registry` with its licence, its period and its attribution string before
a single figure renders. **Hard constraint: srem.moj.gov.sa and the Najiz UIs are
interactive portals, not data products, and are never scraped.** A verification-first
exchange cannot be caught taking that shortcut.

**PD2. Ingest the Ejar commercial rent index.** Published at sakani.sa/reports-and-data.
It carries price per square metre for shops, showrooms and offices across six cities
including Riyadh, back to 2019. This is the evidence spine behind the Rent Index context
line that PKG-1C.1 now renders on every listing, building, lister and flyer head.
Highest-value single action in the programme. It interacts with the deferred "final Rent
Index statistical methodology" item: a real series may replace the current development
low/high test ranges, which are labelled "sample indicative range" today.

**PD3. A public, un-gated, bilingual monthly Riyadh CRE bulletin, with the full method
published.** This is the competitive move, not a marketing one. Paseetah gates everything
behind a login at paseetah.com/map and has published zero methodology, so they hold no
public data surface and no search position on any Saudi CRE query. Taking that ground is
what makes a broker cite SAT Markets instead of them, and it gives the site its first
genuinely indexable public asset. **Route policy consequence: this is the first surface
that argues for coming out from under the site-wide noindex, and it must not ship until
its numbers are sourced, periodised and attributed under the existing laws.** No figure
may be published without its source row.

**PD4. Verification via RER deed checks under FAL 1200025510.** The one thing the data
players structurally cannot copy. Their data says a transaction happened; ours says this
owner is this owner. Feeds the existing `gate.ts` dimensions rather than inventing new
ones, and `ownerVerified` stays the truth source.

**PD5. Government recognition and procurement listing.** Etimad announcement
240141005052 (مركز الإسناد و التصفية, published 11/01/2024, closed) was a **limited**
competition naming exactly three permitted platforms: منصة ساس, منصة سهيل (the Ministry
of Justice's own) and منصة بسيطة. Paseetah's only genuinely non-copyable asset is being
on a government buyer's recognised-platform list, and it was acquired by being early and
visible, not by holding a licence. Getting SAT Markets onto those lists is a named
objective. The buyer is itself a lead: a liquidation centre needs verified ownership,
asset search and comparable evidence, which is this product almost exactly.

Explicit non-goal: **no consumer price war.** Paseetah prices a one-off property report
at SAR 49.99 and plans from SAR 90.99. Competing there buys a consumer product we do not
want, at margins that cannot fund verification.

Also open from the dossier: **منصة ساس** appeared only in the tender and is an
unresearched fourth competitor. Aqar (aqar.fm) is the real clock, because it already
owns the supply side and the traffic and has begun adding deal data.

## Parked (deliberate)

- **`/compare`** — stub until post-launch (facts-only, no winner-highlighting).
- **Off-market** — dormant DB scaffolding; recursion it caused is now fixed.

## Follow-ups (buildable, lower priority)

- Exact map pins beyond `building_id` (Phase 2 geom wiring).
- Central-Riyadh bubble overlap at city zoom (Phase 2 city aggregation).
