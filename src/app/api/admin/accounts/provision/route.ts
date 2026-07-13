import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSessionUser } from "@/lib/auth/session";
import { authed } from "@/lib/adminauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Turn an approved signup request into an account somebody can actually use.
//
// Until now, approving a signup updated a status column. That was all. No account
// was created, no user, no invitation. SAT clicked "approve" and the world did not
// change; the applicant waited for an email that no code could ever send.
//
// Nobody noticed, because every account in the system had been seeded straight into
// the database. The demo worked. Onboarding did not exist. That is exactly the trap
// this endpoint closes: from here on, the ONLY way an account comes into being is
// through this door, and the seeder must use it too.
//
// What it does, in order:
//   1. creates the account (unverified: approval to join is not verification)
//   2. creates the auth identity and emails an invitation, so the person sets their
//      own password and we never see it
//   3. links the two through public.users
//   4. marks the signup request provisioned, with the account id, so this is
//      idempotent and an approved request cannot be provisioned twice
//
// The account starts UNVERIFIED on purpose. Letting someone in is not the same as
// vouching for them, and the verified badge has a ledger behind it (PR-AJ).

const ROLE_TO_ACCOUNT_TYPE: Record<string, string> = {
  owner: "owner",
  broker: "broker",
  investor: "investor",
  occupier: "occupier",
};

export async function POST(req: NextRequest) {
  // Two ways in, and both are the front door.
  //
  //  - a SAT session, when a human clicks provision in the console
  //  - the admin token, when the seeder does it
  //
  // The seeder is held to the same interface as the operator on purpose. If
  // provisioning ever breaks, the seed breaks with it, loudly, instead of the demo
  // quietly continuing to work over an onboarding path that no longer functions.
  const token = process.env.ADMIN_REVIEW_TOKEN || process.env.CRON_SECRET;
  const su = await getSessionUser();
  const isOperator = !!su?.isSat;
  const isScript = !!token && authed(req, token);
  if (!isOperator && !isScript) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return NextResponse.json({ error: "not_configured" }, { status: 503 });

  let body: { signup_id?: string } = {};
  try { body = await req.json(); } catch {}
  if (!body.signup_id) return NextResponse.json({ error: "signup_id required" }, { status: 400 });

  const sb = createClient(url, key, { auth: { persistSession: false } });

  const { data: reqRow, error: readErr } = await sb
    .from("signup_requests")
    .select("id,role,full_name,company,email,phone,status,is_demo,details")
    .eq("id", body.signup_id)
    .maybeSingle();

  if (readErr || !reqRow) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const r = reqRow as any;

  if (r.status === "provisioned") {
    return NextResponse.json({ error: "Already provisioned." }, { status: 409 });
  }
  if (r.status !== "approved") {
    return NextResponse.json(
      { error: "Approve the request before provisioning it. Approval is a decision; this is the consequence." },
      { status: 409 }
    );
  }

  const accountType = ROLE_TO_ACCOUNT_TYPE[String(r.role)] ?? "occupier";
  const displayName = String(r.company || r.full_name).slice(0, 160);

  // 1. The account. Unverified, deliberately.
  const { data: acct, error: acctErr } = await sb
    .from("accounts")
    .insert({
      type: accountType,
      legal_name: displayName,
      name_en: displayName,
      verification_status: "unverified",
      is_demo: !!r.is_demo,
    })
    .select("id")
    .single();

  if (acctErr || !acct) {
    console.error("[provision] account", acctErr);
    return NextResponse.json({ error: "Could not create the account." }, { status: 500 });
  }

  // 2. The identity. We invite; we never set or see a password.
  const site = process.env.NEXT_PUBLIC_SITE_URL || "";
  const { data: invited, error: inviteErr } = await sb.auth.admin.inviteUserByEmail(
    String(r.email),
    { redirectTo: site ? `${site}/en/login` : undefined }
  );

  if (inviteErr || !invited?.user) {
    // Do not leave a half-built account behind. A partial provision is worse than
    // none, because it looks finished.
    await sb.from("accounts").delete().eq("id", acct.id);
    console.error("[provision] invite", inviteErr);
    return NextResponse.json(
      { error: "Could not send the invitation. The account was not created." },
      { status: 500 }
    );
  }

  // 3. Link them.
  const { error: userErr } = await sb.from("users").insert({
    account_id: acct.id,
    email: String(r.email),
    full_name: r.full_name ? String(r.full_name).slice(0, 120) : null,
    phone: r.phone ? String(r.phone).slice(0, 40) : null,
    role: accountType === "owner" || accountType === "broker" ? "lister" : "occupier",
    auth_user_id: invited.user.id,
    is_demo: !!r.is_demo,
  });

  if (userErr) {
    await sb.auth.admin.deleteUser(invited.user.id);
    await sb.from("accounts").delete().eq("id", acct.id);
    console.error("[provision] user", userErr);
    return NextResponse.json({ error: "Could not link the user." }, { status: 500 });
  }

  // 4. Close the request against the account it produced. Idempotent from here.
  await sb
    .from("signup_requests")
    .update({
      status: "provisioned",
      details: { ...(r.details ?? {}), account_id: acct.id, provisioned_at: new Date().toISOString() },
    })
    .eq("id", r.id);

  return NextResponse.json({
    ok: true,
    account_id: acct.id,
    auth_user_id: invited.user.id,
    invited: r.email,
    note: "Account created unverified and an invitation sent. Verification is a separate decision with its own ledger.",
  });
}
