"use client";
import { useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";

export default function MobileNav({ items, signIn, signInLabel, lang }: {
  items: { href: string; label: string }[]; signIn: string; signInLabel: string; lang?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="lg:hidden">
      <button aria-label="Menu" onClick={() => setOpen((v) => !v)} className="flex h-9 w-9 items-center justify-center rounded-lg border border-line text-charcoal/70">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          {open ? <><path d="M6 6l12 12"/><path d="M18 6l-12 12"/></> : <><path d="M3 6h18"/><path d="M3 12h18"/><path d="M3 18h18"/></>}
        </svg>
      </button>
      {open && (
        <div className="absolute inset-x-0 top-full z-50 border-b border-line bg-ivory shadow-[0_12px_30px_rgba(20,24,28,0.18)]">
          <nav className="mx-auto flex max-w-7xl flex-col gap-1 px-6 py-3">
            {items.map((n) => (
              <Link key={n.href} href={n.href} onClick={() => setOpen(false)} className="rounded-lg px-2 py-2.5 text-[15px] text-charcoal/80 hover:bg-ivory-2">{n.label}</Link>
            ))}
            <Link href={signIn} onClick={() => setOpen(false)} className="rounded-lg px-2 py-2.5 text-[15px] text-charcoal/60 hover:bg-ivory-2">{signInLabel}</Link>
            {lang ? <div className="mt-2 flex items-center gap-2 border-t border-line px-2 pt-3" onClick={() => setOpen(false)}>{lang}</div> : null}
          </nav>
        </div>
      )}
    </div>
  );
}
