import { test } from "node:test";
import assert from "node:assert/strict";
import { buildExternalPrompt } from "@/lib/aiBoundary";
import { COUNTED } from "@/lib/format";
import { RENT_INDEX_SOURCE } from "@/lib/market/attribution";
import type { QueryVocab } from "@/lib/search/queryParse";
import { parseQuery } from "@/lib/search/queryParse";
import {
  STATIC_TOOLS,
  TOOL_NAMES,
  countedPhraseTool,
  listingEligibilityTool,
  makeParseQueryTool,
  makeRentBandTool,
  parsedQueryParts,
  rentIndexAttributionTool,
  type RentBand,
} from "./tools";
import type { ToolContext } from "./tool";

// ADV-3B. The first typed SAT tools.

const VOCAB: QueryVocab = {
  assets: [
    { value: "office", en: "Office", ar: "مكاتب" },
    { value: "warehouse", en: "Warehouse", ar: "مستودعات" },
  ],
  grades: [
    { value: "a", en: "A", ar: "أ" },
    { value: "b", en: "B", ar: "ب" },
  ],
  fitouts: [{ value: "fitted", en: "Fitted", ar: "مجهز" }],
  deals: [
    { value: "lease", en: "Lease", ar: "إيجار" },
    { value: "sale", en: "Sale", ar: "بيع" },
  ],
  cities: [
    { value: "Riyadh", en: "Riyadh", ar: "الرياض" },
    { value: "Jeddah", en: "Jeddah", ar: "جدة" },
  ],
  places: [{ id: "d-olaya", en: "Al Olaya", ar: "العليا" }],
};

const EN: ToolContext = { actor: { role: "anonymous" }, locale: "en" };
const AR: ToolContext = { actor: { role: "anonymous" }, locale: "ar" };

const parseTool = makeParseQueryTool(VOCAB);

function classes(parts: readonly { dataClass: string }[]): string[] {
  return parts.map((p) => p.dataClass);
}

// ------------------------------------------------- the classification decision

// This is the load-bearing judgement in the package, so it is asserted as the
// practical claim rather than as a shape: which sentences can be assisted by an
// external model today, and which cannot.

test("a query made only of platform vocabulary carries no user text", () => {
  const p = parseQuery("office for lease in Riyadh", VOCAB);
  assert.deepEqual(p.terms, []);
  assert.deepEqual(classes(parsedQueryParts(p)), ["own_instruction"]);
});

test("that query may reach an external model while the agreement gate is closed", () => {
  const decision = buildExternalPrompt(parsedQueryParts(parseQuery("office for lease in Riyadh", VOCAB)));
  assert.equal(decision.allowed, true);
});

test("a budget the person typed is their own commercially sensitive material", () => {
  const p = parseQuery("office for lease in Riyadh under 1400", VOCAB);
  assert.equal(p.priceMax, 1400);
  assert.ok(classes(parsedQueryParts(p)).includes("user_own_words"));
});

test("a query carrying a budget is denied before any network access", () => {
  const decision = buildExternalPrompt(parsedQueryParts(parseQuery("office under 1400 in Riyadh", VOCAB)));
  assert.equal(decision.allowed, false);
  assert.equal(decision.allowed === false && decision.denials.length >= 1, true);
});

test("free text the vocabulary did not recognise is declared as user text", () => {
  const p = parseQuery("office in Riyadh for the Acme expansion", VOCAB);
  assert.ok(p.terms.length > 0);
  assert.ok(classes(parsedQueryParts(p)).includes("user_own_words"));
  assert.equal(buildExternalPrompt(parsedQueryParts(p)).allowed, false);
});

test("a size requirement counts as a constraint the person typed, not as vocabulary", () => {
  const p = parseQuery("office in Riyadh around 300 m2", VOCAB);
  assert.equal(p.areaTarget, 300);
  assert.ok(classes(parsedQueryParts(p)).includes("user_own_words"));
});

test("the same parse becomes sendable once the agreement is recorded", () => {
  const parts = parsedQueryParts(parseQuery("office under 1400 in Riyadh", VOCAB));
  assert.equal(buildExternalPrompt(parts, { agreementInForce: true }).allowed, true);
});

test("every part a parse declares is labelled, so a denial can be logged in full", () => {
  const p = parseQuery("office under 1400 for the Acme expansion", VOCAB);
  for (const part of parsedQueryParts(p)) assert.ok(part.label.trim().length > 0);
});

// -------------------------------------------------------------- parse_query

test("the parser tool refuses arguments a model will eventually send", async () => {
  for (const raw of [null, "office", 3, {}, { query: "" }, { query: "  " }, { query: 12 }, { query: "x".repeat(401) }]) {
    const r = parseTool.parse(raw);
    assert.equal(r.ok, false, JSON.stringify(raw));
  }
  assert.equal(parseTool.parse({ query: "office in Riyadh" }).ok, true);
});

test("the parser tool never throws on a malformed call", () => {
  for (const raw of [undefined, NaN, [], { query: { nested: true } }, Symbol("x")]) {
    assert.doesNotThrow(() => parseTool.parse(raw));
  }
});

test("the model is handed the district name and the platform is handed the id", async () => {
  const r = await parseTool.run({ query: "office in Al Olaya" }, EN);
  assert.equal(r.ok, true);
  if (!r.ok) return;
  assert.deepEqual(r.value.placeIds, ["d-olaya"]);
  assert.match(r.text, /Al Olaya/);
  assert.equal(r.text.includes("d-olaya"), false);
});

test("the same parse reads in Arabic for an Arabic reader", async () => {
  const r = await parseTool.run({ query: "مكتب للإيجار في العليا" }, AR);
  assert.equal(r.ok, true);
  if (!r.ok) return;
  assert.match(r.text, /العليا/);
  assert.match(r.text, /النوع/);
});

test("an unrecognised word is not upgraded into a constraint", async () => {
  const r = await parseTool.run({ query: "office in Nowhereville" }, EN);
  assert.equal(r.ok, true);
  if (!r.ok) return;
  assert.equal(r.value.place, null);
  assert.ok(r.value.terms.includes("nowhereville") || r.value.ignored.length > 0);
});

test("the numbers a parse reports are vouched for, because they are the ones typed", async () => {
  const r = await parseTool.run({ query: "office under 1400 around 300 m2" }, EN);
  assert.equal(r.ok, true);
  if (!r.ok) return;
  assert.ok(r.figures.includes(1400));
  assert.ok(r.figures.includes(300));
});

// ------------------------------------------------------- listing_eligibility

const PASSING = {
  right_to_market_confirmed: true,
  ownership_verified: true,
  authorization_verified: true,
  ad_permit_no: "7200012345",
  ad_permit_expires_at: "2099-01-01",
};

test("a listing that meets the gate is described as meeting it", async () => {
  const r = await listingEligibilityTool.run({ listing: PASSING }, EN);
  assert.equal(r.ok, true);
  if (!r.ok) return;
  assert.equal(r.value.passes, true);
  assert.deepEqual(r.value.reasons, []);
});

test("a listing that fails names the platforms own reasons and not the record", async () => {
  const r = await listingEligibilityTool.run({ listing: { ...PASSING, ownership_verified: false } }, EN);
  assert.equal(r.ok, true);
  if (!r.ok) return;
  assert.equal(r.value.passes, false);
  assert.deepEqual(r.value.reasons, ["ownership"]);
  assert.match(r.text, /Ownership not verified/);
  assert.equal(r.text.includes("7200012345"), false);
});

test("the eligibility decision is our own words, so it may accompany a prompt today", async () => {
  const r = await listingEligibilityTool.run({ listing: { ...PASSING, ownership_verified: false } }, EN);
  assert.equal(r.ok, true);
  if (!r.ok) return;
  assert.deepEqual(classes(r.parts), ["own_instruction"]);
  assert.equal(buildExternalPrompt([...r.parts]).allowed, true);
});

test("the eligibility decision vouches for no figure", async () => {
  const r = await listingEligibilityTool.run({ listing: PASSING }, AR);
  assert.equal(r.ok, true);
  if (!r.ok) return;
  assert.deepEqual(r.figures, []);
});

test("eligibility refuses an argument that is not a listing", () => {
  for (const raw of [null, "listing", { listing: null }, { listing: "SATM-1" }]) {
    assert.equal(listingEligibilityTool.parse(raw).ok, false);
  }
});

// ---------------------------------------------------------- counted_phrase

test("only the formatters own nouns are accepted, so nothing reaches the screen uninflected", () => {
  for (const noun of Object.keys(COUNTED)) {
    assert.equal(countedPhraseTool.parse({ count: 3, noun }).ok, true, noun);
  }
  for (const noun of ["requirement", "viewing", "listings", "", "MATCH"]) {
    assert.equal(countedPhraseTool.parse({ count: 3, noun }).ok, false, noun);
  }
});

test("the rejection tells the caller which nouns exist, because that is our own vocabulary", () => {
  const r = countedPhraseTool.parse({ count: 3, noun: "viewing" });
  assert.equal(r.ok, false);
  assert.match(r.ok === false ? r.problem : "", /match/);
});

test("a count that is not a whole non-negative number is refused", () => {
  for (const count of [-1, 1.5, NaN, Infinity, "3", null, undefined]) {
    assert.equal(countedPhraseTool.parse({ count, noun: "match" }).ok, false, String(count));
  }
  assert.equal(countedPhraseTool.parse({ count: 0, noun: "match" }).ok, true);
});

test("Arabic agreement is the formatters, at every boundary finding 52 named", async () => {
  const expected: Record<number, string> = {
    1: "مطابقة واحدة",
    2: "مطابقتان",
    3: "3 مطابقات",
    10: "10 مطابقات",
    11: "11 مطابقة",
    99: "99 مطابقة",
    100: "100 مطابقة",
  };
  for (const [n, text] of Object.entries(expected)) {
    const r = await countedPhraseTool.run({ count: Number(n), noun: "match" }, AR);
    assert.equal(r.ok && r.text, text, n);
  }
});

test("the oblique dual is available, because a preposition changes the word", async () => {
  const plain = await countedPhraseTool.run({ count: 2, noun: "month" }, AR);
  const oblique = await countedPhraseTool.run({ count: 2, noun: "month", oblique: true }, AR);
  assert.equal(plain.ok && plain.text, "شهران");
  assert.equal(oblique.ok && oblique.text, "شهرين");
});

test("the tool vouches for the count it was given and for nothing else", async () => {
  const r = await countedPhraseTool.run({ count: 18, noun: "result" }, EN);
  assert.equal(r.ok, true);
  if (!r.ok) return;
  assert.deepEqual(r.figures, [18]);
  assert.equal(r.text, "18 results");
});

// --------------------------------------------------- rent_index_attribution

test("the attribution is the one canonical string, in both languages", async () => {
  const en = await rentIndexAttributionTool.run({}, EN);
  const ar = await rentIndexAttributionTool.run({}, AR);
  assert.ok(en.ok && en.text.includes(RENT_INDEX_SOURCE.en));
  assert.ok(ar.ok && ar.text.includes(RENT_INDEX_SOURCE.ar));
});

test("the attribution is published material, so an agent may carry it today", async () => {
  const r = await rentIndexAttributionTool.run({}, EN);
  assert.equal(r.ok, true);
  if (!r.ok) return;
  assert.deepEqual(classes(r.parts), ["public_published"]);
  assert.equal(buildExternalPrompt([...r.parts]).allowed, true);
});

test("the attribution tool takes no arguments a model could bend", () => {
  for (const raw of [null, { source: "JLL" }, "REGA"]) {
    assert.equal(rentIndexAttributionTool.parse(raw).ok, true);
  }
});

// ----------------------------------------------------------------- rent_band

const BAND: RentBand = { segment: "riyadh_office_a", low: 1200, high: 1800, median: 1450, period: "2025" };

test("a segment with no published band is an answer, not an error", async () => {
  const tool = makeRentBandTool(async () => null);
  const r = await tool.run({ segment: "riyadh_office_a" }, EN);
  assert.equal(r.ok, false);
  assert.equal(r.ok === false && r.failure, "not_found");
});

test("a band carries its licence, so it cannot reach a model on either gate", async () => {
  const tool = makeRentBandTool(async () => BAND);
  const r = await tool.run({ segment: "riyadh_office_a" }, EN);
  assert.equal(r.ok, true);
  if (!r.ok) return;
  assert.deepEqual(classes(r.parts), ["licensed_source"]);
  assert.equal(r.parts[0].sourceId, "rega_rent_index");
  const closed = buildExternalPrompt([...r.parts]);
  assert.equal(closed.allowed, false);
  const signed = buildExternalPrompt([...r.parts], { agreementInForce: true });
  assert.equal(signed.allowed, false, "the source gate is not the provider gate");
});

test("a band vouches for exactly the figures it read, and never for a derived one", async () => {
  const tool = makeRentBandTool(async () => BAND);
  const r = await tool.run({ segment: "riyadh_office_a" }, EN);
  assert.equal(r.ok, true);
  if (!r.ok) return;
  assert.deepEqual([...r.figures].sort((a, b) => a - b), [1200, 1450, 1800]);
  assert.equal(r.figures.includes(1500), false);
});

test("a band names its source in the text a reader would see, in both languages", async () => {
  const tool = makeRentBandTool(async () => BAND);
  const en = await tool.run({ segment: "riyadh_office_a" }, EN);
  const ar = await tool.run({ segment: "riyadh_office_a" }, AR);
  assert.ok(en.ok && en.text.includes(RENT_INDEX_SOURCE.en));
  assert.ok(ar.ok && ar.text.includes(RENT_INDEX_SOURCE.ar));
});

test("Arabic band text uses Western numerals, as Law 7 requires", async () => {
  const tool = makeRentBandTool(async () => BAND);
  const ar = await tool.run({ segment: "riyadh_office_a" }, AR);
  assert.equal(ar.ok, true);
  if (!ar.ok) return;
  assert.equal(/[٠-٩]/.test(ar.text), false);
  assert.match(ar.text, /1,200|1200/);
});

// ------------------------------------------------------------- the registry

test("every static tool is named in the registry list", () => {
  for (const t of STATIC_TOOLS) assert.ok((TOOL_NAMES as readonly string[]).includes(t.name), t.name);
});

test("the registry list names every tool this package defines, and no ghost", () => {
  const built = [
    parseTool.name,
    ...STATIC_TOOLS.map((t) => t.name),
    makeRentBandTool(async () => null).name,
  ].sort();
  assert.deepEqual([...TOOL_NAMES].sort(), built);
});

test("no tool in this package can write anything", () => {
  const all = [parseTool, ...STATIC_TOOLS, makeRentBandTool(async () => null)];
  for (const t of all) assert.ok(["read", "compute", "propose"].includes(t.effect), t.name);
});

test("every tool describes itself in both languages", () => {
  const all = [parseTool, ...STATIC_TOOLS, makeRentBandTool(async () => null)];
  for (const t of all) {
    assert.ok(t.summary.en.trim().length > 10, t.name);
    assert.ok(t.summary.ar.trim().length > 10, t.name);
    assert.equal(/[؀-ۿ]/.test(t.summary.ar), true, t.name);
  }
});
