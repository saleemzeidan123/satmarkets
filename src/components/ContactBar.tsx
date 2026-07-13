"use client";
import { getDictionary } from "@/i18n/getDictionary";
import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";

type Props = {
  phone?: string | null;
  email?: string | null;
  channels: string[];
  refCode: string;
  title: string;
  url: string;
  messageHref: string;
  listingId: string;
  ar: boolean;
};

function buttons({ phone, email, channels, refCode, title, url, messageHref, listingId, ar }: Props): ReactNode[] {
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
  // This used to be a link to the inbox. It opened no conversation, because there
  // were no conversations: the inbox was four hardcoded strings and the message box
  // faked a reply from the owner after 900ms. Now it opens a real thread with this
  // listing's lister, or tells you to sign in, which is the truth.
  if (has("message"))
    btns.push(<MessageLister key="msg" listingId={listingId} messageHref={messageHref} ar={ar} className={`${base} border border-line`} />);
  return btns;
}

function MessageLister({ listingId, messageHref, ar, className }: { listingId: string; messageHref: string; ar: boolean; className: string }) {
  const t = getDictionary(ar ? "ar" : "en").chrome;
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function open() {
    setBusy(true); setErr(null);
    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ listing_id: listingId }),
      });
      const j = await res.json().catch(() => ({}));
      if (res.status === 401) {
        // Say what is actually required, rather than opening an empty inbox.
        router.push(messageHref.replace("/messages", "/login"));
        return;
      }
      if (!res.ok || !j.conversation_id) {
        setErr(ar ? "تعذّر فتح المحادثة." : "Could not open the conversation.");
        setBusy(false);
        return;
      }
      router.push(`${messageHref}?c=${j.conversation_id}`);
    } catch {
      setErr(ar ? "تعذّر فتح المحادثة." : "Could not open the conversation.");
      setBusy(false);
    }
  }

  return (
    <button type="button" onClick={open} disabled={busy} className={className}>
      {busy ? (ar ? "جارٍ" : "Opening") : t.message}
      {err && <span className="sr-only">{err}</span>}
    </button>
  );
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
