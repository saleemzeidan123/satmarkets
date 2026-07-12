import { getSupabaseServer } from "@/lib/supabase/server";

// The single server-side source of truth for "who is signed in". Reads the
// Supabase Auth session (cookies) then resolves the app identity through the
// existing SECURITY DEFINER helpers (app_account_id / app_is_sat), which are
// RLS-safe. Returns null for anonymous. PR-B will use this to gate account
// routes and derive identity instead of the ?as= query hack.
export type SessionUser = {
  authId: string;
  userId: string | null;
  email: string | null;
  accountId: string | null;
  isSat: boolean;
};

export async function getSessionUser(): Promise<SessionUser | null> {
  const sb = getSupabaseServer();
  if (!sb) return null;
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return null;
  const [acct, sat, uid] = await Promise.all([
    sb.rpc("app_account_id"),
    sb.rpc("app_is_sat"),
    sb.rpc("app_user_id"),
  ]);
  return {
    authId: user.id,
    userId: (uid.data as string | null) ?? null,
    email: user.email ?? null,
    accountId: (acct.data as string | null) ?? null,
    isSat: sat.data === true,
  };
}
