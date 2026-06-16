import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getSupabaseServer } from "@/lib/supabase/server";
import NewListingForm from "@/components/NewListingForm";

const PREVIEW_ACCOUNT = "a1111111-1111-1111-1111-111111111111";

export default async function NewListingPage({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound();
  const locale = params.locale;
  const sb = getSupabaseServer();
  if (!sb) return <p className="text-charcoal/50">Not configured.</p>;
  const { data: auth } = await sb.auth.getUser();
  const user = auth?.user ?? null;
  let acctId = PREVIEW_ACCOUNT;
  if (user) {
    const { data: me } = await sb.from("users").select("account_id").eq("auth_user_id", user.id).single();
    if (me?.account_id) acctId = me.account_id as string;
  }
  const { data: districts } = await sb.from("districts").select("id, name_en, city").order("city");
  return (
    <section className="py-6">
      <h1 className="font-display text-2xl text-charcoal">New listing</h1>
      {!user && <p className="mt-2 text-sm text-charcoal/55">Open preview — you can fill the form; saving needs sign-in re-enabled.</p>}
      <div className="mt-6">
        <NewListingForm accountId={acctId} locale={locale} districts={(districts as any) ?? []} />
      </div>
    </section>
  );
}
