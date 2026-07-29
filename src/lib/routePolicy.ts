// Route indexing policy, one source of truth (PKG-0A.1, Codex correction 2).
// The sitemap and the middleware both import from here, so the sitemap, robots
// behavior and response headers cannot drift apart. docs/routes.md mirrors this
// file; update both in the same commit.

// Public routes intended to be indexable once ALLOW_INDEX and the launch gates
// pass. Nothing else belongs in the sitemap.
export const SITEMAP_ROUTES = ["", "/listings", "/map", "/rent-index", "/advisor", "/requirements", "/locations", "/market", "/brokers"];

// Public routes HELD OUT of indexing until their specific audit gates clear.
// Held routes are excluded from the sitemap AND noindexed by the middleware
// even if the global ALLOW_INDEX flag is switched on, so launch day cannot
// accidentally index them (they cannot be bypassed by the flag).
export const HELD_ROUTES: { path: string; reason: string }[] = [
  { path: "/area", reason: "Audit rank register: noindex until a real kind-aware entity route replaces the sample trade-area page." },
  { path: "/pricing", reason: "Noindex until the offer is real or explicitly concept-labelled (owner decision O1)." },
  { path: "/neutrality", reason: "Indexable only after the legal and governance review of the relationship statement (decision O2)." },
  { path: "/about", reason: "Indexable after claim review: the universal verification promise (claim C8) is not yet supported." },
  { path: "/verification", reason: "Noindex with the rest of ADV-4 under owner decision O11. The page states what a verification does and does not mean; it is publishable on its own evidence, but the indexing half of ADV-4 is held." },
  { path: "/sources", reason: "Noindex under O11, and separately under O10: the registry it renders still carries an unresolved derivation and export gap on the REGA Rental Index (Ejar) row." },
  { path: "/bilingual", reason: "Noindex under O11. The terminology record is publishable, but it names surfaces that are themselves held." },
];

// Account, prototype and operational surfaces: never indexed, never in the
// sitemap, regardless of any flag.
//
// /login and /hbu were linked from the public header and footer while appearing
// in none of the three lists, so neither the sitemap nor the middleware held a
// ruling on them. /login is an authentication surface with nothing to index.
// /hbu is a highest-and-best-use demonstration whose every figure is simulated,
// so it is private until it is driven by real evidence.
export const PRIVATE_PREFIXES = ["/admin", "/dashboard", "/messages", "/notifications", "/deal", "/docs", "/find", "/post-requirement", "/list", "/invest", "/saved", "/signup", "/login", "/hbu", "/compare", "/me", "/go", "/verify", "/ops", "/proto"];
