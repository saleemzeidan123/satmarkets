import { NextRequest, NextResponse } from "next/server";
import { locales, defaultLocale } from "@/i18n/config";

// English is the default. Arabic is auto-served to Arabic-locale visitors.
// Production note: also branch on geo (Saudi -> ar) at the edge.
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const hasLocale = locales.some(
    (l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`)
  );
  if (hasLocale) return NextResponse.next();

  const accept = req.headers.get("accept-language") || "";
  const wantsArabic = accept.toLowerCase().includes("ar");
  const locale = wantsArabic ? "ar" : defaultLocale;

  const url = req.nextUrl.clone();
  url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"]
};
