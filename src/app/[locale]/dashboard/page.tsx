import { redirect } from "next/navigation";
import Link from "next/link";
import { isLocale } from "@/i18n/config";
import { getSupabaseServer } from "@/lib/supabase/server";
import OnboardingForm from "@/components/OnboardingForm";
import type { Listing } from "@/lib/types";

export default async function DashboardPage({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) redirect("/en/dashboard");
  const locale = params.locale;
  const sb = getSupabaseServer();
  if (!sb) return <p className="text-charcoal/50">Not configured.</p>;

  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) redirect(`/${locale}/login`);

  const { data: me } = await sb
    .from("users")
    .select("id, role, account_id, accounts(type, legal_name, verification_status)")
    .eq("auth_user_id", auth.user.id)
    .single();

  const { data: isSat } = await sb.rpc("app_is_sat");

  if (!me?.account_id && !isSat) {
    return (
      <section className="py-6">
        <h1 className="font-serif text-2xl">Dashboard</h1>
        <p className="mt-2 text-sm text-charcoal/60">Signed in as {auth.user.email}</p>
        <div className="mt-6 max-w-xl">
          <OnboardingForm />
        </div>
      </section>
    );
  }

  let listings: Listing[] = [];
  if (me?.account_id) {
    const { data } = await sb
      .from("listings")
      .select("*")
      .eq("account_id", me.account_id)
      .order("created_at", { ascending: false });
    listings = (data as Listing[]) ?? [];
  }

  return (
    <section className="py-6">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl">Dashboard</h1>
        <div className="flex gap-3">
          {isSat && (
            <Link href={`/${locale}/admin`} className="rounded border border-charcoal/20 px-3 py-1.5 text-sm">
              Admin
            </Link>
          )}
          <Link href={`/${locale}/dashboard/new`} className="rounded bg-gold px-3 py-1.5 text-sm text-white">
            New listing
          </Link>
        </div>
      </div>
      <p className="mt-2 text-sm text-charcoal/60">Signed in as {auth.user.email}</p>

      <div className="mt-6 overflow-hidden rounded-lg border border-charcoal/10 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-ivory text-left text-xs uppercase text-charcoal/50">
            <tr>
              <th className="px-4 py-2">Title</th>
              <th className="px-4 py-2">Type</th>
              <th className="px-4 py-2">Area</th>
              <th className="px-4 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {listings.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-6 text-charcoal/50">No listings yet.</td></tr>
            ) : (
              listings.map((l) => (
                <tr key={l.id} className="border-t border-charcoal/5">
                  <td className="px-4 py-2">{l.title_en || l.reference_code}</td>
                  <td className="px-4 py-2 uppercase text-charcoal/60">{l.asset_type}</td>
                  <td className="px-4 py-2">{l.area_sqm} sqm</td>
                  <td className="px-4 py-2">
                    <span className="rounded bg-slate/10 px-2 py-0.5 text-xs text-slate">{l.status}</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
