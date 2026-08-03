import { isLocale } from "@/i18n/config";
import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { getSupabaseServer } from "@/lib/supabase/server";
import { listingTitle } from "@/lib/listingTitle";
import MessagesClient, { type ConvRow } from "@/components/MessagesClient";
import { entityName } from "@/lib/displayName";

export const dynamic = "force-dynamic";

// The inbox, from the database.
//
// Every conversation here is a row, visible only to its two parties (and SAT),
// enforced at the database rather than by this query. If the RLS were removed
// tomorrow this page would still only ask for the caller's own threads, but that is
// belt, not braces: the braces are the policy.
export default async function MessagesPage(
  props: {
    params: Promise<{ locale: string }>;
    searchParams: Promise<{ c?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  if (!isLocale(params.locale)) notFound();
  const locale = params.locale;

  const su = await getSessionUser();
  if (!su) redirect(`/${locale}/login`);

  const sb = getSupabaseServer();
  if (!sb) notFound();

  const { data: rows } = await sb
    .from("conversations")
    .select(`
      id, listing_id, owner_account_id, enquirer_user_id, last_message_at,
      listings ( title_en, title_ar, reference_code, asset_type, districts(name_en,name_ar,city) ),
      accounts:owner_account_id ( name_en, name_ar ),
      users:enquirer_user_id ( full_name, email )
    `)
    .order("last_message_at", { ascending: false })
    .limit(50);

  const list = (rows ?? []) as any[];

  // Unread, per thread: messages from the OTHER side that you have not read.
  const ids = list.map((c) => c.id);
  const unread = new Map<string, number>();
  if (ids.length) {
    const { data: um } = await sb
      .from("messages")
      .select("conversation_id, sender_side")
      .in("conversation_id", ids)
      .is("read_at", null);
    for (const m of (um ?? []) as any[]) {
      const c = list.find((x) => x.id === m.conversation_id);
      if (!c) continue;
      const iAmOwner = c.owner_account_id === su.accountId;
      const fromOther = iAmOwner ? m.sender_side === "enquirer" : m.sender_side === "owner";
      if (fromOther) unread.set(m.conversation_id, (unread.get(m.conversation_id) ?? 0) + 1);
    }
  }

  const ar = locale === "ar";
  const conversations: ConvRow[] = list.map((c) => {
    const iAmOwner = c.owner_account_id === su.accountId;
    const title = listingTitle(c.listings, ar ? "ar" : "en");
    const counterpart = iAmOwner
      ? (c.users?.full_name || c.users?.email || (ar ? "مستفسر" : "Enquirer"))
      : (entityName(c.accounts, ar ? "ar" : "en") || (ar ? "المُعلن" : "The lister"));
    return {
      id: c.id,
      listing_id: c.listing_id,
      listing_title: title,
      counterpart,
      side: iAmOwner ? "owner" : "enquirer",
      last_at: c.last_message_at,
      unread: unread.get(c.id) ?? 0,
    };
  });

  return (
    <MessagesClient
      locale={locale}
      conversations={conversations}
      initialActive={searchParams?.c ?? null}
      me={su.userId ?? ""}
    />
  );
}
