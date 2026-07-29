import test from "node:test";
import assert from "node:assert/strict";
import { allowedSources, userHistory } from "./history";
import { unsourcedFigure } from "@/lib/market/guard";

// ADV-3A.1, Codex item 3. Two faults lived in one line of `/api/advisor`, and
// only one of them was about classification.
//
// The route kept the last six turns of both roles, handed each to
// `priorTurn(role, text)`, which classified all of them `user_own_words`, and
// concatenated all of them into `allowedSrc`.
//
// The classification half sent model output to an external provider under a class
// it had no claim to. The evidence half was worse: `unsourcedFigure` exists to
// stop the advisor stating a rent that came from nowhere, and if a previous
// assistant reply counts as an allowed source, then a rent the model invented on
// turn one is an allowed source on turn two. The guard written to catch exactly
// that figure waves it through because the model said it before.
//
// Codex asked for a regression test showing that a number present only in a
// previous assistant message remains unsupported. That is the fourth test here,
// and it exercises the module the route actually calls.

const turns = [
  { role: "user", text: "office in Al Olaya" },
  { role: "assistant", text: "Offices in Al Olaya are around 1850 SAR per sqm." },
  { role: "user", text: "and in Hittin" },
];

test("assistant turns are dropped from history", () => {
  const h = userHistory(turns);
  assert.equal(h.length, 2);
  assert.deepEqual(h.map((t) => t.content), ["office in Al Olaya", "and in Hittin"]);
});

test("a turn with no role, no text or an unknown role is dropped", () => {
  const h = userHistory([
    { role: "user", text: "keep me" },
    { role: "user", text: "" },
    { role: "system", text: "drop me" },
    { text: "drop me too" },
    null,
    "not a turn",
    { role: "user", text: 1850 },
  ]);
  assert.deepEqual(h.map((t) => t.content), ["keep me"]);
});

test("the window counts the person's turns, not the raw transcript", () => {
  // Filtering after slicing spent the window on turns that were never going to
  // be sent: six raw turns of an alternating conversation is three of the
  // person's. Six was meant to mean six of theirs.
  const convo = Array.from({ length: 20 }, (_, i) => ({
    role: i % 2 === 0 ? "user" : "assistant",
    text: (i % 2 === 0 ? "q" : "a") + i,
  }));
  const h = userHistory(convo);
  assert.equal(h.length, 6);
  assert.ok(h.every((t) => t.content.startsWith("q")));
  assert.equal(h[5].content, "q18");
});

test("history is bounded in turns and in characters", () => {
  const many = Array.from({ length: 20 }, (_, i) => ({ role: "user", text: "q" + i }));
  assert.equal(userHistory(many).length, 6);
  assert.equal(userHistory(many, 2).length, 2);
  assert.equal(userHistory([{ role: "user", text: "x".repeat(5000) }])[0].content.length, 600);
  assert.deepEqual(userHistory(undefined), []);
  assert.deepEqual(userHistory({ role: "user", text: "not an array" }), []);
});

test("a figure present only in a previous assistant message stays unsupported", () => {
  // The regression. 1850 appears in the conversation, but only because the model
  // said it, and no published band was retrieved for it.
  const raw = "and in Hittin";
  const hist = userHistory(turns);
  const src = allowedSources(raw, hist);

  assert.ok(!src.includes("1850"), "the assistant's figure must not be in the evidence set");
  assert.ok(unsourcedFigure("Hittin offices are around 1850 SAR per sqm.", src));

  // And the old shape, kept here so the fault cannot come back quietly: with the
  // assistant turn in the evidence set, the same reply passes the same guard.
  const oldSrc = [raw, ...turns.map((t) => t.text)].join(" ");
  assert.ok(!unsourcedFigure("Hittin offices are around 1850 SAR per sqm.", oldSrc));
});

test("the person's own figure is still evidence for a reply that repeats it", () => {
  // The guard must not become so narrow that the advisor cannot echo what the
  // person told it. A number the person typed is theirs.
  const hist = userHistory([{ role: "user", text: "they are asking 1800 SAR per sqm" }]);
  const src = allowedSources("is that fair", hist);
  assert.ok(!unsourcedFigure("At 1800 SAR per sqm you are near the published band.", src));
});

test("a retrieved published band is appended by the caller that retrieved it", () => {
  // `allowedSources` covers only the person's words. Index evidence enters the
  // string at the call site that read the index, which is where the provenance
  // is actually known.
  const src = allowedSources("what are rents in Al Olaya", []) + " published median 1740 SAR per sqm";
  assert.ok(!unsourcedFigure("The published median is 1740 SAR per sqm.", src));
});
