import type { MetadataRoute } from "next";
import { getSupabaseServer } from "@/lib/supabase/server";
import { SITE } from "@/lib/site";
const ROUTES = ["", "/listings", "/map", "/rent-index", "/area", "/advisor", "/compare", "/pricing", "/about", "/requirements", "/locations", "/market", "/brokers"];

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
      const { data: bdata } = await sb.from("buildings").select("id").limit(500);
      (bdata ?? []).forEach((b: any) => {
        for (const loc of ["en", "ar"]) {
          entries.push({ url: `${SITE}/${loc}/building/${b.id}`, lastModified: now, changeFrequency: "weekly", priority: 0.6, alternates: { languages: { en: `${SITE}/en/building/${b.id}`, ar: `${SITE}/ar/building/${b.id}` } } });
        }
      });
      const { data: ddata } = await sb.from("districts").select("id").limit(200);
      (ddata ?? []).forEach((d: any) => {
        for (const loc of ["en", "ar"]) {
          entries.push({ url: `${SITE}/${loc}/listings?district=${d.id}`, lastModified: now, changeFrequency: "weekly", priority: 0.6, alternates: { languages: { en: `${SITE}/en/listings?district=${d.id}`, ar: `${SITE}/ar/listings?district=${d.id}` } } });
        }
      });
    }
  } catch {}
  return entries;
}
