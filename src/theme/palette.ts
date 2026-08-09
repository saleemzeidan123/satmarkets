// Central colour palette for contexts that CANNOT read CSS custom properties:
// MapLibre GL paint expressions, canvas, and generated HTML strings. These values
// MIRROR the CSS design tokens in src/styles/sat-platform.css and must be kept in
// sync with them. Anything the DOM can style with CSS should use the CSS tokens
// (var(--...)) instead of importing from here. This module exists so the map's
// colours live in ONE named place rather than as scattered inline hex (PKG-1B).

// Brand + neutral anchors (mirror --harbor, --harbor-d, --azure-l, --ink, --paper,
// --slate). inkWarm is the warm label ink used for map symbols over tiles.
export const BRAND = {
  harbor: "#3A6EA5",
  harborDark: "#2C557F",
  azureLight: "#9DBBD6",
  ink: "#14181B",
  inkWarm: "#1C1A15",
  paper: "#FFFFFF",
  slate: "#5B6470",
  // Neutral cluster/aggregate grey (Tailwind slate-500), distinct from --slate so
  // clusters read as "grouped", not as text.
  clusterNeutral: "#64748B",
} as const;

// Sequential Harbor density ramp for the heatmap (low to high).
export const HEAT_RAMP = ["#CFE0EF", "#9DBBD6", "#5C8BBF", "#3A6EA5", "#2C557F"] as const;

// Asset-type CATEGORY palette (map pins + legend swatches). A categorical scale that
// encodes WHAT a space is; it never encodes verification or status. Keys match the
// asset_type enum. office reuses Harbor so the primary asset stays on-brand.
export const ASSET_COLORS: Record<string, string> = {
  office: BRAND.harbor,
  retail: "#0E9488",
  medical: "#DB2777",
  warehouse: BRAND.clusterNeutral,
  showroom: "#7C3AED",
  serviced: "#0EA5E9",
  education: "#16A34A",
  land: "#CA8A04",
  hospitality: "#F472B6",
  mixed_use: "#1D4ED8",
  gas_station: "#D97706",
  entertainment: "#E11D48",
  wedding_hall: "#A88B5C",
  worker_housing: "#475569",
  self_storage: "#65A30D",
};

// Named map-paint roles (mirror the --map-* CSS tokens). A generic pin is Harbor,
// never green: a pin is a location, not a verification (decision D14).
export const MAP = {
  pin: BRAND.harbor,
  pinSelected: BRAND.harborDark,
  pinStroke: BRAND.paper,
  pinSelectedStroke: "#E8A33D",
  zoneFill: BRAND.harbor,
  zoneLine: BRAND.harborDark,
  cluster: BRAND.clusterNeutral,
  clusterSmall: BRAND.azureLight,
  clusterMid: BRAND.clusterNeutral,
  clusterLarge: BRAND.harbor,
  /* RC12, finding 165. A district bubble and an exact building pin were both a
     Harbor disc with a Paper stroke, so the only thing separating "one building"
     from "a district containing this many buildings" was radius. Radius is a
     sensory characteristic (SC 1.3.3) and hue is a colour (SC 1.4.1), and the two
     marks shared the second and differed only in the first.

     The exact-building mark is now the district bubble INVERTED: Paper fill,
     Harbor ring. Solid disc means an aggregate and carries its count as a
     numeral; ring means a single building. That difference survives greyscale,
     every form of colour blindness and a 34-pixel-to-7-pixel size change, and it
     costs the map nothing visually, because a ring reads as a point marker more
     clearly than a filled dot does at this radius.

     These are deliberately named roles rather than reuses of `pinStroke` and
     `pin`, even though they resolve to the same two values today. The next
     surface that needs the distinction should ask for the distinction, not
     re-derive it from two roles that happen to be swappable. */
  exactFill: BRAND.paper,
  exactRing: BRAND.harbor,
  labelInk: BRAND.inkWarm,
  labelHalo: BRAND.paper,
  hit: "#000000",
  // Finding 177. ListingsMap painted the hover-highlight ring from this exact
  // value written as a literal, one line away from three siblings that already
  // read MAP.pin and MAP.pinStroke, while `--map-area-wash` declared the same
  // rgba() in sat-platform.css. A named role closes the gap: this mirrors that
  // token so the two cannot drift again.
  hoverWash: "rgba(58,110,165,0.14)",
} as const;
