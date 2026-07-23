import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { locales, defaultLocale } from "@/i18n/config";
import { PRIVATE_PREFIXES, HELD_ROUTES } from "@/lib/routePolicy";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const hasLocale = locales.some(
    (l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`)
  );
  if (!hasLocale) {
    const accept = req.headers.get("accept-language") || "";
    const locale = accept.toLowerCase().includes("ar") ? "ar" : defaultLocale;
    const url = req.nextUrl.clone();
    url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
    return NextResponse.redirect(url);
  }

  const currentLocale = pathname.split("/")[1] === "ar" ? "ar" : "en";
  const reqHeaders = new Headers(req.headers);
  reqHeaders.set("x-locale", currentLocale);
  let res = NextResponse.next({ request: { headers: reqHeaders } });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (url && key) {
    const supabase = createServerClient(url, key, {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
          cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value));
          res = NextResponse.next({ request: { headers: reqHeaders } });
          cookiesToSet.forEach(({ name, value, options }) =>
            res.cookies.set(name, value, options as any)
          );
        }
      }
    });
    await supabase.auth.getUser();
  }
  // Preview containment (Codex indexing safety): the entire site is noindexed
  // until the operator explicitly opts in via ALLOW_INDEX, because everything is
  // pre-launch sample data. Connecting the real domain must not auto-index it;
  // indexing is a deliberate switch, not a side effect of DNS. Prototype and
  // account routes stay noindexed regardless of the flag.
  const allowIndex = process.env.ALLOW_INDEX === "true" || process.env.NEXT_PUBLIC_ALLOW_INDEX === "true";
  // Prototype/account routes stay noindexed even on the production host until they
  // are real. /verify and its descendants are SAT-only operational surfaces: the
  // pages already 404 for non-SAT sessions, and this adds the response-level
  // noindex that robots.txt alone cannot provide (PKG-0A, Codex rank 33).
  // HELD_ROUTES are public pages whose audit gates have not cleared yet; they
  // are noindexed here regardless of ALLOW_INDEX, so flipping the global flag
  // on launch day cannot accidentally index them (PKG-0A.1, Codex correction 2).
  // Both lists live in lib/routePolicy.ts, shared with the sitemap.
  const matches = (pre: string) =>
    pathname === `/en${pre}` || pathname === `/ar${pre}` || pathname.startsWith(`/en${pre}/`) || pathname.startsWith(`/ar${pre}/`);
  const isPrivate = PRIVATE_PREFIXES.some(matches);
  const isHeld = HELD_ROUTES.some((h) => matches(h.path));
  if (!allowIndex || isPrivate || isHeld) {
    res.headers.set("X-Robots-Tag", "noindex, nofollow");
  }
  // Private-cache protection (PKG-1B area 5). Account and operational surfaces
  // (messages, deals, documents, verification, dashboard, saved, and the rest of
  // PRIVATE_PREFIXES) carry session-specific content, so no shared or persistent
  // cache may retain them. There is no service worker in this app, so nothing is
  // ever precached; this header is the defence-in-depth that also stops the browser
  // HTTP cache and any intermediary from storing an authenticated private page.
  if (isPrivate) {
    res.headers.set("Cache-Control", "private, no-store, max-age=0, must-revalidate");
  }
  return res;
}

export const config = {
  matcher: ["/((?!api|auth|_next/static|_next/image|favicon.ico|.*\\..*).*)"]
};
