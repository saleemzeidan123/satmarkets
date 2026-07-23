# Phase 1 shared foundations: integrated design and implementation proposal

WS07 to WS14. One plan, delivered in four coherent packages. Foundations only:
no page redesign (that is Phase 2, Home first). Harbor-led and restrained;
"premium" means confident, intelligent and useful, never gold, oversized type,
or decoration. Every package ships with the standard gate plus live EN and AR
evidence at 390, 768, 1024 and 1440 px, and is held for Codex review.

The current preview stays noindex; owner-deferred launch items (domain, legal,
final range methodology, column rename) remain out of scope.

## Why foundations before Home

Three defects are systemic, not page-local, so fixing them once centrally is
worth more than any single page: Arabic text inherits the Latin UI font because
inline `fontFamily: var(--sans)` overrides the RTL rule; inline negative
letter-spacing sits on Arabic headings; and there is no shared component or
data-state layer, so every page reinvents cards, empty states and metadata. Home
built on today's foundations would inherit all three. Phase 1 removes them once.

---

## PKG-1A — Design tokens + bilingual typography (WS07, WS08)

**What is weak.** `--sans` resolves to Hanken Grotesk regardless of direction, and
components set `fontFamily: var(--sans)` inline, which beats the `[dir="rtl"]`
family rule, so most Arabic UI text renders in the Latin family. Inline
`letterSpacing: "-.02em"` survives on Arabic H1s across requirements, area, hbu,
locations and brokers. Arabic sizes are not held to a readable floor. Tokens
exist but are not the single source: some page-specific constants bypass them.

**What replaces it.** Make `--sans` and `--serif` direction-aware at the token
level: under `[dir="rtl"]`, `--sans` and `--serif` both resolve to IBM Plex Sans
Arabic, so every inline `var(--sans)` becomes correct automatically without
touching each component. A locale-aware type utility sets Arabic tracking to 0
and overrides inline display tracking. Codify the scale from the audit: EN body
16/1.55, AR body 17/1.75; EN UI 14/1.4, AR UI 15/1.6; small text floors EN 12 /
AR 13; H1 mobile ~36–40 / desktop ~56–64 EN, ~52–60 AR. Numerals stay Western
with tabular figures and bidi isolation on mixed runs. Audit page-specific colour
and spacing constants into approved tokens; keep the locked Harbor `#3A6EA5` and
confirmed `#1B7A50`, no gold anywhere.

**Responsive.** Type scale is fluid across 390→1440; H1 uses a clamped size, not
a fixed one. Touch targets ≥44px are enforced from the token layer for primary
controls.

**EN vs AR.** Different family, larger body, more leading, zero tracking, no
uppercase transform in Arabic (hierarchy by weight and scale, not caps).

**Why.** Legibility and correctness: Arabic currently reads in the wrong font,
which is the single most visible quality defect. This is the highest-leverage
package and unblocks every later one.

**Evidence.** Computed-style capture on representative pages showing no Arabic
node in the Latin family outside an explicit Latin allowlist and zero non-zero
tracking on Arabic; screenshots EN/AR at all four widths; a token test asserting
no page ships a raw hex outside the token set and no satestate gold.

---

## PKG-1B — Responsive app shell + component system (WS09, WS10)

**What is weak.** Header, footer, mobile tab bar and dashboard nav are separate
ad-hoc pieces; there is no shared primitive layer, so buttons, fields, selects,
cards, tables, dialogs and toasts are re-styled per page with inline drift and
inconsistent focus, RTL and touch behaviour.

**What replaces it.** One adaptive shell (header, a single primary nav, mobile
bottom nav for signed-in areas, command/search entry, notice slot, footer) with
no duplicate navigation and no horizontal overflow from 320 to 1920px. A small
accessible primitive set (button, field, select, chip, card, table, dialog,
drawer, toast, tabs, timeline) that owns focus, keyboard, RTL and 44px hit areas
so pages compose rather than restyle.

**Responsive.** Mobile: one column, drawers for filters, bottom nav, sticky
primary action only when it does not cover content. Tablet: two-pane only where
it helps. Desktop: 12-column grid, restrained width, sticky contextual sidebar.
Never a desktop header plus mobile bottom nav together.

**EN vs AR.** Logical properties throughout (`padding-inline`, `inset-inline`),
so the shell mirrors truly; nav order, drawer side and icon direction follow
`dir`, not hardcoded left/right.

**Why.** Consistency and trust: a coherent shell and components reduce cognitive
load and make the product feel like one system, and remove the per-page drift
that makes small bugs recur.

**Evidence.** Screenshots at 320/390/768/1024/1440 in both locales with no
overflow or duplicated nav; a keyboard walk of the primitives (focus visible, no
trap); touch-target measurement.

---

## PKG-1C — Centralized content + metadata system (WS11, WS12)

**What is weak.** Public prose is partly hardcoded in page files (pricing, area,
proto), so it escapes the dictionary and the controlled vocabulary; there is no
unit/plural formatter, so Arabic shows Latin `m²` and wrong plurals; the metadata
factory does not emit `x-default` or complete OG/Twitter, and several routes
inherit generic root metadata.

**What replaces it.** Move all public prose into the two dictionaries behind the
controlled vocabulary; add typed unit, plural and numeral formatters (Arabic `م²`,
correct month plurals, Western numerals with bidi isolation). Upgrade the
metadata factory to environment-aware canonical (already done in `site.ts`) plus
reciprocal `en`/`ar`/`x-default`, complete OG/Twitter, and unique bilingual
title/description per public template.

**Responsive.** Not layout-facing, but share images render correctly at social
crop sizes; formatters produce the same output server and client.

**EN vs AR.** The Arabic page is a true semantic mirror, not a shorter summary;
units, plurals and numerals follow Arabic rules while numerals stay Western.

**Why.** Comprehension and discoverability integrity: centralized content stops
English leaking into Arabic and stops metadata drift; correct units and plurals
are a direct Arabic-quality signal.

**Evidence.** A hardcoded-prose scan showing none in public pages; unit/plural
snapshot tests; rendered-head capture showing unique metadata with en/ar/
x-default on public templates (indexing stays off).

---

## PKG-1D — Data-state components + PWA app mode (WS13, WS14)

**What is weak.** Loading, empty, error, stale, sample, planned and
permission-denied states are inconsistent or missing, so some surfaces render
blank or falsely positive. The PWA manifest uses an off-palette theme colour
(`#1C1A15`) and an English-only `start_url`, and there is no considered caching
of private data.

**What replaces it.** A single set of data-state components wired to the WS05
release-state vocabulary (Preview, Sample data, Planned, Available, Needs
reconfirmation, Verified), each with text and icon, never colour alone. Fix the
manifest to a Harbor-consistent theme, locale-aware entry, correct icons, and a
conservative service worker that never caches private messages, verification
evidence or deal documents.

**Responsive.** States are full-width sheets on mobile, inline panels on desktop;
install and standalone navigation verified on a mobile browser.

**EN vs AR.** Every state label is bilingual from the WS05 module; RTL layout and
iconography mirror.

**Why.** Honesty and polish: explicit states prevent a blank or falsely positive
screen and make sample-vs-real unmistakable, which is core to the trust brand;
the PWA makes the product feel app-native without a native build.

**Evidence.** Each state screenshotted EN/AR mobile and desktop; an install test;
a check that no private route is cached offline.

---

## Sequence and dependencies

PKG-1A first (unblocks all). Then PKG-1B (shell/components consume tokens). Then
PKG-1C and PKG-1D in parallel-safe order (content/metadata, then data states/PWA
which reuse the WS05 vocabulary and the components). Each is a small, reviewable
package with its own evidence pack; I will implement them in sequence without
per-decision approval once this plan is approved, and hold each for Codex design
review before calling it complete. Phase 2 (Home) begins only after Phase 1's
shared components pass EN, AR, RTL, mobile, accessibility and metadata checks.
