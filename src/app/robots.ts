import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/en/verify", "/ar/verify", "/en/admin", "/ar/admin"],
      },
    ],
    sitemap: `${SITE}/sitemap.xml`,
  };
}
