import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { allow } from "@/lib/ratelimit";
import { getSessionUser } from "@/lib/auth/session";

export const runtime = "nodejs";

// Edit the owner's public PROFILE (about, website, public contact, logo). Uses the
// service role after confirming the session's own account, and whitelists only the
// profile columns, so identity and verification (name, type, verification_status,
// cr_number) can never be changed from here. Those are SAT-owned.
export async function PATCH(req: NextRequest) {
  if (!allow("account-edit", req, 20)) return NextResponse.json({ error: "rate_limited", code: "rate_limited" }, { status: 429 });

  const su = await getSessionUser();
  if (!su || !su.accountId) return NextResponse.json({ error: "Sign in to edit your profile.", code: "sign_in_to_edit_profile" }, { status: 401 });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return NextResponse.json({ error: "Not configured.", code: "not_configured" }, { status: 503 });

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const patch: Record<string, unknown> = {};
  const str = (v: unknown, max: number) => (typeof v === "string" ? (v.trim().slice(0, max) || null) : undefined);

  const aboutEn = str(body.about_en, 1400); if (aboutEn !== undefined) patch.about_en = aboutEn;
  const aboutAr = str(body.about_ar, 1400); if (aboutAr !== undefined) patch.about_ar = aboutAr;
  const website = str(body.website, 200); if (website !== undefined) patch.website = website;
  const publicEmail = str(body.public_email, 200); if (publicEmail !== undefined) patch.public_email = publicEmail;
  const publicPhone = str(body.public_phone, 40); if (publicPhone !== undefined) patch.public_phone = publicPhone;
  const logoUrl = str(body.logo_url, 400); if (logoUrl !== undefined) patch.logo_url = logoUrl;

  if (typeof patch.website === "string" && !/^https?:\/\//i.test(patch.website as string)) {
    return NextResponse.json({ error: "Website must start with http:// or https://", code: "website_scheme_required" }, { status: 400 });
  }
  if (typeof patch.logo_url === "string" && !/^https?:\/\//i.test(patch.logo_url as string)) {
    return NextResponse.json({ error: "Logo URL must start with http:// or https://", code: "logo_url_scheme_required" }, { status: 400 });
  }
  if (typeof patch.public_email === "string" && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(patch.public_email as string)) {
    return NextResponse.json({ error: "Enter a valid email.", code: "invalid_public_email" }, { status: 400 });
  }

  if (Object.keys(patch).length === 0) return NextResponse.json({ ok: true, note: "nothing to change" });

  const sb = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { error } = await sb.from("accounts").update(patch).eq("id", su.accountId);
  // Finding 203. This returned PostgREST's own message to the browser, which
  // names columns and constraints to a member of the public. The message the
  // person who can act on it needs goes to the log; the person who cannot is
  // told what happened.
  if (error) {
    console.error("[account-edit]", error);
    return NextResponse.json({ error: "Could not save the profile.", code: "profile_save_failed" }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
