/**
 * PKG-E1-READINESS slice D, WS25. Where a sign-in link is allowed to send you.
 *
 * `/auth/callback` reads `next` out of its own query string and, on success,
 * hands it to the browser as a location. The page is open to anyone, so `next`
 * is supplied by whoever built the link rather than by this platform. Before
 * this module it was taken as given, which made
 * `/auth/callback?next=https://example.invalid` an off-site redirect wearing
 * satmarkets.sa in the address bar. That is the shape a phishing link takes,
 * and the reason to refuse it here is that the provider's own redirect
 * allowlist never sees this parameter: it checks the callback address, and the
 * callback address is legitimate.
 *
 * Only a single-slash absolute path on this origin survives. The two values
 * that look like paths and are not are named explicitly: a protocol-relative
 * "//host" is an absolute URL to another origin, and a backslash is folded into
 * a slash by enough browsers that "/\\evil.example" has to be treated as the
 * same attack.
 *
 * These live in a module of their own rather than in the page because a route
 * segment file may only export what the framework expects of it, and because a
 * redirect rule that is worth writing down is worth testing directly instead of
 * through the source of the component that calls it.
 */
import { defaultLocale, isLocale, type Locale } from "@/i18n/config";

/** Where the callback sends a reader when `next` names nowhere usable. */
export const DEFAULT_NEXT = `/${defaultLocale}/dashboard`;

export function safeNext(raw: string | null | undefined): string {
  if (!raw) return DEFAULT_NEXT;
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.includes("\\")) return DEFAULT_NEXT;
  return raw;
}

/**
 * The locale of the destination, which is the locale the reader came from.
 *
 * The callback route carries no locale segment of its own, because it is the
 * one address registered with the authentication provider. `next` is built by
 * the login page as `/{locale}/go`, so the destination is what says which
 * language the reader was reading in. A link that names nothing usable falls to
 * English, which is what the rest of the platform does when it cannot tell.
 */
export function localeOfNext(next: string): Locale {
  const seg = next.split("/")[1] ?? "";
  return isLocale(seg) ? seg : defaultLocale;
}
