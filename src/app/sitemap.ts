import type { MetadataRoute } from "next";
import { getSupabaseServer } from "@/lib/supabase/server";

const SITE = "https://satmarkets-sat-markets.vercel.app";
const ROUTES = ["", "/listings", "/map", "/rent-index", "/area", "/find", "/advisor", "/compare", "/invest", "/pricing", "/about", "/requirements", "/post-requirement", "/deal", "/locations"];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const entries: MetadataRoute.Sitemap = [];
  for (const r of ROUTES) {
    for (const loc of ["en", "ar"]) {
      entries.push({
        url: `${SITE}/${loc}${r}`,
        lastModified: now,
        changeFrequency: r === "" || r === "/listings" ? "daily" : "weekly",
        priority: r === "" ? 1 : r === "/listings" || r === "/rent-index" ? 0.9 : 0.6,
        alternates: { languages: { en: `${SITE}/en${r}`, ar: `${SITE}/ar${r}` } },
      });
    }
  }
  try {
    const sb = getSupabaseServer();
    if (sb) {
      const { data } = await sb.from("listings").select("id,created_at").eq("status", "published").limit(500);
      (data ?? []).forEach((l: any) => {
        for (const loc of ["en", "ar"]) {
          entries.push({
            url: `${SITE}/${loc}/listings/${l.id}`,
            lastModified: l.created_at ? new Date(l.created_at) : now,
            changeFrequency: "weekly",
            priority: 0.7,
            alternates: { languages: { en: `${SITE}/en/listings/${l.id}`, ar: `${SITE}/ar/listings/${l.id}` } },
          });
        }
      });
    }
  } catch {}
  return entries;
}
