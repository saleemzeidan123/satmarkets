import "@/styles/globals.css";
import "@/styles/sat-platform.css";
import "@/styles/footer.css";
import type { ReactNode } from "react";
import { headers } from "next/headers";
import { getDictionary } from "@/i18n/getDictionary";
import { Source_Serif_4, Hanken_Grotesk, IBM_Plex_Mono, IBM_Plex_Sans_Arabic } from "next/font/google";

// Typography system (Fable review). EN display is Source Serif 4, a low-contrast
// transitional text serif: institutional and sturdy where Playfair's hairlines were
// fragile and read fashion. EN body/UI stays Hanken Grotesk. Arabic is ONE family,
// IBM Plex Sans Arabic, ranged by weight (700 for headings) instead of pairing a
// generic geometric heading font: a single deliberate Arabic voice, humanist enough
// to sit as one system beside the Latin serif. Mono is kept for figures/IDs.
const serif = Source_Serif_4({ subsets: ["latin"], weight: ["400", "500", "600"], display: "swap", variable: "--font-serif" });
const sans = Hanken_Grotesk({ subsets: ["latin"], weight: ["400", "500", "600", "700"], display: "swap", variable: "--font-sans" });
const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], display: "swap", variable: "--font-mono" });
const arabic = IBM_Plex_Sans_Arabic({ subsets: ["arabic"], weight: ["400", "500", "600", "700"], display: "swap", variable: "--font-ar" });

// Root metadata is what every route inherits before its own factory runs, and it
// is also the installed-app identity. It was frozen in English, so an Arabic
// visitor who added the app to a home screen got an English name. It now reads
// the locale the middleware resolved, the same one <html lang> uses below, and
// takes its words from the dictionaries like every other public surface.
export function generateMetadata() {
  const d = getDictionary(headers().get("x-locale") === "ar" ? "ar" : "en").appMeta;
  return {
    title: d.title,
    description: d.description,
    manifest: "/manifest.webmanifest",
    applicationName: d.appName,
    appleWebApp: { capable: true, statusBarStyle: "default" as const, title: d.appName },
    icons: {
      icon: [
        { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
        { url: "/icon-512.png", sizes: "512x512", type: "image/png" }
      ],
      apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }]
    }
  };
}

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover" as const,
  // Harbor-consistent chrome, matching the PWA manifest theme_color. Replaces the
  // retired warm near-black #1C1A15 (gold-family, off the Harbor palette). Both the
  // installed app and the browser tab now carry the single Harbor identity colour.
  themeColor: "#3A6EA5"
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
