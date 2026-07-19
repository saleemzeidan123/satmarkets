import { isLocale } from "@/i18n/config";
import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";

// The post-sign-in router. Everyone used to be sent to /dashboard, which then bounced
// occupiers (who have no account) back to the home page, a confusing round trip. Now
// sign-in lands here and this decides: a supply-side account (owner, broker, SAT) goes
// to the dashboard; a demand-side occupier (a signed-in user with no account) goes to
// their own home. No session at all goes to login.
export const dynamic = "force-dynamic";

export default async function GoPage({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound();
  const lp = params.locale;
  const su = await getSessionUser();
  if (!su) redirect(`/${lp}/login`);
  if (su.accountId) redirect(`/${lp}/dashboard`);
  redirect(`/${lp}/me`);
}
