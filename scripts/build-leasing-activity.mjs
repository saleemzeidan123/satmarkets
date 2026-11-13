// Builds src/data/leasingActivity.json from the official extract.
//
// The extract is the commercial rows of a Real Estate General Authority file
// published on the National Open Data Platform, kept beside its provenance
// record in data/official/rega-rental-indicators. This script reads both,
// refuses to run if the extract is not the file the record describes, and
// writes the one shape the application imports.
//
// It carries counts of registered contracts and nothing else. Every commercial
// row in the official file holds 0 in both rent columns, so there is no rent
// to carry, and the script fails if that ever stops being true: a rent that
// appears in a later file is a decision for a person, not a default.
//
//   node scripts/build-leasing-activity.mjs          write the file
//   node scripts/build-leasing-activity.mjs --check  exit 1 if it would change

import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DIR = join(ROOT, "data/official/rega-rental-indicators");
const OUT = join(ROOT, "src/data/leasingActivity.json");

/** The file's own words for the three commercial property types. */
const KIND = { "مكتب": "office", "محل": "shop", "معرض تجاري": "showroom" };
const ORDER = ["office", "shop", "showroom"];
const COMMERCIAL = "تجاري";

export function buildLeasingActivity() {
  const prov = JSON.parse(readFileSync(join(DIR, "riyadh-2026-q1.provenance.json"), "utf8"));
  const raw = readFileSync(join(DIR, prov.extract.file));
  const sha = createHash("sha256").update(raw).digest("hex");
  if (sha !== prov.extract.sha256) throw new Error(`the extract is not the recorded file: ${sha}`);

  const lines = raw.toString("utf8").split("\n").filter((l) => l.length > 0);
  const rows = lines.slice(1).map((l) => l.split(","));
  if (rows.length !== prov.extract.rows) throw new Error(`expected ${prov.extract.rows} rows, read ${rows.length}`);

  const [year, quarter] = prov.period.split("-Q");
  const cities = new Map();
  for (const f of rows) {
    if (f.length !== 10) throw new Error(`a row does not have ten columns: ${f.join(",")}`);
    const [y, q, region, city, district, type, cls, n, rent, rentSqm] = f.map((x) => x.trim());
    if (y !== year || q !== quarter) throw new Error(`a row is outside ${prov.period}: ${f.join(",")}`);
    if (region !== prov.region) throw new Error(`a row is outside the region: ${f.join(",")}`);
    if (cls !== COMMERCIAL) throw new Error(`a row is not classified commercial: ${f.join(",")}`);
    if (rent !== "0" || rentSqm !== "0") throw new Error(`a commercial row carries a rent: ${f.join(",")}`);
    const kind = KIND[type];
    if (!kind) throw new Error(`an unknown property type: ${type}`);
    if (!/^[1-9]\d*$/.test(n)) throw new Error(`a contract count is not a positive whole number: ${f.join(",")}`);
    const byDistrict = cities.get(city) ?? new Map();
    cities.set(city, byDistrict);
    const cell = byDistrict.get(district) ?? { office: null, shop: null, showroom: null };
    byDistrict.set(district, cell);
    if (cell[kind] !== null) throw new Error(`two rows for one district and type: ${f.join(",")}`);
    cell[kind] = Number(n);
  }

  // One city to a line, so a later quarter reads as a diff of the cities that
  // changed and not as a rewrite of the file.
  const head = {
    dataset: prov.dataset,
    licence: prov.licence,
    period: prov.period,
    region: prov.region,
    official: { sha256: prov.official.sha256, retrieved: prov.official.retrieved },
    columns: ["district", ...ORDER],
  };
  const cityLines = [...cities.entries()].map(
    ([city, byDistrict]) =>
      `  ${JSON.stringify(city)}: ${JSON.stringify([...byDistrict.entries()].map(([district, c]) => [district, ...ORDER.map((k) => c[k])]))}`,
  );
  return `${JSON.stringify(head, null, 1).replace(/\n}$/, "")},\n "cities": {\n${cityLines.join(",\n")}\n }\n}\n`;
}

const invoked = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (invoked) {
  const next = buildLeasingActivity();
  if (process.argv.includes("--check")) {
    let current = "";
    try { current = readFileSync(OUT, "utf8"); } catch { /* absent counts as different */ }
    if (current !== next) { console.error("src/data/leasingActivity.json is out of date"); process.exit(1); }
    console.log("src/data/leasingActivity.json is current");
  } else {
    writeFileSync(OUT, next);
    console.log(`wrote ${OUT}`);
  }
}
