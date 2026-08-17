import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, sep } from "node:path";

//
// Owner ruling 3 and 4 (2026-07-28) regression guard.
//
// Ruling 3: claims are determined from actual record-level evidence, never inferred
// from route type or generic wording. Ruling 4: named comparables are anonymised
// unless each one has a lawful documented public source and permission for this use.
//
// Both rulings are about surfaces that state more than the data behind them supports.
// A page that overstates does not fail a typecheck, does not fail a build and reads
// perfectly well, which is exactly why it needs a test. The two modelling surfaces,
// /invest and /hbu, are the ones that carried the defect, because a model that shows
// its arithmetic invites the reader to believe its inputs.
//
// The guard is written against the shipped artefacts, the page source and both
// dictionaries, rather than against a helper the pages could stop calling.
//

const ROOT = join(__dirname, "..");
const EN = JSON.parse(readFileSync(join(ROOT, "i18n/dictionaries/en.json"), "utf8"));
const AR = JSON.parse(readFileSync(join(ROOT, "i18n/dictionaries/ar.json"), "utf8"));
const INVEST = readFileSync(join(ROOT, "app/[locale]/invest/page.tsx"), "utf8");
const HBU = readFileSync(join(ROOT, "app/[locale]/hbu/page.tsx"), "utf8");

// Assertions about what a page asserts have to read the code, not the commentary
// around it. Both pages carry a header explaining what was removed and why, and that
// explanation necessarily quotes the wording it removed.
function code(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/.*$/gm, "$1");
}
const INVEST_CODE = code(INVEST);
const HBU_CODE = code(HBU);

// Real Riyadh buildings and companies that appeared as comparables in these two
// tables. Anonymised under ruling 4 because we hold neither the transaction record
// nor a documented permission to attach a price to a named building.
const NAMED_REAL_SUBJECTS = [
  "Olaya Tower", "Al Akaria", "Akaria Plaza", "Tahlia Gate", "Granada Oasis",
  "برج العليا", "العقارية بلازا", "بوابة التحلية", "واحة غرناطة",
];

// The same rule one level out. A real building or a real-sounding company named
// anywhere carries an implied claim, and these strings attached fabricated quotes,
// viewings, calendar entries and a printable term sheet to them. Districts and
// developments are deliberately absent from this list: naming Al Olaya or KAFD as a
// location is a fact about geography, not a claim about a counterparty.
const NAMED_REAL_ENTITIES = [
  ...NAMED_REAL_SUBJECTS,
  "Olaya Towers", "Tahlia Holdings", "KAFD Devco",
  "أبراج العليا", "تحلية القابضة",
];

function compRows(dict: any, section: "invest" | "hbu"): string[][] {
  const c = dict[section]?.comps;
  assert.ok(Array.isArray(c) && c.length > 0, `${section}.comps missing`);
  return c as string[][];
}

// --- ruling 4: no named comparable without a documented source ---

for (const section of ["invest", "hbu"] as const) {
  for (const [locale, dict] of [["en", EN], ["ar", AR]] as const) {
    test(`ruling 4: ${section}.comps names no real building or company (${locale})`, () => {
      const flat = compRows(dict, section).flat().join(" | ");
      for (const name of NAMED_REAL_SUBJECTS) {
        assert.ok(!flat.includes(name), `${section}.comps (${locale}) names "${name}", which has no documented source or permission`);
      }
    });
  }
}

test("ruling 4: the two comparable tables carry the same anonymised set", () => {
  // They are twin illustrations of the same worked example. If one is corrected and
  // the other drifts, the product contradicts itself about the same four rows.
  assert.deepEqual(EN.invest.comps, EN.hbu.comps);
  assert.deepEqual(AR.invest.comps, AR.hbu.comps);
});

// --- ruling 3: the comparable tables claim no verification ---

const VERIFICATION_WORDS = [/verified/i, /موثّق/, /موثق/];

for (const section of ["invest", "hbu"] as const) {
  for (const [locale, dict] of [["en", EN], ["ar", AR]] as const) {
    test(`ruling 3: ${section} comparables note claims no verification (${locale})`, () => {
      const note = String(dict[section].compsNote ?? "");
      assert.ok(note.length > 0, `${section}.compsNote (${locale}) is empty`);
      for (const w of VERIFICATION_WORDS) {
        assert.doesNotMatch(note, w, `${section}.compsNote (${locale}) asserts verification for illustrative rows`);
      }
    });
    test(`ruling 3: ${section} source column reads as simulated, not verified (${locale})`, () => {
      const src = String(dict[section].compsSourceSimulated ?? "");
      assert.ok(src.length > 0, `${section}.compsSourceSimulated (${locale}) is missing`);
      for (const w of VERIFICATION_WORDS) assert.doesNotMatch(src, w);
    });
  }
}

// ---------------------------------------------------------------------------
// ADV-1, findings 3 and 24, owner decision O3, decision D24 in both directions
//
// A badge names its own gate, and no badge is the correct output for a record
// nobody has checked. Neither statement can be enforced by a typecheck: every
// defect this section pins compiled cleanly, rendered correctly and shipped. So
// the guard is written against the surfaces themselves, and it fails the moment
// a page starts deciding for itself what "verified" means.
// ---------------------------------------------------------------------------

function surfaceFiles(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) surfaceFiles(full, out);
    else if (/\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name)) out.push(full);
  }
  return out;
}

const SURFACES = [...surfaceFiles(join(ROOT, "app")), ...surfaceFiles(join(ROOT, "components"))];
// Forward slashes, because CHIP_ALLOWED below is written in forward slashes and
// `join` separates with a backslash on Windows. An unnormalised name matches no
// entry, so every allowed surface reads as an offender.
const rel = (f: string) => f.slice(ROOT.length + 1).split(sep).join("/");

// The chip primitive, the resolver's own renderer, and the surfaces handed an
// already-resolved list by the server. Anything else drawing this chip is drawing
// it from a field it read and interpreted itself, which is finding 3.
const CHIP_ALLOWED = new Set([
  "components/satkit.tsx",
  "components/VerificationState.tsx",
  "components/ListingEnquiry.tsx",
  "components/ListerBadge.tsx",
  "app/[locale]/lister/[id]/page.tsx",
]);

test("ADV-1: the verified chip is drawn only where the resolver decides it", () => {
  for (const f of SURFACES) {
    if (CHIP_ALLOWED.has(rel(f))) continue;
    assert.doesNotMatch(
      code(readFileSync(f, "utf8")),
      /className="verified"/,
      `${rel(f)} draws the verified chip without going through src/lib/listingVerification.ts`
    );
  }
});

test("ADV-1: no rendering surface resolves a badge from ownerVerified", () => {
  // gate.ts stays the truth source and ADV-1 extends rather than replaces it. But a
  // page calling ownerVerified renders one boolean as one badge, and that boolean is
  // set on all 88 published rows, none of which anybody has checked.
  for (const f of SURFACES) {
    assert.doesNotMatch(code(readFileSync(f, "utf8")), /\bownerVerified\b/, rel(f));
  }
});

test("ADV-1: no surface carries the retired bare owner claim", () => {
  for (const f of SURFACES) {
    const c = code(readFileSync(f, "utf8"));
    assert.doesNotMatch(c, /"Verified owner"/, `${rel(f)} still prints the retired claim`);
    assert.doesNotMatch(c, /\bverifiedOwner\b/, `${rel(f)} still reads the retired string key`);
  }
});

test("ADV-1: neither dictionary can hand a surface the retired claim back", () => {
  for (const [locale, dict] of [["en", EN], ["ar", AR]] as const) {
    const flat = JSON.stringify(dict);
    assert.doesNotMatch(flat, /"verifiedOwner"/, `${locale}.json still defines verifiedOwner`);
    for (const k of ["checkedOn", "verifiedAgeYear", "verifiedAgeYears"]) {
      assert.ok(!(k in (dict.ld ?? {})), `${locale}.json ld.${k} outlived the freshness line it fed`);
    }
  }
});

test("ADV-1: the chip component refuses to supply its own wording", () => {
  // The default was "Verified owner". A default is how one boolean came to stand in
  // for four separate checks on every card in the product.
  const kit = readFileSync(join(ROOT, "components/satkit.tsx"), "utf8");
  assert.match(kit, /export function Verified\(\{ text \}: \{ text: string \}\)/);
  assert.doesNotMatch(code(kit), /text\s*=\s*"/, "satkit's Verified must not default its wording");
});

test("ADV-1: the listings filter is the same four part chain as the badge", () => {
  const c = code(readFileSync(join(ROOT, "app/[locale]/listings/page.tsx"), "utf8"));
  // One place expresses the chain, and both filters route through it.
  assert.equal(
    c.split("verifiedOnly(").length - 1,
    2,
    "both the primary and the fallback query must use the shared verified filter"
  );
  assert.equal(
    c.split('eq("ownership_verified"').length - 1,
    1,
    "the flag is read in exactly one place, inside verifiedOnly"
  );
  for (const part of ['eq("is_demo", false)', 'not("verified_by", "is", null)', 'in("verification_method"']) {
    assert.ok(c.includes(part), `the verified filter is missing ${part}`);
  }
  // PKG-CARD1. The result grid used to draw its own card and call the chip
  // resolver, `verifiedBadges`, directly. It now renders through the shared
  // `ListingCard`, so the badge comes from the resolver one hop further in:
  // the grid renders the shared card, and the shared card is what calls the
  // resolver, `verifiedBadgeTexts`.
  assert.match(c, /<ListingCard\b/, "the result grid must render through the shared card");
  const cardSrc = code(readFileSync(join(ROOT, "components/ListingCard.tsx"), "utf8"));
  assert.match(cardSrc, /verifiedBadgeTexts\(/, "the shared card's badge must come from the resolver");
});

test("ADV-1: the home verified count cannot outrun the badge on the card", () => {
  const c = code(readFileSync(join(ROOT, "app/[locale]/page.tsx"), "utf8"));
  for (const part of [
    'eq("ownership_verified", true)',
    'eq("is_demo", false)',
    'not("verified_by", "is", null)',
    'in("verification_method"',
  ]) {
    assert.ok(c.includes(part), `the home KPI count is missing ${part}`);
  }
  // A proportion of nothing is not a proportion, and printing 0% states a rate.
  assert.match(c, /verifiedPct:\s*verified > 0 &&/, "the verification rate must suppress at zero");
});

test("ADV-1, D24: a record in our own tables is indexed, not verified", () => {
  // The place autocomplete returned verified: true for any row in our districts
  // table, which means only that we hold a record of the place. D24 runs in both
  // directions: green must appear for evidence-backed verification, and must not
  // appear for anything else.
  const places = code(readFileSync(join(ROOT, "app/api/places/route.ts"), "utf8"));
  assert.doesNotMatch(places, /\bverified\b/, "the places API must not describe a record as verified");
  const mh = code(readFileSync(join(ROOT, "components/MarketingHome.tsx"), "utf8"));
  assert.doesNotMatch(mh, /o\.verified/, "the suggestion chip must not read a verified flag");
  assert.match(mh, /o\.indexed/, "the suggestion chip must read the indexed flag");
});

test("ADV-1: the enquiry rail badge is conditional on the record", () => {
  // This chip was unconditional. Every listing on the platform carried a green
  // "Verified owner" directly above the enquiry form, reading no field at all.
  const c = code(readFileSync(join(ROOT, "components/ListingEnquiry.tsx"), "utf8"));
  assert.match(c, /badges\.map\(/, "the enquiry badges must come from a resolved list");
  assert.match(c, /badges\?:\s*string\[\]/, "the resolved list is passed in, never computed here");
});

test("ADV-1: the print flyer and the owner dashboard resolve like every other surface", () => {
  for (const [file, needle] of [
    ["app/[locale]/listings/[id]/flyer/page.tsx", /verifiedBadgeTexts\(/],
    ["app/[locale]/dashboard/listings/[id]/page.tsx", /listingDimensionState\(/],
    ["app/[locale]/compare/page.tsx", /listingDimensionState\(/],
  ] as const) {
    const c = code(readFileSync(join(ROOT, file), "utf8"));
    assert.match(c, needle, `${file} must resolve verification through the shared module`);
    // The C4 three way OR: ownership, or authorisation, or the row being our own
    // stock, all printed as one green claim.
    assert.doesNotMatch(
      c,
      /ownership_verified\s*\|\|\s*\w+\.authorization_verified/,
      `${file} still runs the C4 three way OR`
    );
  }
});

test("ruling 3: neither modelling page renders the verified badge", () => {
  // Verified green is reserved for evidence-backed verification. On these two pages
  // there is no record to back it, so the component must not be reachable at all.
  for (const [name, src] of [["invest", INVEST_CODE], ["hbu", HBU_CODE]] as const) {
    assert.doesNotMatch(src, /<Verified\b/, `${name} renders <Verified>`);
    assert.doesNotMatch(src, /^\s*import\s.*\bVerified\b.*from/m, `${name} imports Verified`);
  }
});

// --- ruling 3: the model asserts no figure of its own ---

test("ruling 3: /invest states no cap rate as verified", () => {
  assert.doesNotMatch(INVEST_CODE, /verified comp/i);
  // Every model input is the reader's, so each is state with a starting value.
  for (const input of ["potentialNoi", "pricingCap"]) {
    assert.match(INVEST_CODE, new RegExp(`useState\\(`), "model inputs must be state");
    assert.match(INVEST_CODE, new RegExp(`\\[${input},\\s*set`), `${input} must be a user input, not a compiled constant`);
  }
});

test("ruling 3: the /invest export names no real building", () => {
  const m = INVEST_CODE.match(/a\.download\s*=\s*"([^"]+)"/);
  assert.ok(m, "expected a download filename in the CSV export");
  const filename = m![1].toLowerCase();
  for (const name of NAMED_REAL_SUBJECTS) {
    assert.ok(!filename.includes(name.toLowerCase().replace(/\s+/g, "-")), `export filename carries "${name}" off the platform`);
  }
  assert.ok(!filename.includes("olaya"));
});

test("ruling 3: /invest tells the reader whose assumptions these are", () => {
  for (const [locale, dict] of [["en", EN], ["ar", AR]] as const) {
    const note = String(dict.invest.assumptionsNote ?? "");
    assert.ok(note.length > 40, `invest.assumptionsNote (${locale}) is missing or too short to carry the point`);
  }
  assert.match(INVEST_CODE, /iv\.assumptionsNote/, "the note exists in the dictionary but the page does not render it");
});

// --- bilingual parity for the keys this correction introduced ---

test("ruling 3: the corrected invest and hbu keys exist in both locales", () => {
  for (const section of ["invest", "hbu"] as const) {
    const en = Object.keys(EN[section]).sort();
    const ar = Object.keys(AR[section]).sort();
    assert.deepEqual(en, ar, `${section} key sets differ between locales`);
  }
});

// --- ruling 4, one level out: no surface names an entity we hold no record for ---

function* dictStrings(o: unknown, path = ""): Generator<[string, string]> {
  if (typeof o === "string") yield [path, o];
  else if (o && typeof o === "object") {
    for (const [k, v] of Object.entries(o as Record<string, unknown>)) yield* dictStrings(v, path ? `${path}.${k}` : k);
  }
}

for (const [locale, dict] of [["en", EN], ["ar", AR]] as const) {
  test(`ruling 4: no dictionary string names a real building or company (${locale})`, () => {
    const offenders: string[] = [];
    for (const [path, s] of dictStrings(dict)) {
      for (const name of NAMED_REAL_ENTITIES) if (s.includes(name)) offenders.push(`${path}: ${s}`);
    }
    assert.deepEqual(offenders, [], `named entities without a documented source (${locale}):\n${offenders.join("\n")}`);
  });
}

// --- C4: what a query counts must be what its label claims ---

function* sourceFiles(dir: string): Generator<string> {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* sourceFiles(p);
    else if (/\.(ts|tsx)$/.test(name) && !/\.test\.ts$/.test(name)) yield p;
  }
}

test("C4: no query widens owner verification to authorisation or SAT stock", () => {
  // gate.ts states the rule in prose: an owner can be verified while a listing is
  // not, and being our own stock (is_sat_listed) confers neither claim. Three
  // queries disagreed with it, so the home KPI, the /listings verified filter and
  // its facet counts each described more rows as owner-verified than the badge on
  // those same rows would have shown. This scans the whole of src/ rather than the
  // three known sites, because the defect spreads by copy and paste.
  const offenders: string[] = [];
  for (const f of sourceFiles(ROOT)) {
    const src = readFileSync(f, "utf8");
    for (const line of src.split("\n")) {
      if (/^\s*(\/\/|\*|\/\*)/.test(line)) continue;
      if (/\.or\(\s*["'][^"']*ownership_verified/.test(line)) offenders.push(`${f.slice(ROOT.length + 1)}: ${line.trim()}`);
    }
  }
  assert.deepEqual(offenders, [], `verification predicate widened beyond ownership_verified:\n${offenders.join("\n")}`);
});

test("ruling 4: no page source hardcodes a real building or company", () => {
  // The dictionary scan above misses anything a page holds inline. The printable
  // term sheet did exactly that, naming a real landlord as a verified party.
  const offenders: string[] = [];
  for (const f of sourceFiles(join(ROOT, "app"))) {
    const src = code(readFileSync(f, "utf8"));
    for (const name of NAMED_REAL_ENTITIES) if (src.includes(name)) offenders.push(`${f.slice(ROOT.length + 1)}: ${name}`);
  }
  assert.deepEqual(offenders, [], `named entities hardcoded in page source:\n${offenders.join("\n")}`);
});

test("C4, narrowed by ADV-1: the verified surfaces filter no wider than ownership_verified", () => {
  // C4 required these queries to stop widening past ownership_verified. ADV-1 then
  // narrowed them further, because the flag is set on all 88 published rows and
  // none of them has been checked by anyone, so the predicate is now the four part
  // chain. The original requirement survives inside it: nothing here may match a
  // row on authorisation or on the listing being our own stock.
  const home = readFileSync(join(ROOT, "app/[locale]/page.tsx"), "utf8");
  const listings = readFileSync(join(ROOT, "app/[locale]/listings/page.tsx"), "utf8");
  assert.match(home, /\.eq\("ownership_verified",\s*true\)/, "home owner-verified KPI must count ownership_verified rows");
  for (const [name, src] of [["home", code(home)], ["listings", code(listings)]] as const) {
    assert.doesNotMatch(src, /\.or\(\s*"[^"]*authorization_verified/, `${name} widens the verified predicate past ownership`);
    assert.doesNotMatch(src, /\.or\(\s*"[^"]*is_sat_listed/, `${name} counts our own stock as verified`);
  }
  // The result query and the facet-count query still have to agree with each other:
  // a facet count that disagrees with the list it describes is its own false claim.
  // They agree by sharing one predicate rather than by repeating it.
  assert.equal(code(listings).split("verifiedOnly(").length - 1, 2, "both /listings queries must use the shared predicate");
});

// --- ruling 3: /about describes a standard, not a corpus ---
//
// The record behind this page, read on 2026-07-28: 88 published listings, 0 of them
// carrying an ad_permit_number; 3 verification_events, every one is_demo, whose own
// basis text says no Wathq lookup and no REGA lookup was performed; 94
// listing_verification_events on gate rega_permit, all 94 is_demo, behind listings
// that hold no permit number; 0 rows in account_verifications. Nothing on the
// platform has been checked against a government register, and every verification
// record says so in its own words.
//
// /about was the worst offender because it is the page a reader goes to in order to
// find out whether to believe the rest of the site. It said a permit is on file for
// every listing, that a badge here can be trusted, and that SAT is the verified data
// authority for the sector. The corrections keep the standard, which is real and is
// what we intend to hold ourselves to, and drop the claim that the standard has
// already been applied to anything.

const ABOUT_BANNED: Record<"en" | "ar", [RegExp, string][]> = {
  en: [
    [/verified data authority/i, "self-declared authority with no survey behind it"],
    [/no listing enters the market without/i, "asserts a permit on file; 0 published listings hold one"],
    [/any visitor can trust/i, "invites trust in a badge no register stands behind"],
    [/how we verify every listing/i, "universal present-tense verification claim"],
    [/verified (listings|inventory|stock)/i, "asserts the current corpus is verified"],
  ],
  ar: [
    [/المرجع الموثوق/, "self-declared authority"],
    [/بلا تصريح إعلان مسجّل/, "asserts a permit on file"],
    [/الاطمئنان لها/, "invites trust in the badge"],
    [/نتحقق من كل قائمة/, "universal present-tense verification claim"],
    [/قوائم موثقة/, "asserts the current corpus is verified"],
  ],
};

for (const [locale, dict] of [["en", EN], ["ar", AR]] as const) {
  test(`ruling 3: /about makes no claim the record cannot carry (${locale})`, () => {
    const offenders: string[] = [];
    for (const [path, s] of dictStrings(dict.about, "about")) {
      for (const [re, why] of ABOUT_BANNED[locale]) if (re.test(s)) offenders.push(`${path}: ${why}`);
    }
    assert.deepEqual(offenders, [], `about claims beyond the record (${locale}):\n${offenders.join("\n")}`);
  });

  test(`ruling 3: /about states that the standard applies at launch, not now (${locale})`, () => {
    // A weaker claim is only honest if the reader is told what the weaker claim is.
    // Removing "every listing has a permit" without saying "preview inventory holds
    // none" would leave the same impression through silence.
    const a = dict.about;
    const launch = locale === "en" ? /at launch/i : /عند الإطلاق/;
    const preview = locale === "en" ? /preview/i : /المعاينة|معاينة/;
    assert.match(String(a.intro), preview, "about.intro must say the platform is in preview on sample data");
    assert.match(String(a.cardCheckedB), launch, "about.cardCheckedB must scope the publishing standard to launch");
    assert.match(String(a.cardCheckedB), preview, "about.cardCheckedB must say preview inventory holds no permit");
    assert.match(String(a.verifySub), preview, "about.verifySub must say no preview record has been checked");
    assert.match(String(a.stepLiveB), launch, "about.stepLiveB must scope the badge to launch");
  });

  test(`ruling 3: the three /about gate steps keep their before-launch qualifier (${locale})`, () => {
    // These three were already honest. They are pinned so a future copy pass cannot
    // quietly promote them to the present tense, which is how the page drifted the
    // first time.
    const before = locale === "en" ? /arrives? before launch/i : /يصل قبل الإطلاق/;
    for (const k of ["stepNafathB", "stepOwnerB", "stepBrokerB"] as const) {
      assert.match(String(dict.about[k]), before, `about.${k} (${locale}) lost its before-launch qualifier`);
    }
  });

  test(`ruling 2: the /about rent index card keeps the REGA Rental Index (Ejar) attribution (${locale})`, () => {
    const attribution = locale === "en" ? /REGA Rental Index \(Ejar\)/ : /المؤشر الإيجاري للهيئة العامة للعقار \(إيجار\)/;
    for (const k of ["cardMoatB", "intro"] as const) {
      assert.match(String(dict.about[k]), attribution, `about.${k} (${locale}) names the rent index without its source`);
    }
  });
}

// --- ruling 3: unreferenced copy still counts as a claim ---

// Seven dictionary sections with no reader. Confirmed dead by reference count across
// all of src/ outside the dictionaries themselves, then deleted rather than reworded,
// because between them they carried "Every figure is computed from verified data. No
// model-generated numbers", "Decision-grade rent bands. Verified, never modelled",
// "The moat that makes this an authority, not a board", "Owner-direct listings,
// verified by SAT before they publish", "Every lister is verified" and "The Kingdom's
// home for verified commercial space". Every one of those is false against the
// record, and the cheapest way for a false claim to reach a page is to be sitting in
// the dictionary already, correctly translated, one autocomplete away.
//
// hero is in the list despite two apparent hits on `.hero`. Neither reads this
// section: LocationScore calls `t.hero.map` on its own slice and signup renders
// `t.hero` as a string from its own.
const DEAD_SECTIONS = ["filters", "areaIntel", "why", "statBand", "rentTeaser", "featured", "hero"];

for (const [locale, dict] of [["en", EN], ["ar", AR]] as const) {
  test(`ruling 3: the retired unreferenced sections stay deleted (${locale})`, () => {
    const revived = DEAD_SECTIONS.filter((s) => s in dict);
    assert.deepEqual(revived, [], `dead dictionary sections back in ${locale}.json: ${revived.join(", ")}`);
  });
}

// --- ruling 3: the verification vocabulary, everywhere else ---
//
// Record read 2026-07-28, project ltqgwpivmumfwqdxwwgo:
//
//   listings                93 rows, every one is_demo. 88 published, all 88 carrying
//                           ownership_verified and authorization_verified, 0 carrying
//                           an ad_permit_number.
//   accounts                10 rows, every one is_demo, 9 of them stamped
//                           verification_status 'verified'. There is no licence-number
//                           column on the table.
//   account_verifications   0 rows.
//   requirements_public     6 rows, and the table has no verification column at all,
//                           so "verified occupiers" had no field to rest on even in
//                           principle.
//   buildings               75 rows, every one is_demo, no verification column.
//   rent_index_published    7 rows, period 2026-Q2, source "REGA Rental Index (Ejar)",
//                           data_class 'synthetic', is_demo true, stat_kind 'average'.
//
// So the verified flags exist, and every one of them was seeded rather than earned.
// A per-record badge is still honest: it renders when that row's own field is true,
// which is exactly what gate.ts says the badge means, and the global preview notice
// says the corpus is sample data. What is not honest is the aggregate voice, which is
// where the copy was: a verified index, verified stock, verified occupiers, verified
// space counts, every listing verified before it publishes. Those describe the corpus,
// and no record supports them.
//
// Three corrections follow, and this guard pins all three.
//
//   1. Corpus assertions become either the launch standard or a plain description of
//      what the record holds: listed, posted, platform records.
//   2. "verified rent band" becomes "published rent band". The band is REGA's and we
//      republish it; attaching our own verification vocabulary to someone else's data
//      is its own small false claim, and owner ruling 2 blesses the published wording.
//   3. Any string that names the Rent Index as a source carries the REGA Rental Index
//      (Ejar) attribution owner ruling 2 requires.

// Arabic is noun then adjective, and both halves take the definite article, so the
// noun list and the adjective are built once rather than spelled out as an alternation
// of every pairing. The optional middle group is the intervening word.
const AR_CORPUS = new RegExp(
  "(?:ال)?(?:مساحات|مساحة|قوائم|بيانات|حقائق|عروض|عروضك|أصول|أصولا|أصولاً)" +
    "\\s+(?:\\S+\\s+)?(?:ال)?موثّ?قة",
);

// ADV-4A. Both corpus frames were adjacency-only: the noun had to sit immediately
// beside the adjective. One intervening word walked straight past them, in English
// ("verified commercial space", "verified commercial listings") and in Arabic, where
// the adjective follows the noun and the intervening word sits between the two
// ("مساحة تجارية موثّقة"). Both now allow a single intervening word, and the noun
// lists gain assets and property, which were simply missing.
//
// The actor-class frames are deliberately NOT widened the same way. Measured over the
// whole tree, adding singular owners, brokers and parties to them fired on five true
// statements and on no false one: the search note counting owner-verified rows off the
// rows it rendered, the two requirements routes stating an access rule enforced two
// lines below, the glossary term, and the PDPL lawful-basis clause naming the verified
// counterparty in a transaction. A set claim is false at the record level because no
// query selects for it; a singular claim about one record can be simply true. A frame
// that fires on a true statement teaches people to suppress the guard, which is the
// reason docs/ruling-3-residual-closure.md deferred this widening until it was measured.
const CORPUS_BANNED: Record<"en" | "ar", [RegExp, string][]> = {
  en: [
    [/verified (rent )?band/i, "the band is REGA's, republished, not verified by us"],
    [/the verified index/i, "no index on the platform has been verified"],
    [/verified (?:[a-z]+ )?(stock|spaces?|inventory|listings?|data|match(?:es)?|facts?|assets?|propert(?:y|ies))/i, "asserts a verified corpus"],
    [/verified (occupiers|participants|listers|platform)/i, "asserts a verified class of actor"],
    [/every listing is verified|owners? (?:are |get )?verified before|we verify (the parties|every)/i, "universal present-tense verification"],
    [/verified commercial (real estate )?(intelligence|exchange)/i, "verified as a positioning claim"],
    [/verified owners and licensed brokers|verified owners, brokers/i, "asserts the lister set has been checked"],
    [/faster verification/i, "a turnaround claim we have not measured"],
  ],
  ar: [
    [/نطاق الإيجار الموثق|النطاق الموثق/, "the band is REGA's, republished, not verified by us"],
    [/المؤشر الموثّق|المؤشر الموثق/, "no index on the platform has been verified"],
    [AR_CORPUS, "asserts a verified corpus"],
    [/مستأجرون موثّقون|مؤشرات المنصّة الموثّقة|المُدرِجين الموثّقين/, "asserts a verified class of actor"],
    [/توثّق سات كل|توثيق ال[^ ]{2,6}ك قبل/, "universal present-tense verification"],
    [/ذكاء عقاري تجاري موثوق|المنصة التجارية الموثّقة|المنصة الموثّقة/, "verified as a positioning claim"],
    [/أسرع التوثيق/, "a turnaround claim we have not measured"],
  ],
};

// Four strings keep the phrase deliberately, and none of them describes the corpus.
// They are restrictions on who receives a requirement, including the consent label the
// person actually agrees to. Rewriting "verified owners and licensed brokers" out of a
// consent label would widen a data-sharing promise rather than correct a claim, which
// is the wrong direction to move a privacy commitment. They are listed by path so that
// keeping them is a decision on the record rather than a hole in the pattern.
const RECIPIENT_RESTRICTIONS = new Set([
  "postReq.intro",
  "postReq.postsToNote",
  "postReq.privacyNote",
  "postReq.consentLabel",
  "reqDetail.appearAs",
  "reqDetail.none",
]);

for (const [locale, dict] of [["en", EN], ["ar", AR]] as const) {
  test(`ruling 3: no surface claims a verified corpus (${locale})`, () => {
    const offenders: string[] = [];
    for (const [path, s] of dictStrings(dict)) {
      const key = path.replace(/\.\d+$/, "");
      if (RECIPIENT_RESTRICTIONS.has(key)) continue;
      for (const [re, why] of CORPUS_BANNED[locale]) if (re.test(s)) offenders.push(`${path}: ${why}`);
    }
    assert.deepEqual(offenders, [], `claims beyond the record (${locale}):\n${offenders.join("\n")}`);
  });

  test(`ruling 2: the rent band reads as published, not verified (${locale})`, () => {
    // Arabic: the participle is matched bare, without the article, because
    // building.noBand negates an indefinite band ("لا نطاق إيجار منشور") and
    // requiring the definite form there would force ungrammatical copy.
    const published = locale === "en" ? /published/i : /منشور/;
    for (const k of ["rentBand", "rentCheckTitle", "rentAbove", "rentBelow"] as const) {
      assert.match(String(dict.listing[k]), published, `listing.${k} (${locale}) must name the band as published`);
    }
    for (const k of ["rentBand", "noBand", "metaDesc"] as const) {
      assert.match(String(dict.building[k]), published, `building.${k} (${locale}) must name the band as published`);
    }
  });

  test(`ruling 2: every string naming the Rent Index as a source attributes it (${locale})`, () => {
    // The attribution is the whole point of the index being publishable at all, and
    // these are the strings that tell a reader where a figure came from.
    const attribution = locale === "en"
      ? /REGA Rental Index \(Ejar\)/
      : /المؤشر الإيجاري للهيئة العامة للعقار \(إيجار\)/;
    const sourceStrings: [string, string][] = [
      ["advisor.groundedNote", String(dict.advisor.groundedNote)],
      ["advisor.metaDesc", String(dict.advisor.metaDesc)],
      ["advisorWidget.footer", String(dict.advisorWidget.footer)],
      ["map.footer", String(dict.map.footer)],
      ["map.metaDesc", String(dict.map.metaDesc)],
      ["marketPage.intro", String(dict.marketPage.intro)],
      ["locations.intro", String(dict.locations.intro)],
      ["locations.metaDesc", String(dict.locations.metaDesc)],
      ["compare.note", String(dict.compare.note)],
      ["pricing.sub", String(dict.pricing.sub)],
      // home.ownB used to sit here. It was corrected for attribution while it was
      // unreferenced, which is the clearest possible sign that the surrounding
      // group was a latent-claim reservoir; the whole group is now deleted (C39).
    ];
    for (const [path, s] of sourceStrings) {
      assert.match(s, attribution, `${path} (${locale}) names the Rent Index as a source without attributing it`);
    }
  });

  test(`ruling 3: the launch-scoped surfaces say when the standard applies (${locale})`, () => {
    // Same reasoning as /about. A weaker claim is only honest if the reader is told
    // what the weaker claim is, so each of these names launch and says what the
    // preview holds instead.
    const launch = locale === "en" ? /at launch/i : /عند الإطلاق/;
    for (const k of ["trustBody"] as const) {
      assert.match(String(dict.listing[k]), launch, `listing.${k} (${locale}) must scope the check to launch`);
    }
    for (const k of ["intro", "avgTimeValue", "avgTimeNote"] as const) {
      assert.match(String(dict.list[k]), launch, `list.${k} (${locale}) must scope the check to launch`);
    }
    const preview = locale === "en" ? /preview/i : /المعاينة/;
    assert.match(String(dict.listing.trustBody), preview, "listing.trustBody must say preview inventory has not been checked");
    assert.match(String(dict.list.avgTimeNote), preview, "list.avgTimeNote must say preview inventory has not been checked");
  });

  test(`ruling 3: requirements claim no verification the table cannot hold (${locale})`, () => {
    // requirements_public has no verification column. Not an empty one, none at all.
    const verified = locale === "en" ? /verified/i : /موثّق|موثق/;
    assert.doesNotMatch(String(dict.req.h1), verified, `req.h1 (${locale}) claims a state requirements_public cannot record`);
    assert.doesNotMatch(String(dict.req.metaDesc), verified, `req.metaDesc (${locale}) claims a state requirements_public cannot record`);
  });

  test(`ruling 3: SAT does not claim to verify the parties to a deal (${locale})`, () => {
    const s = String(dict.deal.disclaimer);
    if (locale === "en") assert.doesNotMatch(s, /we verify the parties/i);
    else assert.doesNotMatch(s, /نتحقّق من الأطراف|نتحقق من الأطراف/);
  });
}

test("ruling 3: the locations count is named for what it counts", () => {
  // The key was verifiedSpace and the page rendered it next to a listing count. Both
  // the value and the key are renamed, because a key called verifiedSpace holding the
  // word "listed" is a trap for whoever reads it next.
  for (const [locale, dict] of [["en", EN], ["ar", AR]] as const) {
    assert.equal("verifiedSpace" in dict.locations, false, `locations.verifiedSpace still present (${locale})`);
    assert.equal("verifiedSpaces" in dict.locations, false, `locations.verifiedSpaces still present (${locale})`);
    assert.ok(String(dict.locations.listedSpace ?? "").length > 0, `locations.listedSpace missing (${locale})`);
    assert.ok(String(dict.locations.listedSpaces ?? "").length > 0, `locations.listedSpaces missing (${locale})`);
  }
  const page = readFileSync(join(ROOT, "app/[locale]/locations/page.tsx"), "utf8");
  assert.doesNotMatch(page, /verifiedSpaces?\b/, "the locations page still reads the retired key");
});

test("ruling 3: the unreferenced home chips stay deleted", () => {
  // Same defect as the seven sections below, one level in. Nothing outside the
  // dictionaries read home.chips, and its first element said "Verified, owner-direct".
  for (const [locale, dict] of [["en", EN], ["ar", AR]] as const) {
    assert.equal("chips" in dict.home, false, `home.chips is back in ${locale}.json`);
  }
});

test("ruling 3: the retired recency chip is gone from both pages and both dictionaries", () => {
  // "Last 6 months" described a query over transaction records. There is no such
  // query and there are no such records, so the key is removed rather than reworded,
  // which stops a future page from reviving it.
  for (const section of ["invest", "hbu"] as const) {
    for (const [locale, dict] of [["en", EN], ["ar", AR]] as const) {
      assert.equal("last6mo" in dict[section], false, `${section}.last6mo still present (${locale})`);
    }
  }
  assert.doesNotMatch(INVEST_CODE, /last6mo/);
  assert.doesNotMatch(HBU_CODE, /last6mo/);
});

// --- Ruling 3, the tier the dictionary sweep could not reach ---
//
// scripts/prose-scan.mjs has two tiers. The GATE tier, public page source, is
// enforced at zero. The BASE tier, shared component source, is reported and
// deferred to the page-redesign packages. That deferral is a formatting and i18n
// decision and it is a reasonable one, but a claim does not care which tier its
// string lives in. The home page, the site-wide footer, the Open Graph alt text
// and the social card generator all sit in BASE, and between them they carried
// the largest remaining concentration of corpus claims on the platform: a footer
// that rendered "Verified listings, decision-grade data" under every page in both
// languages, and a share card that said "Verified commercial real estate" to
// every reader who had not opened the site at all.
//
// This is ledger C19 one more time. A guard scoped to where a defect was first
// seen will not find the same defect one field over, so this one is scoped to the
// claim rather than to the file.

// C19 a third time, and this is the version that was measured rather than
// assumed. The guard above reached `src/components`, `src/app`, `src/lib/meta.ts`
// and `scripts/og-cards.mjs`, which is where the claims had been FOUND, and 147
// source files sat outside it. Running these same frames over those 147 turned up
// three shipped modules carrying corpus claims:
//
//   src/lib/search/searchNote.ts   the sentence above every advisor search result,
//                                  in both languages: "7 verified matches,
//                                  owner-verified and deduplicated". /api/search
//                                  filters on `status = published`, never on
//                                  `ownership_verified`.
//   src/lib/format.ts              the `verifiedMatch` counted noun that sentence
//                                  was built from, now deleted with its last caller.
//   src/lib/legalContent.ts        the draft terms, privacy and contact documents:
//                                  "verified owners and licensed brokers", "publish
//                                  verified listings", "grounded in the verified
//                                  index" and its Arabic twin.
//
// None of the three is a page or a component, so none was ever in reach. The scope
// is therefore the claim and not the folder: every non-test source file under `src`
// and under `scripts`.
//
// Test sources are excluded as a set rather than one by one, and the reason is
// structural: a guard has to be able to write down what it forbids, and a test of a
// correction has to be able to write down the wording it corrected. Both files that
// quote these needles today do exactly that, `claims.test.ts` in `CORPUS_BANNED`
// itself and `agents.test.ts` feeding "3 verified matches" to `unvouchedFigures` as
// input. No string in a test file reaches a reader.
function claimSources(dir: string, exts: RegExp, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) claimSources(full, exts, out);
    else if (exts.test(name) && !/\.test\.[cm]?tsx?$/.test(name)) out.push(full);
  }
  return out;
}

// ADV-4A. `public/` is shipped verbatim to the origin and never passes through a
// dictionary, a component or the prose gate, so `llms.txt` and `manifest.webmanifest`
// were outside every claim check while being exactly the two files an AI assistant and
// an app installer read instead of the page. The structured data in `src/components/
// JsonLd.tsx` is the same class of machine-read claim and was corrected under ruling 3
// only because the walk happened to reach that folder. Scope the guard to the claim.
const PUBLIC_FACTS: string[] = claimSources(join(ROOT, "..", "public"), /\.(txt|webmanifest|json)$/);

const CLAIM_SOURCES: string[] = [
  ...claimSources(ROOT, /\.(ts|tsx)$/),
  ...claimSources(join(ROOT, "..", "scripts"), /\.(mjs|cjs|js|ts)$/),
  ...PUBLIC_FACTS,
];

// The comment stripper is a TypeScript rule. Applied to a manifest or a text file it
// would delete content rather than commentary, which is a way for a claim to hide from
// the guard inside the guard, so it runs only on the extensions it was written for.
const CODE_EXT = /\.(ts|tsx|mjs|cjs|js)$/;

// A claim source named the way this file and the register name one: repo-relative,
// forward slashes. The walk builds absolute paths with `join`, which separates with
// a backslash on Windows, so the reach assertion below has to be handed a
// normalised name or it reports every module it names as outside the scan.
const REPO = join(ROOT, "..");
const repoRel = (f: string) => f.slice(REPO.length + 1).split(sep).join("/");

test("ruling 3: no source file anywhere carries a corpus claim", () => {
  // The count is asserted so that a future refactor which moves a folder out of the
  // walk fails here rather than silently shrinking the guard back to where it was.
  assert.ok(CLAIM_SOURCES.length > 200, `the claim scan reaches only ${CLAIM_SOURCES.length} files`);
  const offenders: string[] = [];
  for (const f of CLAIM_SOURCES) {
    const raw = readFileSync(f, "utf8");
    const src = CODE_EXT.test(f) ? code(raw) : raw;
    const rel = repoRel(f);
    for (const locale of ["en", "ar"] as const) {
      for (const [re, why] of CORPUS_BANNED[locale]) {
        const m = src.match(new RegExp(re.source, re.flags.replace("g", "")));
        if (m) offenders.push(`${rel}: ${JSON.stringify(m[0])}: ${why}`);
      }
    }
  }
  assert.deepEqual(offenders, [], `claims beyond the record in source:\n${offenders.join("\n")}`);
});

test("ruling 3: the claim scan reaches the three modules that were outside it", () => {
  // Naming them is the point. A scan that reports zero offenders proves nothing
  // about its own reach, and the previous scan reported zero for weeks while these
  // three carried claims.
  const rel = new Set(CLAIM_SOURCES.map(repoRel));
  for (const f of ["src/lib/search/searchNote.ts", "src/lib/format.ts", "src/lib/legalContent.ts", "src/lib/agents/agents.ts", "src/middleware.ts", "scripts/seed-demo.mjs", "public/llms.txt", "public/manifest.webmanifest"]) {
    assert.ok(rel.has(f), `${f} is outside the claim scan`);
  }
  for (const f of ["src/lib/claims.test.ts", "src/lib/agents/agents.test.ts"]) {
    assert.equal(rel.has(f), false, `${f} is a test source and must stay outside the claim scan`);
  }
});

test("ruling 3: the social card and its alt text describe the card, not the corpus", () => {
  // The alt text is read by a screen reader and scraped into a link preview, and
  // the card is seen by people who never load the page. Neither is covered by the
  // global preview notice, because neither is on the page.
  const meta = readFileSync(join(ROOT, "lib/meta.ts"), "utf8");
  assert.doesNotMatch(code(meta), /verified commercial real estate/i);
  assert.doesNotMatch(code(meta), /مساحات تجارية موثّقة/);
  const og = code(readFileSync(join(ROOT, "..", "scripts/og-cards.mjs"), "utf8"));
  assert.doesNotMatch(og, /Verified commercial real estate/i);
  assert.doesNotMatch(og, /Owner-verified listings/i);
  assert.doesNotMatch(og, /مساحات تجارية موثّقة/);
});

test("C4: the featured card verification flag is exactly ownership_verified", () => {
  // The three queries C4 corrected were Supabase .or() calls. The same widening
  // also existed in plain JavaScript, on the home page, where the featured card
  // computed its badge from ownership_verified || authorization_verified ||
  // is_sat_listed and then labelled it "Verified owner". A scan for .or() cannot
  // see that, so the flag is asserted directly.
  //
  // ADV-1 removed the boolean entirely: the card is handed the list of badges the
  // record has earned, each naming its own gate. The widening this test was written
  // to catch is therefore no longer expressible on this page, and the assertion is
  // that it stays that way.
  const home = code(readFileSync(join(ROOT, "app/[locale]/page.tsx"), "utf8"));
  assert.doesNotMatch(home, /verified:\s*!!/, "the featured card must not compute a verification boolean of its own");
  assert.doesNotMatch(home, /authorization_verified/, "the featured card badge counts more than ownership");
  assert.doesNotMatch(home, /is_sat_listed/, "the featured card badge counts our own stock as verified");
  // PKG-CARD1. The home page used to flatten each row's badges into the
  // `FeaturedListing` shape it built by hand. It now hands the raw row to
  // `ListingCard`, so it computes no badges of its own at all (nor any other
  // figure `ListingCard` already knows how to read), and the resolver call
  // this test used to find here is the one inside the shared card.
  assert.doesNotMatch(home, /badges:\s*listingVerifiedDimensions\(/, "the featured card must not compute its own badge list; ListingCard resolves it from the row");
  // The page itself renders `<MarketingHome>`, not the card directly; the card
  // is `MarketingHome`'s to render.
  const marketingHome = code(readFileSync(join(ROOT, "components/MarketingHome.tsx"), "utf8"));
  assert.match(marketingHome, /<ListingCard\b/, "the featured card must render through the shared card");
  const cardSrc = code(readFileSync(join(ROOT, "components/ListingCard.tsx"), "utf8"));
  assert.match(cardSrc, /verifiedBadgeTexts\(/, "the shared card's badges must come from the resolver");
});

test("ruling 3: the dead year-on-year band caption stays deleted", () => {
  // bandStat held "Riyadh Grade A, YoY (published)" and two more captions. Nothing
  // rendered them: the year-on-year block above them was removed when it turned out
  // a trend needs two periods of the same series and rent_index_published holds one.
  // The strings survived the removal and would have read as a published trend to the
  // next person who wired them back up.
  const mh = code(readFileSync(join(ROOT, "components/MarketingHome.tsx"), "utf8"));
  assert.doesNotMatch(mh, /bandStat/, "MarketingHome still carries the retired bandStat captions");
  assert.doesNotMatch(mh, /YoY/i, "MarketingHome still claims a year-on-year figure");
});

test("ruling 3: the unreferenced home keys stay deleted", () => {
  // C6 lived in home.mapBody: "the Kingdom's commercial buildings ... Live now in
  // Riyadh, expanding nationwide", against 75 sample buildings in one city. It was
  // never rendered. Neither was home.occupancyLabel, a Riyadh Grade A occupancy
  // figure no query produces, nor home.cityBars, which named Jeddah and Dammam.
  //
  // Deleted rather than reworded, for the C27 reason: the cheapest route for a
  // false claim onto a page is to be sitting in the dictionary already, correctly
  // translated, one autocomplete away. A rewritten string that nothing renders is
  // a claim waiting for a call site.
  const DEAD = ["lens", "mapTitle", "mapBody", "mapCta", "forTitle", "forSub",
    "occT", "occB", "occC", "ownT", "ownB", "ownC", "invT", "invB", "invC",
    "cityBars", "rentEyebrow", "teaserPlaces", "occupancyLabel"];
  for (const [locale, dict] of [["en", EN], ["ar", AR]] as const) {
    for (const k of DEAD) {
      assert.equal(k in dict.home, false, `home.${k} (${locale}) is back; it carries a claim the record does not hold`);
    }
  }
});

test("ruling 3: the hero trust chips are scoped to launch and are not verification marks", () => {
  // Found by reading the deployed Arabic page, not by a test: an enumeration of the
  // root توثيق on /ar returned eight hits, seven correct, and the first was this chip
  // sitting under the hero with a green tick beside it. account_verifications holds 0
  // rows and all ten accounts are is_demo, so no owner has been checked.
  //
  // Two things were wrong and both are pinned here. The wording asserted a completed
  // check, and the tick was drawn in #3ECF8E, a green in the verified family. A green
  // tick reads as "confirmed" wherever it appears, which is the whole reason
  // src/styles/sat-platform.css reserves --verified (#1B7A50) for evidence-backed
  // verification; spending a verified-looking mark on a launch-scoped promise
  // reintroduces the claim the wording just gave up.
  //
  // The remaining #3ECF8E in this file is the hero eyebrow status dot, which asserts
  // nothing about a record. It is left alone deliberately: the palette consolidation
  // is a separate parked package, and widening a claim fix into a colour sweep is the
  // thing the standing constraint forbids.
  const mh = code(readFileSync(join(ROOT, "components/MarketingHome.tsx"), "utf8"));
  assert.doesNotMatch(mh, /Owners verified before/i, "the hero chip claims owners have been verified");
  assert.doesNotMatch(mh, /توثيق ال[^ ]{2,6}ك قبل/, "the Arabic hero chip claims owners have been verified");
  assert.match(mh, /At launch, owners checked before listing/, "the English hero chip must scope the check to launch");
  assert.match(mh, /عند الإطلاق، يُفحص المُلّاك قبل الإدراج/, "the Arabic hero chip must scope the check to launch");
  const ticks = mh.split(/#3ECF8E/).length - 1;
  assert.equal(ticks, 1, `MarketingHome carries ${ticks} uses of the unguarded green #3ECF8E; only the hero eyebrow dot may keep it`);
});

// ---------------------------------------------------------------------------
// ADV-1 (C): a claim is a value, not a key and not a page
//
// Commit 0625309 added ten guards asserting that no surface carries the retired
// owner claim. All 518 tests passed. The deployed page then printed that claim
// four times in English and four in Arabic, because the guards walk src/app and
// src/components, and the claim does not live in a page. It lives in the
// dictionary the page interpolates, under five keys none of which is named after
// it. The one dictionary guard in that commit checked KEY NAMES.
//
// So the defect was never the wording. It was that a claim is a string a reader
// sees, and every check written up to that point looked somewhere else. These
// walk the values.
// ---------------------------------------------------------------------------

function dictValues(node: unknown, path: string[] = [], out: Array<[string, string]> = []): Array<[string, string]> {
  if (typeof node === "string") out.push([path.join("."), node]);
  else if (node && typeof node === "object") {
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) dictValues(v, [...path, k], out);
  }
  return out;
}

const LOCALES: Array<[string, Array<[string, string]>]> = [
  ["en", dictValues(EN)],
  ["ar", dictValues(AR)],
];

// Written as escapes on purpose. scripts/ar-lint.mjs scans test sources, the
// ruling 2 guard below scans src/** including this file, and a guard that trips
// on its own needle teaches nothing.
const AR_VERIFIED_OWNER = "\u0645\u0627\u0644\u0643 \u0645\u0648\u062b\u0651\u0642";
const AR_BARE_VERIFIED = "\u0645\u0648\u062b\u0651\u0642";
const AR_BARE_PLURAL = "\u0645\u0644\u0627\u0643";

test("ADV-1 (C): no dictionary value carries the retired bare owner claim", () => {
  for (const [locale, values] of LOCALES) {
    for (const [key, v] of values) {
      assert.ok(
        !v.includes("Verified owner") && !v.includes("verified owner"),
        `${locale}.json ${key} states an owner has been verified: ${JSON.stringify(v)}`
      );
      assert.ok(
        !v.includes(AR_VERIFIED_OWNER),
        `${locale}.json ${key} states an owner has been verified: ${JSON.stringify(v)}`
      );
    }
  }
});

test("ADV-1 (C): no dictionary value is a bare verification badge", () => {
  // A badge reading only "Verified" names no gate, no method, no date and no
  // reviewer, so a reader supplies all four themselves. O3: every badge names the
  // gate it rests on. Anything that survives here is a label, not a badge.
  for (const [locale, values] of LOCALES) {
    for (const [key, v] of values) {
      const t = v.trim();
      assert.ok(
        !/^(an? )?verified( listing| owner| space)?$/i.test(t),
        `${locale}.json ${key} is a bare verification badge: ${JSON.stringify(v)}`
      );
      assert.notEqual(t, AR_BARE_VERIFIED, `${locale}.json ${key} is a bare verification badge`);
    }
  }
});

test("ADV-1 (C): the keys the label layer stopped earning stay gone", () => {
  // Three of these were already orphaned when they were deleted, which is how the
  // claim survived a source sweep: nothing referenced them, so nothing pointed at
  // them, and they kept rendering wherever the fourth and fifth were interpolated.
  for (const [locale, values] of LOCALES) {
    const keys = new Set(values.map(([k]) => k));
    for (const k of [
      "dash.verified",
      "listing.verified",
      "listerPage.verified",
      "ui.verifiedListing",
      "building.verified",
    ]) {
      assert.ok(!keys.has(k), `${locale}.json ${k} is back`);
    }
  }
});

test("ADV-1 (C), ruling 2: a band names whose index it came from", () => {
  // The chip beside the rent band on /building/[id] read "Verified", over a row
  // whose own data_class is synthetic. The line that replaced it is an attribution,
  // which is both the honest label and the one ruling 2 requires.
  assert.equal(EN.building.bandSource, "REGA Rental Index (Ejar)");
  assert.equal(AR.building.bandSource, "المؤشر الإيجاري للهيئة العامة للعقار (إيجار)");
  const bp = code(readFileSync(join(ROOT, "app/[locale]/building/[id]/page.tsx"), "utf8"));
  assert.doesNotMatch(bp, /className="verified"|tag-verified/, "the building page draws a verification chip again");
  assert.match(bp, /T\.bandSource/, "the band must name its source");
});

test("ADV-1 (C), ruling 2: the index is never described as ours", () => {
  // "SAT published Rent Index" sat under a rent band on every listing page. We
  // publish a page about the index. We do not publish the index.
  for (const [locale, values] of LOCALES) {
    for (const [key, v] of values) {
      assert.ok(!/SAT published Rent Index/i.test(v), `${locale}.json ${key} claims the index as ours`);
      assert.ok(
        !v.includes("مؤشر إيجارات سات"),
        `${locale}.json ${key} claims the index as ours`
      );
    }
  }
  // A source label is the one place where the full attribution is not optional.
  assert.match(EN.advisor.sourceRentIndex, /^REGA Rental Index \(Ejar\)/);
  assert.match(EN.ld.bandsDisclaimer, /REGA Rental Index \(Ejar\)/);
});

test("ADV-1 (C), ruling 3: the platform makes no promise it has not kept", () => {
  // Two performance claims, both about a platform that has taken no enquiry and
  // ranked no listing: verification bought "more replies" in the owner dashboard
  // and "prominent placement" in the listing pitch. Neither is measurable yet.
  for (const [locale, values] of LOCALES) {
    for (const [key, v] of values) {
      assert.ok(!/more replies/i.test(v), `${locale}.json ${key} promises a reply rate`);
      assert.ok(!/prominent placement/i.test(v), `${locale}.json ${key} promises a ranking`);
    }
  }
});

test("ADV-1 (C): the listing card reads the resolver, not the publish gate", () => {
  // It read passesGate, whose ownership and authorisation legs default to PASS when
  // the column is unset. A row nobody had opened cleared half the gate by silence,
  // and the only thing holding the badge back on all 88 published rows was that
  // none of them carries an advertising permit. The first permit added would have
  // lit a verification tick on a record nobody had checked.
  const c = code(readFileSync(join(ROOT, "components/ListingCard.tsx"), "utf8"));
  assert.doesNotMatch(c, /passesGate/, "the card decides verification from the publish gate");
  assert.match(c, /verifiedBadgeTexts\(/, "the card badges must come from the resolver");
});

test("ADV-1 (C), ruling 2: the plural that means property owners is spelled with the shadda", () => {
  // Owner ruling 2. The unmarked plural reads as the other word entirely, so this
  // is a meaning fix rather than a typographic one. The sweep had to spare
  // properties/assets, which contains the same four letters behind an alif; that
  // word is checked for explicitly rather than assumed absent.
  const seen: string[] = [];
  const walkAll = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) walkAll(full);
      else if (/\.(ts|tsx|json|css|mjs)$/.test(name) && !/\.test\.tsx?$/.test(name)) {
        const src = readFileSync(full, "utf8");
        let i = src.indexOf(AR_BARE_PLURAL);
        while (i >= 0) {
          // The alif-prefixed word is a different noun and is allowed to stand.
          if (src[i - 1] !== "أ") seen.push(`${full.slice(ROOT.length + 1)}: ${JSON.stringify(src.slice(i - 20, i + 20))}`);
          i = src.indexOf(AR_BARE_PLURAL, i + 1);
        }
      }
    }
  };
  walkAll(ROOT);
  assert.deepEqual(seen, [], "the unmarked plural is back");
});
