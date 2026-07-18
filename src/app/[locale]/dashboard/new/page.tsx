import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { redirect } from "next/navigation";
import { getSupabaseServer } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth/session";
import NewListingForm from "@/components/NewListingForm";

export default async function NewListingPage({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound();
  const locale = params.locale;
  const sb = getSupabaseServer();
  if (!sb) return <p className="text-charcoal/50">Not configured.</p>;
  // This used to fall back to a hardcoded PREVIEW_ACCOUNT, which was SAT's own
  // account id, so an unauthenticated visitor was silently pointed at SAT's
  // inventory. Listing requires a real, verified account. No fallback.
  const su = await getSessionUser();
  if (!su) redirect(`/${locale}/login`);
  if (!su.accountId) redirect(`/${locale}/signup`);
  const acctId = su.accountId;
  // District centroids (with coordinates) power the map location picker: the lister
  // pins the building and the nearest centroid derives the district.
  const { data: districts } = await sb.from("districts_geo").select("id, name_en, name_ar, city, lat, lng").order("city");
  return (
    <section className="py-6">
      <h1 className="font-display text-2xl text-charcoal">{locale === "ar" ? "عرض جديد" : "New listing"}</h1>
      <div className="mt-6">
        <NewListingForm accountId={acctId} locale={locale} districts={(districts as any) ?? []} />
      </div>
    </section>
  );
}
