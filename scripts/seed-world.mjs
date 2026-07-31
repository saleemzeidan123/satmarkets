// SAT Markets simulation seed (Layer 1). Deterministic, idempotent, service-side.
//
//   node scripts/seed-world.mjs --seed=1 [--count=24]
//
// Requires env: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (owner-set,
// never committed). Writes ONLY clearly-synthetic rows: every reference_code is
// prefixed "SIMW1-" (sim world-v1). Idempotent: it deletes every SIMW1-* listing
// first, then re-inserts, so re-running with the same --seed yields the same world.
//
// NOTE: the SIMW1- reference_code prefix names these rows for a human reader, and
// `is_demo = true` is what every public query actually filters on. Both are set:
// the prefix so the rows are recognisable and deletable, the flag so no public
// count can include them. account_id/district_id are resolved from existing rows
// so foreign keys hold. Enum literals below match what the app renders; confirm
// against the DB enums on the first real run.
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !KEY) {
  console.error("seed-world: set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (service role, owner-only). Aborting.");
  process.exit(2);
}
const arg = (k, d) => { const m = process.argv.find((a) => a.startsWith(`--${k}=`)); return m ? m.split("=")[1] : d; };
const SEED = Number(arg("seed", "1"));
const COUNT = Number(arg("count", "24"));
const PREFIX = "SIMW1-";

// deterministic RNG (mulberry32)
let s = SEED >>> 0;
const rnd = () => { s |= 0; s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const pick = (a) => a[Math.floor(rnd() * a.length)];
const between = (lo, hi) => Math.round(lo + rnd() * (hi - lo));

const here = dirname(fileURLToPath(import.meta.url));
const personas = JSON.parse(readFileSync(join(here, "fixtures", "personas.json"), "utf8"));

const sb = createClient(URL, KEY, { auth: { persistSession: false } });

const ASSETS = [
  { asset: "office", grade: "a", fit: "fitted", lo: 1400, hi: 3800 },
  { asset: "office", grade: "b", fit: "shell", lo: 900, hi: 1700 },
  { asset: "retail", grade: "a", fit: "fitted", lo: 2200, hi: 4200 },
  { asset: "warehouse", grade: "b", fit: "shell", lo: 200, hi: 520 },
  { asset: "medical", grade: "a", fit: "fitted", lo: 1200, hi: 2600 },
  { asset: "serviced", grade: "a", fit: "fitted", lo: 2000, hi: 4500 },
];

async function main() {
  // resolve a valid account_id and district_ids from existing data
  const { data: acc } = await sb.from("listings").select("account_id").limit(1).single();
  const account_id = process.env.SIM_ACCOUNT_ID || acc?.account_id;
  if (!account_id) { console.error("seed-world: no account_id resolvable; set SIM_ACCOUNT_ID."); process.exit(3); }
  const { data: districts } = await sb.from("districts").select("id, name_en");
  const districtIds = (districts ?? []).map((d) => d.id);
  if (!districtIds.length) { console.error("seed-world: no districts found."); process.exit(3); }

  // idempotent wipe of the prior sim world
  const { error: delErr } = await sb.from("listings").delete().like("reference_code", `${PREFIX}%`);
  if (delErr) { console.error("seed-world: wipe failed:", delErr.message); process.exit(4); }

  const owners = personas.owners, brokers = personas.brokers;
  const rows = [];
  for (let i = 0; i < COUNT; i++) {
    const a = pick(ASSETS);
    const lease = rnd() > 0.25; // mostly lease
    const person = rnd() > 0.35 ? pick(owners) : pick(brokers);
    const isBroker = !!person.fal;
    const area = between(90, a.asset === "warehouse" ? 4000 : 900);
    const rent = between(a.lo, a.hi);
    const ref = `${PREFIX}${String(i + 1).padStart(3, "0")}`;
    rows.push({
      reference_code: ref,
      account_id,
      district_id: pick(districtIds),
      asset_type: a.asset,
      deal_type: lease ? "lease" : "sale",
      title_en: `Sim ${a.asset} ${i + 1}`,
      title_ar: `عقار تجريبي ${a.asset} ${i + 1}`,
      area_sqm: area,
      building_grade: a.grade,
      fitout_condition: a.fit,
      vat_treatment: "exclusive",
      asking_rent_sqm: lease ? rent : null,
      sale_price: lease ? null : rent * area * 12,
      status: "published",
      // Finding 78. The SIMW1- prefix was called the sim tag while no query in src
      // read it, so these rows entered the public count as ordinary inventory. The
      // flag every public query filters on is is_demo, so the seeder sets it.
      is_demo: true,
      right_to_market_confirmed: true,
      is_sat_listed: isBroker && rnd() > 0.5,
      ownership_verified: !isBroker,
      authorization_verified: isBroker,
      ar_translation_status: "done",
      lister_type: isBroker ? "broker" : "owner",
      documents: [],
      contact_phone: person.phone ?? null,
      contact_channels: person.channels ?? ["phone"],
    });
  }
  const { error: insErr, count } = await sb.from("listings").insert(rows, { count: "exact" });
  if (insErr) { console.error("seed-world: insert failed:", insErr.message); process.exit(5); }
  console.log(`seed-world: seeded ${count ?? rows.length} SIMW1-* listings (seed=${SEED}). Re-run is idempotent.`);
}
main().catch((e) => { console.error("seed-world:", e); process.exit(1); });
