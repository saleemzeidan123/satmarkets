import "@/styles/globals.css";
import "@/styles/sat-platform.css";
import "@/styles/footer.css";
import type { ReactNode } from "react";
import { headers } from "next/headers";
import { Playfair_Display, Hanken_Grotesk, IBM_Plex_Mono, IBM_Plex_Sans_Arabic } from "next/font/google";

const serif = Playfair_Display({ subsets: ["latin"], weight: ["500", "600", "700"], display: "swap", variable: "--font-serif" });
const sans = Hanken_Grotesk({ subsets: ["latin"], weight: ["400", "500", "600", "700"], display: "swap", variable: "--font-sans" });
const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], display: "swap", variable: "--font-mono" });
const arabic = IBM_Plex_Sans_Arabic({ subsets: ["arabic"], weight: ["400", "500", "600", "700"], display: "swap", variable: "--font-ar" });

export const metadata = {
  title: "SAT Markets | Verified commercial real estate, Saudi Arabia",
  description: "Riyadh-first commercial leasing and sales exchange. Verified listings, decision-grade rent index, AI search. A neutral, verified commercial real estate intelligence platform.",
  manifest: "/manifest.webmanifest",
  applicationName: "SAT Markets",
  appleWebApp: { capable: true, statusBarStyle: "default" as const, title: "SAT Markets" },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" }
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }]
  }
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover" as const,
  themeColor: "#ffffff"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  const locale = headers().get("x-locale") === "ar" ? "ar" : "en";
  const dir = locale === "ar" ? "rtl" : "ltr";
  return (
    <html lang={locale} dir={dir} className={`${serif.variable} ${sans.variable} ${mono.variable} ${arabic.variable}`}>
      <body>{children}</body>
    </html>
  );
}
