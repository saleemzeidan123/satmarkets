import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/en/verify", "/ar/verify", "/en/admin", "/ar/admin"],
      },
    ],
    sitemap: "https://satmarkets-sat-markets.vercel.app/sitemap.xml",
  };
}
