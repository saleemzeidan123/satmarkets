"use client";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export default function ChromeGate({ header, footer, children }: { header: ReactNode; footer: ReactNode; children: ReactNode }) {
  const path = usePathname() || "";
  const bare = /\/(dashboard|admin)(\/|$)/.test(path);
  return (
    <>
      {!bare && header}
      {children}
      {!bare && footer}
    </>
  );
}
