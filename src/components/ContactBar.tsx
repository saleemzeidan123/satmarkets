"use client";
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

export default function ContactBar({ phone, email, channels, refCode, title, url, messageHref, ar }: Props) {
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
    btns.push(<a key="call" href={`tel:${phone}`} className={`${base} border border-line`}>{ar ? "اتصال" : "Call"}</a>);
  if (has("email") && email)
    btns.push(<a key="email" href={`mailto:${email}?subject=${encodeURIComponent(`${refCode}: ${title}`)}&body=${enc}`} className={`${base} border border-line`}>{ar ? "البريد" : "Email"}</a>);
  if (has("message"))
    btns.push(<a key="msg" href={messageHref} className={`${base} border border-line`}>{ar ? "رسالة عبر سات" : "Message"}</a>);
  if (btns.length === 0) return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 p-3 backdrop-blur sm:sticky sm:bottom-4 sm:mx-auto sm:max-w-md sm:rounded-2xl sm:border sm:shadow-lg" style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}>
      <div className="flex gap-2">{btns}</div>
    </div>
  );
}
