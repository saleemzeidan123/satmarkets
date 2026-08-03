// PKG-NEXT16-SECURITY slice A. THE MIDDLEWARE-TO-PROXY DECISION, RECORDED.
//
// Next.js 16 renames this convention. `middleware.ts` exporting `middleware`
// becomes `proxy.ts` exporting `proxy`, `skipMiddlewareUrlNormalize` becomes
// `skipProxyUrlNormalize`, and every Next.js 16 build of this repository now
// prints `The "middleware" file convention is deprecated. Please use "proxy"
// instead.` The old convention still works. Deprecated is not removed.
//
// THIS FILE DELIBERATELY STAYS ON `middleware`, FOR ONE REASON THAT IS NOT
// INERTIA.
//
// The rename is not only a rename. Next.js states that `proxy` runs on the
// Node.js runtime, that the runtime is not configurable there, and that the edge
// runtime is not supported in `proxy`: an application that wants edge is told to
// keep using `middleware`. This file exports no `runtime`, so it runs on edge
// today. Renaming it therefore does not move a symbol, it moves the execution
// environment of the code below.
//
// Look at what the code below is. It runs on every non-API request. It performs
// the locale redirect that decides the URL a first-time visitor lands on, and it
// calls `supabase.auth.getUser()`, which is the session refresh the whole
// authenticated surface depends on. Changing the runtime under an auth-touching
// hot path is a change with its own regression surface, its own latency profile
// and its own evidence requirement. It is not a change that should ride along
// inside a framework upgrade whose entire purpose is to be reviewable in
// isolation, and it is specifically not one to make in the package that also
// rewrote seventy-three Supabase call sites.
//
// So the two changes are separated. This package takes the framework upgrade.
// The runtime move gets its own package, its own before-and-after latency
// measurement on the locale redirect, and its own authentication regression
// pass.
//
// TIME BOUND, because deprecated does mean eventually removed and an undated
// decision to defer is a decision to forget. This is revisited at whichever of
// these comes first: the first Next.js release that announces a removal version
// for the `middleware` convention, or the next framework upgrade package after
// this one. If neither has happened by then, it is revisited anyway rather than
// carried a third time. Tracked in docs/status-ledger.md.

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { locales, defaultLocale } from "@/i18n/config";
import { PRIVATE_PREFIXES, HELD_ROUTES } from "@/lib/routePolicy";
import { indexingPermitted } from "@/lib/launchGate";

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
  //
  // ADV-1C.1 correction 1. This was one flag, and one flag was carrying two
  // decisions: that the operator intends this host to be indexed, and that the
  // inventory behind it is fit to be presented as production inventory. Those are
  // made by different people at different times, and running them together meant
  // flipping ALLOW_INDEX on launch day would have indexed a corpus every row of
  // which is flagged simulated. `indexingPermitted()` is now the AND of two
  // explicit switches, and the sitemap reads the same function, so a page cannot
  // be indexable through one path and held through the other.
  const allowIndex = indexingPermitted();
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
