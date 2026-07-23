# Design tokens (WS07)

Canonical token catalogue. Source of truth: `src/styles/sat-platform.css` `:root`
(colour, surface, border, radius, leading, width, elevation, motion, layer,
breakpoint, map and data-viz tokens) and `src/styles/globals.css` (the `--fs-*`
size scale and the direction-aware `--sans`/`--serif`). Components should compose
from these; raw hex in components is being migrated out in PKG-1B (baseline
reported by `scripts/raw-color-scan.mjs`).

## Colour, semantic (role, not hue)

`--brand` (Harbor #3A6EA5), `--brand-strong` (#2C557F), `--brand-wash`,
`--on-brand` (#FFFFFF). Status roles, each with a wash: `--status-verified`
(#1B7A50, WCAG AA, reserved for evidence-backed verification), `--status-info`
(Harbor, for available/informational), `--status-attention` (amber #B7791F),
`--status-error` (#C8412E). Never satestate gold #8A7342; never the retired green
#1F8A5B (both guarded by the law test).

## Surfaces and borders

Surfaces: `--surface-canvas`, `--surface-raised`, `--surface-sunken`,
`--surface-inverse`. Borders: `--border`, `--border-strong`, `--border-brand`,
`--border-w` (1px), `--border-w-strong` (1.5px).

## Typography

Sizes: `--fs-cap` through `--fs-4xl` (globals.css), raised a notch under RTL.
Leading: `--lh-tight` 1.25, `--lh-heading` 1.3, `--lh-body` 1.55, `--lh-body-ar`
1.75, `--lh-prose-ar` 1.85. Tracking: `--tracking-tight` -0.01em (Latin display
only), `--tracking-normal` 0 (all Arabic), `--tracking-wide` 0.08em (eyebrows).
Families: `--sans`, `--serif`, `--mono`, `--ar`, with `--sans`/`--serif`
direction-aware so RTL resolves to IBM Plex Sans Arabic.

## Spacing, radii, widths

Spacing: `--space-1` 4 to `--space-8` 64. Radii: `--r-xs` 6, `--r-control` 8,
`--r-card` 12, `--r-panel` 16, `--r-hero` 24, `--r-pill` 999. Container widths:
`--w-prose` 720, `--w-content` 1120, `--w-wide` 1320, `--w-max` 1440.

## Elevation, motion, layers

Elevation: `--elev-1..3`, `--focus-ring`, `--focus-ring-color`. Motion: `--dur-1`
120ms, `--dur-2` 180ms, `--dur-3` 240ms, `--ease-standard`, `--ease-emphasis`;
under `prefers-reduced-motion` the durations collapse and `--motion-scale`
becomes 0 for inline consumers. Layers: `--z-base` 0, `--z-raised` 5,
`--z-sticky` 30, `--z-tabbar` 45, `--z-header` 50, `--z-fab` 60, `--z-overlay`
61, `--z-panel` 62, `--z-toast` 80, `--z-skip` 200.

## Breakpoints

`--bp-xs` 320, `--bp-sm` 390, `--bp-md` 768, `--bp-lg` 1024, `--bp-xl` 1280,
`--bp-2xl` 1440.

## Map and data-visualization

Map: `--map-district`, `--map-district-selected`, `--map-district-ring`,
`--map-pin`, `--map-pin-stroke`, `--map-cluster`, `--map-area-wash`. Data-viz: a
Harbor sequential ramp `--dv-seq-1..5`, and band/quote semantics `--dv-band-fill`,
`--dv-band-average`, `--dv-quote-below/within/above`, `--dv-grid`, `--dv-axis`.
