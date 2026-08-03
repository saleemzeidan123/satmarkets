import Link from "next/link";
import { headers, type UnsafeUnwrappedHeaders } from "next/headers";
import { getDictionary } from "@/i18n/getDictionary";

// The app-root 404 has no [locale] segment to read, so it takes the locale the
// middleware already resolved and stamped on the request, exactly as the root
// layout does two files up. That is what lets the copy live in the dictionaries
// instead of being frozen in English here, and it lets the way back point at the
// language the visitor was actually reading.
export default function NotFound() {
  const locale = (headers() as unknown as UnsafeUnwrappedHeaders).get("x-locale") === "ar" ? "ar" : "en";
  const d = getDictionary(locale).notFound;
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center text-center">
      <div className="font-display text-6xl text-charcoal">404</div>
      <p className="mt-2 text-charcoal/70">{d.body}</p>
      <Link href={`/${locale}`} className="btn-gold mt-5 px-5 py-2.5 text-sm">{d.back}</Link>
    </div>
  );
}
