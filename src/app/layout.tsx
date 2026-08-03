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
// PKG-E1-READINESS slice E, WS33. `preload` is false on all four, and that is a
// bilingual decision rather than a performance trick.
//
// There is one root layout for both languages, so all four families are declared
// on <html> whichever direction the reader is in. With next/font's default
// preload every reader was therefore sent every face: thirteen woff2 files,
// measured at 322 kB of transfer on a cold load of any route. An English reader
// downloaded the whole Arabic family and rendered none of it, because
// `[dir="rtl"]` is the only rule in globals.css that reaches for --font-ar. An
// Arabic reader downloaded Source Serif and Hanken Grotesk for the same reason
// in reverse. Preloading is a promise that the file is needed for the first
// paint, and for half of these files on every single request it was not true.
//
// Without the preload link the browser fetches a face when the cascade actually
// matches it, which is exactly the direction the reader is in. The alternative,
// preloading per direction, cannot be expressed here: next/font resolves at
// build time and there is one layout for both languages.
//
// `display` moved from "swap" to "optional" in the same change, and that pairing
// is not optional itself, it is what makes the first one safe. The preload link
// was buying stability as well as speed: the face arrived before the first paint,
// so the swap from the fallback happened before there was anything on screen to
// move. Take the preload away and leave "swap" in place and the swap happens
// afterwards instead, which was measured: cumulative layout shift went from 0.001
// to 0.026 at the median and to 0.387 on the Arabic Rent Index page, a single jump
// of about 56 px roughly 300 ms after paint. "optional" gives the browser a short
// block period and no swap period at all, so the face is either ready in time or
// it is left for the next navigation, and nothing moves either way.
//
// What that costs is stated plainly because it is a real cost: on a genuinely slow
// first visit an Arabic reader may see the system fallback for that one page view.
// It was not reproduced under the synthetic mobile profile, where the face was
// applied in both directions, but a synthetic profile is not a network. The proper
// fix is to deliver each direction its own faces and return to preloading them,
// which is an architecture change and is recorded as the follow-up rather than
// done here.
//
// The saving is symmetric, which is the point. Neither language subsidises the
// other's fonts. Measured before and after in docs/performance-baseline.md.
const serif = Source_Serif_4({ subsets: ["latin"], weight: ["400", "500", "600"], display: "optional", preload: false, variable: "--font-serif" });
const sans = Hanken_Grotesk({ subsets: ["latin"], weight: ["400", "500", "600", "700"], display: "optional", preload: false, variable: "--font-sans" });
const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], display: "optional", preload: false, variable: "--font-mono" });
const arabic = IBM_Plex_Sans_Arabic({ subsets: ["arabic"], weight: ["400", "500", "600", "700"], display: "optional", preload: false, variable: "--font-ar" });

// Root metadata is what every route inherits before its own factory runs, and it
// is also the installed-app identity. It was frozen in English, so an Arabic
// visitor who added the app to a home screen got an English name. It now reads
// the locale the middleware resolved, the same one <html lang> uses below, and
// takes its words from the dictionaries like every other public surface.
export async function generateMetadata() {
  const d = getDictionary((await headers()).get("x-locale") === "ar" ? "ar" : "en").appMeta;
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

export default async function RootLayout({ children }: { children: ReactNode }) {
  const locale = (await headers()).get("x-locale") === "ar" ? "ar" : "en";
  const dir = locale === "ar" ? "rtl" : "ltr";
  return (
    <html lang={locale} dir={dir} className={`${serif.variable} ${sans.variable} ${mono.variable} ${arabic.variable}`}>
      <body>{children}</body>
    </html>
  );
}
