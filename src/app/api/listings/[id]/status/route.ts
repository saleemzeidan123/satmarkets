import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth/session";
import { getSupabaseServer } from "@/lib/supabase/server";

// Owners could see their listings but never act on them: there was no pause, no
// unpublish, nothing. A listing you cannot take down is a listing you do not
// control, and on a leasing exchange that matters, because the space may be gone.
//
// Only two transitions are allowed here, and only between them:
//   published -> archived   (take it off the market)
//   archived  -> published  (put it back)
// Anything else, including moving a draft straight to published, belongs to the
// review path and is not opened up by this route.
//
// Ownership is enforced at the database ("owner manage own listings"), and re-checked
// here so a wrong id fails as Not found rather than leaking that it exists.

const ALLOWED: Record<string, string> = { published: "archived", archived: "published" };

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const su = await getSessionUser();
  if (!su || !su.accountId) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const sb = getSupabaseServer();
  if (!sb) return NextResponse.json({ error: "Not configured." }, { status: 500 });

  const { data: listing } = await sb
    .from("listings")
    .select("id,account_id,status")
    .eq("id", params.id)
    .maybeSingle();

  // Not yours, or not there: same answer either way.
  if (!listing || (!su.isSat && (listing as any).account_id !== su.accountId)) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const from = (listing as any).status as string;
  const to = ALLOWED[from];
  if (!to) {
    return NextResponse.json(
      { error: "Only a published listing can be paused, and only a paused one resumed." },
      { status: 400 }
    );
  }

  const { error } = await sb
    .from("listings")
    .update({ status: to, updated_at: new Date().toISOString() })
    .eq("id", params.id);
  if (error) return NextResponse.json({ error: "Could not update the listing." }, { status: 500 });

  revalidatePath("/en/dashboard/listings");
  revalidatePath("/ar/dashboard/listings");
  revalidatePath("/en/dashboard");
  revalidatePath("/ar/dashboard");
  return NextResponse.json({ ok: true, from, to });
}
