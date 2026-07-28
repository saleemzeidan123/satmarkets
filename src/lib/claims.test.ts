import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

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

test("C4: the verified surfaces filter on ownership_verified alone", () => {
  const home = readFileSync(join(ROOT, "app/[locale]/page.tsx"), "utf8");
  const listings = readFileSync(join(ROOT, "app/[locale]/listings/page.tsx"), "utf8");
  assert.match(home, /\.eq\("ownership_verified",\s*true\)/, "home owner-verified KPI must count ownership_verified rows");
  // Two of them: the result query and the facet-count query. A facet count that
  // disagrees with the list it describes is its own small false claim.
  const hits = listings.match(/\.eq\("ownership_verified",\s*true\)/g) ?? [];
  assert.equal(hits.length, 2, "both the /listings result query and its facet counts must use the same predicate");
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
