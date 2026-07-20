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
- **Market data** (transactions + price trends) — gated on sourcing KSA commercial data
  (REGA / Ejar / Suhail).
- **Report destination** — reports land in `listing_reports` for now; if you want email
  notification or an admin review screen, say so.

## Parked (deliberate)

- **`/compare`** — stub until post-launch (facts-only, no winner-highlighting).
- **Off-market** — dormant DB scaffolding; recursion it caused is now fixed.

## Follow-ups (buildable, lower priority)

- Exact map pins beyond `building_id` (Phase 2 geom wiring).
- Central-Riyadh bubble overlap at city zoom (Phase 2 city aggregation).
