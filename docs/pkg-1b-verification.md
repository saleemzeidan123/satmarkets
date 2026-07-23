# PKG-1B live verification (2026-07-23)

All checks run against the production preview via the browser (computed styles and
layout metrics), EN and AR. Sandbox egress to the host is blocked, so evidence is
DOM/computed-style based rather than screenshot pixels; the remote browser window
also would not shrink below ~1560px content width, so narrow-viewport overflow was
measured by clamping the top content container to each QA width AND applying the same
mobile media state the real viewport would (hiding the desktop-only map panel and
advisor side rails, whose display:none breakpoints are in the CSS).

## Area 1 — DataState (listings empty state, /en/listings with an empty map bbox)
role="status", border-radius 16px (--r-panel), neutral tone bg rgb(238,241,245)
(--surface-sunken), SVG glyph present, centered text, clear-area action present.

## Area 2 — token migration
Pages render; tokens resolve to real colours: search form bg rgb(255,255,255)
(--paper), Harbor rgb(58,110,165) resolves on brand elements. Paired value check at
build time: 142 substitutions, 0 mismatches; guard: no var() in SVG/lib strings.

## Area 3 — mobile search
.search input computed min-width 0px live; `.search input{min-width:0}` present in the
served CSS. Listings container horizontal overflow at 320/390/430: 0 / 0 / 0 in EN
and AR (with the <=1080px map-hidden reflow applied).

## Area 4 — Rent Index + Advisor ranges
/ar/rent-index: every band cell wrapped in bdi[dir=ltr]; range reads low-on-left
(lowIsLeft true). Advisor bar (EN and AR): bar direction ltr, scale direction ltr,
scale shows only low+high with lowIsLeft true, average on its own centred line
("average 1,420.5 · SAR/m²/year" EN; "المتوسط 1,420.5 · ريال/م²·سنة" AR) — the EN
mid-label collision is gone and the RTL scale stays low-to-high.

## Area 5 — PWA + private cache
manifest.webmanifest live: start_url "/", theme_color #3A6EA5, background_color
#FFFFFF. meta theme-color #3A6EA5. Private route /en/saved returns
`Cache-Control: private, no-cache, no-store, max-age=0, must-revalidate`.

## Area 6 — touch targets / focus / motion
`@media (pointer: coarse) { … min-height:44px }` present in the served CSS (activates
on touch pointers). Keyboard :focus-visible and prefers-reduced-motion rules already
system-wide (verified present).

## Responsive overflow summary (horizontal overflow px, mobile media state applied)
| Page | 320 | 390 | 430 |
| --- | --- | --- | --- |
| /en/listings | 0 | 0 | 0 |
| /ar/listings | 0 | 0 | 0 |
| /en/rent-index | 0 | 0 | 0 |
| /ar/rent-index | 0 | 0 | 0 |
| /en/advisor | 0 | 0 | 0 |
| /ar/advisor | 0 | 0 | 0 |

The desktop-only listings map panel (display:none at <=1080px) and advisor side rails
(<=820px / <=1100px) account for the only constrained-test overflow; both are hidden
at every QA width, so the real mobile viewport has none.

## Outstanding for PKG-1B closure (owner)
- Add .github/workflows/arabic-font.yml manually (deploy PAT lacks workflow scope);
  the CI font gate goes green once that file is present and the workflow runs.
