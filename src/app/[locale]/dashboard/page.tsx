import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/getDictionary";
import { getSupabaseServer } from "@/lib/supabase/server";
import OnboardingForm from "@/components/OnboardingForm";
import type { Listing } from "@/lib/types";

const PREVIEW_ACCOUNT = "a1111111-1111-1111-1111-111111111111";

export default async function DashboardPage({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound();
  const locale = params.locale;
  const dict = getDictionary(locale);
  const sb = getSupabaseServer();
  if (!sb) return <p className="text-charcoal/50">Not configured.</p>;

  const { data: auth } = await sb.auth.getUser();
  const user = auth?.user ?? null;
  let isSat = false, acctId: string | null = null, acctName = "", verified = true, email = "";

  if (user) {
    email = user.email ?? "";
    const { data: me } = await sb.from("users")
      .select("id, role, account_id, accounts(type, legal_name, verification_status)")
      .eq("auth_user_id", user.id).single();
    isSat = !!(await sb.rpc("app_is_sat")).data;
    acctId = me?.account_id ?? null;
    const acct: any = me?.accounts; acctName = acct?.legal_name ?? ""; verified = acct?.verification_status === "verified";
    if (!acctId && !isSat) {
      return (
        <section className="py-6">
          <h1 className="font-display text-2xl text-charcoal">Dashboard</h1>
          <p className="mt-2 text-sm text-charcoal/60">Signed in as {email}</p>
          <div className="mt-6 max-w-xl"><OnboardingForm /></div>
        </section>
      );
    }
  } else {
    // Open preview, sign-in disabled while testing
    isSat = true; acctId = PREVIEW_ACCOUNT; acctName = "Preview";
  }

  let listings: Listing[] = [];
  if (user && acctId) {
    const { data } = await sb.from("listings").select("*").eq("account_id", acctId).order("created_at", { ascending: false });
    listings = (data as Listing[]) ?? [];
  } else {
    const { data } = await sb.from("listings").select("*").eq("status", "published").order("created_at", { ascending: false }).limit(25);
    listings = (data as Listing[]) ?? [];
  }

  return (
    <section className="py-6">
      {!user && (
        <div className="mb-5 rounded-xl border border-signal/30 bg-signal/5 px-4 py-3 text-sm text-charcoal/70">
          Open preview, sign-in is disabled while we test. You can browse the dashboard and admin; saving a listing will need sign-in re-enabled.
        </div>
      )}
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl text-charcoal">Dashboard</h1>
        <div className="flex gap-2.5">
          {isSat && <Link href={`/${locale}/admin`} className="rounded-lg border border-line px-3 py-1.5 text-sm hover:border-signal/40">Admin</Link>}
          <Link href={`/${locale}/dashboard/new`} className="btn-gold px-3.5 py-1.5 text-sm font-medium">New listing</Link>
        </div>
      </div>
      <p className="mt-2 text-sm text-charcoal/55">{user ? `Signed in as ${email}` : "Preview"}{acctName ? ` · ${acctName}` : ""}</p>
      {user && acctId && !verified && (
        <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">{dict.dash.verifyPending}</div>
      )}
      <div className="mt-6 overflow-x-auto overflow-hidden rounded-xl border border-line bg-white">
        <table className="w-full min-w-[520px] text-sm">
          <thead className="bg-ivory-2/60 text-left text-xs uppercase text-charcoal/50">
            <tr><th className="px-4 py-2.5">Title</th><th className="px-4 py-2.5">Type</th><th className="px-4 py-2.5">Area</th><th className="px-4 py-2.5">Status</th></tr>
          </thead>
          <tbody>
            {listings.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-6 text-charcoal/50">No listings yet.</td></tr>
            ) : listings.map((l) => (
              <tr key={l.id} className="border-t border-line">
                <td className="px-4 py-2.5">{l.title_en || l.reference_code}</td>
                <td className="px-4 py-2.5 uppercase text-charcoal/55">{l.asset_type}</td>
                <td className="px-4 py-2.5 tnum">{l.area_sqm} sqm</td>
                <td className="px-4 py-2.5"><span className="rounded bg-slate/10 px-2 py-0.5 text-xs text-slate">{l.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
