import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// Codex remediation Batch 1: Law 8. The Rent Index is derived from the REGA
// Rental Index (Ejar) only. Public copy must never attribute figures to JLL,
// CBRE, Knight Frank or SAMA, and must not claim the index is built from our
// own listing/transaction data. Guards the two shipped-copy surfaces that broke
// the law; the advisor system prompt is excluded on purpose because it
// legitimately instructs the model to NEVER cite those houses.

const llms = readFileSync("public/llms.txt", "utf-8");
const legal = readFileSync("src/lib/legalContent.ts", "utf-8");

test("llms.txt does not attribute figures to banned research houses", () => {
  assert.doesNotMatch(llms, /JLL|CBRE|Knight Frank|\bSAMA\b/);
});
test("llms.txt does not carry the banned 'as compiled by' citation", () => {
  assert.doesNotMatch(llms, /as compiled by/i);
});
test("llms.txt attributes the Rent Index to REGA Rental Index (Ejar)", () => {
  assert.match(llms, /REGA Rental Index \(Ejar\)/);
});
test("Terms does not claim the index is derived from our own listing/transaction data", () => {
  assert.doesNotMatch(legal, /derived from verified listing and transaction data/);
});
