import type { MetadataRoute } from "next";
import { getSupabaseServer } from "@/lib/supabase/server";
import { SITE } from "@/lib/site";

// SM-P1-001b. Two things were wrong here.
//
// 1. lastModified was `new Date()` on every entry, i.e. the build time. That
//    tells a crawler every page changed the moment it was fetched, which is a
//    false freshness signal and gets lastmod discounted entirely once it is
//    caught. A timestamp we cannot source honestly is better omitted than
//    invented: Google treats a missing lastmod as "unknown", not as "stale".
//    Detail pages now carry the row's real updated_at (falling back to
//    created_at), and the index pages carry the newest timestamp of the content
//    they actually list.
//
// 2. alternates.languages had en and ar but no x-default, so there was no
//    declared page for a user whose language matches neither. English is the
//    primary locale, so it takes x-default.

const ROUTES = ["", "/listings", "/map", "/rent-index", "/area", "/advisor", "/compare", "/pricing", "/about", "/neutrality", "/requirements", "/locations", "/market", "/brokers"];

// Routes whose content is driven by the listing set, so the newest listing
// timestamp is a truthful lastmod for them. Everything else is editorial and
// gets no lastmod rather than a fabricated one.
const LISTING_DRIVEN = new Set(["", "/listings", "/map", "/locations", "/market", "/brokers"]);

const langs = (path: string) => ({
  en: `${SITE}/en${path}`,
  ar: `${SITE}/ar${path}`,
  "x-default": `${SITE}/en${path}`,
});

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [];

  type Row = { id: string; created_at: string | null; updated_at: string | null };
  let listings: Row[] = [];
  let buildings: { id: string; created_at: string | null }[] = [];
  let newestListing: Date | undefined;

  try {
    const sb = getSupabaseServer();
    if (sb) {
      const { data } = await sb
        .from("listings")
        .select("id,created_at,updated_at")
        .eq("status", "published")
        .limit(500);
      listings = (data ?? []) as Row[];

      const stamps = listings
        .map((l) => new Date(l.updated_at || l.created_at || 0).getTime())
        .filter((t) => Number.isFinite(t) && t > 0);
      if (stamps.length) newestListing = new Date(Math.max(...stamps));

      const { data: bdata } = await sb.from("buildings").select("id,created_at").limit(500);
      buildings = (bdata ?? []) as { id: string; created_at: string | null }[];
    }
  } catch {
    // A sitemap missing its dynamic entries is better than a 500.
  }

  for (const r of ROUTES) {
    for (const loc of ["en", "ar"]) {
      const lastModified = LISTING_DRIVEN.has(r) ? newestListing : undefined;
      entries.push({
        url: `${SITE}/${loc}${r}`,
        ...(lastModified ? { lastModified } : {}),
        changeFrequency: r === "" || r === "/listings" ? "daily" : "weekly",
        priority: r === "" ? 1 : r === "/listings" || r === "/rent-index" ? 0.9 : 0.6,
        alternates: { languages: langs(r) },
      });
    }
  }

  for (const l of listings) {
    const stamp = l.updated_at || l.created_at;
    for (const loc of ["en", "ar"]) {
      entries.push({
        url: `${SITE}/${loc}/listings/${l.id}`,
        ...(stamp ? { lastModified: new Date(stamp) } : {}),
        changeFrequency: "weekly",
        priority: 0.7,
        alternates: { languages: langs(`/listings/${l.id}`) },
      });
    }
  }

  for (const b of buildings) {
    for (const loc of ["en", "ar"]) {
      entries.push({
        url: `${SITE}/${loc}/building/${b.id}`,
        ...(b.created_at ? { lastModified: new Date(b.created_at) } : {}),
        changeFrequency: "weekly",
        priority: 0.6,
        alternates: { languages: langs(`/building/${b.id}`) },
      });
    }
  }

  // District pages were emitted as /listings?district=<id>. A query string on an
  // otherwise identical page is a duplicate of /listings as far as a crawler is
  // concerned, and it carried an invented lastmod too. Dropped rather than
  // shipped as filler; when real district landing pages exist they can be added
  // back as proper paths.

  return entries;
}
