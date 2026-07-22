import { test } from "node:test";
import assert from "node:assert";
import {
  provenanceStyle,
  provenanceLabel,
  provenanceAria,
  type ProvenanceTier,
} from "./provenance";

const TIERS: ProvenanceTier[] = ["entered", "verified", "computed", "sourced"];

test("only the verified tier carries the status dot", () => {
  assert.equal(provenanceStyle("verified").dot, true);
  assert.equal(provenanceStyle("entered").dot, false);
  assert.equal(provenanceStyle("computed").dot, false);
  assert.equal(provenanceStyle("sourced").dot, false);
});

test("verified tier uses the verified colour tokens", () => {
  const s = provenanceStyle("verified");
  assert.equal(s.fg, "--verified");
  assert.equal(s.wash, "--verified-wash");
  assert.equal(s.line, "--green-line");
});

test("entered label matches the existing stated-by-lister wording", () => {
  assert.equal(provenanceLabel("entered", {}, false), "Stated by the lister");
  assert.equal(provenanceLabel("entered", {}, true), "كما ذكرها المُعلن");
});

test("verified label appends the check date only when present", () => {
  assert.equal(provenanceLabel("verified", {}, false), "Verified");
  assert.equal(provenanceLabel("verified", { date: "29 Jun 2026" }, false), "Verified · checked 29 Jun 2026");
  assert.equal(provenanceLabel("verified", { date: "29 يونيو 2026" }, true), "موثّق · روجع 29 يونيو 2026");
});

test("computed label appends date and method only when present", () => {
  assert.equal(provenanceLabel("computed", {}, false), "Computed");
  assert.equal(
    provenanceLabel("computed", { date: "18 Jul 2026", method: "nearest anchor" }, false),
    "Computed 18 Jul 2026 · nearest anchor",
  );
});

test("sourced label is the dataset and period, with a fallback", () => {
  assert.equal(
    provenanceLabel("sourced", { dataset: "REGA Rental Index (Ejar)", period: "2026-Q2" }, false),
    "REGA Rental Index (Ejar) · 2026-Q2",
  );
  assert.equal(provenanceLabel("sourced", {}, false), "From a published source");
});

test("no label or aria contains an em dash (Law 2), in either locale", () => {
  for (const tier of TIERS) {
    for (const ar of [false, true]) {
      const parts = { date: "29 Jun 2026", method: "m", dataset: "d", period: "p" };
      assert.ok(!provenanceLabel(tier, parts, ar).includes("\u2014"), `label ${tier} ar=${ar}`);
      assert.ok(!provenanceAria(tier, parts, ar).includes("\u2014"), `aria ${tier} ar=${ar}`);
    }
  }
});

test("aria description is non-empty and distinct from the terse label", () => {
  for (const tier of TIERS) {
    const aria = provenanceAria(tier, {}, false);
    assert.ok(aria.length > 0);
  }
});
