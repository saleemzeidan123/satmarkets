import { redirect } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getSupabaseServer } from "@/lib/supabase/server";
import NewListingForm from "@/components/NewListingForm";

export default async function NewListingPage({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) redirect("/en/dashboard/new");
  const locale = params.locale;
  const sb = getSupabaseServer();
  if (!sb) return <p className="text-charcoal/50">Not configured.</p>;
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) redirect(`/${locale}/login`);
  const { data: me } = await sb.from("users").select("account_id").eq("auth_user_id", auth.user.id).single();
  if (!me?.account_id) redirect(`/${locale}/dashboard`);

  return (
    <section className="py-6">
      <h1 className="font-serif text-2xl">New listing</h1>
      <div className="mt-6">
        <NewListingForm accountId={me.account_id as string} locale={locale} />
      </div>
    </section>
  );
}
