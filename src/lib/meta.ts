// The metadata factory for every public template (WS12, PKG-1C).
//
// FOUR DEFECTS THIS EXISTS TO KILL.
//
// 1. No x-default. The reciprocal set named en and ar only, so a search engine
//    serving a visitor whose language is neither had no declared entry point and
//    had to guess. The set is now en, ar and x-default, and x-default points at
//    the English URL because English is the default locale (src/i18n/config.ts).
//    A reciprocal set is only valid if every page in it names every other page,
//    so the set is built from ONE path and cannot go half-declared.
//
// 2. No Twitter card and no Open Graph image. A shared link fell back to
//    whatever the platform could scrape, which for a noindex prototype was
//    nothing at all. Both are now complete and locale-aware: the Arabic page
//    shares the Arabic card, the English page the English one.
//
// 3. Routes inheriting root metadata. Several public templates defined no
//    metadata, so they served the root layout's generic title and description
//    with no canonical and no hreflang at all. Every public template now builds
//    through this factory, and the two entry points below cover both shapes: a
//    static bilingual page passes both languages, a data-driven page passes the
//    one string it composed.
//
// 4. Drifting hand-written objects. Each page assembled its own alternates and
//    openGraph literal, so they disagreed about siteName, about type, and about
//    whether languages were declared at all. There is now one assembler.
//
// INDEXING IS UNAFFECTED. This file declares canonical and reciprocal language
// URLs, which is what a crawler needs when indexing is eventually allowed; the
// noindex decision stays where it already lives, in the middleware and
// src/lib/routePolicy.ts.

import type { Metadata } from "next";
import { SITE } from "@/lib/site";
import { defaultLocale, locales, type Locale } from "@/i18n/config";

const SITE_NAME = { en: "SAT Markets", ar: "سات ماركتس" } as const;

// Open Graph wants a language_TERRITORY tag, not a bare language code.
const OG_LOCALE = { en: "en_US", ar: "ar_SA" } as const;

const CARD_ALT = {
  en: "SAT Markets, verified commercial real estate in Saudi Arabia",
  ar: "سات ماركتس، مساحات تجارية موثّقة في السعودية",
} as const;

const asLocale = (locale: string): Locale => (locale === "ar" ? "ar" : "en");

// Invisible bidi isolates (U+2066 to U+2069) and word joiners (U+2060) are
// correct inside laid-out prose, where a composite such as an area figure and
// its Arabic unit would otherwise be reordered by the paragraph around it. A
// title or a description is NOT laid out as a paragraph: it is a plain string a
// crawler, a share card and a browser tab read as-is, and there the controls buy
// nothing and cost bytes. Stripping them here means a page can pass a formatted
// figure straight into its metadata without having to think about it.
const plain = (s: string): string => s.replace(/[\u2060\u2066-\u2069]/g, "");

/** Absolute URL for a locale and a path, the single place the two are joined. */
export const localeUrl = (locale: string, path: string): string => `${SITE}/${asLocale(locale)}${path}`;

/**
 * The reciprocal language set: every locale plus x-default. Built from one path
 * so the entries cannot disagree, and exported because the sitemap needs the
 * same set.
 */
export function languageAlternates(path: string): Record<string, string> {
  const set: Record<string, string> = {};
  for (const l of locales) set[l] = localeUrl(l, path);
  set["x-default"] = localeUrl(defaultLocale, path);
  return set;
}

/**
 * The Open Graph types this site is allowed to declare.
 *
 * `website` is the safe generic value and the default for every route.
 * `profile` describes an actual individual person, so it is only correct when
 * the entity data carries person fields.
 * `article` describes an editorial article. It is NOT the generic value for a
 * single entity: a listing, a building, an occupier requirement, a printable
 * flyer and an organization profile are none of them articles.
 */
export type OgType = "website" | "profile" | "article";

/**
 * ROUTE OPEN GRAPH TYPE POLICY, the single source of the og:type value.
 *
 * This table holds DEPARTURES from the `website` default only, and every
 * departure must state why the route's own data supports the claim. A call site
 * cannot pass a type, so a template can no longer guess, and the two types that
 * assert something specific about a page can no longer be applied by analogy to
 * a sibling route.
 *
 * The two departures considered and rejected, recorded so they are not
 * relitigated silently:
 *
 * `/lister/[id]` to `profile`. Rejected. `listers_public` models an
 * organization (name, lister_type owner or broker, logo, website, public email,
 * is_operator) and carries no fields describing an individual person, so
 * `profile` would be a claim the data does not support.
 *
 * The four other detail routes to `article`. Rejected. None of them is an
 * editorial article. The detailed meaning of each entity is already published
 * in the Schema.org JSON-LD, which is the vocabulary that can actually express
 * a RealEstateListing or an Organization; og:type cannot, and should not be
 * stretched into pretending it can.
 */
export const OG_TYPE_POLICY: { pattern: RegExp; type: OgType; reason: string }[] = [];

/** The Open Graph type for a path. `website` unless the policy departs from it. */
export function ogTypeFor(path: string): OgType {
  return OG_TYPE_POLICY.find((r) => r.pattern.test(path))?.type ?? "website";
}

export interface MetaOptions {
  /** Override the share card. Defaults to the locale's own card. */
  image?: string;
  /** Passed through to Next. The middleware owns the site-wide noindex. */
  robots?: Metadata["robots"];
}

/**
 * Build metadata from strings ALREADY resolved to one locale. Use this on
 * data-driven templates, where the title is composed from a record rather than
 * chosen from a pair.
 */
export function localeMeta(
  locale: string,
  path: string,
  title: string,
  description: string,
  opts: MetaOptions = {},
): Metadata {
  const loc = asLocale(locale);
  const url = localeUrl(loc, path);
  const image = opts.image ?? `${SITE}/og-${loc}.png`;
  const images = [{ url: image, width: 1200, height: 630, alt: CARD_ALT[loc], type: "image/png" }];
  const t = plain(title);
  const d = plain(description);
  return {
    title: t,
    description: d,
    alternates: { canonical: url, languages: languageAlternates(path) },
    openGraph: {
      title: t,
      description: d,
      url,
      siteName: SITE_NAME[loc],
      type: ogTypeFor(path),
      locale: OG_LOCALE[loc],
      alternateLocale: locales.filter((l) => l !== loc).map((l) => OG_LOCALE[l]),
      images,
    },
    twitter: { card: "summary_large_image", title: t, description: d, images: [image] },
    ...(opts.robots ? { robots: opts.robots } : {}),
  };
}

/**
 * Build metadata for a static bilingual template. Both languages are passed
 * together so a template physically cannot ship one language's title without
 * the other's, which is how the Arabic side used to fall back to English.
 */
export function pageMeta(
  locale: string,
  path: string,
  titleEn: string,
  titleAr: string,
  descEn: string,
  descAr: string,
  opts: MetaOptions = {},
): Metadata {
  const ar = asLocale(locale) === "ar";
  return localeMeta(locale, path, ar ? titleAr : titleEn, ar ? descAr : descEn, opts);
}
