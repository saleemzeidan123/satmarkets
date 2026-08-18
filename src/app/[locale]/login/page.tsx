import LoginForm from "@/components/LoginForm";
import { getSessionUser } from "@/lib/auth/session";
import { safeNext } from "@/lib/authRedirect";

// SM-P1-009 / a Codex correction on top of it. A `?step=set-password` in the
// address bar used to be enough, by itself, to show the set-password form.
// That is a public query string; nothing prevents anybody from typing it, and
// nothing about it proves an invitation or recovery link was ever opened. The
// only thing that can prove that is Supabase's own session, checked here on
// the server with `getUser()` (via getSessionUser, which validates the JWT
// against the auth server rather than trusting a cookie blob) before the
// client ever renders anything. A request with the query string but no real
// session gets "linkInvalid", never the form.
export default async function LoginPage(props: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ step?: string; next?: string }>;
}) {
  const params = await props.params;
  const sp = await props.searchParams;
  const wantsSetPassword = sp.step === "set-password";
  const hasSession = wantsSetPassword ? !!(await getSessionUser()) : false;
  const initialStep = wantsSetPassword ? (hasSession ? "setPassword" : "linkInvalid") : "choose";
  const nextAfter = wantsSetPassword ? safeNext(sp.next) : `/${params.locale}/go`;
  return <LoginForm locale={params.locale} initialStep={initialStep} nextAfter={nextAfter} />;
}
