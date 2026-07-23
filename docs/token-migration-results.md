# PKG-1B area 2: token migration results

Executed against docs/token-migration-spec.md. Every replacement was verified to
resolve to the exact value of the literal it replaced (paired per-line check: 142
substitutions, 0 value mismatches), and a guard confirmed no `var()` leaked into an
SVG presentation attribute or a library colour string (where it would not resolve).

## Counts

- Before: 400 inline-hex occurrences across 60 files.
- After first pass (role-stable tokens): 258.
- After deep pass (stale token, comparative unification, map palette module): 189.

The deep pass added three things beyond the role-stable swaps:

1. `--status-stale` (#B26B00) token for the availability stale/aging state and
   warn-tone dashboard rows (was an inline literal in three files + the CSS).
2. Comparative colour unification: market, compare and saved rendered the "below
   index band" indicator in confirmed green #1B7A50, which VIOLATED green-exclusivity
   (decision D14: comparative is never the verification green) and disagreed with the
   Advisor. All comparative surfaces now use --dv-quote-below / -within / -above.
   Verified live on /en/market: "below" resolves to rgb(92,140,191) (Harbor ramp),
   "above" to amber; no green remains on the comparative.
3. src/theme/palette.ts: a central module for colours that CANNOT be CSS variables
   (MapLibre paint, canvas, generated HTML). MapExplorer and ListingsMap now import
   BRAND / ASSET_COLORS / HEAT_RAMP / MAP from it and hold 0 inline hex. The map's
   ~60 scattered literals are now one named, token-mirrored source. Verified live:
   legend swatches render the correct per-asset colours, MapLibre initialised with no
   paint errors.

The remaining 189 are intentional and fall into the allowlist categories below. They
are NOT unclassified debt; each was inspected and kept literal for a concrete reason.

## Tokens adopted

--paper / --on-brand (both #FFFFFF, chosen by role), --ink, --ink-2, --slate,
--silver, --silver-2, --harbor, --harbor-d, --azure-l, --azure-wash, --cool,
--amber, --red, --verified. `--verified` was applied ONLY where the code's own
state means verification (SignupActions verified action, listing verification
freshness, FilterBar "verified owners", lister "verified by SAT", verify Yes).

## Kept-literal allowlist (categories, with the rule that governs them)

1. MapLibre GL paint (map exception, decision D14): all of MapExplorer.tsx; the
   paint expressions and their coupled DOM legend swatches in ListingsMap.tsx and
   LocationFacts.tsx; the LocationPicker marker colour. MapLibre cannot read CSS
   custom properties.

2. SVG presentation attributes (fill=/stroke=/stopColor=) and the brand-mark
   constants that feed them: satkit.tsx SAT mark, SatFooter/SignupForm/list-page
   marks, SaveHeart/SaveButton heart glyphs, building/[id] chart stop colours.
   `var()` does not resolve in an SVG presentation attribute, so tokenising there
   would change the rendered colour.

3. Third-party brand logos: Google, Microsoft, LinkedIn, Apple (login), WhatsApp
   brand green (ContactBar). Brand marks stay their owners' colours.

4. Library-passed colour strings baked into generated output: QR code dark/light
   (flyer), Next.js metadata themeColor. Not CSS-resolvable.

5. Category / legend / data-viz hues that encode a data category, not a UI status:
   verify/signups roleColor map, rent-band legends (market, compare, advisor,
   saved), age-mix donut, notification category tints, invest/hbu capped-bar
   charts, satkit property-kind placeholder gradients. Blind tokenising here would
   imply a status the colour does not carry.

6. Non-verification greens (#1B7A50 used for "new" badges, price-drop / below-band
   indicators, success checks, viewing-confirm, listing-approve): kept literal to
   preserve green's exclusivity to evidence-backed verification (decision D14/D11).
   Changing these to a different hue is a design decision, not a token migration.

7. One-off accents with no matching token: #3ECF8E marketing accent, #0E9488 rent
   band, warm sample-tag palettes, dark-panel muted texts, error reds that are not
   #C8412E, translucent whites (alpha != 1).

## Open decision (needs owner / Codex ruling)

Green-exclusivity strictness for positive-STATUS (not comparative) greens. The
comparative greens are fixed. The remaining ~18 #1B7A50 occurrences are positive
status/outcome uses: "new listing" badges, success checkmarks ("report received"),
viewing-confirmed and listing-approved actions, and the WhatsApp brand green. D14
says "outcome never shares a colour with verification", which would push these off
green too, but there is no defined positive-outcome token to move them to, and
recolouring ~18 status indicators app-wide is a visible brand change, not a mechanical
swap. Recommendation: either (a) rule that positive-status may keep green (verification
is then distinguished by context/label, not colour alone), or (b) define a
positive-outcome token (e.g. a distinct teal) and migrate them. Held for a ruling
rather than changing the brand unilaterally.

## Follow-up candidates (recorded, not actioned)

- `#3ECF8E` decorative green on the marketing home: possible semantic-review item
  (a non-verified green used decoratively); flagged, not changed.
- The "sample data" warning-tag palette (warm ambers/creams) could become a
  `--sample-*` token set; self-contained, low churn, deferred.
- The /list dark hero rail text colours could become `--on-dark[-muted]` tokens;
  single-surface, deferred.
