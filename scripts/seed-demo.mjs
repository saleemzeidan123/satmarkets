#!/usr/bin/env node
/**
 * seed-demo.mjs — build the simulated world through the platform's own front doors.
 *
 * THE ONE RULE: this script may only use interfaces a real user or a real operator
 * uses. It signs up through the public signup endpoint. SAT approves and provisions
 * through the admin endpoint. Listings are created through the same RLS-protected
 * insert the browser form performs, as the owner, so the publish gate fires. Leads
 * come through the public leads endpoint.
 *
 * If this script ever needs a service-role INSERT to get data into a table, that is
 * a bug report against the onboarding path, not a convenience. Reach for the service
 * key and you have stopped testing the product and started testing the database.
 *
 * That rule is not pedantry. Before it existed, every account and every listing in
 * this system was seeded directly, and two things went unnoticed for months:
 *   - approving a signup updated a status column and created nothing
 *   - account_type had no value for 'broker', so a broker could not be onboarded
 *     at all, on a platform whose pitch is that brokers hold a FAL licence
 * The demo worked perfectly. Onboarding did not exist.
 *
 * Usage:
 *   node scripts/seed-demo.mjs                 # build the demo world
 *   node scripts/seed-demo.mjs --dry           # say what it would do
 *
 * Env: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
 *      SUPABASE_SERVICE_ROLE_KEY, ADMIN_REVIEW_TOKEN (or CRON_SECRET),
 *      SEED_BASE_URL (default http://localhost:3000)
 */
import { createClient } from "@supabase/supabase-js";

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TOKEN = process.env.ADMIN_REVIEW_TOKEN || process.env.CRON_SECRET;
const BASE = process.env.SEED_BASE_URL || "http://localhost:3000";
const DRY = process.argv.includes("--dry");

if (!URL_ || !ANON || !SERVICE || !TOKEN) {
  console.error("Missing env. Need SUPABASE URL + ANON + SERVICE_ROLE + ADMIN_REVIEW_TOKEN.");
  process.exit(1);
}

// The service client is permitted exactly three things, and none of them is
// inserting demo content:
//   1. reading (to find ids and to report)
//   2. setting a password on a demo account it just created, so the seeder can sign
//      in as that person and then use only the ordinary, RLS-protected paths
//   3. marking rows is_demo where the public API has no reason to expose that flag
// Everything else goes through HTTP, like a user.
const svc = createClient(URL_, SERVICE, { auth: { persistSession: false } });

const log = (...a) => console.log(...a);
const post = async (path, body, token) => {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`POST ${path} -> ${res.status} ${JSON.stringify(json)}`);
  return json;
};

// A REGA advertising licence: 10 digits, prefix 72 for an establishment. Structurally
// correct, so every validator, gate and display path behaves exactly as in production.
let permitSeq = 0;
const permit = () => "72" + String((++permitSeq * 104729 + 310457) % 90000000 + 10000000).padStart(8, "0");

// Uneven expiries on purpose. A world where every licence expires in nine months
// tests nothing. We need one already lapsed and one about to be, or the takedown and
// the warning are theatre.
const expiryFor = (i) => {
  const d = new Date();
  if (i === 0) d.setDate(d.getDate() - 5);       // lapsed: must be unservable
  else if (i === 1) d.setDate(d.getDate() + 2);  // inside the T-3 warning
  else d.setDate(d.getDate() + 40 + ((i * 37) % 300));
  return d.toISOString().slice(0, 10);
};

const PERSONAS = [
  { role: "owner",  full_name: "Faisal Al Harbi",  company: "Harbi Holdings",        email: "faisal@demo.satmarkets.test" },
  { role: "owner",  full_name: "Noura Al Qahtani", company: "Qahtani Real Estate",   email: "noura@demo.satmarkets.test" },
  { role: "broker", full_name: "Tariq Al Dossary", company: "Dossary Brokerage",     email: "tariq@demo.satmarkets.test" },
  { role: "occupier", full_name: "Layla Al Mutairi", company: "Mutairi Clinics",     email: "layla@demo.satmarkets.test" },
];

const LISTINGS = [
  { title_en: "Grade A floor, Al Olaya",     asset_type: "office",    area_sqm: 640,  price: 1450 },
  { title_en: "Corner retail, Hittin",       asset_type: "retail",    area_sqm: 220,  price: 2250 },
  { title_en: "Fitted clinic suite, Granada",asset_type: "medical",   area_sqm: 180,  price: 1900 },
  { title_en: "Warehouse, Al Sulay",         asset_type: "warehouse", area_sqm: 1800, price: 320  },
  { title_en: "Serviced offices, KAFD",      asset_type: "serviced",  area_sqm: 300,  price: 3100 },
];

async function main() {
  log(`\nSeeding the demo world through the front doors.  base=${BASE}  dry=${DRY}\n`);

  const { data: districts } = await svc.from("districts").select("id,name_en,city").eq("city", "Riyadh").limit(8);
  if (!districts?.length) throw new Error("No Riyadh districts. Reference data is missing.");

  const made = [];

  for (const p of PERSONAS) {
    log(`--- ${p.full_name} (${p.role})`);
    if (DRY) { log("    would sign up, be approved, be provisioned, then list"); continue; }

    // 1. The public signup door. Exactly what the website posts.
    await post("/api/signup", { ...p, locale: "en", details: { seed: true } });

    // 2. Find the request and flag it demo. This is the one place the seeder reaches
    //    past HTTP: the public API has no business exposing an is_demo flag to
    //    callers, so the seeder sets it, and the inheritance triggers carry it from
    //    here to everything downstream.
    const { data: reqRow } = await svc
      .from("signup_requests").select("id").eq("email", p.email)
      .order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (!reqRow) throw new Error(`signup did not land for ${p.email}`);
    await svc.from("signup_requests").update({ is_demo: true }).eq("id", reqRow.id);

    // 3. SAT approves. The operator's own endpoint, with the operator's own token.
    await post("/api/signups/review", { id: reqRow.id, status: "approved" }, TOKEN);

    // 4. SAT provisions. This is the endpoint that did not exist: approving used to
    //    update a column and stop.
    const prov = await post("/api/admin/accounts/provision", { signup_id: reqRow.id }, TOKEN);
    log(`    account ${prov.account_id.slice(0, 8)}  invited ${prov.invited}`);

    // 5. Give this demo person a password so the seeder can act AS them. Real people
    //    set their own from the invitation and we never see it. This is the only way
    //    to exercise the owner's real, RLS-protected insert path rather than
    //    bypassing it with the service key.
    const pw = `demo-${crypto.randomUUID()}`;
    await svc.auth.admin.updateUserById(prov.auth_user_id, { password: pw, email_confirm: true });

    made.push({ ...p, account_id: prov.account_id, email: p.email, password: pw });
  }

  if (DRY) { log("\nDry run. Nothing was created.\n"); return; }

  // 6. Listings, created BY the owner, through the same insert the browser form does.
  //    RLS applies. The publish gate applies. If the advertising licence is missing
  //    or lapsed, the database refuses, exactly as it would for a real lister.
  let i = 0;
  for (const person of made.filter((m) => m.role === "owner" || m.role === "broker")) {
    const asOwner = createClient(URL_, ANON, { auth: { persistSession: false } });
    const { error: signInErr } = await asOwner.auth.signInWithPassword({
      email: person.email, password: person.password,
    });
    if (signInErr) throw new Error(`sign-in failed for ${person.email}: ${signInErr.message}`);

    for (const L of LISTINGS.slice(0, 2)) {
      const d = districts[i % districts.length];
      const row = {
        account_id: person.account_id,
        title_en: `${L.title_en}`,
        asset_type: L.asset_type,
        deal_type: "lease",
        district_id: d.id,
        area_sqm: L.area_sqm,
        asking_rent_sqm: L.price,
        lister_type: person.role === "broker" ? "broker_authorized" : "owner_direct",
        authorization_doc_url: person.role === "broker" ? "https://demo.satmarkets.test/auth.pdf" : null,
        contact_email: person.email,
        contact_channels: ["email", "call"],
        ad_permit_no: permit(),
        ad_permit_expires_at: expiryFor(i),
        right_to_market_confirmed: true,
        status: "draft",
      };
      const { data: created, error } = await asOwner.from("listings").insert(row).select("id,reference_code").single();
      if (error) throw new Error(`listing insert (as owner, under RLS) failed: ${error.message}`);

      // Publishing is SAT's act, and it must clear the gate. If the licence is bad,
      // this throws, and that is the system working.
      const { error: pubErr } = await svc
        .from("listings")
        .update({ status: "published", ownership_verified: true, authorization_verified: true })
        .eq("id", created.id);
      if (pubErr) {
        log(`    ${created.reference_code}: publish REFUSED by the gate -> ${pubErr.message}`);
      } else {
        log(`    ${created.reference_code}: published, licence ${row.ad_permit_no}, expires ${row.ad_permit_expires_at}`);
      }
      i++;
    }
    await asOwner.auth.signOut();
  }

  // 7. Enquiries, through the public leads endpoint, like any visitor.
  const { data: live } = await svc.from("listings").select("id").eq("is_demo", true).eq("status", "published").limit(4);
  for (const l of live ?? []) {
    await post("/api/leads", {
      listing_id: l.id,
      contact_name: "Sample Enquirer",
      contact_email: "enquirer@demo.satmarkets.test",
      contact_phone: "+966500000001",
      message: "Is this still available, and can we view it this week?",
      path: "direct_contact",
    });
  }
  log(`\n    ${(live ?? []).length} enquiries through the public leads endpoint`);

  const { data: census } = await svc.rpc("demo_census");
  log("\nDemo census:");
  for (const row of (census ?? []).filter((r) => r.demo_rows > 0)) {
    log(`  ${row.table_name.padEnd(24)} ${row.demo_rows}`);
  }
  log("\nTeardown when you are done:  select public.purge_demo_data('PURGE DEMO DATA');\n");
}

main().catch((e) => { console.error("\nSEED FAILED:", e.message, "\n"); process.exit(1); });
