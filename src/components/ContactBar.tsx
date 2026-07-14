"use client";
import { getDictionary } from "@/i18n/getDictionary";
import { useState } from "react";
import { useRouter } from "next/navigation";

// Contact the lister. Rebuilt 2026-07-14 on the Fable design consult: WhatsApp is
// the one decisive action in the Saudi market (~85 to 90% reach), so it is a single
// filled primary, not one of four equal chips. Call and the SAT message thread are
// quieter secondary doors. Email is the weakest channel (a raw mailto leaks the
// lister address and breaks on mobile) so it is demoted to a plain text link.
// Contrast fix: WhatsApp brand green #25D366 on white is 1.9:1 and fails WCAG, so
// the fill is #1B7A50 (5.3:1 with white text). No em dashes. RTL via logical props.

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

const WA_FILL = "#1B7A50";
const WA_HOVER = "#176E48";

function IconWhatsApp() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5.1-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-3-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.6-6.1c-.3-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.6.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3a.4.4 0 0 0 0-.4c0-.1-.6-1.4-.8-1.9s-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.8 11.9 11.9 0 0 0 4.5 4 5.2 5.2 0 0 0 3.2.7 2.7 2.7 0 0 0 1.8-1.3 2.2 2.2 0 0 0 .2-1.3c-.1-.1-.3-.2-.6-.3Z" />
    </svg>
  );
}
function IconPhone() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7 12.8 12.8 0 0 0 .7 2.8 2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.2a2 2 0 0 1 2.1-.5 12.8 12.8 0 0 0 2.8.7 2 2 0 0 1 1.7 2Z" />
    </svg>
  );
}
function IconChat() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 11.5a8.4 8.4 0 0 1-11.8 7.7L3 21l1.9-6.2A8.4 8.4 0 1 1 21 11.5Z" />
    </svg>
  );
}

const primaryCls =
  "flex h-12 w-full items-center justify-center gap-2 rounded-xl px-4 text-[15px] font-semibold text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-harbor focus-visible:ring-offset-2";
const ghostCls =
  "flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-line bg-white px-3 text-[14px] font-semibold text-ink transition-colors hover:border-harbor hover:bg-harbor/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-harbor focus-visible:ring-offset-2";

/** The shared channel block, hierarchy first. Used by the desktop card and the
 *  mobile sticky dock. */
function Channels(p: Props) {
  const t = getDictionary(p.ar ? "ar" : "en").chrome;
  const text = p.ar
    ? `مرحباً، مهتم بالعرض ${p.refCode}: ${p.title}\n${p.url}`
    : `Hello, I am interested in listing ${p.refCode}: ${p.title}\n${p.url}`;
  const enc = encodeURIComponent(text);
  const digits = (p.phone || "").replace(/[^\d]/g, "");
  const has = (c: string) => p.channels.includes(c);

  const wa = has("whatsapp") && digits;
  const call = has("call") && p.phone;
  const message = has("message");
  const email = has("email") && p.email;

  const primary = wa ? (
    <a
      key="wa"
      href={`https://wa.me/${digits}?text=${enc}`}
      target="_blank"
      rel="noopener"
      className={primaryCls}
      style={{ background: WA_FILL }}
      onMouseEnter={(e) => (e.currentTarget.style.background = WA_HOVER)}
      onMouseLeave={(e) => (e.currentTarget.style.background = WA_FILL)}
    >
      <IconWhatsApp />
      <span>{t.whatsapp}</span>
    </a>
  ) : call ? (
    <a key="call-primary" href={`tel:${p.phone}`} className={primaryCls} style={{ background: "var(--harbor)" }}>
      <IconPhone />
      <span>{t.call}</span>
    </a>
  ) : null;

  const secondary: React.ReactNode[] = [];
  if (wa && call) secondary.push(
    <a key="call" href={`tel:${p.phone}`} className={ghostCls}><IconPhone /><span>{t.call}</span></a>
  );
  if (message) secondary.push(
    <MessageLister key="msg" listingId={p.listingId} messageHref={p.messageHref} ar={p.ar} className={ghostCls} label={t.message} />
  );

  if (!primary && secondary.length === 0 && !email) return null;

  return (
    <div className="flex flex-col gap-2">
      {primary}
      {secondary.length > 0 && (
        <div className={secondary.length > 1 ? "grid grid-cols-2 gap-2" : "grid grid-cols-1"}>{secondary}</div>
      )}
      {email && (
        <a
          href={`mailto:${p.email}?subject=${encodeURIComponent(`${p.refCode}: ${p.title}`)}&body=${enc}`}
          className="mt-0.5 inline-flex items-center justify-center gap-1.5 text-[13px] font-medium text-slate underline-offset-2 hover:text-harbor hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-harbor rounded"
        >
          {t.email}
        </a>
      )}
    </div>
  );
}

function MessageLister({ listingId, messageHref, ar, className, label }: { listingId: string; messageHref: string; ar: boolean; className: string; label: string }) {
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
    <button type="button" onClick={open} disabled={busy} aria-busy={busy || undefined} className={className} aria-label={label || (ar ? "رسالة عبر سات" : "Message")}>
      <IconChat />
      {label ? <span>{busy ? (ar ? "جارٍ" : "Opening") : label}</span> : null}
      {err && <span className="sr-only">{err}</span>}
    </button>
  );
}

// Desktop: inline inside the listing's sticky card.
export function ContactChannels(p: Props) {
  return <Channels {...p} />;
}

// Mobile only: a fixed dock pinned to the bottom of the viewport.
export default function ContactBar(p: Props) {
  const t = getDictionary(p.ar ? "ar" : "en").chrome;
  const text = p.ar
    ? `مرحباً، مهتم بالعرض ${p.refCode}: ${p.title}\n${p.url}`
    : `Hello, I am interested in listing ${p.refCode}: ${p.title}\n${p.url}`;
  const enc = encodeURIComponent(text);
  const digits = (p.phone || "").replace(/[^\d]/g, "");
  const has = (c: string) => p.channels.includes(c);
  const wa = has("whatsapp") && digits;
  const call = has("call") && p.phone;
  const message = has("message");

  if (!wa && !call && !message) return null;

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 grid items-center gap-2 border-t border-line bg-white/90 px-4 pt-3 backdrop-blur md:hidden"
      style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))", gridTemplateColumns: wa && (call || message) ? "1fr auto auto" : "1fr" }}
    >
      {wa ? (
        <a href={`https://wa.me/${digits}?text=${enc}`} target="_blank" rel="noopener" className={primaryCls} style={{ background: WA_FILL }}>
          <IconWhatsApp /><span>{t.whatsapp}</span>
        </a>
      ) : call ? (
        <a href={`tel:${p.phone}`} className={primaryCls} style={{ background: "var(--harbor)" }}>
          <IconPhone /><span>{t.call}</span>
        </a>
      ) : null}
      {wa && call && (
        <a href={`tel:${p.phone}`} aria-label={t.call} className="flex h-12 w-12 items-center justify-center rounded-xl border border-line bg-white text-harbor focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-harbor">
          <IconPhone />
        </a>
      )}
      {wa && message && (
        <MessageLister listingId={p.listingId} messageHref={p.messageHref} ar={p.ar} label="" className="flex h-12 w-12 items-center justify-center rounded-xl border border-line bg-white text-harbor focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-harbor" />
      )}
    </div>
  );
}
