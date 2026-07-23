# Phase 1 shared foundations: integrated design and implementation proposal (revised)

WS07 to WS14, delivered in four packages. Foundations only: no page redesign
(that is Phase 2, Home first). Harbor-led and restrained; "premium" means
confident, intelligent and useful, never gold, oversized type, or decoration.
Every package ships with the standard gate plus live EN and AR evidence at 320,
390, 430, 768, 1024 and 1440 px, and is held for Codex design review. No em
dashes anywhere. The preview stays noindex; owner-deferred launch items (domain,
legal, final range methodology, column rename) stay out of scope.

Revised per Codex review: WS07 token categories completed, inline Arabic tracking
and font removed at source, a hardcoded-prose allowlist defined, the PWA entry
decision fixed, the no-private-cache rule restated, and the PKG-1B live-audit
visual corrections recorded.

## Why foundations before Home

Three defects are systemic, not page-local. Arabic text inherited the Latin UI
font because inline `fontFamily: var(--sans)` overrode the RTL rule; inline
negative letter-spacing sat on Arabic headings; and there is no shared component
or data-state layer, so pages reinvent cards, empty states and metadata. PKG-1A
fixes the first two at the token level and at the source of the offending inline
declarations. The rest follow.

## PKG-1A (this package) tokens and bilingual typography (WS07, WS08)

Status: implemented in this handback.

**WS08 typography.** `--sans` and `--serif` are now redefined under
`html[dir="rtl"]` so every inline `var(--sans)` resolves to IBM Plex Sans Arabic
in RTL, fixing the Arabic-font leak at the token source rather than by per-element
override. Inline negative `letterSpacing` was removed at source from the flagged
headings (requirements, requirements detail, area, hbu, locations, brokers), so
Arabic tracking is 0 by the cascade, not by a higher-specificity patch. The
Arabic size and leading floors stay in place (body 17 / leading 1.75, prose 1.85,
UI and small-text steps raised under RTL). Numerals remain Western with tabular
figures.

**WS07 tokens.** A complete named token set now lives in `sat-platform.css`
`:root`: semantic colour (brand, on-brand, and status roles verified / info /
attention / error each with a wash), surfaces (canvas, raised, sunken, inverse),
borders and hairline widths, radii (xs, control, card, panel, hero, pill),
typography leading and tracking, container widths (prose, content, wide, max),
elevation aliases plus a focus ring, motion (three durations, two easings, and a
reduced-motion override that also zeroes a motion-scale token for inline
consumers), a z-index layer scale, breakpoint constants, map-state paint tokens,
and a small comparable data-visualization set (a Harbor sequential ramp and the
band/quote semantics). Migrating the existing 400 inline hex occurrences across
60 files to these tokens is scheduled in PKG-1B (WS10 component system); a
`scripts/raw-color-scan.mjs` reports the baseline and the two locked laws
(retired green, satestate gold) are already guarded by the law test.

## PKG-1B responsive shell and component system (WS09, WS10)

**What is weak.** Header, footer, mobile tab bar and dashboard nav are separate
ad-hoc pieces; there is no shared primitive layer, so buttons, fields, selects,
cards, tables, dialogs and toasts are restyled per page with inline drift and
inconsistent focus, RTL and touch behaviour. The 400 raw-hex occurrences live
here.

**What replaces it.** One adaptive shell (header, a single primary nav, mobile
bottom nav for signed-in areas, command/search entry, notice slot, footer) with
no duplicate navigation and no horizontal overflow from 320 to 1920 px, plus a
small accessible primitive set (button, field, select, chip, card, table, dialog,
drawer, toast, tabs, timeline) that owns focus, keyboard, RTL and 44 px hit areas
and consumes the WS07 tokens (this is where the de-hex migration lands).

**Responsive.** Mobile one column with drawers and bottom nav; tablet two-pane
only where it helps; desktop 12-column grid with a sticky contextual sidebar;
never a desktop header plus mobile bottom nav together.

**EN vs AR.** Logical properties throughout, so the shell mirrors truly; nav
order, drawer side and icon direction follow `dir`.

**Recorded PKG-1B visual corrections (from Codex live 390 px audit).** These are
mandatory in PKG-1B, not this package:

1. The English rent range-chart labels collide; the low, average and high labels
   need a layout that never overlaps at narrow widths (stack or space with
   guaranteed gaps, ellipsis on overflow).
2. The numeric range scale must not be mirrored by RTL. Keep numeric magnitude on
   a stable low-to-high LTR axis (wrap the scale track in an LTR isolate) while
   Arabic text around it stays RTL.
3. Increase disclosure and chart-label readability and contrast (larger label
   type off the 10.5 px floor, stronger contrast than the current slate on wash).
4. Verify the chart with long values, decimals and both locales from 320 through
   430 px.

**Evidence.** Screenshots at 320/390/430/768/1024/1440 in both locales with no
overflow, no duplicated nav and no chart-label collision; a keyboard walk of the
primitives; touch-target measurement.

## PKG-1C centralized content and metadata system (WS11, WS12)

**What is weak.** Public prose is partly hardcoded in page files (pricing, area,
proto), escaping the dictionary and controlled vocabulary; there is no unit or
plural formatter, so Arabic can show Latin units and wrong plurals; the metadata
factory does not emit `x-default` or complete Open Graph and Twitter fields, and
several routes inherit generic root metadata.

**What replaces it.** Move all public prose into the two dictionaries behind the
controlled vocabulary; add typed unit, plural and numeral formatters (Arabic
`م²`, correct month plurals, Western numerals with bidi isolation). Upgrade the
metadata factory to reciprocal `en`, `ar` and `x-default`, complete Open Graph
and Twitter, and unique bilingual title and description per public template. The
environment-aware canonical is already done in `site.ts`.

**Hardcoded-prose scan allowlist.** The scan flags visible prose in page and
component source, but explicitly allows these legitimate technical strings: CSS
values and units, `className`/`style`/`aria-*`/`data-*` attribute values, import
paths and URLs, dictionary keys and enum identifiers, single-token codes matching
`^[A-Za-z0-9_.:/-]+$` (for example asset keys, `SATM-` reference codes, unit
strings), numeric-and-punctuation-only strings, and any string wrapped in an
explicit `/* i18n-exempt */` marker. A string is flagged only when it contains a
run of two or more natural-language words in Latin or Arabic script outside those
categories.

**EN vs AR.** The Arabic page is a true semantic mirror, not a shorter summary;
units, plurals and numerals follow Arabic rules while numerals stay Western.

**Evidence.** A hardcoded-prose scan (with the allowlist above) showing none in
public pages; unit and plural snapshot tests; rendered-head capture showing
unique metadata with en, ar and x-default on public templates (indexing stays
off).

## PKG-1D data-state components and PWA app mode (WS13, WS14)

**What is weak.** Loading, empty, error, stale, sample, planned and
permission-denied states are inconsistent or missing, so some surfaces render
blank or falsely positive. The PWA manifest uses an off-palette theme colour and
an English-only start URL, with no considered caching of private data.

**What replaces it.** A single set of data-state components wired to the WS05
release-state vocabulary (Preview, Sample data, Planned, Available, Needs
reconfirmation, Verified), each with text and icon and the separated tones (only
the evidence-backed verified state uses confirmed green; available is Harbor
informational). Fix the manifest to a Harbor-consistent theme and correct icons.

**PWA entry decision.** A single manifest with a neutral routing entry, not
separate per-locale manifests. `start_url` is `/`, and the existing middleware
performs the locale redirect from `/` to `/en` or `/ar` by `Accept-Language`, so
one installed app resolves to the user's language without duplicating manifests
or icons. `scope` stays `/`.

**Service-worker caching rule (preserved).** No response from a private message,
verification, enquiry, deal or document route may enter any service-worker cache.
The worker caches only the static app shell and public, non-personal assets;
everything under the private route prefixes and their APIs is network-only.

**Responsive.** States are full-width sheets on mobile and inline panels on
desktop; install and standalone navigation verified on a mobile browser.

**EN vs AR.** Every state label is bilingual from the WS05 module; layout and
iconography mirror.

**Evidence.** Each state screenshotted EN and AR, mobile and desktop; an install
test; a check that no private route is cached offline.

## Sequence and dependencies

PKG-1A first (this package). Then PKG-1B (shell and components consume the
tokens and carry the de-hex migration and the recorded chart corrections). Then
PKG-1C and PKG-1D. Each is a small, reviewable package with its own evidence
pack, held for Codex design review. Phase 2 (Home) begins only after Phase 1
shared components pass EN, AR, RTL, mobile, accessibility and metadata checks.
