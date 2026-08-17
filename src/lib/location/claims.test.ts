import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { HELD_ROUTES, PRIVATE_PREFIXES } from "@/lib/routePolicy";
import { ASSET_FIELDS } from "@/lib/assetFields";

// ADV-5B. The structural gate on mobility claims.
//
// `mobility.ts` decides whether a footfall or visitation figure may be
// published, and today it refuses every input. That module is only worth
// building if nothing on a rendering surface quietly bypasses it, so this file
// scans the surfaces themselves rather than trusting the module.
//
// THREE SITES ARE EXCEPTED, AND THE EXCEPTION IS NOT A LIST OF NAMES.
//
// A hardcoded allow list decays: a file gets renamed, a reason stops being true,
// and the entry survives because nobody rereads it. So each exception below
// carries the reason it exists AND a test that the reason is still true. If
// `/area` stops being held, or stops carrying its sample tag, or if `/find`
// starts stating a value beside the phrase instead of offering it as a
// preference, the exception fails on its own terms and the file goes back under
// the gate.
//
// ADV-1C removed the third exception. `LocationScore.tsx` was excepted because
// it was an orphan whose figures no reader could reach, and ADV-5B judged
// deleting it out of scope. Codex boundary 8 put it in scope: the component is
// gone, and the test below now holds it gone rather than holding it unimported.
//
// Anything NEW that renders a mobility figure fails here, which is the point.
//
// WHAT THIS GATE FOUND ON ITS FIRST RUN.
//
// `/building/[id]` hashed the building id into a seeded generator and rendered
// the output as that building's weekly visitors, hourly rhythm, drive-time
// catchment rings, dwell, daytime population and spend index, three of them in
// the overview row with no sample label. The gate is worth more than the module
// it guards for that reason alone. ADV-5B deleted those panels; the page now
// reaches a figure only through `location/panel`, and the last test in this file
// is what keeps that the only route.

const SURFACE_ROOTS = ["src/app", "src/components"];

type Exception = { file: string; reason: string };

const EXCEPTIONS: readonly Exception[] = [
  {
    file: "src/app/[locale]/area/page.tsx",
    reason:
      "The sample trade-area page. Held out of indexing in routePolicy, and every figure on it renders under the Sample data tag. ADV-5B rewrote its source cards so none of them represents a contract or a feed that does not exist.",
  },
  {
    file: "src/app/[locale]/find/page.tsx",
    reason:
      "Demand side, not supply side. The phrase appears only as the label of a requirement preference a searcher can select, so it states what somebody is looking for rather than what this location has. No value is rendered beside it and the route is private.",
  },
];

// Needles assembled from fragments, on the ADV-5A rule: a scan that spells the
// thing it forbids finds itself and reports the guard as the breach.
const EN_NEEDLES: readonly RegExp[] = [
  new RegExp("foot" + "fall", "i"),
  new RegExp("foot " + "traffic", "i"),
  new RegExp("daytime " + "population", "i"),
  new RegExp("dwell " + "time", "i"),
  new RegExp("visit " + "frequency", "i"),
  new RegExp("catchment " + "population", "i"),
];

const AR_NEEDLES: readonly RegExp[] = [
  new RegExp("حركة " + "المشاة"),
  new RegExp("السكان " + "نهاراً"),
  new RegExp("مكوث"),
];

const NEEDLES = [...EN_NEEDLES, ...AR_NEEDLES];

// Paths come out of the walk in POSIX form. Every path this file compares one
// against is written with forward slashes, the EXCEPTIONS entries and the two
// importer names at the end of the file, and `path.join` separates with a
// backslash on Windows: unnormalised, no exception would ever match its own file
// and the gate would report the excepted surfaces as offenders.
const walk = (dir: string, out: string[] = []): string[] => {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir)) {
    const p = path.join(dir, entry);
    if (fs.statSync(p).isDirectory()) walk(p, out);
    else if (/\.tsx?$/.test(p) && !/\.test\.tsx?$/.test(p)) out.push(p.split(path.sep).join("/"));
  }
  return out;
};

// Comments are stripped before matching. A file is allowed to SAY that it shows
// no footfall figure, and `LocationFacts.tsx` does exactly that; the gate is
// about rendered text, not about the ability to name the rule.
const stripComments = (s: string): string =>
  s.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/[^\n]*/g, "$1");

const surfaces = SURFACE_ROOTS.flatMap((r) => walk(r));
const excepted = new Set(EXCEPTIONS.map((e) => e.file));

test("claims: no rendering surface outside the recorded exceptions states a mobility figure", () => {
  assert.ok(surfaces.length > 50, "the surface walk found almost nothing, so it is not walking");
  const offenders: string[] = [];
  for (const f of surfaces) {
    if (excepted.has(f)) continue;
    const body = stripComments(fs.readFileSync(f, "utf8"));
    for (const n of NEEDLES) {
      if (n.test(body)) offenders.push(`${f} matches ${n.source}`);
    }
  }
  assert.deepEqual(
    offenders,
    [],
    `a mobility claim reached a rendering surface without passing mobilityFigure:\n${offenders.join("\n")}`
  );
});

test("claims: every exception names a file that exists and carries a substantive reason", () => {
  for (const e of EXCEPTIONS) {
    assert.ok(fs.existsSync(e.file), `excepted file is gone: ${e.file}`);
    assert.ok(e.reason.length > 80, `the exception for ${e.file} does not say why`);
    assert.ok(
      surfaces.includes(e.file),
      `${e.file} is excepted but is not on the scanned surfaces, so the exception is dead weight`
    );
  }
});

// The first exception's reason, tested rather than trusted.

test("claims: the sample trade-area page is still held out of indexing", () => {
  const held = HELD_ROUTES.find((r) => r.path === "/area");
  assert.ok(held, "/area left HELD_ROUTES, so its figures are now indexable and the exception is void");
  assert.ok(held.reason.length > 20);
});

test("claims: the sample trade-area page still renders its sample tag", () => {
  const page = fs.readFileSync("src/app/[locale]/area/page.tsx", "utf8");
  assert.match(page, /ap\.sampleTag/, "the Sample data tag is no longer rendered");
  for (const locale of ["en", "ar"]) {
    const d = JSON.parse(
      fs.readFileSync(path.join("src", "i18n", "dictionaries", `${locale}.json`), "utf8")
    ) as Record<string, Record<string, string>>;
    const tag = d.area?.sampleTag ?? "";
    assert.ok(tag.trim().length > 0, `${locale}: the sample tag string is empty`);
  }
});

test("claims: the sample trade-area copy represents no contract, partner or feed", () => {
  // The pre-ADV-5B copy said the figures came from "Saudi telecom partners" and
  // from "payment gateways", and that live partnerships were being onboarded.
  // None of that was true, and owner ruling 7 forbids representing that data
  // rights exist. These needles are the specific claims that were removed.
  const banned = [
    new RegExp("telecom " + "partners", "i"),
    new RegExp("payment " + "gateways", "i"),
    new RegExp("data " + "partnerships", "i"),
    new RegExp("being " + "onboarded", "i"),
    new RegExp("شركاء " + "الاتصالات"),
    new RegExp("بوابات " + "الدفع"),
    new RegExp("شراكات " + "البيانات"),
  ];
  for (const locale of ["en", "ar"]) {
    const d = JSON.parse(
      fs.readFileSync(path.join("src", "i18n", "dictionaries", `${locale}.json`), "utf8")
    ) as Record<string, Record<string, string>>;
    const copy = Object.values(d.area ?? {}).join(" ");
    for (const n of banned) {
      assert.doesNotMatch(copy, n, `${locale}: /area still claims a source that is not contracted`);
    }
  }
});

// The retired exception, held retired.
//
// The component carried a per-asset template of hardcoded representative
// figures: a drive time, a count of nearby anchors, a daytime population, a
// spend index. Every one of them was invented copy in the shape of a
// measurement, which is Law 3 in the form that is hardest to spot, because the
// numbers were plausible and consistent. `LocationFacts.tsx` is the honest
// successor and renders only what the record holds. Git keeps the file; this
// test keeps it out of the tree.

test("claims: the location score component stays deleted", () => {
  assert.equal(
    fs.existsSync("src/components/LocationScore.tsx"),
    false,
    "LocationScore.tsx is back, and with it a per-asset template of invented figures"
  );
  const importers = surfaces.filter((f) =>
    /from\s+["'](?:@\/components|\.{1,2}(?:\/[\w.\-[\]]+)*)\/Location[S]core["']/.test(
      stripComments(fs.readFileSync(f, "utf8"))
    )
  );
  assert.deepEqual(importers, [], "something imports a component that no longer exists");
});

// The two asset fields that would carry a mobility figure if anything switched
// them on. Both are declared and both are off, which is how the field catalogue
// records a capability without asserting it.

test("claims: the mobility asset fields are declared and unavailable", () => {
  const all = Object.values(ASSET_FIELDS).flat();
  for (const key of ["footfall", "catchment_population"]) {
    const field = all.find((f) => f.key === key);
    assert.ok(field, `${key} is no longer declared, so its rule went with it`);
    assert.equal(field.available, false, `${key} was switched on without a recorded source`);
  }
});

test("claims: no rendering surface imports the mobility module directly", () => {
  const needle = new RegExp("location/mobil" + "ity");
  const offenders = surfaces.filter((f) => needle.test(fs.readFileSync(f, "utf8")));
  assert.deepEqual(
    offenders,
    [],
    "a rendering surface reached past the panel module and now holds a verdict carrying licence reasoning, a register code and clause identifiers"
  );
});

test("claims: the panel module is the only route from the mobility module to a surface", () => {
  // `mobilityFigure` returns `reasons`, which quote licence and contract
  // reasoning and are internal on the `denialReason` rule. `panel.ts` converts a
  // verdict into a translation key and drops the rest, so it is the only file
  // outside the geo package's own tests that may import the module.
  const lib = walk("src/lib");
  const needle = new RegExp('from "(?:\\./|@/lib/location/)mobil' + "ity\"");
  const importers = lib.filter((f) => needle.test(fs.readFileSync(f, "utf8")));
  assert.deepEqual(importers, ["src/lib/location/index.ts", "src/lib/location/panel.ts"]);

  // The barrel is on that list only because it re-exports the result types. A
  // type cannot be called, so it cannot return a reason string. If a runtime
  // export ever reappears there, the package's public face hands every page the
  // raw verdict again and this assertion is the thing that notices.
  const barrel = fs.readFileSync("src/lib/location/index.ts", "utf8");
  const block = barrel.slice(barrel.indexOf('} from "./coverage"'));
  const stmt = block.slice(0, block.indexOf('from "./mobil' + 'ity"'));
  const kw = stmt.lastIndexOf("export");
  assert.ok(kw >= 0, "the barrel no longer has an export statement for the module");
  assert.match(
    stmt.slice(kw),
    /^export type \{/,
    "the barrel re-exports a callable from the mobility module, so any page can import the raw verdict"
  );
});

test("claims: the demand-side exception states a preference and never a value", () => {
  // The reason `/find` is excepted, tested. Every needle match in that file has
  // to sit on a requirement-preference option line. A line that matched a needle
  // and was not an option would be a figure, and the exception would be void.
  const file = "src/app/[locale]/find/page.tsx";
  assert.ok(fs.existsSync(file));
  const lines = stripComments(fs.readFileSync(file, "utf8")).split("\n");
  const bad: string[] = [];
  for (const line of lines) {
    if (!NEEDLES.some((n) => n.test(line))) continue;
    if (!/\{\s*v:\s*"[a-z_]+"/.test(line)) bad.push(line.trim().slice(0, 90));
  }
  assert.deepEqual(
    bad,
    [],
    `a mobility phrase in ${file} is no longer just a selectable preference:\n${bad.join("\n")}`
  );
});

test("claims: the demand-side exception is on a route that is not public", () => {
  const importedPolicy = fs.readFileSync("src/lib/routePolicy.ts", "utf8");
  assert.match(importedPolicy, /PRIVATE_PREFIXES/);
  assert.ok(
    PRIVATE_PREFIXES.some((p) => p === "/find"),
    "/find left the private prefixes, so its copy is now public and the exception is void"
  );
});

test("claims: the building profile states no movement figure of its own", () => {
  const page = fs.readFileSync("src/app/[locale]/building/[id]/page.tsx", "utf8");
  // The seeded generator that produced the old figures, named by its parts so
  // this assertion does not depend on the variable names surviving.
  assert.doesNotMatch(page, /1103515245/, "the seeded generator is back");
  assert.doesNotMatch(page, /Math\.random/);
  assert.match(page, /districtMobilityPanel/, "the page no longer reaches the guarded route");
});
