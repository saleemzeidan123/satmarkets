import type { MetadataRoute } from "next";
import { getSupabaseServer } from "@/lib/supabase/server";
import { withoutFlaggedSimulatedRows } from "@/lib/inventory";
import { indexingPermitted, mayCountAsProductionInventory } from "@/lib/launchGate";
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

// Route membership lives in lib/routePolicy.ts, shared with the middleware, so
// the sitemap and the noindex headers cannot drift apart. /compare (private
// prototype) and the held-out routes (/area, /pricing, /neutrality, /about)
// are deliberately absent: no sitemap URL may be noindex (PKG-0A / PKG-0A.1).
import { SITEMAP_ROUTES as ROUTES } from "@/lib/routePolicy";

// Routes whose content is driven by the listing set, so the newest listing
// timestamp is a truthful lastmod for them. Everything else is editorial and
// gets no lastmod rather than a fabricated one.
const LISTING_DRIVEN = new Set(["", "/listings", "/map", "/locations", "/market", "/brokers"]);

// Indexing safety (Codex): do not emit per-listing or per-building detail URLs
// while the catalogue is pre-launch sample data. Those pages are noindexed by
// the middleware, so listing them here only points crawlers at throwaway URLs.
//
// ADV-1C.1 correction 1. This used to be one module-level constant reading
// ALLOW_INDEX, and it was read at module load, so a running deployment answered
// with the environment it was built in. It is now `indexingPermitted()`, called
// per request, and it is the AND of two switches: the operator intending this
// host to be indexable, and the owner having recorded that the inventory may be
// presented as production inventory. See `src/lib/launchGate.ts`.
//
// The record gate is the second half and it is the one Codex asked for by name.
// Even with both switches on, a detail URL is emitted only when every row behind
// it clears all four record facts. Today none of them do: every listing is
// flagged simulated, nothing records production display authorization, and
// nothing records an availability confirmation. So this fails closed twice over,
// which is the intended state and not a coincidence worth relying on.

const langs = (path: string) => ({
  en: `${SITE}/en${path}`,
  ar: `${SITE}/ar${path}`,
  "x-default": `${SITE}/en${path}`,
});

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [];

  type Row = {
    id: string;
    created_at: string | null;
    updated_at: string | null;
    is_demo: boolean | null;
    availability_confirmed_at?: string | null;
  };
  let listings: Row[] = [];
  let buildings: { id: string; created_at: string | null }[] = [];
  let newestListing: Date | undefined;

  try {
    const sb = await getSupabaseServer();
    if (sb) {
      // `availability_confirmed_at` is deliberately not selected: no migration
      // creates it, and PostgREST fails the whole query on an unknown column.
      // Its absence is itself one of the four facts, and it reads as `unknown`,
      // which blocks. A gate that needs a column that does not exist must block
      // rather than error, and it must not be quietly dropped from the gate.
      const { data } = await withoutFlaggedSimulatedRows(sb
        .from("listings")
        .select("id,created_at,updated_at,is_demo")
        .eq("status", "published"))
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

  // Both switches, then every row. `mayCountAsProductionInventory` returns not
  // eligible for an empty set too, so a failed read cannot open the gate by
  // leaving nothing to object to.
  const detailUrlsPermitted = indexingPermitted() && mayCountAsProductionInventory(listings).eligible;

  if (detailUrlsPermitted) for (const l of listings) {
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

  // Buildings ride on the listings verdict rather than carrying their own. A
  // building page is a page about the spaces inside it, so indexing one while its
  // listings are ineligible would index the same claim by another route.
  if (detailUrlsPermitted) for (const b of buildings) {
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
