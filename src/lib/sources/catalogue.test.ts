import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import {
  SOURCE_CATALOGUE,
  DECLARED_SOURCES,
  SOURCE_COPY,
  REGA_RENT_INDEX_SOURCE_ID,
  sourceOwnerLabel,
} from "./catalogue";
import { RENT_INDEX_SOURCE } from "../market/attribution";

//
// ADV-1C.1 correction 2, and Codex gate 3: "the REGA source is resolved through
// one canonical path".
//
// Before this package there were three hand-written lists of the same nine
// source ids, plus a tenth copy of one of them as a bare string literal inside
// the rent ingest pipeline. Nothing connected the row the pipeline wrote to the
// register row that governs it, and nothing could fail if they drifted apart.
//
// The assertions below are therefore not about the catalogue's contents. They
// are about the catalogue being the ONLY place the contents are written down.
//

const ROOT = join(__dirname, "..", "..", "..");
const SRC = join(ROOT, "src");

/** Comments removed, because a file is allowed to EXPLAIN the id it must not repeat. */
const codeOnly = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/[^\n]*/g, "$1");

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name)) out.push(p);
  }
  return out;
}

test("ADV-1C.1: the catalogue is internally consistent", () => {
  const ids = SOURCE_CATALOGUE.map((e) => e.id);
  assert.equal(new Set(ids).size, ids.length, "the catalogue declares the same id twice");
  assert.deepEqual([...DECLARED_SOURCES], ids, "the declared reading order is no longer the catalogue's order");
  assert.deepEqual(
    Object.keys(SOURCE_COPY).sort(),
    [...ids].sort(),
    "SOURCE_COPY and the catalogue name different sources",
  );
  for (const e of SOURCE_CATALOGUE) {
    assert.equal(SOURCE_COPY[e.id], e.copyKey, `${e.id}: the copy key drifted from its catalogue entry`);
    assert.equal(sourceOwnerLabel(e.id, false), e.owner[0], `${e.id}: the English owner label drifted`);
    assert.equal(sourceOwnerLabel(e.id, true), e.owner[1], `${e.id}: the Arabic owner label drifted`);
    assert.ok(e.owner[0].trim().length > 0 && e.owner[1].trim().length > 0, `${e.id}: an owner name is empty`);
    assert.match(e.owner[1], /[؀-ۿ]/, `${e.id}: the Arabic owner name has no Arabic in it`);
  }
});

test("ADV-1C.1: an unknown id is labelled by its own id rather than dropped", () => {
  // A row added to the register tomorrow must still appear on /sources. The id
  // is a single Latin-character token, so it reads the same in both languages.
  assert.equal(sourceOwnerLabel("not_in_the_catalogue", false), "not_in_the_catalogue");
  assert.equal(sourceOwnerLabel("not_in_the_catalogue", true), "not_in_the_catalogue");
});

test("ADV-1C.1, owner ruling 2: the REGA owner name is the canonical attribution", () => {
  // Owner ruling 2 requires every Rent Index reference to carry the attribution
  // to the REGA Rental Index (Ejar). A second spelling of it living in the
  // catalogue is exactly the defect `market/attribution.ts` exists to prevent.
  assert.equal(sourceOwnerLabel(REGA_RENT_INDEX_SOURCE_ID, false), RENT_INDEX_SOURCE.en);
  assert.equal(sourceOwnerLabel(REGA_RENT_INDEX_SOURCE_ID, true), RENT_INDEX_SOURCE.ar);
});

test("Codex gate 3: the REGA source id is written down in exactly one place", () => {
  const offenders: string[] = [];
  for (const file of walk(SRC)) {
    if (!codeOnly(readFileSync(file, "utf8")).includes(REGA_RENT_INDEX_SOURCE_ID)) continue;
    offenders.push(relative(ROOT, file).split("\\").join("/"));
  }
  assert.deepEqual(
    offenders,
    ["src/lib/sources/catalogue.ts"],
    "the REGA id is spelled out outside the catalogue, so two writers of it can disagree",
  );
});

test("Codex gate 3: the rent pipeline resolves REGA through the catalogue", () => {
  // The specific defect: `const source_id = "rega_ejar"` in the pipeline body.
  // The pipeline must import the constant, not restate the value.
  const pipeline = readFileSync(join(SRC, "lib/ingest/rentBasePipeline.ts"), "utf8");
  assert.match(pipeline, /REGA_RENT_INDEX_SOURCE_ID/, "the pipeline no longer resolves REGA through the catalogue");
  assert.match(
    codeOnly(pipeline),
    /from "@\/lib\/sources\/catalogue"/,
    "the pipeline does not import from the catalogue",
  );
});

test("ADV-1C.1: the catalogue grants nothing", () => {
  // The boundary the correction turns on: catalogue answers "what is it
  // called", the register answers "what may we do with it". If a permission
  // word ever appears in the catalogue's code, a build-time constant has
  // started participating in a licence decision.
  const code = codeOnly(readFileSync(join(SRC, "lib/sources/catalogue.ts"), "utf8"));
  for (const word of [
    "redisplayPolicy",
    "derivedDisplayPolicy",
    "exportPolicy",
    "aiRetrievalPolicy",
    "modelInputPolicy",
    "storagePolicy",
    "rightsStatus",
    "permits",
    "mayRedisplay",
  ]) {
    assert.equal(code.includes(word), false, `the catalogue references ${word}, which is the register's job`);
  }
});
