# PKG-2A closure: discovery redesign

Commit `b3e2dfa`, deployment `dpl_HRS2foU5FXoNyNxFUHpA9EjDkqn7` (READY).
Plan: `docs/pkg-2a-plan.md`.

## What the package was for

The search box on `/listings` accepted a sentence and did nothing with it. Every
term returned the same unfiltered page, so the box was a decoration that looked
like a capability. That is the same defect class as an unattributed figure: the
person cannot tell what the answer on screen is an answer to. PKG-2A makes the
sentence do work, and makes every reading the parser took visible and reversible.

## Scope delivered

**A deterministic bilingual query parser** (`src/lib/search/queryParse.ts`). No
model, no inference, no invented constraint. It reads asset kind, grade, fit-out,
deal, city, district and place, a price ceiling, a price floor and an approximate
size, in English and Arabic, from a closed vocabulary supplied by the page. Terms
it does not recognise are reported as not used rather than silently dropped.
`parseQuery`, `dropKeys`, `matchesQuery` and `matchesTerms` are pure functions and
are covered by 22 tests.

**A single folding law** (`src/lib/textFold.ts`). `toWesternDigits`, `foldText`
and `prettifyKey` are now the one place Arabic-Indic digits, diacritics, hamza
forms, tatweel and case are normalised. `src/lib/market/numericIntent.ts` had its
own local digit fold; it now re-exports from `textFold` so the two surfaces cannot
drift apart.

**Server-side `q` on `/listings`.** The query narrows the actual result set on the
server. The GET form now carries every other chosen constraint as hidden inputs,
so typing a sentence narrows what is on screen instead of resetting the deal,
city, district, grade, fit-out, facet, sort and map area a person had already
chosen.

**The transparency row.** Each reading the parser took is shown back as a chip and
each one can be withdrawn (`?qx=`). Unrecognised terms get an explicit "not used"
line with the reason. A parse that understood nothing says so, and still renders
the full unfiltered set rather than pretending to have filtered.

**Owner ruling 5: the raw-slug defect.** `cityLabel()` is fold-tolerant and falls
back to `prettifyKey(t)` rather than echoing the raw slug. `CITY_ALIAS` and
`CITY_BY_FOLD` carry the slug and Arabic forms.

**Finding 36: `WebSite` and `SearchAction` schema.** Withheld until the search
endpoint could honour the claim, emitted per locale from the locale layout so the
Arabic document never advertises an English entry point.

## Gate

| Check | Result |
| --- | --- |
| `npx tsc --noEmit` | clean |
| `npm test` | 295 pass, 0 fail, 0 skipped |
| `npm run ar-lint` | clean |
| `node scripts/prose-scan.mjs` | clean |

A gate correction shipped with the package. The `ar-lint` qum-bi rule had no left
word boundary and fired inside **الرقم بلا** in new copy. The rule was wrong, not
the Arabic: it would have accused any word ending in قم followed by a preposition.
It is now `(?<!\p{L})[وف]?(?:قم|قومي|قوموا|يقوم) ب`, which is a strengthening, not
a loosening. It still catches every genuine form including the و and ف conjunctions
Arabic attaches to the front of the verb. Verified against nine cases: الرقم بلا
and نقم بها do not match; قم/وقم/فقم/ثم قم/يقوم/قومي/قوموا + ب all do.

## Live evidence

Host `satmarkets-sat-markets.vercel.app`.

**The search narrows, and other constraints survive.**
`/en/listings?q=office+in+Al+Olaya&deal=lease&sort=price` returned 8 spaces with
`deal=lease` and `sort=price` both intact as hidden inputs. The six-constraint
sentence `Grade A fitted office in Al Olaya under 1,600 around 300 m2` returned 0,
and withdrawing two readings with `&qx=priceMax,fitout` took it to 6 with those
two chips gone. The zero was a genuinely narrow query, not a broken filter.

**Honesty behaviours.** `?q=office+45+qqzzxx` shows the not-used line for the bare
figure, returns 0, and lands on a real empty state whose "Clear all filters" link
resolves to bare `/en/listings` and therefore does clear `q`. `?q=45` shows the
nothing-understood line and still renders all 88 spaces.

**Owner ruling 5, both languages.** `/en/listings?city=riyadh` titles "Commercial
spaces in Riyadh", carries no slug in the description or the body, and returns 56
spaces where the raw-slug comparison previously returned an empty set.
`/ar/listings?city=riyadh` titles "مساحات تجارية في الرياض", its description
carries zero Latin characters, and it returns the same 56.

**Arabic parity.** Six chips, all Arabic, zero Latin characters in the chip text,
zero Arabic-Indic digits on the page, `dir=rtl`, `lang=ar`, chip row computed
direction rtl, `inLanguage: "ar-SA"` and an `/ar/` SearchAction target.

## Responsive evidence

`resize_window` reports success without moving the viewport in this browser
session (`clientWidth` stayed 1545, `outerWidth` read 0, on two separate tabs).
The widths were reached instead by giving the shipped page a real containing block
of each width in a same-origin iframe, with the frame widened by exactly the
scrollbar gap so the width reported is the width the CSS actually saw. The CSS,
the fonts and the layout are the deployed ones.

Query: the six-constraint sentence above, EN and AR.

| Width | EN overflow | EN chip rows | EN min chip height | AR overflow | AR chip rows | AR min chip height |
| --- | --- | --- | --- | --- | --- | --- |
| 320 | 0 | 3 | 44 | 0 | 3 | 44 |
| 360 | 0 | 3 | 44 | 0 | 2 | 44 |
| 390 | 0 | 3 | 44 | 0 | 2 | 44 |
| 430 | 0 | 2 | 44 | 0 | 2 | 44 |
| 768 | 0 | 1 | 44 | 0 | 1 | 44 |
| 1280 | 0 | 1 | 29 | 0 | 1 | 29 |

No horizontal overflow at any width in either language. No chip rendered outside
its containing block at any width. All six chips present at every width; the row
wraps rather than truncating, so no reading is ever hidden from the person whose
sentence produced it.

The 29px height at 1280 is not a defect. `@media(max-width:1024px)` raises `.chip`
to a 44px minimum, and `@media (pointer: coarse)` raises it independently of width,
so any touch context gets 44px. The 29px case is a fine-pointer desktop, where
WCAG 2.5.8 asks for 24px.

## Keyboard and screen-reader evidence

Tab order from the search input, measured live in DOM order over visible focusable
elements: text input, Search button, then the six chips in the order the sentence
produced them, then Clear search, then the next filter control. Nothing is skipped
and nothing is reachable out of order.

The hidden inputs that carry the other constraints are not focusable, so the row
of preserved state does not add nine dead tab stops between the box and the chips.

Each chip is a real `<a href>`, so it works with Enter and appears in a link list.
Each carries `aria-label` "Remove {label}" in English and "إزالة {label}" in
Arabic, so the accessible name states the action rather than reading as a bare
label. The ✕ glyph is inside `aria-hidden="true"` and is never announced.

Keyboard focus is covered by the existing `a:focus-visible` and `.chip:focus-visible`
rule (2px azure outline, 2px offset), which applies to keyboard focus only and not
to mouse clicks.

## Blockers carried out of this package

**Browser resize.** `resize_window` in this session reports success but does not
change the viewport. Responsive evidence is therefore measured in a same-origin
iframe rather than a resized window. This is a harness limitation, not a product
defect, and it is recorded here so the next package does not spend the time again.

**`.github/workflows/arabic-font.yml`** remains an owner-side administrative task
(owner ruling 6). It does not block engineering work. A workflow-scoped token must
not be requested.

## Next

The Competitive Advantage Strategy reconciliation, then ADV-0, the regulatory and
data-rights register.
