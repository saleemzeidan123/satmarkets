import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

// Returns null when env is not configured, so build and dev never crash
// before the SAT Markets Supabase project is wired up.
// Next.js 16 made cookies() asynchronous, so this factory is asynchronous too and
// every one of its call sites awaits it. The codemod's alternative was
// a cast of cookies() through the deprecated synchronous-unwrap type, which compiles, warns in
// development and is scheduled for removal, and which would have left the whole
// application's database access resting on a deprecated escape hatch. Seventy-three
// call sites were changed instead.
export async function getSupabaseServer() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  const cookieStore = await cookies();
  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options as any);
          });
        } catch {
          // called from a Server Component; safe to ignore
        }
      }
    }
  });
}
