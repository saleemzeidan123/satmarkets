// Authoritative breakpoint source (PKG-1B, Codex correction 3).
//
// One place defines the responsive breakpoints. Tailwind's `screens` is
// generated from this object (see tailwind.config.ts), and any JS that needs a
// pixel threshold imports from here. The `--bp-*` CSS custom properties in
// sat-platform.css are DOCUMENTATION MIRRORS only: CSS custom properties cannot
// be used in `@media` conditions, so real media queries use Tailwind's screens
// (generated here) or literal px that must match these values.
// These mirror Tailwind's default utility breakpoints (so existing sm:/md:/lg:
// classes keep their meaning) plus an added xs. Generating Tailwind `screens`
// from this object is therefore behaviour-preserving, and this stays the one
// place to change a breakpoint. NOTE: the responsive QA test widths (320, 390,
// 430, 768, 1024, 1440) are viewport sizes for review, a separate concern from
// these utility breakpoints.
export const BREAKPOINTS = {
  xs: 320,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1536,
} as const;

export type Breakpoint = keyof typeof BREAKPOINTS;

// Viewport widths used for responsive QA evidence (distinct from utility breakpoints).
export const QA_WIDTHS = [320, 390, 430, 768, 1024, 1440] as const;

// Tailwind `screens` map (px strings), generated from BREAKPOINTS.
export const screens: Record<string, string> = Object.fromEntries(
  Object.entries(BREAKPOINTS).map(([k, v]) => [k, `${v}px`])
);
