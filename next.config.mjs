// PKG-E1-READINESS slice F, WS34.
//
// Every directive below was derived by reading what this application actually
// loads, not from a template. The enumeration is written out in
// docs/security-baseline.md so that the next person can check the reasoning
// rather than inherit a list.
//
// The policy ships as Content-Security-Policy-Report-Only, and that is the whole
// point of this change rather than a hedge before the real one. A report-only
// policy is evaluated by the browser and its violations are printed, but nothing
// is blocked, so a directive that is wrong shows up as a console line instead of
// a blank map or a dead sign-in button. It stays report-only until a live pass
// over every surface that loads a third party resource comes back clean.
//
// There is deliberately no report-uri and no report-to. A reporting endpoint
// would mean sending visitor request data to a collector, and collection is
// disabled platform-wide (O17, COLLECTION_AUTHORISED is false). Violations are
// read from the browser console during verification, by a person, on purpose.
const csp = [
  // Nothing loads from anywhere unless a directive below names it.
  "default-src 'self'",
  // 'unsafe-inline' is here because the App Router serves its flight data in
  // inline <script> blocks and this application cannot use nonces. Next.js
  // 14.2.35 carries an advisory for cross-site scripting in App Router
  // applications that use CSP nonces, so adding a nonce here would trade a known
  // weakness for a known vulnerability. This is the single largest compromise in
  // the policy and it is recorded as such: script-src with 'unsafe-inline' does
  // not stop injected inline script. What it still does is stop script from an
  // origin that is not named here, which is the class this platform is most
  // exposed to given lister-supplied content. The proper fix is the framework
  // upgrade tracked in docs/security-baseline.md.
  "script-src 'self' 'unsafe-inline' https://unpkg.com",
  // maplibre-gl builds its workers from blob URLs.
  "worker-src 'self' blob:",
  // Tailwind is compiled to a stylesheet, but 565 inline style attributes across
  // the components are not, and neither is the map popup markup.
  "style-src 'self' 'unsafe-inline'",
  // images.unsplash.com is the demonstration photography, supabase.co is uploaded
  // listing media, cartocdn is the basemap sprite sheet, blob: is the map canvas.
  "img-src 'self' data: blob: https://images.unsplash.com https://*.supabase.co https://*.cartocdn.com https://tiles.openfreemap.org",
  // next/font self-hosts every face under /_next/static/media.
  "font-src 'self' data:",
  // Supabase REST and realtime, the primary and fallback basemap tile and glyph
  // sources, and the right to left text plugin that maplibre fetches at runtime.
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.cartocdn.com https://tiles.openfreemap.org https://unpkg.com",
  // A lister may supply a direct video file at any https host. A media element
  // cannot execute, and narrowing this would silently break a legitimate listing.
  "media-src 'self' blob: https:",
  // The only iframes this application creates are the two embed origins that
  // src/lib/videoEmbed.ts is willing to produce. It never frames an arbitrary URL.
  "frame-src https://www.youtube.com https://player.vimeo.com",
  "manifest-src 'self'",
  // No plugins, no framing of this site by anyone, no rewriting of the base URL,
  // and forms may only post back to this origin.
  "object-src 'none'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy-Report-Only", value: csp },
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
