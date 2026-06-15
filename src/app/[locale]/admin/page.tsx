import { redirect } from "next/navigation";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { isLocale } from "@/i18n/config";
import { getSupabaseServer } from "@/lib/supabase/server";

async function setStatus(id: string, status: string, locale: string) {
  "use server";
  const sb = getSupabaseServer(); if (!sb) return;
  const patch: Record<string, unknown> = { status };
  if (status === "published") patch.right_to_market_confirmed = true;
  await sb.from("listings").update(patch).eq("id", id);
  revalidatePath(`/${locale}/admin`);
}
async function verifyOwner(accountId: string, locale: string) {
  "use server";
  const sb = getSupabaseServer(); if (!sb) return;
  await sb.from("accounts").update({ verification_status: "verified" }).eq("id", accountId);
  revalidatePath(`/${locale}/admin`);
}

export default async function AdminPage({ params, searchParams }: { params: { locale: string }; searchParams: { status?: string } }) {
  if (!isLocale(params.locale)) redirect("/en/admin");
  const locale = params.locale;
  const sb = getSupabaseServer();
  if (!sb) return <p className="text-charcoal/50">Not configured.</p>;
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) redirect(`/${locale}/login`);
  const { data: isSat } = await sb.rpc("app_is_sat");
  if (!isSat) redirect(`/${locale}/dashboard`);

  let q = sb.from("listings").select("*, accounts(legal_name, verification_status)").order("created_at", { ascending: false }).limit(100);
  if (searchParams.status === "pending") q = q.in("status", ["draft","pending_review","approved"]);
  const { data } = await q;
  const listings = (data as any[]) ?? [];

  return (
    <section className="py-6">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl">Admin: approval queue</h1>
        <div className="flex gap-2 text-xs">
          <Link href={`/${locale}/admin`} className="rounded border border-charcoal/20 px-3 py-1.5">All</Link>
          <Link href={`/${locale}/admin?status=pending`} className="rounded border border-charcoal/20 px-3 py-1.5">Pending</Link>
        </div>
      </div>
      <div className="mt-6 space-y-2">
        {listings.map((l) => (
          <div key={l.id} className="flex items-center justify-between rounded-lg border border-charcoal/10 bg-white px-4 py-3">
            <div>
              <div className="font-medium">{l.title_en || l.reference_code}</div>
              <div className="text-xs uppercase text-charcoal/50">{l.asset_type} · {l.area_sqm} sqm · {l.status}</div>
              <div className="text-xs text-charcoal/50">{l.accounts?.legal_name} · owner {l.accounts?.verification_status}</div>
            </div>
            <div className="flex gap-2">
              {l.accounts?.verification_status !== "verified" && (
                <form action={async () => { "use server"; await verifyOwner(l.account_id, locale); }}>
                  <button className="rounded border border-slate/40 px-3 py-1.5 text-xs text-slate">Verify owner</button>
                </form>
              )}
              <form action={async () => { "use server"; await setStatus(l.id, "published", locale); }}>
                <button className="rounded bg-gold px-3 py-1.5 text-xs text-white">Publish</button>
              </form>
              <form action={async () => { "use server"; await setStatus(l.id, "rejected", locale); }}>
                <button className="rounded border border-charcoal/20 px-3 py-1.5 text-xs">Reject</button>
              </form>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
