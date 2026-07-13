"use client";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Icon } from "@/components/satkit";
import { getSupabaseBrowser } from "@/lib/supabase/client";

export type ConvRow = {
  id: string;
  listing_id: string;
  listing_title: string;
  counterpart: string;      // who you are talking TO
  side: "owner" | "enquirer"; // which side YOU are on
  last_at: string;
  unread: number;
};
export type MsgRow = {
  id: string;
  body: string;
  sender_side: "owner" | "enquirer" | "system";
  created_at: string;
};

// The real inbox.
//
// What was here before rendered four conversations from dictionary strings, four
// hardcoded threads, a viewing calendar wired to nothing, an offer button wired to
// nothing, and a deal-progress timeline wired to nothing. And when you sent a
// message, it waited 900 milliseconds and faked a reply from the owner.
//
// Everything below is a row in the database, behind RLS that lets exactly two
// parties (plus SAT) see a thread, and that will not let either of them post as the
// other. Messages cannot be edited or unsent by anyone, including SAT: on a platform
// where a thread may end up as evidence in a dispute, an editable message is worth
// nothing.
export default function MessagesClient({
  locale, conversations, initialActive, me,
}: {
  locale: string;
  conversations: ConvRow[];
  initialActive: string | null;
  me: string;
}) {
  const ar = locale === "ar";
  const t = ar
    ? {
        title: "الرسائل", unread: "غير مقروءة", empty: "لا رسائل بعد",
        emptyBody: "تبدأ المحادثة حين تراسل مُعلناً من صفحة عرضه. وتظهر هنا ردوده.",
        browse: "تصفّح العروض", write: "اكتب رسالة", send: "إرسال",
        pick: "اختر محادثة", you: "أنت", viewListing: "اعرض الإعلان",
        failed: "لم تُرسل الرسالة. حاول مرة أخرى.",
      }
    : {
        title: "Messages", unread: "unread", empty: "No messages yet",
        emptyBody: "A conversation starts when you message a lister from their listing. Their replies land here.",
        browse: "Browse listings", write: "Write a message", send: "Send",
        pick: "Choose a conversation", you: "You", viewListing: "View listing",
        failed: "The message did not send. Try again.",
      };

  const [convs, setConvs] = useState(conversations);
  const [active, setActive] = useState<string | null>(initialActive ?? conversations[0]?.id ?? null);
  const [msgs, setMsgs] = useState<MsgRow[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [pane, setPane] = useState<"list" | "thread">(initialActive ? "thread" : "list");
  const ref = useRef<HTMLDivElement>(null);

  const conv = convs.find((c) => c.id === active) ?? null;
  const unreadTotal = convs.reduce((n, c) => n + c.unread, 0);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    (async () => {
      const sb = getSupabaseBrowser();
      if (!sb) return;
      const { data } = await sb
        .from("messages")
        .select("id, body, sender_side, created_at")
        .eq("conversation_id", active)
        .order("created_at", { ascending: true });
      if (cancelled) return;
      setMsgs((data ?? []) as MsgRow[]);
      // Reading a thread marks the OTHER side's messages as read, never your own.
      await sb.rpc("mark_conversation_read", { p_conversation: active });
      setConvs((cs) => cs.map((c) => (c.id === active ? { ...c, unread: 0 } : c)));
    })();
    return () => { cancelled = true; };
  }, [active]);

  useEffect(() => { ref.current?.scrollTo({ top: 9e9, behavior: "smooth" }); }, [msgs]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = input.trim();
    if (!body || !conv || busy) return;
    setBusy(true); setErr(null);
    const sb = getSupabaseBrowser();
    if (!sb) { setBusy(false); return; }

    const { data, error } = await sb
      .from("messages")
      .insert({ conversation_id: conv.id, sender_side: conv.side, body })
      .select("id, body, sender_side, created_at")
      .single();

    if (error || !data) {
      // No optimistic message. If it did not send, the screen must not pretend it did.
      setErr(t.failed);
      setBusy(false);
      return;
    }
    setMsgs((m) => [...m, data as MsgRow]);
    setInput("");
    setBusy(false);
  }

  const when = (iso: string) =>
    new Date(iso).toLocaleString(ar ? "ar-SA-u-nu-latn" : "en-GB", {
      day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
      hour12: false, timeZone: "Asia/Riyadh",
    });

  if (!convs.length) {
    return (
      <div className="dash" style={{ background: "var(--cool)" }}>
        <div className="dmain" style={{ display: "grid", placeItems: "center", padding: 40 }}>
          <div style={{ textAlign: "center", maxWidth: 420 }}>
            <div style={{ fontSize: 18, fontWeight: 600 }}>{t.empty}</div>
            <p className="muted" style={{ fontSize: 13.5, lineHeight: 1.7, marginTop: 8 }}>{t.emptyBody}</p>
            <Link href={`/${locale}/listings`} className="btn primary" style={{ marginTop: 16 }}>{t.browse}</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={"dash msg-dash pane-" + pane}>
      <aside className="msg-list" style={{ width: 330, flex: "none", background: "var(--paper)", borderRight: "1px solid var(--silver)", display: "flex", flexDirection: "column" }}>
        <div className="dtopbar" style={{ padding: "16px 18px" }}>
          <div>
            <h1 style={{ fontSize: 17 }}>{t.title}</h1>
            <div className="sub">{unreadTotal} {t.unread}</div>
          </div>
        </div>
        <div style={{ flex: 1, overflowY: "auto" }}>
          {convs.map((c) => (
            <div
              key={c.id}
              role="button"
              tabIndex={0}
              aria-current={c.id === active ? "true" : undefined}
              className={"conv" + (c.id === active ? " on" : "")}
              style={{ cursor: "pointer" }}
              onClick={() => { setActive(c.id); setPane("thread"); }}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setActive(c.id); setPane("thread"); } }}
            >
              <span className="avatar" style={{ background: "var(--harbor)" }}>
                {c.counterpart.slice(0, 2).toUpperCase()}
              </span>
              <div className="grow" style={{ minWidth: 0 }}>
                <div className="row between">
                  <span style={{ fontSize: 13.5, fontWeight: 600 }}>{c.counterpart}</span>
                  <span className="mono muted" style={{ fontSize: 10 }}>{when(c.last_at)}</span>
                </div>
                <div className="muted" style={{ fontSize: 11.5, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {c.listing_title}
                </div>
              </div>
              {c.unread > 0 && <span className="un" />}
            </div>
          ))}
        </div>
      </aside>

      <div className="dmain" style={{ display: "flex", flexDirection: "column", background: "var(--cool)" }}>
        {!conv ? (
          <div style={{ display: "grid", placeItems: "center", flex: 1 }} className="muted">{t.pick}</div>
        ) : (
          <>
            <div className="dtopbar">
              <button className="msg-back" aria-label={t.title} onClick={() => setPane("list")} style={{ border: "none", background: "transparent", cursor: "pointer", color: "var(--slate)", padding: 4, marginInlineStart: -4 }}>
                <span style={{ display: "inline-flex", transform: ar ? "none" : "rotate(180deg)" }}><Icon.chevr size={20} /></span>
              </button>
              <span className="avatar" style={{ background: "var(--harbor)" }}>{conv.counterpart.slice(0, 2).toUpperCase()}</span>
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>{conv.counterpart}</h2>
                <div className="sub">{conv.listing_title}</div>
              </div>
              <span style={{ flex: 1 }} />
              <Link href={`/${locale}/listings/${conv.listing_id}`} className="btn secondary sm">
                <Icon.eye size={14} /> {t.viewListing}
              </Link>
            </div>

            <div ref={ref} style={{ flex: 1, overflowY: "auto", padding: "24px 32px" }}>
              <div style={{ maxWidth: 660 }} className="col gap14">
                {msgs.map((m) => {
                  const mine = m.sender_side === conv.side;
                  return (
                    <div key={m.id} className={"chatmsg " + (mine ? "u" : "a")} style={
                      mine
                        ? { alignSelf: "flex-end", background: "var(--ink)", color: "#fff" }
                        : { background: "#fff", border: "1px solid var(--silver)" }
                    }>
                      {m.body}
                      <div style={{ fontSize: 10, opacity: 0.55, marginTop: 6 }}>{when(m.created_at)}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{ padding: "14px 32px 18px", background: "var(--paper)", borderTop: "1px solid var(--silver)" }}>
              <form onSubmit={send} className="search focus" style={{ boxShadow: "none", border: "1px solid var(--silver-2)", padding: "8px 10px 8px 14px", display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={t.write}
                  maxLength={4000}
                  style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontSize: 14, color: "var(--ink)" }}
                />
                <button type="submit" disabled={busy || !input.trim()} className="btn primary sm" aria-label={t.send}>
                  <Icon.send size={15} />
                </button>
              </form>
              {err && <p role="alert" style={{ color: "var(--red)", fontSize: 12, marginTop: 8 }}>{err}</p>}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
