import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { locales, defaultLocale } from "@/i18n/config";

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
  // are real. /signup and /compare are prototype surfaces too (Codex MKT-P0-06).
  const PRIVATE_PREFIXES = ["/admin", "/dashboard", "/messages", "/notifications", "/deal", "/docs", "/find", "/post-requirement", "/list", "/invest", "/saved", "/signup", "/compare"];
  const isPrivate = PRIVATE_PREFIXES.some(
    (pre) => pathname === `/en${pre}` || pathname === `/ar${pre}` || pathname.startsWith(`/en${pre}/`) || pathname.startsWith(`/ar${pre}/`)
  );
  if (!allowIndex || isPrivate) {
    res.headers.set("X-Robots-Tag", "noindex, nofollow");
  }
  return res;
}

export const config = {
  matcher: ["/((?!api|auth|_next/static|_next/image|favicon.ico|.*\\..*).*)"]
};
