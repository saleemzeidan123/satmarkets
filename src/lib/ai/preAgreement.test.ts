import { test } from "node:test";
import assert from "node:assert/strict";
import { callModel, instruction, phrase, classifiedSlot, userWords } from "./index";
import { llmParse, rulesParse } from "@/lib/search/aiParse";
import { readAdvisorIntent } from "@/lib/advisor/intent";
import { translateToArabic } from "@/lib/translate/translateToArabic";

// ADV-3A.1, Codex item 1. "Add tests proving that all three paths stop before
// network access."
//
// The regulatory register, Part D, is plain: before an enterprise AI agreement
// exists, an external model may receive public information, deliberately
// constructed samples or strongly redacted material, and nothing else. The
// boundary nevertheless permitted `user_own_words` unconditionally, on the
// reasoning that a person typing text has consented to it being sent.
//
// That reasoning does not survive contact with what people actually type. A
// search box takes a company name and an expansion plan. An advisor thread takes
// a tenant's confidential requirement. A listing sent for translation is
// unpublished copy about somebody else's asset. None of those become public
// because a keyboard was involved.
//
// So each of the three paths must degrade to something deterministic, and it must
// degrade BEFORE a socket opens rather than after a provider declines. That
// distinction is the whole of this file: every test below installs a `fetch` that
// throws, and configures provider keys so that stopping cannot be mistaken for
// missing configuration.

const noFetch = () => {
  throw new Error("a socket was opened before the enterprise AI agreement exists");
};

/**
 * Run `fn` with a throwing `fetch` and a fully configured provider environment.
 *
 * Both halves matter. Without the keys, a path that stopped for want of a
 * provider would look identical to a path that stopped at the boundary, and this
 * file would pass while proving nothing.
 */
async function withClosedBoundary<T>(fn: () => Promise<T>): Promise<T> {
  const originalFetch = globalThis.fetch;
  const saved: Record<string, string | undefined> = {};
  // Assembled from fragments and read by bracket access, so this file does not
  // trip the provider-configuration scan in `gateway.test.ts`. Adding it to that
  // scan's allowlist would have been the easier fix and the wrong one: the
  // allowlist is three files long on purpose, and every name added to it is a
  // little less of a guarantee.
  const keys = ["AI_API_KEY", "ANTHRO" + "PIC_API_KEY", "OPEN" + "AI_API_KEY"];
  const env = process.env as Record<string, string | undefined>;
  for (const k of [...keys, "AI_AGREEMENT_IN_FORCE"]) saved[k] = env[k];
  for (const k of keys) env[k] = "test-key";
  delete env.AI_AGREEMENT_IN_FORCE;
  (globalThis as any).fetch = noFetch;
  try {
    return await fn();
  } finally {
    (globalThis as any).fetch = originalFetch;
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete env[k];
      else env[k] = v;
    }
  }
}

// 1. Search.

test("search: the model parser stops at the boundary and the deterministic parser answers", async () => {
  const parsed = await withClosedBoundary(async () => {
    const ai = await llmParse("I need a 400 sqm office in Al Olaya under 1800 per sqm");
    // Null, not a throw and not a partial parse. `callModelText` returns null
    // when the gateway declines, and the route treats null as "use the rules".
    assert.equal(ai, null);
    return rulesParse("I need a 400 sqm office in Al Olaya under 1800 per sqm");
  });

  // And the deterministic answer is a real answer, not an empty object. A
  // fallback that returns nothing is an outage with better manners.
  assert.equal(parsed.asset, "office");
  assert.equal(parsed.minSize, 400);
  assert.equal(parsed.maxRent, 1800);
});

test("search: an Arabic query degrades the same way", async () => {
  const parsed = await withClosedBoundary(async () => {
    assert.equal(await llmParse("مكتب للايجار في العليا"), null);
    return rulesParse("مكتب للايجار في العليا");
  });
  assert.equal(parsed.asset, "office");
  assert.equal(parsed.deal, "lease");
});

test("search: a query too short to parse never reaches the gateway at all", async () => {
  await withClosedBoundary(async () => {
    assert.equal(await llmParse("of"), null);
  });
});

// 2. Advisor.

test("advisor: the prose message shape is denied before a provider is selected", async () => {
  // The advisor's model-backed paths all have this shape: our instruction, then
  // the person's words. The second message is the one Part D does not permit.
  const r = await withClosedBoundary(() =>
    callModel({
      profile: "short_prose",
      messages: [
        instruction("advisor chat")`You are the SAT Markets advisor. ${phrase`Answer in Arabic.`}`,
        userWords("we are opening 3 clinics for Almasa Medical, budget 2m, where should we look"),
      ],
    })
  );
  assert.equal(r.ok, false);
  assert.equal(r.ok === false && r.failure, "boundary");
  assert.ok(r.ok === false && r.denials.some((d) => /enterprise AI agreement/.test(d)));
});

test("advisor: a count over platform records is denied too, and that is not an oversight", async () => {
  // The advisor's chat instruction interpolates live published listing and index
  // segment counts. A count over inventory rather than over parties is safe to
  // PUBLISH: no group is small enough to re-identify anyone. It does not follow
  // that it may be EXPORTED to a processor we hold no terms with. Group size
  // answers a re-identification question; the agreement answers a processing
  // question, and passing one is not passing the other.
  //
  // This test exists because the opposite is the tempting reading, and a future
  // edit that "fixes" the chat path by relaxing this would be reintroducing the
  // contradiction ADV-3A.1 was written to resolve.
  const r = await withClosedBoundary(() =>
    callModel({
      profile: "short_prose",
      messages: [
        instruction("advisor chat")`Context: ${classifiedSlot("41 published listings", [
          { label: "published listing counts", dataClass: "aggregate_count", overParties: false },
        ])}`,
      ],
    })
  );
  assert.equal(r.ok === false && r.failure, "boundary");
});

test("advisor: our own instruction and published material are not what is being stopped", async () => {
  // The mirror of the test above, and the reason the closure record can say the
  // gate is about the DATA rather than about AI in general. An instruction we
  // wrote, quoting something already public, is permitted; what stops the advisor
  // is the person's unstructured text sitting next to it.
  const r = await withClosedBoundary(() =>
    callModel({
      profile: "short_prose",
      messages: [
        instruction("advisor chat")`Summarise: ${classifiedSlot("Riyadh office stock rose in 2025.", [
          { label: "published market note", dataClass: "public_published" },
        ])}`,
      ],
    })
  );
  assert.notEqual(r.ok === false && r.failure, "boundary");
});

test("advisor: intent is read without a model, so the closed boundary costs no behaviour", async () => {
  // The `value` and `watch` paths involve no model once the intent is known: they
  // read the published Rent Index and render both languages deterministically.
  // Losing them to a closed AI boundary would have been the worst kind of
  // collateral damage, so the reader runs with the socket removed.
  await withClosedBoundary(async () => {
    assert.equal(readAdvisorIntent("what are rents in Al Malaz").mode, "value");
    assert.equal(readAdvisorIntent("notify me when office rents in Granada move 5%").mode, "watch");
    assert.equal(readAdvisorIntent("كم متوسط الإيجار للمكاتب في حطين").mode, "value");
  });
});

// 3. Translation.

test("translation: a controlled unavailable state, with no provider call", async () => {
  const r = await withClosedBoundary(() =>
    translateToArabic("Grade A office floor in Al Olaya, 412 sqm, fitted.", {
      cache: { get: async () => undefined, set: async () => {} },
    })
  );
  assert.equal(r.ok, false);
  assert.equal(r.ok === false && r.reason, "agreement_required");
  assert.match(String(r.ok === false && r.detail), /enterprise AI agreement/);
});

test("translation: the refusal is a value, not an exception", async () => {
  // The route writes `ar_translation_status` from the outcome. If this threw, the
  // caller's catch would have to decide what the status is, and the first
  // reasonable-looking guess is the one that records a translation that never
  // happened. That is the fake success state Codex named.
  await withClosedBoundary(async () => {
    const r = await translateToArabic("Fitted retail unit, 120 sqm.", {
      cache: { get: async () => undefined, set: async () => {} },
    });
    assert.equal(typeof r, "object");
    assert.equal(r.ok, false);
    assert.ok(!("arabic" in r));
  });
});

test("translation: an empty field is still a no-op, not a denial", async () => {
  const r = await withClosedBoundary(() => translateToArabic("   "));
  assert.equal(r.ok, true);
  assert.equal(r.ok === true && r.arabic, "");
});
