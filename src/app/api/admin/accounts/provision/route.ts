import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSessionUser } from "@/lib/auth/session";
import { authed } from "@/lib/adminauth";
import { isLocale, defaultLocale } from "@/i18n/config";

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
    .select("id,role,full_name,company,email,phone,status,is_demo,details,locale")
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

  // 2. The identity.
  //
  // For a real person: we INVITE. We never set or see a password. That is the whole
  // point, and it is not negotiable.
  //
  // For a demo persona: we cannot invite, because there is nobody to invite. Supabase
  // rejects the address outright (400: Email address "x@demo.satmarkets.test" is
  // invalid), and even a deliverable address would run into the built-in mailer's rate
  // limit of a couple of sends an hour. So a demo identity is created directly, with
  // no email, and the response SAYS SO rather than reporting an invitation that was
  // never sent.
  //
  // Note what decides this: `r.is_demo`, read from the signup request in the database.
  // NOT a flag in the request body. A caller cannot ask to skip the invitation, because
  // "let me in without an invitation" is exactly the thing an attacker would ask for.
  const site = process.env.NEXT_PUBLIC_SITE_URL || "";
  const isDemo = !!r.is_demo;
  const loc = isLocale(r.locale) ? r.locale : defaultLocale;

  // The invite must land on /auth/callback, the one page that actually
  // exchanges the link's token for a session (PKCE `code=`, or a `token_hash`
  // it can verify). It used to redirect straight to /en/login, a page with no
  // code to do either, which silently established a session from the token
  // (via the client SDK's own default detection) with no password ever
  // asked for and no route back once the link was already spent. `type=invite`
  // survives Supabase's own query-string append, so the callback can tell
  // this apart from an ordinary sign-in link and route to the set-password
  // step instead of straight into the dashboard.
  const { data: invited, error: inviteErr } = isDemo
    ? await sb.auth.admin.createUser({ email: String(r.email), email_confirm: true })
    : await sb.auth.admin.inviteUserByEmail(String(r.email), {
        redirectTo: site
          ? `${site}/auth/callback?type=invite&next=${encodeURIComponent(`/${loc}/go`)}`
          : undefined,
      });

  if (inviteErr || !invited?.user) {
    // Do not leave a half-built account behind. A partial provision is worse than
    // none, because it looks finished.
    await sb.from("accounts").delete().eq("id", acct.id);
    console.error("[provision] identity", inviteErr);
    return NextResponse.json(
      {
        error: isDemo
          ? "Could not create the demo identity. The account was not created."
          : "Could not send the invitation. The account was not created.",
      },
      { status: 500 }
    );
  }

  // 3. Link them. UPSERT, not INSERT, and the distinction is the whole ballgame.
  //
  // There is a trigger on auth.users called on_auth_user_created. The moment step 2
  // creates the identity -- by invitation or directly -- that trigger has ALREADY
  // written the public.users row:
  //
  //   insert into public.users (auth_user_id, email, role) values (new.id, new.email, 'occupier')
  //
  // This route used to INSERT the same email straight afterwards, collide with
  // users_email_key, and roll the whole provision back with "Could not link the user".
  // Which means provisioning could never have completed. Not for a demo persona, not
  // for a real lister. Even with a working mailer, the invitation would have created
  // the auth user, the trigger would have created the row, and this line would have
  // destroyed everything it just built. The email failure was standing in front of it.
  //
  // So we adopt the row the trigger made rather than fight it, and we correct the two
  // things the trigger cannot know: which account this person belongs to, and that an
  // owner or a broker is a LISTER, not an occupier. The trigger defaults everyone to
  // occupier because at auth time nobody has told it otherwise. This is where we tell it.
  const listerRole = accountType === "owner" || accountType === "broker" ? "owner_admin" : "occupier";

  const { error: userErr } = await sb.from("users").upsert(
    {
      account_id: acct.id,
      email: String(r.email),
      full_name: r.full_name ? String(r.full_name).slice(0, 120) : null,
      phone: r.phone ? String(r.phone).slice(0, 40) : null,
      role: listerRole,
      auth_user_id: invited.user.id,
      is_demo: isDemo,
    },
    { onConflict: "email" }
  );

  if (userErr) {
    // Take the trigger's row with us. Deleting the auth user alone leaves an orphan
    // users row behind (auth_user_id is nullable), which then blocks every future
    // attempt at the same email. A rollback that leaves debris is not a rollback.
    await sb.from("users").delete().eq("email", String(r.email));
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
    email: r.email,
    invitation_sent: !isDemo,
    note: isDemo
      ? "DEMO account. No invitation was sent, because there is nobody to invite. Created unverified."
      : "Account created unverified and an invitation sent. Verification is a separate decision with its own ledger.",
  });
}
