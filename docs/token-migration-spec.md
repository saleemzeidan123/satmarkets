# PKG-1B area 2: inline-hex to semantic-token migration spec

Classify every inline hex by ROLE, then replace with the token whose computed value
equals the literal. Never change rendered colour. Blind find/replace is prohibited:
the same hex can carry different roles (verified green vs a category hue), and those
roles map to different tokens or stay literal.

## Role-stable 1:1 map (identical rendered value; safe wherever the role is decorative/structural, NOT a map-paint or logo)

| Literal | Token | Role |
| --- | --- | --- |
| #3A6EA5 | var(--harbor) | Harbor brand / links / brand accents |
| #2C557F | var(--harbor-d) | dark harbor (hover/active/deep) |
| #14181B | var(--ink) | primary text |
| #2B3138 | var(--ink-2) | secondary ink |
| #5B6470 | var(--slate) | muted text |
| #6B7480 | var(--slate-2) | fainter muted text |
| #9AA3AE | var(--mid) | mid grey |
| #E9EDF1 | var(--silver) | hairline border |
| #D7DDE5 | var(--silver-2) | stronger border |
| #F6F8FB | var(--cool) | cool surface wash |
| #EEF1F5 | var(--surface-sunken) | sunken surface |
| #EDE7DC | var(--stone) | stone wash |
| #A88B5C | var(--brass) | brass accent |
| #B7791F | var(--amber) | attention/amber text |
| #ECF2F8 | var(--azure-wash) | brand wash bg |
| #9DBBD6 | var(--azure-l) | light brand line |

## Context-dependent (pick token by role)

- `#FFF` / `#FFFFFF` / `#fff`:
  - a surface/card/panel background -> `var(--paper)`
  - text/icon/stroke sitting ON a coloured (brand/status) fill -> `var(--on-brand)`
  - inside MapLibre paint -> KEEP LITERAL (map exception)
- `#1B7A50` (green):
  - means verification/verified status -> `var(--verified)`
  - a category/legend hue (role colour, asset colour) or a non-verified "new" badge
    -> KEEP LITERAL and record it (green must stay exclusive to verification; changing
    the design is a separate decision, not this migration's job).
- `#C8412E` (red): error/destructive role -> `var(--red)`; a category hue -> keep literal.
- `#B26B00` (dark amber, "stale/aging"): no exact token -> KEEP LITERAL, record as a
  candidate for a future `--status-stale` token.

## Keep literal ALWAYS (do not tokenise; record with reason)

- Entire `MapExplorer.tsx` and every MapLibre paint expression anywhere
  (`paint:`, `*-color`, the asset-type `COLORS` map, `rgba(...)` ramps). MapLibre
  cannot read CSS variables (evidence-approved exception, decision D14 context).
- Third-party brand logo SVG fills: Google (#4285F4 #34A853 #FBBC05 #EA4335),
  Microsoft (#F25022 #7FBA00 #00A4EF #FFB900), and any similar brand mark.
- Category / legend colour maps (e.g. verify/signups `roleColor`), where the hue
  encodes a data category, not a UI status.
- Any hex with no token whose value matches (one-off accents) -> keep literal, record.

## Rules

1. Replacement must not change the rendered pixel colour. If unsure a token's value
   equals the literal, keep literal and record.
2. Do not touch `.mono`/font/letter-spacing/anything non-colour.
3. After edits the file must still `tsc --noEmit` clean.
4. Record every kept-literal occurrence (file, line, hex, reason) for the allowlist.
