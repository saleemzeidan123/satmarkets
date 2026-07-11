"use client";
import { getDictionary } from "@/i18n/getDictionary";
import type { ReactNode } from "react";

type Props = {
  phone?: string | null;
  email?: string | null;
  channels: string[];
  refCode: string;
  title: string;
  url: string;
  messageHref: string;
  ar: boolean;
};

function buttons({ phone, email, channels, refCode, title, url, messageHref, ar }: Props): ReactNode[] {
  const t = getDictionary(ar ? "ar" : "en").chrome;
  const text = ar
    ? `مرحباً، مهتم بالعرض ${refCode}: ${title}\n${url}`
    : `Hello, I am interested in listing ${refCode}: ${title}\n${url}`;
  const enc = encodeURIComponent(text);
  const digits = (phone || "").replace(/[^\d]/g, "");
  const has = (c: string) => channels.includes(c);
  const base = "flex h-11 flex-1 items-center justify-center gap-2 rounded-xl font-semibold";
  const btns: ReactNode[] = [];
  if (has("whatsapp") && digits)
    btns.push(<a key="wa" href={`https://wa.me/${digits}?text=${enc}`} target="_blank" rel="noopener" className={`${base} bg-[#25D366] text-white`}>WhatsApp</a>);
  if (has("call") && phone)
    btns.push(<a key="call" href={`tel:${phone}`} className={`${base} border border-line`}>{t.call}</a>);
  if (has("email") && email)
    btns.push(<a key="email" href={`mailto:${email}?subject=${encodeURIComponent(`${refCode}: ${title}`)}&body=${enc}`} className={`${base} border border-line`}>{t.email}</a>);
  if (has("message"))
    btns.push(<a key="msg" href={messageHref} className={`${base} border border-line`}>{t.message}</a>);
  return btns;
}

// Desktop: the same channels, rendered inline inside the listing's sticky card.
export function ContactChannels(p: Props) {
  const btns = buttons(p);
  if (btns.length === 0) return null;
  return <div className="flex gap-2">{btns}</div>;
}

// Mobile only: a fixed bar pinned to the bottom of the viewport.
export default function ContactBar(p: Props) {
  const btns = buttons(p);
  if (btns.length === 0) return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 p-3 backdrop-blur md:hidden" style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}>
      <div className="flex gap-2">{btns}</div>
    </div>
  );
}
