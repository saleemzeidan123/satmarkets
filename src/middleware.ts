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

// PKG-NEXT16-SECURITY SLICE C ALSO PUT THE PER-REQUEST CONTENT SECURITY POLICY
// HERE, and that needs its own justification, because this file was just argued
// to be an auth-touching hot path that should not casually acquire new work.
//
// It is here because there is nowhere else it can be. A nonce is per request.
// `next.config.mjs` `headers()` is evaluated once, at build time, so a header
// emitted there cannot carry one. Middleware is the only place in this
// application that sees a request before the renderer does and can put a value
// on both the request and the response, which is what the framework's nonce
// mechanism requires.
//
// The work added is one random draw and three header writes. It performs no
// I/O, awaits nothing and adds no dependency, and the `supabase.auth.getUser()`
// call below is orders of magnitude more expensive and was already here. This
// does not weaken the argument above about deferring the runtime move, but it
// does add one line to what has to be re-verified when that move happens:
// confirm the renderer still receives the nonce through the request headers
// under `proxy`.

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { locales, defaultLocale } from "@/i18n/config";
import { PRIVATE_PREFIXES, HELD_ROUTES } from "@/lib/routePolicy";
import { indexingPermitted } from "@/lib/launchGate";
import {
  buildCsp,
  newNonce,
  CSP_HEADER,
  CLIENT_CSP_REQUEST_HEADERS,
} from "@/lib/csp.mjs";

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
  // The nonce, and the one rule that makes it worth anything. The renderer finds
  // it by reading the request's own CSP header, and a request header is
  // something a client can send, so every client-supplied copy is deleted before
  // this one is set. Otherwise a visitor could choose the nonce that the
  // framework stamps on its inline scripts.
  const nonce = newNonce();
  const csp = buildCsp(nonce);
  for (const h of CLIENT_CSP_REQUEST_HEADERS) reqHeaders.delete(h);
  reqHeaders.set(CSP_HEADER.toLowerCase(), csp);
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
  // Set last, deliberately. `res` is reassigned inside the Supabase cookie
  // callback above, and a header written before that point would be dropped on
  // any request that refreshes a session, which is the request class that most
  // needs the policy. The nonce here is the same one placed on the request
  // headers, so the value the browser is told to trust is the value the renderer
  // stamped.
  res.headers.set(CSP_HEADER, csp);
  return res;
}

export const config = {
  matcher: ["/((?!api|auth|_next/static|_next/image|favicon.ico|.*\\..*).*)"]
};
