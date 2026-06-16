import "@/styles/globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "SAT Markets | Verified commercial real estate, Saudi Arabia",
  description: "Riyadh-first commercial leasing and sales exchange. Verified listings, decision-grade rent index, AI search. A neutral, verified commercial real estate intelligence platform."
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" dir="ltr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Inter:wght@400;500;600&family=IBM+Plex+Sans+Arabic:wght@400;500;600&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  );
}
