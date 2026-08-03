// PKG-NEXT16-SECURITY slice C. The Content Security Policy, in one place.
//
// WHY THIS FILE IS .mjs AND NOT .ts. It has two importers and they cannot both
// read TypeScript. `next.config.mjs` is loaded by the framework's own config
// loader before any TypeScript pipeline exists, and `src/middleware.ts` is
// bundled for the edge runtime. A plain ESM module is the only shape both can
// import, and `allowJs` in tsconfig.json means the middleware still gets types
// inferred from the JSDoc below. The alternative was to write the directive list
// twice, which is how two policies drift until one of them is the real one and
// nobody knows which.
//
// WHY THERE ARE TWO CALLERS AT ALL. A nonce is per request, and
// `next.config.mjs` `headers()` is evaluated once at build time. Anything that
// varies per request has to be emitted from middleware. The config header stays
// because the middleware matcher deliberately excludes `/api`, `/auth`,
// `/_next/static`, `/_next/image` and every path containing a dot, and those
// responses should not lose their policy. So: the config emits the nonce-less
// policy everywhere, and middleware emits the nonce-bearing one on the routes it
// runs on.
//
// WHAT ACTUALLY REACHES THE BROWSER, measured rather than assumed. It was
// predicted here that both headers would arrive on a matched route and that the
// browser would evaluate both. That is not what happens. Middleware's
// `res.headers.set()` replaces the value the config emitted, so every response
// carries exactly one policy: the nonce-bearing one where middleware runs, the
// nonce-less one where it does not. Verified on deployment
// dpl_4jH9SA8VpnbMh1oh8zcxbs5rtYTP, where `/en` and `/ar/listings` returned a
// single nonce-bearing policy and `/api/listings` and
// `/vendor/mapbox-gl-rtl-text-0.2.3/mapbox-gl-rtl-text.min.js` returned a single
// nonce-less one. The reason this matters is that `set` is load-bearing:
// changing it to `append` would emit two policies and the browser would then
// require a script to satisfy both, which is a different and stricter rule than
// anyone reading this file would expect.

/**
 * Every directive except script-src. These do not vary per request.
 *
 * The enumeration was derived by reading what this application actually loads,
 * not from a template, and the reasoning for each entry is in
 * docs/security-baseline.md so the next person can check it rather than inherit
 * a list.
 */
const staticDirectives = [
  // Nothing loads from anywhere unless a directive below names it.
  "default-src 'self'",
  // maplibre-gl builds its workers from blob URLs.
  "worker-src 'self' blob:",
  // Tailwind is compiled to a stylesheet, but 565 inline style attributes across
  // the components are not, and neither is the map popup markup. A nonce cannot
  // help here: nonces apply to elements, and a style attribute has no element of
  // its own to carry one. Removing 'unsafe-inline' from style-src would mean
  // moving 565 attributes into classes, which is a refactor and not a header
  // change, so it is not part of this slice.
  "style-src 'self' 'unsafe-inline'",
  // images.unsplash.com is the demonstration photography, supabase.co is uploaded
  // listing media, cartocdn is the basemap sprite sheet, blob: is the map canvas.
  "img-src 'self' data: blob: https://images.unsplash.com https://*.supabase.co https://*.cartocdn.com https://tiles.openfreemap.org",
  // next/font self-hosts every face under /_next/static/media.
  "font-src 'self' data:",
  // Supabase REST and realtime, and the primary and fallback basemap tile and
  // glyph sources. The third party CDN origin that used to be named here was
  // removed in slice C alongside script-src; the right-to-left text plugin is now
  // a same-origin load covered by 'self'. See src/lib/rtlTextPlugin.ts, which is
  // the only file permitted to name that origin at all.
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.cartocdn.com https://tiles.openfreemap.org",
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
];

/**
 * Build the script-src directive.
 *
 * WITH A NONCE. `'unsafe-inline'` is retained deliberately and it is not a
 * contradiction. A browser that understands nonces ignores `'unsafe-inline'` for
 * the whole directive the moment a nonce source is present, which is specified
 * behaviour and was confirmed by measurement in slice C: with
 * `script-src 'nonce-x' 'unsafe-inline'`, an unnonced inline script still raised
 * a script-src-elem violation. A browser too old to understand nonces ignores
 * the nonce source instead and falls back to the permissive behaviour it has
 * today, which is the same position this application is already in. So the
 * combination is strictly better in every browser and worse in none.
 *
 * `'self'` covers the chunk files the framework injects as `<script src>` during
 * navigation, so `'strict-dynamic'` is not needed. `'strict-dynamic'` would
 * additionally cause `'self'` to be ignored, which would make correctness depend
 * on every dynamically inserted script being inserted by an already-trusted one.
 * That is a stronger claim than this application needs and a harder one to
 * verify, so it is not made.
 *
 * WITHOUT A NONCE. The nonce-less form is what the build-time header carries,
 * because a header computed once cannot carry a per-request value. It is the
 * policy this application shipped before slice C.
 *
 * @param {string} [nonce] base64 nonce for this request, if there is one
 * @returns {string}
 */
function scriptSrc(nonce) {
  return nonce
    ? `script-src 'self' 'nonce-${nonce}' 'unsafe-inline'`
    : "script-src 'self' 'unsafe-inline'";
}

/**
 * The complete policy, as a header value.
 *
 * @param {string} [nonce] omit for the build-time header, pass for a request
 * @returns {string}
 */
export function buildCsp(nonce) {
  const [defaultSrc, ...rest] = staticDirectives;
  return [defaultSrc, scriptSrc(nonce), ...rest].join("; ");
}

/**
 * The header name. It is report-only, and that is the whole change rather than a
 * hedge before the real one: a report-only policy is evaluated by the browser and
 * its violations are printed, but nothing is blocked, so a directive that is
 * wrong shows up as a console line instead of a blank map or a dead sign-in
 * button. What it takes to move to enforcement is written down in
 * docs/security-baseline.md rather than left as an intention.
 *
 * There is deliberately no report-uri and no report-to. A reporting endpoint
 * would mean sending visitor request data to a collector, and collection is
 * disabled platform-wide (O17, COLLECTION_AUTHORISED is false). Violations are
 * read from the browser console during verification, by a person, on purpose.
 */
export const CSP_HEADER = "Content-Security-Policy-Report-Only";

/**
 * A fresh nonce for one request.
 *
 * `crypto.getRandomValues` is available on the edge runtime, in Node and in the
 * browser, so this needs no import and no polyfill. Sixteen bytes is the length
 * the CSP specification asks for as a minimum, and base64 of sixteen bytes lands
 * inside the character class the framework will accept when it reads the nonce
 * back out of the header: `/^'nonce-([A-Za-z0-9+/_-]+={0,2})'$/` in
 * next/dist/server/app-render/get-script-nonce-from-header.js.
 *
 * @returns {string}
 */
export function newNonce() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

/**
 * Request headers that must never reach the renderer as the client sent them.
 *
 * The framework finds the nonce by reading the request's own
 * `content-security-policy` header, falling back to
 * `content-security-policy-report-only`, and taking the first nonce source out
 * of script-src or default-src. That is a value a client can put on a request.
 * Middleware therefore deletes both names before setting its own, so the nonce
 * the renderer stamps on the framework's inline scripts is always the one
 * middleware also put in the response header and never one an attacker chose.
 *
 * This is the same shape of mistake as CVE-2026-44581, which was a malformed
 * client nonce reflected into the document. That specific bug is fixed in the
 * version this repository runs, and this is the part of the problem that is the
 * application's to hold rather than the framework's.
 */
export const CLIENT_CSP_REQUEST_HEADERS = [
  "content-security-policy",
  "content-security-policy-report-only",
];
