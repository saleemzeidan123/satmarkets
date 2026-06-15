import "@/styles/globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "SAT Markets",
  description: "Riyadh commercial leasing and sales exchange. Powered by SAT Real Estate. Open to the market."
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" dir="ltr">
      <body>{children}</body>
    </html>
  );
}
