import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { SITEMAP_ROUTES, HELD_ROUTES, PRIVATE_PREFIXES } from "./routePolicy";
import { verificationStateLabel, verificationDimensionLabel } from "./evidence";
import { gateReasonText } from "./gate";
import { LISTING_DIMENSIONS, notVerifiedReasonText } from "./listingVerification";
import { COUNTED, formatCounted } from "./format";
import { RE_GLOSSARY } from "./translate/glossary";
import {
  ALL_STATES,
  DEMOTION_REASONS,
  ALL_GATE_REASONS,
  DECLARED_SOURCES,
  SOURCE_COPY,
  COUNT_BOUNDARIES,
  SHOWN_NOUNS,
} from "./publishedRecords";

//
// ADV-4B. The three public records: what a verification means, where the data
// comes from, and how the two languages are held to each other.
//
// Each page renders a list the ENGINE owns rather than a list the dictionary
// repeats. That design only pays for itself if a member added to the engine
// cannot quietly go unpublished, so this file is the assertion that makes the
// arrays on those pages complete rather than merely current.
//
// The lists themselves are IMPORTED, from `publishedRecords.ts`. They cannot
// live in the page files: a Next.js page module may only export the route
// contract, and `next build` generates a type that fails the compile on any
// other export.
//
// Everything else about the pages is read as SOURCE rather than imported. A page
// module pulls in `next/link`, `next/navigation` and a client component, none of
// which a `tsx --test` process can resolve, and the remaining assertions are
// about what the file does and does not reference rather than what it renders.
//

const ROOT = join(__dirname, "..", "..");
const read = (p: string) => readFileSync(join(ROOT, p), "utf8");

const VERIFICATION = read("src/app/[locale]/verification/page.tsx");
const SOURCES = read("src/app/[locale]/sources/page.tsx");
const BILINGUAL = read("src/app/[locale]/bilingual/page.tsx");
const FOOTER = read("src/components/SatFooter.tsx");
const LEDGER = read("supabase/migrations/20260728_source_rights_ledger.sql");

const EN = JSON.parse(read("src/i18n/dictionaries/en.json")) as Record<string, Record<string, string>>;
const AR = JSON.parse(read("src/i18n/dictionaries/ar.json")) as Record<string, Record<string, string>>;

/**
 * The members of a string-literal union, read from the type declaration.
 *
 * TypeScript erases a union, so there is no runtime value to compare a page's
 * list against. Reading the declaration is the only way to make "this list is
 * every member" an assertion rather than a comment.
 */
function unionMembers(file: string, name: string): string[] {
  const src = read(file);
  const m = new RegExp(`export type ${name}\\s*=\\s*([^;]+);`).exec(src);
  assert.ok(m, `${name} is no longer a union declared in ${file}`);
  const out = [...(m as RegExpExecArray)[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]);
  assert.ok(out.length > 0, `${name} parsed to an empty union, which the parser cannot tell from a rename`);
  return out;
}

const sorted = (xs: readonly string[]) => [...xs].sort();

/**
 * The file with its comments removed.
 *
 * Every assertion below that asks whether a page REFERENCES something has to
 * read code rather than prose, because the header comment on each of these
 * pages names the very fields the page is refusing to render. Scanning the raw
 * text would fail the page for explaining itself.
 */
const codeOnly = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/[^\n]*/g, "$1");

const SOURCES_CODE = codeOnly(SOURCES);
const VERIFICATION_CODE = codeOnly(VERIFICATION);
const BILINGUAL_CODE = codeOnly(BILINGUAL);

// ------------------------------------------------------- /verification

test("ADV-4B: the states the page publishes are every state the engine has", () => {
  assert.deepEqual(
    sorted(ALL_STATES),
    sorted(unionMembers("src/lib/evidence.ts", "VerificationState")),
    "a state exists that the page describing the states does not show",
  );
});

test("ADV-4B: the gate failures the page publishes are every failure the gate returns", () => {
  assert.deepEqual(
    sorted(ALL_GATE_REASONS),
    sorted(unionMembers("src/lib/gate.ts", "GateReason")),
    "the marketing gate can return a reason the page does not print",
  );
});

test("ADV-4B: every demotion reason is placed deliberately, in one section or another", () => {
  // The page splits the union on purpose: the six below are produced by the
  // demotion chain, and the other three are produced by the permit check and by
  // the lister-relation check, which have their own sections. The assertion is
  // that the split is EXHAUSTIVE and DISJOINT, so a reason added to the engine
  // tomorrow fails here rather than landing in neither section.
  const shown: readonly string[] = DEMOTION_REASONS;
  const elsewhere = ["permit_missing", "permit_expired", "relation_contradicted"];
  const all = unionMembers("src/lib/listingVerification.ts", "NotVerifiedReason");

  const overlap = shown.filter((r) => elsewhere.includes(r));
  assert.deepEqual(overlap, [], `reported in two sections at once: ${overlap.join(", ")}`);
  assert.deepEqual(sorted([...shown, ...elsewhere]), sorted(all), "a reason belongs to no section on the page");

  for (const r of elsewhere) {
    assert.ok(all.includes(r), `${r} is no longer a reason the engine can return`);
  }
});

test("ADV-4B: every label the verification page prints is real text in both languages", () => {
  // The page reads its labels from the engine, so an unmapped member would
  // render as a blank rather than as an error. A blank on a page that explains
  // what a word means is read as "this does not apply", which is a claim.
  const check = (label: string, what: string) => {
    assert.notEqual(label.trim(), "", `${what} renders empty`);
  };
  for (const s of ALL_STATES) {
    check(verificationStateLabel(s as never, false), `state ${s} in English`);
    check(verificationStateLabel(s as never, true), `state ${s} in Arabic`);
    assert.notEqual(
      verificationStateLabel(s as never, false),
      verificationStateLabel(s as never, true),
      `state ${s} renders the same text in both languages, so one of them is untranslated`,
    );
  }
  for (const d of LISTING_DIMENSIONS) {
    check(verificationDimensionLabel(d, false), `dimension ${d} in English`);
    check(verificationDimensionLabel(d, true), `dimension ${d} in Arabic`);
  }
  for (const r of DEMOTION_REASONS) {
    check(notVerifiedReasonText(r as never, false), `reason ${r} in English`);
    check(notVerifiedReasonText(r as never, true), `reason ${r} in Arabic`);
  }
  for (const r of ALL_GATE_REASONS) {
    check(gateReasonText(r as never, false), `gate reason ${r} in English`);
    check(gateReasonText(r as never, true), `gate reason ${r} in Arabic`);
  }
});

test("ADV-4B: where two states print the same words, the page says which two and why", () => {
  // `unknown` and `not_verified` map to one badge on purpose: a dimension nobody
  // has looked at must never read better than one that was looked at and could
  // not be confirmed. On a listing that collapse is protective. On the page that
  // enumerates the states it renders as the same label twice, so the page has to
  // name the collision. This test finds the collisions from the engine rather
  // than assuming which pair collides, so a future relabelling that creates a
  // new pair fails here instead of shipping an unexplained duplicate.
  for (const [name, dict] of [["en", EN], ["ar", AR]] as const) {
    const byLabel = new Map<string, string[]>();
    for (const s of ALL_STATES) {
      const label = verificationStateLabel(s, name === "ar");
      byLabel.set(label, [...(byLabel.get(label) ?? []), s]);
    }
    const collisions = [...byLabel.values()].filter((xs) => xs.length > 1);
    if (collisions.length === 0) continue;

    const body = dict.verification?.collideB ?? "";
    assert.ok(body.trim().length > 0, `${name}: two states print the same label and the page does not explain it`);
    assert.ok((dict.verification?.collideT ?? "").trim().length > 0, `${name}: verification.collideT is missing`);
    for (const group of collisions) {
      for (const s of group) {
        assert.ok(body.includes(s), `${name}: ${s} collides with another state and the explanation does not name it`);
      }
    }
  }
});

test("ADV-4B: the verification page states the two checks separately", () => {
  // The whole finding behind this page is that one badge for two different
  // checks tells a reader less than it appears to. If the copy for either check
  // is dropped, the page has become the thing it warns about.
  for (const dict of [EN, AR]) {
    for (const k of ["ownerT", "ownerB", "listingT", "listingB", "satT", "satB"]) {
      assert.ok((dict.verification?.[k] ?? "").trim().length > 0, `verification.${k} is missing or empty`);
    }
  }
});

// ------------------------------------------------------------ /sources

test("ADV-4B: the page declares exactly the sources the rights ledger records", () => {
  const inLedger = [...LEDGER.matchAll(/where source_id = '([a-z0-9_]+)'/g)].map((m) => m[1]);
  assert.ok(inLedger.length > 0, "the rights ledger no longer names its rows the way this test reads them");
  assert.deepEqual(
    sorted(DECLARED_SOURCES),
    sorted([...new Set(inLedger)]),
    "the published register and the recorded register name different sources",
  );
});

test("ADV-4B: every declared source has a name and a note in both languages", () => {
  const declared: readonly string[] = DECLARED_SOURCES;
  const copyKeys = Object.entries(SOURCE_COPY);

  for (const id of declared) {
    const key = SOURCE_COPY[id];
    assert.ok(key, `${id} is declared but has no entry in SOURCE_COPY, so it would render as a bare id`);
    for (const [name, dict] of [["en", EN], ["ar", AR]] as const) {
      for (const suffix of ["T", "B"]) {
        const k = `s${key}${suffix}`;
        assert.ok((dict.sources?.[k] ?? "").trim().length > 0, `${name}: sources.${k} is missing for ${id}`);
      }
    }
  }
  for (const [id] of copyKeys) {
    assert.ok(declared.includes(id), `SOURCE_COPY names ${id}, which is not a declared source`);
  }
});

test("ADV-4B: the sources page withholds the three fields it is not allowed to publish", () => {
  // 1. denialReason quotes internal licence reasoning, and its own doc comment
  //    in sourceRights.ts forbids rendering it publicly. Our summary of a
  //    licensor's terms is a republication of those terms.
  // 2 and 3. stopCondition and reviewedNote are recorded in one language only,
  //    so rendering them puts English on the Arabic page. That is the parity law
  //    failing on the page that publishes the parity law.
  for (const field of ["denialReason", "stopCondition", "reviewedNote"]) {
    const used = new RegExp(`\\br\\.${field}\\b|\\b${field}\\(`).test(SOURCES_CODE);
    assert.equal(used, false, `the sources page renders ${field}, which it must not publish`);
  }
});

test("ADV-4B: the sources page has a controlled state for a register it cannot read", () => {
  // getAllSourceRights returns an EMPTY MAP on every failure path rather than
  // throwing. An empty map rendered as an empty table reads as "no sources",
  // which is the one thing it does not mean.
  assert.match(SOURCES, /register\.size === 0/, "the empty register is no longer handled explicitly");
  for (const [name, dict] of [["en", EN], ["ar", AR]] as const) {
    for (const k of ["unavailableTitle", "unavailableBody", "notRecorded"]) {
      assert.ok((dict.sources?.[k] ?? "").trim().length > 0, `${name}: sources.${k} is missing`);
    }
  }
});

test("ADV-4B, D26: the sources page states that the portals are never scraped", () => {
  // Recorded as a decision because a verification-first exchange cannot be
  // caught taking that shortcut. It is published here so the commitment is
  // checkable from outside rather than only from the roadmap.
  assert.match(EN.sources.neverBody, /Najiz/i, "the English copy no longer names the portals it refuses to scrape");
  assert.match(EN.sources.neverBody, /scrape/i, "the English copy no longer states the refusal");
  assert.ok((AR.sources.neverBody ?? "").trim().length > 0, "the Arabic copy of the refusal is missing");
});

// ---------------------------------------------------------- /bilingual

test("ADV-4B, finding 52: the page renders every boundary Arabic counting breaks on", () => {
  const required = [1, 2, 3, 10, 11, 99, 100];
  const shown: readonly number[] = COUNT_BOUNDARIES;
  for (const n of required) {
    assert.ok(shown.includes(n), `the published table skips ${n}, which is a boundary the formatter is graded on`);
  }
});

test("ADV-4B: the counted table is generated by the formatter, at nouns the formatter knows", () => {
  assert.match(BILINGUAL, /formatCounted\(/, "the table is no longer produced by the shared formatter");
  const nouns: readonly string[] = SHOWN_NOUNS;
  assert.ok(nouns.length >= 2, "one noun cannot show that the rule is general rather than hand written");
  for (const n of nouns) {
    assert.ok(n in COUNTED, `${n} is not a counted noun the formatter defines`);
  }
  // The point of the table is that the forms actually differ across the breaks.
  // If a future edit collapsed the Arabic forms, the table would still render
  // and would still be wrong, so the difference is asserted rather than shown.
  //
  // Four counts, not the seven the table prints. 99 and 100 take the same written
  // word as 11 and 1 respectively for several nouns, because the difference at
  // those boundaries is case marking that unvocalised text does not carry. The
  // four below are the ones where the WORD changes for every counted noun.
  for (const n of nouns) {
    const forms = [1, 2, 3, 11].map((k) => formatCounted(k, n as never, "ar").replace(/[\d,]/g, "").trim());
    assert.equal(
      new Set(forms).size,
      4,
      `${n}: the Arabic forms at 1, 2, 3 and 11 are not four different forms, so the table is showing one form four times`,
    );
  }
});

test("ADV-4B: the published term base is the shipped term base, whole", () => {
  assert.match(BILINGUAL, /Object\.entries\(RE_GLOSSARY\)/, "the page publishes a subset rather than the mapping itself");
  assert.ok(Object.keys(RE_GLOSSARY).length > 100, "the term base has shrunk enough to be worth checking");
  const empty = Object.entries(RE_GLOSSARY).filter(([, v]) => !/[؀-ۿ]/.test(v)).map(([k]) => k);
  assert.deepEqual(empty, [], `term base entries with no Arabic in them: ${empty.join(", ")}`);
});

// ------------------------------------------------------ route and footer

test("ADV-4B, O11: all three pages ship held out of indexing", () => {
  const held = HELD_ROUTES.map((h) => h.path);
  for (const p of ["/verification", "/sources", "/bilingual"]) {
    assert.ok(held.includes(p), `${p} is not held, so the middleware would let it be indexed`);
    assert.equal(SITEMAP_ROUTES.includes(p), false, `${p} is both held and published, which cannot both be true`);
    const priv = PRIVATE_PREFIXES.find((x) => p === x || p.startsWith(`${x}/`));
    assert.equal(priv, undefined, `${p} is also a private prefix, so it would be unreachable`);
  }
  for (const p of ["/verification", "/sources", "/bilingual"]) {
    const reason = HELD_ROUTES.find((h) => h.path === p)?.reason ?? "";
    assert.ok(reason.trim().length > 0, `${p} is held with no recorded reason`);
  }
});

test("ADV-4B: the footer points at the pages rather than at the placeholder", () => {
  // "How we verify" pointed at /about, a page about the company that says
  // nothing about what a verification is. A record nobody can reach from the
  // site is a record that only exists in a closure note.
  assert.match(FOOTER, /"How we verify": "\/verification"/, "the footer still routes verification to the placeholder");
  assert.match(FOOTER, /"Data sources": "\/sources"/, "the footer does not link the source register");
  assert.match(FOOTER, /"Bilingual standards": "\/bilingual"/, "the footer does not link the bilingual record");
  for (const label of ["How we verify", "Data sources", "Bilingual standards"]) {
    assert.match(FOOTER, new RegExp(`"${label}":"[^"]*[\\u0600-\\u06FF][^"]*"`), `${label} has no Arabic in the footer`);
  }
});

test("ADV-4B: the pages render the published lists rather than lists of their own", () => {
  // The lists moved out of the page files to satisfy the route contract. That
  // move is only safe while the pages still READ them: a page that quietly went
  // back to a literal of its own would pass every assertion above, because every
  // assertion above now checks the module rather than the page.
  const uses: [string, string, string[]][] = [
    ["/verification", VERIFICATION_CODE, ["ALL_STATES", "DEMOTION_REASONS", "ALL_GATE_REASONS"]],
    ["/sources", SOURCES_CODE, ["DECLARED_SOURCES", "SOURCE_COPY"]],
    ["/bilingual", BILINGUAL_CODE, ["COUNT_BOUNDARIES", "SHOWN_NOUNS"]],
  ];
  for (const [route, src, names] of uses) {
    assert.match(src, /@\/lib\/publishedRecords/, `${route} no longer imports the published lists`);
    for (const n of names) {
      // The import statement is one occurrence. A second is the page using it.
      const hits = [...src.matchAll(new RegExp(`\\b${n}\\b`, "g"))].length;
      assert.ok(hits >= 2, `${route} imports ${n} but never reads it, so the list is published nowhere`);
    }
  }
});

test("ADV-4B: every dictionary key the three pages read exists in both languages", () => {
  // The pages read their narrative as `c.key`. A key that is renamed in one
  // dictionary and not the other passes the parity law, because parity compares
  // the two dictionaries to each other and not either of them to the page.
  const pages: [string, string][] = [
    ["verification", VERIFICATION],
    ["sources", SOURCES],
    ["bilingual", BILINGUAL],
  ];
  for (const [section, src] of pages) {
    const keys = [...new Set([...src.matchAll(/\bc\.([a-zA-Z][a-zA-Z0-9]*)/g)].map((m) => m[1]))];
    assert.ok(keys.length > 5, `${section}: no dictionary reads were found, so this test is measuring nothing`);
    for (const [name, dict] of [["en", EN], ["ar", AR]] as const) {
      const missing = keys.filter((k) => !(k in (dict[section] ?? {})));
      assert.deepEqual(missing, [], `${name}.${section} is missing keys the page reads: ${missing.join(", ")}`);
    }
  }
});
