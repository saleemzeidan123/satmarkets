// src/app/[locale]/ops/layout.tsx
// P0-1: keep the synthetic ops console out of search indexes and give it an honest title.
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "SAT Markets, internal data operations (synthetic)",
  description: "Internal synthetic data-operations simulation. Not public data, not indexed.",
  robots: { index: false, follow: false, nocache: true },
};

export default function OpsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
