# Design audit against defaults, 2026-11-12

Step 1 of the design method in the owner directive (section 3.6). The aim of the redesign is a product nobody takes for a template or for the work of a model. This audit names what on the present screens reads as a default, with a count where a count is possible, so that the redesign can be checked against it later.

## Method and limits

- Local server on `main` at `1334634`, preview mode, Chromium. Eleven routes captured full-page at 1440 px and 390 px with reduced motion on (the scroll reveal otherwise hides sections from a full-page capture). Counts are read from the rendered DOM and computed styles, not estimated.
- **Not covered:** listing cards, the listing detail page and the Evidence Passport. The local server has no database, so those pages render their empty or error state. They are audited next, from the deployed site.
- The local build falls back to system fonts where the web fonts cannot be fetched, so nothing here judges letterforms. Structure, spacing, colour and component patterns are unaffected.

## What was measured (home page)

| Measure | Value |
| --- | --- |
| Page height, 1440 px | 5,141 px |
| Page height, 390 px | 8,263 px, about ten phone screens |
| Distinct corner radii in use | 9 (6, 7, 8, 10, 12, 13, 16, 18, 20 px) |
| Upper-case, letter-spaced eyebrow labels | 13 |
| Cards | 18 |
| Icons | 48 |
| Buttons and button-styled links | 27 |
| Headings | 1 h1, 6 h2 |

Other routes, for scale: the verification page has 20 cards at one radius and 26 monospace text runs; the Rent Index page has 7 eyebrow labels and 9 shadowed elements on a page under 2,000 px tall.

## Findings

### A. Patterns that read as defaults

1. **The hero.** A centred headline over a darkened skyline photograph, with a pill eyebrow carrying a dot above it and a two-tone serif headline. This is the single most recognisable template opening on the web.
2. **A frosted search panel** with a row of icon tiles for asset types and a row of "Popular" chips beneath it.
3. **Four identical persona cards** directly under the hero.
4. **An eyebrow over every section.** Thirteen on the home page. A label that appears on everything encodes nothing.
5. **Numbered markers on content that is not a sequence.** "Four jobs, one neutral place" numbers its cards 01 to 04. Nothing is done in that order.
6. **Icon tiles as decoration.** Forty-eight icons on one page, most in a tinted rounded square at the top of a card, none carrying information the heading does not.
7. **Large rounded dark panels** as section breaks, and a second one inside the footer.
8. **Cream alert cards** for error and empty states, at the size and weight of a feature.
9. **A floating round button** that sits over content on desktop and over the search panel on a phone.
10. **Scroll reveal on every section.**
11. **The typeface trio.** A serif for display, a grotesque for text and a monospace for labels and figures is the stock pairing of the moment, whatever the faces are.

### B. Structural problems, independent of style

12. **No radius system in practice.** Nine radii on one page. The tokens define a scale; the page does not follow one.
13. **The home page says one thing three times.** "Four jobs, one neutral place", "Everything the market needs, in one place" and the "One exchange" eyebrow are the same sentence.
14. **Two calls to action back to back.** The blue "List your space, or find your next one" panel is followed immediately by the dark "List, lease or invest, on the record" panel, with the same two buttons.
15. **Planned features are given equal space.** Three of nine feature cards describe things that do not exist yet. They are labelled honestly, and they still spend a third of the grid on absence.
16. **Length.** Ten phone screens before the footer, for a page whose job is to get a reader to a search or a listing.
17. **Nothing on the page is a commercial space.** The only image is a skyline. There is no plan, no floor, no building, no figure with a source and a date above the fold. The subject's own material is missing from its own front page.
18. **Arabic is the English page mirrored.** The order, the line breaks and the rhythm are the English ones. The headline breaks into three ragged lines at 390 px. An Arabic-first layout would be composed in Arabic and then translated into English, not the reverse.

### C. Against the three looks a model reaches for by default

The repository's own `frontend-design` skill names three. The present design is a blend of the first two and none of the third:

- Warm cream with a high-contrast serif and a terracotta accent: **partly.** The serif display and the cream alert cards are from this family.
- Near-black with one bright accent: **partly.** The dark hero, the dark panels and the single Harbor accent.
- Broadsheet with hairline rules and no radius: **no.**

The redesign must not solve this by moving wholesale to the third.

## What is right and must survive

- **The words.** Literal verification wording, absences stated as absences, every figure with its source and period. This is the product's real distinction and no competitor copy reads like it.
- **Colour discipline.** Green means evidence-backed verification and nothing else. Harbor identifies the platform. No gold.
- **The floor.** Keyboard focus, touch targets, reduced motion, right-to-left correctness and the reflow rules are tested and hold.
- **Bilingual parity** of content, as distinct from layout.

## What this audit asks of the redesign

1. Open with the subject's own material: a real floor, a building stack, a figure on a dimension line with its source and date.
2. One signature element, built from recorded data, and quiet everywhere else.
3. Structural devices only where they encode something true: numbers for sequences, eyebrows for categories a reader needs, icons where they carry a state.
4. One radius scale, followed.
5. A home page a phone reader can finish in three or four screens.
6. Arabic composed first.
7. Error and empty states at the weight of a note, not of a feature.

## Next steps

- Audit the listing card, listing detail and Evidence Passport from the deployed site.
- Owner taste record (method step 2), then the design system before any screen (step 4).
