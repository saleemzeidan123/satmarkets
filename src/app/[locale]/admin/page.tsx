import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { isLocale } from "@/i18n/config";
import { getSupabaseServer } from "@/lib/supabase/server";
import type { Listing } from "@/lib/types";

async function setStatus(id: string, status: string, locale: string) {
  "use server";
  const sb = getSupabaseServer();
  if (!sb) return;
  const patch: Record<string, unknown> = { status };
  if (status === "published") patch.right_to_market_confirmed = true;
  await sb.from("listings").update(patch).eq("id", id);
  revalidatePath(`/${locale}/admin`);
}

export default async function AdminPage({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) redirect("/en/admin");
  const locale = params.locale;
  const sb = getSupabaseServer();
  if (!sb) return <p className="text-charcoal/50">Not configured.</p>;
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) redirect(`/${locale}/login`);
  const { data: isSat } = await sb.rpc("app_is_sat");
  if (!isSat) redirect(`/${locale}/dashboard`);

  const { data } = await sb
    .from("listings")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);
  const listings = (data as Listing[]) ?? [];

  return (
    <section className="py-6">
      <h1 className="font-serif text-2xl">Admin: approval queue</h1>
      <p className="mt-2 text-sm text-charcoal/60">SAT only. Review, approve, publish, or reject.</p>
      <div className="mt-6 space-y-2">
        {listings.map((l) => (
          <div key={l.id} className="flex items-center justify-between rounded-lg border border-charcoal/10 bg-white px-4 py-3">
            <div>
              <div className="font-medium">{l.title_en || l.reference_code}</div>
              <div className="text-xs uppercase text-charcoal/50">{l.asset_type} · {l.area_sqm} sqm · {l.status}</div>
            </div>
            <div className="flex gap-2">
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
