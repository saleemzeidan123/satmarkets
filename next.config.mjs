// PKG-E1-READINESS slice F, WS34. Amended by PKG-NEXT16-SECURITY slice C.
//
// The policy itself moved to src/lib/csp.mjs in slice C, because it acquired a
// second emitter. A nonce is per request and this file is evaluated once at
// build time, so the nonce-bearing header is set in src/middleware.ts and this
// one is the nonce-less form. Both call the same builder, so the directive list
// cannot drift between them, and src/lib/csp.test.ts fails if a policy string is
// written anywhere other than that module.
//
// WHY THIS HEADER STILL EXISTS NOW THAT MIDDLEWARE EMITS ONE. The middleware
// matcher excludes `/api`, `/auth`, `/_next/static`, `/_next/image`,
// `favicon.ico` and every path containing a dot. Those responses are not HTML
// and mostly cannot execute anything, but dropping their policy would be a
// visible regression in any header scan of this site and would have to be
// explained every time. So this header keeps the coverage it had. On the routes
// where middleware also runs, its `res.headers.set()` replaces this value rather
// than adding to it, so exactly one policy is served either way; that was
// measured on the deployment, not assumed, and the measurement is recorded in
// docs/security-baseline.md.
//
// The reasoning for every individual directive is in docs/security-baseline.md.
import { buildCsp, CSP_HEADER, ENFORCED_CSP_HEADER, ENFORCED_BASELINE_CSP } from "./src/lib/csp.mjs";

const securityHeaders = [
  { key: CSP_HEADER, value: buildCsp() },
  // Enforced, not report-only: the four directives that cannot break a page.
  { key: ENFORCED_CSP_HEADER, value: ENFORCED_BASELINE_CSP },
  // A window this site opens, or that opens this site, shares no browsing
  // context with it, so another origin cannot reach in through window.opener.
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  // The platform already sends HSTS on the production host. Stating it here
  // means a preview or a future host carries it too, and that the two-year
  // lifetime is this repository's decision and not a default.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  // Content sniffing turns an uploaded document into whatever the browser guesses
  // it is, which is the wrong end of the decision to be guessing at.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // frame-ancestors above is the modern control. This is the same statement for
  // anything that only understands the old header.
  { key: "X-Frame-Options", value: "DENY" },
  // A referrer to another origin carries the path, and paths here can name a
  // listing, a requirement or an account surface. Same-origin keeps the full URL.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // This application asks for none of these, so it should not be able to.
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()" },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The framework version is a targeting hint and nothing here needs to publish it.
  poweredByHeader: false,
  images: { remotePatterns: [{ protocol: "https", hostname: "**.supabase.co" }] },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};
export default nextConfig;
