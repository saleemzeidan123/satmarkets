// One source of truth for the site's absolute origin, environment-aware
// (PKG-0A, Codex correction 7). The old fallback hardcoded satmarkets.sa, so
// every preview page canonicalized to a domain that is not yet acquired. A
// canonical must equal the host actually serving the page:
//
//   1. NEXT_PUBLIC_SITE_URL, the explicit operator override. On launch day,
//      after the domain is acquired and DNS is live, set it to
//      https://satmarkets.sa. Never before.
//   2. VERCEL_PROJECT_PRODUCTION_URL, the project's real production host
//      (currently satmarkets-sat-markets.vercel.app), for production builds.
//   3. VERCEL_URL, the per-deployment host, for previews.
//   4. localhost for local dev.
//
// SITE is only read server-side (metadata, sitemap, robots, JSON-LD); the
// VERCEL_* variables exist there at build time.
const explicit = process.env.NEXT_PUBLIC_SITE_URL;
const prodHost = process.env.VERCEL_PROJECT_PRODUCTION_URL;
const deployHost = process.env.VERCEL_URL;
export const SITE =
  explicit ||
  (prodHost ? `https://${prodHost}` : "") ||
  (deployHost ? `https://${deployHost}` : "") ||
  "http://localhost:3000";
